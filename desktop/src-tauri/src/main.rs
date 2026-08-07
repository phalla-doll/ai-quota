// Windows tray client for the Z.ai quota dashboard.
//
// It is deliberately thin: the pairing already happened in the installer (see
// /install.ps1 in the Next app), so this process only reads the device token
// from %APPDATA%\ai-quota\config.json, polls /api/summary, paints the number
// into the tray icon, and shows a small popover on click.
//
// The popover renders locally from the same /api/summary payload rather than
// embedding the web app: the web UI authenticates with Telegram initData, which
// a desktop webview does not have, so it would render an empty dashboard. The
// full site opens in the default browser instead ("Open dashboard").
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod api;
mod config;
mod icon;

use std::sync::Mutex;
use std::time::Duration;

use tauri::{
    menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, PhysicalPosition, State, WebviewUrl, WebviewWindowBuilder,
    WindowEvent,
};
use tauri_plugin_autostart::ManagerExt;
use tauri_plugin_opener::OpenerExt;

use api::TrayState;

const POLL_INTERVAL: Duration = Duration::from_secs(300);
const POPOVER: &str = "popover";
const POPOVER_W: f64 = 340.0;
const POPOVER_H: f64 = 420.0;
/// Gap between the cursor and the popover edge, in physical pixels.
const TRAY_GAP: i32 = 12;

struct AppState {
    current: Mutex<TrayState>,
}

// ── state plumbing ───────────────────────────────────────────────────────────

/// Single place where the state fans out: stored for the popover to read on
/// open, pushed to it if already open, and reduced to an icon + tooltip.
fn apply(app: &AppHandle, next: TrayState) {
    if let Some(state) = app.try_state::<AppState>() {
        *state.current.lock().unwrap() = next.clone();
    }

    let worst = match &next {
        TrayState::Ready(s) => s.worst_pct,
        _ => None,
    };
    if let Some(tray) = app.tray_by_id("main") {
        let _ = tray.set_icon(Some(icon::render(worst)));
        let _ = tray.set_tooltip(Some(&tooltip(&next)));
    }

    let _ = app.emit("state", &next);
}

fn tooltip(state: &TrayState) -> String {
    match state {
        TrayState::Unpaired => "AI Quota — not paired".into(),
        TrayState::Loading => "AI Quota — loading...".into(),
        TrayState::Error { message } => format!("AI Quota — {message}"),
        TrayState::Ready(s) => {
            if s.keys.is_empty() {
                return "AI Quota — no keys".into();
            }
            // Windows truncates tooltips around 127 chars, so this stays terse
            // and lets the popover carry the detail.
            let mut out = String::from("AI Quota");
            for k in s.keys.iter().take(4) {
                match k.used_pct {
                    Some(p) => out.push_str(&format!("\n{}: {:.0}% used", k.name, p)),
                    None => out.push_str(&format!("\n{}: no quota data", k.name)),
                }
            }
            if s.keys.len() > 4 {
                out.push_str(&format!("\n+{} more", s.keys.len() - 4));
            }
            out
        }
    }
}

async fn refresh_now(app: &AppHandle) {
    let next = match config::load() {
        None => TrayState::Unpaired,
        Some(cfg) => match api::fetch_summary(&cfg).await {
            Ok(summary) => TrayState::Ready(summary),
            Err(message) => TrayState::Error { message },
        },
    };
    apply(app, next);
}

// ── commands ─────────────────────────────────────────────────────────────────

#[tauri::command]
fn tray_state(state: State<AppState>) -> TrayState {
    state.current.lock().unwrap().clone()
}

#[tauri::command]
async fn refresh(app: AppHandle) {
    refresh_now(&app).await;
}

#[tauri::command]
fn open_dashboard(app: AppHandle) -> Result<(), String> {
    let base = config::load().map(|c| c.api_base).ok_or("not paired yet")?;
    app.opener()
        .open_url(base, None::<&str>)
        .map_err(|e| e.to_string())
}

// ── popover ──────────────────────────────────────────────────────────────────

