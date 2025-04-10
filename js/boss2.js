// js/boss2.js
import { Enemy } from "./enemy.js";
import { EnemyBullet } from "./enemyBullet.js";
import { TrackingMissile } from "./trackingMissile.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js"; // Needed for hit detection type check
import { Explosion } from "./explosion.js"; // For defeat effect

export class Boss2 extends Enemy {
  constructor(game) {
    super(game); // Call base Enemy constructor
    this.id = "boss_2_vulcan";
    this.enemyType = "air"; // Important for explosion type on death

    // --- Boss Specific Stats ---
    this.width = 280; // Wider than tall for delta wing
    this.height = 100;
    this.maxHealth = 350; // More health than Boss1? Adjust as needed
    this.health = this.maxHealth;
    this.scoreValue = 3500; // Significant score reward

    // Appearance
    this.color = "#404040"; // Dark grey main body
    this.detailColor = "#A0A0A0"; // Lighter grey for details/engines
    this.cockpitColor = "#00BFFF"; // Deep sky blue

    // --- Movement: Combined Sine Waves & Boundaries ---
    // Horizontal Sine Wave
    this.amplitudeX = (game.width - this.width - 40) / 2; // Max horizontal travel range
    this.frequencyX = 0.005; // Slow horizontal sweep
    this.angleX = Math.PI / 2; // Start near center horizontally
    this.baseX = game.width / 2 - this.width / 2; // Center point for horizontal wave

    // Vertical Sine Wave
    this.amplitudeY = 80; // Vertical movement range
    this.frequencyY = 0.008; // Slightly faster vertical bob
    this.angleY = 0;
    this.baseY = game.height * 0.25 - this.height / 2; // Center point for vertical wave (upper part of screen)

    // Initial Position (calculate based on angles 0)
    this.x = this.baseX + Math.sin(this.angleX) * this.amplitudeX;
    this.y = this.baseY + Math.sin(this.angleY) * this.amplitudeY;

    // Screen Boundaries (redundant check in update is safer)
    this.minX = 20;
    this.maxX = this.game.width - this.width - 20;
    this.minY = 20;
    this.maxY = this.game.height * 0.6 - this.height; // Keep it in the upper ~60%

    // --- Attack Patterns & Timers ---
    // Bullet Cannons
    this.bulletTimer = 2000 + Math.random() * 1000; // Initial delay
    this.bulletInterval = 1800; // Time between bullet bursts

    // Missile Launchers
    this.missileTimer = 6000 + Math.random() * 2000;
    this.missileInterval = 7000; // Less frequent than bullets

    // Bombing Run
    this.bombRunTimer = 10000 + Math.random() * 3000;
    this.bombRunInterval = 12000; // Long cooldown
    this.isBombing = false;
    this.bombDropCount = 0;
    this.maxBombsInRun = 8; // How many bombs per run
    this.bombDropDelay = 150; // ms between each bomb in a run
    this.bombDropTimer = 0; // Timer for within a run

    // --- Power-up Spawning --- (Similar to Game.js logic during boss)
    this.powerUpTimer = 0;
    this.powerUpBaseInterval = 12000; // Base interval (ms)
    this.powerUpRandomInterval = 4000; // Random addition (ms)
    this.powerUpInterval = this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval; // Initial interval

    console.log(`Boss2 Created (Vulcan) at (${this.x.toFixed(0)}, ${this.y.toFixed(0)}). Health: ${this.health}`);
  }

