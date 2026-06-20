import type { NextRequest } from "next/server"
import { authenticateTelegramRequest } from "@/lib/api-auth"

// Per-user config blob storage backed by the D1 `user_config` table. Identity
// comes from a server-validated Telegram initData blob (header
// `x-telegram-init-data`), exactly like /api/keys — never from the client
// asserting its own id. See lib/api-auth.ts.
//
// Endpoints (all scoped to the validated tg_user_id):
//   GET /api/config?namespace=alerts  -> { value: <parsed JSON> | null }
//   PUT /api/config { namespace, value } -> upsert one namespace, { ok: true }
//
// `value` is an opaque JSON blob the client owns. The alerts cron worker reads
// the `alerts` namespace out-of-band to learn which thresholds each user enabled.

export async function GET(req: NextRequest) {
    const auth = await authenticateTelegramRequest(req)
    if ("error" in auth) return auth.error

    const namespace = req.nextUrl.searchParams.get("namespace")
    if (!namespace) {
        return Response.json({ error: "missing namespace" }, { status: 400 })
    }

    const row = await auth.db
        .prepare(
            `SELECT value FROM user_config WHERE tg_user_id = ? AND namespace = ?`
        )
        .bind(auth.userId, namespace)
        .first<{ value: string }>()

    if (!row) return Response.json({ value: null })
    try {
        return Response.json({ value: JSON.parse(row.value) })
    } catch {
        return Response.json({ value: null })
    }
}

export async function PUT(req: NextRequest) {
    const auth = await authenticateTelegramRequest(req)
    if ("error" in auth) return auth.error

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return Response.json({ error: "invalid json" }, { status: 400 })
    }
    const { namespace, value } = (body ?? {}) as {
        namespace?: string
        value?: unknown
    }
    if (!namespace || value === undefined) {
        return Response.json(
            { error: "expected { namespace, value }" },
            { status: 400 }
        )
    }

    await auth.db
        .prepare(
            `INSERT INTO user_config (tg_user_id, namespace, value, updated_at)
             VALUES (?, ?, ?, ?)
             ON CONFLICT(tg_user_id, namespace) DO UPDATE SET
               value = excluded.value,
               updated_at = excluded.updated_at`
        )
        .bind(
            auth.userId,
            namespace,
            JSON.stringify(value),
            new Date().toISOString()
        )
        .run()

    return Response.json({ ok: true })
}
