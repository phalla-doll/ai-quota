"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    ChartLineData01Icon,
    DashboardSquare01Icon,
    PlusSignIcon,
    TestTube01Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { AppLogo } from "@/components/brand/app-logo"
import { AddKeyDrawer } from "@/components/settings/add-key-drawer"

const features = [
    {
        icon: DashboardSquare01Icon,
        title: "Track quota at a glance",
        body: "See remaining credits and daily burn across all your Z.ai keys.",
    },
    {
        icon: ChartLineData01Icon,
        title: "Break down usage by model",
        body: "Per-key, per-model token charts powered by Z.ai monitor data.",
    },
    {
        icon: TestTube01Icon,
        title: "Test calls in the Playground",
        body: "Send requests and see live cost estimates without leaving the app.",
    },
] as const

export function WelcomeScreen() {
    const [open, setOpen] = React.useState(false)
    return (
        <div className="flex min-h-svh flex-col px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
                <AppLogo size={72} className="size-18" />

                <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                    Welcome to AI Quota
                </h1>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    Add a Z.ai API key to start tracking your quota, usage, and
                    spend.
                </p>

                <ul className="mt-8 w-full divide-y divide-border/60 text-left">
                    {features.map((f) => (
                        <li key={f.title} className="py-4 first:pt-0 last:pb-0">
                            <div className="flex items-center gap-3">
                                <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                    <HugeiconsIcon icon={f.icon} size={16} />
                                </div>
                                <div className="text-sm font-medium">
                                    {f.title}
                                </div>
                            </div>
                            <p className="mt-1 pl-10 text-xs text-muted-foreground">
                                {f.body}
                            </p>
                        </li>
                    ))}
                </ul>
            </div>

            <div className="mt-6 space-y-2">
                <Button
                    size="xl"
                    className="w-full"
                    onClick={() => setOpen(true)}
                >
                    <HugeiconsIcon icon={PlusSignIcon} size={18} />
                    Add API key
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">
                    Stored on this device only.
                </p>
            </div>

            <AddKeyDrawer
                open={open}
                onOpenChange={setOpen}
                showTrigger={false}
            />
        </div>
    )
}
