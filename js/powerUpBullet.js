// js/powerUpBullet.js
import { PowerUp } from './powerUp.js';
import { playSound } from './audio.js';

export class PowerUpBullet extends PowerUp {
    constructor(game, x, y) {
        super(game, x, y); // Call base constructor
        // Override properties for this type
        this.type = 'bullet'; // Ensure type matches check in base activate if used
        this.color = 'lightgreen'; // Choose a distinct color
        this.letter = 'P'; // Use 'P' for power/pellet? Or reuse 'B'? Let's use P.
    }

    // Override the activate method for specific action
    activate(player) {
        this.markedForDeletion = true; // Remove the item itself
        player.activateBulletPowerUp(); // Call the correct method on player
        playSound('powerup'); // Use generic sound or a specific one
    }
}