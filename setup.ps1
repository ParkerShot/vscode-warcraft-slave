<#
  Warcraft Peon - installer for Claude Code + VS Code (Windows).

  What it does (idempotent, safe to re-run):
    1. Installs the extension into %USERPROFILE%\.vscode\extensions
    2. Creates the peon "home" %USERPROFILE%\.claude\peon (events.jsonl, peon-event.cmd, assets\)
    3. Appends hooks to %USERPROFILE%\.claude\settings.json without touching existing ones

  Run:  powershell -ExecutionPolicy Bypass -File setup.ps1
  Blizzard assets are NOT bundled - drop your own .wav/.gif/.png into assets\ (see README).
#>

$ErrorActionPreference = 'Stop'
$src   = $PSScriptRoot
$home_ = $env:USERPROFILE
$extId = 'otsni.warcraft-peon-0.1.0'
$extDir = Join-Path $home_ ".vscode\extensions\$extId"
$peon  = Join-Path $home_ ".claude\peon"
$settings = Join-Path $home_ ".claude\settings.json"

Write-Host "== Warcraft Peon setup ==" -ForegroundColor Cyan

# 1. Extension
New-Item -ItemType Directory -Force -Path $extDir | Out-Null
Copy-Item (Join-Path $src 'extension.js') $extDir -Force
Copy-Item (Join-Path $src 'package.json') $extDir -Force
Copy-Item (Join-Path $src 'media') $extDir -Recurse -Force
Write-Host "[1/3] extension -> $extDir"

# 2. Peon home
New-Item -ItemType Directory -Force -Path $peon | Out-Null
foreach ($d in 'command','done','permission','annoyed','idle','thinking') {
  New-Item -ItemType Directory -Force -Path (Join-Path $peon "assets\$d") | Out-Null
}
$events = Join-Path $peon 'events.jsonl'
if (-not (Test-Path $events)) { New-Item -ItemType File -Path $events | Out-Null }
# event writer (called by hooks): appends {"event":"<arg>"} to events.jsonl
$cmd = '@echo {"event":"%~1"}>>"%~dp0events.jsonl"' + "`r`n"
Set-Content -Path (Join-Path $peon 'peon-event.cmd') -Value $cmd -Encoding ASCII -NoNewline
# if an assets\ folder sits next to setup.ps1, copy it into the peon home
$srcAssets = Join-Path $src 'assets'
if (Test-Path $srcAssets) {
  Copy-Item "$srcAssets\*" (Join-Path $peon 'assets') -Recurse -Force
  Write-Host "[2/3] peon home + assets -> $peon"
} else {
  Write-Host "[2/3] peon home -> $peon (no assets found - add your own to assets\, see README)" -ForegroundColor Yellow
}

# 3. Hooks in settings.json (idempotent)
$cmdPath = (Join-Path $peon 'peon-event.cmd')
function New-PeonHook($arg) {
  return [ordered]@{
    type    = 'command'
    command = 'cmd.exe'
    args    = @('/c', $cmdPath, $arg)
    async   = $true
    timeout = 10
  }
}
$map = [ordered]@{ UserPromptSubmit = 'prompt'; Stop = 'stop'; Notification = 'notify'; SessionEnd = 'end' }

if (Test-Path $settings) {
  $json = Get-Content $settings -Raw | ConvertFrom-Json
} else {
  New-Item -ItemType Directory -Force -Path (Split-Path $settings) | Out-Null
  $json = [pscustomobject]@{}
}
if (-not $json.hooks) { $json | Add-Member -NotePropertyName hooks -NotePropertyValue ([pscustomobject]@{}) -Force }

$added = 0
foreach ($event in $map.Keys) {
  $arg = $map[$event]
  if (-not $json.hooks.$event) {
    $json.hooks | Add-Member -NotePropertyName $event -NotePropertyValue @() -Force
  }
  # our hook already present on this event?
  $exists = $false
  foreach ($grp in @($json.hooks.$event)) {
    foreach ($h in @($grp.hooks)) {
      if ($h.command -eq 'cmd.exe' -and ($h.args -join ' ') -match 'peon-event\.cmd') { $exists = $true }
    }
  }
  if (-not $exists) {
    $group = [ordered]@{ matcher = ''; hooks = @((New-PeonHook $arg)) }
    $json.hooks.$event = @($json.hooks.$event) + $group
    $added++
  }
}

# write UTF-8 WITHOUT BOM (PowerShell's -Encoding UTF8 adds a BOM that some JSON readers dislike)
$out = $json | ConvertTo-Json -Depth 20
[System.IO.File]::WriteAllText($settings, $out, (New-Object System.Text.UTF8Encoding($false)))
Write-Host "[3/3] hooks in settings.json (new events added: $added)"

Write-Host ""
Write-Host "Done. Restart VS Code (or Developer: Reload Window)." -ForegroundColor Green
Write-Host "The panel shows up at the bottom next to the terminal - tab 'Slave'."
