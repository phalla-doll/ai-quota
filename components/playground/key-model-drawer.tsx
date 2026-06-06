"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ArrowLeft02Icon, Tick02Icon } from "@hugeicons/core-free-icons"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
} from "@/components/ui/drawer"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import type { ApiKey } from "@/lib/types"

type Step = 1 | 2

type KeyModelDrawerProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    keys: ApiKey[]
    selectedKeyId: string | null
    onSelectKey: (id: string) => void
    models: string[] | undefined
    modelsLoading: boolean
    selectedModel: string
    onSelectModel: (model: string) => void
}

export function KeyModelDrawer({
    open,
    onOpenChange,
    keys,
    selectedKeyId,
    onSelectKey,
    models,
    modelsLoading,
    selectedModel,
    onSelectModel,
}: KeyModelDrawerProps) {
    const [step, setStep] = React.useState<Step>(1)

    function handleOpenChange(next: boolean) {
        if (next) setStep(1)
        onOpenChange(next)
    }

    function handlePickKey(id: string) {
        onSelectKey(id)
        setStep(2)
    }

    function handlePickModel(m: string) {
        onSelectModel(m)
        onOpenChange(false)
    }

    return (
        <Drawer open={open} onOpenChange={handleOpenChange}>
            <DrawerContent>
                <div className="t-step-slide" data-step={String(step)}>
                    <section className="t-step" data-step-id="1">
                        <DrawerHeader>
                            <DrawerTitle>Pick an API key</DrawerTitle>
                            <DrawerDescription>
                                The key the playground will use.
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="max-h-[60vh] overflow-y-auto px-2 pb-4">
                            {keys.map((k) => {
                                const active = selectedKeyId === k.id
                                return (
                                    <button
                                        key={k.id}
                                        type="button"
                                        onClick={() => handlePickKey(k.id)}
                                        className={cn(
                                            "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-muted/50",
                                            active && "bg-muted/40"
                                        )}
                                    >
                                        <div className="min-w-0">
                                            <div
                                                className={cn(
                                                    "truncate",
                                                    active && "font-medium"
                                                )}
                                            >
                                                {k.name}
                                            </div>
                                            <div className="truncate text-xs text-muted-foreground">
                                                •••• {k.keyLast4}
                                            </div>
                                        </div>
                                        {active ? (
                                            <HugeiconsIcon
                                                icon={Tick02Icon}
                                                size={18}
                                                className="shrink-0 text-primary"
                                            />
                                        ) : null}
                                    </button>
                                )
                            })}
                        </div>
                    </section>

                    <section className="t-step" data-step-id="2">
                        <DrawerHeader>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => setStep(1)}
                                    className="-ml-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                                    aria-label="Back to keys"
                                >
                                    <HugeiconsIcon
                                        icon={ArrowLeft02Icon}
                                        size={16}
                                    />
                                </button>
                                <div className="flex-1 text-left">
                                    <DrawerTitle>Pick a model</DrawerTitle>
                                    <DrawerDescription>
                                        Models available on the selected key.
                                    </DrawerDescription>
                                </div>
                            </div>
                        </DrawerHeader>
                        <div className="max-h-[60vh] overflow-y-auto px-2 pb-4">
                            {modelsLoading ? (
                                <div className="space-y-2 px-1 py-2">
                                    <Skeleton className="h-10 w-full rounded-lg" />
                                    <Skeleton className="h-10 w-full rounded-lg" />
                                    <Skeleton className="h-10 w-full rounded-lg" />
                                </div>
                            ) : (
                                (models ?? []).map((m) => {
                                    const active = selectedModel === m
                                    return (
                                        <button
                                            key={m}
                                            type="button"
                                            onClick={() => handlePickModel(m)}
                                            className={cn(
                                                "flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-left text-sm transition-colors hover:bg-muted/50",
                                                active && "bg-muted/40"
                                            )}
                                        >
                                            <span
                                                className={cn(
                                                    "truncate uppercase",
                                                    active && "font-medium"
                                                )}
                                            >
                                                {m}
                                            </span>
                                            {active ? (
                                                <HugeiconsIcon
                                                    icon={Tick02Icon}
                                                    size={18}
                                                    className="shrink-0 text-primary"
                                                />
                                            ) : null}
                                        </button>
                                    )
                                })
                            )}
                        </div>
                    </section>
                </div>
            </DrawerContent>
        </Drawer>
    )
}
