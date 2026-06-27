"use client"

import * as React from "react"
import { useAlertsStore } from "@/lib/stores/alerts-store"
import { useTelegram } from "@/components/providers/telegram-provider"

// Pushes the user's alert-threshold settings to D1 so the standalone alerts cron
// worker (../../alerts-cron/) can read which thresholds they enabled. The store
// itself stays localStorage-first (instant, offline); this only mirrors the
// `enabled` map server-side under the `alerts` config namespace.
//
// It also rides along the browser's IANA timezone (e.g. "Asia/Bangkok"). The
// cron worker runs serverside with no browser, so without this it can only
// render reset times in UTC; it formats reset times in this zone (UTC fallback).
//
// Outside Telegram (no initDataRaw, e.g. plain `next dev`) there is no signed
// identity to scope the row to, so the sync is skipped — the store works as
// before. Mirrors the key-sync wiring in hooks/use-api-keys.ts.

const INIT_DATA_HEADER = "x-telegram-init-data"

// The device's IANA timezone, or undefined if the runtime can't resolve one
// (worker then falls back to UTC).
function resolveTimezone(): string | undefined {
    try {
        return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined
    } catch {
        return undefined
    }
}

async function pushAlertsConfig(
    initDataRaw: string,
    enabled: Record<number, boolean>,
    timezone: string | undefined
) {
    const res = await fetch("/api/config", {
        method: "PUT",
        headers: {
            [INIT_DATA_HEADER]: initDataRaw,
            "content-type": "application/json",
        },
        body: JSON.stringify({
            namespace: "alerts",
            value: { enabled, timezone },
        }),
    })
    if (!res.ok) throw new Error(`PUT /api/config ${res.status}`)
}

export function AlertsSync() {
    const { ready, initDataRaw } = useTelegram()
    const enabled = useAlertsStore((s) => s.enabled)

    const timezone = resolveTimezone()

    // Serialize so the effect only re-fires on an actual value change, not on
    // every store reference churn. Timezone is stable per device but included so
    // a move across zones re-syncs.
    const serialized = JSON.stringify({ enabled, timezone })

    React.useEffect(() => {
        if (!ready || !initDataRaw) return
        pushAlertsConfig(initDataRaw, enabled, timezone).catch(() => {
            // Best-effort: a failed push just means the worker uses the last
            // synced (or default) thresholds; it retries on the next change.
        })
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, initDataRaw, serialized])

    return null
}
