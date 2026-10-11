# Hackathon Station: integration brief for the Möbius app

This package is a finished three.js experience. It runs as plain ES modules and needs only `three@0.169` (`three` and `three/addons/...`).
Integrate it into the existing **Hackathon Station** app (app id `hackathon-gallery`).
Keep the files as they are and change only what's listed under "Wiring".

## Flow
Intro → pilot creator (3 species, suit/visor/insignia) → hangar (walk, jump, blaster, training drones) → board your fighter → hyperspace → 20 s flight (steer, boost, lasers destroy asteroids, crystals) → autopilot dock → Grand Gallery (curated art) → lift → Command Bridge (winners) → Ceremony Hall (award show).

## Files
- `src/*.js`: engine, player, pilot, ui, space, rooms, weapons, art, main. Entry point: `mountStation(root, options)` in `src/main.js`.
- `src/station.css`: all overlay/HUD styles. Inject it as a `<style>` tag, for example by shipping it as a JS string module, as the app already does.
- `assets/`:
  - `*.glb` rooms and characters, plus `*_meta.json`. Every file is under 6 MB, about 19 MB in total.
  - Declare them all in `mobius.json` → `static_assets`.

## Wiring
```js
import { mountStation } from './src/main.js';
const asset = (name) => `/app-assets/by-id/${appId}/${name}`;
const st = await mountStation(rootDiv, {
  assetUrl: asset,
  art,          // curated collection: [{ id, title, author, caption, url }] (url = image URL). [] or null → placeholder posters
  winners,      // [{ place: 1|2|3, title, author, url? }] for the Command Bridge + Ceremony podium
  storage,      // sync adapter { getItem(k), setItem(k, v) }; back it with Möbius device storage (preload keys hs.pilot, hs.xp, hs.best, then write-through)
  onEvent: (type, data) => { /* 'pilot' → p, 'flight' → { score, pilot }: post flight scores to the Top Pilots service */ },
});
// on unmount: st.dispose()
```
- `art`: map the approved items from the existing curation pipeline (Admin.jsx / service) to `{ id, title, author, caption, url }`.
- Keep the Admin panel, curation, public submissions and the Top Pilots leaderboard exactly as they are.
- The root element must be a full-screen container (`position: fixed; inset: 0`). The app display is already set to fullscreen.
- Remove or ignore the dev shortcut `?jump=` and `window.__st` in `index.html`. They are for local testing only.

## Credits (show these in the app's README / about screen)
- Concept, art direction and build: **Armin Zimić**.
- Rooms, ship and station: modelled and light-baked in **Blender** from code.
- three.js code: written with AI assistance (**Claude Code**).
- Möbius integration: done by the Möbius agent (**ChatGPT Astra**).
- Pilot characters: "Ultimate Space Kit" by **Quaternius**, CC0 1.0 (see `assets/CREDITS.txt`).
- Library: three.js (MIT).
