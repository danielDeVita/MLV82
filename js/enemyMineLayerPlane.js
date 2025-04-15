// js/enemyMineLayerPlane.js
import { EnemyPlane } from "./enemyPlane.js";
import { Mine } from "./mine.js"; // Import the new Mine class
import { playSound } from "./audio.js";
import { randomInt } from "./utils.js";

export class EnemyMineLayerPlane extends EnemyPlane {
  constructor(game, speedBoost = 0) {
    super(game, speedBoost); // Calls EnemyPlane constructor
    this.health = 3; // Make them slightly tougher?
    this.maxHealth = this.health;
    this.scoreValue = 120; // Higher score value
    this.color = "#FF8C00"; // Dark Orange

    // Sine wave properties can be inherited or customized
    // this.amplitude = 30 + Math.random() * 20; // Shallower wave?
    // this.frequency = 0.03 + Math.random() * 0.015;

    // --- Mine dropping properties ---
    this.mineDropTimer = 0;
    this.mineDropInterval = randomInt(2500, 4000); // Time between drops
    this.mineDropCooldown = 1500; // Minimum initial delay after spawning
    this.mineDropTimer = this.mineDropCooldown + Math.random() * 1000; // Start with cooldown + variance
  }

  update(deltaTime) {
    // Call parent's update FIRST for movement, sine wave, boundaries, hit flash
    super.update(deltaTime); // Pass deltaTime to parent

    // Mine dropping logic (Uses raw deltaTime for timers)
    const safeDeltaTime = Math.max(0.1, deltaTime);
    this.mineDropTimer -= safeDeltaTime;

    // Only drop when mostly on screen and not marked for deletion
    if (
      !this.markedForDeletion &&
      this.mineDropTimer <= 0 &&
      this.x < this.game.width * 0.9 &&
      this.x > this.game.width * 0.1
    ) {
      this.dropMine();
      this.mineDropTimer = this.mineDropInterval + Math.random() * 1000 - 500; // Reset timer with variance
    }
  } // End of update

  dropMine() {
    playSound("bomb_drop"); // Reuse bomb drop sound? Or add 'mine_drop'?

    // Calculate mine start position (below the plane)
    const mineX = this.x + this.width / 2 - 10; // Center horizontally, adjust for mine width
    const mineY = this.y + this.height + 5; // Below the plane

    // Create a new Mine instance and add it to the game's list
    // Using enemyProjectiles array for simplicity in collision checks for now
    this.game.addEnemyProjectile(new Mine(this.game, mineX, mineY));
  }

  // Draw method - inherits from EnemyPlane (or customize if needed)
  // draw(context) { super.draw(context); }
}
