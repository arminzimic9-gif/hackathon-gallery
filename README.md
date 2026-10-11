# Hackathon Station

An original space-opera hackathon exhibition by Armin Zimić, integrated into the existing Möbius app `hackathon-gallery` (local app 12).

## Experience

Intro → three-species pilot creator → departure hangar with walking, jumping, blaster and training drones → board the fighter → hyperspace → 20-second asteroid/crystal flight → autopilot docking → Grand Gallery → lift → Command Bridge → Ceremony Hall.

The owner-supplied `src/*.js`, `src/station.css` and `assets/*` are preserved byte-for-byte from `hackathon-station.zip`. See `INTEGRATION.md` for the supplied integration contract. The standalone demo `index.html`, CDN import map and `window.__st` are not shipped; production does not use the `?jump=` development shortcut. Bare Three imports use Möbius's bundled dependency, not a runtime CDN.

## Möbius wiring

- `index.jsx` mounts `mountStation()` into the fixed full-screen `#station-root`, calls `dispose()` on unmount, and supplies `/app-assets/by-id/${appId}/${name}`.
- `station-css.js` is the exact supplied stylesheet encoded as a JS string, not a restyle. App-owned `station-cinematic-style.js` enhances that same skippable intro without adding a step; `station-tools-style.js` supports the retained management controls and keeps them clear of the flight buttons.
- `station-world-details.js` adds a neon cyan/magenta/amber arrival field at the existing docking mouth and proximity cards for artworks, bridge trophies, and the finalists holo-table. It reads art and winner names from the approved collection; unassigned trophy places remain unannounced. The supplied meshes, logic, and stylesheet remain untouched.
- Every supplied asset, including metadata and credits, is declared in `mobius.json`.
- `station-image-loader.js` configures the supplied GLTFLoader instances to use Three's standard image-element TextureLoader. The app-local parse hook registers this configuration before parsing and is removed on unmount. This restores embedded textures under Möbius's existing sandbox (image object URLs are allowed; fetch object URLs are not), without modifying supplied source, assets, browser APIs or platform policy. The hook exists because `mountStation` does not expose a loader factory; remove it if that explicit configuration seam becomes available.
- `station-service.js` owns transport. Visitors read through the service's public lane, which is what a published station answers with, while the owner's shell keeps the authenticated curator lane; the first read decides which applies, and a curator-lane failure afterwards is reported rather than silently downgraded. `station-participant.js`/`.jsx` add the participant sign-in and submission panels, and `station-score.js` synthesises the soundtrack.
- `station-integration.js` preloads `hs.pilot`, `hs.xp`, `hs.best`, `hs.verified` and `hs.audio` from the app's `device.storage` capability before mounting. Synchronous reads use that in-memory snapshot; writes are immediately visible then written through in key order. Failures are visible, not silently interpreted as empty saved preferences. No localStorage or alternate parent bridge is used.
- Existing approved service records map to `{id,title,author,caption,url}`. Image bytes are fetched with the app-scoped bearer and passed as data URLs; pending submissions never enter the station. Existing sample records remain marked as samples. No art or winners are invented.
- Winner places come from curation and preserve empty places (the supplied rooms index slots 1–3). Samples cannot become real winners.
- `onEvent('flight', {score,pilot})` reaches the Top Pilots board only for a signed-in participant, through the public `scores/submit` lane. The board name is the verified participant name (first 12 characters), never a self-declared callsign; the run carries only score and pilot colours. A guest's flight still counts locally as a personal best, and the station says so on screen with a way to sign in.
- **Music** is an original score synthesised at runtime by `station-score.js`: persistent pad/bass/noise voices retuned by a chord progression per place in the journey, plus scheduled plucks and bells, a generated convolution reverb, and sweeps for the hyperspace jump and docking. Moods follow the supplied engine's scene swaps and the flight scene's own mode, so no supplied file is edited. The context is built on the visitor's first gesture (PRESS START at the latest), as browsers require; `MUSIC ON/OFF` and the volume slider live in Station Tools and are remembered in `hs.audio`.
- **Station tools** holds the music control plus Submit work, Sign in / Participant, Top Pilots and About. Curate appears only where a curator credential exists, so a published visitor never sees a panel that cannot work. Walking and game keyboard handling are suspended while a panel has focus.
- **Shared room** is an optional, near-live view of other visitors' pilot models and callsigns in the same walkable room. It is off by default; choosing *See other pilots* shares the current callsign and position while the visit is active. The public service holds only short-lived room positions (30-second expiry), returns at most ten nearest peers, and never treats a callsign as a verified participant or posts an official score. Updates arrive about every eight seconds, so this is presence, not real-time racing or combat. It uses the existing service and its public rate limit; a large crowd on one network may need a dedicated real-time transport later. The supplied ZIP stays unchanged.
- The supplied station has no live collection-update API. Curator changes are saved immediately; closing the studio restarts the visit to apply them, preserving saved pilot/XP/best. This also clears the supplied module's image caches. The studio warns before that reload.

