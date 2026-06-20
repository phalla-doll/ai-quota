# AGENTS.md

This file provides guidance to coding agents when working with code in this repository.

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

Single Next.js app. Most state lives in `localStorage`; the server surface is a CORS-bypass proxy **plus** a small Telegram-authenticated D1 layer that syncs API keys across devices.

### Server surface — two route handlers
`app/api/zai/[...path]/route.ts` is a stateless pass-through to Z.ai. It reads `Authorization` and `x-zai-endpoint` from the request and forwards to one of three Z.ai bases:
- `https://api.z.ai/api/paas/v4` — standard inference
- `https://api.z.ai/api/coding/paas/v4` — Coding Plan inference
- `https://api.z.ai/api` — **undocumented** monitor endpoints (`/monitor/usage/quota/limit`, `/monitor/usage/model-usage`) that power the Overview and Usage tabs

The monitor endpoints aren't in Z.ai's public reference and field names can change without warning. If a card surfaces a 4xx/5xx, check those first.

`app/api/keys/route.ts` is the API-key sync layer backed by Cloudflare **D1** (binding `DB` in `wrangler.jsonc`, schema in `migrations/`). It validates a Telegram `initData` blob (header `x-telegram-init-data`) via `lib/telegram-auth.ts` (HMAC against the `TELEGRAM_BOT_TOKEN` Worker secret) and scopes every row to the verified `tg_user_id`. Mutations are **per-key** (`POST` upsert / `DELETE` by id); `PUT` is a non-destructive bulk upsert used only by the one-time migration — there is intentionally no whole-set replace, so a stale client can't wipe other rows.

### Client data flow
- **TanStack Query** wraps the proxy calls (`lib/zai-monitor.ts`, `lib/zai-client.ts`), 60s refresh on the dashboard. `useKeysModelUsage(keys, days)` in `hooks/use-key-quota.ts` fans out one query per key via `useQueries` — Overview and Usage both aggregate from it. All usage/quota numbers come from Z.ai's monitor endpoints; the app does not keep a local usage log.
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

### Deployment
Two distinct Cloudflare Workers: the Next app (via `@opennextjs/cloudflare`, root `wrangler.jsonc`, `pnpm cf:deploy`) and the cron worker above. They deploy separately. The Next app additionally needs the `TELEGRAM_BOT_TOKEN` secret (`wrangler secret put`, and `.dev.vars` locally) and the `DB` D1 binding; apply migrations with `wrangler d1 migrations apply ai-quota --remote`.

### Telegram Mini App
`components/providers/telegram-provider.tsx` initializes `@telegram-apps/sdk-react`, falls back to a dev mock outside Telegram. `initData` **is** validated server-side (`lib/telegram-auth.ts`) for the `/api/keys` D1 routes — that is the trust anchor for per-user key storage. The rest of the app still trusts the client (no validation needed for the localStorage-only state).

## Conventions

- **Mobile-first.** Designed for Telegram Mini App viewports.
- **Use `Drawer` (vaul), not `Dialog`,** for all modal flows. shadcn/ui + Tailwind v4, icons from `@hugeicons/react`.
- Keys are stored in plaintext (localStorage cache + the D1 `key` column). D1 rows are scoped to a Telegram-validated `tg_user_id`, but there is no at-rest encryption — fine for personal use, treat the bot token and DB as sensitive.
