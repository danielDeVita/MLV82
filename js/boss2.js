import { Enemy } from "./enemy.js";
import { EnemyBullet } from "./enemyBullet.js";
import { TrackingMissile } from "./trackingMissile.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js"; // Needed for hit detection type check
import { Explosion } from "./explosion.js"; // For defeat effect
import { randomInt, lerp } from "./utils.js"; // Make sure randomInt is imported

export class Boss2 extends Enemy {
  constructor(game) {
    super(game);
    this.id = "boss_2_vulcan_lerp"; // Update version ID
    this.enemyType = "air";

    // --- Boss Stats ---
    // ... (width, height, health, score, colors - no change) ...
    this.width = 280;
    this.height = 100;
    this.maxHealth = 400;
    this.health = this.maxHealth;
    this.scoreValue = 3500;
    this.color = "#404040";
    this.detailColor = "#A0A0A0";
    this.cockpitColor = "#00BFFF";

    // --- Movement Parameters ---
    this.amplitudeX = (game.width - this.width - 40) / 2;
    this.frequencyX = 0.009; // Keep faster frequency
    this.angleX = Math.random() * Math.PI * 2;
    this.baseX = game.width / 2 - this.width / 2;

    this.amplitudeY = 90;
    this.frequencyY = 0.013; // Keep faster frequency
    this.angleY = Math.random() * Math.PI * 2;
    this.normalBaseY = game.height * 0.25 - this.height / 2;
    this.dipTargetBaseY = this.game.height * 0.5;
    this.baseY = this.normalBaseY; // Current base Y (will be lerped)
    this.targetBaseY = this.normalBaseY; // <<< NEW: The base Y we are moving towards

    // --- Dipping State ---
    this.isDipping = false;
    this.dipTimer = 0;
    this.dipDuration = 3500;
    this.dipCooldownTimer = randomInt(10000, 16000);
    this.dipCooldownBase = 13000;
    this.dipCooldownRandom = 5000;

    // --- >>> NEW: Lerp Speed <<< ---
    // How quickly the boss moves towards its target position each frame (0 to 1)
    // Smaller values = smoother/slower response; Larger values = snappier/jerkier
    this.positionLerpSpeed = 0.08; // Adjust this value (try 0.05 to 0.15)
    this.baseYLerpSpeed = 0.05; // How quickly the base Y changes during dips
    // --- >>> END Lerp Speed <<< ---

    // Absolute Boundaries for the Boss sprite itself
    this.minX = 10;
    this.maxX = this.game.width - this.width - 10;
    this.minY = 10;
    this.maxY = this.game.height - this.height - 85;

    // Initial position - set directly for the first frame
    this.x = this.baseX + Math.sin(this.angleX) * this.amplitudeX;
    this.y = this.baseY + Math.sin(this.angleY) * this.amplitudeY;

    // --- Attack Timers & Powerups (No change from previous version) ---
    this.bulletTimer = 2000 + Math.random() * 1000;
    this.bulletInterval = 1500;
    this.missileTimer = 5000 + Math.random() * 1500;
    this.missileInterval = 5500;
    this.bombRunTimer = 8000 + Math.random() * 2000;
    this.bombRunInterval = 10000;
    this.isBombing = false;
    this.bombDropCount = 0;
    this.maxBombsInRun = 10;
    this.bombDropDelay = 110;
    this.bombDropTimer = 0;
    this.powerUpTimer = 0;
    this.powerUpBaseInterval = 8000;
    this.powerUpRandomInterval = 3000;
    this.powerUpInterval =
      this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval;

    console.log(
      `Boss2 Created (${this.id}) - Lerped Movement. Frequencies X=${this.frequencyX}, Y=${this.frequencyY}`
    );
  }

