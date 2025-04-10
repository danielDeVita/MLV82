// js/boss1.js
import { Enemy } from "./enemy.js";
import { EnemyBullet } from "./enemyBullet.js";
import { TrackingMissile } from "./trackingMissile.js";
import { BossWeakPoint } from "./bossWeakPoint.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js"; // Needed for checking projectile type in hit
import { checkCollision } from "./utils.js";
// import { EnemyShooterPlane } from "./enemyShooterPlane.js"; // Not needed here

export class Boss1 extends Enemy {
  constructor(game) {
    super(game); // Call base Enemy constructor
    this.id = "boss_1_destroyer"; // Updated name

    // --- Boss Specific Stats ---
    this.width = 300;
    this.height = 100;
    // Keep health low for easier testing of weak point destruction
    // this.maxHealth = 180; // If using body health
    this.health = 1; // Boss body itself doesn't take damage, only weak points matter
    this.color = "#383848";
    this.deckColor = "#585868";
    this.detailColor = "#D05050"; // Muted red
    this.scoreValue = 2000;
    this.enemyType = "ship"; // For explosion type on defeat

    // --- Movement: Left-to-Right Patrol ---
    this.speedX = 0.6; // Slightly slower patrol
    this.patrolTargetX1 = 40;
    this.patrolTargetX2 = this.game.width - this.width - 40; // Adjust bounds for new width
    this.moveDirectionX = 1; // Start moving right (1)
    this.x = -this.width; // Start off-screen left
    this.targetY = this.game.height - this.height - 40; // Lower position
    this.y = this.targetY; // Set initial Y to the target Y

    // Optional Bobbing
    this.driftRange = 10;

    // --- Weak Points ---
    this.weakPoints = [];
    this.createWeakPoints(); // Call helper to initialize
    this.activeWeakPoints = this.weakPoints.length; // Track remaining active points

    // --- Attack Patterns & Timers ---
    this.attackPhase = 1; // Can represent state based on points left (1=3WP, 2=2WP, 3=1WP)

    // --- Store ORIGINAL intervals ---
    this.originalArtilleryInterval = 4200;
    this.originalSpreadGunInterval = 2500;
    this.originalMissileInterval = 8000;

    // --- Current attack intervals (modified by weak point destruction) ---
    this.artilleryInterval = this.originalArtilleryInterval;
    this.spreadGunInterval = this.originalSpreadGunInterval;
    this.missileInterval = this.originalMissileInterval;

    // --- Attack Timers (count down) ---
    // Initial delay added to prevent immediate firing
    this.artilleryTimer = 2500 + Math.random() * 1000;
    this.spreadGunTimer = 1500 + Math.random() * 800;
    this.missileTimer = 7000 + Math.random() * 2000;

    console.log(`Boss1 Created (Destroyer) with ${this.weakPoints.length} weak points.`);
    console.log(`  Initial Intervals -> Artillery: ${this.artilleryInterval}, Spread: ${this.spreadGunInterval}, Missile: ${this.missileInterval}`);
  }

  createWeakPoints() {
    this.weakPoints = []; // Clear just in case
    // Define weak points relative to boss's top-left (x=0, y=0 is boss origin)
    // Values: offsetX, offsetY, width, height, health, type
    this.weakPoints.push(new BossWeakPoint(this, 50, -10, 40, 30, 60, "artillery")); // Forward Artillery Turret
    this.weakPoints.push(new BossWeakPoint(this, 130, 0, 50, 25, 45, "spreadGun")); // Mid Spread Gun
    this.weakPoints.push(new BossWeakPoint(this, this.width - 70, 5, 40, 40, 55, "missile")); // Aft Missile Launcher
    this.activeWeakPoints = this.weakPoints.length;
  }

