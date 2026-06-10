"use client"

import * as React from "react"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    Delete01Icon,
    Key01Icon,
    Copy01Icon,
    Edit02Icon,
    EyeIcon,
    EyeOffIcon,
    CheckmarkCircle01Icon,
    MoreVerticalIcon,
    Tick01Icon,
    Loading03Icon,
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import {
    useApiKeys,
    useDeleteApiKey,
    useRenameApiKey,
} from "@/hooks/use-api-keys"
import { validateKey } from "@/lib/zai-client"
import type { ApiKey } from "@/lib/types"

export function ApiKeyList() {
    const { data: keys, isLoading } = useApiKeys()

    if (isLoading) {
        return (
            <Card className="py-0 shadow-none">
                <CardContent className="divide-y divide-border/60 px-5 py-2">
                    {Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 py-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                                <HugeiconsIcon icon={Key01Icon} size={18} />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <Skeleton className="h-3.5 w-32 rounded-md" />
                                <Skeleton className="h-3 w-40 rounded-md" />
                            </div>
                            <Skeleton className="h-8 w-8 rounded-full" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        )
    }

    if (!keys || keys.length === 0) {
        return (
            <Card className="py-0 shadow-none">
                <CardContent className="px-5 py-6 text-center text-sm text-muted-foreground">
                    No keys yet. Add your first one above.
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="py-0 shadow-none">
            <CardContent className="divide-y divide-border/60 px-5 py-2">
                {keys.map((k) => (
                    <KeyRow key={k.id} apiKey={k} />
                ))}
            </CardContent>
        </Card>
    )
}

function KeyRow({ apiKey }: { apiKey: ApiKey }) {
    const [confirmDelete, setConfirmDelete] = React.useState(false)
    const [renameOpen, setRenameOpen] = React.useState(false)
    const [renameValue, setRenameValue] = React.useState(apiKey.name)
    const [revealed, setRevealed] = React.useState(false)
    const [testing, setTesting] = React.useState(false)
    const del = useDeleteApiKey()
    const rename = useRenameApiKey()

    function openRename() {
        setRenameValue(apiKey.name)
        setRenameOpen(true)
    }

    async function onRename(e: React.FormEvent) {
        e.preventDefault()
        const next = renameValue.trim()
        if (!next) {
            toast.error("Name can't be empty")
            return
        }
        if (next === apiKey.name) {
            setRenameOpen(false)
            return
        }
        await rename.mutateAsync({ id: apiKey.id, name: next })
        toast.success(`Renamed to “${next}”`)
        setRenameOpen(false)
    }

    async function onDelete() {
        await del.mutateAsync(apiKey.id)
        toast.success(`Removed “${apiKey.name}”`)
        setConfirmDelete(false)
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
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HugeiconsIcon icon={Key01Icon} size={18} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                    <span className="truncate font-medium">{apiKey.name}</span>
                    <span className="rounded bg-muted px-1.5 py-px text-[10px] text-muted-foreground uppercase">
                        {apiKey.endpoint}
                    </span>
                </div>
                <div className="truncate font-mono text-xs text-muted-foreground">
                    {revealed ? apiKey.key : `•••• ${apiKey.keyLast4}`}
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
                    <DropdownMenuItem onSelect={openRename}>
                        <HugeiconsIcon icon={Edit02Icon} size={16} />
                        Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={onTest} disabled={testing}>
                        <HugeiconsIcon icon={CheckmarkCircle01Icon} size={16} />
                        {testing ? "Testing..." : "Test key"}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        onSelect={() => setConfirmDelete(true)}
                        variant="destructive"
                    >
                        <HugeiconsIcon icon={Delete01Icon} size={16} />
                        Remove key
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>

            <Drawer open={renameOpen} onOpenChange={setRenameOpen}>
                <DrawerContent>
                    <form onSubmit={onRename}>
                        <DrawerHeader className="relative">
                            <DrawerTitle>Rename key</DrawerTitle>
                            <DrawerDescription>
                                Give this key a new display name. Only stored in
                                this browser.
                            </DrawerDescription>
                            <Button
                                type="submit"
                                size="icon-lg"
                                disabled={rename.isPending}
                                aria-label={
                                    rename.isPending ? "Saving" : "Save"
                                }
                                className="absolute top-1/2 right-3 -translate-y-1/2 rounded-full"
                            >
                                <HugeiconsIcon
                                    icon={
                                        rename.isPending
                                            ? Loading03Icon
                                            : Tick01Icon
                                    }
                                    size={18}
                                    className={
                                        rename.isPending ? "animate-spin" : ""
                                    }
                                />
                            </Button>
                        </DrawerHeader>
                        <div className="space-y-1.5 px-4 pb-6">
                            <Label htmlFor={`rename-${apiKey.id}`}>Name</Label>
                            <Input
                                id={`rename-${apiKey.id}`}
                                value={renameValue}
                                onChange={(e) => setRenameValue(e.target.value)}
                                autoComplete="off"
                                autoFocus
                                className="h-12 px-4 text-base md:text-base"
                            />
                        </div>
                    </form>
                </DrawerContent>
            </Drawer>

            <Drawer open={confirmDelete} onOpenChange={setConfirmDelete}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Remove “{apiKey.name}”?</DrawerTitle>
                        <DrawerDescription>
                            This removes the key from this browser.
                        </DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                        <Button
                            size="xl"
                            variant="destructive"
                            onClick={onDelete}
                            disabled={del.isPending}
                        >
                            {del.isPending ? "Removing..." : "Remove"}
                        </Button>
                        <DrawerClose asChild>
                            <Button size="xl" variant="outline">
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </div>
    )
}
