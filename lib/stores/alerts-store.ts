"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { AlertThreshold } from "@/lib/types"

type AlertsState = {
    thresholds: Record<AlertThreshold, boolean>
    toggle: (threshold: AlertThreshold) => void
}

const defaults: Record<AlertThreshold, boolean> = {
    50: false,
    75: true,
    90: true,
    95: true,
}

export const useAlertsStore = create<AlertsState>()(
    persist(
        (set) => ({
            thresholds: defaults,
            toggle: (threshold) =>
                set((s) => ({
                    thresholds: {
                        ...s.thresholds,
                        [threshold]: !s.thresholds[threshold],
                    },
                })),
        }),
        { name: "zai-tracker-alerts" }
    )
)
