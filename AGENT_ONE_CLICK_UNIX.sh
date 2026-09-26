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

mkdir -p .runtime
if [[ -f .runtime/vite.pid ]] && kill -0 "$(cat .runtime/vite.pid)" 2>/dev/null; then
  if node -e "fetch('http://127.0.0.1:5173').then(async r=>{const t=await r.text();if(r.status!==200||!t.includes('<title>PDF Stamp & Sign</title>'))process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then
    echo "LOCAL_URL=http://127.0.0.1:5173"
    exit 0
  fi
fi
rm -f .runtime/vite.pid

nohup ./node_modules/.bin/vite --host 127.0.0.1 --port 5173 --strictPort >.runtime/vite.log 2>&1 &
echo $! > .runtime/vite.pid

healthy=0
for _ in $(seq 1 30); do
  if node -e "fetch('http://127.0.0.1:5173').then(async r=>{const t=await r.text();if(r.status!==200||!t.includes('<title>PDF Stamp & Sign</title>'))process.exit(1)}).catch(()=>process.exit(1))" >/dev/null 2>&1; then healthy=1; break; fi
  sleep 0.25
done
if [[ "$healthy" -ne 1 ]]; then
  tail -30 .runtime/vite.log || true
  ./STOP_UNIX.sh || true
  echo "[FAIL] Local server did not become healthy on port 5173"
  exit 40
fi

echo "LOCAL_URL=http://127.0.0.1:5173"
echo "STOP_COMMAND=./STOP_UNIX.sh"
