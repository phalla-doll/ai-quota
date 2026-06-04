"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type UiState = {
    selectedApiKeyId: string | null
    setSelectedApiKeyId: (id: string | null) => void
    usageVersion: number
    bumpUsage: () => void
}

export const useUiStore = create<UiState>()(
    persist(
        (set) => ({
            selectedApiKeyId: null,
            setSelectedApiKeyId: (id) => set({ selectedApiKeyId: id }),
            usageVersion: 0,
            bumpUsage: () =>
                set((s) => ({ usageVersion: s.usageVersion + 1 })),
        }),
        {
            name: "zai-tracker-ui",
            partialize: (s) => ({ selectedApiKeyId: s.selectedApiKeyId }),
        }
    )
)
