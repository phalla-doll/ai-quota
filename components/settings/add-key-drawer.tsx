"use client"

import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { PlusSignIcon } from "@hugeicons/core-free-icons"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
    DrawerTrigger,
} from "@/components/ui/drawer"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAddApiKey } from "@/hooks/use-api-keys"
import { validateKey } from "@/lib/zai-client"
import type { ZaiEndpoint } from "@/lib/types"
import { cn } from "@/lib/utils"

type AddKeyDrawerProps = {
    open?: boolean
    onOpenChange?: (open: boolean) => void
    showTrigger?: boolean
}

export function AddKeyDrawer({
    open: openProp,
    onOpenChange,
    showTrigger = true,
}: AddKeyDrawerProps = {}) {
    const [internalOpen, setInternalOpen] = React.useState(false)
    const isControlled = openProp !== undefined
    const open = isControlled ? openProp : internalOpen
    const setOpen = React.useCallback(
        (next: boolean) => {
            if (!isControlled) setInternalOpen(next)
            onOpenChange?.(next)
        },
        [isControlled, onOpenChange]
    )
    const [name, setName] = React.useState("")
    const [apiKey, setApiKey] = React.useState("")
    const [endpoint, setEndpoint] = React.useState<ZaiEndpoint>("paas")
    const [validating, setValidating] = React.useState(false)
    const add = useAddApiKey()

    function reset() {
        setName("")
        setApiKey("")
        setEndpoint("paas")
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || !apiKey.trim()) {
            toast.error("Name and API key are required")
            return
        }
        setValidating(true)
        const check = await validateKey({ key: apiKey.trim(), endpoint })
        setValidating(false)
        if (!check.ok) {
            toast.error(`Key rejected: ${check.error}`)
            return
        }
        await add.mutateAsync({
            name: name.trim(),
            apiKey: apiKey.trim(),
            endpoint,
            monthlyBudgetCents: null,
        })
        toast.success(`Added “${name.trim()}”`)
        reset()
        setOpen(false)
    }

    const busy = validating || add.isPending

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            {showTrigger ? (
                <DrawerTrigger asChild>
                    <Button size="xl" className="w-full">
                        <HugeiconsIcon icon={PlusSignIcon} size={18} />
                        Add API key
                    </Button>
                </DrawerTrigger>
            ) : null}
            <DrawerContent>
                <form onSubmit={onSubmit}>
                    <DrawerHeader>
                        <DrawerTitle>New API key</DrawerTitle>
                        <DrawerDescription>
                            Stored in this browser only. We validate against
                            Z.ai before saving.
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="space-y-4 px-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="key-name">Name</Label>
                            <Input
                                id="key-name"
                                placeholder="Production"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="off"
                                className="h-12 px-4 text-base md:text-base"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="key-secret">Z.ai API key</Label>
                            <Input
                                id="key-secret"
                                type="password"
                                placeholder="paste your key"
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                autoComplete="off"
                                inputMode="text"
                                className="h-12 px-4 text-base md:text-base"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Endpoint</Label>
                            <RadioGroup
                                value={endpoint}
                                onValueChange={(v) =>
                                    setEndpoint(v as ZaiEndpoint)
                                }
                                className="grid grid-cols-2 gap-2"
                            >
                                <EndpointOption
                                    value="paas"
                                    label="Standard API"
                                    active={endpoint === "paas"}
                                />
                                <EndpointOption
                                    value="coding"
                                    label="Coding Plan"
                                    active={endpoint === "coding"}
                                />
                            </RadioGroup>
                        </div>
                    </div>

                    <DrawerFooter className="pt-6">
                        <Button size="xl" type="submit" disabled={busy}>
                            {validating
                                ? "Validating..."
                                : add.isPending
                                  ? "Saving..."
                                  : "Validate & save"}
                        </Button>
                        <DrawerClose asChild>
                            <Button size="xl" type="button" variant="outline">
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    )
}

function EndpointOption({
    value,
    label,
    active,
}: {
    value: ZaiEndpoint
    label: string
    active: boolean
}) {
    const id = `endpoint-${value}`
    return (
        <Label
            htmlFor={id}
            className={cn(
                "flex cursor-pointer flex-col items-start gap-1 rounded-2xl border bg-transparent px-4 py-3 text-left font-normal transition-colors",
                active
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted/50"
            )}
        >
            <span className="sr-only">
                <RadioGroupItem id={id} value={value} />
            </span>
            <span className="text-sm font-medium leading-none">{label}</span>
        </Label>
    )
}