  update(deltaTime) {
    if (this.markedForDeletion) return;

    const safeDeltaTime = Math.max(0.1, deltaTime);
    // Note: We won't use deltaScale directly for lerp amount here,
    // as lerp amount is usually independent of frame rate (it's a fraction per frame).
    // We could make it frame-rate independent, but let's start simple.

    // --- Dipping Logic (Sets the TARGET base Y) ---
    if (this.isDipping) {
      this.dipTimer -= safeDeltaTime;
      if (this.dipTimer <= 0) {
        console.log("Boss 2: Dip finished, returning to normal altitude.");
        this.isDipping = false;
        this.targetBaseY = this.normalBaseY; // Set target back to normal
        this.dipCooldownTimer =
          this.dipCooldownBase + Math.random() * this.dipCooldownRandom;
      }
      // else: targetBaseY remains low
    } else {
      this.dipCooldownTimer -= safeDeltaTime;
      if (this.dipCooldownTimer <= 0 && !this.isBombing) {
        console.log("Boss 2: Starting dip!");
        this.isDipping = true;
        this.targetBaseY = this.dipTargetBaseY; // Set target low
        this.dipTimer = this.dipDuration;
      }
      // else: targetBaseY remains normal
    }
    // --- Smoothly move current baseY towards targetBaseY ---
    this.baseY = lerp(this.baseY, this.targetBaseY, this.baseYLerpSpeed);
    // --- End Dipping Logic ---

    // --- Calculate Target Position based on Sine Waves ---
    this.angleX += this.frequencyX * (safeDeltaTime / 16.67); // Scale angle change by delta
    this.angleY += this.frequencyY * (safeDeltaTime / 16.67); // Scale angle change by delta
    let targetX_calculated =
      this.baseX + Math.sin(this.angleX) * this.amplitudeX;
    let targetY_calculated =
      this.baseY + Math.sin(this.angleY) * this.amplitudeY;

    // --- Apply Absolute Screen Boundaries to the TARGET position ---
    // Clamp the calculated target before lerping towards it
    let targetX_clamped = Math.max(
      this.minX,
      Math.min(this.maxX, targetX_calculated)
    );
    let targetY_clamped = Math.max(
      this.minY,
      Math.min(this.maxY, targetY_calculated)
    );

    // --- >>> Apply Lerp to Actual Position <<< ---
    // Move current position (this.x, this.y) towards the clamped target position
    this.x = lerp(this.x, targetX_clamped, this.positionLerpSpeed);
    this.y = lerp(this.y, targetY_clamped, this.positionLerpSpeed);
    // --- >>> END Lerp Application <<< ---

    // --- Attack Logic (No changes needed here, uses existing intervals) ---
    let currentBulletInterval = this.bulletInterval;
    let currentMissileInterval = this.missileInterval;
    let currentBombRunInterval = this.bombRunInterval;
    this.bulletTimer -= safeDeltaTime;
    this.missileTimer -= safeDeltaTime;
    this.bombRunTimer -= safeDeltaTime;

    if (!this.isBombing) {
      if (this.bulletTimer <= 0) {
        this.fireBullets();
        this.bulletTimer = currentBulletInterval + Math.random() * 300 - 150;
      }
      if (this.missileTimer <= 0) {
        this.fireMissile();
        this.missileTimer = currentMissileInterval + Math.random() * 800 - 400;
      }
      if (this.bombRunTimer <= 0) {
        this.startBombingRun();
      }
    }
    // Bombing Run State Machine
    if (this.isBombing) {
      this.bombDropTimer -= safeDeltaTime;
      if (this.bombDropTimer <= 0 && this.bombDropCount < this.maxBombsInRun) {
        this.dropSingleBomb();
        this.bombDropCount++;
        this.bombDropTimer = this.bombDropDelay;
      }
      if (this.bombDropCount >= this.maxBombsInRun) {
        this.isBombing = false;
        this.bombRunTimer =
          currentBombRunInterval + Math.random() * 2000 - 1000;
        console.log("Boss2: Bombing run complete.");
      }
    }

    // --- Power-up Spawning Timer (Uses updated shorter intervals) ---
    this.powerUpTimer += safeDeltaTime;
    if (this.powerUpTimer >= this.powerUpInterval) {
      this.powerUpTimer -= this.powerUpInterval; // Use subtraction reset
      this.powerUpInterval =
        this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval; // Recalculate next interval
      const spawnX =
        this.x + this.width / 2 + (Math.random() - 0.5) * this.width * 0.5;
      const spawnY = this.y + this.height + 30;
      console.log("Boss2 Spawning timed power-up (more frequent)");
      this.game.createPowerUp(spawnX, spawnY);
    }

    // Hit Flash Update
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) this.isHit = false;
    }
  }

  // Inside js/boss2.js -> Boss2 class

  hit(projectile) {
    // --- ADD TYPE CHECK AT THE VERY BEGINNING ---
    if (typeof projectile !== "object" || projectile === null) {
      console.error(
        `Boss2.hit received invalid projectile type: ${typeof projectile}`,
        projectile
      );
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
    const damage =
      (projectile.damage || 1) * (projectileType === "bomb" ? 1.5 : 1);

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
    const numShots = 5; // Fire from multiple points under wings, was 4 previously
    const spread = this.width * 0.38; // How far out the shots originate, was .35 previously

    for (let i = 0; i < numShots; i++) {
      const offsetX = (i / (numShots - 1) - 0.5) * 2 * spread; // -spread to +spread
      const bulletX = this.x + this.width / 2 + offsetX - 4; // Center X adjusted by offset, minus bullet width/2
      const bulletY = this.y + this.height * 0.8; // Position under the wings

      // --- ADD VARIANCE ---
      const spreadSpeedX = (Math.random() - 0.5) * 1.0; // Small random horizontal speed (-0.5 to +0.5)
      const speedY = bulletSpeedY + Math.random() * 0.5; // Slightly variable downward speed
      // --- END VARIANCE ---

      this.game.addEnemyProjectile(
        new EnemyBullet(this.game, bulletX, bulletY, spreadSpeedX, speedY)
      ); // Use new speeds
    }
  }

  fireMissile() {
    // console.log("Boss2 firing missile");
    // Fire from center front?
    const missileX = this.x + this.width / 2 - 6; // Center X, adjust for missile width
    const missileY = this.y + this.height * 0.5; // Mid-height
    this.game.addEnemyProjectile(
      new TrackingMissile(this.game, missileX, missileY)
    );

    // --- ADD CHANCE FOR SECOND MISSILE ---
    // Only fire a second one if health is below, say, 75%? Or just random chance?
    if (this.health < this.maxHealth * 0.75 && Math.random() < 0.4) {
      // 40% chance below 75% health
      // Fire second missile slightly delayed and offset?
      setTimeout(() => {
        // Check if boss/game still valid when timeout fires
        if (!this.markedForDeletion && !this.game.isGameOver) {
          console.log("Boss2 firing second missile!");
          const missileX2 =
            this.x + this.width / 2 - 6 + (Math.random() < 0.5 ? -20 : 20); // Slight H offset
          const missileY2 = this.y + this.height * 0.5;
          this.game.addEnemyProjectile(
            new TrackingMissile(this.game, missileX2, missileY2)
          );
        }
      }, 300); // 300ms delay
    }
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
    context.fillRect(
      this.x + this.width * 0.3,
      this.y + this.height * 0.2,
      this.width * 0.15,
      this.height * 0.4
    );
    context.fillRect(
      this.x + this.width * 0.55,
      this.y + this.height * 0.2,
      this.width * 0.15,
      this.height * 0.4
    );

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
