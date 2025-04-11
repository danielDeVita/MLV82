// js/boss1.js
import { Enemy } from "./enemy.js";
import { EnemyBullet } from "./enemyBullet.js";
import { TrackingMissile } from "./trackingMissile.js";
import { BossWeakPoint } from "./bossWeakPoint.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js";
import { checkCollision } from "./utils.js";
import { randomInt } from "./utils.js"; // Keep import

export class Boss1 extends Enemy {
  constructor(game) {
    super(game);
    this.id = "boss_1_destroyer_v4"; // Update version ID

    // --- Stats / Appearance / Movement (No change) ---
    this.width = 300;
    this.height = 100;
    this.health = 1;
    this.color = "#383848";
    this.deckColor = "#585868";
    this.detailColor = "#D05050";
    this.scoreValue = 3000;
    this.enemyType = "ship";
    this.speedX = 0.6;
    this.patrolTargetX1 = 40;
    this.patrolTargetX2 = this.game.width - this.width - 40;
    this.moveDirectionX = 1;
    this.x = -this.width;
    this.targetY = this.game.height - this.height - 40;
    this.y = this.targetY;
    this.driftRange = 10;

    // --- Weak Points (Will be 4) ---
    this.weakPoints = [];

    // --- Attack Patterns & Timers ---
    this.attackPhase = 1;

    // --- Store ORIGINAL intervals ---
    // Assign intervals based on the NEW functional types
    this.originalAimedArtilleryInterval = 4200; // Front Aimed Artillery
    this.originalForwardSpreadInterval = randomInt(2800, 3800); // Mid-Forward Spread Left
    this.originalRearSpreadInterval = randomInt(2800, 3800); // Mid-Rear Spread Right
    this.originalMissileInterval = 7500; // Aft Missile Launcher

    // --- Current attack intervals ---
    this.aimedArtilleryInterval = this.originalAimedArtilleryInterval;
    this.forwardSpreadInterval = this.originalForwardSpreadInterval;
    this.rearSpreadInterval = this.originalRearSpreadInterval;
    this.missileInterval = this.originalMissileInterval;

    // --- Attack Timers ---
    this.aimedArtilleryTimer = 2500 + Math.random() * 1000;
    this.forwardSpreadTimer = 1500 + Math.random() * 800;
    this.rearSpreadTimer = 2000 + Math.random() * 1000;
    this.missileTimer = 7000 + Math.random() * 2000;

    // --- Create weak points AFTER defining intervals ---
    this.createWeakPoints();
    this.activeWeakPoints = this.weakPoints.length; // Should be 4

    console.log(
      `Boss1 Created (${this.id}) with ${this.weakPoints.length} weak points.`
    );
    console.log(
      `  Initial Intervals -> AimedArt: ${this.aimedArtilleryInterval}, FwdSpread: ${this.forwardSpreadInterval}, RearSpread: ${this.rearSpreadInterval}, Mis: ${this.missileInterval}`
    );
  }

  // --- >>> REVISED createWeakPoints Method <<< ---
  createWeakPoints() {
    this.weakPoints = [];
    // Args: boss, offsetX, offsetY, width, height, health, type

    // 1. Aft (Right Side): Missile Launcher
    this.weakPoints.push(
      new BossWeakPoint(this, this.width - 65, 5, 35, 40, 55, "missile")
    );

    // 2. Mid-Rear: Rear Spread Gun (Spread Right)
    this.weakPoints.push(
      new BossWeakPoint(this, this.width * 0.6, 10, 40, 25, 40, "rearSpread")
    );

    // 3. Mid-Forward: Forward Spread Gun (Spread Left)
    this.weakPoints.push(
      new BossWeakPoint(this, this.width * 0.3, -5, 50, 25, 45, "forwardSpread")
    );

    // 4. Fore (Left Side): Aimed Artillery
    this.weakPoints.push(
      new BossWeakPoint(this, 40, -10, 40, 30, 60, "aimedArtillery")
    );

    this.activeWeakPoints = this.weakPoints.length; // Should be 4
    console.log(
      `DEBUG createWeakPoints: Created ${this.activeWeakPoints} weak points.`
    );
  }
  // --- >>> END REVISED createWeakPoints Method <<< ---

