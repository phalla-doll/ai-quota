"use client"

import * as React from "react"
import { toast } from "sonner"
import { useQueryClient } from "@tanstack/react-query"
import { HugeiconsIcon } from "@hugeicons/react"
import { Tick02Icon, Alert02Icon } from "@hugeicons/core-free-icons"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { warmUpKey } from "@/lib/zai-client"
import { cn } from "@/lib/utils"
import type { ApiKey } from "@/lib/types"

type Status = "idle" | "pending" | "ok" | "error"

type WarmUpDrawerProps = {
    keys: ApiKey[]
    open: boolean
    onOpenChange: (open: boolean) => void
}

export function WarmUpDrawer({ keys, open, onOpenChange }: WarmUpDrawerProps) {
    const qc = useQueryClient()
    const [status, setStatus] = React.useState<
        Record<string, { state: Status; error?: string }>
    >({})

    React.useEffect(() => {
        if (!open) setStatus({})
    }, [open])

    const anyPending = Object.values(status).some((s) => s.state === "pending")

    async function fireOne(key: ApiKey) {
        setStatus((s) => ({ ...s, [key.id]: { state: "pending" } }))
        try {
            await warmUpKey({ key: key.key, endpoint: key.endpoint })
            setStatus((s) => ({ ...s, [key.id]: { state: "ok" } }))
            qc.invalidateQueries({
                queryKey: ["zai", "monitor", "quota", key.id],
            })
            qc.invalidateQueries({
                queryKey: ["zai", "monitor", "model-usage", key.id],
            })
        } catch (e) {
            setStatus((s) => ({
                ...s,
                [key.id]: {
                    state: "error",
                    error: e instanceof Error ? e.message : "Failed",
                },
            }))
        }
    }

    async function fireAll() {
        const pending = Object.fromEntries(
            keys.map((k) => [k.id, { state: "pending" as Status }])
        )
        setStatus(pending)
        const results = await Promise.allSettled(
            keys.map((k) =>
                warmUpKey({ key: k.key, endpoint: k.endpoint }).then(() => k)
            )
        )
        const next: Record<string, { state: Status; error?: string }> = {}
        let okCount = 0
        let errCount = 0
        results.forEach((r, i) => {
            const k = keys[i]
            if (r.status === "fulfilled") {
                next[k.id] = { state: "ok" }
                okCount++
            } else {
                const msg =
                    r.reason instanceof Error ? r.reason.message : "Failed"
                next[k.id] = { state: "error", error: msg }
                errCount++
            }
        })
        setStatus(next)
        qc.invalidateQueries({ queryKey: ["zai", "monitor"] })
        if (errCount === 0) {
            toast.success(`Warmed up ${okCount} key${okCount === 1 ? "" : "s"}`)
        } else if (okCount === 0) {
            toast.error(`All ${errCount} keys failed`)
        } else {
            toast.warning(`${okCount} succeeded, ${errCount} failed`)
        }
    }

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Warm up keys</DrawerTitle>
                    <DrawerDescription>
                        Sends a 1-token request to start the quota-reset
                        countdown.
                    </DrawerDescription>
                </DrawerHeader>

                <div className="space-y-2 px-4">
                    {keys.map((k) => {
                        const s = status[k.id]?.state ?? "idle"
                        const err = status[k.id]?.error
                        return (
                            <div
                                key={k.id}
                                className="flex items-center justify-between gap-3 rounded-2xl border border-input px-4 py-3"
                            >
                                <div className="min-w-0 flex-1">
                                    <div className="truncate text-sm font-medium">
                                        {k.name}
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">
                                        {k.endpoint === "coding"
                                            ? "Coding Plan"
                                            : "Standard"}
                                        {" · "}
                                        ••••{k.keyLast4}
                                        {err ? (
                                            <span className="text-destructive">
                                                {" · "}
                                                {err}
                                            </span>
                                        ) : null}
                                    </div>
                                </div>
                                <StatusPill state={s} />
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    disabled={s === "pending" || anyPending}
                                    onClick={() => fireOne(k)}
                                    className="shrink-0"
                                >
                                    {s === "ok" || s === "error"
                                        ? "Retry"
                                        : "Warm up"}
                                </Button>
                            </div>
                        )
                    })}
                </div>

                <DrawerFooter className="pt-6">
                    <Button
                        size="xl"
                        type="button"
                        onClick={fireAll}
                        disabled={anyPending || keys.length === 0}
                    >
                        {anyPending
                            ? "Warming up…"
                            : `Warm up all (${keys.length})`}
                    </Button>
                    <DrawerClose asChild>
                        <Button size="xl" type="button" variant="outline">
                            Close
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}

function StatusPill({ state }: { state: Status }) {
    if (state === "idle") return null
    if (state === "pending") {
        return (
            <span className="inline-flex h-6 items-center gap-1 rounded-full bg-muted px-2 text-[11px] text-muted-foreground">
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                Sending
            </span>
        )
    }
    if (state === "ok") {
        return (
            <span
                className={cn(
                    "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px]",
                    "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                )}
            >
                <HugeiconsIcon icon={Tick02Icon} size={12} />
                OK
            </span>
        )
    }
    return (
        <span
            className={cn(
                "inline-flex h-6 items-center gap-1 rounded-full px-2 text-[11px]",
                "bg-destructive/15 text-destructive"
            )}
        >
            <HugeiconsIcon icon={Alert02Icon} size={12} />
            Failed
        </span>
    )
}
