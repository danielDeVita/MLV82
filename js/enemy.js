// js/enemy.js

export class Enemy {
  constructor(game) {
    this.game = game;
    this.id = `enemy_${Math.random().toString(36).substring(2, 9)}`;
    this.x = this.game.width;
    this.y = 0; // Position set by subclasses
    this.width = 50; // Default size
    this.height = 30; // Default size
    this.speedX = Math.random() * 2 + 1;
    this.markedForDeletion = false;
    this.enemyType = "air"; // Default type, subclasses should override

    // --- Explicit Health Initialization ---
    this.maxHealth = 1; // Default max health for basic enemies
    this.health = this.maxHealth; // Set current health TO max health
    // --- End Health ---

    this.scoreValue = 10;
    this.color = "grey";

    // Hit Flash
    this.isHit = false;
    this.hitTimer = 0;
    this.hitDuration = 100;

    // --- ADD Constructor Log ---
    console.log(
      `Enemy ${this.id} (${this.constructor.name}) constructed. Health: ${this.health}/${this.maxHealth}, Type: ${this.enemyType}`
    );
  }

  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;
    this.x -= this.speedX * deltaScale;

    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
    }

    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  }

  draw(context) {
    // --- Health Bar Logic ---
    // Only draw if maxHealth > 1 (basic enemies with 1 health won't show a bar)
    if (this.maxHealth && this.maxHealth > 1 && !this.markedForDeletion) {
      const barY = this.y - 8;
      const barHeight = 4;
      context.fillStyle = "red";
      context.fillRect(this.x, barY, this.width, barHeight);
      context.fillStyle = "lime"; // Changed to lime for better visibility
      // Ensure division by zero doesn't happen if maxHealth is somehow <= 0
      const healthPercentage =
        this.maxHealth > 0 ? this.health / this.maxHealth : 0;
      const currentHealthWidth = Math.max(0, this.width * healthPercentage);
      context.fillRect(this.x, barY, currentHealthWidth, barHeight);
    }
  }

  // --- NEW: Helper for subclasses that just want a default rectangle ---
  // (This isn't strictly needed if all subclasses draw custom shapes now)
  drawDefaultShape(context) {
    context.save();
    context.fillStyle = this.isHit ? "white" : this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
    context.restore();
  }

  hit(damage = 1, projectileType = "bullet") {
    // Default damage to 1
    if (this.markedForDeletion) return;
    const initialHealth = this.health;

    // --- ADD LOGGING ---
    console.log(
      `ENEMY HIT: ${this.id} (${this.constructor.name}) Type=${projectileType}, Dmg=${damage}, HealthBefore=${initialHealth}`
    );

    this.isHit = true;
    this.hitTimer = this.hitDuration;
    this.health -= damage; // Apply damage

    console.log(`   -> HealthAfter=${this.health}`); // Log new health

    if (this.health <= 0 && !this.markedForDeletion) {
      console.log(`   -> Marked for deletion! Score: +${this.scoreValue}`); // Log deletion
      this.markedForDeletion = true;
      this.game.addScore(this.scoreValue);

      const dropOriginType = this.enemyType === "ship" ? "ship" : "air";
      this.game.createExplosion(
        this.x + this.width / 2,
        this.y + this.height / 2,
        this.enemyType || "air"
      );
      if (Math.random() < this.game.powerUpDropChance) {
        console.log(
          `   -> Enemy ${this.id} type ${this.enemyType} dropping powerup.`
        );
        this.game.createPowerUp(
          this.x + this.width / 2,
          this.y + this.height / 2,
          dropOriginType
        );
      }
    }
  } // End hit
}
