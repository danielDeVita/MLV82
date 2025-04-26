// Inside js/enemyShooterShip.js
import { EnemyShip } from "./enemyShip.js";
import { EnemyBullet } from "./enemyBullet.js";
import { playSound } from "./audio.js"; // Make sure playSound is imported

export class EnemyShooterShip extends EnemyShip {
  constructor(game, speedBoost = 0) {
    super(game, speedBoost);

    // --- >>> Override Sprite and Dimensions for Shooter Destroyer <<< ---
    this.spriteWidth = 246; // <<< ACTUAL width of png
    this.spriteHeight = 145; // <<< ACTUAL height of png
    // Scale this larger sprite? Maybe slightly smaller than native?
    this.scale = 1; // <<< ADJUST SCALE (e.g., 0.6 = 154x66 pixels rendered)
    // --- Recalculate gameplay dimensions based on OVERRIDDEN sprite/scale ---
    this.width = this.spriteWidth * this.scale;
    this.height = this.spriteHeight * this.scale;
    // --- End Dimension Override ---

    // This overrides the this.image set by the super() call
    this.image = new Image();
    this.image.src = "images/shooterShip246x145.png"; // <<< YOUR FILENAME HERE
    // --- >>> END Load Sprite <<< ---

    this.health = 8;
    this.maxHealth = this.health;
    this.scoreValue = 100;
    // this.color = "darkblue";
    // this.deckColor = "lightblue";
    // this.detailColor = "cyan";

    // --- Shooting properties ---
    this.shootTimer = 0;
    // --- DECREASE INTERVAL for more frequent shots ---
    // Original: 2000 + Math.random() * 1500; // Range: 2.0s to 3.5s
    this.shootInterval = 1200 + Math.random() * 800; // New Range: 1.2s to 2.0s
    this.shootTimer = Math.random() * this.shootInterval; // Start with random timer offset

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

    // --- Shooting logic (Uses raw deltaTime for timers) ---
    const safeDeltaTime = Math.max(0.1, deltaTime);
    this.shootTimer += safeDeltaTime;
    // Only shoot when mostly on screen
    if (
      !this.markedForDeletion &&
      this.shootTimer >= this.shootInterval &&
      this.x < this.game.width * 0.95
    ) {
      this.shoot();
      this.shootTimer = 0; // Reset timer
      this.shootInterval = 1200 + Math.random() * 800; // Reset interval (using updated faster range)
    }
  } // End of EnemyShooterShip update

  shoot() {
    // Shoot slightly upwards from the 'turret' position
    const bulletX = this.x + this.width * 0.5 - 4; // Approx turret X center
    const bulletY = this.y - 8; // Slightly above the turret base

    // Aim slightly upwards and left
    const speedX = -3;
    const speedY = -1;
    this.game.addEnemyProjectile(
      new EnemyBullet(this.game, bulletX, bulletY, speedX, speedY)
    );

    // Play sound effect
    playSound("enemyShoot"); // Make sure this call exists
  }

  //   // Optional: Override draw for visual distinction
  //   draw(context) {
  //     // Don't draw if marked for deletion
  //     if (this.markedForDeletion) return;

  //     context.save(); // Save context state

  //     // Use colors defined in this class, adjusted for hit state
  //     const currentHullColor = this.isHit ? "white" : this.color;
  //     const currentDeckColor = this.isHit ? "white" : this.deckColor;
  //     const currentDetailColor = this.isHit ? "white" : this.detailColor;

  //     // --- Draw Base Ship Shape --- (Copied from EnemyShip draw)
  //     context.fillStyle = currentHullColor;
  //     context.fillRect(
  //       this.x,
  //       this.y + this.height * 0.3,
  //       this.width,
  //       this.height * 0.7
  //     );
  //     context.fillStyle = currentDeckColor;
  //     context.fillRect(
  //       this.x + this.width * 0.2,
  //       this.y,
  //       this.width * 0.6,
  //       this.height * 0.4
  //     );
  //     // --- Draw Modified Turret ---
  //     context.fillStyle = currentDetailColor; // Use detail color for turret
  //     context.fillRect(
  //       this.x + this.width * 0.4,
  //       this.y - this.height * 0.15,
  //       this.width * 0.2,
  //       this.height * 0.3
  //     ); // Taller turret

  //     context.restore(); // Restore context state

  //     // --- Call Base Draw Method (for health bar) ---
  //     super.draw(context); // <<< This calls Enemy.draw()
  //   }
}
