param(
  [switch]$NoOpen,
  [switch]$Background
)

$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

function Fail([string]$Message, [int]$Code = 1) {
  Write-Host ""
  Write-Host "[FAIL] $Message" -ForegroundColor Red
  Write-Host ""
  exit $Code
}

function Ensure-Dependencies {
  $HasLock = Test-Path "package-lock.json"
  $HasVite = Test-Path "node_modules/.bin/vite.cmd"
  $NeedInstall = (-not $HasLock) -or (-not $HasVite)

  if (-not $NeedInstall) {
    npm ls --depth=0 *> $null
    if ($LASTEXITCODE -ne 0) { $NeedInstall = $true }
  }

  if (-not $NeedInstall) {
    Write-Host "[OK] Dependency tree already present and consistent." -ForegroundColor Green
    return
  }

  Write-Host "[STEP] Installing pinned dependencies..." -ForegroundColor Cyan
  if ($HasLock) {
    npm ci --no-audit --no-fund
  } else {
    npm install --no-audit --no-fund --prefer-offline
  }
  if ($LASTEXITCODE -ne 0) {
    Fail "Dependency install failed. Read docs/FAILURE_PLAYBOOK.md; do not change app code." 20
  }

  if (-not (Test-Path "package-lock.json")) {
    Fail "npm completed but package-lock.json was not created." 21
  }
}

function Start-BackgroundServer {
  $RuntimeDir = Join-Path $ProjectRoot ".runtime"
  New-Item -ItemType Directory -Path $RuntimeDir -Force | Out-Null
  $PidFile = Join-Path $RuntimeDir "vite.pid"
  $LogFile = Join-Path $RuntimeDir "vite.log"
  $ErrorLogFile = Join-Path $RuntimeDir "vite.err.log"

  if (Test-Path $PidFile) {
    $OldPid = (Get-Content $PidFile -Raw).Trim()
    $OldProcess = if ($OldPid -match '^\d+$') { Get-Process -Id ([int]$OldPid) -ErrorAction SilentlyContinue } else { $null }
    if ($OldProcess) {
      try {
        $Response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:5173" -TimeoutSec 2
        if ($Response.StatusCode -eq 200 -and $Response.Content -match '<title>PDF Stamp & Sign</title>') {
          Write-Host "[OK] PDF Stamp & Sign server already running (PID $OldPid)." -ForegroundColor Green
          Write-Host "LOCAL_URL=http://127.0.0.1:5173"
          return
        }
      } catch { }
    }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  }

  Remove-Item $LogFile -Force -ErrorAction SilentlyContinue
  Remove-Item $ErrorLogFile -Force -ErrorAction SilentlyContinue
  $NodeExe = (Get-Command node).Source
  $Process = Start-Process `
    -FilePath $NodeExe `
    -ArgumentList "node_modules/vite/bin/vite.js", "--host", "127.0.0.1", "--port", "5173", "--strictPort" `
    -WorkingDirectory $ProjectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $LogFile `
    -RedirectStandardError $ErrorLogFile `
    -PassThru
  Set-Content -Path $PidFile -Value $Process.Id -NoNewline

  $Healthy = $false
  for ($Attempt = 0; $Attempt -lt 30; $Attempt++) {
    Start-Sleep -Milliseconds 250
    if ($Process.HasExited) { break }
    try {
      $Response = Invoke-WebRequest -UseBasicParsing -Uri "http://127.0.0.1:5173" -TimeoutSec 2
      if ($Response.StatusCode -eq 200 -and $Response.Content -match '<title>PDF Stamp & Sign</title>') {
        $Healthy = $true
        break
      }
    } catch { }
  }

  if (-not $Healthy) {
    $TailParts = @()
    if (Test-Path $LogFile) { $TailParts += (Get-Content $LogFile -Tail 20) }
    if (Test-Path $ErrorLogFile) { $TailParts += (Get-Content $ErrorLogFile -Tail 20) }
    $Tail = if ($TailParts.Count -gt 0) { $TailParts -join [Environment]::NewLine } else { "No Vite log was produced." }
    try { taskkill /PID $Process.Id /T /F *> $null } catch { }
    Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    Fail "Local server did not become healthy on port 5173.`n$Tail" 40
  }

  Write-Host "[OK] Local server healthy in background (PID $($Process.Id))." -ForegroundColor Green
  Write-Host "LOCAL_URL=http://127.0.0.1:5173"
  Write-Host "STOP_COMMAND=STOP_WINDOWS.cmd"
}

Write-Host "PDF Stamp & Sign - local activation" -ForegroundColor Cyan
Write-Host "Project: $ProjectRoot"

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js is missing." -ForegroundColor Yellow
  Write-Host "Install current Node LTS (must be >= 22.13.0), then rerun this file."
  Write-Host "Windows option: winget install OpenJS.NodeJS.LTS"
  exit 10
}

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Fail "npm was not found even though Node is present. Repair/reinstall Node LTS." 11
}

node scripts/preflight.mjs
if ($LASTEXITCODE -ne 0) { Fail "Preflight failed. Follow the exact error above." 12 }

Ensure-Dependencies

Write-Host "[STEP] Running full verification..." -ForegroundColor Cyan
npm run verify
if ($LASTEXITCODE -ne 0) {
  Fail "Verification failed. Give the local agent the first failing line plus AGENT_HANDOFF.md." 30
}

Write-Host "[OK] Dependency tree, geometry, export path, and production build verified." -ForegroundColor Green

if ($Background) {
  Start-BackgroundServer
  exit 0
}

Write-Host "[STEP] Starting local app at http://127.0.0.1:5173" -ForegroundColor Cyan
if ($NoOpen) {
  npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
} else {
  npm run start:local -- --port 5173 --strictPort
}
