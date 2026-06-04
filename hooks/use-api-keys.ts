"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useUiStore } from "@/lib/stores/ui-store"
import type { ApiKey, ZaiEndpoint } from "@/lib/types"

const STORAGE_KEY = "zai-tracker-keys"

function loadKeys(): ApiKey[] {
    if (typeof window === "undefined") return []
    try {
        const raw = localStorage.getItem(STORAGE_KEY)
        if (!raw) return []
        const parsed = JSON.parse(raw) as Partial<ApiKey>[]
        return parsed
            .filter((k): k is ApiKey => Boolean(k.id && k.name && k.key))
            .map((k) => ({
                id: k.id,
                name: k.name,
                provider: "zai",
                endpoint: (k.endpoint as ZaiEndpoint) ?? "paas",
                key: k.key,
                keyLast4: k.keyLast4 ?? k.key.slice(-4),
                createdAt: k.createdAt ?? new Date().toISOString(),
                lastSyncedAt: k.lastSyncedAt ?? null,
            }))
    } catch {
        return []
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

export type AddApiKeyInput = {
    name: string
    apiKey: string
    endpoint: ZaiEndpoint
}

export function useAddApiKey() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async (input: AddApiKeyInput) => {
            const keys = loadKeys()
            const next: ApiKey = {
                id: `key_${crypto.randomUUID().slice(0, 8)}`,
                name: input.name,
                provider: "zai",
                endpoint: input.endpoint,
                key: input.apiKey,
                keyLast4: input.apiKey.slice(-4),
                createdAt: new Date().toISOString(),
                lastSyncedAt: null,
            }
            saveKeys([...keys, next])
            return next
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["api-keys"] })
        },
    })
}

export function useRenameApiKey() {
    const qc = useQueryClient()
    return useMutation({
        mutationFn: async ({ id, name }: { id: string; name: string }) => {
            const keys = loadKeys().map((k) =>
                k.id === id ? { ...k, name } : k
            )
            saveKeys(keys)
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
