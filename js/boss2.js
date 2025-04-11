// js/boss2.js
import { Enemy } from "./enemy.js";
import { EnemyBullet } from "./enemyBullet.js";
import { TrackingMissile } from "./trackingMissile.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js"; // Needed for hit detection type check
import { Explosion } from "./explosion.js"; // For defeat effect
// Make sure lerp is available (either here or from utils.js)

import { randomInt, lerp } from "./utils.js"; // Make sure randomInt is imported

export class Boss2 extends Enemy {
  constructor(game) {
    super(game); // Call base Enemy constructor
    this.id = "boss_2_vulcan_lerp_enter"; // Update version ID
    this.enemyType = "air";

    // --- Boss Stats ---
    this.width = 280;
    this.height = 100;
    this.maxHealth = 400; // Or your preferred value
    this.health = this.maxHealth;
    this.scoreValue = 3500;
    this.color = "#404040";
    this.detailColor = "#A0A0A0";
    this.cockpitColor = "#00BFFF";

    // --- Movement Parameters ---
    // Sine Wave Oscillation
    this.amplitudeX = (game.width - this.width - 40) / 2;
    this.frequencyX = 0.009; // Keep faster frequency
    this.angleX = Math.random() * Math.PI * 2;
    this.baseX = game.width / 2 - this.width / 2; // Center point for horizontal wave (doesn't drift now)

    this.amplitudeY = 90; // Slightly increased amplitude?
    this.frequencyY = 0.013; // Keep faster frequency
    this.angleY = Math.random() * Math.PI * 2;
    // Store the NORMAL high altitude base Y
    this.normalBaseY = game.height * 0.25 - this.height / 2;
    this.dipTargetBaseY = this.game.height * 0.5; // How low the baseY goes during a dip (adjust if needed)
    this.baseY = this.normalBaseY; // Current base Y (will be lerped)
    this.targetBaseY = this.normalBaseY; // <<< NEW: The base Y we are moving towards

    // --- Dipping State ---
    this.isDipping = false;
    this.dipTimer = 0;
    this.dipDuration = 3500; // How long a dip lasts (ms) - maybe shorter?
    this.dipCooldownTimer = randomInt(10000, 16000); // Time UNTIL next dip can start
    this.dipCooldownBase = 13000; // Base cooldown between dips
    this.dipCooldownRandom = 5000; // Random part of cooldown

    // --- >>> NEW: Lerp Speed <<< ---
    this.positionLerpSpeed = 0.08; // Adjust this value (try 0.05 to 0.15)
    this.baseYLerpSpeed = 0.05; // How quickly the base Y changes during dips
    // --- >>> END Lerp Speed <<< ---

    // Absolute Boundaries for the Boss sprite itself
    this.minX = 10;
    this.maxX = this.game.width - this.width - 10;
    this.minY = 10;
    this.maxY = this.game.height - this.height - 85; // Absolute bottom boundary

    // --- >>> Entrance Animation State <<< ---
    this.isEntering = true; // Start in entering state
    this.entrySpeedX = 3.0; // How fast it slides in (pixels per 16.67ms base)
    this.entryTargetX = this.maxX - this.amplitudeX * 0.5; // Stop slightly before max patrol extent
    // --- >>> End Entrance State <<< ---

    // --- Initial Position ---
    this.x = this.game.width + 50; // <<< START OFF-SCREEN RIGHT
    this.y = this.baseY + Math.sin(this.angleY) * this.amplitudeY; // Initial Y based on normal position
    this.y = Math.max(this.minY, Math.min(this.maxY, this.y)); // Clamp initial Y

    // --- Attack Timers & Logic ---
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

    // Power-up Spawning
    this.powerUpTimer = 0;
    this.powerUpBaseInterval = 8000; // More frequent powerups
    this.powerUpRandomInterval = 3000;
    this.powerUpInterval =
      this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval;

    console.log(
      `Boss2 Created (${
        this.id
      }) - Awaiting Entrance. TargetX: ${this.entryTargetX.toFixed(0)}`
    );
  } // End Constructor

