import { subDays, format } from "date-fns"
import type {
    ApiKey,
    DailyUsagePoint,
    ModelUsage,
    UsageSummary,
} from "./types"

export const mockApiKeys: ApiKey[] = [
    {
        id: "key_personal",
        name: "Personal",
        provider: "zai",
        keyLast4: "f3a9",
        monthlyBudgetCents: 5000,
        createdAt: "2025-05-01T00:00:00Z",
        lastSyncedAt: new Date().toISOString(),
    },
    {
        id: "key_production",
        name: "Production",
        provider: "zai",
        keyLast4: "1d27",
        monthlyBudgetCents: 20000,
        createdAt: "2025-04-12T00:00:00Z",
        lastSyncedAt: new Date().toISOString(),
    },
]

export function mockUsageSummary(apiKeyId: string): UsageSummary {
    const isPro = apiKeyId === "key_production"
    return {
        apiKeyId,
        monthlyBudgetCents: isPro ? 20000 : 5000,
        usedCents: isPro ? 12450 : 787,
        requests: isPro ? 142_983 : 18_429,
        tokensInput: isPro ? 28_400_000 : 21_300_000,
        tokensOutput: isPro ? 11_900_000 : 13_500_000,
        capturedAt: new Date().toISOString(),
    }
}

export function mockDailyUsage(days: number): DailyUsagePoint[] {
    const out: DailyUsagePoint[] = []
    for (let i = days - 1; i >= 0; i--) {
        const d = subDays(new Date(), i)
        const base = 30 + Math.round(Math.sin(i / 2) * 12)
        const noise = Math.round(Math.random() * 18)
        const requests = base * 60 + noise * 40
        const tokens = requests * (450 + Math.round(Math.random() * 200))
        out.push({
            date: format(d, "yyyy-MM-dd"),
            requests,
            tokens,
            costCents: Math.round(tokens / 1000 * 0.15),
        })
    }
    return out
}

export const mockModelUsage: ModelUsage[] = [
    { model: "glm-5.1", requests: 9_412, tokens: 12_400_000, costCents: 2480 },
    { model: "glm-4.5", requests: 6_028, tokens: 8_100_000, costCents: 1620 },
    {
        model: "glm-coding",
        requests: 2_989,
        tokens: 3_200_000,
        costCents: 960,
    },
    {
        model: "glm-4.5-mini",
        requests: 14_213,
        tokens: 1_800_000,
        costCents: 180,
    },
]
