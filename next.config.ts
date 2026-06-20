import type { NextConfig } from "next"
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare"

const nextConfig: NextConfig = {}

export default nextConfig

// Makes the Cloudflare bindings (D1 `DB`, `.dev.vars` secrets) available to
// `getCloudflareContext()` during `next dev`, so /api/keys works locally
// without a full `pnpm cf:preview`.
initOpenNextCloudflareForDev()
