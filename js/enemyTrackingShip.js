import { EnemyShip } from "./enemyShip.js";
import { TrackingMissile } from "./trackingMissile.js";

export class EnemyTrackingShip extends EnemyShip {
  constructor(game, speedBoost = 0) {
    super(game, speedBoost);
    this.health = 10; // Even tougher
    this.maxHealth = this.health;
    this.scoreValue = 180;
    this.color = "indigo"; // Distinct color
    this.deckColor = "violet";
    this.detailColor = "magenta";

    // Missile launching properties
    this.launchTimer = 0;
    // Launch less frequently than normal shooters
    this.launchInterval = 3500 + Math.random() * 2000; // Every 3.5-5.5 seconds
  }

  update(deltaTime) {
    // --- Call parent's update FIRST for movement and hit flash ---
    super.update(deltaTime); // <<< CRITICAL: Pass deltaTime to parent

    // --- Missile launching logic (Uses raw deltaTime for timers) ---
    const safeDeltaTime = Math.max(0.1, deltaTime);
    this.launchTimer += safeDeltaTime;
    // Only launch when mostly on screen
    if (
      !this.markedForDeletion &&
      this.launchTimer >= this.launchInterval &&
      this.x < this.game.width * 0.9
    ) {
      this.launchMissile();
      this.launchTimer = 0;
      this.launchInterval = 3500 + Math.random() * 2000; // Reset interval
    }
  } // End of EnemyTrackingShip update

  launchMissile() {
    // Launch from slightly above the ship's center/deck
    const missileX = this.x + this.width / 2 - 6; // Adjust for missile width
    const missileY = this.y - 10; // Start above the ship

    this.game.addEnemyProjectile(
      new TrackingMissile(this.game, missileX, missileY)
    );
    // Sound is played by Missile constructor
  }

  // Optional: Override draw for visual distinction
  draw(context) {
    // Don't draw if marked for deletion
    if (this.markedForDeletion) return;

    context.save(); // Save context state

    // Use colors defined in this class, adjusted for hit state
    const currentHullColor = this.isHit ? "white" : this.color;
    const currentDeckColor = this.isHit ? "white" : this.deckColor;
    const currentDetailColor = this.isHit ? "white" : this.detailColor;

    // --- Draw Base Ship Shape ---
    context.fillStyle = currentHullColor;
    context.fillRect(
      this.x,
      this.y + this.height * 0.3,
      this.width,
      this.height * 0.7
    );
    context.fillStyle = currentDeckColor;
    context.fillRect(
      this.x + this.width * 0.2,
      this.y,
      this.width * 0.6,
      this.height * 0.4
    );
    // --- Draw Silos ---
    context.fillStyle = currentDetailColor; // Use detail color for silos
    context.fillRect(
      this.x + this.width * 0.3,
      this.y - this.height * 0.1,
      this.width * 0.1,
      this.height * 0.3
    ); // Silo 1
    context.fillRect(
      this.x + this.width * 0.6,
      this.y - this.height * 0.1,
      this.width * 0.1,
      this.height * 0.3
    ); // Silo 2

    context.restore(); // Restore context state

    // --- Call Base Draw Method (for health bar) ---
    super.draw(context); // <<< This calls Enemy.draw()
  }
}
