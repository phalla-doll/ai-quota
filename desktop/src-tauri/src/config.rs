use serde::Deserialize;
use std::path::PathBuf;

/// Credentials written by the installer (`/install.ps1` in the Next app), which
/// redeems the pairing code and drops the resulting device token here. The tray
/// never performs the exchange itself — by the time it runs, it is either paired
/// or it has nothing to show.
#[derive(Debug, Clone, Deserialize)]
pub struct Config {
    #[serde(rename = "apiBase")]
    pub api_base: String,
    pub token: String,
    #[allow(dead_code)]
    pub name: Option<String>,
}

/// `%APPDATA%\ai-quota\config.json` on Windows. The fallbacks only exist so the
/// app can be run on a dev machine — the shipped target is Windows.
pub fn config_path() -> Option<PathBuf> {
    let dir = if cfg!(windows) {
        PathBuf::from(std::env::var_os("APPDATA")?)
    } else {
        let home = PathBuf::from(std::env::var_os("HOME")?);
        if cfg!(target_os = "macos") {
            home.join("Library").join("Application Support")
        } else {
            std::env::var_os("XDG_CONFIG_HOME")
                .map(PathBuf::from)
                .unwrap_or_else(|| home.join(".config"))
        }
    };
    Some(dir.join("ai-quota").join("config.json"))
}

pub fn load() -> Option<Config> {
    let raw = std::fs::read_to_string(config_path()?).ok()?;
    let cfg: Config = serde_json::from_str(&raw).ok()?;
    if cfg.api_base.is_empty() || cfg.token.is_empty() {
        return None;
    }
    Some(cfg)
}
