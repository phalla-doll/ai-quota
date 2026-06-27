// Standalone Cloudflare Cron Worker — pushes Telegram usage alerts.
//
// Fully decoupled from the Next app (same pattern as ../warmup-cron/), but bound
// to the SAME D1 database so it can read every user's keys and config:
//
//   1. SELECT api_keys grouped by tg_user_id  (the recipient is the tg_user_id;
//      for a user who has opened the Mini App that id is also their chat_id).
//   2. For each key, call Z.ai's monitor endpoint DIRECTLY (a Worker has no
//      browser CORS, so it skips the app's /api/zai proxy) to read % used.
//   3. Compare against the user's enabled thresholds (user_config namespace
//      'alerts', synced from the settings screen; sensible default if absent).
//   4. Dedupe via the alert_state table (one message per threshold per quota
//      window), then sendMessage via the Telegram Bot API.
//
// Bindings / secrets (see wrangler.jsonc):
//   DB                 - D1, same database as the Next app
//   TELEGRAM_BOT_TOKEN - secret, same bot used to validate initData

// Z.ai monitor base — same upstream the app's proxy targets for `x-zai-endpoint:
// monitor`. The quota path mirrors lib/zai-monitor.ts `fetchQuotaLimit`.
const MONITOR_QUOTA_URL = "https://api.z.ai/api/monitor/usage/quota/limit"

// Keep in sync with ALL / defaultEnabled in lib/stores/alerts-store.ts. This is
// a separate deploy that shares no code with the app, so the constants are
// duplicated by necessity — if the app's threshold set or defaults change, this
// must be updated too (see alerts-cron/README.md).
const ALL_THRESHOLDS = [50, 75, 90, 95]
const DEFAULT_ENABLED = { 50: false, 75: true, 90: true, 95: true }

// ── Z.ai ────────────────────────────────────────────────────────────────────

// Returns a discriminated result for a key's primary quota:
//   { ok: true, percentage, resetAt }  — percentage is percent USED
//   { ok: false, reason: "error" }     — transient (network / non-2xx)
//   { ok: false, reason: "unsupported" } — key structurally has no quota
//                                          (e.g. a non-Coding-Plan key)
// One bad key never aborts the run.
async function fetchUsage(key) {
    let res
    try {
        res = await fetch(MONITOR_QUOTA_URL, {
            headers: { authorization: `Bearer ${key}` },
        })
    } catch {
        return { ok: false, reason: "error" }
    }
    if (!res.ok) return { ok: false, reason: "error" }

    let body
    try {
        body = await res.json()
    } catch {
        return { ok: false, reason: "error" }
    }
    // 2xx but the API reports failure, or no limits to read → this key has no
    // monitorable quota. Treated as "unsupported" (a steady state) rather than a
    // transient error so it shows up distinctly in the run summary.
    if (!body || body.success === false) return { ok: false, reason: "unsupported" }
    const limits = body.data?.limits
    if (!Array.isArray(limits) || limits.length === 0) {
        return { ok: false, reason: "unsupported" }
    }

    // Match the app's primary-quota selection (quota-card.tsx): prefer the
    // TOKENS_LIMIT entry; the array can also contain a TIME_LIMIT (Search/Reader)
    // entry and the order is not guaranteed.
    const primary =
        limits.find((l) => l.type === "TOKENS_LIMIT") ?? limits[0]
    // `percentage` is percent USED — the app renders `100 - percentage` as
    // "remaining" (quota-card.tsx), so `percentage >= threshold` is the correct
    // "crossed N% used" test.
    const percentage = Number(primary.percentage)
    if (!Number.isFinite(percentage)) return { ok: false, reason: "unsupported" }

    return {
        ok: true,
        percentage,
        resetAt: primary.nextResetTime ?? null,
    }
}

// ── Telegram ──────────────────────────────────────────────────────────────────