fn toggle_popover(app: &AppHandle, near: Option<PhysicalPosition<f64>>) {
    let Some(win) = app.get_webview_window(POPOVER) else {
        return;
    };
    if win.is_visible().unwrap_or(false) {
        let _ = win.hide();
        return;
    }

    if let Some(pos) = near {
        // Anchor above the click and clamp into the monitor's work area, so a
        // bottom taskbar doesn't push the popover off-screen.
        let scale = win.scale_factor().unwrap_or(1.0);
        let (w, h) = ((POPOVER_W * scale) as i32, (POPOVER_H * scale) as i32);
        let mut x = pos.x as i32 - w / 2;
        let mut y = pos.y as i32 - h - TRAY_GAP;

        if let Ok(Some(monitor)) = win.current_monitor() {
            let m = monitor.position();
            let size = monitor.size();
            x = x.clamp(m.x + TRAY_GAP, m.x + size.width as i32 - w - TRAY_GAP);
            y = y.max(m.y + TRAY_GAP);
        }
        let _ = win.set_position(PhysicalPosition::new(x, y));
    }

    let _ = win.show();
    let _ = win.set_focus();
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .manage(AppState {
            current: Mutex::new(TrayState::Loading),
        })
        .invoke_handler(tauri::generate_handler![
            tray_state,
            refresh,
            open_dashboard
        ])
        .setup(|app| {
            let handle = app.handle().clone();

            // Hidden until the tray is clicked. skip_taskbar keeps a tray app
            // out of the alt-tab list.
            WebviewWindowBuilder::new(app, POPOVER, WebviewUrl::App("index.html".into()))
                .title("AI Quota")
                .inner_size(POPOVER_W, POPOVER_H)
                .decorations(false)
                .resizable(false)
                .always_on_top(true)
                .skip_taskbar(true)
                .visible(false)
                .build()?;

            let autostart_on = app.autolaunch().is_enabled().unwrap_or(false);
            let launch = CheckMenuItem::with_id(
                app,
                "autostart",
                "Start with Windows",
                true,
                autostart_on,
                None::<&str>,
            )?;
            let menu = Menu::with_items(
                app,
                &[
                    &MenuItem::with_id(app, "open", "Open dashboard", true, None::<&str>)?,
                    &MenuItem::with_id(app, "refresh", "Refresh now", true, None::<&str>)?,
                    &launch,
                    &PredefinedMenuItem::separator(app)?,
                    &MenuItem::with_id(app, "quit", "Quit", true, None::<&str>)?,
                ],
            )?;

            TrayIconBuilder::with_id("main")
                .icon(icon::render(None))
                .tooltip("AI Quota — loading...")
                .menu(&menu)
                // Without this the left click opens the menu on Windows and the
                // popover never gets a chance to show.
                .show_menu_on_left_click(false)
                .on_menu_event(move |app, event| match event.id.as_ref() {
                    "quit" => app.exit(0),
                    "open" => {
                        let _ = open_dashboard(app.clone());
                    }
                    "refresh" => {
                        let app = app.clone();
                        tauri::async_runtime::spawn(async move { refresh_now(&app).await });
                    }
                    "autostart" => {
                        let manager = app.autolaunch();
                        let enabled = manager.is_enabled().unwrap_or(false);
                        let _ = if enabled {
                            manager.disable()
                        } else {
                            manager.enable()
                        };
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        position,
                        ..
                    } = event
                    {
                        toggle_popover(tray.app_handle(), Some(position));
                    }
                })
                .build(app)?;

            // Poll on its own cadence. /api/summary hits Z.ai once per key, so
            // this is deliberately slower than the dashboard's 60s refresh; the
            // menu's "Refresh now" covers impatience.
            tauri::async_runtime::spawn(async move {
                loop {
                    refresh_now(&handle).await;
                    tokio::time::sleep(POLL_INTERVAL).await;
                }
            });

            Ok(())
        })
        .on_window_event(|window, event| {
            // Click-away dismiss, the behaviour people expect from a tray
            // popover. Closing hides too, so the process outlives the window.
            match event {
                WindowEvent::Focused(false) if window.label() == POPOVER => {
                    let _ = window.hide();
                }
                WindowEvent::CloseRequested { api, .. } if window.label() == POPOVER => {
                    api.prevent_close();
                    let _ = window.hide();
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running AI Quota");
}
