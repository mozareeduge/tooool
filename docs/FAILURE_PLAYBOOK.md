# Failure Playbook — use only the first matching branch

## ENV — Node/npm missing or Node too old

Requirement: Node >=22.13.0.

Windows:

```powershell
winget install OpenJS.NodeJS.LTS
```

Or upgrade:

```powershell
winget upgrade OpenJS.NodeJS.LTS
```

Open a new terminal, rerun `AGENT_ONE_CLICK_WINDOWS.cmd`.

## INSTALL — npm registry/network failure

Do not edit app code or package versions.

```powershell
npm config get registry
npm ping
```

Expected public registry: `https://registry.npmjs.org/`.

If the registry is unintentionally wrong:

```powershell
npm config set registry https://registry.npmjs.org/
npm cache verify
AGENT_ONE_CLICK_WINDOWS.cmd
```

For corporate proxy/VPN environments inspect `npm config get proxy` and `npm config get https-proxy`; do not blindly remove intentional settings.

If an interrupted install is corrupt:

```powershell
Remove-Item -Recurse -Force node_modules
AGENT_ONE_CLICK_WINDOWS.cmd
```

## BUILD / automated verification

Run exactly:

```powershell
npm run verify
```

Fix only the first reproducible compiler/bundler/self-test error. `public/pdfjs/` is generated; do not hand-edit it.

If PDF.js asset sync fails, verify the installed tree first:

```powershell
npm ls react-pdf pdfjs-dist
```

The package intentionally pins `react-pdf@11.0.0` with `pdfjs-dist@6.3.289`.

## LOCAL SERVER / port 5173

The agent launcher uses strict port 5173. If another process owns it, stop that process or use the product's `STOP_WINDOWS.cmd` / `STOP_UNIX.sh` if it is a previous package instance, then rerun the one-click launcher.

Do not change source because of a port conflict.

## PDF/SVG/runtime/export defect

- PDF fixture fails: capture the exact `react-pdf` error. Encrypted/malformed PDFs may be unsupported; do not replace the PDF engine.
- SVG fixture succeeds but user SVG fails: the SVG may be malformed or contain deliberately rejected DOCTYPE/script/`foreignObject`/event/external-resource content. Do not bypass the safety gate speculatively.
- Export mismatch: reproduce A2, run `npm run test:geometry`, record exact rotation + position/orientation/scale, then inspect only `src/utils/geometry.ts` / `src/utils/exportPdf.ts`.

After any source patch: `npm run verify`, then repeat only the failed visual flow.
