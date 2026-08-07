import type { NextRequest } from "next/server"
import { authenticateRequest } from "@/lib/api-auth"

// One-number-per-key rollup for clients that can't run the browser's fan-out.
//
//   GET /api/summary -> { keys: KeySummary[], worstPct, fetchedAt }
//
// The dashboard aggregates quota client-side (hooks/use-key-quota.ts, one query
// per key via useQueries), which a tray icon or an Adaptive Card can't do. This
// route does the same fan-out server-side and returns just what a badge needs.
//
// It calls Z.ai directly rather than through /api/zai — that proxy exists only
// to dodge browser CORS, and there is no browser here (same reasoning as
// alerts-cron/worker.js, whose fetchUsage this mirrors).

const MONITOR_QUOTA_URL = "https://api.z.ai/api/monitor/usage/quota/limit"

export type KeySummary = {
    id: string
    name: string
    // percent USED, 0-100 — null when this key has no readable quota
    usedPct: number | null
    resetAt: string | null
    state: "ok" | "unsupported" | "error"
}

type KeyRow = { id: string; name: string; key: string }

type QuotaLimitRow = {
    type?: string
    percentage?: number
    nextResetTime?: number
}

// Same discriminated outcome as the cron's fetchUsage: "unsupported" is a
// steady state (a key that structurally has no quota, e.g. pay-as-you-go),
// "error" is transient. One bad key never fails the whole response.
async function fetchUsage(
    key: string
): Promise<Pick<KeySummary, "usedPct" | "resetAt" | "state">> {
    const miss = (state: "unsupported" | "error") => ({
        usedPct: null,
        resetAt: null,
        state,
    })

    let res: Response
    try {
        res = await fetch(MONITOR_QUOTA_URL, {
            headers: { authorization: `Bearer ${key}` },
            cache: "no-store",
        })
    } catch {
        return miss("error")
    }
    if (!res.ok) return miss("error")

    let body: { success?: boolean; data?: { limits?: QuotaLimitRow[] } }
    try {
        body = await res.json()
    } catch {
        return miss("error")
    }
    if (!body || body.success === false) return miss("unsupported")

    const limits = body.data?.limits
    if (!Array.isArray(limits) || limits.length === 0) {
        return miss("unsupported")
    }

    // Match the app's primary-quota selection (quota-card.tsx): prefer the
    // TOKENS_LIMIT entry — the array can also hold a TIME_LIMIT (Search/Reader)
    // entry and the order is not guaranteed.
    const primary = limits.find((l) => l.type === "TOKENS_LIMIT") ?? limits[0]
    const pct = Number(primary.percentage)
    if (!Number.isFinite(pct)) return miss("unsupported")

    return {
        usedPct: pct,
        resetAt: primary.nextResetTime
            ? new Date(Number(primary.nextResetTime)).toISOString()
            : null,
        state: "ok",
    }
}

export async function GET(req: NextRequest) {
    const auth = await authenticateRequest(req)
    if ("error" in auth) return auth.error

    const { results } = await auth.db
        .prepare(
            `SELECT id, name, key FROM api_keys WHERE tg_user_id = ? ORDER BY created_at ASC`
        )
        .bind(auth.userId)
        .all<KeyRow>()

    const rows = results ?? []
    const keys: KeySummary[] = await Promise.all(
        rows.map(async (r) => ({
            id: r.id,
            name: r.name,
            ...(await fetchUsage(r.key)),
        }))
    )

    // The badge shows the key closest to running out; null when nothing is
    // readable, which the client renders as an idle icon rather than 0%.
    const readable = keys
        .map((k) => k.usedPct)
        .filter((p): p is number => p !== null)
    const worstPct = readable.length ? Math.max(...readable) : null

    return Response.json(
        { keys, worstPct, fetchedAt: new Date().toISOString() },
        { headers: { "cache-control": "no-store" } }
    )
}
