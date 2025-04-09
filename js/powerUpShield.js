import { PowerUp } from './powerUp.js';
import { playSound } from './audio.js';

export class PowerUpShield extends PowerUp {
    constructor(game, x, y) {
        super(game, x, y); // Call base PowerUp constructor
        // Override visual properties
        this.type = 'shield';
        this.color = 'cyan';
        this.letter = 'S';
    }

    activate(player) {
        // Don't call super.activate() unless PowerUp base needs it
        this.markedForDeletion = true; // Remove the power-up item
        player.activateShield(); // Call new method on player
        playSound('shieldUp');
    }
}