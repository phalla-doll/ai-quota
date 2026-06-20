import type { NextRequest } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { validateInitData } from "@/lib/telegram-auth"

// Shared auth gate for the D1-backed route handlers (/api/keys, /api/config).
// Identity comes from a server-validated Telegram initData blob (header
// `x-telegram-init-data`) — never from the client asserting its own id. See
// lib/telegram-auth.ts. Both routes return the same union so the 401 shape,
// header name, and validation stay in one place.

const INIT_DATA_HEADER = "x-telegram-init-data"

export type TelegramAuth =
    | { error: Response }
    | { userId: string; db: D1Database }

export async function authenticateTelegramRequest(
    req: NextRequest
): Promise<TelegramAuth> {
    const { env } = getCloudflareContext()
    const initData = req.headers.get(INIT_DATA_HEADER)
    if (!initData) {
        return {
            error: Response.json(
                { error: "missing initData" },
                { status: 401 }
            ),
        }
    }
    const result = await validateInitData(initData, env.TELEGRAM_BOT_TOKEN)
    if (!result.ok) {
        return {
            error: Response.json({ error: result.reason }, { status: 401 }),
        }
    }
    return { userId: result.user.id, db: env.DB }
}
