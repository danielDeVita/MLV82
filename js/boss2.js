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
    this.id = "boss_2_vulcan_persistent_support"; // New ID
    this.enemyType = "air";
    // --- Boss Stats, Appearance, Movement (Keep lerp/dip version) ---
    this.width = 280;
    this.height = 100;
    this.maxHealth = 450; // Maybe slightly more health?
    this.health = this.maxHealth;
    this.scoreValue = 800; // Higher score value
    this.color = "#404040";
    this.detailColor = "#A0A0A0";
    this.cockpitColor = "#00BFFF";
    this.amplitudeX = (game.width - this.width - 40) / 2;
    this.frequencyX = 0.009;
    this.angleX = Math.random() * Math.PI * 2;
    this.baseX = game.width / 2 - this.width / 2;
    this.amplitudeY = 90;
    this.frequencyY = 0.013;
    this.angleY = Math.random() * Math.PI * 2;
    this.normalBaseY = game.height * 0.25 - this.height / 2;
    this.dipTargetBaseY = this.game.height * 0.5;
    this.baseY = this.normalBaseY;
    this.targetBaseY = this.normalBaseY;
    this.isDipping = false;
    this.dipTimer = 0;
    this.dipDuration = 3500;
    this.dipCooldownTimer = randomInt(10000, 16000);
    this.dipCooldownBase = 13000;
    this.dipCooldownRandom = 5000;
    this.positionLerpSpeed = 0.08;
    this.baseYLerpSpeed = 0.05;
    this.minX = 10;
    this.maxX = this.game.width - this.width - 10;
    this.minY = 10;
    this.maxY = this.game.height - this.height - 85;
    this.isEntering = true;
    this.entrySpeedX = 3.0;
    this.entryTargetX = this.maxX - this.amplitudeX * 0.5;
    this.x = this.game.width + 50;
    this.y = this.baseY + Math.sin(this.angleY) * this.amplitudeY;
    this.y = Math.max(this.minY, Math.min(this.maxY, this.y));

    // --- Attack Timers & Base Intervals ---
    this.bulletTimer = 2000 + Math.random() * 1000;
    this.bulletIntervalBase = 1500;
    this.missileTimer = 5000 + Math.random() * 1500;
    this.missileIntervalBase = 5500;
    this.bombRunTimer = 8000 + Math.random() * 2000;
    this.bombRunIntervalBase = 10000;
    this.isBombing = false;
    this.bombDropCount = 0;
    this.maxBombsInRun = 10;
    this.bombDropDelay = 110;
    this.bombDropTimer = 0;

    // --- Phase State ---
    this.currentPhase = 1;

    // --- >>> NEW: Helper Ship Spawn Timers & Thresholds <<< ---
    this.summonThreshold1 = 0.7; // Health percentage for first wave tier
    this.summonThreshold2 = 0.4; // Health percentage for second wave tier

    this.shipWave1Timer = randomInt(5000, 8000); // Initial delay for first tier spawns
    this.shipWave1Interval = 12000; // How often wave 1 ships spawn (adjust)

    this.shipWave2Timer = randomInt(6000, 9000); // Initial delay for second tier spawns
    this.shipWave2Interval = 10000; // How often wave 2 ships spawn (faster?)
    // --- >>> END Ship Spawn Timers <<< ---

    // Power-up Spawning
    this.powerUpTimer = 0;
    this.powerUpBaseInterval = 8000;
    this.powerUpRandomInterval = 3000;
    this.powerUpInterval =
      this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval;
  } // End Constructor

  update(deltaTime) {
    if (this.markedForDeletion) return;
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Movement Logic (Entrance, Dip, Lerp - Should be the same as your last working version) ---
    if (this.isEntering) {
      this.x -= this.entrySpeedX * deltaScale;
      this.angleY += this.frequencyY * deltaScale;
      let entryTargetY =
        this.normalBaseY + Math.sin(this.angleY) * this.amplitudeY;
      let clampedEntryTargetY = Math.max(
        this.minY,
        Math.min(this.maxY, entryTargetY)
      );
      this.y = lerp(this.y, clampedEntryTargetY, this.positionLerpSpeed * 0.5);
      if (this.x <= this.entryTargetX) {
        this.x = this.entryTargetX;
        this.isEntering = false;
      }
    } else {
      // Dipping State Update
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
      this.baseY = lerp(this.baseY, this.targetBaseY, this.baseYLerpSpeed);
      // Sine Wave + Lerp Update
      this.angleX += this.frequencyX * deltaScale;
      this.angleY += this.frequencyY * deltaScale;
      let targetX_calculated =
        this.baseX + Math.sin(this.angleX) * this.amplitudeX;
      let targetY_calculated =
        this.baseY + Math.sin(this.angleY) * this.amplitudeY;
      let targetX_clamped = Math.max(
        this.minX,
        Math.min(this.maxX, targetX_calculated)
      );
      let targetY_clamped = Math.max(
        this.minY,
        Math.min(this.maxY, targetY_calculated)
      );
      this.x = lerp(this.x, targetX_clamped, this.positionLerpSpeed);
      this.y = lerp(this.y, targetY_clamped, this.positionLerpSpeed);
    } // --- End Movement Logic ---

    // --- ATTACKS & OTHER UPDATES (Only run AFTER entering) ---
    if (!this.isEntering) {
      // Phase Transition Logic (Keep this for boss attack intensity)
      const healthPercent = this.health / this.maxHealth;
      let newPhase = 1;
      if (healthPercent <= 0.33) {
        newPhase = 3;
      } else if (healthPercent <= 0.66) {
        newPhase = 2;
      }
      if (newPhase > this.currentPhase) {
        this.currentPhase = newPhase;
      }

      // Calculate Current Attack Intervals based on Phase
      let currentBulletInterval = this.bulletIntervalBase;
      let currentMissileInterval = this.missileIntervalBase;
      let currentBombRunInterval = this.bombRunIntervalBase;
      if (this.currentPhase === 2) {
        currentBulletInterval *= 0.8;
        currentMissileInterval *= 0.85;
      } else if (this.currentPhase === 3) {
        currentBulletInterval *= 0.6;
        currentMissileInterval *= 0.7;
        currentBombRunInterval *= 0.8;
      }

      // Main Attack Timers & Firing
      this.bulletTimer -= safeDeltaTime;
      this.missileTimer -= safeDeltaTime;
      this.bombRunTimer -= safeDeltaTime;
      if (!this.isBombing) {
        // Fire Bullets (Uses current interval, method checks phase)
        if (this.bulletTimer <= 0) {
          this.fireBullets();
          this.bulletTimer = Math.max(
            1,
            currentBulletInterval + Math.random() * 300 - 150
          );
        }
        // Fire Missile(s) (Uses current interval, method checks phase)
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
      }
      // Bombing Run State Machine (Uses current interval for reset, phase might affect max bombs)
      if (this.isBombing) {
        this.bombDropTimer -= safeDeltaTime;
        let maxBombs = this.currentPhase === 3 ? 12 : this.maxBombsInRun;
        if (this.bombDropTimer <= 0 && this.bombDropCount < maxBombs) {
          this.dropSingleBomb();
          this.bombDropCount++;
          this.bombDropTimer = this.bombDropDelay;
        }
        if (this.bombDropCount >= maxBombs) {
          this.isBombing = false;
          this.bombRunTimer = Math.max(
            1,
            currentBombRunInterval + Math.random() * 2000 - 1000
          );
        }
      }

      // --- >>> Persistent Ship Summoning Logic <<< ---
      // Tier 1 Ships (Spawn if health <= threshold 1)
      if (healthPercent <= this.summonThreshold1) {
        this.shipWave1Timer -= safeDeltaTime;
        if (this.shipWave1Timer <= 0) {
          this.game.spawnBoss2HelperShips(1, "shooter"); // Example: 1 Shooter
          this.shipWave1Timer =
            this.shipWave1Interval + Math.random() * 4000 - 2000; // Reset timer
        }
      }

      // Tier 2 Ships (Spawn if health <= threshold 2 - can overlap with tier 1)
      if (healthPercent <= this.summonThreshold2) {
        this.shipWave2Timer -= safeDeltaTime;
        if (this.shipWave2Timer <= 0) {
          this.game.spawnBoss2HelperShips(1, "tracking"); // Example: 1 Tracking
          this.shipWave2Timer =
            this.shipWave2Interval + Math.random() * 3000 - 1500; // Reset timer
        }
      }
      // --- >>> END Persistent Ship Summoning <<< ---

      // --- Power-up Spawning Timer ---
      this.powerUpTimer += safeDeltaTime;
      if (this.powerUpTimer >= this.powerUpInterval) {
        this.powerUpTimer -= this.powerUpInterval;
        this.powerUpInterval =
          this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval;
        const spawnX =
          this.x + this.width / 2 + (Math.random() - 0.5) * this.width * 0.5;
        const spawnY = this.y + this.height + 30;

        this.game.createPowerUp(spawnX, spawnY);
      } // End Power-up spawning
    } // --- END ATTACKS & OTHER UPDATES (if !isEntering) ---

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
      this.markedForDeletion = true;
      this.game.addScore(this.scoreValue);
      this.triggerDefeatExplosion();
    }
  } // End hit method

  // --- Modified Attack Methods ---
  fireBullets() {
    playSound("enemyShoot");
    const bulletSpeedY = 4.0;
    const numShots = this.currentPhase >= 2 ? 6 : 5;
    const spread = this.width * (this.currentPhase >= 3 ? 0.4 : 0.38);
    const xVariance = this.currentPhase >= 2 ? 1.5 : 1.0;

    for (let i = 0; i < numShots; i++) {
      const offsetX = (i / (numShots - 1) - 0.5) * 2 * spread;
      const bulletX = this.x + this.width / 2 + offsetX - 4;
      const bulletY = this.y + this.height * 0.8;
      const spreadSpeedX = (Math.random() - 0.5) * xVariance; // Apply variance
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
    let fireSecondChance = 0;
    if (this.currentPhase === 2) {
      fireSecondChance = 0.4;
    } else if (this.currentPhase === 3) {
      fireSecondChance = 0.75;
    }

    // Check if the second missile should fire
    if (Math.random() < fireSecondChance) {
      setTimeout(() => {
        // Use setTimeout for a slight delay
        if (!this.markedForDeletion && !this.game.isGameOver) {
          // Check validity when timeout runs

          const missileX2 =
            this.x + this.width / 2 - 6 + (Math.random() < 0.5 ? -25 : 25); // Offset X
          const missileY2 = this.y + this.height * 0.5; // Same Y
          this.game.addEnemyProjectile(
            new TrackingMissile(this.game, missileX2, missileY2)
          );
        }
      }, 250); // Delay in milliseconds
    }
  }

  startBombingRun() {
    if (this.isBombing) return;

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
