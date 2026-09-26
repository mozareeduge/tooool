# Validation Report — v1.2

## Packaging environment — passed

- Node gate on `v22.16.0`: **PASS**
- repository/file/dependency-pin preflight: **PASS**
- unresolved TODO/FIXME/PLACEHOLDER scan: **PASS**
- normalized pixel round-trip geometry: **PASS**
- visible/export geometry for `/Rotate` 0/90/180/270°: **PASS**
- replacement-image aspect/bounds regression: **PASS**
- source TypeScript/TSX syntax-transpile check: **PASS**
- Unix launcher shell syntax: **PASS**
- fixture PDF/PNG/SVG integrity: **PASS**

## Mandatory target-machine gates

The packaging runtime could not complete npm registry access, so install-dependent claims are intentionally not marked passed here. `AGENT_ONE_CLICK_WINDOWS.cmd` / `AGENT_ONE_CLICK_UNIX.sh` execute all of these before returning a usable local URL:

1. dependency install or `npm ci` and lockfile presence;
2. `npm ls --depth=0` consistency;
3. real `pdf-lib` export/reload self-test;
4. PDF.js CMap/WASM/standard-font asset sync;
5. TypeScript project check + Vite production build;
6. local server startup + app-specific health check.

Then only visual A1+A2 in `docs/ACCEPTANCE_TESTS.md` remain.

See `RELEASE_AUDIT.md` for defects closed and residual product boundaries.