## Official trailer

`assets/trailer.mp4` (about 64 s, 1280x720, H.264/AAC, English subtitles burned in) is declared under `static_assets` and credited in `assets/CREDITS.txt`, the in-app About and the Store description: *By Via Creativa Studio for Möbius*; music by Gregor Quendel, CC BY 4.0. A **Watch trailer** button sits on the intro screen and in Station Tools. It opens a full-screen player (`station-trailer.jsx`) with the browser's controls; Esc or CLOSE returns to where you were. The video element is created only on click, so nothing is downloaded and the 3D load is never delayed. The trailer starts muted when MUSIC is OFF in Station Tools and otherwise starts at the slider volume; the live score is silenced while it plays and resumes afterwards.

## Store readiness

- Listing: tagline, description, icon (`icon.png`) and five screenshots (4 desktop, 1 phone, including the trailer player) are declared in `mobius.json` under `store`, with files in `static/store/`.
- Screenshots were captured from the published station with a neutral pilot callsign; none shows participant data.
- Checks before a release: `python3 -m pytest -q test_service.py`, `node --test test_station_integration.mjs`, and `python3 "$SCRIPTS_DIR/validate-app.py" .` (0 errors, 0 warnings).
- The package carries no database, keys, participant codes or submitted works; the 9 bundled gallery pieces are marked samples. The organiser issues participant codes in the Curate studio after install.
- Hosting, public publication and Store submission are owner decisions and are not done by the app.

## Existing data and moderation

Data stays under `APP_STORAGE_DIR` (`gallery.sqlite3`); it is never packaged into source. Collection capacity remains 56, and every existing art row and score row is retained.

Access follows the owner's decision of 8 October 2026: **guests explore, fly and play without an account, while submitting work and entering the official leaderboard require a participant sign-in.**

- The organiser issues participant codes in Admin → PARTICIPANTS (`codes/create`, up to 50 at a time, 2000 total, withdrawable individually). Signing in exchanges a code for an HMAC-signed token that expires after 30 days, is stored on the device as `hs.verified`, and is re-verified on load and on every write, so a withdrawn or expired code returns that visitor to guest.
- The signing key is generated once at `APP_STORAGE_DIR/participant.key` with owner-only permissions. No external identity provider or paid service is involved.
- `submit` records the verified code and name as the sender, so the moderation queue shows who is really behind a piece. The endpoint still answers at `/api/app-services/hackathon-gallery/submit` for another Möbius instance, and still requires a token.
- The public lane can read the approved collection, its media and the official boards; it cannot approve, curate, react, read the queue or list codes.

The package owns only the new station journey. Earlier visual/game modules remain in local history/source but are not mounted by this entry.

## Credits / About

- Concept, art direction and build: **Armin Zimić**.
- Rooms, ship and station: modelled and light-baked in **Blender** from code.
- three.js code: written with AI assistance (**Claude Code**).
- Möbius integration: **ChatGPT Astra**, credited as **GPT-6-Astra** at the owner's request.
- Pilot characters: **“Ultimate Space Kit” by Quaternius**, **CC0 1.0** (see `assets/CREDITS.txt`).
- Library: **three.js**, **MIT**.

## Verification

`python3 test_service.py -q` checks curation, moderation, uploads, scores, participant codes, token tampering and revocation, and the public/private boundaries with isolated temporary data. `node --test test_station_integration.mjs` checks storage ordering/failure, artwork mapping, winner slots, score adaptation, mood/scene classification, audio settings and the visitor lane choice. Rendered walkthrough evidence is recorded in the owning chat; headless-browser results do not certify real-device performance, audio or touch behaviour.

This is a local integration. Nothing has been published upstream. Offline operation is not promised.

## Maintenance Skill

The app ships `hackathon-station-maintenance.md` as a read-on-demand Möbius Skill for future Station maintenance. Station remains an app in Apps; it is not a remote MCP service in Integrations.
