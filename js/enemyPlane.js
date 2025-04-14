// js/enemyPlane.js
import { Enemy } from "./enemy.js";
import { randomInt } from "./utils.js"; // Keep for speed/position

export class EnemyPlane extends Enemy {
  constructor(game, speedBoost = 0) {
    super(game); // Calls base Enemy constructor (which no longer sets health)
    this.width = 50;
    this.height = 30;
    const topSpawnMargin = 20;
    const bottomSpawnMargin = 150;
    this.y = randomInt(
      topSpawnMargin,
      this.game.height - this.height - bottomSpawnMargin
    );
    this.speedX = 2.5 + Math.random() * 1.5 + speedBoost;
    this.enemyType = "air"; // Set type

    // --- Set Health HERE ---
    this.maxHealth = 1; // Max health for basic plane
    this.health = this.maxHealth; // Current health
    // --- End Health ---

    this.scoreValue = 10;
    this.color = "darkred";

    // Sine Wave Properties
    this.angle = Math.random() * Math.PI * 2;
    this.amplitude = 40 + Math.random() * 30;
    this.frequency = 0.04 + Math.random() * 0.025;
    this.initialY = this.y;

    console.log(
      `EnemyPlane ${this.id} constructed. Health: ${this.health}/${this.maxHealth}`
    ); // Log health here
  } // End Constructor

  // Override update to ensure sine calculation uses the correct initialY and applies bounds
  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Horizontal Movement --- (Scaled)
    this.x -= this.speedX * deltaScale;
    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
      return; // Exit early
    }

    // --- Sine Wave Vertical Movement ---
    // Ensure initialY is valid
    if (this.initialY === undefined || isNaN(this.initialY)) {
      this.initialY = this.game.height / 2;
    } // Fallback

    this.angle += this.frequency * deltaScale; // Scale frequency based on time
    this.y = this.initialY + Math.sin(this.angle) * this.amplitude;

    // --- Boundaries ---
    const topBound = 5;
    const bottomBound = this.game.height - this.height - 85; // Keep consistent bounds
    this.y = Math.max(topBound, Math.min(bottomBound, this.y));

    // --- Hit Flash Update (From Base Class logic) ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  } // End of EnemyPlane update

  // Draw method - Use the one that draws the plane shape and cockpit
  draw(context) {
    if (this.markedForDeletion) return;
    context.save();

    if (this.isHit) {
      context.fillStyle = "white";
    } else {
      context.fillStyle = this.color;
    } // Use dark red

    // --- Draw Plane Shape ---
    context.beginPath();
    context.moveTo(this.x + this.width * 0.1, this.y + this.height * 0.2);
    context.lineTo(this.x + this.width * 0.5, this.y);
    context.lineTo(this.x + this.width * 0.9, this.y + this.height * 0.2);
    context.lineTo(this.x + this.width, this.y + this.height * 0.5);
    context.lineTo(this.x + this.width * 0.8, this.y + this.height);
    context.lineTo(this.x + this.width * 0.2, this.y + this.height);
    context.lineTo(this.x, this.y + this.height * 0.5);
    context.closePath();
    context.fill();

    // --- Draw Cockpit ---
    context.fillStyle = "lightblue";
    context.beginPath();
    context.arc(
      this.x + this.width * 0.6,
      this.y + this.height * 0.35,
      this.width * 0.1,
      0,
      Math.PI * 2
    );
    context.fill();

    context.restore();

    // --- Call Base Draw (for consistency, won't show health bar) ---
    super.draw(context);
  }
}