  // Called by BossWeakPoint when destroyed
  weakPointDestroyed(type) {
    if (this.markedForDeletion) return;
    this.activeWeakPoints--;
    console.log(
      `Boss weak point ${type} destroyed! ${this.activeWeakPoints} remaining.`
    );

    // Difficulty Scaling Logic (Adjusted for 4 initial points)
    let boostMultiplier = 1.0;
    if (this.activeWeakPoints === 3) {
      boostMultiplier = 0.85;
      this.attackPhase = 2;
    } else if (this.activeWeakPoints === 2) {
      boostMultiplier = 0.7;
      this.attackPhase = 3;
      this.game.resetBoss1HelperSpawnTimer();
    } // Start helpers at 2 left
    else if (this.activeWeakPoints === 1) {
      boostMultiplier = 0.55;
      this.attackPhase = 4;
    } else if (this.activeWeakPoints <= 0) {
      boostMultiplier = 1.0;
      this.attackPhase = 5;
    }

    if (this.attackPhase > 1 && this.attackPhase < 5) {
      console.log(
        `Boss1 Phase ${this.attackPhase} active. Boost: ${boostMultiplier}`
      );
    }

    // Apply boost
    this.aimedArtilleryInterval =
      this.originalAimedArtilleryInterval * boostMultiplier;
    this.forwardSpreadInterval =
      this.originalForwardSpreadInterval * boostMultiplier;
    this.rearSpreadInterval = this.originalRearSpreadInterval * boostMultiplier;
    this.missileInterval = this.originalMissileInterval * boostMultiplier;

    console.log(
      `  New Intervals -> AimedArt: ${this.aimedArtilleryInterval.toFixed(
        0
      )}, FwdSpread: ${this.forwardSpreadInterval.toFixed(
        0
      )}, RearSpread: ${this.rearSpreadInterval.toFixed(
        0
      )}, Mis: ${this.missileInterval.toFixed(0)}`
    );

    // WIN CONDITION
    if (this.activeWeakPoints <= 0) {
      /* ... defeat logic ... */
    }
  }

  triggerDefeatExplosion() {
    const numExplosions = 12;
    const duration = 1600;
    for (let i = 0; i < numExplosions; i++) {
      setTimeout(() => {
        if (!this.game.isGameOver) {
          const randomX = this.x + Math.random() * this.width;
          const randomY = this.y + Math.random() * this.height;
          const type = Math.random() < 0.6 ? "air" : "ship";
          this.game.createExplosion(randomX, randomY, type);
        }
      }, i * (duration / numExplosions) + Math.random() * 100);
    }
  }

  update(deltaTime) {
    if (this.markedForDeletion) return;
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // Movement
    this.x += this.speedX * this.moveDirectionX * deltaScale;
    if (this.moveDirectionX === 1 && this.x >= this.patrolTargetX2) {
      this.x = this.patrolTargetX2;
      this.moveDirectionX = -1;
    } else if (this.moveDirectionX === -1 && this.x <= this.patrolTargetX1) {
      this.x = this.patrolTargetX1;
      this.moveDirectionX = 1;
    }
    this.y = this.targetY + Math.sin(Date.now() * 0.0005) * this.driftRange;

    // Update Weak Points
    this.weakPoints.forEach((wp) => wp.update(deltaTime));

    // --- >>> Attack Logic (Use correct types and timers) <<< ---
    this.aimedArtilleryTimer -= safeDeltaTime;
    this.forwardSpreadTimer -= safeDeltaTime;
    this.rearSpreadTimer -= safeDeltaTime;
    this.missileTimer -= safeDeltaTime;

    // Check Aimed Artillery (Front)
    const aimedArtilleryWP = this.weakPoints.find(
      (wp) => wp.type === "aimedArtillery"
    );
    if (
      aimedArtilleryWP &&
      aimedArtilleryWP.isActive &&
      this.aimedArtilleryTimer <= 0
    ) {
      this.fireAimedArtillery(aimedArtilleryWP);
      const variance = Math.random() * 500 - 250;
      this.aimedArtilleryTimer = Math.max(
        1,
        this.aimedArtilleryInterval + variance
      );
    }

    // Check Forward Spread (Mid-Front, Left W)
    const forwardSpreadWP = this.weakPoints.find(
      (wp) => wp.type === "forwardSpread"
    );
    if (
      forwardSpreadWP &&
      forwardSpreadWP.isActive &&
      this.forwardSpreadTimer <= 0
    ) {
      this.fireForwardSpread(forwardSpreadWP);
      const variance = Math.random() * 400 - 200;
      this.forwardSpreadTimer = Math.max(
        1,
        this.forwardSpreadInterval + variance
      );
    }

    // Check Rear Spread (Mid-Rear, Right W)
    const rearSpreadWP = this.weakPoints.find((wp) => wp.type === "rearSpread");
    if (rearSpreadWP && rearSpreadWP.isActive && this.rearSpreadTimer <= 0) {
      this.fireRearSpread(rearSpreadWP);
      const variance = Math.random() * 600 - 300;
      this.rearSpreadTimer = Math.max(1, this.rearSpreadInterval + variance);
    }

    // Check Missile Launcher (Aft)
    const missileWP = this.weakPoints.find((wp) => wp.type === "missile");
    if (missileWP && missileWP.isActive && this.missileTimer <= 0) {
      this.fireMissileFromLauncher(missileWP);
      const variance = Math.random() * 1000 - 500;
      this.missileTimer = Math.max(1, this.missileInterval + variance);
    }
    // --- >>> END Attack Logic <<< ---
  } // End Boss1 update

