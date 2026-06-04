"use client"

import { useMutation } from "@tanstack/react-query"
import { chatCompletion, type ChatMessage } from "@/lib/zai-client"
import { costCents } from "@/lib/zai-pricing"
import type { ApiKey } from "@/lib/types"

export type SendChatInput = {
    apiKey: ApiKey
    model: string
    messages: ChatMessage[]
    onDelta?: (chunk: string) => void
}

export function useChatCompletion() {
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
            return { ...result, costCents: cost }
        },
    })
}
