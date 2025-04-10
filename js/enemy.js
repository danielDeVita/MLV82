// js/enemy.js

export class Enemy {
  constructor(game) {
    this.game = game;
    this.id = `enemy_${Math.random().toString(36).substring(2, 9)}`; // Simple unique-ish ID for logging
    this.x = this.game.width;
    this.y = 0; // Position set by subclasses
    this.width = 50; // Default size
    this.height = 30; // Default size
    this.speedX = Math.random() * 2 + 1;
    this.markedForDeletion = false;
    this.health = 1;
    this.scoreValue = 10;
    this.color = "grey";
    this.maxHealth = this.health;

    // Hit Flash
    this.isHit = false;
    this.hitTimer = 0;
    this.hitDuration = 100;
  }

  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;
    this.x -= this.speedX * deltaScale; // Scaled horizontal movement

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

  // --- MODIFIED: Base draw method ONLY handles common elements like health bar ---
  draw(context) {
    // --- HEALTH BAR LOGIC (Centralized Here) ---
    if (this.maxHealth && this.maxHealth > 1 && !this.markedForDeletion) {
      const barY = this.y - 8; // Position above enemy
      const barHeight = 4;
      context.fillStyle = "red"; // Background of health bar
      context.fillRect(this.x, barY, this.width, barHeight);
      context.fillStyle = "green"; // Foreground (current health)
      const currentHealthWidth = Math.max(0, this.width * (this.health / this.maxHealth));

      // Optional Log for debugging health bar display issues
      // console.log(`DEBUG HealthBar (Base Enemy Draw - ${this.constructor.name} ID=${this.id}): H=${this.health}, Max=${this.maxHealth}, W=${currentHealthWidth.toFixed(1)}`);

      context.fillRect(this.x, barY, currentHealthWidth, barHeight); // Draw green part
    }
    // NOTE: No shape drawing here! Subclasses handle their own shapes.
  }

  // --- NEW: Helper for subclasses that just want a default rectangle ---
  // (This isn't strictly needed if all subclasses draw custom shapes now)
  drawDefaultShape(context) {
    context.save();
    context.fillStyle = this.isHit ? "white" : this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
    context.restore();
  }

  hit(damage, projectileType = "bullet") {
    // console.log(`DEBUG BASE Enemy Hit: Called on ${this.constructor.name}, Damage=${damage}, CurrentHealth=${this.health}, Type='${projectileType}'`);
    this.isHit = true;
    this.hitTimer = this.hitDuration;
    this.health -= damage;
    // console.log(`DEBUG BASE Enemy Hit: Health AFTER damage: ${this.health}`);

    if (this.health <= 0 && !this.markedForDeletion) {
      // console.log(`DEBUG BASE Enemy Hit: Health <= 0! Marking for deletion. ID=${this.id}`);
      this.markedForDeletion = true;
      this.game.addScore(this.scoreValue);
      this.game.createExplosion(this.x + this.width / 2, this.y + this.height / 2, this.enemyType || "air");
      if (Math.random() < this.game.powerUpDropChance) {
        this.game.createPowerUp(this.x + this.width / 2, this.y + this.height / 2);
      }
    } // else if (this.health > 0) { console.log(`DEBUG BASE Enemy Hit: Health > 0. Enemy survives.`); }
    // else if (this.markedForDeletion) { console.log(`DEBUG BASE Enemy Hit: Health <= 0 but already marked.`); }
  }
}
