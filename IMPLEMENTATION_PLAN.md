# Z AI Quota Tracker — MVP Implementation Plan

## Current State Summary

The repo is a minimal Next.js 16.2.6 + React 19.2.4 + Tailwind v4 + shadcn/ui (radix-luma style) scaffold using pnpm. Only `app/layout.tsx`, `app/page.tsx`, `theme-provider.tsx`, `button.tsx`, and `lib/utils.ts` exist. No backend, no DB, no auth, no Telegram SDK, no charts, no state mgmt. The `AGENTS.md` reminder warns that Next is on a newer version than typical training data — consult `node_modules/next/dist/docs/` for current conventions before touching App Router internals.

Note: `package.json` lists `next: 16.2.6` (not 15 as the README says) and `radix-ui` umbrella package (not individual `@radix-ui/*`). Plan respects those.

## Architectural Decisions Up Front

1. **Two deploy targets, one repo (monorepo-lite).** Next.js (frontend Mini App) deploys to Cloudflare Pages or Vercel. Cloudflare Worker (API + cron) lives in `worker/` as a sibling, sharing types via `shared/` and Drizzle schema. Reason: Workers cron + D1 + KV bindings are first-class on Workers, awkward on Next runtime; keeping them separate avoids forcing the Next app onto the edge runtime and keeps cold-start small.
2. **Provider-agnostic via a `UsageProvider` interface.** Z AI is one implementation; OpenAI/Anthropic plug in later by implementing the same interface. Stored in `shared/providers/`.
3. **API keys encrypted with AES-GCM using a Worker secret (`ENCRYPTION_KEY`).** Web Crypto in the Worker — no third-party crypto dep. Keys are never returned to the frontend; only `id`, `name`, and `last4` mask.
4. **Auth via Telegram `initData` HMAC validation** on every Worker request. Short-lived JWT (or signed session cookie) issued after first validation to reduce per-request HMAC work; refreshed when Mini App reopens.
5. **TanStack Query for server cache + Zustand for UI state** (selected API key, tab, etc.) — matches README stack.
6. **Charts: Recharts** (works with React 19, well-supported by shadcn `chart` block, mobile-friendly). Alternative: `visx` — heavier. Going with Recharts.
7. **Snapshots are append-only**; aggregations done at query time with SQL, cached in KV with short TTL (60s for "now", 5min for daily rollups).

---

## Phase 1 — Foundation & Setup

### Dependencies to add (frontend, `package.json`)
- `@telegram-apps/sdk-react` (Mini Apps SDK, React bindings)
- `@tanstack/react-query` + `@tanstack/react-query-devtools`
- `zustand`
- `recharts`
- `zod` (shared validation)
- `date-fns`
- `sonner` (toasts, shadcn-compatible) — install via `pnpm dlx shadcn@latest add sonner`
- shadcn components to add: `card`, `progress`, `tabs`, `input`, `label`, `dialog`, `dropdown-menu`, `skeleton`, `badge`, `chart`, `sheet`, `form`, `sonner`

### Dependencies for worker (`worker/package.json`, new workspace)
- `hono` (router; small, edge-native, TS-first)
- `drizzle-orm`, `drizzle-kit`
- `@cloudflare/workers-types`
- `wrangler` (dev dep)
- `zod` (shared with frontend via `shared/`)

### Files / dirs to create
- `worker/` — new workspace, added to `pnpm-workspace.yaml`
  - `worker/wrangler.toml` — bindings for `DB` (D1), `CACHE` (KV), `ENCRYPTION_KEY` (secret), `TELEGRAM_BOT_TOKEN` (secret), `JWT_SECRET` (secret), cron triggers
  - `worker/src/index.ts` — Hono app entry, `fetch` + `scheduled` handlers
  - `worker/src/env.ts` — typed `Env` interface
  - `worker/tsconfig.json`
  - `worker/package.json`
- `shared/` — Drizzle schema, zod schemas, provider interface, shared DTOs
- `.env.local.example` — `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_TELEGRAM_BOT_USERNAME`
- `.dev.vars` (worker) — local secrets
- `drizzle.config.ts` (at root, points at `shared/db/schema.ts` and worker D1)

### Telegram bot setup (manual, document in `README.md`)
- Create bot via `@BotFather`, capture token.
- Set Mini App URL with `/newapp` → points to deployed frontend.
- Set domain for login widget if used outside Mini App context (probably not needed for MVP).

### Open questions
- Deploy frontend to Cloudflare Pages or Vercel? Recommend Pages for single-cloud op + free egress to Worker.
- Single Worker for API + cron, or split? Recommend single — simpler bindings.

---

## Phase 2 — Data Layer

