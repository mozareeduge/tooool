#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

command -v node >/dev/null 2>&1 || { echo "[FAIL] Node.js missing. Need >= 22.13.0."; exit 10; }
command -v npm >/dev/null 2>&1 || { echo "[FAIL] npm missing. Repair/reinstall Node LTS."; exit 11; }
node scripts/preflight.mjs

need_install=0
[[ -f package-lock.json ]] || need_install=1
[[ -x node_modules/.bin/vite ]] || need_install=1
if [[ "$need_install" -eq 0 ]]; then
  npm ls --depth=0 >/dev/null 2>&1 || need_install=1
fi

if [[ "$need_install" -eq 1 ]]; then
  if [[ -f package-lock.json ]]; then
    npm ci --no-audit --no-fund
  else
    npm install --no-audit --no-fund --prefer-offline
  fi
fi

[[ -f package-lock.json ]] || { echo "[FAIL] npm did not create package-lock.json"; exit 21; }
npm run verify
npm run start:local -- --port 5173 --strictPort
