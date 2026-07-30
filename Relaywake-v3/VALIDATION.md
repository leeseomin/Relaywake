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

## Current package verification

Verified for the 3.0.0 Mongle operative replacement on 2026-07-30:

- parsed 46 TypeScript files and Vue `<script>` blocks with the TypeScript 5.8
  parser; no syntax diagnostics
- transpiled and executed `src/game/assets.ts` independently; all 42 public
  image files match the manifest in both directions, including byte-derived
  formats, dimensions, and frame geometry
- Sprout Runner, Star-Tail Thief, Moonhare Warden, and Dunehorn Bruiser each
  ship as a 96×24 RGBA sheet containing four 24×24 frames
- the four source and production copies have matching SHA-256 hashes, and the
  removed `blue.png`, `purple.png`, `white.png`, and `gray.png` files and their
  runtime asset references are absent
- Fire Master's source and production sprite SHA-256 remains
  `256e3ac9419c59db58bc049b9b6f07306f9faaad435ebe067149df7a47178235`,
  identical to the supplied Relaywake-v2 archive
- `node --check dist/assets/index-8aa7c9a3.js`: passed
- Chromium menu smoke: five cards rendered with the four new Korean names and
  unchanged Fire Master; every card resolves to its expected new image path;
  no page errors
- deterministic Chromium gameplay smoke: all five selections entered a ready
  Phaser scene with the expected save-compatible `characterId`; Moonhare kept
  the axe orbiter and Fire Master kept its dedicated fire orbiter; no page
  errors

`npm ci` was attempted, but the execution environment's package mirror returned
HTTP 404 for the locked `zod-4.4.3.tgz`. Consequently the dependency-based
`npm run check` gate could not be rerun here. The tracked source, manifest,
production bundle, and browser smoke checks above were completed, but a clean
networked environment should still run the release gate before publication.
