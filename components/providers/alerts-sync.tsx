"use client"

import * as React from "react"
import { useAlertsStore } from "@/lib/stores/alerts-store"
import { useTelegram } from "@/components/providers/telegram-provider"

// Pushes the user's alert-threshold settings to D1 so the standalone alerts cron
// worker (../../alerts-cron/) can read which thresholds they enabled. The store
// itself stays localStorage-first (instant, offline); this only mirrors the
// `enabled` map server-side under the `alerts` config namespace.
//
// Outside Telegram (no initDataRaw, e.g. plain `next dev`) there is no signed
// identity to scope the row to, so the sync is skipped — the store works as
// before. Mirrors the key-sync wiring in hooks/use-api-keys.ts.

const INIT_DATA_HEADER = "x-telegram-init-data"

async function pushAlertsConfig(
    initDataRaw: string,
    enabled: Record<number, boolean>
) {
    const res = await fetch("/api/config", {
        method: "PUT",
        headers: {
            [INIT_DATA_HEADER]: initDataRaw,
            "content-type": "application/json",
        },
        body: JSON.stringify({ namespace: "alerts", value: { enabled } }),
    })
    if (!res.ok) throw new Error(`PUT /api/config ${res.status}`)
}

export function AlertsSync() {
    const { ready, initDataRaw } = useTelegram()
    const enabled = useAlertsStore((s) => s.enabled)

    // Serialize so the effect only re-fires on an actual value change, not on
    // every store reference churn.
    const serialized = JSON.stringify(enabled)

    React.useEffect(() => {
        if (!ready || !initDataRaw) return
        pushAlertsConfig(initDataRaw, enabled).catch(() => {
            // Best-effort: a failed push just means the worker uses the last
            // synced (or default) thresholds; it retries on the next change.
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, initDataRaw, serialized])

    return null
}
