$ErrorActionPreference = 'Stop'
$ProjectRoot = Split-Path -Parent $PSScriptRoot
$PidFile = Join-Path $ProjectRoot '.runtime\vite.pid'

if (-not (Test-Path $PidFile)) {
  Write-Host 'No recorded local server is running.'
  exit 0
}

$RecordedPid = (Get-Content $PidFile -Raw).Trim()
if ($RecordedPid -notmatch '^\d+$') {
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  Write-Host 'Invalid PID file removed; no process was killed.'
  exit 0
}

$Process = Get-Process -Id ([int]$RecordedPid) -ErrorAction SilentlyContinue
if (-not $Process) {
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  Write-Host 'Recorded server was already stopped; PID file removed.'
  exit 0
}

$CommandLine = $null
try {
  $CommandLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $RecordedPid").CommandLine
} catch { }

if ($Process.ProcessName -notmatch '^node(?:\.exe)?$' -or $CommandLine -notmatch 'vite') {
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
  Write-Host "PID $RecordedPid no longer looks like the package Vite process; PID file removed without killing it."
  exit 0
}

try {
  taskkill /PID $RecordedPid /T /F *> $null
} finally {
  Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
}
Write-Host 'Local server stopped.'
