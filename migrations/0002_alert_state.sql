-- Server-side state for the standalone alerts cron worker (../alerts-cron/).
--
-- The cron reads api_keys + user_config, polls Z.ai usage per key, and pushes a
-- Telegram message when a usage threshold is crossed. This table is the dedupe
-- ledger so it fires each threshold at most once per quota window.
--
-- One row per (user, key). `period` identifies the current quota window
-- (Z.ai's nextResetTime); when the window rolls over the period changes and the
-- alerts re-arm. `max_notified` is the highest threshold (50/75/90/95) already
-- announced for that period, so a jump from 0%→95% sends one message, not three.
CREATE TABLE IF NOT EXISTS alert_state (
    tg_user_id   TEXT    NOT NULL,
    key_id       TEXT    NOT NULL,
    period       TEXT    NOT NULL,
    max_notified INTEGER NOT NULL DEFAULT 0,
    notified_at  TEXT    NOT NULL,
    PRIMARY KEY (tg_user_id, key_id)
);
