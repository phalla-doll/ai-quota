import type { NextRequest } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import {
    generateDeviceToken,
    normalizePairingCode,
    sha256Hex,
} from "@/lib/device-auth"

// Redeem a pairing code for a device token.
//
//   POST /api/devices/claim { code, name? } -> { token, deviceId, name }
//
// This is the one unauthenticated route in the D1 layer — the code itself is
// the proof of identity, which is why it is single-use and short-lived. The
// returned token is shown once; the caller stores it (Windows Credential
// Manager on the tray app) and sends it as `Authorization: Bearer`.

const MAX_NAME_LENGTH = 64

function deviceName(input: unknown): string {
    if (typeof input !== "string") return "Unnamed device"
    const trimmed = input.trim().slice(0, MAX_NAME_LENGTH)
    return trimmed || "Unnamed device"
}

export async function POST(req: NextRequest) {
    const { env } = getCloudflareContext()

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return Response.json({ error: "invalid json" }, { status: 400 })
    }
    const { code, name } = (body ?? {}) as { code?: unknown; name?: unknown }
    if (typeof code !== "string" || !code.trim()) {
        return Response.json({ error: "expected { code }" }, { status: 400 })
    }

    const codeHash = await sha256Hex(normalizePairingCode(code))
    const row = await env.DB.prepare(
        `SELECT tg_user_id, expires_at, claimed_at FROM pairing_codes WHERE code_hash = ?`
    )
        .bind(codeHash)
        .first<{
            tg_user_id: string
            expires_at: string
            claimed_at: string | null
        }>()

    if (!row) {
        return Response.json({ error: "invalid code" }, { status: 400 })
    }

    // Claim and expiry are checked inside the UPDATE so two clients racing the
    // same code can't both win — exactly one sees changes === 1.
    const now = new Date().toISOString()
    const claim = await env.DB.prepare(
        `UPDATE pairing_codes SET claimed_at = ?
         WHERE code_hash = ? AND claimed_at IS NULL AND expires_at > ?`
    )
        .bind(now, codeHash, now)
        .run()

    if (claim.meta.changes !== 1) {
        return Response.json(
            { error: row.claimed_at ? "code already used" : "code expired" },
            { status: 400 }
        )
    }

    const token = generateDeviceToken()
    const deviceId = crypto.randomUUID()
    const resolvedName = deviceName(name)

    await env.DB.prepare(
        `INSERT INTO devices (id, tg_user_id, name, token_hash, created_at)
         VALUES (?, ?, ?, ?, ?)`
    )
        .bind(
            deviceId,
            row.tg_user_id,
            resolvedName,
            await sha256Hex(token),
            now
        )
        .run()

    return Response.json({ token, deviceId, name: resolvedName })
}
