# RELAYWAKE itch.io release resources

This directory contains the upload-ready HTML5 build and the store-page media requested in `itch.md`.

| Resource | Path | Notes |
| --- | --- | --- |
| Browser game ZIP | `relaywake-itch.zip` | ZIP root contains `index.html`; 49 files; about 1.6 MB compressed |
| Cover | `assets/relaywake-cover-630x500.png` | Exact itch.io cover size: 630 × 500 |
| Editable cover background | `assets/relaywake-cover-source.png` | Text-free generated source used for the final cover |
| Gameplay capture | `assets/relaywake-gameplay.webp` | Direct gameplay screen capture converted to a static WebP at 1099 × 1096; local reference only, not an itch.io upload |
| Trailer | `https://youtu.be/6N-1Kv-qeXk` | YouTube URL to register as the itch.io project trailer |
| Screenshots | `screenshots/*.png` | Two finalized normal-build captures at 2370 × 1370 and 2062 × 1536 |
| Page copy | `PAGE.md` | Ready-to-paste English metadata and description |
| Publishing guide | `UPLOAD_CHECKLIST.md` | itch.io settings and pre-publish checks |

## Cover provenance

The cover background was generated with the built-in OpenAI image-generation tool using `webp/5s.webp` as a style and subject reference. The exact `RELAYWAKE` title, subtitle, feature line, crop, and border were then added locally so the store text is deterministic and correctly spelled.

For itch.io, set **Generative AI disclosure** to **Yes — Graphics** because of the generated cover background. The gameplay screenshots and `relaywake-gameplay.webp` are direct captures of the game rather than separately AI-generated marketing images. The static WebP is retained only as a local reference; use the YouTube URL as the itch.io trailer.

Final generation prompt:

> **Use case:** ads-marketing  
> **Asset type:** itch.io game cover background, final crop 630×500  
> **Primary request:** Create a polished, dramatic pixel-art survival-action key art background for the browser game RELAYWAKE, faithfully inspired by the provided gameplay reference.  
> **Input image:** `webp/5s.webp` is the style and subject reference; preserve its chunky pixel-art language, dirt-and-starlight battlefield palette, pink operative, horned orange enemies, gray visor enemies, blue/red gems, coins, shuriken, blades, and glowing fire-orb effects.  
> **Scene:** Dense top-down battlefield at night, with more cinematic lighting and clearer hierarchy than raw gameplay.  
> **Composition:** One pink operative near the lower-center fighting through a surrounding swarm; crop cleanly to 630×500; reserve the upper-left quarter as a dark, low-detail title area.  
> **Style:** Crisp handcrafted 2D pixel art, faithful to the supplied sprites rather than realistic painting or 3D.  
> **Palette:** Charcoal brown, midnight navy, cyan, hot magenta, and amber.  
> **Constraints:** No text, logos, UI, border, or watermark; no human faces; no photorealism, smooth vector art, or 3D rendering.

## Reproduction

```bash
npm ci
npm run package:itch
npm run verify:itch
```

`package:itch` creates a production build without test controls and packages only the contents of `dist`, so `index.html` is at the ZIP root. Do not run `capture:itch` for the published store images: it uses the shortened E2E build and would overwrite the two finalized normal-build screenshots.
