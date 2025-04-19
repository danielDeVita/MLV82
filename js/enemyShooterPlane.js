// js/enemyShooterPlane.js
import { EnemyPlane } from "./enemyPlane.js";
import { EnemyBullet } from "./enemyBullet.js";
import { playSound } from "./audio.js";

export class EnemyShooterPlane extends EnemyPlane {
  constructor(game, speedBoost = 0) {
    // --- Call parent constructor FIRST ---
    // Inherits ALL properties calculated in EnemyPlane, including
    // sprite dims, scale, movement params (freq, amp), and ROTATION params.
    super(game, speedBoost);

    // --- Override ONLY what's needed for Shooter ---
    // 1. Sprite Source (Use the already calculated/inherited width/height)
    this.image = new Image();
    this.image.src = "images/blue-harrier128.png";

    // 2. Override Stats
    this.maxHealth = 5;
    this.health = this.maxHealth;
    this.scoreValue = 60;

    // 3. Override Shooting Timers
    this.shootTimer = Math.random() * 1000 + 500;
    this.shootInterval = 1800 + Math.random() * 800;

    // --- NO Rotation Overrides ---
  } // End Constructor

  // Override update ONLY to add shooting logic
  update(deltaTime) {
    super.update(deltaTime); // Handles movement AND rotation update via parent
    // Add Shooter specific logic
    const safeDeltaTime = Math.max(0.1, deltaTime);
    this.shootTimer -= safeDeltaTime;
    if (
      this.shootTimer <= 0 &&
      this.x < this.game.width * 0.95 &&
      this.x > -this.width * 0.1 &&
      !this.markedForDeletion
    ) {
      this.shoot();
      this.shootInterval = 1800 + Math.random() * 800;
      this.shootTimer = this.shootInterval;
    }
  }

  shoot() {
    const bulletX = this.x;
    const bulletY = this.y + this.height / 2 - 2; // Use scaled height
    this.game.addEnemyProjectile(
      new EnemyBullet(this.game, bulletX, bulletY, -5, 0)
    ); // Speed -5
    playSound("enemyShoot");
  }

  // Inherits draw() method from EnemyPlane, which handles rotated sprite drawing
  // Only override if you need extra visuals like the gun barrels
  draw(context) {
    super.draw(context); // Draws the rotated plane + health bar

    // Optional: Draw non-rotated barrels AFTER super.draw() if desired
    // context.fillStyle = 'gray';
    // context.fillRect(this.x - 5, this.y + this.height * 0.4, 5, 3);
    // context.fillRect(this.x - 5, this.y + this.height * 0.6 - 3, 5, 3);
  }
}
