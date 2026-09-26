# Executable Handoff — PDF Stamp & Sign v1.2

## Objective

Activate and validate an already-implemented browser-only PDF stamping/signing app. Do not redesign it.

The product already supports:
- one multi-page PDF;
- one stamp + one signature, each PNG or SVG;
- safe SVG parsing and high-resolution transparent SVG→PNG rasterization;
- per-page add/drag/resize/delete with normalized placement state;
- page navigation with placement persistence;
- CropBox + `/Rotate` aware PDF export for 0/90/180/270° pages;
- local-only operation with no upload API or backend.

## Default execution — one command

Windows:

```bat
AGENT_ONE_CLICK_WINDOWS.cmd
```

macOS/Linux:

```bash
./AGENT_ONE_CLICK_UNIX.sh
```

Do not manually run install/build commands first. The launcher handles them and returns a local URL only after all automated gates pass.

### What the launcher proves

1. Node/npm and Node >=22.13.0.
2. Required files, exact pinned direct versions, fixtures, and source hygiene.
3. Dependency installation/repair and a generated `package-lock.json` on first successful install.
4. `npm ls --depth=0` dependency-tree consistency.
5. Normalized geometry + 0/90/180/270° rotation mapping + asset-replacement aspect regression.
6. Real `pdf-lib` load/embed/save/reload export self-test with page-count/rotation preservation and invalid-state guards.
7. PDF.js CMaps, WASM codecs, and standard-font assets copied from the exact installed `pdfjs-dist` version.
8. TypeScript project check + Vite production build.
9. Background Vite startup on `127.0.0.1:5173` and app-specific HTTP health check.

## Agent work after command succeeds

Run only `docs/ACCEPTANCE_TESTS.md` A1 and A2. These are intentionally visual/UI checks not duplicated by the automated suite.

If A1+A2 pass: **stop**. No cleanup, upgrades, refactors, UI redesign, or architecture work.

## Frozen architecture

| Area | Frozen choice |
|---|---|
| Runtime | browser-only/static |
| App | React + Vite + TypeScript |
| Styling | Tailwind CSS |
| PDF rendering | react-pdf / PDF.js |
| PDF.js runtime | exact `pdfjs-dist` paired with react-pdf |
| Drag/resize | react-rnd |
| PDF export | pdf-lib |
| Placement storage | normalized `0..1` visible-page coordinates |
| SVG pipeline | validate → browser canvas → PNG → app state |
| Rotated pages | CropBox + `/Rotate` aware mapping |

Do not add Redux/Zustand, Fabric/Konva, a backend, cloud storage, a second PDF engine, or a UI framework.

## Repair algorithm — only after a reproduced failure

1. Capture the first failing command/error exactly and classify `ENV`, `INSTALL`, `BUILD`, `RUNTIME`, or `GEOMETRY/EXPORT`.
2. `ENV`/`INSTALL`: follow `docs/FAILURE_PLAYBOOK.md`; do not edit `src/`.
3. `BUILD`/`RUNTIME`: patch only the nearest file implicated by the first reproducible error.
4. `GEOMETRY/EXPORT`: run `npm run test:geometry` first; preserve normalized storage; change geometry/export only when the fixture proves the defect.
5. After any source patch run `npm run verify`, repeat only the failed acceptance flow, then stop when green.

## Final report — return only this

```text
STATUS: PASS | PARTIAL | BLOCKED
ONE_CLICK: PASS | FAIL
npm run verify: PASS | FAIL
VISUAL: A1 PASS|FAIL; A2 PASS|FAIL
FILES CHANGED: <none or exact paths>
REMAINING BLOCKER: <none or one concrete issue>
LOCAL URL: <url if running>
```
