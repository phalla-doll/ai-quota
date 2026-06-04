"use client"

import { create } from "zustand"

type AuthStatus = "loading" | "authenticated" | "unauthenticated"

type AuthState = {
    jwt: string | null
    userId: string | null
    status: AuthStatus
    setSession: (jwt: string, userId: string) => void
    clear: () => void
    setStatus: (status: AuthStatus) => void
}

export const useAuthStore = create<AuthState>((set) => ({
    jwt: null,
    userId: null,
    status: "loading",
    setSession: (jwt, userId) => set({ jwt, userId, status: "authenticated" }),
    clear: () => set({ jwt: null, userId: null, status: "unauthenticated" }),
    setStatus: (status) => set({ status }),
}))
