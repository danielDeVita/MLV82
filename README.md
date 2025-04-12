# Canvas Side Scroller (Working Title: Falklands/Malvinas Conflict)

A 2D side-scrolling airplane shoot 'em up game built with HTML5 Canvas and vanilla JavaScript, set during the 1982 Falklands/Malvinas conflict.

## Gameplay

- Control a Mirage III aircraft moving horizontally and vertically.
- Shoot down incoming enemy aircraft and destroy ground/sea targets.
- Engage waves of increasingly difficult enemies and face challenging boss encounters.
- Utilize machine guns and bombs against different target types.
- Dodge enemy fire, including bullets, artillery, tracking missiles, mines, and laser beams.
- Collect power-ups to enhance weapons, gain shields, rapid fire, invincibility, or extra lives.
- Survive through dynamic background transitions simulating different times of day (Day -> Afternoon -> Night).

## Controls

- **Arrow Keys / WASD:** Move Player Aircraft (Up, Down, Left, Right)
- **Spacebar:** Fire Machine Guns / Bullets
- **B Key:** Drop Bombs / Use Super Bomb (if armed)

## Enemy Types

### Regular Enemies

- **EnemyPlane (Basic Harrier):** Simple sine wave movement.
- **EnemyShooterPlane (Purple Harrier):** Fires bullets straight left, tougher than basic.
- **EnemyDodgingPlane (Orange Harrier):** Fast sine wave, reactive dodging, fires bullets.
- **EnemyMineLayerPlane (Dark Orange Harrier):** Drops stationary air mines (appear after Boss 2).
- **EnemyShip (Basic Frigate):** Slow, tough against bullets, vulnerable to bombs.
- **EnemyShooterShip (Blue Destroyer):** Fires angled shots upwards frequently.
- **EnemyTrackingShip (Indigo Destroyer):** Fires homing missiles (appear after Boss 1).
- **EnemyBeamShip (Dark Blue Ship):** Stops, charges, and fires a damaging diagonal laser beam (appear after Boss 2).

### Bosses

- **Boss 1 (Destroyer):** Patrols horizontally. Features multiple destructible weak points:
  - Aimed Artillery (Fore)
  - Forward Spread Gun (Mid-Front, fires left)
  - Rear Spread Gun (Mid-Aft, fires right)
  - Missile Launcher (Aft)
  - _Difficulty increases and helper planes spawn as weak points are destroyed._
- **Boss 2 (Avro Vulcan Bomber):** Flies in a complex sine wave pattern, periodically dipping lower. Attacks with:
  - Downward Bullet Barrage (from wings)
  - Tracking Missiles
  - Carpet Bombing Runs
  - _Summons helper ships at health thresholds._
- **Boss 3 (Airfield Installation):** Stationary base covering the lower screen. Features multiple destructible weak points that must be destroyed:
  - Upward Spread Guns (Multiple, fire tilted inwards)
  - Radar Dish
  - Hangars (Periodically spawn EnemyShooterPlanes)
  - Fixed Artillery Emplacements (Fire single shots upwards - not destructible)
  - Low-Altitude Missile Launchers (Integrated - not destructible)
  - Low-Altitude Artillery/Mortars (Integrated - not destructible)
  - Low-Altitude Horizontal Spread Shot (Integrated - not destructible)
  - _Fight ends when all destructible weak points (Spread Guns, Radar, Hangars) are destroyed._

## Power-Ups

- **Bullet Power ('P'):** Increases bullet damage/size.
- **Bomb Power ('B'):** Increases regular bomb damage/size.
- **Spread Shot ('W'):** Adds angled shots alongside the main bullet.
- **Shield ('S'):** Absorbs one hit.
- **Extra Life ('L'):** Grants an additional life (up to max).
- **Rapid Fire ('R'):** Temporarily increases firing speed.
- **Invincibility ('I'):** Temporary invulnerability (visual blink effect).
- **Super Bomb ('S' - Gold):** Arms a special bomb. Pressing 'B' drops it. Direct hit destroys planes; water impact heavily damages all ships on screen.

## Technical Details

- **Engine:** Vanilla JavaScript (ES6 Modules)
- **Rendering:** HTML5 Canvas 2D Context
- **Structure:** Class-based (Game, Player, Enemies, Bosses, Projectiles, PowerUps, etc.)
- **Physics:** Simple position updates (direct and lerped), AABB collision detection (with beam approximation).
- **Background:** Hybrid approach - Parallax scrolling layers via CSS animations, dynamic Sky/Sun/Moon/Stars via Canvas drawing.

## How to Run

1.  Clone or download the repository.
2.  Ensure you have `.wav` files in a `sounds/` directory for all sounds listed in `js/audio.js`.
3.  Ensure you have `.png` files in an `images/` directory for all background layers referenced in `style.css`.
4.  Open the `index.html` file in a modern web browser that supports ES6 Modules. Running from a local web server (like VS Code Live Server or `python -m http.server`) is recommended for best compatibility and to avoid potential file loading restrictions.

## Testing Specific Stages

To test specific parts of the game without playing through:

1.  Open `js/main.js`.
2.  Locate the section `// --- CHOOSE YOUR STARTING CONFIGURATION ---`.
3.  Comment out the default `const gameConfig = {};`.
4.  Uncomment the specific test configuration block you want (e.g., `// Test Boss 2 Start:`).
5.  Modify the `startScore`, `startDifficulty`, `playerLives`, `defeatedBosses`, and `startWithPowerups` values within that uncommented block as needed.
6.  Save `main.js` and reload the game in your browser.
7.  **Remember to revert back to the default config (`const gameConfig = {};`) for normal play!**

---
