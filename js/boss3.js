// js/boss3.js
import { Enemy } from "./enemy.js";
import { BossWeakPoint } from "./bossWeakPoint.js";
import { EnemyBullet } from "./enemyBullet.js";
import { TrackingMissile } from "./trackingMissile.js";
import { EnemyShooterPlane } from "./enemyShooterPlane.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js";
import { checkCollision } from "./utils.js";
import { randomInt } from "./utils.js";

export class Boss3 extends Enemy {
  constructor(game) {
    console.log("Boss3 Constructor START (No Tower, Tilted Spread, Fixed Arty)");
    super(game);

    this.id = "boss_3_airfield_base_v4"; // New ID
    this.enemyType = "ground_installation";
    this.width = this.game.width;
    this.height = 200;
    this.y = this.game.height - this.height - 80;
    this.x = 0;
    this.speedX = 0; // Stationary
    this.health = 1;
    this.maxHealth = 1;
    this.scoreValue = 4800;
    this.runwayColor = "#555555";
    this.buildingColor = "#708090";
    this.lineColor = "#CCCCCC";
    this.fixedArtilleryColor = "#FFD700";

    // --- Weak Points ---
    this.weakPoints = [];
    this.hangarSpawnTimers = [];
    this.upSpreadGunTimers = [];
    this.upSpreadGunBaseInterval = 2900;
    this.upSpreadGunRandomInterval = 900;

    // --- Timers for Integrated Base Defenses ---
    this.lowMissileTimer = randomInt(6000, 9000);
    this.lowMissileInterval = 7500;
    this.lowArtilleryTimer = randomInt(3000, 5000);
    this.lowArtilleryInterval = 4000;
    this.lowSpreadTimer = randomInt(4000, 6000);
    this.lowSpreadInterval = 5500;
    this.fixedArtilleryTimer = randomInt(1500, 3500);
    this.fixedArtilleryInterval = 1800;

    // Power-up spawning
    this.powerUpTimer = 0;
    this.powerUpBaseInterval = 11000;
    this.powerUpRandomInterval = 4000;
    this.powerUpInterval = this.powerUpBaseInterval + Math.random() * this.powerUpRandomInterval;

    console.log("... Calling createWeakPoints...");
    this.createWeakPoints(); // Creates 7 WPs
    console.log("... createWeakPoints FINISHED.");

    console.log(`Boss3 Created (${this.id}) with ${this.weakPoints.length} target weak points.`);
  }

  createWeakPoints() {
    this.weakPoints = [];
    this.hangarSpawnTimers = [];
    this.upSpreadGunTimers = [];
    const baseOffsetY = 30;
    const hangarHeight = 50;
    const hangarOffsetY = this.height - hangarHeight - 10;
    const hangarWidth = 70;
    const hangarSpacing = 150;
    const weakPointData = [
      { x: 150, y: baseOffsetY + 50, w: 35, h: 35, hp: 80, type: "upSpreadGun" },
      { x: this.width - 180, y: baseOffsetY + 50, w: 35, h: 35, hp: 80, type: "upSpreadGun" },
      { x: this.width / 2 - 18, y: baseOffsetY - 15, w: 35, h: 35, hp: 90, type: "upSpreadGun" },
      { x: this.width * 0.7, y: baseOffsetY - 10, w: 50, h: 50, hp: 100, type: "radar" },
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
    ];
    weakPointData.forEach((data) => {
      const newWP = new BossWeakPoint(this, data.x, data.y, data.w, data.h, data.hp, data.type);
      this.weakPoints.push(newWP);
      const currentIndex = this.weakPoints.length - 1;
      if (data.type === "hangar") {
        this.hangarSpawnTimers.push({ timer: randomInt(4000, 7000), interval: randomInt(8000, 12000), wpIndex: currentIndex });
      } else if (data.type === "upSpreadGun") {
        this.upSpreadGunTimers.push({
          timer: randomInt(500, 1500),
          interval: this.upSpreadGunBaseInterval + Math.random() * this.upSpreadGunRandomInterval,
          wpIndex: currentIndex,
        });
      }
    });
    console.log(`DEBUG createWeakPoints: Created ${this.weakPoints.length} weak points.`);
  }

  // --- Spawning/Attack Methods ---
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

