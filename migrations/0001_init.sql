-- Per-user storage for ai-quota.
-- Rows are scoped to a Telegram user id (tg_user_id), established by
-- server-side initData HMAC validation. The client never sets this.

CREATE TABLE IF NOT EXISTS api_keys (
    tg_user_id     TEXT    NOT NULL,
    id             TEXT    NOT NULL,
    name           TEXT    NOT NULL,
    provider       TEXT    NOT NULL DEFAULT 'zai',
    endpoint       TEXT    NOT NULL,
    key            TEXT    NOT NULL,
    key_last4      TEXT    NOT NULL,
    created_at     TEXT    NOT NULL,
    last_synced_at TEXT,
    updated_at     TEXT    NOT NULL,
    PRIMARY KEY (tg_user_id, id)
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys (tg_user_id);

-- Free-form per-user config blob (ui-store / alerts-store settings).
-- One row per user; value is a JSON string the client owns.
CREATE TABLE IF NOT EXISTS user_config (
    tg_user_id TEXT NOT NULL,
    namespace  TEXT NOT NULL,
    value      TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (tg_user_id, namespace)
);
