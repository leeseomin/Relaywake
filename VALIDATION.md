# Relaywake validation

## Supported toolchain

- Node.js: `^20.19.0 || >=22.12.0`
- npm: `10.9.2`
- GitHub Actions reference environment: Node.js `22.14.0`, npm `10.9.2`, Ubuntu
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

`.github/workflows/ci.yml` runs for pull requests and pushes to `main`. It:

- pins the reference Node.js and npm versions;
- restores npm's download cache and installs dependencies with `npm ci`;
- caches Chromium by operating system and `package-lock.json` hash;
- installs Chromium plus required runner libraries; and
- invokes only `npm run check` for the ordered release gate.

Any failed typecheck, unit test, production build, preview startup, or browser
test fails the job and blocks the gate.

## Current local verification

Verified on 2026-07-30:

- `npm ci`: passed; 118 packages installed, 0 vulnerabilities
- `npm run typecheck`: passed
- `npm run test`: passed; 14 files and 29 tests
- `npm run build:bundle`: passed; 149 modules transformed
- production JavaScript: 1,698.09 kB, 462.79 kB gzip
- `npm run test:e2e:run`: passed; 5 tests passed and the desktop copy of the
  mobile-only touch test was intentionally skipped
- `npm run check`: passed from typecheck through production-preview E2E

The local shell used Node.js `25.3.0` and npm `11.13.0`, so `npm ci` emitted the
expected engine warning for the repository's pinned npm `10.9.2`. The
authoritative CI job installs and runs the supported reference toolchain,
Node.js `22.14.0` with npm `10.9.2`.
