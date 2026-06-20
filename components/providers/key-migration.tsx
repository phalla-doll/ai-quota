"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTelegram } from "@/components/providers/telegram-provider"
import {
    apiKeysQueryKey,
    loadKeys,
    saveKeys,
    fetchKeysFromServer,
    bulkUpsertKeysOnServer,
    notifyKeysMigrated,
} from "@/lib/api-keys"
import type { ApiKey } from "@/lib/types"

// One-time localStorage → D1 migration for returning users. Runs as an explicit
// mount effect (not inside a query function), so the side effects — a network
// push, a localStorage write, and a toast — happen in a predictable, single
// place and can't be re-fired by query retries or StrictMode double-renders.
export function KeyMigration() {
    const { ready, initDataRaw } = useTelegram()
    const qc = useQueryClient()

    // Snapshot the local keys synchronously on first render, BEFORE the
    // useApiKeys query can overwrite localStorage with a server response.
    const snapshot = React.useRef<ApiKey[] | null>(null)
    if (snapshot.current === null) snapshot.current = loadKeys()

    const ran = React.useRef(false)

    React.useEffect(() => {
        if (!ready || !initDataRaw || ran.current) return
        ran.current = true

        const local = snapshot.current ?? []
        if (local.length === 0) return // nothing to migrate
        ;(async () => {
            try {
                const server = await fetchKeysFromServer(initDataRaw)
                // Only seed an empty account; never overwrite existing D1 keys.
                if (server.length > 0) return
                const migrated = await bulkUpsertKeysOnServer(
                    initDataRaw,
                    local
                )
                saveKeys(migrated)
                qc.setQueryData(apiKeysQueryKey(initDataRaw), migrated)
                notifyKeysMigrated(migrated.length)
            } catch {
                // Failed to reach the server — leave local intact and let the
                // next launch retry the migration.
                ran.current = false
            }
        })()
    }, [ready, initDataRaw, qc])

    return null
}
