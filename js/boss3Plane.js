// js/boss3Plane.js
import { EnemyPlane } from "./enemyPlane.js";
import { EnemyBullet } from "./enemyBullet.js"; // For spread shot and bombs
import { TrackingMissile } from "./trackingMissile.js"; // For new salvo attack
import { playSound } from "./audio.js";
import { randomInt } from "./utils.js";
import { Bomb } from "./bomb.js"; // For hit logic projectile check
import { SuperBomb } from "./superBomb.js"; // For hit logic projectile check

export class Boss3Plane extends EnemyPlane {
  constructor(game, speedBoost = 0) {
    super(game, speedBoost); // Calls base EnemyPlane constructor

    this.id = "boss_3_plane_component_v3"; // Update version
    this.enemyType = "air";

    // --- Stats ---
    this.width = 300;
    this.height = 110;
    // --- >>> INCREASE HEALTH DRAMATICALLY <<< ---
    this.maxHealth = 1600; // Example: Was 750, try much higher (maybe slightly less than ship?)
    this.health = this.maxHealth;
    // --- >>> END INCREASE <<< ---
    this.scoreValue = 3000; // Score split

    // Appearance
    this.color = "#8B0000";
    this.detailColor = "#FFA500";

    // --- Movement ---
    this.amplitude = 60;
    this.frequency = 0.007;
    this.speedX = 1.8;
    this.initialY = this.game.height * 0.3;
    this.y = this.initialY;
    this.angle = Math.random() * Math.PI * 2; // Use EnemyPlane's angle
    this.minX = 20;
    this.maxX = this.game.width - this.width - 20;
    this.moveDirectionX = 1; // Initialize direction

    // Entry Logic
    this.x = -this.width - 50;
    this.entryTargetX = this.minX + 50;
    this.isEntering = true;

    // --- Attack Timers <<< ---
    // Forward Spread Shot
    this.spreadTimer = randomInt(1500, 3000);
    this.spreadInterval = 2000; // Faster Spread

    // Bombing Run
    this.bombRunTimer = randomInt(8000, 12000);
    this.bombRunInterval = 10000; // Slightly faster bombs
    this.isBombing = false;
    this.bombDropCount = 0;
    this.maxBombsInRun = 10; // More bombs
    this.bombDropDelay = 130;
    this.bombDropTimer = 0;

    // Missile Salvo Attack Timer
    this.missileTimer = randomInt(6000, 9000);
    this.missileInterval = 7000;
    this.missileSalvoCount = 3;
    this.missileSalvoDelay = 300;
    // --- >>> END Attack Timers <<< ---

    console.log(`${this.id} created. Health: ${this.health}`);
  }

  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Entry Logic ---
    if (this.isEntering) {
      this.x += this.speedX * 2 * deltaScale; // Move right to enter
      if (this.x >= this.entryTargetX) {
        this.x = this.entryTargetX;
        this.isEntering = false;
        this.moveDirectionX = 1;
        console.log(`${this.id} entry complete.`);
      } // Start moving right
      // Vertical movement during entry
      if (this.initialY === undefined || isNaN(this.initialY)) {
        this.initialY = this.game.height * 0.3;
      }
      this.angle += this.frequency * deltaScale;
      this.y = this.initialY + Math.sin(this.angle) * this.amplitude;
      const entryTopBound = 10;
      const entryBottomBound = this.game.height - this.height - 150;
      this.y = Math.max(entryTopBound, Math.min(entryBottomBound, this.y));
      // Update hit flash timer even during entry
      if (this.isHit) {
        this.hitTimer -= safeDeltaTime;
        if (this.hitTimer <= 0) {
          this.isHit = false;
        }
      }
      return; // Skip normal logic during entry
    }
    // --- End Entry Logic ---

