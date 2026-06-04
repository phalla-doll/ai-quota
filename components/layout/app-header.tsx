"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronDownIcon, PlusSignIcon } from "@hugeicons/core-free-icons"
import { AddKeyDrawer } from "@/components/settings/add-key-drawer"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { useApiKeys, useSelectedApiKey } from "@/hooks/use-api-keys"
import { useUiStore } from "@/lib/stores/ui-store"
import { cn } from "@/lib/utils"

type AppHeaderProps = {
    title: string
    subtitle?: string
    showKeySwitcher?: boolean
    rightAction?: "switcher" | "add"
}

export function AppHeader({
    title,
    subtitle,
    showKeySwitcher = true,
    rightAction = "switcher",
}: AppHeaderProps) {
    const { data: keys } = useApiKeys()
    const selected = useSelectedApiKey()
    const setSelected = useUiStore((s) => s.setSelectedApiKeyId)
    const [open, setOpen] = React.useState(false)
    const [addOpen, setAddOpen] = React.useState(false)

    const showSwitcher =
        rightAction === "switcher" &&
        showKeySwitcher &&
        keys &&
        keys.length > 0
    const showAdd = rightAction === "add"

    return (
        <div
            className={cn(
                "flex items-start justify-between gap-3 px-4",
                "pt-[max(calc(env(safe-area-inset-top)+3.5rem),5rem)] pb-4"
            )}
        >
            <div className="min-w-0">
                <h1 className="truncate text-3xl leading-tight font-bold tracking-tight">
                    {title}
                </h1>
                {subtitle ? (
                    <p className="mt-0.5 truncate text-sm text-muted-foreground">
                        {subtitle}
                    </p>
                ) : null}
            </div>

            {showSwitcher ? (
                <Drawer open={open} onOpenChange={setOpen}>
                    <DrawerTrigger asChild>
                        <Button
                            variant="secondary"
                            size="sm"
                            className="mt-1 max-w-[8.5rem] shrink-0 gap-1 rounded-full"
                        >
                            <span className="truncate">
                                {selected?.name ?? "Select key"}
                            </span>
                            <HugeiconsIcon icon={ChevronDownIcon} size={14} />
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Switch API key</DrawerTitle>
                            <DrawerDescription>
                                Pick which key the dashboard reflects.
                            </DrawerDescription>
                        </DrawerHeader>
                        <div className="flex flex-col gap-1 px-4 pb-2">
                            {keys?.map((k) => {
                                const active = selected?.id === k.id
                                return (
                                    <button
                                        key={k.id}
                                        type="button"
                                        onClick={() => {
                                            setSelected(k.id)
                                            setOpen(false)
                                        }}
                                        className={cn(
                                            "flex items-center justify-between rounded-md border px-3 py-3 text-left text-sm transition-colors",
                                            active
                                                ? "border-primary bg-primary/5"
                                                : "border-border hover:bg-muted"
                                        )}
                                    >
                                        <div>
                                            <div className="font-medium">
                                                {k.name}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                •••• {k.keyLast4}
                                            </div>
                                        </div>
                                        {active ? (
                                            <span className="h-2 w-2 rounded-full bg-primary" />
                                        ) : null}
                                    </button>
                                )
                            })}
                            <button
                                type="button"
                                onClick={() => {
                                    setOpen(false)
                                    setAddOpen(true)
                                }}
                                className="mt-1 flex items-center gap-2 rounded-md border border-dashed border-border px-3 py-3 text-left text-sm font-medium transition-colors hover:bg-muted"
                            >
                                <HugeiconsIcon icon={PlusSignIcon} size={16} />
                                Add API key
                            </button>
                        </div>
                        <DrawerFooter>
                            <DrawerClose asChild>
                                <Button size="xl" variant="outline">
                                    Close
                                </Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
            ) : null}
            {showAdd ? (
                <Button
                    variant="secondary"
                    size="icon"
                    className="mt-1 shrink-0 rounded-full"
                    aria-label="Add API key"
                    onClick={() => setAddOpen(true)}
                >
                    <HugeiconsIcon icon={PlusSignIcon} size={16} />
                </Button>
            ) : null}
            <AddKeyDrawer
                open={addOpen}
                onOpenChange={setAddOpen}
                showTrigger={false}
            />
        </div>
    )
}
