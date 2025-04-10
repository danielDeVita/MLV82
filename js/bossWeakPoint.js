// js/bossWeakPoint.js
import { Explosion } from "./explosion.js"; // For destruction effect

export class BossWeakPoint {
  constructor(boss, offsetX, offsetY, width, height, maxHealth, type = "turret") {
    this.boss = boss; // Reference to the main boss object
    this.game = boss.game; // Reference to the game object
    this.offsetX = offsetX; // X position relative to boss's top-left corner
    this.offsetY = offsetY; // Y position relative to boss's top-left corner
    this.width = width;
    this.height = height;
    this.maxHealth = maxHealth;
    this.health = this.maxHealth;
    this.type = type; // e.g., 'mainGun', 'aaGun', 'missileLauncher', 'bridge'
    this.isActive = true; // Becomes false when destroyed
    this.isHit = false; // For hit flash
    this.hitTimer = 0;
    this.hitDuration = 100;

    // --- Calculate absolute position (relative to game area) ---
    // These need to be updated if the boss moves
    this.x = this.boss.x + this.offsetX;
    this.y = this.boss.y + this.offsetY;
  }

  // Update absolute position based on boss's current position
  updatePosition() {
    this.x = this.boss.x + this.offsetX;
    this.y = this.boss.y + this.offsetY;
  }

  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    this.updatePosition(); // Ensure position is current

    // Update hit flash timer
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  }

  hit(damage) {
    if (!this.isActive) return false; // Cannot hit destroyed weak point

    this.health -= damage;
    this.isHit = true;
    this.hitTimer = this.hitDuration;
    // console.log(`WeakPoint ${this.type} hit! Health: ${this.health}/${this.maxHealth}`);

    if (this.health <= 0) {
      this.destroy();
      return true; // Return true indicating destruction
    }
    return false; // Return false, still active
  }

  destroy() {
    if (!this.isActive) return; // Prevent multiple destructions

    console.log(`WeakPoint ${this.type} DESTROYED!`);
    this.isActive = false;
    this.health = 0;
    // Create a smaller explosion at the weak point's location
    this.game.createExplosion(this.x + this.width / 2, this.y + this.height / 2, "air"); // Use 'air' type for turret explosion? Or specific 'turret' type?
    // Optional: Notify the boss that this weak point is down
    this.boss.weakPointDestroyed(this.type);
  }

  draw(context) {
    if (!this.isActive) {
      // Optional: Draw destroyed state (e.g., dark grey rubble)
      context.fillStyle = "rgba(50, 50, 50, 0.8)";
      context.fillRect(this.x, this.y, this.width, this.height);
      return;
    }

    context.save();
    // Basic shape based on type (replace with sprites later)
    if (this.type === "mainGun") context.fillStyle = "#AAAAAA";
    else if (this.type === "aaGun") context.fillStyle = "#CCCCCC";
    else if (this.type === "missile") context.fillStyle = "#DDDDDD";
    else context.fillStyle = "#BBBBBB"; // Default weak point color

    // Apply hit flash (simple overlay)
    if (this.isHit) {
      context.fillStyle = "rgba(255, 255, 255, 0.7)"; // White flash
    }

    context.fillRect(this.x, this.y, this.width, this.height);

    // Optional: Draw simple details
    if (this.type === "mainGun") {
      context.fillStyle = "#555";
      context.fillRect(this.x - 15, this.y + this.height / 2 - 3, 15, 6); // Barrel
    } else if (this.type === "aaGun") {
      context.fillStyle = "#555";
      context.fillRect(this.x - 8, this.y + this.height / 2 - 1, 8, 2); // Small barrel
    }

    context.restore();

    // Optional: Draw individual health bar for weak point
    const barY = this.y - 5;
    const barHeight = 3;
    context.fillStyle = "red";
    context.fillRect(this.x, barY, this.width, barHeight);
    context.fillStyle = "lime"; // Use lime green for weak points?
    const currentHealthWidth = Math.max(0, this.width * (this.health / this.maxHealth));
    context.fillRect(this.x, barY, currentHealthWidth, barHeight);
  }
}
