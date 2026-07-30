# Changelog

## 3.0.0 — Mongle Operatives

### Changed

- Replaced the four original top-menu operatives with fixed 24×24 characters exported from the bundled `pixel-character-maker-mongle.html` generator.
- Renamed them to Roseglass Scout, Star-Tail Thief, Moonhare Warden, and Dunehorn Bruiser, with matching Korean names and descriptions.
- Converted each maker A/B walk pair into an A/B/A/B four-frame Phaser sprite sheet while preserving crisp transparent pixels.
- Locked the four Mongle operatives' eyes, faces, and heads while retaining restrained lower-body walk motion.
- Replaced Sprout Runner with the randomly generated Roseglass Scout: long rose hair, teal glasses, oval eyes, and a small tooth.
- Retained the legacy internal character IDs so existing local profiles and run records remain compatible.

### Preserved

- Fire Master, its 48×48 four-frame sprite, fire-orbit weapon, stats, bonuses, and selection treatment remain unchanged.
- Character combat statistics and starting abilities remain unchanged; this release changes the first four characters' visual identity and presentation only.

## 2.2.0 — Fire Master

### Added

- Added the selectable Fire Master character based on the bundled `kite-fire-v2.html` figure.
- Added a dedicated four-frame Fire Master sprite and pixel fire-core asset.
- Added the Orbiting Fire Core weapon with ember echoes and persistent burn damage.
- Added Fire Master bonuses for fire damage, cooldown, and duration.

### Improved

- Generalized orbiting weapons so the existing axe and the fire core can coexist.
- Extended local persistence, asset provenance, unit coverage, and end-to-end diagnostics for the new character.

## 2.1.0 — Pause-state fix and UX pass

### Fixed

- Prevented the level-up overlay from being overwritten by the manual pause overlay.
- Prevented stale pause events from changing menu, result, or level-up state.
- Ignored keyboard auto-repeat and modified shortcuts so a single held key cannot toggle pause repeatedly.
- Cleared touch movement and player momentum when pausing or entering level-up.
- Reset the mobile joystick after pointer cancellation, window blur, visibility changes, or overlay activation.

### Improved

- Centralized `P` / `Esc` handling in the Vue application state boundary.
- Added `1` / `2` / `3` upgrade selection and initial dialog focus.
- Added quit and profile-reset confirmation flows.
- Added low-health and final-minute HUD feedback, localized control hints, progress semantics, and reduced-motion support.
- Added graceful local-storage failure messaging and synchronized profile/settings reset behavior.
- Added regression coverage for level-up/pause state ordering and keyboard repeat behavior.
