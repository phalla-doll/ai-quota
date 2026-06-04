"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { mockApiKeys } from "@/lib/mock-data"
import { useUiStore } from "@/lib/stores/ui-store"
import type { ApiKey } from "@/lib/types"

const STORAGE_KEY = "zai-tracker-keys"

function loadKeys(): ApiKey[] {
    if (typeof window === "undefined") return mockApiKeys
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return mockApiKeys
        return JSON.parse(raw) as ApiKey[]
    } catch {
        return mockApiKeys
    }
}

function saveKeys(keys: ApiKey[]) {
    if (typeof window === "undefined") return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(keys))
}

export function useApiKeys() {
    return useQuery({
        queryKey: ["api-keys"],
        queryFn: async () => loadKeys(),
        staleTime: Infinity,
    })
}

export function useSelectedApiKey() {
    const { data: keys } = useApiKeys()
    const selectedId = useUiStore((s) => s.selectedApiKeyId)
    const setSelected = useUiStore((s) => s.setSelectedApiKeyId)

    React.useEffect(() => {
        if (!keys || keys.length === 0) return
        if (!selectedId || !keys.find((k) => k.id === selectedId)) {
            setSelected(keys[0].id)
        }
    }, [keys, selectedId, setSelected])

    const selected = React.useMemo(
        () => keys?.find((k) => k.id === selectedId) ?? keys?.[0] ?? null,
        [keys, selectedId]
    )

    return selected
}

export function useAddApiKey() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (input: {
            name: string
            apiKey: string
            monthlyBudgetCents: number | null
        }) => {
            const keys = loadKeys()
            const next: ApiKey = {
                id: `key_${crypto.randomUUID().slice(0, 8)}`,
                name: input.name,
                provider: "zai",
                keyLast4: input.apiKey.slice(-4),
                monthlyBudgetCents: input.monthlyBudgetCents,
                createdAt: new Date().toISOString(),
                lastSyncedAt: null,
            }
            const updated = [...keys, next]
            saveKeys(updated)
            return next
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["api-keys"] })
        },
    })
}

export function useDeleteApiKey() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (id: string) => {
            const keys = loadKeys().filter((k) => k.id !== id)
            saveKeys(keys)
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["api-keys"] })
        },
    })
}
