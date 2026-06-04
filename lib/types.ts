export type ApiKey = {
    id: string
    name: string
    provider: "zai"
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
