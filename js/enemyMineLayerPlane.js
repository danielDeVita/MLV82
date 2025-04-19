// js/enemyMineLayerPlane.js
import { EnemyPlane } from "./enemyPlane.js";
import { Mine } from "./mine.js";
import { playSound } from "./audio.js";
import { randomInt } from "./utils.js";
import { lerp } from "./utils.js"; // Make sure lerp is imported

export class EnemyMineLayerPlane extends EnemyPlane {
  constructor(game, speedBoost = 0) {
    // --- Call parent constructor FIRST ---
    super(game, speedBoost); // Inherits movement & rotation params initially

    // --- Override ONLY what's needed for Mine Layer ---
    // 1. Sprite Properties (Use inherited scale/dims)
    this.image = new Image();
    this.image.src = "images/dark-harrier128.png";
    // If scale was different, recalculate width/height here
    // this.width = this.spriteWidth * this.scale;
    // this.height = this.spriteHeight * this.scale;

    // 2. Override Stats
    this.maxHealth = 5;
    this.health = this.maxHealth;
    this.scoreValue = 120;

    // 3. Override Movement Parameters if desired (Optional)
    // If you uncomment these, the inherited rotation might feel less matched
    // this.speedX = (1.5 + speedBoost);
    // this.frequency = 0.004;
    // this.amplitude = 30;
    // this.initialY = ... // Need to recalculate if amplitude/height changes how you spawn

    // --- REMOVED Rotation Parameter Recalculation ---

    // 4. Override Mine Laying Properties
    this.mineDropTimer = 0;
    this.mineDropInterval = randomInt(2500, 4000);
    this.mineDropCooldown = 1500;
    this.mineDropTimer = this.mineDropCooldown + Math.random() * 1000;
  } // End Constructor

  // Override update ONLY to add mine dropping logic
  update(deltaTime) {
    super.update(deltaTime); // Handles movement (using potentially overridden params) AND rotation update (using inherited params)
    // Add MineLayer SPECIFIC Logic
    const safeDeltaTime = Math.max(0.1, deltaTime);
    this.mineDropTimer -= safeDeltaTime;
    if (
      !this.markedForDeletion &&
      this.mineDropTimer <= 0 &&
      this.x < this.game.width * 0.9 &&
      this.x > this.game.width * 0.1
    ) {
      this.dropMine();
      this.mineDropTimer = this.mineDropInterval + Math.random() * 1000 - 500;
    }
  }

  dropMine() {
    const mineX = this.x + this.width / 2 - 10;
    const mineY = this.y + this.height + 5;
    this.game.addEnemyProjectile(new Mine(this.game, mineX, mineY));
    playSound("bomb_drop");
  }

  // Inherits draw() method from EnemyPlane
}
