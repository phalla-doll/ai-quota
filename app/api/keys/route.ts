import type { NextRequest } from "next/server"
import { getCloudflareContext } from "@opennextjs/cloudflare"
import { validateInitData } from "@/lib/telegram-auth"
import { normalizeApiKey, type ApiKey } from "@/lib/types"

// Per-user API key storage backed by D1. Identity comes from a server-validated
// Telegram initData blob (header `x-telegram-init-data`) — never from the client
// asserting its own id. See lib/telegram-auth.ts.
//
// Endpoints (all scoped to the validated tg_user_id):
//   GET    /api/keys           -> { keys: ApiKey[] }
//   POST   /api/keys {key}     -> upsert one key (add / rename), { key }
//   DELETE /api/keys?id=…      -> delete one key, { ok: true }
//   PUT    /api/keys {keys}    -> non-destructive bulk upsert (migration), { keys }
//
// Mutations are per-key so a client with a stale cache can only ever change the
// row it names — it can never wipe the user's other keys. The bulk PUT also only
// inserts/updates (never deletes), so it is safe even if called with a subset.

const INIT_DATA_HEADER = "x-telegram-init-data"

type KeyRow = {
    id: string
    name: string
    provider: string
    endpoint: string
    key: string
    key_last4: string
    created_at: string
    last_synced_at: string | null
}

function rowToApiKey(r: KeyRow): ApiKey | null {
    return normalizeApiKey({
        id: r.id,
        name: r.name,
        endpoint: r.endpoint as ApiKey["endpoint"],
        key: r.key,
        keyLast4: r.key_last4,
        createdAt: r.created_at,
        lastSyncedAt: r.last_synced_at,
    })
}

async function authenticate(req: NextRequest) {
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

// INSERT … ON CONFLICT(tg_user_id, id) DO UPDATE — one statement, one row.
function upsertStatement(
    db: D1Database,
    userId: string,
    k: ApiKey,
    now: string
) {
    return db
        .prepare(
            `INSERT INTO api_keys
               (tg_user_id, id, name, provider, endpoint, key, key_last4, created_at, last_synced_at, updated_at)
             VALUES (?, ?, ?, 'zai', ?, ?, ?, ?, ?, ?)
             ON CONFLICT(tg_user_id, id) DO UPDATE SET
               name = excluded.name,
               endpoint = excluded.endpoint,
               key = excluded.key,
               key_last4 = excluded.key_last4,
               last_synced_at = excluded.last_synced_at,
               updated_at = excluded.updated_at`
        )
        .bind(
            userId,
            k.id,
            k.name,
            k.endpoint,
            k.key,
            k.keyLast4,
            k.createdAt,
            k.lastSyncedAt,
            now
        )
}

export async function GET(req: NextRequest) {
    const auth = await authenticate(req)
    if ("error" in auth) return auth.error

    const { results } = await auth.db
        .prepare(
            `SELECT id, name, provider, endpoint, key, key_last4, created_at, last_synced_at
             FROM api_keys WHERE tg_user_id = ? ORDER BY created_at ASC`
        )
        .bind(auth.userId)
        .all<KeyRow>()

    const keys = (results ?? [])
        .map(rowToApiKey)
        .filter((k): k is ApiKey => k !== null)
    return Response.json({ keys })
}

export async function POST(req: NextRequest) {
    const auth = await authenticate(req)
    if ("error" in auth) return auth.error

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return Response.json({ error: "invalid json" }, { status: 400 })
    }
    const key = normalizeApiKey((body as { key?: Partial<ApiKey> })?.key)
    if (!key) {
        return Response.json({ error: "expected { key }" }, { status: 400 })
    }

    await upsertStatement(
        auth.db,
        auth.userId,
        key,
        new Date().toISOString()
    ).run()
    return Response.json({ key })
}

export async function DELETE(req: NextRequest) {
    const auth = await authenticate(req)
    if ("error" in auth) return auth.error

    const id = req.nextUrl.searchParams.get("id")
    if (!id) {
        return Response.json({ error: "missing id" }, { status: 400 })
    }

    await auth.db
        .prepare(`DELETE FROM api_keys WHERE tg_user_id = ? AND id = ?`)
        .bind(auth.userId, id)
        .run()
    return Response.json({ ok: true })
}

export async function PUT(req: NextRequest) {
    const auth = await authenticate(req)
    if ("error" in auth) return auth.error

    let body: unknown
    try {
        body = await req.json()
    } catch {
        return Response.json({ error: "invalid json" }, { status: 400 })
    }
    const incoming = (body as { keys?: unknown })?.keys
    if (!Array.isArray(incoming)) {
        return Response.json(
            { error: "expected { keys: [] }" },
            { status: 400 }
        )
    }

    const keys = incoming
        .map((k) => normalizeApiKey(k as Partial<ApiKey>))
        .filter((k): k is ApiKey => k !== null)

    const now = new Date().toISOString()
    if (keys.length > 0) {
        await auth.db.batch(
            keys.map((k) => upsertStatement(auth.db, auth.userId, k, now))
        )
    }
    return Response.json({ keys })
}
