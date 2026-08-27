// The two credentials the D1 layer accepts, as one client-side type.
//
// Server side these resolve to the same identity (see lib/api-auth.ts): a
// validated Telegram initData blob, or a device token minted by pairing. The
// client had only ever spoken the first, which is why the app was inert outside
// Telegram; this union is what lets a plain browser (or an installed PWA) hold
// the second and talk to the same routes.
//
// Telegram wins whenever both are present — it is the root of trust every
// device token descends from, and it is the only credential the device
// management routes accept at all.

export type AuthCredential =
    | { kind: "telegram"; initDataRaw: string }
    | { kind: "device"; token: string }

const INIT_DATA_HEADER = "x-telegram-init-data"

export function credentialHeaders(
    cred: AuthCredential,
    extra?: Record<string, string>
): Record<string, string> {
    const auth: Record<string, string> =
        cred.kind === "telegram"
            ? { [INIT_DATA_HEADER]: cred.initDataRaw }
            : { authorization: `Bearer ${cred.token}` }
    return { ...auth, ...extra }
}

// Stable marker for React Query keys. It must change when the credential
// resolves (both are null on first paint) so queries seeded from the local
// cache re-run against the server instead of sticking on the offline result.
// Deliberately not the secret itself — query keys end up in devtools.
export function credentialMarker(cred: AuthCredential | null): string {
    if (!cred) return "local"
    return cred.kind === "telegram" ? "tg" : "device"
}

// User-facing name for where the keys sync to, so copy can stay accurate for
// both credentials without every call site branching.
export function credentialLabel(cred: AuthCredential | null): string {
    if (!cred) return "this device"
    return cred.kind === "telegram" ? "your Telegram account" : "your account"
}
