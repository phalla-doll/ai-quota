"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchQuotaLimit, fetchModelUsage } from "@/lib/zai-monitor"
import type { ApiKey } from "@/lib/types"

export function useKeyQuota(apiKey: ApiKey | null | undefined) {
    return useQuery({
        queryKey: ["zai", "monitor", "quota", apiKey?.id],
        enabled: Boolean(apiKey),
        staleTime: 30_000,
        refetchInterval: 60_000,
        queryFn: () => fetchQuotaLimit(apiKey!.key),
    })
}

function rangeDays(days: number) {
    const now = new Date()
    const end = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        23,
        59,
        59,
        999
    )
    const start = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate() - (days - 1),
        0,
        0,
        0,
        0
    )
    return { start, end }
}

export function useKeyModelUsage(
    apiKey: ApiKey | null | undefined,
    days: number
) {
    return useQuery({
        queryKey: ["zai", "monitor", "model-usage", apiKey?.id, days],
        enabled: Boolean(apiKey),
        staleTime: 60_000,
        queryFn: () => {
            const { start, end } = rangeDays(days)
            return fetchModelUsage(apiKey!.key, start, end)
        },
    })
}
