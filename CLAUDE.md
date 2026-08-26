# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm dev         # next dev (Turbopack)
pnpm build       # production build
pnpm start       # serve the build
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm format      # prettier --write
pnpm cf:preview  # opennextjs-cloudflare build + wrangler dev
pnpm cf:deploy   # opennextjs-cloudflare build + wrangler deploy
```

No test runner is configured.

## This is Next.js 16 — not what you remember

App Router on Next.js 16 + React 19. APIs, conventions, and file layout have breaking changes from older versions. Before touching framework-shaped code (route handlers, layouts, params, caching, server components), read the relevant doc in `node_modules/next/dist/docs/` rather than relying on training-data recall. Heed deprecation notices.

## Architecture

Single Next.js app. Most state lives in `localStorage`; the server surface is a CORS-bypass proxy **plus** a small authenticated D1 layer that syncs API keys across devices — identity comes from Telegram in the Mini App, or from a paired device token elsewhere.

### Server surface — route handlers
`app/api/zai/[...path]/route.ts` is a stateless pass-through to Z.ai. It reads `Authorization` and `x-zai-endpoint` from the request and forwards to one of three Z.ai bases:
- `https://api.z.ai/api/paas/v4` — standard inference
- `https://api.z.ai/api/coding/paas/v4` — Coding Plan inference
- `https://api.z.ai/api` — **undocumented** monitor endpoints (`/monitor/usage/quota/limit`, `/monitor/usage/model-usage`) that power the Overview and Usage tabs

The monitor endpoints aren't in Z.ai's public reference and field names can change without warning. If a card surfaces a 4xx/5xx, check those first. Known quirk: Z.ai's Aliyun WAF answers `model-usage` requests coming from Cloudflare Worker egress IPs with a 405 anti-bot page (`quota/limit` and inference pass). Since this app deploys as a Worker, `fetchModelUsage` in `lib/zai-monitor.ts` therefore calls `model-usage` **browser-direct** at `https://api.z.ai/api` (Z.ai reflects any Origin in its CORS headers) and falls back to the proxy only on transport-level failures — non-JSON/HTTP status/network. Envelope errors (e.g. bad token) are definitive and not retried.

`app/api/keys/route.ts` is the API-key sync layer backed by Cloudflare **D1** (binding `DB` in `wrangler.jsonc`, schema in `migrations/`). Every row is scoped to a `tg_user_id` the **server** established — never one the client asserts. Mutations are **per-key** (`POST` upsert / `DELETE` by id); `PUT` is a non-destructive bulk upsert used only by the one-time migration — there is intentionally no whole-set replace, so a stale client can't wipe other rows.

`lib/api-auth.ts` is the shared gate in front of the D1 routes, and it accepts **two credentials** that resolve to the same identity:
- `x-telegram-init-data: <blob>` — the Mini App, HMAC-validated against `TELEGRAM_BOT_TOKEN` in `lib/telegram-auth.ts`
- `authorization: Bearer <token>` — a paired device (see below), looked up by SHA-256 hash in `devices`

Use `authenticateRequest` for data routes (both credentials) and `authenticateTelegramRequest` for anything managing devices. That split is load-bearing: a leaked device token can read and write keys, but cannot mint pairing codes or revoke devices — so it can't entrench itself.

### Device pairing (`/api/devices/*`, `/install.ps1`)
How a non-Telegram client — the Windows tray app, any future desktop/native widget — gets the same keys. The Mini App mints a short code (Settings › Linked devices, `components/settings/linked-devices.tsx`), the user enters it on the device, and the device exchanges it **once** for a long-lived bearer token:

- `POST /api/devices/pair` (Telegram-only) → `{ code, expiresAt }`, 10-min TTL, one live code per user — minting a new one deletes the old
- `POST /api/devices/claim` (**unauthenticated** — the code is the proof) → `{ token, deviceId, name }`; claim + expiry are checked inside the `UPDATE`, so racing clients can't both win
- `GET`/`DELETE /api/devices` (Telegram-only) → list / revoke

Codes and tokens live in `lib/device-auth.ts`. The code is 8 chars of an ambiguity-free base32 (no I/L/O/U) and is normalized before hashing, so a user can type it lowercase, dashed, or with O-for-0; the token is 32 random bytes. **Only SHA-256 hashes are stored** (migration `0003_devices.sql`) — the plaintext of either never lands in D1. `last_seen_at` is refreshed at most every 5 min, off the response path via `ctx.waitUntil`, so a polling client doesn't turn every read into a write.

