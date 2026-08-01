# RELAYWAKE

**A 10-minute browser survival-action game built with Vue, Phaser, and TypeScript.**

### [▶ Play RELAYWAKE](https://relaywake.pages.dev/)

---

## At a glance

| | |
| --- | --- |
| **Platform** | Desktop and mobile web |
| **Run length** | 10 minutes |
| **Operatives** | 5 characters with distinct starting weapons and stats |
| **Upgrades** | 21 active and passive abilities |
| **Persistence** | Local profiles, settings, coins, and run history in IndexedDB |
| **Languages** | English and Korean |

## Highlights

- Automatic weapons, shuriken, bleeding daggers, melee arcs, orbiting axes, lightsabers, machetes, grenades, bazookas, and persistent fire zones
- Six regular enemy families with ranged, boomerang, and gravity attacks
- Mid-run mini-boss and final boss encounters
- Experience gems, coins, healing, magnets, bombs, and upgrade chests
- Keyboard controls and a mobile virtual joystick
- Configurable sound effects, screen shake, damage numbers, and language
- Deterministic E2E builds kept separate from the production bundle
- Schema-validated IndexedDB recovery that prevents malformed local data from blocking startup

## Gameplay

Choose an operative and field theme, survive escalating enemy waves, combine upgrades, defeat the final boss, and carry earned coins into later runs. The level preserves the original 600-second timeline with progression-driven spawn rates, enemy probabilities, and health scaling.

## Controls

| Action | Keyboard / mouse | Mobile |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Virtual joystick |
| Pause / resume | `P`, `Esc`, or the HUD pause button | Pause button |
| Choose a level-up upgrade | `1`, `2`, `3`, or click a card | Tap a card |
| Attack | Automatic | Automatic |

## Technology

- Vue 3 and Pinia for application UI and state
- Phaser 4.2.1 for the real-time game runtime
- TypeScript in strict mode
- Zod for game-data and persistence validation
- Dexie and IndexedDB for local persistence
- Vite for development and production builds
- Vitest and Playwright for automated validation

## Project structure

```text
src/
├─ app/                 # Typed Phaser-to-Vue events and app utilities
├─ components/          # Menu, HUD, dialogs, settings, and touch controls
├─ game/
│  ├─ core/             # RNG, curves, XP, combat math, and shared types
│  ├─ data/             # Schema-validated characters, enemies, abilities, and level data
│  ├─ scenes/           # BootScene and SurvivorScene
│  ├─ systems/          # Abilities, spawning, spatial queries, and object pools
│  ├─ GameController.ts # Phaser lifecycle and Vue command boundary
│  └─ sceneBridge.ts    # Runtime port for the active game scene
├─ persistence/         # Dexie database and Zod persistence schemas
└─ stores/              # Profile, settings, and session stores
```

## Local development

Requirements: Node.js `^20.19.0 || >=22.12.0` and npm `>=10.9.2 <12`.

```bash
npm ci
npm run dev
```

Run the complete local release gate with:

```bash
npm run check
```

## Credits and licenses

RELAYWAKE is a web reimplementation inspired by [matthiasbroske/VampireSurvivorsClone](https://github.com/matthiasbroske/VampireSurvivorsClone). The upstream MIT license is preserved in [`LICENSE`](LICENSE).

Asset provenance, third-party credits, and license evidence are documented in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) and the canonical manifest at [`src/game/assets.ts`](src/game/assets.ts). The Unity-to-web implementation mapping is recorded in [`MIGRATION.md`](MIGRATION.md).