  update(deltaTime) {
    // --- Basic Checks ---
    if (this.markedForDeletion) return;

    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- >>> MOVEMENT LOGIC <<< ---
    if (this.isEntering) {
      // --- STATE: ENTERING ---
      this.x -= this.entrySpeedX * deltaScale;

      // Optional: Slightly adjust Y based on sine wave during entry
      this.angleY += this.frequencyY * deltaScale;
      let entryTargetY =
        this.normalBaseY + Math.sin(this.angleY) * this.amplitudeY;
      let clampedEntryTargetY = Math.max(
        this.minY,
        Math.min(this.maxY, entryTargetY)
      );
      this.y = lerp(this.y, clampedEntryTargetY, this.positionLerpSpeed * 0.5); // Slower Y lerp

      // Check if entry is complete
      if (this.x <= this.entryTargetX) {
        this.x = this.entryTargetX;
        this.isEntering = false;
        console.log("Boss 2 Entrance Complete!");
      }
    } else {
      // --- STATE: NORMAL MOVEMENT (After Entering) ---

      // Update Dipping State & Calculate Target Base Y
      if (this.isDipping) {
        this.dipTimer -= safeDeltaTime;
        if (this.dipTimer <= 0) {
          this.isDipping = false;
          this.targetBaseY = this.normalBaseY;
          this.dipCooldownTimer =
            this.dipCooldownBase + Math.random() * this.dipCooldownRandom;
        }
      } else {
        this.dipCooldownTimer -= safeDeltaTime;
        if (this.dipCooldownTimer <= 0 && !this.isBombing) {
          this.isDipping = true;
          this.targetBaseY = this.dipTargetBaseY;
          this.dipTimer = this.dipDuration;
        }
      }
      // Lerp current baseY towards targetBaseY
      this.baseY = lerp(this.baseY, this.targetBaseY, this.baseYLerpSpeed);

      // Calculate Target Position based on Sine Waves & Current Base Coords
      this.angleX += this.frequencyX * deltaScale;
      this.angleY += this.frequencyY * deltaScale;
      let targetX_calculated =
        this.baseX + Math.sin(this.angleX) * this.amplitudeX;
      let targetY_calculated =
        this.baseY + Math.sin(this.angleY) * this.amplitudeY;

      // Apply Boundaries to Target
      let targetX_clamped = Math.max(
        this.minX,
        Math.min(this.maxX, targetX_calculated)
      );
      let targetY_clamped = Math.max(
        this.minY,
        Math.min(this.maxY, targetY_calculated)
      );

      // Lerp Actual Position towards clamped target
      this.x = lerp(this.x, targetX_clamped, this.positionLerpSpeed);
      this.y = lerp(this.y, targetY_clamped, this.positionLerpSpeed);
    } // --- >>> END MOVEMENT LOGIC <<< ---

    // --- >>> ATTACKS & OTHER UPDATES (Only run AFTER entering) <<< ---
    if (!this.isEntering) {
      // --- Attack Timer Updates ---
      let currentBulletInterval = this.bulletInterval;
      let currentMissileInterval = this.missileInterval;
      let currentBombRunInterval = this.bombRunInterval;
      // Add phase check here if needed: if (this.health <= this.maxHealth * 0.5) { ... }
      this.bulletTimer -= safeDeltaTime;
      this.missileTimer -= safeDeltaTime;
      this.bombRunTimer -= safeDeltaTime;

      // --- Firing Checks (Only if NOT currently bombing) ---
      if (!this.isBombing) {
        // Fire Bullets
        if (this.bulletTimer <= 0) {
          this.fireBullets();
          this.bulletTimer = Math.max(
            1,
            currentBulletInterval + Math.random() * 300 - 150
          );
        }
        // Fire Missile(s)
        if (this.missileTimer <= 0) {
          this.fireMissile();
          this.missileTimer = Math.max(
            1,
            currentMissileInterval + Math.random() * 800 - 400
          );
        }
        // Start Bombing Run
        if (this.bombRunTimer <= 0) {
          this.startBombingRun();
        }
      } // End firing checks

      // --- Bombing Run State Machine ---
      if (this.isBombing) {
        this.bombDropTimer -= safeDeltaTime;
        if (
          this.bombDropTimer <= 0 &&
          this.bombDropCount < this.maxBombsInRun
        ) {
          this.dropSingleBomb();
          this.bombDropCount++;
          this.bombDropTimer = this.bombDropDelay;
        }
        if (this.bombDropCount >= this.maxBombsInRun) {
          this.isBombing = false;
          this.bombRunTimer = Math.max(
            1,
            currentBombRunInterval + Math.random() * 2000 - 1000
          );
          console.log("Boss2: Bombing run complete.");
        }
      } // End Bombing Run state

      // --- Power-up Spawning Timer ---
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
      } // End Power-up spawning
    } // --- >>> END ATTACKS & OTHER UPDATES (if !isEntering) <<< ---

    // --- Hit Flash Update (Always run) ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  } // End Boss2 update

  hit(projectile) {
    if (typeof projectile !== "object" || projectile === null) {
      console.error(
        `Boss2.hit received invalid projectile type: ${typeof projectile}`,
        projectile
      );
      return;
    }
    if (projectile.markedForDeletion || this.markedForDeletion) {
      return;
    }

    const projectileType = projectile instanceof Bomb ? "bomb" : "bullet";
    const damage =
      (projectile.damage || 1) * (projectileType === "bomb" ? 1.5 : 1);

    this.health -= damage;
    this.isHit = true;
    this.hitTimer = this.hitDuration;
    projectile.markedForDeletion = true;

    if (this.health <= 0 && !this.markedForDeletion) {
      console.log("Boss2 DEFEATED!");
      this.markedForDeletion = true;
      this.game.addScore(this.scoreValue);
      this.triggerDefeatExplosion();
    }
  } // End hit method

