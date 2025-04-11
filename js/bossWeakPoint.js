export class BossWeakPoint {
  constructor(boss, offsetX, offsetY, width, height, maxHealth, type = "turret", index = -1) {
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

    // --- >>> ADD DETAILED LOGGING FOR SPECIFIC WEAK POINTS <<< ---
    try {
      // Wrap logging in try-catch just in case boss/offset properties are weird
      if (this.type === "controlTower") {
        // Log Tower's position calculation
        console.log(
          `UPDATE_POS Tower: bossXY=(${this.boss.x?.toFixed(0)},${this.boss.y?.toFixed(0)}) + offsetXY=(${this.offsetX?.toFixed(
            0
          )},${this.offsetY?.toFixed(0)}) => finalXY=(${this.x?.toFixed(0)},${this.y?.toFixed(0)})`
        );
      }
      // Identify Center AA gun by its unique RELATIVE Y offset (baseOffsetY - 15 => 30 - 15 = 15)
      else if (this.type === "aaGun" && Math.abs(this.offsetY - 15) < 1) {
        // Log Center AA Gun's position calculation
        console.log(
          `UPDATE_POS CenterAA: bossXY=(${this.boss.x?.toFixed(0)},${this.boss.y?.toFixed(0)}) + offsetXY=(${this.offsetX?.toFixed(
            0
          )},${this.offsetY?.toFixed(0)}) => finalXY=(${this.x?.toFixed(0)},${this.y?.toFixed(0)})`
        );
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
      // console.log(`WP ${this.type} hit attempt ignored (inactive).`);
      return false;
    }

    // --- Log Damage Received ---
    console.log(`   -> WP ${this.type} hit() received damage: ${damage.toFixed(1)}. Current health: ${this.health.toFixed(1)}`);
    this.health -= damage;
    console.log(`   -> WP ${this.type} new health: ${this.health.toFixed(1)}`);

    this.isHit = true;
    this.hitTimer = this.hitDuration;

    if (this.health <= 0) {
      console.log(`   -> WP ${this.type} health <= 0, calling destroy.`);
      this.destroy();
      return true;
    }
    return false;
  }

  destroy() {
    if (!this.isActive) return;
    this.isActive = false;
    this.health = 0;
    console.log(`WeakPoint ${this.type} (Index: ${this.index}) DESTROYED!`);
    this.game.createExplosion(this.x + this.width / 2, this.y + this.height / 2, "air");
    // Notify the boss, passing type and index
    this.boss.weakPointDestroyed(this.type, this.index); // Pass index too

    if (Math.random() < 0.75) {
      this.game.createPowerUp(this.x + this.width / 2, this.y + this.height / 2);
    }
  }

  // Inside js/bossWeakPoint.js -> draw() method

  // Inside js/bossWeakPoint.js
  draw(context) {
    if (!context || !this.isActive) return;

    // --- BLOCK 1: Debug Shape ---
    context.save(); // << SAVE 1
    context.fillStyle = "fuchsia";
    context.strokeStyle = "black";
    context.lineWidth = 1;
    context.fillRect(this.x, this.y, this.width, this.height);
    context.strokeRect(this.x, this.y, this.width, this.height);
    context.restore(); // << RESTORE 1

    // --- BLOCK 2: Health Bar ---
    if (this.maxHealth && this.maxHealth > 1) {
      context.save(); // << SAVE 2
      const barY = this.y - 8;
      const barHeight = 4;
      console.log(
        `  -> HEALTH BAR DRAW for Type: ${this.type}, X: ${this.x?.toFixed(0)}, Y: ${this.y?.toFixed(0)}, Health: ${this.health?.toFixed(1)}`
      );
      context.fillStyle = "red";
      context.fillRect(this.x, barY, this.width, barHeight);
      context.fillStyle = "lime";
      const currentHealthWidth = Math.max(0, this.width * (this.health / this.maxHealth));
      context.fillRect(this.x, barY, currentHealthWidth, barHeight);
      context.restore(); // << RESTORE 2
    }
  } // End draw
}
