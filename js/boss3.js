// js/boss3.js
import { Enemy } from "./enemy.js";
import { BossWeakPoint } from "./bossWeakPoint.js";
import { EnemyBullet } from "./enemyBullet.js";
// Remove TrackingMissile if only tower used it
// import { TrackingMissile } from "./trackingMissile.js";
import { EnemyShooterPlane } from "./enemyShooterPlane.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js";
import { checkCollision } from "./utils.js";
import { randomInt } from "./utils.js";

export class Boss3 extends Enemy {
  constructor(game) {
    console.log("Boss3 Constructor START (No Tower)");
    super(game);

    this.id = "boss_3_airfield_base"; // New ID
    this.enemyType = "ground_installation";

    this.width = this.game.width;
    this.height = 200;
    this.y = this.game.height - this.height - 80;
    this.x = 0;
    this.speedX = 0; // Stationary

    this.health = 1; // Base object irrelevant
    this.maxHealth = 1;
    this.scoreValue = 4000; // Adjusted score (less complex boss)

    this.runwayColor = "#555555";
    this.buildingColor = "#708090";
    this.lineColor = "#CCCCCC";

    // --- Weak Points ---
    this.weakPoints = [];
    this.hangarSpawnTimers = [];
    this.aaGunTimers = [];
    this.aaGunBaseInterval = 2200;
    this.aaGunRandomInterval = 800;

    console.log("... Calling createWeakPoints...");
    try {
      this.createWeakPoints(); // Creates 7 points (No Tower)
      console.log("... createWeakPoints FINISHED.");
    } catch (error) {
      console.error("!!! ERROR during createWeakPoints !!!", error);
    }

    // --- REMOVED Tower State ---
    // this.controlTowerVulnerable = false;
    // this.essentialDefenseTypes = ["aaGun", "radar"];

    // --- REMOVED Tower Timers ---
    // this.controlTowerAttackTimer = 3000 + Math.random() * 1000;
    // this.controlTowerAttackInterval = 4500;

    // Power-up spawning
    this.powerUpTimer = 0;
    this.powerUpBaseInterval = 11000; // Maybe slightly slower powerups now?
    this.powerUpRandomInterval = 4000;
    this.powerUpInterval = this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval;

    console.log(`Boss3 Created (${this.id}) with ${this.weakPoints.length} target weak points.`);
  }

  createWeakPoints() {
    this.weakPoints = [];
    this.hangarSpawnTimers = [];
    this.aaGunTimers = [];

    const baseOffsetY = 30;
    const hangarHeight = 50;
    const hangarOffsetY = this.height - hangarHeight - 10;
    const hangarWidth = 70;
    const hangarSpacing = 150;

    // Define weak points data (7 total - NO TOWER)
    const weakPointData = [
      // 1. AA Guns
      { x: 150, y: baseOffsetY + 50, w: 35, h: 35, hp: 80, type: "aaGun" },
      { x: this.width - 180, y: baseOffsetY + 50, w: 35, h: 35, hp: 80, type: "aaGun" },
      { x: this.width / 2 - 18, y: baseOffsetY - 15, w: 35, h: 35, hp: 90, type: "aaGun" }, // Center AA

      // 2. Radar Dish
      { x: this.width * 0.7, y: baseOffsetY - 10, w: 50, h: 50, hp: 100, type: "radar" },

      // 3. Hangars
      {
        x: this.width * 0.2 + 0 * (hangarWidth + hangarSpacing),
        y: hangarOffsetY,
        w: hangarWidth,
        h: hangarHeight,
        hp: 120,
        type: "hangar",
        hangarIndex: 0,
      },
      {
        x: this.width * 0.2 + 1 * (hangarWidth + hangarSpacing),
        y: hangarOffsetY,
        w: hangarWidth,
        h: hangarHeight,
        hp: 120,
        type: "hangar",
        hangarIndex: 1,
      },
      {
        x: this.width * 0.2 + 2 * (hangarWidth + hangarSpacing),
        y: hangarOffsetY,
        w: hangarWidth,
        h: hangarHeight,
        hp: 120,
        type: "hangar",
        hangarIndex: 2,
      },

      // 4. CONTROL TOWER REMOVED
      // { x: this.width / 2 - 30,     y: 10,                w: 60, h: 100, hp: 250, type: "controlTower" }
    ];

    // Create weak point instances and initialize associated timers
    weakPointData.forEach((data) => {
      const newWP = new BossWeakPoint(this, data.x, data.y, data.w, data.h, data.hp, data.type);
      this.weakPoints.push(newWP);
      const currentIndex = this.weakPoints.length - 1;

      if (data.type === "hangar") {
        this.hangarSpawnTimers.push({ timer: randomInt(4000, 7000), interval: randomInt(8000, 12000), wpIndex: currentIndex });
      } else if (data.type === "aaGun") {
        this.aaGunTimers.push({
          timer: randomInt(500, 1500),
          interval: this.aaGunBaseInterval + Math.random() * this.aaGunRandomInterval,
          wpIndex: currentIndex,
        });
      }
    });

    // activeWeakPoints count is less relevant now, win condition checks remaining points
    console.log(`DEBUG createWeakPoints: Created ${this.weakPoints.length} weak points.`);
  } // End createWeakPoints

