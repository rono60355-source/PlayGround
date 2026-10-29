# LUMENFALL — The Studybound Atlas

A browser-based 3D study-puzzle adventure built with Three.js and Vite. Each day you name a study subject and focus; three short missions restore three beacons and open a stylized fantasy world.

## Play

```bash
npm install
npm run dev
```

Open the URL printed by Vite (defaults to `http://localhost:3002`). For a production build:

```bash
npm run build
npm run preview
```

## How the game works

- Choose one of six subjects and name today’s focus.
- Complete three study missions, each with three questions.
- Correct answers restore the beacon and unlock the next waygate and two Aether charges.
- The three sectors are **Verdant Reach**, **Prism Hollow**, and **Skybound Archive**.
- Progress is saved locally for the current day and can be resumed after a reload.
- Combat calms abstract crystal wards but never advances study progress. Study is the only key.

## Controls

- **Desktop:** WASD / arrow keys to move, mouse to look, click to fire (after earning a charge), E to interact, F to fire, Esc for settings.
- **Touch:** drag the left joystick to move, drag the scene to look, tap **Fire**, and use the on-screen prompt to interact.
- **Tilt:** optional look control on supported phones/tablets; enable it in Settings and grant motion permission when asked.

## Project structure

- `src/game.js` — game state, movement, missions, persistence, controls.
- `src/world.js` — renderer, lighting, sky, zones, monsters, effects.
- `src/world/` — forest, cave, archive, props, shaders, and terrain utilities.
- `src/data.js` — subjects, topics, question banks, and daily trial generation.
- `src/ui.js` — planner, HUD, puzzles, rewards, settings, and travel UI.
- `src/weapon.js` — the Aether prism viewmodel.
- `src/style.css` — responsive interface styling.
