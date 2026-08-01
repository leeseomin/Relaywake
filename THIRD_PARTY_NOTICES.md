# Third-party notices

Except for the third-party materials identified below, RELAYWAKE-authored code,
modifications, and original assets are made available under the root
[`MIT License`](LICENSE).

## VampireSurvivorsClone

RELAYWAKE incorporates selected gameplay data and image assets from
[matthiasbroske/VampireSurvivorsClone at commit `01f8c76`](https://github.com/matthiasbroske/VampireSurvivorsClone/tree/01f8c76e40f52b853117f436d6d3d08f80a41506).
The exact list of retained or adapted assets and their upstream paths is
recorded in [`src/game/assets.ts`](src/game/assets.ts).

The upstream repository is distributed under the
[MIT License](https://github.com/matthiasbroske/VampireSurvivorsClone/blob/01f8c76e40f52b853117f436d6d3d08f80a41506/LICENSE):

> Copyright (c) 2024 Matthias Broske

That copyright notice and the MIT terms are retained in the root
[`LICENSE`](LICENSE). The upstream README separately credits Kenney and
Bonsaiheldin for artwork. The original file-level sources and licenses of some
upstream assets have not been independently verified.

## Asset provenance

- `public/assets/backgrounds/dirt.png` is retained byte-for-byte from upstream
  `Assets/Textures/Backgrounds/DirtTile.png` at the pinned commit.
- `public/assets/pickups/coin.png` and `coin-10.png` are from Bonsaiheldin's
  [Gold treasure icons 16x16](https://opengameart.org/content/gold-treasure-icons-16x16)
  under CC0.
- `public/assets/pickups/magnet.png` is credited to Kenney. Kenney's
  [official support page](https://kenney.nl/support) states that assets
  published on its asset pages are CC0, although the exact original pack for
  this file has not been identified.

Unless a more specific source is identified above, retained upstream assets
are redistributed on the basis of the upstream repository's license and credit
record. Per-file source paths, transformations, and license evidence are
recorded in [`src/game/assets.ts`](src/game/assets.ts).

## Runtime dependencies

The production application bundles Vue, Phaser, Pinia, and Zod under the MIT
License, and Dexie under Apache-2.0. Exact dependency versions are listed in
[`package.json`](package.json). The production distribution includes the
project license in [`public/LICENSE.txt`](public/LICENSE.txt) and the bundled
dependency licenses and notices in
[`public/THIRD_PARTY_LICENSES.txt`](public/THIRD_PARTY_LICENSES.txt).