  fireUpSpreadShot(gunWP) {
    playSound("enemyShoot");
    const bulletSpeed = 5.0;
    const bulletX = gunWP.x + gunWP.width / 2 - 4;
    const bulletY = gunWP.y;
    let baseAngle = -Math.PI / 2;
    const centerLine = this.width / 2;
    const tiltAmount = 0.2;
    if (gunWP.offsetX < centerLine - 50) {
      baseAngle += tiltAmount;
    } else if (gunWP.offsetX > centerLine + 50) {
      baseAngle -= tiltAmount;
    }
    const spreadAngles = [-0.4, -0.2, 0, 0.2, 0.4];
    spreadAngles.forEach((angleOffset) => {
      const angle = baseAngle + angleOffset;
      const speedX = Math.cos(angle) * bulletSpeed;
      const speedY = Math.sin(angle) * bulletSpeed;
      this.game.addEnemyProjectile(new EnemyBullet(this.game, bulletX, bulletY, speedX, speedY));
    });
  }

  fireFixedArtillery() {
    playSound("hit");
    const bulletSpeedY = -6.5;
    const bulletSize = 8;
    const launchY = this.y + this.height - 5 - bulletSize;
    const launchPositionsX = [this.width * 0.15, this.width * 0.4, this.width * 0.6, this.width * 0.85];
    launchPositionsX.forEach((launchX) => {
      const bullet = new EnemyBullet(this.game, this.x + launchX - bulletSize / 2, launchY, 0, bulletSpeedY);
      bullet.width = bulletSize;
      bullet.height = bulletSize;
      bullet.color = this.fixedArtilleryColor;
      this.game.addEnemyProjectile(bullet);
    });
  }

  fireLowMissile() {
    console.log("Boss3 Firing Low Missile");
    const launchX = this.x + 50 + Math.random() * (this.width - 100);
    const launchY = this.y + this.height - 15;
    this.game.addEnemyProjectile(new TrackingMissile(this.game, launchX, launchY));
  }
  fireLowArtillery() {
    console.log("Boss3 Firing Low Artillery");
    playSound("explosion");
    const player = this.game.player;
    if (!player || player.markedForDeletion) return;
    const targetY = this.y + this.height + 50 + Math.random() * 100;
    const targetX = player.x + player.width / 2;
    const launchX = this.x + this.width * 0.5 + (Math.random() - 0.5) * this.width * 0.4;
    const launchY = this.y + this.height - 20;
    const speed = 4.5;
    const angle = Math.atan2(targetY - launchY, targetX - launchX);
    const speedX = Math.cos(angle) * speed;
    const speedY = Math.sin(angle) * speed;
    const shell = new EnemyBullet(this.game, launchX, launchY, speedX, speedY);
    shell.width = 14;
    shell.height = 14;
    shell.color = "#FFA500";
    this.game.addEnemyProjectile(shell);
  }
  fireLowSpreadShot() {
    console.log("Boss3 Firing Low Spread");
    playSound("enemyShoot");
    const bulletSpeed = 5.0;
    const launchX = this.x + this.width / 2;
    const launchY = this.y + this.height - 10;
    const bulletYCenter = launchY + 4;
    const angles = [-0.15, -0.05, 0.0, 0.05, 0.15];
    angles.forEach((angle) => {
      const speedX = Math.cos(angle) * bulletSpeed;
      const speedY = Math.sin(angle) * bulletSpeed;
      this.game.addEnemyProjectile(new EnemyBullet(this.game, launchX, bulletYCenter, speedX, speedY));
    });
  }
  // --- End Attack Methods ---

  // weakPointDestroyed
  weakPointDestroyed(type, index) {
    if (this.markedForDeletion) return;
    console.log(`Boss 3 weak point destroyed: ${type} (Index: ${index})!`);
    const anyActive = this.weakPoints.some((wp) => wp.isActive);
    if (!anyActive) {
      console.log("All Airfield Weak Points Destroyed! BOSS 3 DEFEATED!");
      this.markedForDeletion = true;
      this.game.addScore(this.scoreValue);
      this.triggerDefeatExplosion();
    }
  }
  // triggerDefeatExplosion
  triggerDefeatExplosion() {
    const numExplosions = 20;
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
  }