// Returns { ok } | { ok: false, status }. A 403 means the user has never started
// a private chat with the bot (the Bot API can't initiate one) — surfaced
// distinctly so it isn't lumped in with transient send failures.
async function sendMessage(env, chatId, text) {
    const res = await fetch(
        `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "HTML",
            }),
        }
    )
    if (res.ok) return { ok: true }
    return { ok: false, status: res.status }
}

// Render the reset instant in the user's synced IANA timezone (e.g.
// "Asia/Bangkok"). Falls back to UTC when no zone was synced or it's unknown to
// the runtime — the worker has no browser to resolve a local zone itself.
function formatReset(resetAt, timezone) {
    const d = new Date(Number(resetAt))
    if (timezone) {
        try {
            return new Intl.DateTimeFormat("en-GB", {
                timeZone: timezone,
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZoneName: "short",
            }).format(d)
        } catch {
            // Unknown/invalid zone → fall through to UTC.
        }
    }
    return d.toUTCString()
}

function alertText(keyName, threshold, percentage, resetAt, timezone) {
    const pct = Math.round(percentage)
    const reset = resetAt ? `\nResets ${formatReset(resetAt, timezone)}` : ""
    return (
        `⚠️ <b>${escapeHtml(keyName)}</b> has used <b>${pct}%</b> of its quota ` +
        `(crossed the ${threshold}% alert).${reset}`
    )
}

function escapeHtml(s) {
    return String(s)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
}

// ── Config / state (D1) ───────────────────────────────────────────────────────

// Reads the user's `alerts` config blob and derives the values the run needs:
//   { thresholds: number[], timezone: string | null }
// `timezone` is the browser IANA zone the client rode along (alerts-sync.tsx);
// null when absent so formatReset falls back to UTC.
async function loadAlertPrefs(env, userId) {
    const row = await env.DB.prepare(
        `SELECT value FROM user_config WHERE tg_user_id = ? AND namespace = 'alerts'`
    )
        .bind(userId)
        .first()
    let enabled = DEFAULT_ENABLED
    let timezone = null
    if (row?.value) {
        try {
            const parsed = JSON.parse(row.value)
            // Only accept a blob that actually carries known threshold keys; an
            // empty or malformed `enabled` ({} , {} , garbage) falls back to the
            // defaults rather than silently disabling every alert.
            if (
                parsed?.enabled &&
                ALL_THRESHOLDS.some((t) => t in parsed.enabled)
            ) {
                enabled = parsed.enabled
            }
            if (typeof parsed?.timezone === "string" && parsed.timezone) {
                timezone = parsed.timezone
            }
        } catch {
            // fall back to defaults
        }
    }
    return { thresholds: ALL_THRESHOLDS.filter((t) => enabled[t]), timezone }
}

// Memoize alert prefs per user as a Promise, so concurrent keys for the same
// user share a single user_config read instead of racing duplicates.
function prefsLoader(env) {
    const cache = new Map()
    return (userId) => {
        let p = cache.get(userId)
        if (!p) {
            p = loadAlertPrefs(env, userId)
            cache.set(userId, p)
        }
        return p
    }
}

// One row per (user, key): the highest threshold already announced for `period`.
async function getState(env, userId, keyId) {
    return env.DB.prepare(
        `SELECT period, max_notified FROM alert_state WHERE tg_user_id = ? AND key_id = ?`
    )
        .bind(userId, keyId)
        .first()
}

async function setState(env, userId, keyId, period, maxNotified, now) {
    await env.DB.prepare(
        `INSERT INTO alert_state (tg_user_id, key_id, period, max_notified, notified_at)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(tg_user_id, key_id) DO UPDATE SET
           period = excluded.period,
           max_notified = excluded.max_notified,
           notified_at = excluded.notified_at`
    )
        .bind(userId, keyId, period, maxNotified, now)
        .run()
}

// ── Core ──────────────────────────────────────────────────────────────────────

// Evaluate one key. Returns one of:
//   "sent" | "skip" | "error" | "unsupported" | "unreachable"
async function evaluateKey(env, userId, prefs, keyRow, now) {
    const { thresholds, timezone } = prefs
    if (thresholds.length === 0) return "skip"

    const usage = await fetchUsage(keyRow.key)
    if (!usage.ok) return usage.reason // "error" | "unsupported"

    // Highest enabled threshold the usage has crossed.
    const crossed = thresholds.filter((t) => usage.percentage >= t).pop()
    if (!crossed) return "skip"

    // `period` keys the dedupe ledger to the current quota window. When the
    // quota resets, nextResetTime changes and the alerts re-arm. If Z.ai omits
    // a reset time, fall back to a per-UTC-day window so the ledger still
    // re-arms daily instead of firing exactly once per threshold forever.
    const period =
        usage.resetAt != null
            ? String(usage.resetAt)
            : `day:${now.slice(0, 10)}`

    const state = await getState(env, userId, keyRow.id)
    const alreadyNotified =
        state && state.period === period ? state.max_notified : 0

    if (crossed <= alreadyNotified) return "skip"

    const sent = await sendMessage(
        env,
        userId,
        alertText(keyRow.name, crossed, usage.percentage, usage.resetAt, timezone)
    )
    if (!sent.ok) {
        // 403 → user never started the bot, so it can never be DM'd. Don't
        // advance state (it may become reachable later), but report it
        // distinctly so it isn't mistaken for a transient failure.
        return sent.status === 403 ? "unreachable" : "error"
    }

    await setState(env, userId, keyRow.id, period, crossed, now)
    return "sent"
}

async function runAll(env) {
    const now = new Date().toISOString()
    const { results } = await env.DB.prepare(
        `SELECT tg_user_id, id, name, key FROM api_keys ORDER BY tg_user_id`
    ).all()
    const rows = results ?? []

    const loadPrefs = prefsLoader(env)
    const settled = await Promise.allSettled(
        rows.map(async (row) => {
            const prefs = await loadPrefs(row.tg_user_id)
            return evaluateKey(
                env,
                row.tg_user_id,
                prefs,
                { id: row.id, name: row.name, key: row.key },
                now
            )
        })
    )

    const tally = { sent: 0, skip: 0, error: 0, unsupported: 0, unreachable: 0 }
    for (const r of settled) {
        const outcome = r.status === "fulfilled" ? r.value : "error"
        tally[outcome] = (tally[outcome] ?? 0) + 1
    }
    return { keys: rows.length, ...tally }
}

export default {
    async scheduled(event, env) {
        const s = await runAll(env)
        // Summary only — keys and user ids are never logged.
        console.log(
            `alerts: ${s.sent} sent, ${s.skip} skip, ${s.unsupported} unsupported, ` +
                `${s.unreachable} unreachable, ${s.error} err / ${s.keys} keys @ ${event.cron}`
        )
    },

    // Convenience: trigger a run manually via local `wrangler dev` to verify.
    async fetch(request, env) {
        const summary = await runAll(env)
        return Response.json(summary)
    },
}
