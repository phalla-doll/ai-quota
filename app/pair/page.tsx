import * as React from "react"
import type { Metadata } from "next"
import { PairScreen } from "@/components/pair/pair-screen"

// Standalone route, deliberately outside the (app) group: someone landing here
// has no keys yet, so the tab bar and the key-gated AppShell would have nothing
// to show. This is the browser/PWA counterpart to /install.ps1 — same pairing
// code, redeemed by hand instead of by PowerShell.

export const metadata: Metadata = {
    title: "Link this browser · Z AI Quota Tracker",
}

export default function PairPage() {
    return (
        <div className="relative mx-auto min-h-svh max-w-md bg-background">
            {/* useSearchParams (for the ?code= deep link) needs a boundary. */}
            <React.Suspense fallback={<div className="min-h-svh" />}>
                <PairScreen />
            </React.Suspense>
        </div>
    )
}
