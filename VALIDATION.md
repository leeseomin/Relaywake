# Relaywake validation

## Supported toolchain

- Node.js: `^20.19.0 || >=22.12.0`
- npm: `10.9.2`
- Recommended CI reference environment: Node.js `22.14.0`, npm `10.9.2`, Ubuntu
- Dependency source of truth: the tracked lockfile, installed with `npm ci`

## Release gate

`npm run check` is the single release-validation entry point. It stops at the
first failure and runs these stages in order:

1. strict TypeScript/Vue typecheck
2. Vitest unit suite
3. Vite production bundle into `dist`
4. Playwright E2E (`test:e2e:run`) against `vite preview` serving that `dist`

The Playwright server configuration never reuses a process already listening on
port `4173`. This prevents a Vite development server from accidentally satisfying
the production E2E gate.

`npm run test:e2e` remains a standalone developer command: it creates a fresh
production bundle before invoking `test:e2e:run`. The full gate invokes the
internal runner directly because it has already built the same source state.

For a clean local run:

```bash
npm ci
npx playwright install chromium
npm run check
```

On Linux, install the browser and its system libraries with:

```bash
npx playwright install --with-deps chromium
```

## Continuous integration

The ordered local gate remains available, but `.github/workflows/ci.yml` is not
present in the current `main` branch. It was added in commit `a700802` and
removed by the later commit `b3fefb3`. Until an equivalent remote workflow is
restored, pull requests and pushes do not automatically run this gate.

## Current local verification

Verified on 2026-07-30:

- `npm ci`: passed; 119 packages installed, 0 vulnerabilities
- `npm run typecheck`: passed
- `npm run test`: passed; 16 files and 48 tests
- `npm run build:bundle`: passed; 149 modules transformed
- production JavaScript: 1,704.23 kB, 464.09 kB gzip
- `npm run test:e2e:run`: passed; 9 tests passed and the desktop copy of the
  mobile-only touch test was intentionally skipped
- `npm run check`: passed from typecheck through production-preview E2E
- persistence coverage: real Dexie transaction rollback, commit-before-Pinia,
  duplicate/concurrent run handling, queued settings writes, and atomic reset
- asset coverage: 40-file manifest parity, magic bytes, extension, dimensions,
  frame geometry, preload use, provenance, and replacement-asset visual guards
- `dirt-red.png`: 2,948,342 to 243,891 encoded bytes; 16 MiB to 1 MiB decoded
  RGBA memory

The local shell used Node.js `25.3.0` and npm `11.13.0`, so `npm ci` emitted the
expected engine warning for the repository's pinned npm `10.9.2`. The
recommended remote reference remains Node.js `22.14.0` with npm `10.9.2`, but
the current branch does not contain a workflow that enforces it.
