$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
Set-Location $ProjectRoot

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  Write-Host "[FAIL] Node.js missing. Need >= 22.13.0." -ForegroundColor Red
  exit 10
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
  Write-Host "[FAIL] npm missing. Repair/reinstall Node LTS." -ForegroundColor Red
  exit 11
}

node scripts/preflight.mjs
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

if (-not (Test-Path "node_modules/.bin/vite.cmd")) {
  Write-Host "[INFO] Dependencies are not installed yet." -ForegroundColor Yellow
  Write-Host "Run AGENT_ONE_CLICK_WINDOWS.cmd (agent) or START_WINDOWS.cmd (human) for install + full verification." -ForegroundColor Yellow
  exit 2
}

npm run verify
exit $LASTEXITCODE
