use serde::{Deserialize, Serialize};

use crate::config::Config;

/// Mirrors `KeySummary` in app/api/summary/route.ts. `used_pct` is null for a
/// key with no readable quota, which the UI shows as a dash rather than 0%.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct KeySummary {
    pub id: String,
    pub name: String,
    #[serde(rename = "usedPct")]
    pub used_pct: Option<f64>,
    #[serde(rename = "resetAt")]
    pub reset_at: Option<String>,
    pub state: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Summary {
    pub keys: Vec<KeySummary>,
    #[serde(rename = "worstPct")]
    pub worst_pct: Option<f64>,
    #[serde(rename = "fetchedAt")]
    pub fetched_at: String,
}

/// What the popover renders: either a summary, or why there isn't one. Kept as
/// one serializable enum so the UI has a single source of truth for its state
/// instead of guessing from a null.
#[derive(Debug, Clone, Serialize)]
#[serde(tag = "status", rename_all = "camelCase")]
pub enum TrayState {
    Unpaired,
    Loading,
    Ready(Summary),
    Error { message: String },
}

pub async fn fetch_summary(cfg: &Config) -> Result<Summary, String> {
    let url = format!("{}/api/summary", cfg.api_base.trim_end_matches('/'));
    let res = reqwest::Client::new()
        .get(url)
        .bearer_auth(&cfg.token)
        .send()
        .await
        .map_err(|e| format!("network error: {e}"))?;

    if res.status() == reqwest::StatusCode::UNAUTHORIZED {
        // The device was revoked from Settings, or the token was rotated. Say so
        // plainly — retrying will never fix it, re-pairing will.
        return Err("This device was unlinked. Pair it again from Telegram.".into());
    }
    if !res.status().is_success() {
        return Err(format!("server returned {}", res.status()));
    }

    res.json::<Summary>()
        .await
        .map_err(|e| format!("unexpected response: {e}"))
}
