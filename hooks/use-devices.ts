"use client"

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTelegram } from "@/components/providers/telegram-provider"
import type { Device } from "@/lib/types"

// Device pairing, from the Mini App's side: list the clients linked to this
// Telegram account, mint a pairing code, revoke a device. All three routes are
// Telegram-only (see lib/api-auth.ts), so every hook here is inert without
// `initDataRaw` — outside Telegram there is no account to link a device to.

const INIT_DATA_HEADER = "x-telegram-init-data"

export type PairingCode = { code: string; expiresAt: string }

export function devicesQueryKey() {
    return ["devices"] as const
}

export function useDevices() {
    const { initDataRaw } = useTelegram()

    return useQuery({
        queryKey: devicesQueryKey(),
        enabled: Boolean(initDataRaw),
        queryFn: async (): Promise<Device[]> => {
            if (!initDataRaw) return []
            const res = await fetch("/api/devices", {
                headers: { [INIT_DATA_HEADER]: initDataRaw },
            })
            if (!res.ok) throw new Error(`GET /api/devices ${res.status}`)
            const data = (await res.json()) as { devices: Device[] }
            return data.devices
        },
    })
}

export function usePairingCode() {
    const { initDataRaw } = useTelegram()

    return useMutation({
        mutationFn: async (): Promise<PairingCode> => {
            if (!initDataRaw) throw new Error("not in Telegram")
            const res = await fetch("/api/devices/pair", {
                method: "POST",
                headers: { [INIT_DATA_HEADER]: initDataRaw },
            })
            if (!res.ok) throw new Error(`POST /api/devices/pair ${res.status}`)
            return (await res.json()) as PairingCode
        },
        onError: () => toast.error("Couldn't create a pairing code"),
    })
}

export function useRevokeDevice() {
    const { initDataRaw } = useTelegram()
    const qc = useQueryClient()

    return useMutation({
        mutationFn: async (id: string) => {
            if (!initDataRaw) throw new Error("not in Telegram")
            const res = await fetch(
                `/api/devices?id=${encodeURIComponent(id)}`,
                {
                    method: "DELETE",
                    headers: { [INIT_DATA_HEADER]: initDataRaw },
                }
            )
            if (!res.ok) throw new Error(`DELETE /api/devices ${res.status}`)
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: devicesQueryKey() }),
        onError: () => toast.error("Couldn't revoke that device"),
    })
}
