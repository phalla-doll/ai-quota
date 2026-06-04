"use client"

import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { format } from "date-fns"
import { chatCompletion, type ChatMessage } from "@/lib/zai-client"
import { appendEvent, readEvents } from "@/lib/usage-log"
import { costCents } from "@/lib/zai-pricing"
import { useUiStore } from "@/lib/stores/ui-store"
import { useAlertsStore, ALL_THRESHOLDS } from "@/lib/stores/alerts-store"
import { formatCurrency } from "@/lib/format"
import type { ApiKey, AlertThreshold } from "@/lib/types"

export type SendChatInput = {
    apiKey: ApiKey
    model: string
    messages: ChatMessage[]
    onDelta?: (chunk: string) => void
}

function monthStart() {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1).getTime()
}

function monthToDateCents(keyId: string): number {
    const since = monthStart()
    let total = 0
    for (const e of readEvents(keyId)) {
        if (Date.parse(e.ts) >= since) total += e.costCents
    }
    return total
}

function checkAlerts(apiKey: ApiKey) {
    const budget = apiKey.monthlyBudgetCents
    if (!budget || budget <= 0) return
    const used = monthToDateCents(apiKey.id)
    const pct = (used / budget) * 100
    const store = useAlertsStore.getState()
    const enabled = store.getEnabled()
    const fired = store.getFired(apiKey.id)
    const period = format(new Date(), "yyyy-MM")
    for (const t of ALL_THRESHOLDS as AlertThreshold[]) {
        if (!enabled[t]) continue
        if (pct < t) continue
        if (fired[t] === period) continue
        store.markFired(apiKey.id, t, period)
        toast.warning(`Z.ai usage at ${t}%`, {
            description: `“${apiKey.name}” used ${formatCurrency(
                Math.round(used)
            )} of ${formatCurrency(budget)} this month.`,
        })
        try {
            navigator.vibrate?.(60)
        } catch {}
    }
}

export function useChatCompletion() {
    const bump = useUiStore((s) => s.bumpUsage)
    return useMutation({
        mutationFn: async (input: SendChatInput) => {
            const result = await chatCompletion({
                key: input.apiKey.key,
                endpoint: input.apiKey.endpoint,
                model: input.model,
                messages: input.messages,
                onDelta: input.onDelta,
            })
            const cost = costCents(
                result.model,
                result.usage.prompt_tokens,
                result.usage.completion_tokens
            )
            appendEvent(input.apiKey.id, {
                ts: new Date().toISOString(),
                model: result.model,
                tokensInput: result.usage.prompt_tokens,
                tokensOutput: result.usage.completion_tokens,
                costCents: cost,
            })
            checkAlerts(input.apiKey)
            return { ...result, costCents: cost }
        },
        onSuccess: () => bump(),
    })
}
