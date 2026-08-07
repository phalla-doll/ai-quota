-- Device pairing: lets a non-Telegram client (the Windows tray app) act as the
-- same user as the Mini App.
--
-- Flow: the Mini App mints a short pairing code (Telegram-authenticated), the
-- user types it into the desktop client, and the client exchanges it once for a
-- long-lived bearer token. The code is short enough to read off a phone screen,
-- so it is single-use and expires in minutes; the token is the real credential
-- and is revocable per device. See lib/device-auth.ts + app/api/devices/.
--
-- Only hashes are stored — the plaintext code and token exist client-side only.

CREATE TABLE IF NOT EXISTS pairing_codes (
    code_hash  TEXT PRIMARY KEY,       -- sha256(normalized code)
    tg_user_id TEXT    NOT NULL,
    expires_at TEXT    NOT NULL,
    claimed_at TEXT,                   -- non-null once redeemed; never reusable
    created_at TEXT    NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_pairing_codes_user ON pairing_codes (tg_user_id);

CREATE TABLE IF NOT EXISTS devices (
    id           TEXT PRIMARY KEY,     -- opaque id, safe to show the client
    tg_user_id   TEXT    NOT NULL,
    name         TEXT    NOT NULL,
    token_hash   TEXT    NOT NULL UNIQUE,  -- sha256(bearer token)
    created_at   TEXT    NOT NULL,
    last_seen_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_devices_user ON devices (tg_user_id);
