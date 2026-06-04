import type { UsageEvent } from "./types"

const MAX_EVENTS = 5000

function storageKey(apiKeyId: string) {
    return `zai:events:${apiKeyId}`
}

export function readEvents(apiKeyId: string): UsageEvent[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(storageKey(apiKeyId))
        if (!raw) return []
        const parsed = JSON.parse(raw)
        return Array.isArray(parsed) ? (parsed as UsageEvent[]) : []
    } catch {
        return []
    }
}

export function appendEvent(apiKeyId: string, event: UsageEvent) {
    if (typeof window === "undefined") return
    const events = readEvents(apiKeyId)
    events.push(event)
    if (events.length > MAX_EVENTS) {
        events.splice(0, events.length - MAX_EVENTS)
    }
    localStorage.setItem(storageKey(apiKeyId), JSON.stringify(events))
}

export function clearEvents(apiKeyId: string) {
    if (typeof window === "undefined") return
    localStorage.removeItem(storageKey(apiKeyId))
}
