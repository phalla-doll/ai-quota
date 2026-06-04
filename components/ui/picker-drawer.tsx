"use client"

import * as React from "react"
import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronDownIcon, Tick02Icon } from "@hugeicons/core-free-icons"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { cn } from "@/lib/utils"

export type PickerOption = {
    value: string
    label: string
    sub?: string
}

type PickerDrawerProps = {
    value: string
    options: PickerOption[]
    onChange: (value: string) => void
    title: string
    description?: string
    placeholder?: string
    disabled?: boolean
    triggerId?: string
}

export function PickerDrawer({
    value,
    options,
    onChange,
    title,
    description,
    placeholder = "Select…",
    disabled,
    triggerId,
}: PickerDrawerProps) {
    const [open, setOpen] = React.useState(false)
    const current = options.find((o) => o.value === value)

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <button
                    id={triggerId}
                    type="button"
                    disabled={disabled}
                    className={cn(
                        "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-background px-3 text-left text-sm",
                        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none",
                        "disabled:cursor-not-allowed disabled:opacity-50"
                    )}
                >
                    <span
                        className={cn(
                            "truncate",
                            !current && "text-muted-foreground"
                        )}
                    >
                        {current?.label ?? placeholder}
                    </span>
                    <HugeiconsIcon
                        icon={ChevronDownIcon}
                        size={16}
                        className="shrink-0 text-muted-foreground"
                    />
                </button>
            </DrawerTrigger>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>{title}</DrawerTitle>
                    {description ? (
                        <DrawerDescription>{description}</DrawerDescription>
                    ) : null}
                </DrawerHeader>
                <div className="max-h-[60vh] overflow-y-auto px-2 pb-4">
                    {options.map((opt) => {
                        const active = opt.value === value
                        return (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => {
                                    onChange(opt.value)
                                    setOpen(false)
                                }}
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
                                        {opt.label}
                                    </div>
                                    {opt.sub ? (
                                        <div className="truncate text-xs text-muted-foreground">
                                            {opt.sub}
                                        </div>
                                    ) : null}
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
            </DrawerContent>
        </Drawer>
    )
}
