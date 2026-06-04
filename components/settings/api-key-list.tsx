"use client"

import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import { Delete01Icon, Key01Icon } from "@hugeicons/core-free-icons"
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
import { Card, CardContent } from "@/components/ui/card"
import { useApiKeys, useDeleteApiKey } from "@/hooks/use-api-keys"
import { formatCurrency } from "@/lib/format"
import type { ApiKey } from "@/lib/types"

export function ApiKeyList() {
    const { data: keys } = useApiKeys()

    if (!keys || keys.length === 0) {
        return (
            <Card className="shadow-none">
                <CardContent className="text-muted-foreground px-5 py-6 text-center text-sm">
                    No keys yet. Add your first one above.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="shadow-none">
            <CardContent className="divide-border/60 divide-y px-5 py-2">
                {keys.map((k) => (
                    <KeyRow key={k.id} apiKey={k} />
                ))}
            </CardContent>
        </Card>
    )
}

function KeyRow({ apiKey }: { apiKey: ApiKey }) {
    const [open, setOpen] = React.useState(false)
    const del = useDeleteApiKey()

    async function onDelete() {
        await del.mutateAsync(apiKey.id)
        toast.success(`Removed “${apiKey.name}”`)
        setOpen(false)
    }

    return (
        <div className="flex items-center gap-3 py-3">
                <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                    <HugeiconsIcon icon={Key01Icon} size={18} />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{apiKey.name}</div>
                    <div className="text-muted-foreground truncate text-xs">
                        •••• {apiKey.keyLast4}
                        {apiKey.monthlyBudgetCents
                            ? ` · ${formatCurrency(apiKey.monthlyBudgetCents)} / mo`
                            : ""}
                    </div>
                </div>
                <Drawer open={open} onOpenChange={setOpen}>
                    <DrawerTrigger asChild>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="text-muted-foreground hover:text-destructive"
                            aria-label={`Delete ${apiKey.name}`}
                        >
                            <HugeiconsIcon icon={Delete01Icon} size={18} />
                        </Button>
                    </DrawerTrigger>
                    <DrawerContent>
                        <DrawerHeader>
                            <DrawerTitle>Remove “{apiKey.name}”?</DrawerTitle>
                            <DrawerDescription>
                                This removes the key and its tracking history.
                                You can add it back later.
                            </DrawerDescription>
                        </DrawerHeader>
                        <DrawerFooter>
                            <Button
                                variant="destructive"
                                onClick={onDelete}
                                disabled={del.isPending}
                            >
                                {del.isPending ? "Removing..." : "Remove"}
                            </Button>
                            <DrawerClose asChild>
                                <Button variant="outline">Cancel</Button>
                            </DrawerClose>
                        </DrawerFooter>
                    </DrawerContent>
                </Drawer>
        </div>
    )
}
