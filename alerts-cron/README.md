# zai-alerts-cron

A standalone Cloudflare **Cron Worker** that pushes **Telegram usage alerts**:
when a key crosses one of the enabled usage thresholds (50 / 75 / 90 / 95%), it
DMs the owner through the bot.

It is **independent** of the main `ai-quota` Next app (same pattern as
`../warmup-cron/`), with one key difference: it is **bound to the same D1
database**, which is what makes server-side alerting possible at all.

## Why this exists / why it can live here

The in-app alert thresholds (`components/settings/alert-thresholds.tsx`) are just
preferences — the app never fires anything, and usage is fetched only in the
browser. Three things are needed to alert from a schedule, and all are now
server-side:

| Need              | Source                                                              |
| ----------------- | ------------------------------------------------------------------ |
| The keys          | D1 `api_keys.key` (per `tg_user_id`)                                |
| Who to notify     | `tg_user_id` — usable as a Telegram `chat_id` for the Mini App user |
| Which thresholds  | D1 `user_config` namespace `alerts` (synced from the settings UI)  |
| Reset-time zone   | `timezone` on that same `alerts` blob (browser IANA zone; UTC fallback) |
| How to send       | `TELEGRAM_BOT_TOKEN` (same bot that validates initData)             |

## How it works

`worker.js` exports `scheduled()` (cron) and `fetch()` (manual verify). Each run:

1. `SELECT tg_user_id, id, name, key FROM api_keys`.
2. Per key, calls Z.ai **directly** — `GET https://api.z.ai/api/monitor/usage/quota/limit`
   with `Authorization: Bearer <key>` (no `/api/zai` proxy; a Worker has no
   browser CORS). Reads `data.limits[0].percentage` (percent used) and
   `nextResetTime`.
3. Looks up the user's enabled thresholds from `user_config` (`alerts`
   namespace); falls back to the app default `{75, 90, 95}` if not synced yet
   (or if the stored blob is empty/malformed).
4. Finds the highest crossed threshold and dedupes against the `alert_state`
   ledger: **one message per threshold per quota window**. A jump from 0%→95%
   sends a single 95% message, not three. When `nextResetTime` rolls over, the
   window changes and the alerts re-arm.
5. `sendMessage` via the Bot API with `chat_id = tg_user_id`. The reset time in
   the message is rendered in the user's synced `timezone` (the browser IANA
   zone `alerts-sync.tsx` rides along on the `alerts` blob), falling back to UTC
   when none was synced — a Worker has no browser to resolve a local zone itself.

Keys are evaluated concurrently (`Promise.allSettled`), so one slow or bad key
never blocks or aborts the others. Each key's outcome is tallied in the run
summary as one of: `sent`, `skip` (not crossed / already alerted this window),
`unsupported` (key has no monitorable quota, e.g. non-Coding-Plan), `unreachable`
(see caveat below), or `error` (transient failure).

> **Caveat — the bot must be started first.** Telegram only lets a bot DM a user
> who has previously pressed Start in a private chat with it. A Mini-App-only
> user who never did has a valid `tg_user_id` but is unreachable; `sendMessage`
> returns 403 and the key is counted as `unreachable` (state is *not* advanced,
> so it delivers once they do start the bot).

> **Constants are duplicated.** `ALL_THRESHOLDS` and `DEFAULT_ENABLED` in
> `worker.js` mirror `ALL` / `defaultEnabled` in
> `../lib/stores/alerts-store.ts`. This is a separate deploy with no shared code,
> so if the app's threshold set or defaults change, update both.

## Migrations

The dedupe ledger lives in the shared DB — apply it from the **repo root** (same
place the app's migrations are applied):

```bash
# from repo root
wrangler d1 migrations apply ai-quota --remote     # 0002_alert_state.sql
```

## Setup

The bot token is a secret (same value as the Next app's):

```bash
cd alerts-cron
npx wrangler secret put TELEGRAM_BOT_TOKEN
```

## Schedule

Every **15 minutes** (`*/15 * * * *`). Quota can be exhausted in a few hours, so
a coarse schedule would sail past 75/90/95% between polls and never alert; 15min
keeps an alert within ~15min of the crossing. An every-N-minutes cron is
timezone-independent, so unlike `warmup-cron` there's no UTC offset to compute.

Polling this often is cheap — the `alert_state` ledger keeps each threshold to a
single message per quota window regardless of poll frequency. To change the
cadence, edit `triggers.crons` in `wrangler.jsonc` and redeploy.

## Deploy

```bash
cd alerts-cron
npx wrangler deploy
```

## Verify

No public URL (`workers_dev: false`). Verify locally:

```bash
npx wrangler dev                 # serves fetch() against the remote D1
curl http://localhost:8787/
# { "keys": N, "sent": .., "skip": .., "unsupported": .., "unreachable": .., "error": .. }

# exercise the cron path itself:
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+2+*+*+*"
```

After a real run, `npx wrangler tail` shows the key-free summary line.

## Security notes

- **Keys / user ids never appear in logs** — only an aggregate summary.
- **No public surface:** `workers_dev` is `false`; `fetch()` is reachable only via
  local `wrangler dev`.
- Reads plaintext keys from D1 (same trust model as the app) and holds the bot
  token as a Wrangler **secret**.

## Files

| File             | Purpose                                              |
| ---------------- | ---------------------------------------------------- |
| `worker.js`      | The Worker — `scheduled()` + `fetch()` handlers.     |
| `wrangler.jsonc` | Name, entry, D1 binding, cron triggers.              |
| `README.md`      | This document.                                       |
