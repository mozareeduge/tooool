# Agent Contract — PDF Stamp & Sign v1.2

This repository is already implemented. Your scope is activation, verification, and surgical repair only.

## Default action

Windows:

```bat
AGENT_ONE_CLICK_WINDOWS.cmd
```

macOS/Linux:

```bash
./AGENT_ONE_CLICK_UNIX.sh
```

If it succeeds, do not inspect/refactor source. Open the printed `LOCAL_URL` and run only A1+A2 from `docs/ACCEPTANCE_TESTS.md`.

## Frozen choices

- React + Vite + TypeScript
- Tailwind CSS
- `react-pdf` + matching `pdfjs-dist`
- `react-rnd`
- `pdf-lib`
- normalized visible-page coordinates (`0..1`)
- browser-only/local-only architecture
- SVG validation + browser-canvas SVG→PNG preprocessing

Do not add backend/database/storage/state/editor/UI frameworks or replace the PDF engine.

## Repair rule

Only edit code after a reproducible automated or visual failure. Fix the nearest failure boundary, run `npm run verify`, repeat only the failed visual flow, and stop when green.

Environment/install failure is not application-code failure: use `docs/FAILURE_PLAYBOOK.md` without touching `src/`.
