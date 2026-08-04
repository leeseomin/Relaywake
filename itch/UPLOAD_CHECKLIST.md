# RELAYWAKE itch.io upload checklist

## Files and links to use

- **Game archive:** `relaywake-itch.zip`
- **Cover:** `assets/relaywake-cover-630x500.png`
- **Screenshots:** the two finalized normal-build PNG captures under `screenshots/`
- **Gameplay trailer:** `https://youtu.be/6N-1Kv-qeXk`

## Local reference only

- `assets/relaywake-gameplay.webp` is a direct gameplay screen capture converted to a static 1099 × 1096 WebP. It was not generated with AI and should not be uploaded to itch.io; use the YouTube URL above as the trailer.

## itch.io project settings

1. Create a new project and paste the title, short description, tags, and page body from `PAGE.md`.
2. Set **Kind of project** to **HTML**.
3. Set pricing to **$0 or donate** (or **No payments** if donations are not wanted).
4. Upload `relaywake-itch.zip` and mark it **This file will be played in the browser**.
5. Choose **Click to launch in fullscreen**. The game is responsive; use 1600 × 900 as the nominal viewport if itch asks for dimensions.
6. Enable **Mobile friendly** because the current build includes touch movement and touch buttons.
7. Upload the 630 × 500 cover and the finalized screenshots.
8. Add `https://youtu.be/6N-1Kv-qeXk` as the project trailer.
9. Under **Generative AI disclosure**, select **Yes** and enable **Graphics**. The disclosure is required because the store-cover background was generated with OpenAI image generation. The gameplay screenshots and static WebP are direct captures of the game, not separately AI-generated marketing images. Do not add AI-related tags manually; itch.io applies them from the disclosure form.
10. Save the page as restricted/draft first and test it in a private browser window.

## Pre-publish verification

- The game opens from the itch page and reaches the operative-selection screen.
- The YouTube trailer opens and plays from the project page.
- **Generative AI disclosure** shows **Yes — Graphics**.
- Character and field-theme art loads; browser console has no 404 responses.
- A run starts, keyboard movement works, and automatic attacks appear.
- Touch controls work on a real phone or device emulator.
- Level-up cards can be selected with 1–3 and by clicking/tapping.
- Pause/resume works with P, Esc, and the HUD button.
- Reloading the itch page preserves its own local settings and progress.
- The Cloudflare build still works independently; save data is not expected to sync across domains.

## Rebuild commands

```bash
npm run package:itch
npm run verify:itch
```

The packaging command builds in Vite's `itch` mode, uses relative asset URLs, verifies itch.io's 1,000-file and 500 MB uncompressed limits, and writes a ZIP whose root contains `index.html`. The verification command mounts the production build at a nested path, launches Chromium, and checks that the menu and game start without failed asset requests.

Do not run `npm run capture:itch` for the published store images. It uses the shortened E2E build and would overwrite the two finalized normal-build screenshots.
