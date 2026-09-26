# Release Audit — v1.2

## Fixed since v1.1

1. **Asset replacement distortion:** existing placements now recompute height/bounds when a stamp/signature is replaced by an image with another aspect ratio.
2. **SVG hardening:** PNG signatures are validated; SVG DOCTYPE/script/`foreignObject`/event handlers/external resources/CSS imports are rejected; common absolute SVG units are parsed correctly.
3. **PDF input guard:** mislabeled files without a PDF header are rejected before viewer load.
4. **PDF.js completeness:** exact `pdfjs-dist@6.3.289` is paired with `react-pdf@11.0.0`; CMaps, WASM codecs, and standard fonts are synced automatically.
5. **Failure containment:** app-level and PDF-viewer error boundaries prevent a bad document/render from blanking the entire UI.

## Release automation added

- `AGENT_ONE_CLICK_WINDOWS.cmd` / `AGENT_ONE_CLICK_UNIX.sh`: install/repair → full verify → background start → app-specific health check.
- `npm run test:export`: real PDF load/image embed/save/reload regression test.
- `npm run test:deps`: installed direct-tree consistency.
- `npm run verify`: preflight + dependency tree + geometry + export + TypeScript/Vite build.
- generated PDF.js runtime assets are checked during build/start rather than hand-maintained.
- visual acceptance collapsed from seven separate cases to two end-to-end flows.

## Packaging-environment evidence

Passed here:
- Node version gate on Node 22.16.0;
- repository preflight;
- geometry regression for 0/90/180/270° plus asset-replacement aspect/bounds;
- source syntax/transpile inspection;
- shell syntax checks;
- PDF/PNG/SVG fixture integrity inspection.

Not falsely claimed here:
- npm dependency installation;
- `npm ls` against an installed tree;
- real `pdf-lib` export self-test;
- TypeScript project build/Vite production build;
- browser visual A1/A2.

Reason: npm registry requests timed out in the packaging runtime. The one-click launcher makes all install-dependent checks mandatory on the target machine and refuses to report a local URL if they fail.

## Residual product boundary

Password-protected/encrypted or malformed PDFs can still be rejected by PDF.js/pdf-lib. This is an explicit unsupported-input boundary, not a silent failure path. Existing certificate-based PDF signatures may be invalidated by any re-save.
