# AI Quota — Windows tray client

A small Tauri v2 app that keeps your Z.ai quota in the Windows notification area: a ring icon that fills with your most-used key, a popover with per-key detail, and a right-click menu.

Independently built and released, like `warmup-cron/` and `alerts-cron/` — it is not part of the Next app's build. It shares no code with the app; the contract between them is `GET /api/summary` and the config file the installer writes.

---

## How it gets your keys

It doesn't have any. It has a **device token**, and asks the server.

The Mini App mints a pairing code (Settings → Linked devices); `/install.ps1` redeems it and writes the result to `%APPDATA%\ai-quota\config.json`:

```json
{
    "apiBase": "https://your-host",
    "token": "…",
    "deviceId": "…",
    "name": "DESKTOP-A1"
}
```

The tray reads that file at startup and on every poll, and sends `Authorization: Bearer <token>` to `/api/summary`. It never performs the pairing exchange itself — by the time it runs it is either paired or it has nothing to show, and it says so.

Revoking the device in Settings makes the next poll return 401, which the popover surfaces as "This device was unlinked."

---

## Design notes

**Why the popover renders locally instead of loading the web app.** The dashboard authenticates with Telegram `initData`, which a desktop webview doesn't have — pointing a window at the deployed URL would show an empty dashboard. So the popover is a static page inside the binary, fed over IPC from Rust. "Open dashboard" opens the real site in your browser.

**Why the icon is drawn at runtime.** Windows tray icons are images, not text: there's no API to write "68%" onto one. `src/icon.rs` rasterises a ring that fills clockwise with the highest per-key usage, tinted green → amber → red at the same 75/90 thresholds the app's alerts use. The exact numbers live in the tooltip and the popover.

**Why polling is slower than the web app.** `/api/summary` calls Z.ai once per key, so the tray polls every 5 minutes rather than the dashboard's 60 seconds. "Refresh now" in the menu covers impatience.

---

## Development

```bash
npm install
npm run dev      # tauri dev
npm run build    # tauri build — produces an NSIS installer on Windows
npm run icons    # regenerate icons/ from ../app/icon.png
```

`cargo test` (from `src-tauri/`) covers the icon geometry — fill direction, severity tints, and the transparent hole.

On macOS/Linux the app runs for development and reads the config from `~/Library/Application Support/ai-quota/` or `$XDG_CONFIG_HOME/ai-quota/`. **Windows is the only shipped target**; the tray behaviour is only tuned there.

---

## Releasing

`.github/workflows/desktop-release.yml` builds on `windows-latest` and publishes the installer:

```bash
git tag desktop-v0.1.0
git push origin desktop-v0.1.0
```

Keep the tag in step with `version` in `src-tauri/tauri.conf.json`.

`/install.ps1` fetches `releases/latest` and installs the first `.exe`/`.msi` asset with NSIS's silent `/S` flag. The bundle uses `installMode: currentUser`, so no admin prompt — which is what lets the whole thing run from a normal PowerShell window. If this repo ever publishes releases for something else, `releases/latest` becomes ambiguous and the script needs a tag filter.
