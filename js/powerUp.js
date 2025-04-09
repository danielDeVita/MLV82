import { playSound } from './audio.js';
import { randomInt } from './utils.js';

export class PowerUp {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.size = 20;
        this.width = this.size; // for collision detection
        this.height = this.size; // for collision detection
        this.speedY = 1; // Floats down slowly
        this.markedForDeletion = false;
        this.angle = 0;
        this.angleSpeed = Math.random() * 0.1 - 0.05; // Slow rotation

        // Randomly choose power-up type
        this.type = Math.random() < 0.5 ? 'bullet' : 'bomb';
        this.color = this.type === 'bullet' ? 'lightgreen' : 'lightblue';
        this.letter = this.type === 'bullet' ? 'B' : 'P'; // P for Power (bombs)
    }

    update(deltaTime) {
        const safeDeltaTime = Math.max(0.1, deltaTime);
        const deltaScale = safeDeltaTime / 16.67;

        // --- Vertical Movement (Scale speed by deltaTime) ---
        this.y += this.speedY * deltaScale;

        // --- Rotation (Scale angle speed by deltaTime) ---
        this.angle += this.angleSpeed * deltaScale; // Or maybe angleSpeed * safeDeltaTime if angleSpeed is in radians/ms? Let's scale.

        // --- Bounds Check ---
        if (this.y > this.game.height) { // Only check bottom boundary
            this.markedForDeletion = true;
        }
    } // End of PowerUp update

    draw(context) {
        context.save();
        context.translate(this.x, this.y); // Move origin to powerup center for rotation
        context.rotate(this.angle);

        // Draw a simple box or circle
        context.fillStyle = this.color;
        context.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

        // Draw letter indicator
        context.fillStyle = 'black';
        context.font = '14px Arial';
        context.textAlign = 'center';
        context.textBaseline = 'middle';
        context.fillText(this.letter, 0, 1); // Slight offset for better centering

        context.restore();
    }

    activate(player) {
        playSound('powerup');
        this.markedForDeletion = true;
        if (this.type === 'bullet') {
            player.activateBulletPowerUp();
        } else if (this.type === 'bomb') {
            player.activateBombPowerUp();
        }
    }
}