  // --- REMOVED fireControlTowerWeapon METHOD ---

  // --- Spawning Logic (spawnPlaneFromHangar - NO CHANGE NEEDED) ---
  spawnPlaneFromHangar(hangarIndex) {
    const hangarTimerData = this.hangarSpawnTimers.find((t) => t.wpIndex === hangarIndex);
    const hangarWP = this.weakPoints[hangarIndex];
    if (!hangarTimerData || !hangarWP || !hangarWP.isActive) return;
    console.log(`Spawning plane from Hangar ${hangarIndex}`);
    // playSound("enemy_spawn");
    const spawnX = hangarWP.x + hangarWP.width / 2 - 25;
    const spawnY = hangarWP.y - 30;
    this.game.enemies.push(new EnemyShooterPlane(this.game, 0.5));
    hangarTimerData.timer = hangarTimerData.interval + Math.random() * 3000 - 1500;
  }

  // --- Attack Logic (fireAAGun - NO CHANGE NEEDED) ---
  fireAAGun(gunWP) {
    // console.log("AA Gun Firing!");
    playSound("enemyShoot");
    const bulletSpeedY = -6;
    const bulletX = gunWP.x + gunWP.width / 2 - 3;
    const bulletY = gunWP.y - 5;
    const bullet = new EnemyBullet(this.game, bulletX, bulletY, 0, bulletSpeedY);
    bullet.width = 6;
    bullet.height = 10;
    bullet.color = "#FFFF00";
    this.game.addEnemyProjectile(bullet);
  }

  // Called by BossWeakPoint when destroyed
  weakPointDestroyed(type, index) {
    if (this.markedForDeletion) return;

    console.log(`Boss 3 weak point destroyed: ${type} (Index: ${index})!`);

    // --- Check WIN CONDITION ---
    // Check if ALL weak points are now inactive
    const anyActive = this.weakPoints.some((wp) => wp.isActive);
    if (!anyActive) {
      console.log("All Airfield Weak Points Destroyed! BOSS 3 DEFEATED!");
      this.markedForDeletion = true;
      this.game.addScore(this.scoreValue);
      this.triggerDefeatExplosion();
    }
    // --- REMOVED Tower activation logic ---
  }

  // triggerDefeatExplosion (NO CHANGE NEEDED)
  triggerDefeatExplosion() {
    const numExplosions = 20; // Fewer explosions maybe?
    const duration = 2500;
    for (let i = 0; i < numExplosions; i++) {
      setTimeout(() => {
        if (!this.game.isGameOver) {
          const randomX = Math.random() * this.width;
          const randomY = this.y + Math.random() * this.height;
          const type = Math.random() < 0.5 ? "ground" : Math.random() < 0.8 ? "ship" : "air";
          this.game.createExplosion(randomX, randomY, type);
        }
      }, i * (duration / numExplosions) + Math.random() * 200);
    }
    // playSound('finalBossExplosion');
  }

