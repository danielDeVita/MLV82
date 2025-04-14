import { Enemy } from "./enemy.js";
import { randomInt } from "./utils.js";

export class EnemyShip extends Enemy {
  constructor(game, speedBoost = 0) {
    // Added speedBoost parameter
    super(game);
    this.width = 80;
    this.height = 40;
    this.y = this.game.height - this.height - randomInt(10, 60);
    this.speedX = randomInt(1, 2) + speedBoost;
    this.enemyType = "ship"; // Correct type

    // --- Health ---
    this.maxHealth = 5; // Define Max Health
    this.health = this.maxHealth; // <<< SET health TO maxHealth
    // --- End Health ---

    this.scoreValue = 50;
    this.color = "darkslategray";
    this.deckColor = "slategray";
    this.detailColor = "gray";
  }

  // Make sure update receives deltaTime
  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Horizontal Movement ---
    this.x -= this.speedX * deltaScale; // Scale speed
    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
      return; // Exit early
    }

    // Ships typically don't have vertical movement here

    // --- Hit Flash Update ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime; // Use raw delta for timers
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  } // End of EnemyShip update

  // --- >>> REVISED Hit Method <<< ---
  // Override hit because only bombs should deal full damage
  hit(damage = 1, projectileType = "bullet") {
    // Accept default damage
    if (this.markedForDeletion) return;
    const initialHealth = this.health; // Log initial health

    console.log(
      `SHIP HIT override: ${this.id} Type='${projectileType}', Dmg=${damage}, HealthBefore=${initialHealth}`
    );

    // Only apply actual damage if hit by a bomb
    if (projectileType === "bomb") {
      console.log(` -> Bomb detected! Applying damage.`);
      // Call the base Enemy hit method to handle health reduction, deletion, score, drops etc.
      super.hit(damage, projectileType); // Pass original damage and type
    } else {
      console.log(` -> Bullet detected! Doing visual flash only.`);
      // Bullets still trigger the flash visually, but don't reduce health here
      this.isHit = true;
      this.hitTimer = this.hitDuration;
      // playSound('ricochet'); // Optional sound
    }
    // No need to manually reduce health or check for deletion here if type is 'bullet'
  }
  // --- >>> END REVISED Hit Method <<< ---

  // Overriding draw completely, need hit flash logic wrapper here
  draw(context) {
    // Don't draw if marked for deletion
    if (this.markedForDeletion) return;

    context.save(); // Save context state for potential hit flash changes

    // Determine main fill color based on hit state
    const currentHullColor = this.isHit ? "white" : this.color;
    const currentDeckColor = this.isHit ? "white" : this.deckColor;
    const currentDetailColor = this.isHit ? "white" : this.detailColor;

    // --- Draw Custom Ship Shape ---
    // Hull
    context.fillStyle = currentHullColor;
    context.fillRect(
      this.x,
      this.y + this.height * 0.3,
      this.width,
      this.height * 0.7
    );
    // Deck/Superstructure
    context.fillStyle = currentDeckColor;
    context.fillRect(
      this.x + this.width * 0.2,
      this.y,
      this.width * 0.6,
      this.height * 0.4
    );
    // Small turret/detail
    context.fillStyle = currentDetailColor;
    context.fillRect(
      this.x + this.width * 0.45,
      this.y - this.height * 0.1,
      this.width * 0.1,
      this.height * 0.2
    );
    // --- End Custom Shape ---

    context.restore(); // Restore original context state (like fillStyle)

    // --- Call Base Draw Method (which now ONLY draws health bar) ---
    super.draw(context); // <<< This calls Enemy.draw() to draw the health bar
  }
}
