"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AlertThreshold } from "@/lib/types"

const ALL: AlertThreshold[] = [50, 75, 90, 95]

type FiredMap = Record<string, Record<AlertThreshold, string | null>>
type EnabledMap = Record<string, Record<AlertThreshold, boolean>>

const defaultEnabled: Record<AlertThreshold, boolean> = {
    50: false,
    75: true,
    90: true,
    95: true,
}

const defaultFired: Record<AlertThreshold, string | null> = {
    50: null,
    75: null,
    90: null,
    95: null,
}

type AlertsState = {
    enabled: EnabledMap
    fired: FiredMap
    toggle: (keyId: string, threshold: AlertThreshold) => void
    markFired: (
        keyId: string,
        threshold: AlertThreshold,
        period: string
    ) => void
    getEnabled: (keyId: string) => Record<AlertThreshold, boolean>
    getFired: (keyId: string) => Record<AlertThreshold, string | null>
}

export const useAlertsStore = create<AlertsState>()(
    persist(
        (set, get) => ({
            enabled: {},
            fired: {},
            toggle: (keyId, threshold) =>
                set((s) => {
                    const cur = s.enabled[keyId] ?? defaultEnabled
                    return {
                        enabled: {
                            ...s.enabled,
                            [keyId]: {
                                ...cur,
                                [threshold]: !cur[threshold],
                            },
                        },
                    }
                }),
            markFired: (keyId, threshold, period) =>
                set((s) => {
                    const cur = s.fired[keyId] ?? defaultFired
                    return {
                        fired: {
                            ...s.fired,
                            [keyId]: { ...cur, [threshold]: period },
                        },
                    }
                }),
            getEnabled: (keyId) => get().enabled[keyId] ?? defaultEnabled,
            getFired: (keyId) => get().fired[keyId] ?? defaultFired,
        }),
        { name: "zai-tracker-alerts" }
    )
)

export const ALL_THRESHOLDS = ALL
