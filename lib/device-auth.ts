// Pairing codes and device tokens — the credential path for clients that have
// no Telegram initData (the Windows tray app, future desktop/native widgets).
//
// Two secrets, deliberately different shapes:
//   pairing code  — 8 chars, human-transcribable, single-use, minutes-long TTL
//   device token  — 32 random bytes, machine-stored, long-lived, revocable
//
// A code is short enough to read off a phone screen, so it must not be the
// standing credential; it is exchanged exactly once for a token. Only SHA-256
// hashes are persisted (see migrations/0003_devices.sql).

// Crockford base32 minus the ambiguous glyphs (I, L, O, U) so a transcribed
// code can't be misread. 8 chars over this alphabet is ~41 bits — combined with
// single-use redemption and the short TTL, guessing is not a viable attack.
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"
const CODE_LENGTH = 8

export const PAIRING_CODE_TTL_MS = 10 * 60 * 1000

// Refresh `last_seen_at` at most this often, so a polling desktop client
// doesn't turn every read into a D1 write.
export const DEVICE_SEEN_REFRESH_MS = 5 * 60 * 1000

const encoder = new TextEncoder()

export async function sha256Hex(input: string): Promise<string> {
    const digest = await crypto.subtle.digest("SHA-256", encoder.encode(input))
    return Array.from(new Uint8Array(digest))
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
}

// Rejection sampling keeps the alphabet uniform (256 % 32 === 0 here, so no
// value is ever discarded — the guard stays for safety if ALPHABET changes).
export function generatePairingCode(): string {
    const bytes = new Uint8Array(CODE_LENGTH * 2)
    crypto.getRandomValues(bytes)
    const limit = Math.floor(256 / ALPHABET.length) * ALPHABET.length
    let code = ""
    for (const b of bytes) {
        if (code.length === CODE_LENGTH) break
        if (b >= limit) continue
        code += ALPHABET[b % ALPHABET.length]
    }
    return code
}

// Display form only — the hash is always computed over the normalized code.
export function formatPairingCode(code: string): string {
    return `${code.slice(0, 4)}-${code.slice(4)}`
}

// Accept what a user actually types: lowercase, spaces, dashes, and the glyphs
// the alphabet excludes (O→0, I/L→1) all fold back to the canonical form.
export function normalizePairingCode(input: string): string {
    return input
        .toUpperCase()
        .replace(/[^0-9A-Z]/g, "")
        .replace(/O/g, "0")
        .replace(/[IL]/g, "1")
}

export function generateDeviceToken(): string {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    return btoa(String.fromCharCode(...bytes))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "")
}
