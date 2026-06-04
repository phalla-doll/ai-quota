"use client"

import * as React from "react"
import { useQuery } from "@tanstack/react-query"
import { startOfMonth } from "date-fns"
import { readEvents } from "@/lib/usage-log"
import { useUiStore } from "@/lib/stores/ui-store"
import { useApiKeys } from "@/hooks/use-api-keys"
import type { UsageSummary } from "@/lib/types"

export function useUsageSummary(apiKeyId: string | undefined) {
    const version = useUiStore((s) => s.usageVersion)
    const { data: keys } = useApiKeys()
    const budget = React.useMemo(() => {
        const k = keys?.find((x) => x.id === apiKeyId)
        return k?.monthlyBudgetCents ?? 0
    }, [keys, apiKeyId])

    return useQuery({
        queryKey: ["usage", "summary", apiKeyId, version, budget],
        enabled: Boolean(apiKeyId),
        queryFn: async (): Promise<UsageSummary> => {
            const monthStart = startOfMonth(new Date()).getTime()
            const events = readEvents(apiKeyId!).filter(
                (e) => Date.parse(e.ts) >= monthStart
            )
            let usedCents = 0
            let requests = 0
            let tokensInput = 0
            let tokensOutput = 0
            for (const e of events) {
                usedCents += e.costCents
                requests += 1
                tokensInput += e.tokensInput
                tokensOutput += e.tokensOutput
            }
            return {
                apiKeyId: apiKeyId!,
                monthlyBudgetCents: budget,
                usedCents: Math.round(usedCents),
                requests,
                tokensInput,
                tokensOutput,
                capturedAt: new Date().toISOString(),
            }
        },
    })
}
