// Client-side redemption of a pairing code. The Windows installer does this in
// PowerShell (app/install.ps1/route.ts); a browser does it here and keeps the
// result in lib/stores/device-session-store.ts.
//
// /api/devices/claim is the one unauthenticated route in the D1 layer — the
// code itself is the proof — so this needs no credential of its own.

import { normalizePairingCode } from "@/lib/device-auth"
import type { DeviceSession } from "@/lib/stores/device-session-store"

export { normalizePairingCode }

// What the server calls this browser in the linked-devices list. Best-effort
// UA sniffing: a wrong guess is cosmetic, and the user can tell the rows apart
// by "last seen" anyway.
export function describeBrowser(): string {
    if (typeof navigator === "undefined") return "Browser"
    const ua = navigator.userAgent
    const browser = /Edg\//.test(ua)
        ? "Edge"
        : /OPR\//.test(ua)
          ? "Opera"
          : /Firefox\//.test(ua)
            ? "Firefox"
            : /Chrome\//.test(ua)
              ? "Chrome"
              : /Safari\//.test(ua)
                ? "Safari"
                : "Browser"
    const os = /iPhone|iPad|iPod/.test(ua)
        ? "iOS"
        : /Android/.test(ua)
          ? "Android"
          : /Mac OS X/.test(ua)
            ? "macOS"
            : /Windows/.test(ua)
              ? "Windows"
              : /Linux/.test(ua)
                ? "Linux"
                : null

    // An installed PWA is worth distinguishing from a tab — it is the case this
    // whole path exists for, and it survives on the home screen.
    let installed = false
    try {
        installed = window.matchMedia("(display-mode: standalone)").matches
    } catch {
        installed = false
    }

    const base = os ? `${browser} on ${os}` : browser
    return installed ? `${base} (installed)` : base
}

export class PairingError extends Error {}

export async function claimPairingCode(
    code: string,
    name: string
): Promise<DeviceSession> {
    const normalized = normalizePairingCode(code)
    if (!normalized) throw new PairingError("Enter the 8-character code.")

    let res: Response
    try {
        res = await fetch("/api/devices/claim", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ code: normalized, name }),
        })
    } catch {
        throw new PairingError("Couldn't reach the server. Check your network.")
    }

    const data = (await res.json().catch(() => null)) as {
        token?: string
        deviceId?: string
        name?: string
        error?: string
    } | null

    if (!res.ok || !data?.token || !data.deviceId) {
        // The claim route's own wording ("invalid code" / "code already used" /
        // "code expired") is already the right thing to show the user.
        throw new PairingError(data?.error ?? `Pairing failed (${res.status})`)
    }

    return {
        token: data.token,
        deviceId: data.deviceId,
        name: data.name ?? name,
        pairedAt: new Date().toISOString(),
    }
}
