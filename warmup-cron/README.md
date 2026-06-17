# zai-warmup-cron

A standalone Cloudflare **Cron Worker** that keeps Z.ai **Coding Plan** API keys
"warm" by firing a tiny `glm-4.5-air` inference call on a schedule.

It is **independent** of the main `ai-quota` Next app:

- It calls `https://api.z.ai/...` **directly** — it does not use the app's
  `/api/zai` proxy (that proxy only exists to bypass _browser_ CORS; a Worker has
  no CORS restriction).
- It deploys separately (its own `wrangler.jsonc`, its own Worker), and shares no
  code or build with the Next app.

## Why this exists

In the main app, warming a key is a **manual** action — the Playground header
button opens `WarmUpDrawer`, which calls `warmUpKey()` in `../lib/zai-client.ts`.
That can't be automated from the app because:

1. Keys live only in the browser's `localStorage` — there's no server-side list
   to drive a scheduled job.
2. The app's deployed Worker (OpenNext) exports only a `fetch` handler, so a cron
   added there would fire but do nothing.

This Worker solves both: keys are provided server-side as a secret, and it has a
real `scheduled()` handler.

## How it works

`worker.js` exports two handlers:

| Handler        | Trigger                  | Purpose                                            |
| -------------- | ------------------------ | -------------------------------------------------- |
| `scheduled()`  | Cron (3×/day)            | Warms every key; logs a key-free summary line.     |
| `fetch()`      | HTTP request to the URL  | Manual verification; returns a per-key result JSON. |

Both read the `WARMUP_KEYS` secret (comma-separated), warm each key concurrently
with `Promise.allSettled` (one bad key never aborts the others), and reuse the
exact request shape from `../lib/zai-client.ts`:

```jsonc
POST https://api.z.ai/api/coding/paas/v4/chat/completions
{ "model": "glm-4.5-air", "messages": [{ "role": "user", "content": "hi" }],
  "max_tokens": 1, "stream": false }
```

## Schedule

Three runs/day at **05:30, 10:30, 15:30 (UTC+7)**.

Cloudflare crons run in **UTC only**, so the +7 offset is pre-computed in
`wrangler.jsonc`:

| Local (UTC+7) | Cron (UTC)    |
| ------------- | ------------- |
| 05:30         | `30 22 * * *` |
| 10:30         | `30 3 * * *`  |
| 15:30         | `30 8 * * *`  |

## Setup

Keys are supplied as a single comma-separated secret — **never committed**.

```bash
cd warmup-cron
npx wrangler secret put WARMUP_KEYS
# paste (one line, no spaces):  key1,key2,key3
```

## Deploy

```bash
npx wrangler deploy
```

> If `wrangler` can't pick your account non-interactively, add
> `"account_id": "<id>"` to `wrangler.jsonc` (same account as `../wrangler.jsonc`).

## Verify

The deployed Worker has **no public URL** (`workers_dev` is `false`), so verify
locally. The `fetch()` handler returns one result entry per parsed key — the array
length confirms how many keys were read:

```bash
npx wrangler dev          # serves fetch() locally
curl http://localhost:8787/
# [{"ok":true,"status":200}, ...]   ← one entry per key
```

To exercise the cron (`scheduled`) path itself:

```bash
npx wrangler dev --test-scheduled
curl "http://localhost:8787/__scheduled?cron=0+9+*+*+*"
# watch for:  warm-up: N/N ok @ 0 9 * * *
```

After a real scheduled run in production, check logs with `npx wrangler tail`.

## Operations

- **Rotate / change keys:** re-run `npx wrangler secret put WARMUP_KEYS`, then
  verify the new count locally (`npx wrangler dev` + `curl localhost`).
- **Change schedule:** edit `triggers.crons` in `wrangler.jsonc` (remember UTC)
  and redeploy.
- **Confirm triggers:** Cloudflare dashboard → Worker → Settings → Triggers, or
  `npx wrangler deployments list`.

## Security notes

- **Keys never appear in logs** — only an `N/N ok` summary is logged.
- **No public surface:** `workers_dev` is `false`, so the Worker is invoked only by
  its cron triggers. The `fetch()` handler is reachable only via local
  `wrangler dev` for verification — not from the internet.
- Keys are credentials: they're stored as a Wrangler **secret**, not a plaintext
  `var`.

## Files

| File             | Purpose                                            |
| ---------------- | -------------------------------------------------- |
| `worker.js`      | The Worker — `scheduled()` + `fetch()` handlers.   |
| `wrangler.jsonc` | Worker name, entry, cron triggers, observability.  |
| `README.md`      | This document.                                     |
