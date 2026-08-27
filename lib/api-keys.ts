import { toast } from "sonner"
import { normalizeApiKey, type ApiKey } from "@/lib/types"
import {
    credentialHeaders,
    credentialMarker,
    type AuthCredential,
} from "@/lib/auth-credential"

// Client-side data access for API keys: the localStorage cache and the
// authenticated D1-backed endpoints. The React bindings live in
// hooks/use-api-keys.ts; the one-time migration lives in
// components/providers/key-migration.tsx. Both import from here so the storage
// and network shapes are defined once.

const STORAGE_KEY = "zai-tracker-keys"

// React Query key. The auth marker makes the query re-run once a credential
// resolves (null on first paint, whether it turns out to be Telegram initData
// or a paired browser's device token), so the server sync actually fires on
// open instead of being stuck on the cached local-only result.
export function apiKeysQueryKey(cred: AuthCredential | null) {
    return ["api-keys", credentialMarker(cred)] as const
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

// Drop the cache entirely. Used when a browser unlinks: the cache holds every
// key that synced down from the account, in plaintext, so leaving it behind
// would make "unlink" a no-op from the user's side — the keys stay listed on a
// machine they just said isn't theirs.
export function clearKeys() {
    if (typeof window === "undefined") return
    localStorage.removeItem(STORAGE_KEY)
}

// ── server sync (D1) ──────────────────────────────────────────────────────────

export async function fetchKeysFromServer(
    cred: AuthCredential
): Promise<ApiKey[]> {
    const res = await fetch("/api/keys", { headers: credentialHeaders(cred) })
    if (!res.ok) throw new Error(`GET /api/keys ${res.status}`)
    const data = (await res.json()) as { keys: ApiKey[] }
    return data.keys
        .map((k) => normalizeApiKey(k))
        .filter((k): k is ApiKey => k !== null)
}

// Upsert a single key — used for add and rename. Touches only that row, so a
// stale local cache can never wipe the user's other server-side keys.
export async function upsertKeyOnServer(cred: AuthCredential, key: ApiKey) {
    const res = await fetch("/api/keys", {
        method: "POST",
        headers: credentialHeaders(cred, {
            "content-type": "application/json",
        }),
        body: JSON.stringify({ key }),
    })
    if (!res.ok) throw new Error(`POST /api/keys ${res.status}`)
}

// Delete a single key by id.
export async function deleteKeyOnServer(cred: AuthCredential, id: string) {
    const res = await fetch(`/api/keys?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: credentialHeaders(cred),
    })
    if (!res.ok) throw new Error(`DELETE /api/keys ${res.status}`)
}

// Bulk, non-destructive upsert — used only by the one-time migration to seed an
// empty D1 from localStorage. Returns the canonical stored list.
export async function bulkUpsertKeysOnServer(
    cred: AuthCredential,
    keys: ApiKey[]
): Promise<ApiKey[]> {
    const res = await fetch("/api/keys", {
        method: "PUT",
        headers: credentialHeaders(cred, {
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
    toast.success(`${count} ${label} synced to your account`, {
        description:
            "You can now reach them from Telegram and from any browser or device you link.",
        duration: 8000,
    })
}
