export type ZaiEndpoint = "paas" | "coding"

export type ApiKey = {
    id: string
    name: string
    provider: "zai"
    endpoint: ZaiEndpoint
    key: string
    keyLast4: string
    monthlyBudgetCents: number | null
    createdAt: string
    lastSyncedAt: string | null
}

export type UsageSummary = {
    apiKeyId: string
    monthlyBudgetCents: number
    usedCents: number
    requests: number
    tokensInput: number
    tokensOutput: number
    capturedAt: string
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

export type AlertConfig = {
    threshold: AlertThreshold
    enabled: boolean
}

export type UsageEvent = {
    ts: string
    model: string
    tokensInput: number
    tokensOutput: number
    costCents: number
}
