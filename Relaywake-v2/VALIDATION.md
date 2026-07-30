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

Verified for the 2.2.0 Fire Master integration on 2026-07-30:

- parsed every TypeScript file and every `<script>` block in Vue SFCs with the
  TypeScript parser; no syntax diagnostics
- `node --check dist/assets/index-Di1iG5Er.js`: passed
- public asset inventory: 42 image files with manifest/path/dimension parity
- Fire Master sprite: 192×48 RGBA, four 48×48 frames
- Orbiting Fire Core: 24×24 RGBA and one connected visible pixel component
- Chromium production-bundle smoke test: five character cards rendered; Fire
  Master selected; `characterId = "fire"`; one fire orbiter created; no page
  errors or failed asset requests
- forced-contact Chromium combat smoke: the fire core dealt its direct hit and
  applied a positive burn timer/damage state without page errors
- the existing axe and new fire core are represented as independent orbit
  groups, and the Fire Master modifiers are scoped to `fireOrb` and `molotov`

The supplied archive did not include `node_modules`, and the package registry
was unavailable in this execution environment. Therefore the full dependency-
based `npm run check` gate was not rerun after the 2.2.0 changes. Run the clean
local commands above in a networked environment before publishing a release.
