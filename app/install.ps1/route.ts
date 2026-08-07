import type { NextRequest } from "next/server"

// `irm https://<host>/install.ps1 | iex` — the Windows setup one-liner offered
// in Settings › Linked devices.
//
// The script does the pairing itself: it redeems the code against
// /api/devices/claim and writes the resulting token to %APPDATA%\ai-quota, so
// the desktop client starts already authenticated and never has to implement
// the exchange. Downloading the client binary is best-effort — until a release
// is published, pairing alone still succeeds and the config is waiting.
//
// The API base is baked in from the request origin, so a preview deployment
// hands out a script that talks to that same preview.

const GITHUB_REPO = "phalla-doll/ai-quota"

// PowerShell as String.raw: backslash paths must survive verbatim, and JS
// template escapes would silently eat them. Never use a backtick in here.
function script(apiBase: string) {
    return String.raw`#Requires -Version 5.1
$ErrorActionPreference = 'Stop'
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$ApiBase    = '${apiBase}'
$Repo       = '${GITHUB_REPO}'
$ConfigDir  = Join-Path $env:APPDATA 'ai-quota'
$ConfigPath = Join-Path $ConfigDir 'config.json'

Write-Host ''
Write-Host '  AI Quota - device setup' -ForegroundColor Cyan
Write-Host ''

# ---- 1. Redeem the pairing code -------------------------------------------
$code = $env:AI_QUOTA_CODE
if ([string]::IsNullOrWhiteSpace($code)) {
    $code = Read-Host '  Pairing code (Telegram app > Settings > Linked devices)'
}
if ([string]::IsNullOrWhiteSpace($code)) { throw 'No pairing code given.' }

$name = $env:AI_QUOTA_DEVICE_NAME
if ([string]::IsNullOrWhiteSpace($name)) { $name = $env:COMPUTERNAME }

$body = @{ code = $code; name = $name } | ConvertTo-Json -Compress
try {
    $claim = Invoke-RestMethod -Method Post -Uri ($ApiBase + '/api/devices/claim') -ContentType 'application/json' -Body $body
} catch {
    $detail = $null
    if ($_.ErrorDetails -and $_.ErrorDetails.Message) {
        try { $detail = (ConvertFrom-Json $_.ErrorDetails.Message).error } catch { $detail = $_.ErrorDetails.Message }
    }
    if ($detail) { throw ('Pairing failed: ' + $detail) }
    throw
}

# The token is the standing credential - the code is now spent either way.
New-Item -ItemType Directory -Force -Path $ConfigDir | Out-Null
@{
    apiBase  = $ApiBase
    token    = $claim.token
    deviceId = $claim.deviceId
    name     = $claim.name
} | ConvertTo-Json | Set-Content -Path $ConfigPath -Encoding UTF8

Write-Host ('  Paired as "' + $claim.name + '"') -ForegroundColor Green
Write-Host ('  Credentials: ' + $ConfigPath) -ForegroundColor DarkGray
Write-Host ''

# ---- 2. Install the client (best effort) ----------------------------------
$release = $null
try {
    $release = Invoke-RestMethod -Uri ('https://api.github.com/repos/' + $Repo + '/releases/latest') -Headers @{ 'User-Agent' = 'ai-quota-installer' }
} catch {
    $release = $null
}

$asset = $null
if ($release -and $release.assets) {
    $asset = $release.assets | Where-Object { $_.name -match '\.(msi|exe)$' } | Select-Object -First 1
}

if (-not $asset) {
    Write-Host '  No Windows client release published yet.' -ForegroundColor Yellow
    Write-Host '  This machine is paired - rerun once a release exists to install the app.' -ForegroundColor Yellow
    Write-Host ''
    return
}

$installer = Join-Path $env:TEMP $asset.name
Write-Host ('  Downloading ' + $asset.name + ' ...') -ForegroundColor DarkGray
Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $installer -UseBasicParsing

Write-Host '  Installing ...' -ForegroundColor DarkGray
if ($installer -match '\.msi$') {
    Start-Process -FilePath 'msiexec.exe' -ArgumentList @('/i', ('"' + $installer + '"'), '/qn', '/norestart') -Wait
} else {
    Start-Process -FilePath $installer -ArgumentList '/S' -Wait
}
Remove-Item $installer -Force -ErrorAction SilentlyContinue

Write-Host ''
Write-Host '  Done. AI Quota is pinned to your taskbar tray.' -ForegroundColor Green
Write-Host ''
`
}

export async function GET(req: NextRequest) {
    return new Response(script(req.nextUrl.origin), {
        headers: {
            "content-type": "text/plain; charset=utf-8",
            "cache-control": "no-store",
        },
    })
}
