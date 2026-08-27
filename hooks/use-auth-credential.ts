"use client"

import * as React from "react"
import { useQueryClient } from "@tanstack/react-query"
import { useTelegram } from "@/components/providers/telegram-provider"
import { useDeviceSessionStore } from "@/lib/stores/device-session-store"
import { clearKeys } from "@/lib/api-keys"
import type { AuthCredential } from "@/lib/auth-credential"

// Resolves which credential this client should talk to the D1 routes with.
//
//   in Telegram          -> the validated initData blob
//   paired browser/PWA   -> the device token from a redeemed pairing code
//   neither              -> null, and the app stays localStorage-only
//
// `ready` matters as much as the credential: both sources start empty on first
// paint (Telegram resolves in an effect, the persisted session only exists in
// the browser), so a consumer that treats an unresolved credential as "no
// account" flashes the wrong UI. Wait for `ready` before concluding anything
// from a null credential.

// The persisted device session rehydrates from localStorage, which the server
// render doesn't have. useSyncExternalStore with a distinct server snapshot is
// the SSR-safe way to ask "are we on the client yet" — React uses `false` for
// the hydrating render, then re-renders with `true`, so markup always matches.
const noopSubscribe = () => () => {}
const clientSnapshot = () => true
const serverSnapshot = () => false

function useMounted(): boolean {
    return React.useSyncExternalStore(
        noopSubscribe,
        clientSnapshot,
        serverSnapshot
    )
}

export function useAuthCredential(): {
    credential: AuthCredential | null
    ready: boolean
} {
    const { ready: tgReady, initDataRaw } = useTelegram()
    const session = useDeviceSessionStore((s) => s.session)
    const mounted = useMounted()

    return React.useMemo(() => {
        const ready = mounted && tgReady
        if (!ready) return { credential: null, ready: false }
        if (initDataRaw) {
            return {
                credential: { kind: "telegram", initDataRaw },
                ready: true,
            }
        }
        if (session) {
            return {
                credential: { kind: "device", token: session.token },
                ready: true,
            }
        }
        return { credential: null, ready: true }
    }, [mounted, tgReady, initDataRaw, session])
}

// The paired-browser session itself, for UI that needs to show it.
// Null until mounted, for the same reason as above.
export function useDeviceSession() {
    const session = useDeviceSessionStore((s) => s.session)
    return useMounted() ? session : null
}

// Unlinking has to drop the key cache along with the token, not just the token.
// Without the credential the app falls back to localStorage, which still holds
// every key that synced down from the account — so forgetting only the token
// would leave the whole keyset listed, in plaintext, on a machine the user just
// unlinked. Clearing the query cache too stops a live page re-showing them.
//
// This is local-only by design: revoking the device row needs Telegram (see
// lib/api-auth.ts), so callers should say the device stays listed there.
export function useUnlinkBrowser() {
    const clearSession = useDeviceSessionStore((s) => s.clear)
    const qc = useQueryClient()

    return React.useCallback(() => {
        clearSession()
        clearKeys()
        qc.removeQueries({ queryKey: ["api-keys"] })
    }, [clearSession, qc])
}
