"use client"

import { HugeiconsIcon } from "@hugeicons/react"
import { ChevronDownIcon } from "@hugeicons/core-free-icons"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"

type Option<T extends string> = { value: T; label: string }

export function RangeDropdown<T extends string>({
    value,
    options,
    onChange,
}: {
    value: T
    options: readonly Option<T>[]
    onChange: (v: T) => void
}) {
    const current = options.find((o) => o.value === value)?.label ?? ""
    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="secondary"
                    size="sm"
                    className="gap-1 rounded-full"
                >
                    {current}
                    <HugeiconsIcon icon={ChevronDownIcon} size={14} />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {options.map((o) => (
                    <DropdownMenuItem
                        key={o.value}
                        onClick={() => onChange(o.value)}
                    >
                        {o.label}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
