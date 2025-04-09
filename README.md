# Canvas Side Scroller (Working Title)

A 2D side-scrolling airplane shoot 'em up game built with HTML5 Canvas and vanilla JavaScript.

## Theme

The game is set during the 1982 Falklands/Malvinas conflict. The player pilots a Mirage III aircraft against various British air and sea threats.

## Gameplay

*   Control a Mirage III aircraft moving horizontally and vertically.
*   Shoot down incoming enemy aircraft (Harriers, potentially others) and helicopters (Lynx).
*   Drop bombs to destroy enemy ships (frigates, destroyers).
*   Dodge enemy fire, including bullets, artillery, and tracking missiles.
*   Collect power-ups to enhance weapons (bullets, bombs), gain shields, or extra lives.
*   Survive waves of increasingly difficult enemies across different times of day (Day -> Afternoon -> Night).
*   (Planned) Encounter challenging boss enemies at key progression points.

## Controls

*   **Arrow Keys / WASD:** Move Player Aircraft (Up, Down, Left, Right)
*   **Spacebar:** Fire Machine Guns / Bullets
*   **B Key:** Drop Bombs

## Current Features

*   Player movement and combat (bullets, bombs).
*   Multiple enemy types with distinct behaviors:
    *   Basic Planes (Red Harriers) - Simple sine wave movement.
    *   Shooter Planes (Purple Harriers) - Fire bullets, tougher.
    *   Dodging Planes (Orange Harriers) - Fast sine wave + reactive dodging, fire bullets.
    *   Basic Ships (Grey Frigates) - Slow, tough, vulnerable to bombs.
    *   Artillery Ships (Blue Destroyers) - Fire angled shots frequently.
    *   Missile Ships (Indigo Destroyers) - Fire tracking missiles.
    *   (Planned: Vulcan Bomber, Lynx Helicopter)
*   Power-ups: Bullet Damage/Size, Bomb Damage/Size, Spread Shot, Shield, Extra Life.
*   Basic scoring system.
*   Progressive difficulty scaling based on score (increases enemy speed, spawn rate, introduces harder types).
*   Health/Lives system with Game Over state.
*   Restart functionality.
*   Basic visual effects (explosions, hit flashes) using Canvas drawing.
*   Simple parallax background effect (using placeholders or images).
*   Sound effects for key actions.

## Technical Details

*   **Engine:** None (Vanilla JavaScript)
*   **Rendering:** HTML5 Canvas 2D Context
*   **Structure:** ES6 Modules (Classes for Game, Player, Enemies, etc.)
*   **Physics:** Simple position updates, basic AABB collision detection.

## How to Run

1.  Clone or download the repository.
2.  Ensure you have placeholder or actual `.wav` files in a `sounds/` directory for all sounds listed in `js/audio.js`.
3.  (Optional) Ensure you have placeholder or actual `.png` files in an `images/` directory for background layers if `drawFallback` in `js/background.js` is set to `false`.
4.  Open the `index.html` file in a modern web browser that supports ES6 Modules. (Running from a local web server is recommended to avoid potential security restrictions with file loading).

## Future Plans / Ideas

*   Integrate proper sprites for all game objects.
*   Implement Boss Battles.
*   Implement gradual Day -> Afternoon -> Night background transitions.
*   Add more enemy types (Vulcan, Lynx).
*   Add more power-ups.
*   Refine gameplay balance and difficulty curve.
*   Add particle effects.
*   Improve UI/HUD.
*   Add background music.

---
*(Feel free to add sections like Credits, License, Known Issues, etc. as needed)*