// js/enemyShooterPlane.js
import { EnemyPlane } from './enemyPlane.js';
import { EnemyBullet } from './enemyBullet.js';
import { playSound } from './audio.js';

export class EnemyShooterPlane extends EnemyPlane {
    constructor(game, speedBoost = 0) {
        super(game, speedBoost); // Calls EnemyPlane constructor
        this.health = 2; // Keep health at 2 (corrected from previous logs showing 'lives')
        this.maxHealth = this.health;
        this.scoreValue = 25;
        this.color = 'purple'; // Distinguish shooter planes

        // --- Shooting Properties ---
        this.shootTimer = 0;
        // --- DECREASE INTERVAL for more frequent shots ---
        // Original: 1500 + Math.random() * 1000; // Range: 1.5s to 2.5s
        this.shootInterval = 800 + Math.random() * 600; // New Range: 0.8s to 1.4s (Significantly faster)
        this.shootTimer = Math.random() * this.shootInterval; // Start with random timer offset
    }

    update(deltaTime) {
        // Call parent's update FIRST for movement, sine wave, boundaries, hit flash
        super.update(deltaTime); // Pass deltaTime to parent

        // Shooting logic (Uses raw deltaTime for timers)
        const safeDeltaTime = Math.max(0.1, deltaTime);
        this.shootTimer += safeDeltaTime;

        // Only shoot when mostly on screen and not marked for deletion
        if (!this.markedForDeletion && this.shootTimer >= this.shootInterval && this.x < this.game.width * 0.9) {
            this.shoot();
            this.shootTimer = 0; // Reset timer
            // --- RESET INTERVAL with the same new, lower range ---
            this.shootInterval = 800 + Math.random() * 600; // New Range: 0.8s to 1.4s
        }
    } // End of EnemyShooterPlane update

    shoot() {
        // Calculate bullet start position (front-left of plane)
        const bulletX = this.x; // Fire from the front
        const bulletY = this.y + this.height / 2 - 4; // Center vertically adjust for bullet size
        // Simple shot straight left
        this.game.addEnemyProjectile(new EnemyBullet(this.game, bulletX, bulletY, -6)); // Speed -6
        playSound('enemyShoot');
    }

    // Draw method uses super.draw() and adds barrels (keep as is)
    draw(context) {
        super.draw(context); // Draws plane shape, cockpit, handles hit flash via parent call chain
        // Example addition: Draw gun barrels? (keep if you like it)
        context.fillStyle = 'gray';
        context.fillRect(this.x - 5, this.y + this.height * 0.4, 5, 3);
        context.fillRect(this.x - 5, this.y + this.height * 0.6 - 3, 5, 3);

        // Call Enemy.draw() for health bar (since health > 1)
        // This is handled by the super.draw() call above if EnemyPlane calls its super.draw()
        // No need for a second super.draw(context) call here if EnemyPlane already does it.
    }
}