  fireBullets() {
    playSound("enemyShoot");
    const bulletSpeedY = 4;
    const numShots = 5;
    const spread = this.width * 0.38;
    for (let i = 0; i < numShots; i++) {
      const offsetX = (i / (numShots - 1) - 0.5) * 2 * spread;
      const bulletX = this.x + this.width / 2 + offsetX - 4;
      const bulletY = this.y + this.height * 0.8;
      const spreadSpeedX = (Math.random() - 0.5) * 1.0;
      const speedY = bulletSpeedY + Math.random() * 0.5;
      this.game.addEnemyProjectile(
        new EnemyBullet(this.game, bulletX, bulletY, spreadSpeedX, speedY)
      );
    }
  }

  fireMissile() {
    const missileX = this.x + this.width / 2 - 6;
    const missileY = this.y + this.height * 0.5;
    this.game.addEnemyProjectile(
      new TrackingMissile(this.game, missileX, missileY)
    );
    if (this.health < this.maxHealth * 0.75 && Math.random() < 0.4) {
      setTimeout(() => {
        if (!this.markedForDeletion && !this.game.isGameOver) {
          console.log("Boss2 firing second missile!");
          const missileX2 =
            this.x + this.width / 2 - 6 + (Math.random() < 0.5 ? -20 : 20);
          const missileY2 = this.y + this.height * 0.5;
          this.game.addEnemyProjectile(
            new TrackingMissile(this.game, missileX2, missileY2)
          );
        }
      }, 300);
    }
  }

  startBombingRun() {
    if (this.isBombing) return;
    console.log("Boss2: Starting bombing run!");
    this.isBombing = true;
    this.bombDropCount = 0;
    this.bombDropTimer = 100;
  }

  dropSingleBomb() {
    playSound("bomb_drop");
    const bombX = this.x + this.width / 2 - 5;
    const bombY = this.y + this.height * 0.9;
    const bombProjectile = new EnemyBullet(this.game, bombX, bombY, 0, 5);
    bombProjectile.width = 10;
    bombProjectile.height = 10;
    bombProjectile.color = "black";
    this.game.addEnemyProjectile(bombProjectile);
  }

  triggerDefeatExplosion() {
    const numExplosions = 12;
    const duration = 1800;
    for (let i = 0; i < numExplosions; i++) {
      setTimeout(() => {
        if (!this.game.isGameOver) {
          const randomX = this.x + Math.random() * this.width;
          const randomY = this.y + Math.random() * this.height;
          this.game.createExplosion(randomX, randomY, "air");
        }
      }, i * (duration / numExplosions) + Math.random() * 150);
    }
  }

  draw(context) {
    if (this.markedForDeletion || !context) return;
    context.save();
    const currentBodyColor = this.isHit ? "white" : this.color;
    const currentDetailColor = this.isHit ? "white" : this.detailColor;
    const currentCockpitColor = this.isHit ? "white" : this.cockpitColor;
    // Draw Wing Shape
    context.fillStyle = currentBodyColor;
    context.beginPath();
    context.moveTo(this.x + this.width * 0.5, this.y);
    context.lineTo(this.x, this.y + this.height * 0.8);
    context.lineTo(this.x + this.width * 0.15, this.y + this.height);
    context.lineTo(this.x + this.width * 0.5, this.y + this.height * 0.9);
    context.lineTo(this.x + this.width * 0.85, this.y + this.height);
    context.lineTo(this.x + this.width, this.y + this.height * 0.8);
    context.closePath();
    context.fill();
    // Draw Details
    context.fillStyle = currentCockpitColor;
    context.beginPath();
    context.moveTo(this.x + this.width * 0.45, this.y + this.height * 0.1);
    context.lineTo(this.x + this.width * 0.55, this.y + this.height * 0.1);
    context.lineTo(this.x + this.width * 0.5, this.y);
    context.closePath();
    context.fill();
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
    context.fillStyle = currentBodyColor;
    context.beginPath();
    context.moveTo(this.x + this.width * 0.5, this.y + this.height * 0.15);
    context.lineTo(this.x + this.width * 0.5, this.y + this.height * 0.8);
    context.lineTo(this.x + this.width * 0.5 + 15, this.y + this.height * 0.9);
    context.lineTo(this.x + this.width * 0.5 - 15, this.y + this.height * 0.9);
    context.closePath();
    context.fill();
    context.restore();
    // Draw Health Bar
    super.draw(context);
  } // End draw
} // End Boss2 class
