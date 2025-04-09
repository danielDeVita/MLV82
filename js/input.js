// js/input.js

export class InputHandler {
    constructor(game) {
        this.game = game;
        this.keysPressed = {}; // Tracks keys CURRENTLY held down
        this.shootPressed = false; // Tracks if space is held
        this.bombPressed = false;  // Tracks if 'b' is held
        // No pause key state needed here anymore

        window.addEventListener('keydown', (e) => {
            const key = e.key.toLowerCase();

            // Update general key state
            this.keysPressed[key] = true;

            // Update shoot/bomb state variables (used by player update)
            if (key === ' ') this.shootPressed = true;
            if (key === 'b') this.bombPressed = true;

            // Prevent default browser actions for game keys (removed 'p')
            if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'b'].includes(key)) {
                e.preventDefault();
            }
        }, { passive: false }); // Explicitly not passive for preventDefault

        window.addEventListener('keyup', (e) => {
            const key = e.key.toLowerCase();
            this.keysPressed[key] = false; // Mark key as up

            // Reset shoot/bomb state variables
            if (key === ' ') this.shootPressed = false;
            if (key === 'b') this.bombPressed = false;
        });
    }

    // Check if a specific key is currently held down
    isKeyDown(key) {
        return this.keysPressed[key.toLowerCase()] || false;
    }

    // Check if shoot key is held
    shouldShoot() {
        return this.shootPressed; // Player checks this AND cooldown
    }

    // Check if bomb key is held
    shouldDropBomb() {
        return this.bombPressed; // Player checks this AND cooldown
    }

    // Pause toggle methods are removed entirely
}