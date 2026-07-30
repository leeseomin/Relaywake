# Relaywake asset metrics

`src/game/assets.ts` is the canonical inventory for every file under
`public/assets`. It records runtime consumers, exact dimensions and sprite
frames, upstream or internal provenance, modifications, and license evidence.
`BootScene` and the integrity suite consume that same manifest.

## `dirt-red.png` optimization

The reddish dirt layer is rendered over the 512×512 base dirt texture at
`alpha = 0.11` with additive blending. The original 2048×2048 source was
downscaled with a wrap-aware Lanczos filter, stripped of ancillary metadata,
and retained as lossless RGBA PNG.

| Metric | Before | After | Reduction |
| --- | ---: | ---: | ---: |
| Dimensions | 2048×2048 | 512×512 | 93.75% pixels |
| Encoded bytes | 2,948,342 | 243,891 | 91.73% |
| Decoded RGBA bytes | 16,777,216 | 1,048,576 | 93.75% |

The integrity test caps the encoded file at 250,000 bytes and decoded memory at
1 MiB so a future asset replacement cannot silently restore the previous cost.
A 2×2 repeated-tile composite was also inspected after the wrap-aware resize;
it retained the original texture character without a hard edge at tile seams.

The replacement play and potion assets were composited over the production
near-black UI color (`#080b14`) during visual QA. The play triangle remained
high contrast, and the potion remained identifiable as a single health item at
its approximately 26px gameplay size.

## Runtime preload policy

Only manifest entries with the `phaser` consumer are loaded into Phaser's
TextureManager. DOM/CSS-only icons and the four retained upstream-reference
files (`pickup-gem-dark`, `pickup-gem-light`, `ui-circle-outline`, `ui-pause`)
remain available without consuming game-scene texture memory.