    // --- Normal Update ---
    // Horizontal Patrol Movement
    this.x += this.speedX * this.moveDirectionX * deltaScale;
    if (this.x <= this.minX && this.moveDirectionX === -1) {
      this.x = this.minX;
      this.moveDirectionX = 1;
    } else if (this.x >= this.maxX && this.moveDirectionX === 1) {
      this.x = this.maxX;
      this.moveDirectionX = -1;
    }
    // Vertical Sine Wave Movement
    if (this.initialY === undefined || isNaN(this.initialY)) {
      this.initialY = this.game.height * 0.3;
    }
    this.angle += this.frequency * deltaScale;
    this.y = this.initialY + Math.sin(this.angle) * this.amplitude;
    const topBound = 10;
    const bottomBound = this.game.height - this.height - 150;
    this.y = Math.max(topBound, Math.min(bottomBound, this.y));
    // --- End Movement ---

    // --- Attack Logic ---
    if (!this.isBombing) {
      // Don't fire other weapons while bombing
      // Spread Shot
      this.spreadTimer -= safeDeltaTime;
      if (this.spreadTimer <= 0) {
        this.fireSpreadShot();
        this.spreadTimer = this.spreadInterval + Math.random() * 500 - 250;
      }

      // Missile Salvo Attack
      this.missileTimer -= safeDeltaTime;
      if (this.missileTimer <= 0) {
        this.fireMissileSalvo();
        this.missileTimer = this.missileInterval + Math.random() * 1500 - 750;
      }
    }

    // Bombing Run Logic
    this.bombRunTimer -= safeDeltaTime;
    if (!this.isBombing && this.bombRunTimer <= 0) {
      this.startBombingRun();
    }
    // Bombing state machine
    if (this.isBombing) {
      this.bombDropTimer -= safeDeltaTime;
      if (this.bombDropTimer <= 0 && this.bombDropCount < this.maxBombsInRun) {
        this.dropBomb();
        this.bombDropCount++;
        this.bombDropTimer = this.bombDropDelay;
      }
      if (this.bombDropCount >= this.maxBombsInRun) {
        this.isBombing = false;
        this.bombRunTimer = this.bombRunInterval + Math.random() * 2000 - 1000;
        console.log(`${this.id}: Bombing run complete.`);
      }
    }
    // --- End Attack Logic ---

    // --- Hit Flash Update ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  } // End update

  // --- Attack Methods ---
  fireSpreadShot() {
    /* ... Unchanged ... */
  }
  startBombingRun() {
    /* ... Unchanged ... */
  }
  dropBomb() {
    /* ... Unchanged ... */
  }
  fireMissileSalvo() {
    /* ... Unchanged ... */
  }

  // --- Hit method ---
  hit(projectile) {
    if (
      this.markedForDeletion ||
      !projectile ||
      typeof projectile !== "object" ||
      projectile.markedForDeletion
    )
      return;
    const projectileType =
      projectile instanceof Bomb || projectile instanceof SuperBomb
        ? "bomb"
        : "bullet";
    const incomingDamage = projectile.damage || 1;
    const previousHealth = this.health;
    console.log(
      `Boss3Plane HIT: By ${
        projectile.constructor.name
      }, Type='${projectileType}', Dmg=${incomingDamage}, HealthBefore=${previousHealth.toFixed(
        1
      )}`
    );
    const effectiveDamage =
      incomingDamage * (projectileType === "bullet" ? 1.5 : 0.5); // Prefer bullets
    console.log(
      `   -> Applying ${effectiveDamage.toFixed(1)} effective damage.`
    );

    // Call base Enemy Plane -> Enemy hit method
    super.hit(effectiveDamage, projectileType);

    // Trigger Reinforcements
    if (previousHealth > 0 && this.health <= 0 && !this.markedForDeletion) {
      console.log(`${this.id} destroyed! Triggering Ship Reinforcements!`);
      this.game.spawnBoss3HelperShips(2, "mixed");
      this.markedForDeletion = true;
    }
  } // End hit

  // Draw method
  draw(context) {
    super.draw(context);
  } // Use EnemyPlane draw
} // End Boss3Plane class
