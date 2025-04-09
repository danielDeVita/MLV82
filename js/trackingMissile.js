import { EnemyBullet } from './enemyBullet.js'; // Inherit basic properties? Or Projectile? Let's use EnemyBullet base.
import { playSound } from './audio.js';

export class TrackingMissile extends EnemyBullet {
    constructor(game, x, y) {
        super(game, x, y); // Pass basic info to parent
        this.width = 12;
        this.height = 5;
        this.color = 'red';
        this.speed = 3; // Base speed
        this.turnSpeed = 0.05; // How quickly it can turn (radians per update)
        this.target = this.game.player; // Target the player
        this.angle = Math.atan2(this.target.y + this.target.height / 2 - (this.y + this.height / 2),
            this.target.x + this.target.width / 2 - (this.x + this.width / 2)); // Initial angle towards player
        this.speedX = Math.cos(this.angle) * this.speed;
        this.speedY = Math.sin(this.angle) * this.speed;

        this.lifetime = 5000; // Max time missile stays active (milliseconds)
        this.age = 0;

        playSound('missileLaunch');
    }

    update(deltaTime) {
        const safeDeltaTime = Math.max(0.1, deltaTime);
        const deltaScale = safeDeltaTime / 16.67;

        // --- Age and Lifetime Check ---
        this.age += safeDeltaTime; // Increment age by raw delta
        if (this.age > this.lifetime) {
            this.markedForDeletion = true;
            this.game.createExplosion(this.x + this.width / 2, this.y + this.height / 2, 'tiny');
            return; // Exit early
        }

        // --- Tracking Logic ---
        if (this.target && !this.target.invincible) {
            const targetCenterX = this.target.x + this.target.width / 2;
            const targetCenterY = this.target.y + this.target.height / 2;
            const currentCenterX = this.x + this.width / 2;
            const currentCenterY = this.y + this.height / 2;

            const desiredAngle = Math.atan2(targetCenterY - currentCenterY, targetCenterX - currentCenterX);
            let angleDifference = desiredAngle - this.angle;
            while (angleDifference > Math.PI) angleDifference -= Math.PI * 2;
            while (angleDifference < -Math.PI) angleDifference += Math.PI * 2;

            // Scale the turn amount by deltaTime
            const maxTurnThisFrame = this.turnSpeed * deltaScale;
            const turnAmount = Math.max(-maxTurnThisFrame, Math.min(maxTurnThisFrame, angleDifference));

            this.angle += turnAmount;

            // Update velocity based on new angle and base speed
            // Speed itself doesn't need scaling here if applied below
            this.speedX = Math.cos(this.angle) * this.speed;
            this.speedY = Math.sin(this.angle) * this.speed;
        }

        // --- Apply Velocity (Scaled by deltaTime) ---
        this.x += this.speedX * deltaScale;
        this.y += this.speedY * deltaScale;

        // --- Bounds Checking ---
        if (this.x + this.width < 0 || this.x > this.game.width ||
            this.y + this.height < 0 || this.y > this.game.height) {
            this.markedForDeletion = true;
        }
    } // End of TrackingMissile update

    draw(context) {
        context.save();
        // Translate context to missile center for rotation
        context.translate(this.x + this.width / 2, this.y + this.height / 2);
        context.rotate(this.angle); // Rotate by the missile's angle

        // Draw the missile shape centered around the new origin (0,0)
        context.fillStyle = this.color;
        context.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);

        // Draw a small "flame" at the back
        context.fillStyle = 'yellow';
        context.fillRect(-this.width / 2 - 3, -this.height / 2 + 1, 3, this.height - 2);

        context.restore(); // Restore context rotation and translation
    }
}

// Add a 'tiny' explosion type in js/explosion.js if it doesn't exist
// Example modification in Explosion constructor:
/*
 constructor(game, x, y, type = 'air') {
    // ... existing code ...
    if (type === 'tiny') {
        this.maxRadius = 10 + Math.random() * 5;
        this.outerColor = 'rgba(200, 200, 200, 0.5)'; // Grey puff
        this.innerColor = 'rgba(255, 255, 255, 0.7)'; // White puff
        this.speed = 2;
        // Don't play explosion sound for tiny ones? Or play different sound?
        // playSound('puff');
    } else {
        playSound('explosion'); // Play for normal explosions
    }
    // ... rest of constructor ...
 }
*/