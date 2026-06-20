// Secrets are not declared in wrangler.jsonc, so `wrangler types` does not emit
// them. Augment the generated CloudflareEnv via declaration merging here.
// Set with: `wrangler secret put TELEGRAM_BOT_TOKEN` (prod) and a line in
// `.dev.vars` (local `wrangler dev` / `pnpm cf:preview`).
interface CloudflareEnv {
    TELEGRAM_BOT_TOKEN: string
}
