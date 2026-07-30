# Validation record — v2.1.0

## Checks completed in this environment

- Parsed every project JSON file.
- Syntax-transpiled 56 TypeScript files and Vue `<script setup lang="ts">` blocks with the installed TypeScript compiler.
- Checked all 9 Vue templates for structurally balanced markup.
- Checked the global stylesheet for balanced blocks.
- Verified Korean and English localization tables expose the same 41 keys and that all statically referenced keys exist.
- Verified all 40 absolute `/assets/...` references resolve to files under `public/assets`.
- Strict-type-checked the new pure pause-state and keyboard-routing modules with `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, unused checks, and implicit-return checks enabled.
- Executed pure regression assertions confirming:
  - a stale `paused=true` transition cannot replace `levelUp`;
  - level-up completion returns to `playing`;
  - stale pause events cannot move the menu into gameplay;
  - held/repeated `P` input is ignored;
  - `P` cannot replace the level-up overlay;
  - number keys map to the expected upgrade slot.
- Added Vitest regression suites for hotkeys, session transitions, and Pinia overlay state.
- Expanded the Playwright flow to verify that level-up is visible while the pause dialog remains absent, then select an upgrade with the `1` key.
- Statically verified that `SurvivorScene.openLevelUp()` emits the dedicated `levelUp` event and no longer emits `paused=true`.

## Package-manager limitation

The environment's configured npm registry returned `404` for `@playwright/test`, and direct public-registry access timed out. Therefore dependency installation, the real `vue-tsc`/Vite production build, Vitest runner, and Playwright browser suite could not be executed here.

Run the complete verification in a normal npm environment:

```bash
npm install
npm run typecheck
npm run test
npm run build
npx playwright install chromium
npm run test:e2e
```
