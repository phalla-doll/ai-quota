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

export function AddKeyDrawer() {
    const [open, setOpen] = React.useState(false)
    const [name, setName] = React.useState("")
    const [apiKey, setApiKey] = React.useState("")
    const [budget, setBudget] = React.useState("")
    const add = useAddApiKey()

    function reset() {
        setName("")
        setApiKey("")
        setBudget("")
    }

    async function onSubmit(e: React.FormEvent) {
        e.preventDefault()
        if (!name.trim() || !apiKey.trim()) {
            toast.error("Name and API key are required")
            return
        }
        const budgetNum = budget ? Number(budget) : 0
        await add.mutateAsync({
            name: name.trim(),
            apiKey: apiKey.trim(),
            monthlyBudgetCents:
                budgetNum > 0 ? Math.round(budgetNum * 100) : null,
        })
        toast.success(`Added “${name.trim()}”`)
        reset()
        setOpen(false)
    }

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
                            Stored encrypted. We only show the last 4
                            characters after saving.
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
                            <Label htmlFor="key-secret">Z AI API key</Label>
                            <Input
                                id="key-secret"
                                type="password"
                                placeholder="sk-..."
                                value={apiKey}
                                onChange={(e) => setApiKey(e.target.value)}
                                autoComplete="off"
                                inputMode="text"
                            />
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
                        <Button type="submit" disabled={add.isPending}>
                            {add.isPending ? "Saving..." : "Save key"}
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