### Drizzle schema (`shared/db/schema.ts`)
Tables (sqlite/D1 dialect):
- `users` — `id` (uuid), `telegram_id` (int, unique, indexed), `name`, `username`, `photo_url`, `created_at`
- `api_keys` — `id` (uuid), `user_id` (fk), `name`, `provider` ("zai" default; future-proofed), `encrypted_key` (blob), `iv` (blob), `key_last4` (text, for UI), `monthly_budget_cents` (int, nullable), `created_at`, `last_synced_at`
- `usage_snapshots` — `id`, `api_key_id` (fk, indexed), `captured_at` (indexed), `requests` (int), `tokens_input` (int), `tokens_output` (int), `cost_cents` (int), `raw_json` (text — provider response for replay/debug)
- `usage_by_model` — `id`, `snapshot_id` (fk), `model` (text), `requests`, `tokens_input`, `tokens_output`, `cost_cents` — split table because Z AI returns per-model rollups
- `alerts` — `id`, `user_id`, `api_key_id` (nullable: per-key or global), `threshold` (int 50/75/90/95), `enabled` (bool), `last_fired_at` (nullable), `last_fired_period` (text "YYYY-MM" — prevents repeat fires same month)
- `sessions` (optional if going JWT-cookie) — `id`, `user_id`, `expires_at`

### Encryption strategy
- `ENCRYPTION_KEY` is a 32-byte base64 secret stored via `wrangler secret put`.
- Per-row random 12-byte IV stored alongside ciphertext.
- AES-GCM via `crypto.subtle.importKey` + `encrypt`/`decrypt`.
- Helper: `shared/crypto/aead.ts` with `encryptKey(plaintext, masterKey)` / `decryptKey(ciphertext, iv, masterKey)`.
- Decrypted key never leaves the worker; only used to call Z AI within request/cron handler.

### Provider abstraction (`shared/providers/`)
- `types.ts` — `UsageProvider` interface:
  ```ts
  interface UsageProvider {
    id: "zai" | "openai" | "anthropic" | ...
    fetchUsage(apiKey: string, opts: { since: Date; until: Date }): Promise<UsageSnapshot>
    validateKey(apiKey: string): Promise<{ ok: boolean; error?: string }>
  }
  type UsageSnapshot = { requests; tokensIn; tokensOut; costCents; byModel: ModelUsage[]; raw: unknown }
  ```
- `zai/client.ts` — concrete impl using `https://api.z.ai/api/paas/v4`. Endpoints to confirm via Z AI docs: usage/balance endpoint. Open question below.
- `registry.ts` — maps `provider` string → impl.

### Open questions
- **Z AI usage endpoint shape is undocumented in README.** Need to confirm: is there `/usage`, `/billing/usage`, or only per-request token counts in chat completions? If the latter, the worker must track usage itself (proxy) — significantly different design. **Flag for user to confirm before starting Phase 3.** Plan assumes a polling endpoint exists; fallback design: worker becomes a recording proxy (out of MVP scope).

---

## Phase 3 — Backend (Worker)

### Files
- `worker/src/index.ts` — Hono app, mounts routers
- `worker/src/routes/auth.ts` — `POST /auth/telegram` (validate initData → issue JWT)
- `worker/src/routes/keys.ts` — `GET/POST/DELETE /api/keys`, `POST /api/keys/:id/validate`
- `worker/src/routes/usage.ts` — `GET /api/usage/current`, `GET /api/usage/daily?days=30`, `GET /api/usage/models`, `GET /api/usage/history?range=...`
- `worker/src/routes/alerts.ts` — `GET/PUT /api/alerts`
- `worker/src/routes/telegram.ts` — `POST /webhook/telegram` (bot command handling — optional MVP)
- `worker/src/middleware/auth.ts` — JWT verify + load user
- `worker/src/services/usage-sync.ts` — `syncApiKey(keyId)`: decrypt, call provider, write snapshot
- `worker/src/services/alerts.ts` — `checkAndFireAlerts(userId)`
- `worker/src/services/telegram.ts` — `sendMessage(chatId, text)` wrapper
- `worker/src/cron.ts` — `scheduled` handler dispatching by cron pattern

### Cron design (in `wrangler.toml`)
- `*/15 * * * *` — sync all active api_keys (single cron; fan out via `ctx.waitUntil(Promise.all(...))`, batch in chunks of 25 to stay under CPU limits).
- After each sync, call `checkAndFireAlerts` for that key.
- Daily rollup at `0 0 * * *` UTC — compact snapshots older than 7 days to daily aggregates (out of scope for v1 if storage is fine; flag).

### Caching (KV `CACHE`)
- Key pattern: `usage:current:{apiKeyId}` TTL 60s
- `usage:daily:{apiKeyId}:{days}` TTL 300s
- Invalidate on fresh sync.

