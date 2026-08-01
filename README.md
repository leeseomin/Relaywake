# RELAYWAKE

**A 10-minute browser-based survival action game built with Vue, Phaser, and TypeScript.**

### [🎮 Play RELAYWAKE Online →](https://relaywake.pages.dev/)

### ▶️ Gameplay Demo — https://youtu.be/6N-1Kv-qeXk

[![Watch the RELAYWAKE demo](https://img.youtube.com/vi/6N-1Kv-qeXk/maxresdefault.jpg)](https://youtu.be/6N-1Kv-qeXk)

---

## Gameplay

Choose one of five operatives and a field theme for a 10-minute run. Combine 21 active and passive upgrades while facing six enemy families, a mid-run mini-boss, and a final boss. Earned coins carry into later runs.

Weapons attack automatically and range from shuriken and bleeding daggers to melee arcs, orbiting axes, grenades, bazookas, and persistent fire zones.

RELAYWAKE supports keyboard and mobile controls, six interface languages—Korean, English, Japanese, Simplified Chinese, Spanish, and French—and local profiles, settings, and run history.

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
