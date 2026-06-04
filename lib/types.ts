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