`app/api/summary/route.ts` is the rollup a badge can render: one `usedPct` per key plus `worstPct`, authenticated with either credential. The dashboard does this fan-out client-side (`useKeysModelUsage`), which a tray icon can't — so this route repeats it server-side, calling Z.ai directly (no browser, no CORS to dodge) and mirroring `fetchUsage` in `alerts-cron/worker.js`, including its `ok`/`unsupported`/`error` split. One bad key never fails the response.

`app/install.ps1/route.ts` serves the `irm https://<host>/install.ps1 | iex` one-liner shown in the pairing drawer (with `$env:AI_QUOTA_CODE` pre-filled). The script does the claim itself and writes the token to `%APPDATA%\ai-quota\config.json`, so the desktop client starts authenticated and never implements the exchange; the API base is baked in from the request origin. Downloading the client binary from GitHub Releases is best-effort and currently a no-op — **no Windows client is published yet**, so today the script's useful half is pairing.

### Client data flow
- **TanStack Query** wraps the Z.ai calls (`lib/zai-monitor.ts`, `lib/zai-client.ts`), 60s refresh on the dashboard; `model-usage` goes browser-direct (see the WAF quirk above), everything else through the `/api/zai` proxy. `useKeysModelUsage(keys, days)` in `hooks/use-key-quota.ts` fans out one query per key via `useQueries` — Overview and Usage both aggregate from it. All usage/quota numbers come from Z.ai's monitor endpoints; the app does not keep a local usage log.
- **Zustand** stores in `lib/stores/`: `ui-store` (selected key id), `auth-store`, `alerts-store` (per-threshold enable flags + per-key `lastFired` tracking for the 50/75/90/95% alerts surfaced in `components/settings/alert-thresholds.tsx`).
- **API keys** are D1-authoritative when in Telegram, with localStorage as an offline cache. `hooks/use-api-keys.ts` reads via `useApiKeys` (queryKey carries an auth marker so it re-runs once `initDataRaw` resolves) and writes via per-key optimistic mutations that sync one row to D1 and surface a toast on failure. `lib/api-keys.ts` holds the shared storage + network helpers; `normalizeApiKey` in `lib/types.ts` is the single key-shaping function used by both client and server. Outside Telegram (no `initDataRaw`, e.g. plain `next dev`) it degrades to localStorage-only. `components/providers/key-migration.tsx` does the one-time localStorage→D1 push (snapshot-safe, not inside the query) and shows the "synced" toast.
- **localStorage** is the source of truth for the rest of the user-owned state:
  - `zai-tracker-keys` — API-key cache (`{ id, name, endpoint, key, … }`, see `ApiKey` in `lib/types.ts`); canonical copy lives in D1 when authenticated
  - `zai-tracker-ui`, `zai-tracker-alerts`
  - A one-time `LegacyStorageCleanup` provider wipes obsolete `zai:events:*` keys (an old Playground call log that no longer exists) — don't reintroduce that log.
- Playground shows a per-call cost estimate computed from `lib/zai-pricing.ts` (hand-maintained table — approximate). It is not persisted.
- Per-key chart/badge colors come from `lib/key-palette.ts` — the same key index always maps to the same hue across Overview and Usage.

### Routes (`app/(app)/`)
`/` Overview · `/usage` · `/playground` · `/settings`. Bottom-tab nav. `/models` still exists as a route but is hidden from the nav (`components/layout/bottom-nav.tsx`).

Overview and Usage aggregate across **all** keys (totals, pie, daily lines). Playground stays single-key. The header key switcher only shows on pages that use `AppHeader`'s default `rightAction="switcher"`; Overview and Usage opt into `rightAction="add"` for an icon-only `+` button instead.

### Key warm-up + the standalone cron worker (`warmup-cron/`)
Coding Plan keys go "cold" if idle; a tiny `glm-4.5-air` call keeps them warm. `warmUpKey()` in `lib/zai-client.ts` defines the request shape (`max_tokens: 1`, `stream: false`); the Playground header's `WarmUpDrawer` fires it manually through the `/api/zai` proxy.

