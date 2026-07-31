# Third-party notices

## Original VampireSurvivorsClone project

The source application and the ported image bundle in `public/assets` come from
[matthiasbroske/VampireSurvivorsClone](https://github.com/matthiasbroske/VampireSurvivorsClone)
at commit `01f8c76e40f52b853117f436d6d3d08f80a41506`, by Matthias Broske and
the artists credited in that repository. The upstream repository declares an
MIT License, preserved in the root `LICENSE`, and separately credits Kenney and
Bonsaiheldin for art. Exact upstream paths, attribution confidence, license
evidence, and any local transformations are recorded per file in
`src/game/assets.ts`; the manifest does not assume Matthias Broske owns every
third-party image in the bundle.

The two coin textures are from Bonsaiheldin's
[Gold treasure icons 16x16](https://opengameart.org/content/gold-treasure-icons-16x16)
under CC0. `pickup-magnet` is credited to Kenney; Kenney states that assets on
its asset pages are CC0, although the upstream project does not record the
magnet's exact original pack URL.

`public/assets/ui/play.png` and `public/assets/pickups/potion.png` are
Relaywake-specific replacements created with OpenAI-assisted image generation
on 2026-07-30 and locally processed into transparent PNGs. They are
Relaywake-owned assets, are distributed under the root MIT License, and are not
attributed to the upstream repository.

`public/assets/characters/roseglass.png`, `startail.png`, `moonhare.png`, and
`dunehorn.png` were exported from the user-provided, bundled
`pixel-character-maker-mongle.html` source with fixed seeds and explicit part
selections. Each 24×24 A/B walk pair was expanded to an A/B/A/B four-frame
Phaser sheet without smoothing, then its upper 14 rows were locked to the A
pose so the eyes and face remain fixed while the lower body moves. The exact
seeds and options are recorded in `src/game/assets.ts`. These Relaywake
project-derived assets are distributed under the root MIT License.

`public/assets/characters/fire.png` and `public/assets/weapons/fire-orb.png`
were locally redrawn from the user-provided, bundled `kite-fire-v2.html` source.
The character preserves its coral clothing, dark wavy hair, and walking
silhouette; the orb preserves the source `PIXEL_ORB_MATRIX` and fire palette.
Their project provenance and transformations are recorded in
`src/game/assets.ts` and they are distributed under the root MIT License.

## Runtime libraries

This project references Vue, Phaser, Pinia, Zod, Dexie, Vite, Vitest and Playwright through `package.json`. Each dependency remains subject to its own license as distributed by its publisher. No dependency source or `node_modules` directory is bundled in this archive.
