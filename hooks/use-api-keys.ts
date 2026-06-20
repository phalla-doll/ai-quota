"use client"

import * as React from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useUiStore } from "@/lib/stores/ui-store"
import { useTelegram } from "@/components/providers/telegram-provider"
import {
    apiKeysQueryKey,
    loadKeys,
    saveKeys,
    fetchKeysFromServer,
    upsertKeyOnServer,
    deleteKeyOnServer,
} from "@/lib/api-keys"
import type { ApiKey, ZaiEndpoint } from "@/lib/types"

// D1 is authoritative once the user is in Telegram (we can validate their
// initData server-side); localStorage mirrors the keyset for instant first paint
// and offline access, and is the sole store outside Telegram (e.g. plain
// `next dev`, where there is no signed identity to scope D1 rows to).
//
// The one-time localStorage→D1 migration lives in
// components/providers/key-migration.tsx, deliberately NOT in this query.

const SYNC_FAIL =
    "Saved on this device, but couldn't sync to your Telegram account — it'll retry."

export function useApiKeys() {
    const { initDataRaw } = useTelegram()

    return useQuery({
        // Auth marker in the key → the query re-runs when initDataRaw resolves,
        // so the server sync fires on open instead of being stuck on the cache.
        queryKey: apiKeysQueryKey(initDataRaw),
        // Seed instantly from the local cache so the UI never blocks on the net.
        placeholderData: () => loadKeys(),
        staleTime: initDataRaw ? 60_000 : Infinity,
        queryFn: async () => {
            // No signed identity → localStorage is the source of truth.
            if (!initDataRaw) return loadKeys()

            try {
                const server = await fetchKeysFromServer(initDataRaw)
                const local = loadKeys()
                // Pre-migration: keys exist only locally, server is still empty.
                // Keep showing local; the migration provider pushes them up.
                // (No write here, so we never clobber local before migration.)
                if (server.length === 0 && local.length > 0) return local
                saveKeys(server)
                return server
            } catch {
                // Offline / server error → fall back to the cached copy.
                return loadKeys()
            }
        },
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

// Shared mutation wiring: optimistically write the next keyset to the local
// cache + query cache, then sync the single changed row to D1. On failure we
// surface a toast and invalidate so the UI reverts to server truth. Outside
// Telegram (no initDataRaw) the server step is skipped — localStorage-only.
function useKeysetMutation<TArg>(
    apply: (
        arg: TArg,
        current: ApiKey[]
    ) => { next: ApiKey[]; sync: (initDataRaw: string) => Promise<void> }
) {
    const qc = useQueryClient()
    const { initDataRaw } = useTelegram()
    const key = apiKeysQueryKey(initDataRaw)

    return useMutation({
        mutationFn: async (arg: TArg) => {
            const current = qc.getQueryData<ApiKey[]>(key) ?? loadKeys()
            const { next, sync } = apply(arg, current)
            saveKeys(next)
            qc.setQueryData(key, next)
            if (initDataRaw) await sync(initDataRaw)
            return next
        },
        onError: () => {
            toast.error(SYNC_FAIL)
            // Revert optimistic local + cache state to the server's truth.
            qc.invalidateQueries({ queryKey: key })
        },
    })
}

export function useAddApiKey() {
    return useKeysetMutation((input: AddApiKeyInput, current) => {
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
        return {
            next: [...current, next],
            sync: (initDataRaw) => upsertKeyOnServer(initDataRaw, next),
        }
    })
}

export function useRenameApiKey() {
    return useKeysetMutation(
        ({ id, name }: { id: string; name: string }, current) => {
            const renamed = current.map((k) =>
                k.id === id ? { ...k, name } : k
            )
            const target = renamed.find((k) => k.id === id)
            return {
                next: renamed,
                sync: async (initDataRaw) => {
                    if (target) await upsertKeyOnServer(initDataRaw, target)
                },
            }
        }
    )
}

export function useDeleteApiKey() {
    return useKeysetMutation((id: string, current) => ({
        next: current.filter((k) => k.id !== id),
        sync: (initDataRaw) => deleteKeyOnServer(initDataRaw, id),
    }))
}
