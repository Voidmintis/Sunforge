# Sunforge

Pilot your ship through procedurally generated star systems, gather resources from unique planets, and complete missions to rebuild your homeworld. Timewarp across deep space, discover rare materials, and eventually harness starlight itself with powerful Dyson spheres.

![Sunforge gameplay screenshot](https://github.com/user-attachments/assets/e18bce83-0c5e-44f2-9089-72d514921799)

## How to Play

Open `index.html` in a modern browser (Chrome / Edge / Firefox). No build step required.

### Controls

| Action | Key / Button |
|---|---|
| Move forward / back | W / S |
| Strafe left / right | A / D |
| Move up / down | Space / Shift |
| Free-look around cockpit | Hold **Right Mouse Button** + drag |
| Collect planet resources | **E** (when close to a planet) |
| Deliver mission materials | **F** (when inventory is full) |
| Timewarp | Hold **T** |
| Build Dyson Sphere | **B** (near a star, unlocked after mission 7) |

### Gameplay Loop

1. **Explore** the star system. Planets containing materials needed for your active mission glow **yellow**.
2. **Fly close** to a planet and press **E** to collect its resources.
3. Once you have all required materials, press **F** to deliver them and complete the mission.
4. Each completed mission restores a portion of your **Home Planet**. Ten missions bring it to full restoration.
5. After mission 7, fly close to a star and press **B** to construct a **Dyson Sphere** — harnesses solar energy for the final missions.

### Features

- First-person cockpit with three interactive dashboard screens (mission terminal, navigation map, ship status)
- 28 procedurally generated star systems with 2–5 planets each
- 11 resource types across 6 planet biomes (rocky, ice, forest, volcanic, gas, ocean)
- 10 escalating missions tied to home planet restoration progression
- Planet yellow-highlight system for mission-relevant resources
- Timewarp / lightspeed with star-streak visual effect and limited fuel
- Dyson sphere construction as a late-game power milestone
- Full heads-up display: mission tracker, scanner, cargo, speed, compass

## Files

| File | Description |
|---|---|
| `index.html` | Game entry point |
| `game.js` | All game logic (Three.js scene, galaxy generation, missions, HUD) |
| `style.css` | Sci-fi HUD and UI styling |
| `vendor/three.min.js` | Three.js r158 (bundled locally for offline use) |
