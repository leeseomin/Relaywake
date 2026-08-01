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

Choose an operative and field theme, survive escalating enemy waves, combine upgrades, defeat the final boss, and carry earned coins into later runs. The level preserves the upstream project's 600-second timeline with progression-driven spawn rates, enemy probabilities, and health scaling.

## Controls

| Action | Keyboard / mouse | Mobile |
| --- | --- | --- |
| Move | `WASD` or arrow keys | Virtual joystick |
| Pause / resume | `P`, `Esc`, or the HUD pause button | Pause button |
| Choose a level-up upgrade | `1`, `2`, `3`, or click a card | Tap a card |
| Attack | Automatic | Automatic |

## Technology

- **Runtime:** Vue 3, Pinia, Phaser 4.2.1, TypeScript, Zod, and Dexie with IndexedDB
- **Tooling:** Vite, Vitest, and Playwright

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

### Credits and provenance

**RELAYWAKE** is developed and maintained by [**leeseomin**](https://github.com/leeseomin). It began as a browser adaptation and substantial refactor of [VampireSurvivorsClone at commit `01f8c76`](https://github.com/matthiasbroske/VampireSurvivorsClone/tree/01f8c76e40f52b853117f436d6d3d08f80a41506) by Matthias Broske.

- **Created for RELAYWAKE:** the Vue and Phaser web implementation, UI and persistence layer, name and visual identity, pixel art for all five playable characters and all eight enemy and boss sprites, the theme-selection screen and two base field textures, and the fire-orb weapon.
- **Adapted or retained from upstream:** gameplay and progression rules, the existing weapon set and weapon images, and selected rendering, pickup, and icon assets.

VampireSurvivorsClone is [described by its author](https://matthiasbroske.github.io/vampire-survivors.html) as a from-scratch Unity game inspired by poncle's [Vampire Survivors](https://poncle.games/vampire-survivors). RELAYWAKE is not affiliated with or endorsed by poncle.

### License

Except for third-party materials identified in [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md), RELAYWAKE-authored code, modifications, and original assets are licensed under the [`MIT License`](LICENSE). Adapted portions of VampireSurvivorsClone retain the upstream MIT terms and copyright notice included in the root [`LICENSE`](LICENSE).

| Material | Copyright |
| --- | --- |
| Portions adapted from VampireSurvivorsClone, excluding separately credited assets | © 2024 Matthias Broske |
| RELAYWAKE modifications and original content | © 2026 leeseomin |

See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for detailed asset provenance, credits, and license terms.