  // Called by BossWeakPoint when destroyed
  weakPointDestroyed(type) {
    if (this.markedForDeletion) return; // Don't do anything if already defeated

    this.activeWeakPoints--;
    console.log(`Boss weak point ${type} destroyed! ${this.activeWeakPoints} remaining.`);

    // --- Difficulty Scaling Logic based on remaining points ---
    let boostMultiplier = 1.0; // Default: No boost (when 3 points are left at start)

    if (this.activeWeakPoints === 2) {
      boostMultiplier = 0.8; // 20% faster when 2 left (phase 2)
      this.attackPhase = 2;
      console.log(`Boss1 Phase 2 active (${this.activeWeakPoints} points left). Applying boost: ${boostMultiplier}`);
    } else if (this.activeWeakPoints === 1) {
      boostMultiplier = 0.6; // 40% faster when only 1 left (phase 3)
      this.attackPhase = 3;
      console.log(`Boss1 Phase 3 active (${this.activeWeakPoints} point left). Applying boost: ${boostMultiplier}`);
    } else if (this.activeWeakPoints <= 0) {
      // Boss is defeated, interval doesn't matter but set to avoid potential division by zero if accessed later
      boostMultiplier = 1.0;
      this.attackPhase = 4; // Defeated phase
    }

    // Apply the boost to ALL weapon intervals based on their ORIGINAL value
    this.artilleryInterval = this.originalArtilleryInterval * boostMultiplier;
    this.spreadGunInterval = this.originalSpreadGunInterval * boostMultiplier;
    this.missileInterval = this.originalMissileInterval * boostMultiplier;

    // Log the new intervals for debugging
    console.log(
      `  New Intervals -> Artillery: ${this.artilleryInterval.toFixed(0)}, Spread: ${this.spreadGunInterval.toFixed(
        0
      )}, Missile: ${this.missileInterval.toFixed(0)}`
    );
    // --- End: Difficulty Scaling Logic ---

    // --- WIN CONDITION ---
    if (this.activeWeakPoints <= 0) {
      console.log("Boss1 All Weak Points Destroyed! BOSS DEFEATED!");
      this.markedForDeletion = true;
      this.game.addScore(this.scoreValue); // Add score upon defeat
      this.triggerDefeatExplosion();
      // Game loop handles removal and state update via markedForDeletion
    }
  }

  triggerDefeatExplosion() {
    // Create multiple explosions over the boss area
    const numExplosions = 10;
    const duration = 1500; // Spread explosions over 1.5 seconds
    for (let i = 0; i < numExplosions; i++) {
      setTimeout(() => {
        // Check if game isn't over already when timeout fires
        if (!this.game.isGameOver) {
          const randomX = this.x + Math.random() * this.width;
          const randomY = this.y + Math.random() * this.height;
          const type = Math.random() < 0.6 ? "air" : "ship"; // Mix explosion types
          this.game.createExplosion(randomX, randomY, type);
        }
      }, i * (duration / numExplosions) + Math.random() * 100); // Staggered timing
    }
    // playSound('bossExplosion'); // Optional final big explosion sound
  }

  update(deltaTime) {
    // Only update if not marked for deletion
    if (this.markedForDeletion) return;

    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Movement: Patrol ---
    this.x += this.speedX * this.moveDirectionX * deltaScale;
    // Check patrol boundaries
    if (this.moveDirectionX === 1 && this.x >= this.patrolTargetX2) {
      this.x = this.patrolTargetX2;
      this.moveDirectionX = -1; // Move left
    } else if (this.moveDirectionX === -1 && this.x <= this.patrolTargetX1) {
      this.x = this.patrolTargetX1;
      this.moveDirectionX = 1; // Move right
    }
    // Optional simple vertical bobbing
    this.y = this.targetY + Math.sin(Date.now() * 0.0005) * this.driftRange;

    // --- Update Weak Points (Position and Hit Flash) ---
    this.weakPoints.forEach((wp) => wp.update(deltaTime));

    // --- Attack Logic ---
    // Update Attack Timers (Count down)
    this.artilleryTimer -= safeDeltaTime;
    this.spreadGunTimer -= safeDeltaTime;
    this.missileTimer -= safeDeltaTime;

    // --- Check attacks based on timers AND weak point status ---
    const artilleryWP = this.weakPoints.find((wp) => wp.type === "artillery");
    if (artilleryWP && artilleryWP.isActive && this.artilleryTimer <= 0) {
      this.fireArtillery(artilleryWP);
      const variance = Math.random() * 500 - 250; // Add some randomness to timing
      const nextInterval = this.artilleryInterval + variance;
      // --- FIX: Ensure timer is reset to a positive value ---
      this.artilleryTimer = Math.max(1, nextInterval);
    }

    const spreadGunWP = this.weakPoints.find((wp) => wp.type === "spreadGun");
    if (spreadGunWP && spreadGunWP.isActive && this.spreadGunTimer <= 0) {
      this.fireSpreadGun(spreadGunWP);
      const variance = Math.random() * 400 - 200;
      const nextInterval = this.spreadGunInterval + variance;
      // --- FIX: Ensure timer is reset to a positive value ---
      this.spreadGunTimer = Math.max(1, nextInterval);
    }

    const missileWP = this.weakPoints.find((wp) => wp.type === "missile");
    if (missileWP && missileWP.isActive && this.missileTimer <= 0) {
      this.fireMissileFromLauncher(missileWP);
      const variance = Math.random() * 1000 - 500;
      const nextInterval = this.missileInterval + variance;
      // --- FIX: Ensure timer is reset to a positive value ---
      this.missileTimer = Math.max(1, nextInterval);
    }

    // --- Hit Flash Update for main boss body (Not used as body has health=1) ---
    // if (this.isHit) {
    //   this.hitTimer -= safeDeltaTime;
    //   if (this.hitTimer <= 0) {
    //     this.isHit = false;
    //   }
    // }
  } // End Boss1 update

