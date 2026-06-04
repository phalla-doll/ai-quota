"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AlertThreshold } from "@/lib/types"

const ALL: AlertThreshold[] = [50, 75, 90, 95]

type FiredMap = Record<string, Record<AlertThreshold, string | null>>
type EnabledMap = Record<AlertThreshold, boolean>

const defaultEnabled: EnabledMap = {
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
    toggle: (threshold: AlertThreshold) => void
    markFired: (
        keyId: string,
        threshold: AlertThreshold,
        period: string
    ) => void
    getEnabled: () => EnabledMap
    getFired: (keyId: string) => Record<AlertThreshold, string | null>
}

export const useAlertsStore = create<AlertsState>()(
    persist(
        (set, get) => ({
            enabled: defaultEnabled,
            fired: {},
            toggle: (threshold) =>
                set((s) => ({
                    enabled: {
                        ...s.enabled,
                        [threshold]: !s.enabled[threshold],
                    },
                })),
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
            getEnabled: () => get().enabled,
            getFired: (keyId) => get().fired[keyId] ?? defaultFired,
        }),
        {
            name: "zai-tracker-alerts",
            version: 2,
            migrate: () => ({
                enabled: defaultEnabled,
                fired: {},
            }),
        }
    )
)

export const ALL_THRESHOLDS = ALL