  update(deltaTime) {
    // --- >>> LOGGING 'THIS' AT START OF UPDATE <<< ---
    console.log(`Boss3 Update - Is 'this' Boss3 instance? : ${this instanceof Boss3}. ID: ${this?.id}`);
    if (!this || !(this instanceof Boss3)) {
      console.error("!!! CRITICAL: 'this' is NOT a Boss3 instance in update() !!!", this);
      return; // Prevent further execution if 'this' is wrong
    }
    // --- >>> END LOGGING <<< ---

    if (this.markedForDeletion) return;
    const safeDeltaTime = Math.max(0.1, deltaTime);

    // Update Weak Points
    this.weakPoints.forEach((wp) => wp.update(deltaTime)); // Assuming this is safe

    // --- Update Hangar Timers & Spawn Planes (using for...of) ---
    for (const hst of this.hangarSpawnTimers) {
      if (hst.wpIndex === undefined || hst.wpIndex < 0 || hst.wpIndex >= this.weakPoints.length) {
        continue;
      }
      const hangarWP = this.weakPoints[hst.wpIndex];
      if (hangarWP && hangarWP.isActive) {
        hst.timer -= safeDeltaTime;
        if (hst.timer <= 0) {
          // --- >>> LOGGING BEFORE CALL <<< ---
          console.log(
            `Attempting hangar spawn. Is 'this' Boss3?: ${this instanceof Boss3}. Is spawnPlaneFromHangar a function?: ${typeof this
              .spawnPlaneFromHangar}`
          );
          try {
            this.spawnPlaneFromHangar(hst.wpIndex); // LINE 273 approx
          } catch (e) {
            console.error(`ERROR calling spawnPlaneFromHangar:`, e, this);
          }
          // Timer reset happens inside spawnPlaneFromHangar
        }
      }
    } // End for...of hangarSpawnTimers

    // --- Update Upward Spread Gun Timers & Fire (using for...of) ---
    for (const ust of this.upSpreadGunTimers) {
      if (ust.wpIndex === undefined || ust.wpIndex < 0 || ust.wpIndex >= this.weakPoints.length) {
        continue;
      }
      const spreadWP = this.weakPoints[ust.wpIndex];
      if (spreadWP && spreadWP.isActive) {
        ust.timer -= safeDeltaTime;
        if (ust.timer <= 0) {
          // --- >>> LOGGING BEFORE CALL <<< ---
          console.log(
            `Attempting spread shot. Is 'this' Boss3?: ${this instanceof Boss3}. Is fireUpSpreadShot a function?: ${typeof this.fireUpSpreadShot}`
          );
          try {
            this.fireUpSpreadShot(spreadWP);
          } catch (e) {
            console.error(`ERROR calling fireUpSpreadShot:`, e, this);
          }
          ust.interval = this.upSpreadGunBaseInterval + Math.random() * this.upSpreadGunRandomInterval;
          ust.timer = ust.interval;
        }
      }
    } // End for...of upSpreadGunTimers

    // --- Update Fixed Artillery Timer & Fire ---
    this.fixedArtilleryTimer -= safeDeltaTime;
    if (this.fixedArtilleryTimer <= 0) {
      this.fireFixedArtillery();
      this.fixedArtilleryTimer = this.fixedArtilleryInterval + Math.random() * 500 - 250;
    }

    // --- Update Low Area Attack Timers ---
    this.lowMissileTimer -= safeDeltaTime;
    if (this.lowMissileTimer <= 0) {
      this.fireLowMissile();
      this.lowMissileTimer = this.lowMissileInterval + Math.random() * 2000 - 1000;
    }
    this.lowArtilleryTimer -= safeDeltaTime;
    if (this.lowArtilleryTimer <= 0) {
      this.fireLowArtillery();
      this.lowArtilleryTimer = this.lowArtilleryInterval + Math.random() * 1500 - 750;
    }
    this.lowSpreadTimer -= safeDeltaTime;
    if (this.lowSpreadTimer <= 0) {
      this.fireLowSpreadShot();
      this.lowSpreadTimer = this.lowSpreadInterval + Math.random() * 1000 - 500;
    }

    // Update Power-up Spawn Timer
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

  // Hit method
  hit(projectile) {
    if (typeof projectile !== "object" || projectile === null || projectile.markedForDeletion) {
      return;
    }
    if (this.markedForDeletion) return;
    const damage = projectile.damage || 1;
    for (const wp of this.weakPoints) {
      if (wp.isActive && checkCollision(projectile, wp)) {
        const isBomb = projectile instanceof Bomb;
        const effectiveDamage = damage * (isBomb && ["hangar", "radar"].includes(wp.type) ? 2.0 : 1.0);
        wp.hit(effectiveDamage);
        projectile.markedForDeletion = true;
        break;
      }
    }
  }

  // draw method
  draw(context) {
    if (!context || this.markedForDeletion) return;
    context.save();
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
    context.fillStyle = this.fixedArtilleryColor;
    const markerSize = 10;
    const markerY = this.y + this.height - markerSize - 5;
    const launchPositionsX = [this.width * 0.15, this.width * 0.4, this.width * 0.6, this.width * 0.85];
    launchPositionsX.forEach((posX) => {
      context.beginPath();
      context.arc(this.x + posX, markerY + markerSize / 2, markerSize / 2, 0, Math.PI * 2);
      context.fill();
    });
    context.restore();
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
  }
} // End Boss3 class
