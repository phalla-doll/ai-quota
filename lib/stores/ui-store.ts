"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

type UiState = {
    selectedApiKeyId: string | null
    setSelectedApiKeyId: (id: string | null) => void
}

export const useUiStore = create<UiState>()(
    persist(
        (set) => ({
            selectedApiKeyId: null,
            setSelectedApiKeyId: (id) => set({ selectedApiKeyId: id }),
        }),
        { name: "zai-tracker-ui" }
    )
)
