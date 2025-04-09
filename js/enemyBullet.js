import { Projectile } from './projectile.js';

export class EnemyBullet extends Projectile {
    constructor(game, x, y, speedX = -5, speedY = 0) { // Default moves left
        super(game, x, y);
        this.width = 8;
        this.height = 8;
        this.speedX = speedX;
        this.speedY = speedY; // Allow for angled shots
        this.color = 'magenta'; // Make enemy bullets distinct
    }

    update(deltaTime) {
        const safeDeltaTime = Math.max(0.1, deltaTime);
        const deltaScale = safeDeltaTime / 16.67;

        // --- Movement based on speedX/speedY, scaled by deltaTime ---
        this.x += this.speedX * deltaScale;
        this.y += this.speedY * deltaScale;

        // --- Bounds Checking ---
        if (this.x + this.width < 0 || this.x > this.game.width ||
            this.y + this.height < 0 || this.y > this.game.height) {
            this.markedForDeletion = true;
        }
    } // End of EnemyBullet update

    draw(context) {
        context.fillStyle = this.color;
        // Draw as a small circle
        context.beginPath();
        context.arc(this.x + this.width / 2, this.y + this.height / 2, this.width / 2, 0, Math.PI * 2);
        context.fill();
    }
}