  update(deltaTime) {
    // Only update if not marked for deletion
    if (this.markedForDeletion) return;

    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Movement ---
    // Update angles
    this.angleX += this.frequencyX * deltaScale;
    this.angleY += this.frequencyY * deltaScale;

    // Calculate target position based on sine waves
    let targetX = this.baseX + Math.sin(this.angleX) * this.amplitudeX;
    let targetY = this.baseY + Math.sin(this.angleY) * this.amplitudeY;

    // Apply Screen Boundaries
    this.x = Math.max(this.minX, Math.min(this.maxX, targetX));
    this.y = Math.max(this.minY, Math.min(this.maxY, targetY));

    // --- Attack Logic ---
    // Update Attack Timers (Count down)
    this.bulletTimer -= safeDeltaTime;
    this.missileTimer -= safeDeltaTime;
    this.bombRunTimer -= safeDeltaTime;

    // Trigger Attacks (only if NOT currently bombing)
    if (!this.isBombing) {
      if (this.bulletTimer <= 0) {
        this.fireBullets();
        this.bulletTimer = this.bulletInterval + Math.random() * 500 - 250; // Reset timer with variance
      }
      if (this.missileTimer <= 0) {
        this.fireMissile();
        this.missileTimer = this.missileInterval + Math.random() * 1000 - 500;
      }
      if (this.bombRunTimer <= 0) {
        this.startBombingRun();
        // Reset bomb run timer AFTER the run completes (in bombing logic below)
      }
    }

    // --- Bombing Run State Machine ---
    if (this.isBombing) {
      this.bombDropTimer -= safeDeltaTime;
      if (this.bombDropTimer <= 0 && this.bombDropCount < this.maxBombsInRun) {
        this.dropSingleBomb();
        this.bombDropCount++;
        this.bombDropTimer = this.bombDropDelay; // Reset delay for next bomb
      }

      // Check if bombing run finished
      if (this.bombDropCount >= this.maxBombsInRun) {
        this.isBombing = false;
        this.bombRunTimer = this.bombRunInterval + Math.random() * 2000 - 1000; // Reset main bomb cooldown
        console.log("Boss2: Bombing run complete.");
      }
    }

    // --- Power-up Spawning Timer ---
    this.powerUpTimer += safeDeltaTime;
    if (this.powerUpTimer >= this.powerUpInterval) {
      this.powerUpTimer -= this.powerUpInterval; // More accurate reset
      this.powerUpInterval = this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval; // Reset next interval

      // Spawn power-up slightly below the boss
      const spawnX = this.x + this.width / 2 + (Math.random() - 0.5) * this.width * 0.5;
      const spawnY = this.y + this.height + 30; // Below the boss
      console.log("Boss2 Spawning timed power-up");
      this.game.createPowerUp(spawnX, spawnY);
    }

    // --- Hit Flash Update ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  } // End Boss2 update

  // Inside js/boss2.js -> Boss2 class

  hit(projectile) {
    // --- ADD TYPE CHECK AT THE VERY BEGINNING ---
    if (typeof projectile !== "object" || projectile === null) {
      console.error(`Boss2.hit received invalid projectile type: ${typeof projectile}`, projectile);
      return; // Exit early, do not process invalid input
    }
    // --- Check if projectile is already marked (might happen in complex collisions) ---
    if (projectile.markedForDeletion) {
      // console.warn("Boss2.hit called with already marked projectile.");
      return;
    }
    // --- Check if boss is already marked ---
    if (this.markedForDeletion) {
      return; // Don't process hits if boss is already defeated
    }

    // --- Now proceed, assuming projectile is a valid object ---
    const projectileType = projectile instanceof Bomb ? "bomb" : "bullet";
    // Ensure damage exists on the projectile object, default to 1 if not
    const damage = (projectile.damage || 1) * (projectileType === "bomb" ? 1.5 : 1);

    // Apply damage
    this.health -= damage;
    // console.log(`Boss2 Hit! Type: ${projectileType}, Damage: ${damage.toFixed(1)}, Health: ${this.health.toFixed(1)}/${this.maxHealth}`);

    // Trigger hit flash
    this.isHit = true;
    this.hitTimer = this.hitDuration; // Use base Enemy hitDuration

    // Mark projectile for deletion (Now safer after the type check)
    projectile.markedForDeletion = true; // <<< THIS LINE (was 175) is now safe

    // Check for defeat
    if (this.health <= 0 && !this.markedForDeletion) {
      console.log("Boss2 DEFEATED!");
      this.markedForDeletion = true; // Mark the main boss object for deletion
      this.game.addScore(this.scoreValue); // Add score
      this.triggerDefeatExplosion(); // Trigger visual effect
      // Game loop will handle the rest (removing boss, updating bossActive state)
    }
  } // End hit method

  // --- Attack Pattern Methods ---
  fireBullets() {
    // console.log("Boss2 firing bullets");
    playSound("enemyShoot"); // Use a generic or specific sound
    const bulletSpeedY = 4; // Firing downwards
    const numShots = 4; // Fire from multiple points under wings
    const spread = this.width * 0.35; // How far out the shots originate

    for (let i = 0; i < numShots; i++) {
      const offsetX = (i / (numShots - 1) - 0.5) * 2 * spread; // -spread to +spread
      const bulletX = this.x + this.width / 2 + offsetX - 4; // Center X adjusted by offset, minus bullet width/2
      const bulletY = this.y + this.height * 0.8; // Position under the wings
      this.game.addEnemyProjectile(new EnemyBullet(this.game, bulletX, bulletY, 0, bulletSpeedY)); // Straight down
    }
  }

  fireMissile() {
    // console.log("Boss2 firing missile");
    // Fire from center front?
    const missileX = this.x + this.width / 2 - 6; // Center X, adjust for missile width
    const missileY = this.y + this.height * 0.5; // Mid-height
    this.game.addEnemyProjectile(new TrackingMissile(this.game, missileX, missileY));
    // Sound played by missile constructor
  }

  startBombingRun() {
    if (this.isBombing) return; // Prevent starting if already bombing

    console.log("Boss2: Starting bombing run!");
    this.isBombing = true;
    this.bombDropCount = 0;
    this.bombDropTimer = 100; // Small delay before first bomb
    // playSound('bombRunStart'); // Optional specific sound
  }

  dropSingleBomb() {
    // console.log(`Boss2 dropping bomb ${this.bombDropCount + 1}/${this.maxBombsInRun}`);
    playSound("bomb_drop"); // Re-use player's bomb drop sound?
    const bombX = this.x + this.width / 2 - 5; // Center X, adjust for bomb width (using 10px bullet as bomb)
    const bombY = this.y + this.height * 0.9; // Drop from near the bottom edge

    // Using EnemyBullet styled as a bomb for simplicity
    const bombProjectile = new EnemyBullet(this.game, bombX, bombY, 0, 5); // Speed Y = 5 (falling)
    bombProjectile.width = 10;
    bombProjectile.height = 10;
    bombProjectile.color = "black"; // Make bombs black
    this.game.addEnemyProjectile(bombProjectile);
  }

  triggerDefeatExplosion() {
    // Create multiple large explosions over the boss area
    const numExplosions = 12;
    const duration = 1800; // Spread explosions over 1.8 seconds
    for (let i = 0; i < numExplosions; i++) {
      setTimeout(() => {
        if (!this.game.isGameOver) {
          // Check if game ended during the delay
          const randomX = this.x + Math.random() * this.width;
          const randomY = this.y + Math.random() * this.height;
          // Use 'air' explosion type, maybe make them larger?
          this.game.createExplosion(randomX, randomY, "air"); // Use existing explosion
          // Optionally, slightly larger radius for boss explosions? Could modify createExplosion or add a 'large_air' type.
        }
      }, i * (duration / numExplosions) + Math.random() * 150); // Staggered timing
    }
    // playSound('bossExplosion'); // Optional final big boom
  }

  draw(context) {
    if (this.markedForDeletion || !context) return;
    context.save();

    // Handle hit flash color override
    const currentBodyColor = this.isHit ? "white" : this.color;
    const currentDetailColor = this.isHit ? "white" : this.detailColor;
    const currentCockpitColor = this.isHit ? "white" : this.cockpitColor;

    // --- Draw Vulcan Delta Wing Shape ---
    context.fillStyle = currentBodyColor;
    context.beginPath();
    // Nose
    context.moveTo(this.x + this.width * 0.5, this.y);
    // Wing leading edges
    context.lineTo(this.x, this.y + this.height * 0.8);
    context.lineTo(this.x + this.width * 0.15, this.y + this.height); // Clipped tail corner
    // Tail center
    context.lineTo(this.x + this.width * 0.5, this.y + this.height * 0.9);
    // Other tail corner
    context.lineTo(this.x + this.width * 0.85, this.y + this.height);
    context.lineTo(this.x + this.width, this.y + this.height * 0.8);
    // Back to nose
    context.closePath();
    context.fill();

    // --- Draw Details ---
    // Cockpit
    context.fillStyle = currentCockpitColor;
    context.beginPath();
    context.moveTo(this.x + this.width * 0.45, this.y + this.height * 0.1);
    context.lineTo(this.x + this.width * 0.55, this.y + this.height * 0.1);
    context.lineTo(this.x + this.width * 0.5, this.y);
    context.closePath();
    context.fill();

    // Engine Intakes (simplified)
    context.fillStyle = currentDetailColor;
    context.fillRect(this.x + this.width * 0.3, this.y + this.height * 0.2, this.width * 0.15, this.height * 0.4);
    context.fillRect(this.x + this.width * 0.55, this.y + this.height * 0.2, this.width * 0.15, this.height * 0.4);

    // Tail Fin (vertical stabilizer)
    context.fillStyle = currentBodyColor; // Same as body
    context.beginPath();
    context.moveTo(this.x + this.width * 0.5, this.y + this.height * 0.15); // Base on fuselage top
    context.lineTo(this.x + this.width * 0.5, this.y + this.height * 0.8); // Top point of fin
    context.lineTo(this.x + this.width * 0.5 + 15, this.y + this.height * 0.9); // Back slope base
    context.lineTo(this.x + this.width * 0.5 - 15, this.y + this.height * 0.9); // Front slope base
    context.closePath();
    context.fill();

    context.restore();

    // --- Draw Health Bar (Calls Enemy.draw) ---
    super.draw(context);
  }
} // End Boss2 class
