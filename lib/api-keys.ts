import { toast } from "sonner"
import { normalizeApiKey, type ApiKey } from "@/lib/types"

// Client-side data access for API keys: the localStorage cache and the
// authenticated D1-backed endpoints. The React bindings live in
// hooks/use-api-keys.ts; the one-time migration lives in
// components/providers/key-migration.tsx. Both import from here so the storage
// and network shapes are defined once.

const STORAGE_KEY = "zai-tracker-keys"
const INIT_DATA_HEADER = "x-telegram-init-data"

// React Query key. The auth marker makes the query re-run when Telegram
// resolves `initDataRaw` (null on first paint), so the server sync actually
// fires on open instead of being stuck on the cached local-only result.
export function apiKeysQueryKey(initDataRaw: string | null) {
    return ["api-keys", initDataRaw ? "tg" : "local"] as const
}

// ── localStorage cache ────────────────────────────────────────────────────────

export function loadKeys(): ApiKey[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as unknown[]
        return parsed
            .map((k) => normalizeApiKey(k as Partial<ApiKey>))
            .filter((k): k is ApiKey => k !== null)
    } catch {
        return []
    }
}

export function saveKeys(keys: ApiKey[]) {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

// ── server sync (D1) ──────────────────────────────────────────────────────────

function authHeaders(initDataRaw: string, extra?: Record<string, string>) {
    return { [INIT_DATA_HEADER]: initDataRaw, ...extra }
}

export async function fetchKeysFromServer(
    initDataRaw: string
): Promise<ApiKey[]> {
    const res = await fetch("/api/keys", { headers: authHeaders(initDataRaw) })
    if (!res.ok) throw new Error(`GET /api/keys ${res.status}`)
    const data = (await res.json()) as { keys: ApiKey[] }
    return data.keys
        .map((k) => normalizeApiKey(k))
        .filter((k): k is ApiKey => k !== null)
}

// Upsert a single key — used for add and rename. Touches only that row, so a
// stale local cache can never wipe the user's other server-side keys.
export async function upsertKeyOnServer(initDataRaw: string, key: ApiKey) {
    const res = await fetch("/api/keys", {
        method: "POST",
        headers: authHeaders(initDataRaw, {
            "content-type": "application/json",
        }),
        body: JSON.stringify({ key }),
    })
    if (!res.ok) throw new Error(`POST /api/keys ${res.status}`)
}

// Delete a single key by id.
export async function deleteKeyOnServer(initDataRaw: string, id: string) {
    const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: authHeaders(initDataRaw),
    })
    if (!res.ok) throw new Error(`DELETE /api/keys ${res.status}`)
}

// Bulk, non-destructive upsert — used only by the one-time migration to seed an
// empty D1 from localStorage. Returns the canonical stored list.
export async function bulkUpsertKeysOnServer(
    initDataRaw: string,
    keys: ApiKey[]
): Promise<ApiKey[]> {
    const res = await fetch("/api/keys", {
        method: "PUT",
        headers: authHeaders(initDataRaw, {
            "content-type": "application/json",
        }),
        body: JSON.stringify({ keys }),
    })
    if (!res.ok) throw new Error(`PUT /api/keys ${res.status}`)
    const data = (await res.json()) as { keys: ApiKey[] }
    return data.keys
        .map((k) => normalizeApiKey(k))
        .filter((k): k is ApiKey => k !== null)
}

export function notifyKeysMigrated(count: number) {
    if (typeof window === "undefined") return
    const label = count === 1 ? "key" : "keys"
    toast.success(`${count} ${label} synced to your Telegram account`, {
        description:
            "You can now access them from any device signed in to this Telegram account.",
        duration: 8000,
    })
}