  // --- Attack Pattern Methods ---
  // These methods just perform the action; frequency is controlled by timers in update()
  fireArtillery(turret) {
    // Aimed shot towards player
    playSound("explosion"); // Heavier sound
    const bulletSpeed = 3.5; // Artillery shell speed
    const shellX = turret.x + turret.width / 2 - 6; // Center of turret X, adjust for shell width
    const shellY = turret.y - 8; // Slightly above turret Y, adjust for shell height

    const player = this.game.player;
    if (!player || player.markedForDeletion) {
      return; // Don't fire if player doesn't exist
    }
    const angle = Math.atan2(player.y + player.height / 2 - shellY, player.x + player.width / 2 - shellX);

    const speedX = Math.cos(angle) * bulletSpeed;
    const speedY = Math.sin(angle) * bulletSpeed;

    // Create a larger, slower, distinct-looking bullet
    this.game.addEnemyProjectile(new EnemyBullet(this.game, shellX, shellY, speedX, speedY));
    // Modify the just-added bullet for appearance/stats
    const shell = this.game.enemyProjectiles[this.game.enemyProjectiles.length - 1];
    if (shell) {
      shell.width = 14;
      shell.height = 14;
      shell.color = "#FFA500"; // Orange/Yellow shell?
      // shell.damage = 5; // Maybe make it more damaging?
    }
  }

  fireSpreadGun(gun) {
    playSound("enemyShoot");
    const bulletSpeedX = -4.5; // Base horizontal speed component
    const bulletX = gun.x; // Fire from front of spread gun weak point
    const bulletYCenter = gun.y + gun.height / 2 - 4; // Center Y

    // Fire 5 bullets in a fan shape upwards/forwards
    const angles = [-0.4, -0.2, 0, 0.2, 0.4]; // Spread angles in radians
    angles.forEach((angle) => {
      const speedX = Math.cos(angle) * bulletSpeedX; // Adjust X slightly based on angle
      const speedY = Math.sin(angle) * bulletSpeedX * -1; // Y speed based on X speed and angle
      this.game.addEnemyProjectile(new EnemyBullet(this.game, bulletX, bulletYCenter, speedX, speedY));
    });
  }

  fireMissileFromLauncher(launcher) {
    const missileX = launcher.x + launcher.width / 2 - 6; // Center of launcher
    const missileY = launcher.y - 10; // Above launcher
    this.game.addEnemyProjectile(new TrackingMissile(this.game, missileX, missileY));
    // Sound played by missile constructor
  }

  // --- Hit Method (Handles Weak Points) ---
  hit(projectile) {
    // Check projectile validity first (added from previous fix)
    if (typeof projectile !== "object" || projectile === null || projectile.markedForDeletion) {
      console.warn(`Boss1.hit received invalid or marked projectile:`, projectile);
      return; // Exit early, do not process invalid input
    }
    if (this.markedForDeletion) return; // Don't process hits if boss is already defeated

    const damage = projectile.damage || 1; // Get damage, default to 1

    // Check Weak Points
    for (const wp of this.weakPoints) {
      // Only check active weak points against the projectile
      if (wp.isActive && checkCollision(projectile, wp)) {
        // console.log(`   -> Projectile hit WeakPoint ${wp.type} (Health: ${wp.health}/${wp.maxHealth})`);
        wp.hit(damage); // Damage weak point, destruction check/notification happens inside wp.hit/wp.destroy
        projectile.markedForDeletion = true; // Projectile is consumed by hitting weak point
        break; // Stop checking other weak points for this projectile
      }
    }
    // Note: The main boss body doesn't take direct damage in this design.
  } // End hit method

  draw(context) {
    if (this.markedForDeletion || !context) return;
    context.save();

    // --- Draw Base Hull ---
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y + 20, this.width, this.height - 20); // Main Lower Hull
    context.fillStyle = this.deckColor;
    context.fillRect(this.x + 10, this.y, this.width - 20, this.height - 10); // Main Deck
    context.fillStyle = this.color;
    context.fillRect(this.x + this.width * 0.5, this.y - 15, 80, 30); // Bridge Structure
    context.fillStyle = this.detailColor;
    context.fillRect(this.x + 20, this.y + 5, 30, 10); // Detail 1
    context.fillRect(this.x + this.width - 50, this.y + 5, 30, 10); // Detail 2

    context.restore();

    // --- Draw Weak Points --- (They draw themselves relative to boss pos, including health bars)
    this.weakPoints.forEach((wp) => wp.draw(context));

    // --- No Health Bar for main body ---
    // Since health = 1 and damage goes to weak points, the main body doesn't need a bar.
    // super.draw(context); // Calling this would draw a tiny full health bar if Enemy.draw does that.
  }
} // End Boss1 class
