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
import { useAddApiKey } from "@/hooks/use-api-keys"
import { validateKey } from "@/lib/zai-client"
import type { ZaiEndpoint } from "@/lib/types"
import { cn } from "@/lib/utils"

export function AddKeyDrawer() {
    const [open, setOpen] = React.useState(false)
    const [name, setName] = React.useState("")
    const [apiKey, setApiKey] = React.useState("")
    const [budget, setBudget] = React.useState("")
    const [endpoint, setEndpoint] = React.useState<ZaiEndpoint>("paas")
    const [validating, setValidating] = React.useState(false)
    const add = useAddApiKey()

    function reset() {
        setName("")
        setApiKey("")
        setBudget("")
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
        const budgetNum = budget ? Number(budget) : 0
        await add.mutateAsync({
            name: name.trim(),
            apiKey: apiKey.trim(),
            endpoint,
            monthlyBudgetCents:
                budgetNum > 0 ? Math.round(budgetNum * 100) : null,
        })
        toast.success(`Added “${name.trim()}”`)
        reset()
        setOpen(false)
    }

    const busy = validating || add.isPending

    return (
        <Drawer open={open} onOpenChange={setOpen}>
            <DrawerTrigger asChild>
                <Button className="h-12 w-full gap-2 rounded-full text-base">
                    <HugeiconsIcon icon={PlusSignIcon} size={18} />
                    Add API key
                </Button>
            </DrawerTrigger>
            <DrawerContent>
                <form onSubmit={onSubmit}>
                    <DrawerHeader>
                        <DrawerTitle>New API key</DrawerTitle>
                        <DrawerDescription>
                            Stored in this browser only. We validate against
                            Z.ai before saving.
                        </DrawerDescription>
                    </DrawerHeader>

                    <div className="space-y-3 px-4">
                        <div className="space-y-1.5">
                            <Label htmlFor="key-name">Name</Label>
                            <Input
                                id="key-name"
                                placeholder="Production"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                autoComplete="off"
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
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>Endpoint</Label>
                            <div className="grid grid-cols-2 gap-2">
                                <EndpointPill
                                    label="Standard API"
                                    sub="/api/paas/v4"
                                    active={endpoint === "paas"}
                                    onClick={() => setEndpoint("paas")}
                                />
                                <EndpointPill
                                    label="Coding Plan"
                                    sub="/api/coding/paas/v4"
                                    active={endpoint === "coding"}
                                    onClick={() => setEndpoint("coding")}
                                />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <Label htmlFor="key-budget">
                                Monthly budget (USD, optional)
                            </Label>
                            <Input
                                id="key-budget"
                                type="number"
                                inputMode="decimal"
                                placeholder="50.00"
                                value={budget}
                                onChange={(e) => setBudget(e.target.value)}
                            />
                        </div>
                    </div>

                    <DrawerFooter>
                        <Button type="submit" disabled={busy}>
                            {validating
                                ? "Validating..."
                                : add.isPending
                                  ? "Saving..."
                                  : "Validate & save"}
                        </Button>
                        <DrawerClose asChild>
                            <Button type="button" variant="outline">
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </form>
            </DrawerContent>
        </Drawer>
    )
}

function EndpointPill({
    label,
    sub,
    active,
    onClick,
}: {
    label: string
    sub: string
    active: boolean
    onClick: () => void
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                "flex flex-col items-start rounded-lg border px-3 py-2 text-left transition-colors",
                active
                    ? "border-primary bg-primary/5"
                    : "border-input hover:bg-muted/50"
            )}
        >
            <span className="text-sm font-medium">{label}</span>
            <span className="text-muted-foreground font-mono text-[10px]">
                {sub}
            </span>
        </button>
    )
}
