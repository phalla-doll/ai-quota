// Server-side validation of Telegram Mini App initData.
//
// initData is the raw, URL-encoded query string Telegram hands the Mini App
// (exposed client-side as `initDataRaw`). We verify its HMAC signature against
// the bot token so the server can trust the embedded user id. The client never
// asserts its own identity — it only forwards this signed blob.
//
// Algorithm (https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app):
//   secret_key = HMAC_SHA256(key="WebAppData", message=bot_token)
//   data_check_string = "\n"-joined sorted "key=value" pairs, excluding `hash`
//   expected_hash = HMAC_SHA256(key=secret_key, message=data_check_string)
//   valid iff expected_hash === hash

export type TelegramAuthUser = {
    id: string
    firstName?: string
    lastName?: string
    username?: string
}

export type TelegramAuthResult =
    | { ok: true; user: TelegramAuthUser; authDate: number }
    | { ok: false; reason: string }

// Reject initData older than this. Telegram's hash is fixed per launch, so a
// long-lived tab could exceed a tight window; 0 disables the check.
const MAX_AGE_SECONDS = 0

const encoder = new TextEncoder()

async function hmacSha256(key: ArrayBuffer | Uint8Array, message: string) {
    const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key as BufferSource,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
    )
    const sig = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        encoder.encode(message)
    )
    return new Uint8Array(sig)
}

function toHex(bytes: Uint8Array) {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, "0"))
        .join("")
}

// Constant-time-ish hex comparison.
function timingSafeEqual(a: string, b: string) {
    if (a.length !== b.length) return false
    let diff = 0
    for (let i = 0; i < a.length; i++) {
        diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return diff === 0
}

export async function validateInitData(
    initDataRaw: string,
    botToken: string
): Promise<TelegramAuthResult> {
    if (!initDataRaw) return { ok: false, reason: "missing initData" }
    if (!botToken) return { ok: false, reason: "server missing bot token" }

    const params = new URLSearchParams(initDataRaw)
    const hash = params.get("hash")
    if (!hash) return { ok: false, reason: "missing hash" }

    const pairs: string[] = []
    for (const [key, value] of params) {
        if (key === "hash") continue
        pairs.push(`${key}=${value}`)
    }
    pairs.sort()
    const dataCheckString = pairs.join("\n")

    // secret_key = HMAC_SHA256(key="WebAppData", message=bot_token)
    const secretKey = await hmacSha256(encoder.encode("WebAppData"), botToken)
    const expected = toHex(await hmacSha256(secretKey, dataCheckString))

    if (!timingSafeEqual(expected, hash)) {
        return { ok: false, reason: "bad signature" }
    }

    const authDate = Number(params.get("auth_date") ?? 0)
    if (MAX_AGE_SECONDS > 0) {
        const ageMs = Date.now() - authDate * 1000
        if (ageMs > MAX_AGE_SECONDS * 1000) {
            return { ok: false, reason: "initData expired" }
        }
    }

    const userRaw = params.get("user")
    if (!userRaw) return { ok: false, reason: "missing user" }

    let parsed: {
        id?: number
        first_name?: string
        last_name?: string
        username?: string
    }
    try {
        parsed = JSON.parse(userRaw)
    } catch {
        return { ok: false, reason: "unparseable user" }
    }
    if (parsed.id == null) return { ok: false, reason: "user has no id" }

    return {
        ok: true,
        authDate,
        user: {
            id: String(parsed.id),
            firstName: parsed.first_name,
            lastName: parsed.last_name,
            username: parsed.username,
        },
    }
}
