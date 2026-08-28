"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { BottomNav } from "@/components/layout/bottom-nav"
import { PageTransition } from "@/components/layout/page-transition"
import { WelcomeScreen } from "@/components/dashboard/welcome-screen"
import { useApiKeys } from "@/hooks/use-api-keys"
import { useUiStore } from "@/lib/stores/ui-store"

export function AppShell({ children }: { children: React.ReactNode }) {
    const {
        data: keys,
        isPending,
        isPlaceholderData,
        isFetching,
    } = useApiKeys()
    const router = useRouter()
    const pathname = usePathname()
    const widgetMode = useUiStore((s) => s.widgetMode)
    const wasEmpty = React.useRef(false)

    const hasKeys = !!keys && keys.length > 0

    React.useEffect(() => {
        if (wasEmpty.current && hasKeys && pathname !== "/") {
            router.replace("/")
        }
        // Only record emptiness from settled (non-placeholder) data, so the
        // redirect decision is based on server truth, not the stale local cache.
        if (!isPlaceholderData) wasEmpty.current = !hasKeys
    }, [hasKeys, isPlaceholderData, pathname, router])

    // Block on the loading screen only when we have nothing useful to show yet:
    // either the very first load, or a placeholder-empty cache while the real
    // fetch is still in flight (avoids a WelcomeScreen flash before keys arrive).
    if (isPending || (isPlaceholderData && isFetching && !hasKeys)) {
        return <div className="min-h-svh bg-background" />
    }

    if (!hasKeys) {
        return <WelcomeScreen />
    }

    // Widget mode only strips chrome on the dashboard — the toggle lives there
    // and nowhere else, so hiding the nav on another route would strand the user.
    const widget = widgetMode && pathname === "/"

    return (
        <>
            <main
                className={
                    widget
                        ? "pb-[calc(env(safe-area-inset-bottom)+1rem)]"
                        : "pb-[calc(env(safe-area-inset-bottom)+5.5rem)]"
                }
            >
                <PageTransition>{children}</PageTransition>
            </main>
            {widget ? null : <BottomNav />}
        </>
    )
}
