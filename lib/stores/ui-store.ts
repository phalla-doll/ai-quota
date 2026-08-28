"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type UiState = {
    selectedApiKeyId: string | null
    setSelectedApiKeyId: (id: string | null) => void
    quotaCompactMode: boolean
    setQuotaCompactMode: (compact: boolean) => void
    widgetMode: boolean
    setWidgetMode: (widget: boolean) => void
}

export const useUiStore = create<UiState>()(
    persist(
        (set) => ({
            selectedApiKeyId: null,
            setSelectedApiKeyId: (id) => set({ selectedApiKeyId: id }),
            quotaCompactMode: false,
            setQuotaCompactMode: (compact) =>
                set({ quotaCompactMode: compact }),
            widgetMode: false,
            setWidgetMode: (widget) => set({ widgetMode: widget }),
        }),
        {
            name: "zai-tracker-ui",
            partialize: (s) => ({
                selectedApiKeyId: s.selectedApiKeyId,
                quotaCompactMode: s.quotaCompactMode,
                widgetMode: s.widgetMode,
            }),
        }
    )
)
