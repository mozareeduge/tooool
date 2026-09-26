# PDF Stamp & Sign — Agent-Ready v1.2

## Agent: one command first

Windows:

```bat
AGENT_ONE_CLICK_WINDOWS.cmd
```

macOS/Linux:

```bash
./AGENT_ONE_CLICK_UNIX.sh
```

That command owns the routine work: environment preflight, dependency install/repair, lockfile creation on first install, dependency-tree check, geometry tests, PDF export self-test, PDF.js support-asset sync, TypeScript/Vite production build, background local startup, and health check.

On success it prints:

```text
LOCAL_URL=http://127.0.0.1:5173
```

The only work left for an agent is the **two visual acceptance flows** in `docs/ACCEPTANCE_TESTS.md`. Do not edit source unless one of those flows or `npm run verify` reproduces a failure.

## Human: easiest path

Windows: double-click `START_WINDOWS.cmd`.

macOS/Linux:

```bash
./START_UNIX.sh
```

## Package state

Implementation and release tooling are prepared. Source-level preflight, syntax/transpile checks, fixtures, and deterministic geometry tests were validated while packaging. The packaging environment could not reach the npm registry, so the final installed dependency/build/export gates are deliberately enforced by the one-click launcher on the target machine rather than claimed as completed here.

See `RELEASE_AUDIT.md` for the exact verification boundary.