  update(deltaTime) {
    if (this.markedForDeletion) return;

    const safeDeltaTime = Math.max(0.1, deltaTime);

    // --- Update Weak Points ---
    this.weakPoints.forEach((wp) => wp.update(deltaTime));

    // --- Update Hangar Timers & Spawn Planes ---
    this.hangarSpawnTimers.forEach((hst) => {
      const hangarWP = this.weakPoints[hst.wpIndex];
      if (hangarWP && hangarWP.isActive) {
        hst.timer -= safeDeltaTime;
        if (hst.timer <= 0) {
          this.spawnPlaneFromHangar(hst.wpIndex);
        }
      }
    });

    // --- Update AA Gun Timers & Fire ---
    this.aaGunTimers.forEach((aat) => {
      const aaWP = this.weakPoints[aat.wpIndex];
      if (aaWP && aaWP.isActive) {
        aat.timer -= safeDeltaTime;
        if (aat.timer <= 0) {
          this.fireAAGun(aaWP);
          aat.interval = this.aaGunBaseInterval + Math.random() * this.aaGunRandomInterval;
          aat.timer = aat.interval;
        }
      }
    });

    // --- REMOVED Control Tower Attack Logic ---

    // --- Update Power-up Spawn Timer ---
    this.powerUpTimer += safeDeltaTime;
    if (this.powerUpTimer >= this.powerUpInterval) {
      this.powerUpTimer -= this.powerUpInterval;
      this.powerUpInterval = this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval;
      const spawnX = Math.random() * (this.game.width * 0.8) + this.game.width * 0.1;
      const spawnY = this.y - 50 - Math.random() * 50;
      console.log("Boss3 Spawning timed power-up");
      this.game.createPowerUp(spawnX, spawnY);
    }
  } // End Boss3 update

  // Hit method - delegate to weak points
  hit(projectile) {
    if (typeof projectile !== "object" || projectile === null || projectile.markedForDeletion) {
      return;
    }
    if (this.markedForDeletion) return;

    const damage = projectile.damage || 1;

    for (const wp of this.weakPoints) {
      // --- SIMPLIFIED check: Just hit active points ---
      if (wp.isActive && checkCollision(projectile, wp)) {
        // console.log(`>>> COLLISION DETECTED between projectile and WP Type: ${wp.type} <<<`); // Keep logs if needed
        const isBomb = projectile instanceof Bomb;
        // Apply damage modifier (removed tower specific)
        const effectiveDamage = damage * (isBomb && ["hangar", "radar"].includes(wp.type) ? 2.0 : 1.0); // Bombs better vs hangar/radar?
        wp.hit(effectiveDamage);
        projectile.markedForDeletion = true;
        break; // Only hit one WP per projectile
      }
    }
  } // End hit method

  // draw method (Remove Tower-specific drawing if any existed, otherwise no change needed to draw remaining WPs)
  draw(context) {
    if (!context || this.markedForDeletion) return;
    context.save();
    // Draw Base (Runway, Ground)
    const runwayY = this.y + this.height - 40;
    const runwayHeight = 40;
    context.fillStyle = this.runwayColor;
    context.fillRect(this.x, runwayY, this.width, runwayHeight);
    context.strokeStyle = this.lineColor;
    context.lineWidth = 2;
    context.setLineDash([20, 15]);
    context.beginPath();
    context.moveTo(this.x, runwayY + runwayHeight / 2);
    context.lineTo(this.x + this.width, runwayY + runwayHeight / 2);
    context.stroke();
    context.setLineDash([]);
    context.fillStyle = "rgba(80, 100, 80, 0.5)";
    context.fillRect(this.x, this.y, this.width, this.height - runwayHeight);
    context.restore(); // Restore after base drawing

    // Draw Weak Points (includes their health bars)
    // Save/Restore around each call for max isolation (kept from previous step)
    try {
      this.weakPoints.forEach((wp, index) => {
        if (wp && typeof wp.draw === "function") {
          context.save();
          try {
            wp.draw(context);
          } catch (wpDrawError) {
            console.error(`ERROR drawing Weak Point type ${wp.type} at index ${index}:`, wpDrawError);
          } finally {
            context.restore();
          }
        } else {
          console.warn(`Attempted to draw invalid weak point at index ${index}:`, wp);
        }
      });
    } catch (error) {
      console.error("!!! ERROR during Weak Point drawing loop !!!", error);
    }
  } // End draw
} // End Boss3 class