  // --- Attack Pattern Methods ---

  // 1. Forward Spread Gun - Fires spread towards the Left <<< NEW Method
  fireForwardSpread(gun) {
    playSound("enemyShoot");
    const bulletSpeedX = -4.5; // Base speed left
    const bulletX = gun.x; // Fire from front edge of gun weak point
    const bulletYCenter = gun.y + gun.height / 2 - 4;
    const angles = [-0.4, -0.2, 0, 0.2, 0.4]; // Radians relative to negative X axis
    angles.forEach((angle) => {
      const speedX = Math.cos(angle) * bulletSpeedX;
      const speedY = Math.sin(angle) * bulletSpeedX * -1; // Invert Y effect
      this.game.addEnemyProjectile(
        new EnemyBullet(this.game, bulletX, bulletYCenter, speedX, speedY)
      );
    });
  }

  // 2. Mid Aimed Artillery - Fires aimed shell <<< NEW Method (Logic moved from old fireArtillery)
  fireAimedArtillery(turret) {
    playSound("explosion"); // Heavier sound
    const bulletSpeed = 3.5;
    const shellX = turret.x + turret.width / 2 - 7; // Adjust for shell size
    const shellY = turret.y - 8; // Slightly above turret
    const player = this.game.player;
    if (!player || player.markedForDeletion) return;
    const angle = Math.atan2(
      player.y + player.height / 2 - shellY,
      player.x + player.width / 2 - shellX
    );
    const speedX = Math.cos(angle) * bulletSpeed;
    const speedY = Math.sin(angle) * bulletSpeed;
    this.game.addEnemyProjectile(
      new EnemyBullet(this.game, shellX, shellY, speedX, speedY)
    );
    const shell =
      this.game.enemyProjectiles[this.game.enemyProjectiles.length - 1];
    if (shell) {
      shell.width = 14;
      shell.height = 14;
      shell.color = "#FFA500";
    }
  }

  // 3. Rear Spread - Fires spread towards the Right (No Change Needed)
  fireRearSpread(gun) {
    playSound("enemyShoot");
    const bulletSpeed = 4.0;
    const bulletX = gun.x + gun.width;
    const bulletYCenter = gun.y + gun.height / 2 - 4;
    const angles = [-0.3, -0.1, 0, 0.1, 0.3];
    angles.forEach((angle) => {
      const speedX = Math.cos(angle) * bulletSpeed;
      const speedY = Math.sin(angle) * bulletSpeed;
      this.game.addEnemyProjectile(
        new EnemyBullet(this.game, bulletX, bulletYCenter, speedX, speedY)
      );
    });
  }

  // 4. Aft Missile Launcher (No Change Needed)
  fireMissileFromLauncher(launcher) {
    const missileX = launcher.x + launcher.width / 2 - 6;
    const missileY = launcher.y - 10;
    this.game.addEnemyProjectile(
      new TrackingMissile(this.game, missileX, missileY)
    );
  }

  // --- Hit Method (Handles Weak Points) --- (No Change Needed)
  hit(projectile) {
    if (
      typeof projectile !== "object" ||
      projectile === null ||
      projectile.markedForDeletion
    ) {
      return;
    }
    if (this.markedForDeletion) return;
    const damage = projectile.damage || 1;
    for (const wp of this.weakPoints) {
      if (wp.isActive && checkCollision(projectile, wp)) {
        wp.hit(damage);
        projectile.markedForDeletion = true;
        break;
      }
    }
  }

  // --- Draw Method (No Change Needed Structurally) ---
  // Weak points draw themselves based on their position/type
  draw(context) {
    if (this.markedForDeletion || !context) return;
    context.save();
    // Base Hull
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y + 20, this.width, this.height - 20);
    context.fillStyle = this.deckColor;
    context.fillRect(this.x + 10, this.y, this.width - 20, this.height - 10);
    context.fillStyle = this.color;
    context.fillRect(this.x + this.width * 0.5, this.y - 15, 80, 30); // Bridge
    context.fillStyle = this.detailColor;
    context.fillRect(this.x + 20, this.y + 5, 30, 10);
    context.fillRect(this.x + this.width - 50, this.y + 5, 30, 10);
    context.restore();
    // Draw Weak Points
    this.weakPoints.forEach((wp) => wp.draw(context));
  }
} // End Boss1 class
