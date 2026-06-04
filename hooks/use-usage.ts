"use client"

import { useQuery } from "@tanstack/react-query"
import {
    mockDailyUsage,
    mockModelUsage,
    mockUsageSummary,
} from "@/lib/mock-data"

export function useUsageSummary(apiKeyId: string | undefined) {
    return useQuery({
        queryKey: ["usage", "summary", apiKeyId],
        enabled: Boolean(apiKeyId),
        queryFn: async () => {
            await new Promise((r) => setTimeout(r, 200))
            return mockUsageSummary(apiKeyId!)
        },
    })
}

export function useDailyUsage(apiKeyId: string | undefined, days: number) {
    return useQuery({
        queryKey: ["usage", "daily", apiKeyId, days],
        enabled: Boolean(apiKeyId),
        queryFn: async () => {
            await new Promise((r) => setTimeout(r, 200))
            return mockDailyUsage(days)
        },
    })
}

export function useModelUsage(apiKeyId: string | undefined) {
    return useQuery({
        queryKey: ["usage", "models", apiKeyId],
        enabled: Boolean(apiKeyId),
        queryFn: async () => {
            await new Promise((r) => setTimeout(r, 200))
            return mockModelUsage
        },
    })
}
