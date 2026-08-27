"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { toast } from "sonner"
import { HugeiconsIcon } from "@hugeicons/react"
import {
    ArrowRight01Icon,
    CheckmarkCircle02Icon,
    Loading03Icon,
} from "@hugeicons/core-free-icons"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { AppLogo } from "@/components/brand/app-logo"
import { useDeviceSessionStore } from "@/lib/stores/device-session-store"
import { useDeviceSession, useUnlinkBrowser } from "@/hooks/use-auth-credential"
import {
    claimPairingCode,
    describeBrowser,
    normalizePairingCode,
    PairingError,
} from "@/lib/device-pairing"
import { formatPairingCode } from "@/lib/device-auth"

const CODE_LENGTH = 8

// Show the code the way the Mini App does (XXXX-XXXX) while the user types,
// but only once there is a second group to separate.
function display(normalized: string): string {
    return normalized.length > 4 ? formatPairingCode(normalized) : normalized
}

export function PairScreen() {
    const router = useRouter()
    const params = useSearchParams()
    const session = useDeviceSession()
    const setSession = useDeviceSessionStore((s) => s.setSession)
    const unlink = useUnlinkBrowser()

    const [code, setCode] = React.useState(() =>
        normalizePairingCode(params.get("code") ?? "").slice(0, CODE_LENGTH)
    )
    const [pending, setPending] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const complete = code.length === CODE_LENGTH

    async function submit(event?: React.FormEvent) {
        event?.preventDefault()
        if (pending || !complete) return
        setPending(true)
        setError(null)
        try {
            const claimed = await claimPairingCode(code, describeBrowser())
            setSession(claimed)
            toast.success("Browser linked", {
                description: "Your keys are syncing to this browser now.",
            })
            router.replace("/")
        } catch (err) {
            setError(
                err instanceof PairingError
                    ? err.message
                    : "Pairing failed. Generate a new code and try again."
            )
            setPending(false)
        }
    }

    if (session) {
        return (
            <div className="flex min-h-svh flex-col px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
                <div className="flex flex-1 flex-col items-center justify-center text-center">
                    <div className="flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                        <HugeiconsIcon icon={CheckmarkCircle02Icon} size={28} />
                    </div>
                    <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                        This browser is linked
                    </h1>
                    <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                        Linked as{" "}
                        <span className="font-medium text-foreground">
                            {session.name}
                        </span>
                        . It uses the same keys as your Telegram account.
                    </p>
                </div>

                <div className="mt-6 space-y-2">
                    <Button
                        size="xl"
                        className="w-full"
                        onClick={() => router.replace("/")}
                    >
                        Open dashboard
                        <HugeiconsIcon icon={ArrowRight01Icon} size={18} />
                    </Button>
                    <Button
                        size="xl"
                        variant="ghost"
                        className="w-full text-muted-foreground"
                        onClick={() => {
                            unlink()
                            toast.success("Unlinked from this browser")
                        }}
                    >
                        Unlink this browser
                    </Button>
                </div>
            </div>
        )
    }

    return (
        <div className="flex min-h-svh flex-col px-6 pt-[max(env(safe-area-inset-top),2.5rem)] pb-[max(env(safe-area-inset-bottom),1.5rem)]">
            <div className="flex flex-1 flex-col items-center justify-center text-center">
                <AppLogo size={72} className="size-18" />

                <h1 className="mt-5 text-2xl font-semibold tracking-tight">
                    Link this browser
                </h1>
                <p className="mt-2 max-w-xs text-sm text-muted-foreground">
                    In Telegram, open{" "}
                    <span className="font-medium text-foreground">
                        Settings › Linked devices › Link a device
                    </span>{" "}
                    and enter the code here.
                </p>

                <form onSubmit={submit} className="mt-8 w-full space-y-3">
                    <Input
                        value={display(code)}
                        onChange={(e) =>
                            setCode(
                                normalizePairingCode(e.target.value).slice(
                                    0,
                                    CODE_LENGTH
                                )
                            )
                        }
                        // The code alphabet excludes I/L/O/U and
                        // normalizePairingCode folds the look-alikes, so
                        // autocorrect and autocapitalize only get in the way.
                        autoCapitalize="characters"
                        autoCorrect="off"
                        autoComplete="one-time-code"
                        spellCheck={false}
                        inputMode="text"
                        enterKeyHint="go"
                        aria-label="Pairing code"
                        aria-invalid={error ? true : undefined}
                        placeholder="XXXX-XXXX"
                        className="h-14 text-center font-mono text-2xl tracking-[0.2em] tabular-nums"
                    />
                    {error ? (
                        <p className="text-xs text-destructive">{error}</p>
                    ) : (
                        <p className="text-xs text-muted-foreground">
                            Codes work once and expire after 10 minutes.
                        </p>
                    )}
                    <Button
                        type="submit"
                        size="xl"
                        className="w-full"
                        disabled={!complete || pending}
                    >
                        {pending ? (
                            <HugeiconsIcon
                                icon={Loading03Icon}
                                size={18}
                                className="animate-spin"
                            />
                        ) : null}
                        {pending ? "Linking..." : "Link browser"}
                    </Button>
                </form>
            </div>

            <p className="mt-6 text-center text-[11px] text-muted-foreground">
                This browser gets read and write access to your keys until you
                revoke it from Telegram.
            </p>
        </div>
    )
}
