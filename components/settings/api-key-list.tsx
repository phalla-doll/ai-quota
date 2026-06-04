"use client"

import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Delete01Icon,
    Key01Icon,
    Copy01Icon,
    EyeIcon,
    EyeOffIcon,
    Refresh01Icon,
    CheckmarkCircle01Icon,
    MoreVerticalIcon,
} from "@hugeicons/core-free-icons"
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
    useApiKeys,
    useDeleteApiKey,
    useResetUsageLog,
} from "@/hooks/use-api-keys"
import { validateKey } from "@/lib/zai-client"
import { formatCurrency } from "@/lib/format"
import type { ApiKey } from "@/lib/types"

export function ApiKeyList() {
    const { data: keys } = useApiKeys()

    if (!keys || keys.length === 0) {
        return (
            <Card className="shadow-none py-0">
                <CardContent className="text-muted-foreground px-5 py-6 text-center text-sm">
                    No keys yet. Add your first one above.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="shadow-none py-0">
            <CardContent className="divide-border/60 divide-y px-5 py-2">
                {keys.map((k) => (
                    <KeyRow key={k.id} apiKey={k} />
                ))}
            </CardContent>
        </Card>
    )
}

function KeyRow({ apiKey }: { apiKey: ApiKey }) {
    const [confirmDelete, setConfirmDelete] = React.useState(false)
    const [confirmReset, setConfirmReset] = React.useState(false)
    const [revealed, setRevealed] = React.useState(false)
    const [testing, setTesting] = React.useState(false)
    const del = useDeleteApiKey()
    const reset = useResetUsageLog()

    async function onDelete() {
        await del.mutateAsync(apiKey.id)
        toast.success(`Removed “${apiKey.name}”`)
        setConfirmDelete(false)
    }

    async function onReset() {
        await reset.mutateAsync(apiKey.id)
        toast.success(`Cleared usage for “${apiKey.name}”`)
        setConfirmReset(false)
    }

    async function onCopy() {
        try {
            await navigator.clipboard.writeText(apiKey.key)
            toast.success("Key copied")
        } catch {
            toast.error("Copy failed")
        }
    }

    async function onTest() {
        setTesting(true)
        const r = await validateKey({
            key: apiKey.key,
            endpoint: apiKey.endpoint,
        })
        setTesting(false)
        if (r.ok) toast.success("Key works")
        else toast.error(`Key failed: ${r.error}`)
    }

    return (
        <div className="flex items-center gap-3 py-3">
            <div className="bg-primary/10 text-primary flex h-9 w-9 shrink-0 items-center justify-center rounded-full">
                <HugeiconsIcon icon={Key01Icon} size={18} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">
                        {apiKey.name}
                    </span>
                    <span className="text-muted-foreground bg-muted rounded px-1.5 py-px text-[10px] uppercase">
                        {apiKey.endpoint}
                    </span>
                </div>
                <div className="text-muted-foreground truncate font-mono text-xs">
                    {revealed ? apiKey.key : `•••• ${apiKey.keyLast4}`}
                    {apiKey.monthlyBudgetCents
                        ? ` · ${formatCurrency(apiKey.monthlyBudgetCents)}/mo`
                        : ""}
                </div>
            </div>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        aria-label={`Actions for ${apiKey.name}`}
                    >
                        <HugeiconsIcon icon={MoreVerticalIcon} size={18} />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuItem onSelect={() => setRevealed((v) => !v)}>
                        <HugeiconsIcon
                            icon={revealed ? EyeOffIcon : EyeIcon}
                            size={16}
                        />
                        {revealed ? "Hide key" : "Reveal key"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onCopy}>
                        <HugeiconsIcon icon={Copy01Icon} size={16} />
                        Copy key
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onTest} disabled={testing}>
                        <HugeiconsIcon
                            icon={CheckmarkCircle01Icon}
                            size={16}
                        />
                        {testing ? "Testing..." : "Test key"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => setConfirmReset(true)}>
                        <HugeiconsIcon icon={Refresh01Icon} size={16} />
                        Reset usage log
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onSelect={() => setConfirmDelete(true)}
                        variant="destructive"
                    >
                        <HugeiconsIcon icon={Delete01Icon} size={16} />
                        Remove key
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Drawer open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Remove “{apiKey.name}”?</DrawerTitle>
                        <DrawerDescription>
                            This removes the key and clears its tracked usage.
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

            <Drawer open={confirmReset} onOpenChange={setConfirmReset}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>
                            Reset usage for “{apiKey.name}”?
                        </DrawerTitle>
                        <DrawerDescription>
                            Clears the local event log for this key. The key
                            itself stays.
                        </DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                        <Button
                            variant="destructive"
                            onClick={onReset}
                            disabled={reset.isPending}
                        >
                            {reset.isPending ? "Clearing..." : "Reset"}
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
