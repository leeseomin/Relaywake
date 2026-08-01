# Third-party notices

Except for the third-party materials identified below, RELAYWAKE-authored code,
modifications, and project-created assets are made available under the root
[`MIT License`](LICENSE).

## Upstream VampireSurvivorsClone project

RELAYWAKE began as a browser port and substantial refactor of
[matthiasbroske/VampireSurvivorsClone at commit `01f8c76`](https://github.com/matthiasbroske/VampireSurvivorsClone/tree/01f8c76e40f52b853117f436d6d3d08f80a41506).
Selected gameplay rules, progression data, and image assets were adapted from
that Unity project into a new Vue, Phaser, and TypeScript implementation.
The current presentation does not use the upstream playable-character or enemy
sprites: all five visible playable characters and all eight enemy and boss
sprites are RELAYWAKE-specific pixel art. RELAYWAKE also adds its own field
theme-selection interface, two base field textures, a fire-orb weapon, complete
UI and interaction design, name, and visual identity. The existing upstream
weapons and their image assets otherwise remain in use, with their runtime
behavior implemented inside the web architecture. Selected upstream pickup,
icon, tint, and noise textures are documented in the asset manifest.

VampireSurvivorsClone is
[described by its author](https://matthiasbroske.github.io/vampire-survivors.html)
as a from-scratch Unity game inspired by poncle's
[Vampire Survivors](https://poncle.games/vampire-survivors). RELAYWAKE is not
affiliated with or endorsed by poncle. Vampire Survivors is referenced only to
identify the upstream project's stated inspiration.

The upstream repository declares an
[MIT License](https://github.com/matthiasbroske/VampireSurvivorsClone/blob/01f8c76e40f52b853117f436d6d3d08f80a41506/LICENSE),
including `Copyright (c) 2024 Matthias Broske`. That notice and the MIT terms
are retained in the root [`LICENSE`](LICENSE). The upstream README separately
credits Kenney and Bonsaiheldin for art, so this notice does not assume that
Matthias Broske owns every image distributed by the upstream project.

The canonical [`asset manifest`](src/game/assets.ts) currently identifies 25
files as upstream assets. It records each upstream path, the pinned commit,
known transformations, attribution confidence, and license evidence. Unless a
more specific source is identified below, those files are redistributed on the
basis of the upstream repository's license and credit record; their exact
original art source and file-level licensing have not been independently
verified.

The two coin textures are from Bonsaiheldin's
[Gold treasure icons 16x16](https://opengameart.org/content/gold-treasure-icons-16x16)
under CC0. `pickup-magnet` is credited to Kenney. Kenney's
[official support page](https://kenney.nl/support) states that assets published
on its asset pages are CC0, although the upstream project does not identify the
magnet's exact original pack URL.

## RELAYWAKE-specific artwork

The asset manifest currently identifies 16 `project-derived` files and two
OpenAI-assisted `generated` files. These 18 assets were created specifically
for RELAYWAKE by leeseomin and are made available under the root MIT License to
the extent that leeseomin holds applicable rights. They are not attributed to
the upstream repository.

- `public/assets/backgrounds/dirt.png` and `dirt2.png` are RELAYWAKE field
  textures supplied and selected by leeseomin.
- All five files under `public/assets/characters` are RELAYWAKE character art.
  `roseglass.png`, `startail.png`, `moonhare.png`, and `dunehorn.png` were
  exported with fixed seeds and explicit part selections from a development
  source created by leeseomin. The source is preserved in repository history at
  commit `02729c49d6354df6ee66349b407b2faa664c6f1d` as
  `Relaywake-v3/pixel-character-maker-mongle.html`, but it is not included in
  the current tree. Each 24×24 A/B walk pair was expanded to an A/B/A/B
  four-frame Phaser sheet without smoothing, with the upper 14 rows locked to
  the A pose so that only the lower body moves.
- The eight files under `public/assets/enemies` are RELAYWAKE enemy and boss
  sprites created by leeseomin using `monster-generator.html`, preserved in
  repository history at commit
  `56f2e85916a9babd814baaf6c9ce318d76ece3b9` but not included in the current
  tree. Their fixed seeds and final transformations are recorded in the asset
  manifest.
- `public/assets/characters/fire.png` and
  `public/assets/weapons/fire-orb.png` were redrawn from a
  development source created by leeseomin. The source is preserved in
  repository history at commit
  `02729c49d6354df6ee66349b407b2faa664c6f1d` as
  `Relaywake-v3/kite-fire-v2.html`, but it is not included in the current tree.
  The character preserves the source's coral clothing, dark wavy hair, and
  walking silhouette; the orb preserves its `PIXEL_ORB_MATRIX` and fire
  palette.
- `public/assets/ui/play.png` and `public/assets/pickups/potion.png` are
  RELAYWAKE-specific replacements created with OpenAI-assisted image generation
  on 2026-07-30 and locally processed by leeseomin into transparent PNGs.

Exact seeds, selections, dimensions, transformations, consumers, and
per-file license evidence are recorded in the
[`asset manifest`](src/game/assets.ts).

## Software dependencies

The production application bundles Vue, Phaser, Pinia, Zod, and Dexie into its
JavaScript output. Vue, Phaser, Pinia, and Zod declare the MIT License; Dexie
declares Apache-2.0. Vite, Vitest, Playwright, TypeScript, and the other
development dependencies listed in [`package.json`](package.json) remain under
the licenses declared by their publishers. The source repository does not
commit `node_modules`; production distributions must preserve any license and
notice materials required by their bundled dependencies.
