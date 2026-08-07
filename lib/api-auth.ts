import type { NextRequest } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { validateInitData } from "@/lib/telegram-auth"
import { DEVICE_SEEN_REFRESH_MS, sha256Hex } from "@/lib/device-auth"

// Shared auth gate for the D1-backed route handlers (/api/keys, /api/config,
// /api/devices). Two credentials resolve to the same identity:
//
//   x-telegram-init-data: <blob>   Mini App — HMAC-validated, lib/telegram-auth.ts
//   authorization: Bearer <token>  paired device — hash lookup, lib/device-auth.ts
//
// Either way the tg_user_id comes from the server, never from the client
// asserting its own id, so every row stays scoped the same way.
//
// Use `authenticateRequest` for data routes (both credentials welcome) and
// `authenticateTelegramRequest` for device management. That split is the point:
// a stolen device token can read and write the user's keys, but it cannot mint
// new pairing codes or revoke its own revocation — those need the Mini App.

const INIT_DATA_HEADER = "x-telegram-init-data"

export type AuthContext = {
    userId: string
    db: D1Database
    via: "telegram" | "device"
}

export type AuthResult = { error: Response } | AuthContext

function unauthorized(reason: string) {
    return { error: Response.json({ error: reason }, { status: 401 }) }
}

function bearerToken(req: NextRequest): string | null {
    const header = req.headers.get("authorization")
    if (!header) return null
    const [scheme, ...rest] = header.split(" ")
    if (scheme.toLowerCase() !== "bearer") return null
    const token = rest.join(" ").trim()
    return token || null
}

// Telegram initData only. Device tokens are rejected here by design.
export async function authenticateTelegramRequest(
    req: NextRequest
): Promise<AuthResult> {
    const { env } = getCloudflareContext()
    const initData = req.headers.get(INIT_DATA_HEADER)
    if (!initData) return unauthorized("missing initData")

    const result = await validateInitData(initData, env.TELEGRAM_BOT_TOKEN)
    if (!result.ok) return unauthorized(result.reason)

    return { userId: result.user.id, db: env.DB, via: "telegram" }
}

async function authenticateDeviceToken(token: string): Promise<AuthResult> {
    const { env, ctx } = getCloudflareContext()
    const row = await env.DB.prepare(
        `SELECT id, tg_user_id, last_seen_at FROM devices WHERE token_hash = ?`
    )
        .bind(await sha256Hex(token))
        .first<{
            id: string
            tg_user_id: string
            last_seen_at: string | null
        }>()

    if (!row) return unauthorized("unknown device token")

    // Throttled heartbeat, off the response path — the settings list wants a
    // "last seen" without every poll costing a write.
    const now = Date.now()
    const seen = row.last_seen_at ? Date.parse(row.last_seen_at) : 0
    if (!Number.isFinite(seen) || now - seen > DEVICE_SEEN_REFRESH_MS) {
        const touch = env.DB.prepare(
            `UPDATE devices SET last_seen_at = ? WHERE id = ?`
        )
            .bind(new Date(now).toISOString(), row.id)
            .run()
        if (ctx?.waitUntil) ctx.waitUntil(touch)
        else await touch
    }

    return { userId: row.tg_user_id, db: env.DB, via: "device" }
}

// Either credential. Telegram wins if both are present.
export async function authenticateRequest(
    req: NextRequest
): Promise<AuthResult> {
    if (req.headers.get(INIT_DATA_HEADER)) {
        return authenticateTelegramRequest(req)
    }
    const token = bearerToken(req)
    if (token) return authenticateDeviceToken(token)
    return unauthorized("missing credentials")
}