### Z AI client (`shared/providers/zai/client.ts`)
- `fetch("https://api.z.ai/api/paas/v4/...", { headers: { Authorization: "Bearer " + key } })`
- Parse, normalize to `UsageSnapshot`
- Cost calculation: if API returns dollars, use directly; else compute via per-model pricing table (`shared/providers/zai/pricing.ts`) — open question, README doesn't specify pricing source.

### Open questions
- Cron rate vs CF Workers free-plan limits (cron min interval is 1 min, but free plan caps daily invocations). 15min is safe.
- Per-key vs per-user sync — currently per-key. Confirm.

---

## Phase 4 — Auth (Telegram Mini App initData)

### Flow
1. Mini App loads → SDK exposes `initDataRaw` (signed query string from Telegram).
2. Frontend `POST /auth/telegram` with `{ initDataRaw }`.
3. Worker validates HMAC-SHA256 per Telegram spec: secret = `HMAC_SHA256("WebAppData", BOT_TOKEN)`, signature = `HMAC_SHA256(secret, data_check_string)`. Reject if mismatch or `auth_date` older than e.g. 24h.
4. Upsert `users` row by `telegram_id`.
5. Issue JWT `{ sub: userId, tg: telegramId, exp: now+24h }` signed with `JWT_SECRET` (HS256, via `jose` or hand-rolled with Web Crypto — prefer `jose` for safety, small bundle).
6. Frontend stores in memory (Zustand) + attaches `Authorization: Bearer <jwt>` to all API calls via TanStack Query default `fetcher`.

### Files
- `worker/src/auth/telegram.ts` — `verifyInitData(raw, botToken)`
- `worker/src/auth/jwt.ts` — sign/verify
- `app/(providers)/telegram-provider.tsx` — initializes SDK, performs login on mount, exposes `useAuth()`
- `lib/api-client.ts` — fetch wrapper with auth header + base URL
- `lib/auth-store.ts` — Zustand store: `{ jwt, user, status }`

### Open questions
- What to show outside Telegram (dev/browser)? Dev-only fallback: env-gated mock initData. Production should refuse and show "Open in Telegram" screen.

---

## Phase 5 — Frontend

### App Router structure (Next 16 App Router; check `node_modules/next/dist/docs/` for current conventions per AGENTS.md)
- `app/layout.tsx` — wrap with `ThemeProvider`, `QueryProvider`, `TelegramProvider`, `Toaster`
- `app/(app)/layout.tsx` — auth gate + bottom-tab nav scaffold
- `app/(app)/page.tsx` — Dashboard (default tab)
- `app/(app)/usage/page.tsx` — daily/chart-focused view
- `app/(app)/models/page.tsx` — model breakdown
- `app/(app)/history/page.tsx` — historical reports w/ range selector
- `app/(app)/settings/page.tsx` — API keys + alert thresholds + theme
- `app/(auth)/page.tsx` — "Open in Telegram" fallback

### Components
- `components/providers/query-provider.tsx`
- `components/providers/telegram-provider.tsx`
- `components/layout/bottom-nav.tsx` — fixed bottom tab bar, uses `usePathname`, integrates with Telegram `BackButton`/`MainButton` SDK APIs.
- `components/layout/app-shell.tsx` — safe-area handling for Telegram viewport (`viewportStableHeight`).
- `components/dashboard/quota-card.tsx` — remaining / used / budget tiles
- `components/dashboard/progress-ring.tsx` — uses shadcn `Progress` + custom ring variant
- `components/dashboard/forecast-card.tsx`
- `components/dashboard/key-switcher.tsx` — dropdown bound to Zustand selected-key store
- `components/charts/daily-usage-chart.tsx` — Recharts area chart, range tabs (Today/7d/30d)
- `components/charts/model-breakdown.tsx` — bar/list combo
- `components/settings/api-key-form.tsx` — add key (name + secret), submits encrypted to worker; never reads secret back
- `components/settings/api-key-list.tsx` — list, rename, delete, set monthly budget
- `components/settings/alert-thresholds.tsx` — toggles for 50/75/90/95
- `components/history/range-picker.tsx`

### Hooks
- `hooks/use-auth.ts`
- `hooks/use-api-keys.ts` — TanStack Query
- `hooks/use-usage.ts` — current/daily/models/history
- `hooks/use-selected-key.ts` — Zustand
- `hooks/use-telegram.ts` — wraps SDK (`MainButton`, `BackButton`, `HapticFeedback`, `themeParams`)

### State
- `lib/stores/ui-store.ts` — `selectedApiKeyId`, theme override
- `lib/stores/auth-store.ts`

### Theming
- Use Telegram `themeParams` → map to Tailwind CSS vars on `<html>` so shadcn tokens reflect Telegram dark/light. Done inside `TelegramProvider`.

