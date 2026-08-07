import type { NextRequest } from "next/server"
import { authenticateTelegramRequest } from "@/lib/api-auth"
import {
    PAIRING_CODE_TTL_MS,
    formatPairingCode,
    generatePairingCode,
    sha256Hex,
} from "@/lib/device-auth"

// Mint a pairing code for the current Telegram user.
//
//   POST /api/devices/pair -> { code: "K7F2-9QMX", expiresAt }
//
// Telegram-only on purpose: a paired device must not be able to mint codes for
// itself. The plaintext code is returned once and never stored — only its hash
// lands in D1, so a leaked database can't be turned into a pairing.

export async function POST(req: NextRequest) {
    const auth = await authenticateTelegramRequest(req)
    if ("error" in auth) return auth.error

    const code = generatePairingCode()
    const now = new Date()
    const expiresAt = new Date(now.getTime() + PAIRING_CODE_TTL_MS)

    // One live code per user: minting a new one invalidates the last. Also
    // sweeps everyone's expired rows so the table stays small without a cron.
    await auth.db.batch([
        auth.db
            .prepare(`DELETE FROM pairing_codes WHERE tg_user_id = ?`)
            .bind(auth.userId),
        auth.db
            .prepare(`DELETE FROM pairing_codes WHERE expires_at < ?`)
            .bind(now.toISOString()),
        auth.db
            .prepare(
                `INSERT INTO pairing_codes (code_hash, tg_user_id, expires_at, created_at)
                 VALUES (?, ?, ?, ?)`
            )
            .bind(
                await sha256Hex(code),
                auth.userId,
                expiresAt.toISOString(),
                now.toISOString()
            ),
    ])

    return Response.json({
        code: formatPairingCode(code),
        expiresAt: expiresAt.toISOString(),
    })
}
