"use client"

import * as React from "react"
import Link from "next/link"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    ComputerIcon,
    Copy01Icon,
    Delete01Icon,
    Loading03Icon,
    PlusSignIcon,
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
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { useTelegram } from "@/components/providers/telegram-provider"
import { useDeviceSession, useUnlinkBrowser } from "@/hooks/use-auth-credential"
import {
    useDevices,
    usePairingCode,
    useRevokeDevice,
    type PairingCode,
} from "@/hooks/use-devices"
import type { Device } from "@/lib/types"

// "Linked devices" — the Mini App half of device pairing. Generates a code the
// user enters on a client (the Windows tray app, or a browser/PWA at /pair),
// and lists/revokes what's already paired. The client trades that code for a
// bearer token it keeps; see lib/device-auth.ts and app/api/devices/.
//
// Minting and revoking are Telegram-only by design (lib/api-auth.ts), so a
// paired browser can't see this list. It gets BrowserSessionCard instead: what
// this browser is linked as, and a local unlink.

export function LinkedDevices() {
    const { inTelegram } = useTelegram()
    const { data: devices, isLoading } = useDevices()

    if (!inTelegram) {
        return <BrowserSessionCard />
    }

    return (
        <div className="space-y-3">
            <PairDrawer />
            {isLoading ? (
                <Card className="py-0 shadow-none">
                    <CardContent className="px-5 py-2">
                        <div className="flex items-center gap-3 py-3">
                            <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
                            <div className="min-w-0 flex-1 space-y-1.5">
                                <Skeleton className="h-3.5 w-28 rounded-md" />
                                <Skeleton className="h-3 w-36 rounded-md" />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            ) : !devices || devices.length === 0 ? (
                <Card className="py-0 shadow-none">
                    <CardContent className="px-5 py-6 text-center text-sm text-muted-foreground">
                        No devices linked yet.
                    </CardContent>
                </Card>
            ) : (
                <Card className="py-0 shadow-none">
                    <CardContent className="divide-y divide-border/60 px-5 py-2">
                        {devices.map((d) => (
                            <DeviceRow key={d.id} device={d} />
                        ))}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}

function PairDrawer() {
    const [open, setOpen] = React.useState(false)
    const pair = usePairingCode()
    const [issued, setIssued] = React.useState<PairingCode | null>(null)

    async function generate() {
        try {
            setIssued(await pair.mutateAsync())
        } catch {
            // usePairingCode surfaced the failure.
        }
    }

    function onOpenChange(next: boolean) {
        setOpen(next)
        // Codes are single-use and short-lived — never show a stale one.
        if (!next) setIssued(null)
        else if (!issued) void generate()
    }

    async function copy(text: string, label: string) {
        try {
            await navigator.clipboard.writeText(text)
            toast.success(`${label} copied`)
        } catch {
            toast.error("Copy failed")
        }
    }

    // Only ever called from rendered drawer content (i.e. client-side, after the
    // code exists), so reading `location` here needs no SSR guard.
    const installCommand = issued
        ? `$env:AI_QUOTA_CODE="${issued.code}"; irm ${window.location.origin}/install.ps1 | iex`
        : ""
    // Same code, redeemed in a browser instead of PowerShell. Carrying it in
    // the query string means the user only has to move one thing between
    // devices, and /pair still accepts it typed by hand.
    const browserLink = issued
        ? `${window.location.origin}/pair?code=${issued.code}`
        : ""

    return (
        <Drawer open={open} onOpenChange={onOpenChange}>
            <Button
                size="xl"
                className="w-full"
                onClick={() => onOpenChange(true)}
            >
                <HugeiconsIcon icon={PlusSignIcon} size={18} />
                Link a device
            </Button>
            <DrawerContent>
                <DrawerHeader>
                    <DrawerTitle>Pairing code</DrawerTitle>
                    <DrawerDescription>
                        Enter this on the device you&rsquo;re linking. It works
                        once, then expires.
                    </DrawerDescription>
                </DrawerHeader>

                <div className="space-y-3 px-4 pb-2 text-center">
                    {pair.isPending || !issued ? (
                        <Skeleton className="mx-auto h-14 w-56 rounded-2xl" />
                    ) : (
                        <>
                            <div className="font-mono text-4xl font-semibold tracking-[0.2em] tabular-nums">
                                {issued.code}
                            </div>
                            <Countdown expiresAt={issued.expiresAt} />
                        </>
                    )}
                </div>

                {issued ? (
                    <div className="space-y-4 px-4 pt-4 pb-2 text-left">
                        <div>
                            <p className="px-1 pb-1.5 text-xs text-muted-foreground">
                                For a browser or installed web app — open this
                                link there, or type the code at /pair.
                            </p>
                            <CopyRow
                                value={browserLink}
                                label="Link"
                                onCopy={copy}
                            />
                        </div>
                        <div>
                            <p className="px-1 pb-1.5 text-xs text-muted-foreground">
                                For Windows — paste this into PowerShell and it
                                pairs and installs in one go.
                            </p>
                            <CopyRow
                                value={installCommand}
                                label="Install command"
                                onCopy={copy}
                            />
                        </div>
                    </div>
                ) : null}

                <DrawerFooter>
                    <Button
                        size="xl"
                        variant="outline"
                        onClick={() => issued && copy(issued.code, "Code")}
                        disabled={!issued}
                    >
                        <HugeiconsIcon icon={Copy01Icon} size={18} />
                        Copy code
                    </Button>
                    <Button
                        size="xl"
                        variant="ghost"
                        onClick={generate}
                        disabled={pair.isPending}
                    >
                        {pair.isPending ? (
                            <HugeiconsIcon
                                icon={Loading03Icon}
                                size={18}
                                className="animate-spin"
                            />
                        ) : null}
                        New code
                    </Button>
                    <DrawerClose asChild>
                        <Button size="xl" variant="ghost">
                            Done
                        </Button>
                    </DrawerClose>
                </DrawerFooter>
            </DrawerContent>
        </Drawer>
    )
}

function CopyRow({
    value,
    label,
    onCopy,
}: {
    value: string
    label: string
    onCopy: (text: string, label: string) => void
}) {
    return (
        <button
            type="button"
            onClick={() => onCopy(value, label)}
            className="flex w-full items-center gap-2 rounded-2xl border border-input px-4 py-3 text-left"
        >
            <code className="min-w-0 flex-1 truncate font-mono text-xs text-muted-foreground">
                {value}
            </code>
            <HugeiconsIcon
                icon={Copy01Icon}
                size={16}
                className="shrink-0 text-muted-foreground"
            />
        </button>
    )
}

// What this section shows outside Telegram. Unlinking here only forgets the
// token locally — a real revoke needs the Mini App, which is the whole point of
// the credential split, so say so rather than implying the device is gone.
function BrowserSessionCard() {
    const session = useDeviceSession()
    const unlink = useUnlinkBrowser()
    const [confirmUnlink, setConfirmUnlink] = React.useState(false)

    if (!session) {
        return (
            <Card className="py-0 shadow-none">
                <CardContent className="space-y-3 px-5 py-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        This browser isn&rsquo;t linked. Generate a code in
                        Telegram, then enter it here to sync your keys.
                    </p>
                    <Button size="xl" className="w-full" asChild>
                        <Link href="/pair">
                            <HugeiconsIcon icon={PlusSignIcon} size={18} />
                            Link this browser
                        </Link>
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card className="py-0 shadow-none">
            <CardContent className="px-5 py-2">
                <div className="flex items-center gap-3 py-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <HugeiconsIcon icon={ComputerIcon} size={18} />
                    </div>
                    <div className="min-w-0 flex-1">
                        <div className="truncate font-medium">
                            {session.name}
                        </div>
                        <div className="truncate text-xs text-muted-foreground">
                            This browser · linked{" "}
                            {formatRelative(session.pairedAt)}
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground"
                        aria-label="Unlink this browser"
                        onClick={() => setConfirmUnlink(true)}
                    >
                        <HugeiconsIcon icon={Delete01Icon} size={18} />
                    </Button>
                </div>
            </CardContent>

            <Drawer open={confirmUnlink} onOpenChange={setConfirmUnlink}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Unlink this browser?</DrawerTitle>
                        <DrawerDescription>
                            This browser forgets the token and its cached copy
                            of your keys. The device stays listed in Telegram
                            until you revoke it there.
                        </DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                        <Button
                            size="xl"
                            variant="destructive"
                            onClick={() => {
                                unlink()
                                setConfirmUnlink(false)
                                toast.success("Unlinked from this browser")
                            }}
                        >
                            Unlink
                        </Button>
                        <DrawerClose asChild>
                            <Button size="xl" variant="outline">
                                Cancel
                            </Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        </Card>
    )
}

function Countdown({ expiresAt }: { expiresAt: string }) {
    const target = React.useMemo(() => Date.parse(expiresAt), [expiresAt])
    const [now, setNow] = React.useState(() => Date.now())

    React.useEffect(() => {
        const t = setInterval(() => setNow(Date.now()), 1000)
        return () => clearInterval(t)
    }, [])

    const remaining = Math.max(0, target - now)
    if (remaining === 0) {
        return (
            <p className="text-xs text-destructive">
                Expired — tap “New code”.
            </p>
        )
    }
    const total = Math.floor(remaining / 1000)
    const mm = String(Math.floor(total / 60)).padStart(2, "0")
    const ss = String(total % 60).padStart(2, "0")
    return (
        <p className="text-xs text-muted-foreground tabular-nums">
            Expires in {mm}:{ss}
        </p>
    )
}

function DeviceRow({ device }: { device: Device }) {
    const [confirmRevoke, setConfirmRevoke] = React.useState(false)
    const revoke = useRevokeDevice()

    async function onRevoke() {
        try {
            await revoke.mutateAsync(device.id)
            toast.success(`Revoked “${device.name}”`)
            setConfirmRevoke(false)
        } catch {
            // useRevokeDevice surfaced the failure; keep the drawer open.
        }
    }

    return (
        <div className="flex items-center gap-3 py-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HugeiconsIcon icon={ComputerIcon} size={18} />
            </div>
            <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{device.name}</div>
                <div className="truncate text-xs text-muted-foreground">
                    {device.lastSeenAt
                        ? `Last seen ${formatRelative(device.lastSeenAt)}`
                        : "Never used"}
                </div>
            </div>
            <Button
                variant="ghost"
                size="icon"
                className="text-muted-foreground"
                aria-label={`Revoke ${device.name}`}
                onClick={() => setConfirmRevoke(true)}
            >
                <HugeiconsIcon icon={Delete01Icon} size={18} />
            </Button>

            <Drawer open={confirmRevoke} onOpenChange={setConfirmRevoke}>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>Revoke “{device.name}”?</DrawerTitle>
                        <DrawerDescription>
                            It loses access to your keys immediately and has to
                            be paired again.
                        </DrawerDescription>
                    </DrawerHeader>
                    <DrawerFooter>
                        <Button
                            size="xl"
                            variant="destructive"
                            onClick={onRevoke}
                            disabled={revoke.isPending}
                        >
                            {revoke.isPending ? "Revoking..." : "Revoke"}
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

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
]

function formatRelative(iso: string): string {
    const then = Date.parse(iso)
    if (!Number.isFinite(then)) return "unknown"
    const delta = then - Date.now()
    for (const [unit, ms] of UNITS) {
        if (Math.abs(delta) >= ms) {
            return RELATIVE.format(Math.round(delta / ms), unit)
        }
    }
    return "just now"
}