`warmup-cron/` is a **separate, independently deployed** Cloudflare Cron Worker that does the same thing on a schedule — it is **not** part of the Next app build and shares no code with it. It calls Z.ai directly (a Worker has no browser CORS to bypass), reads keys from the `WARMUP_KEYS` secret (comma-separated), and has its own `wrangler.jsonc` with cron triggers (deploy from inside that dir: `cd warmup-cron && npx wrangler deploy`). It can't live in the main app because keys exist only in browser `localStorage` and the OpenNext Worker exports only a `fetch` handler. See `warmup-cron/README.md`. Cloudflare crons are UTC-only, so the UTC+7 schedule is pre-offset in the cron expressions.

### Telegram usage alerts — second cron worker (`alerts-cron/`)
A separate, independently deployed Cron Worker that DMs a user when one of their keys crosses an enabled usage threshold (50/75/90/95%, from `components/settings/alert-thresholds.tsx`). Unlike `warmup-cron`, it is **coupled to the app's D1 schema**: it reads `api_keys` and `user_config` (the `alerts` namespace, synced client-side by `components/providers/alerts-sync.tsx` via `/api/config`) and writes the `alert_state` dedupe ledger (migration `0002`), so each threshold fires at most once per quota window. It needs the same `DB` binding and `TELEGRAM_BOT_TOKEN` secret as the Next app, polls Z.ai's monitor endpoint directly, and sends via the Bot API with `chat_id = tg_user_id`. The 50/75/90/95 threshold set and defaults are duplicated from `lib/stores/alerts-store.ts` (separate deploy, no shared code) — keep them in sync. See `alerts-cron/README.md`. Caveat: the Bot API can't DM a user who never pressed Start in a private chat (reported as `unreachable`, never delivered).

### Windows tray client (`desktop/`)
A Tauri v2 app, independently built and released like the two crons — **not** part of the Next app's build, sharing no code with it. The whole contract between them is `GET /api/summary` plus the `%APPDATA%\ai-quota\config.json` the installer writes.

- `src/config.rs` reads that file; the tray never performs the pairing exchange itself, so it is either paired at startup or shows "not paired".
- `src/icon.rs` rasterises the tray icon at runtime — Windows tray icons are images with no text API, so the number becomes a ring that fills clockwise, tinted at the same 75/90 thresholds as the app's alerts. Covered by `cargo test`.
- The popover is a static page inside the binary (`dist/index.html`), fed over IPC. It deliberately does **not** load the deployed web app: that authenticates with Telegram `initData`, which a desktop webview has none of, so it would render empty. "Open dashboard" opens the site in the browser instead.
- Polls every 5 min (each poll costs one Z.ai call per key), vs the dashboard's 60s.

Released by `.github/workflows/desktop-release.yml` on a `desktop-v*` tag, built on `windows-latest` (cross-compiling from macOS needs MSVC). `/install.ps1` installs whatever `.exe` is attached to `releases/latest`. See `desktop/README.md`.

### Deployment
Three distinct Cloudflare Workers, all deployed separately: the Next app (via `@opennextjs/cloudflare`, root `wrangler.jsonc`, `pnpm cf:deploy`), `warmup-cron`, and `alerts-cron`. The Next app additionally needs the `TELEGRAM_BOT_TOKEN` secret (`wrangler secret put`, and `.dev.vars` locally) and the `DB` D1 binding; apply migrations with `wrangler d1 migrations apply ai-quota --remote` (`0003_devices.sql` must be applied before device pairing works). `alerts-cron` shares that same `DB` and secret, so it must be redeployed when the D1 schema changes and its migration (`0002_alert_state.sql`) must be applied before its first run.

### Telegram Mini App
`components/providers/telegram-provider.tsx` initializes `@telegram-apps/sdk-react`, falls back to a dev mock outside Telegram. `initData` **is** validated server-side (`lib/telegram-auth.ts`) for the D1 routes — that is the trust anchor for per-user key storage, and the root of trust every device token descends from. The rest of the app still trusts the client (no validation needed for the localStorage-only state).

## Conventions

- **Mobile-first.** Designed for Telegram Mini App viewports.
- **Use `Drawer` (vaul), not `Dialog`,** for all modal flows. shadcn/ui + Tailwind v4, icons from `@hugeicons/react`.
- Keys are stored in plaintext (localStorage cache + the D1 `key` column, and `%APPDATA%\ai-quota\config.json` on a paired Windows device). D1 rows are scoped to a server-validated `tg_user_id`, but there is no at-rest encryption — fine for personal use, treat the bot token and DB as sensitive. Pairing codes and device tokens are the exception: those are hashed, so a DB leak can't be replayed as a credential.