### Open questions
- Recharts on React 19 — confirm no peer issues; fallback `nivo` or `visx`.
- Whether to ship a desktop layout (>=md) or strictly mobile column. Recommend mobile-first, max-width 480px centered on desktop.

---

## Phase 6 — Notifications

### Threshold check (`worker/src/services/alerts.ts`)
- Triggered after each sync per api_key.
- Inputs: latest snapshot's `cost_cents`, key's `monthly_budget_cents`.
- Compute pct used for current calendar month. For each enabled threshold, if `pct >= threshold` and `last_fired_period != currentPeriod` and `last_fired_threshold < threshold`, fire.
- Store on row: `last_fired_period` + highest threshold fired this month (so 50 fires, then 75, etc., not repeats).

### Telegram sending
- `worker/src/services/telegram.ts`: `POST https://api.telegram.org/bot{TOKEN}/sendMessage` with `chat_id = users.telegram_id`, MarkdownV2 body matching the README example.
- Need user to have started chat with bot at least once. Display "Tap to enable alerts" deep link `https://t.me/{botUsername}?start=enable` in Settings if not yet enabled. Track readiness via `users.bot_chat_ready` boolean updated by bot webhook.

### Bot webhook (`worker/src/routes/telegram.ts`)
- `POST /webhook/telegram` validates secret token (configured via `setWebhook?secret_token=`), handles `/start` to flip `bot_chat_ready=true`.
- One-time setup script: `worker/scripts/set-webhook.ts`.

### Files
- `worker/src/services/alerts.ts`
- `worker/src/services/telegram.ts`
- `worker/src/routes/telegram.ts`
- `shared/notifications/templates.ts`

### Open questions
- MarkdownV2 escaping rules — bake into a helper. Use `escapeMd()`.
- Per-key vs per-user alerts: per-key with optional global rollup. MVP: per-key only.

---

## Phase 7 — Polish & MVP Cutoff

### Polish tasks
- Loading skeletons on every card (shadcn `Skeleton`).
- Empty states: "Add your first API key" CTA on dashboard if none.
- Error boundaries + toast on query failure (`sonner`).
- Telegram `HapticFeedback` on key actions (add key, threshold change).
- Pull-to-refresh: invalidate queries on `viewportChanged`/manual button.
- A11y pass: labels on switches, focus order in bottom nav.
- Lighthouse-mobile sanity check.
- README updates: setup, env vars, wrangler commands.

### Deferred (post-MVP, explicitly out)
- CSV/JSON/Excel export
- Multi-provider impls (OpenAI/Anthropic/Gemini/NVIDIA/OpenRouter) — interface ready, no clients
- AI insights (LLM-generated recommendations)
- Widget mode (pinned dashboard)
- Request analytics (success/fail/avg latency/peak hour) — requires proxy-mode data we don't have
- Spending forecast: include simple linear projection only if Z AI usage endpoint gives us enough history; otherwise defer.
- Team/shared key permissions
- Daily-rollup compaction job
- Localization

### Risk callouts
1. **Z AI usage API shape is unknown.** Block Phase 3 client work until confirmed. If only chat-completion responses expose tokens, MVP must pivot to proxy mode — significant rescope.
2. **Next.js 16 conventions differ from 15.** Heed `AGENTS.md`; read `node_modules/next/dist/docs/` before App Router structure decisions (esp. route groups, dynamic params, server actions usage).
3. **Telegram Mini App outside Telegram** — keep a dev fallback or you'll be unable to test locally without ngrok-ing into Telegram.
4. **D1 + cron at 15min on free tier** — within limits but monitor; consider scaling to 5min only if active keys justify it.

---

## Suggested Implementation Order (linearized)

1. Scaffold `worker/`, `shared/`, `pnpm-workspace.yaml`, Drizzle config, `wrangler.toml`, secrets.
2. Schema + first migration (`drizzle-kit generate` → `wrangler d1 migrations apply`).
3. Encryption helpers + provider interface + Z AI client skeleton (stub `fetchUsage` returning fixture until endpoint confirmed).
4. Telegram initData verify + JWT + `POST /auth/telegram`.
5. Frontend providers (Query, Telegram, Theme), auth gate, bottom-tab shell.
6. API keys CRUD (worker + UI), encrypted storage.
7. Cron + `syncApiKey` writing snapshots.
8. Dashboard cards reading from `/api/usage/current` (KV-cached).
9. Daily chart + models breakdown + history page.
10. Alerts table + threshold checker + Telegram sendMessage + bot webhook for `/start`.
11. Polish, skeletons, empty states, error toasts, theme-param sync.
12. Deploy: Worker (`wrangler deploy`), frontend (Pages), `setWebhook`, register Mini App URL in BotFather.
