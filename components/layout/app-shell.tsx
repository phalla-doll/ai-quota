"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { BottomNav } from "@/components/layout/bottom-nav"
import { PageTransition } from "@/components/layout/page-transition"
import { WelcomeScreen } from "@/components/dashboard/welcome-screen"
import { useApiKeys } from "@/hooks/use-api-keys"

export function AppShell({ children }: { children: React.ReactNode }) {
    const { data: keys, isPending } = useApiKeys()
    const router = useRouter()
    const pathname = usePathname()
    const wasEmpty = React.useRef(false)

    React.useEffect(() => {
        const hasKeys = !!keys && keys.length > 0
        if (wasEmpty.current && hasKeys && pathname !== "/") {
            router.replace("/")
        }
        if (!isPending) wasEmpty.current = !hasKeys
    }, [keys, isPending, pathname, router])

    if (isPending) {
        return <div className="min-h-svh bg-background" />
    }

    if (!keys || keys.length === 0) {
        return <WelcomeScreen />
    }

    return (
        <>
            <main className="pb-[calc(env(safe-area-inset-bottom)+5.5rem)]">
                <PageTransition>{children}</PageTransition>
            </main>
            <BottomNav />
        </>
    )
}
