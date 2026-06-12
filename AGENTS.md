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

Single Next.js app, **no backend, no database, no auth**. State lives in `localStorage`; the only server code is a CORS-bypass proxy.

### Server surface — one file
`app/api/zai/[...path]/route.ts` is a stateless pass-through to Z.ai. It reads `Authorization` and `x-zai-endpoint` from the request and forwards to one of three Z.ai bases:
- `https://api.z.ai/api/paas/v4` — standard inference
- `https://api.z.ai/api/coding/paas/v4` — Coding Plan inference
- `https://api.z.ai/api` — **undocumented** monitor endpoints (`/monitor/usage/quota/limit`, `/monitor/usage/model-usage`) that power the Overview and Usage tabs

The monitor endpoints aren't in Z.ai's public reference and field names can change without warning. If a card surfaces a 4xx/5xx, check those first.

### Client data flow
- **TanStack Query** wraps the proxy calls (`lib/zai-monitor.ts`, `lib/zai-client.ts`), 60s refresh on the dashboard. `useKeysModelUsage(keys, days)` in `hooks/use-key-quota.ts` fans out one query per key via `useQueries` — Overview and Usage both aggregate from it. All usage/quota numbers come from Z.ai's monitor endpoints; the app does not keep a local usage log.
- **Zustand** stores in `lib/stores/`: `ui-store` (selected key id), `auth-store`, `alerts-store` (per-threshold enable flags + per-key `lastFired` tracking for the 50/75/90/95% alerts surfaced in `components/settings/alert-thresholds.tsx`).
- **localStorage** is the source of truth for everything user-owned:
  - `zai-tracker-keys` — API keys (`{ id, name, endpoint, key, … }`, see `ApiKey` in `lib/types.ts`)
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
Two distinct Cloudflare Workers: the Next app (via `@opennextjs/cloudflare`, root `wrangler.jsonc`, `pnpm cf:deploy`) and the cron worker above. They deploy separately.

### Telegram Mini App
`components/providers/telegram-provider.tsx` initializes `@telegram-apps/sdk-react`, falls back to a dev mock outside Telegram. There is **no `initData` HMAC validation** — there is no server to do it on.

## Conventions

- **Mobile-first.** Designed for Telegram Mini App viewports.
- **Use `Drawer` (vaul), not `Dialog`,** for all modal flows. shadcn/ui + Tailwind v4, icons from `@hugeicons/react`.
- Keys live in plaintext localStorage — fine for personal use, **not** safe to host publicly without adding auth.
