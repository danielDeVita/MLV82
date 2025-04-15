export class BossWeakPoint {
  constructor(
    boss,
    offsetX,
    offsetY,
    width,
    height,
    maxHealth,
    type = "turret",
    index = -1
  ) {
    // Added index default
    this.boss = boss;
    this.game = boss.game;
    this.offsetX = offsetX;
    this.offsetY = offsetY;
    this.width = width;
    this.height = height;
    this.maxHealth = maxHealth;
    this.health = this.maxHealth;
    this.type = type;
    this.index = index; // Store index if passed
    this.isActive = true;
    this.isHit = false;
    this.hitTimer = 0;
    this.hitDuration = 100;
    // Initial position calculation
    this.x = this.boss.x + this.offsetX;
    this.y = this.boss.y + this.offsetY;
  }

  // Update absolute position based on boss's current position
  updatePosition() {
    const oldX = this.x;
    const oldY = this.y;
    // Calculate new absolute position
    this.x = this.boss.x + this.offsetX;
    this.y = this.boss.y + this.offsetY;

    try {
      // Wrap logging in try-catch just in case boss/offset properties are weird
      if (this.type === "controlTower") {
      }
      // Identify Center AA gun by its unique RELATIVE Y offset (baseOffsetY - 15 => 30 - 15 = 15)
      else if (this.type === "aaGun" && Math.abs(this.offsetY - 15) < 1) {
        // Log Center AA Gun's position calculation
      }
    } catch (e) {
      console.error("Error during position logging:", e, this);
    }
    // --- >>> END LOGGING <<< ---
  }

  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    this.updatePosition(); // Ensure position is current based on boss movement

    // Update hit flash timer
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  }

  // Inside js/bossWeakPoint.js -> hit() method
  hit(damage) {
    // Damage value received from Boss3.hit
    if (!this.isActive) {
      return false;
    }

    this.health -= damage;

    this.isHit = true;
    this.hitTimer = this.hitDuration;

    if (this.health <= 0) {
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    if (!this.isActive) {
      console.warn(
        `Attempted to destroy already inactive weak point: ${this.type} (Index: ${this.index})`
      ); // Add Warning
      return;
    }

    this.isActive = false;
    this.health = 0;

    // Ensure 'this.boss' is valid and the method exists before calling
    if (this.boss && typeof this.boss.weakPointDestroyed === "function") {
      this.boss.weakPointDestroyed(this.type, this.index); // Pass index too
    } else {
      // Use 'air' explosion for most destructible parts, maybe 'ship'/'ground' for specific types?
      const explosionType =
        this.type === "hangar" || this.type === "radar" ? "ground" : "air";

      this.game.createExplosion(
        this.x + this.width / 2,
        this.y + this.height / 2,
        explosionType
      );
      if (this.boss && typeof this.boss.weakPointDestroyed === "function") {
        // Notify the boss, passing type and index
        this.boss.weakPointDestroyed(this.type, this.index); // Pass index too
      } else {
        console.error(
          `   ERROR: Cannot notify boss! Boss object or method missing. Boss:`,
          this.boss
        ); // Add Error log
      }
    }

    if (Math.random() < 0.75) {
      // --- >>> Determine origin based on BOSS's enemyType <<< ---
      // Treat ground_installation like 'ship' for upward movement
      const bossOriginType =
        this.boss.enemyType === "ship" ||
        this.boss.enemyType === "ground_installation"
          ? "ship"
          : "air";
      // --- >>> END Determine origin <<< ---

      // --- >>> Pass determined originType <<< ---
      this.game.createPowerUp(
        this.x + this.width / 2,
        this.y + this.height / 2,
        bossOriginType
      );
    } // End destroy
  }

  // Inside js/bossWeakPoint.js
  draw(context) {
    if (!context || !this.isActive) return;

    // --- BLOCK 1: Debug Shape (Reverted to original) ---
    context.save(); // << SAVE 1
    context.fillStyle = "fuchsia"; // Original solid color
    context.strokeStyle = "black"; // Original outline
    context.lineWidth = 1; // Original line width
    context.fillRect(this.x, this.y, this.width, this.height);
    context.strokeRect(this.x, this.y, this.width, this.height);
    context.restore(); // << RESTORE 1

    // --- BLOCK 2: Health Bar (Reverted to original) ---
    if (this.maxHealth && this.maxHealth > 1) {
      context.save(); // << SAVE 2
      const barY = this.y - 8; // Position above the box
      const barHeight = 4;
      context.fillStyle = "red"; // Original red background
      context.fillRect(this.x, barY, this.width, barHeight);
      context.fillStyle = "lime"; // Original lime foreground
      const currentHealthWidth = Math.max(
        0,
        this.width * (this.health / this.maxHealth)
      );
      context.fillRect(this.x, barY, currentHealthWidth, barHeight);
      context.restore(); // << RESTORE 2
    }
  } // End draw
}
