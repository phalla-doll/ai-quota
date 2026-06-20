export type ZaiEndpoint = "paas" | "coding"

export type ApiKey = {
    id: string
    name: string
    provider: "zai"
    endpoint: ZaiEndpoint
    key: string
    keyLast4: string
    createdAt: string
    lastSyncedAt: string | null
}

// Single source of truth for shaping a loose object into an ApiKey, shared by
// the client (localStorage parse, server-fetch normalize) and the server
// (request-body sanitize, D1-row mapping). Returns null when the object is not
// a usable key (missing id/name/key), so callers can `.map(normalizeApiKey).filter(Boolean)`.
export function normalizeApiKey(
    raw: (Partial<ApiKey> & Record<string, unknown>) | null | undefined
): ApiKey | null {
    if (!raw || typeof raw !== "object") return null
    const id = raw.id
    const name = raw.name
    const key = raw.key
    if (!id || !name || !key) return null
    return {
        id: String(id),
        name: String(name),
        provider: "zai",
        endpoint: raw.endpoint === "coding" ? "coding" : "paas",
        key: String(key),
        keyLast4: raw.keyLast4 ?? String(key).slice(-4),
        createdAt: raw.createdAt ?? new Date().toISOString(),
        lastSyncedAt: raw.lastSyncedAt ?? null,
    }
}

export type DailyUsagePoint = {
    date: string
    requests: number
    tokens: number
    costCents: number
}

export type ModelUsage = {
    model: string
    requests: number
    tokens: number
    costCents: number
}

export type AlertThreshold = 50 | 75 | 90 | 95
