import { EnemyShip } from "./enemyShip.js";
import { TrackingMissile } from "./trackingMissile.js";

export class EnemyTrackingShip extends EnemyShip {
  constructor(game, speedBoost = 0) {
    super(game, speedBoost);

    // --- Recalculate gameplay dimensions based on OVERRIDDEN sprite/scale ---

    this.spriteWidth = 239; // <<< ACTUAL width of png
    this.spriteHeight = 110; // <<< ACTUAL height of png

    this.width = this.spriteWidth * this.scale;
    this.height = this.spriteHeight * this.scale;
    // --- End Dimension Override ---

    // --- >>> Load SPECIFIC Sprite for Tracking Destroyer <<< ---
    // This overrides the this.image set by the super() call
    this.image = new Image();
    this.image.src = "images/enemyTracking239x110.png"; // <<< YOUR FILENAME HERE
    // --- >>> END Load Sprite <<< ---

    this.health = 10; // Even tougher
    this.maxHealth = this.health;
    this.scoreValue = 180;

    // --- Override Tracking-Specific Timers ---
    this.launchTimer = 0;
    this.launchInterval = 3500 + Math.random() * 2000; // Keep launch interval
    this.launchTimer = Math.random() * this.launchInterval;
    // --- End Timer Override ---

    // --- Animation State (Initialize for static sprite) ---
    this.frameX = 0;
    this.frameY = 0;
    this.maxFrame = 0;
    this.fps = 10;
    this.frameTimer = 0;
    this.frameInterval = 1000 / this.fps;
    // --- END Animation State ---
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

  // // Optional: Override draw for visual distinction
  // draw(context) {
  //   // Don't draw if marked for deletion
  //   if (this.markedForDeletion) return;

  //   context.save(); // Save context state

  //   // Use colors defined in this class, adjusted for hit state
  //   const currentHullColor = this.isHit ? "white" : this.color;
  //   const currentDeckColor = this.isHit ? "white" : this.deckColor;
  //   const currentDetailColor = this.isHit ? "white" : this.detailColor;

  //   // --- Draw Base Ship Shape ---
  //   context.fillStyle = currentHullColor;
  //   context.fillRect(
  //     this.x,
  //     this.y + this.height * 0.3,
  //     this.width,
  //     this.height * 0.7
  //   );
  //   context.fillStyle = currentDeckColor;
  //   context.fillRect(
  //     this.x + this.width * 0.2,
  //     this.y,
  //     this.width * 0.6,
  //     this.height * 0.4
  //   );
  //   // --- Draw Silos ---
  //   context.fillStyle = currentDetailColor; // Use detail color for silos
  //   context.fillRect(
  //     this.x + this.width * 0.3,
  //     this.y - this.height * 0.1,
  //     this.width * 0.1,
  //     this.height * 0.3
  //   ); // Silo 1
  //   context.fillRect(
  //     this.x + this.width * 0.6,
  //     this.y - this.height * 0.1,
  //     this.width * 0.1,
  //     this.height * 0.3
  //   ); // Silo 2

  //   context.restore(); // Restore context state

  //   // --- Call Base Draw Method (for health bar) ---
  //   super.draw(context); // <<< This calls Enemy.draw()
  // }
}
