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
- **TanStack Query** wraps the proxy calls (`lib/zai-monitor.ts`, `lib/zai-client.ts`), 60s refresh on the dashboard. `useKeysModelUsage(keys, days)` in `hooks/use-key-quota.ts` fans out one query per key via `useQueries` — Overview and Usage both aggregate from it.
- **Zustand** stores in `lib/stores/`: `ui-store` (selected key id, invalidation counter), `alerts-store` (global threshold toggles + per-key fired tracking), `auth-store`.
- **localStorage** is the source of truth for everything user-owned:
  - `zai-tracker-keys` — API keys (`{ id, name, endpoint, key, monthlyBudgetCents, … }`)
  - `zai:events:{keyId}` — append-only Playground call log (tokens, cost in cents)
  - `zai-tracker-ui`, `zai-tracker-alerts`
- Playground cost is computed locally from `lib/zai-pricing.ts` (hand-maintained table — approximate).
- Per-key chart/badge colors come from `lib/key-palette.ts` — the same key index always maps to the same hue across Overview and Usage.

### Routes (`app/(app)/`)
`/` Overview · `/usage` · `/playground` · `/settings`. Bottom-tab nav. `/models` still exists as a route but is hidden from the nav (`components/layout/bottom-nav.tsx`).

Overview and Usage aggregate across **all** keys (totals, pie, daily lines). Playground stays single-key. The header key switcher only shows on pages that use `AppHeader`'s default `rightAction="switcher"`; Overview and Usage opt into `rightAction="add"` for an icon-only `+` button instead.

### Telegram Mini App
`components/providers/telegram-provider.tsx` initializes `@telegram-apps/sdk-react`, falls back to a dev mock outside Telegram. There is **no `initData` HMAC validation** — there is no server to do it on.

## Conventions

- **Mobile-first.** Designed for Telegram Mini App viewports.
- **Use `Drawer` (vaul), not `Dialog`,** for all modal flows. shadcn/ui + Tailwind v4, icons from `@hugeicons/react`.
- Keys live in plaintext localStorage — fine for personal use, **not** safe to host publicly without adding auth.
