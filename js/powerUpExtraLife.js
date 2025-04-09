import { PowerUp } from './powerUp.js';
import { playSound } from './audio.js';

export class PowerUpExtraLife extends PowerUp {
    constructor(game, x, y) {
        super(game, x, y);
        this.type = 'life';
        this.color = 'pink';
        this.letter = 'L';
    }

    activate(player) {
        this.markedForDeletion = true;
        player.gainLife();
        playSound('extraLife');
    }
}