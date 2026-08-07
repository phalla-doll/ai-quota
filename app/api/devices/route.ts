import type { NextRequest } from "next/server"
import { authenticateTelegramRequest } from "@/lib/api-auth"
import type { Device } from "@/lib/types"

// Paired devices, for the "Linked devices" section in Settings.
//
//   GET    /api/devices        -> { devices: Device[] }
//   DELETE /api/devices?id=…   -> revoke one device, { ok: true }
//
// Telegram-only: revocation has to be reachable from a device you still trust,
// and a stolen token must not be able to hide itself by revoking the others.
// Token hashes are never returned.

type DeviceRow = {
    id: string
    name: string
    created_at: string
    last_seen_at: string | null
}

export async function GET(req: NextRequest) {
    const auth = await authenticateTelegramRequest(req)
    if ("error" in auth) return auth.error

    const { results } = await auth.db
        .prepare(
            `SELECT id, name, created_at, last_seen_at
             FROM devices WHERE tg_user_id = ? ORDER BY created_at DESC`
        )
        .bind(auth.userId)
        .all<DeviceRow>()

    const devices: Device[] = (results ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        createdAt: r.created_at,
        lastSeenAt: r.last_seen_at,
    }))
    return Response.json({ devices })
}

export async function DELETE(req: NextRequest) {
    const auth = await authenticateTelegramRequest(req)
    if ("error" in auth) return auth.error

    const id = req.nextUrl.searchParams.get("id")
    if (!id) {
        return Response.json({ error: "missing id" }, { status: 400 })
    }

    await auth.db
        .prepare(`DELETE FROM devices WHERE tg_user_id = ? AND id = ?`)
        .bind(auth.userId, id)
        .run()
    return Response.json({ ok: true })
}
