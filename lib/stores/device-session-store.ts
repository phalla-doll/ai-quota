"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

// The browser's half of device pairing: the token this browser redeemed a
// pairing code for, plus enough metadata to show what it is linked as.
//
// This is what makes the app usable outside Telegram — installed as a PWA, or
// just open in a tab. The token is long-lived and grants read/write on the
// user's keys, so it is exactly as sensitive as the Z.ai keys already sitting
// in localStorage next to it. It cannot mint pairing codes or revoke devices;
// that split lives in lib/api-auth.ts and is the reason a leaked token can't
// entrench itself.
//
// Clearing here only forgets the token locally. A real revoke has to happen
// from Telegram (Settings > Linked devices), which is the only place that can.

export type DeviceSession = {
    token: string
    deviceId: string
    name: string
    pairedAt: string
}

type DeviceSessionState = {
    session: DeviceSession | null
    setSession: (session: DeviceSession) => void
    clear: () => void
}

export const useDeviceSessionStore = create<DeviceSessionState>()(
    persist(
        (set) => ({
            session: null,
            setSession: (session) => set({ session }),
            clear: () => set({ session: null }),
        }),
        {
            name: "zai-tracker-device",
            partialize: (s) => ({ session: s.session }),
        }
    )
)
