import { Enemy } from "./enemy.js";
import { randomInt } from "./utils.js";
import { Bomb } from "./bomb.js"; // Needed for hit logic
import { SuperBomb } from "./superBomb.js"; // Needed for hit logic
import { playSound } from "./audio.js"; // Needed for hit logic

export class EnemyShip extends Enemy {
  constructor(game, speedBoost = 0) {
    super(game); // Calls base Enemy constructor
    this.width = 80;
    this.height = 40;
    this.y = this.game.height - this.height - randomInt(10, 60);
    this.speedX = randomInt(1, 2) + speedBoost;
    this.enemyType = "ship"; // Set type

    // --- Set Health HERE ---
    this.maxHealth = 5; // Max health for basic ship
    this.health = this.maxHealth;
    // --- End Health ---

    this.scoreValue = 50;
    this.color = "darkslategray";
    this.deckColor = "slategray";
    this.detailColor = "gray";

    console.log(
      `EnemyShip ${this.id} constructed. Health: ${this.health}/${this.maxHealth}`
    ); // Log health here
  } // End Constructor

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

  hit(damage = 1, projectileType = "bullet") {
    if (this.markedForDeletion) return;
    const initialHealth = this.health;

    console.log(
      `SHIP HIT override: ${this.id} Type='${projectileType}', Dmg=${damage}, HealthBefore=${initialHealth}`
    );

    // Only call base Enemy.hit (which reduces health) if hit by a bomb
    if (projectileType === "bomb") {
      console.log(` -> Bomb detected! Calling Enemy.hit(${damage})`);
      // Call the BASE Enemy hit method directly, passing type for log consistency
      Enemy.prototype.hit.call(this, damage, projectileType);
    } else {
      console.log(` -> Bullet detected! Doing visual flash only.`);
      // Bullets still trigger the flash visually, but don't reduce health
      this.isHit = true;
      this.hitTimer = this.hitDuration;
      // playSound('ricochet'); // Optional sound
    }
  } // End hit

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
