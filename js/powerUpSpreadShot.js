import { PowerUp } from './powerUp.js';
import { playSound } from './audio.js';

export class PowerUpSpreadShot extends PowerUp {
    constructor(game, x, y) {
        super(game, x, y);
        this.type = 'spread';
        this.color = 'lime';
        this.letter = 'W'; // W for Wide/Weapon
    }

    activate(player) {
        this.markedForDeletion = true;
        player.activateSpreadShot();
        playSound('powerup'); // Use generic powerup sound? Or specific one?
    }
}