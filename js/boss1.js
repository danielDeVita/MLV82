// js/boss1.js
import { Enemy } from "./enemy.js";
import { EnemyBullet } from "./enemyBullet.js";
import { TrackingMissile } from "./trackingMissile.js";
import { BossWeakPoint } from "./bossWeakPoint.js"; // <<< Import Weak Point
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js"; // <<< ADD THIS IMPORT
// Optional: Import shooter plane if spawning minions
import { checkCollision } from "./utils.js";
import { EnemyShooterPlane } from "./enemyShooterPlane.js";

export class Boss1 extends Enemy {
  constructor(game) {
    super(game); // Call base Enemy constructor
    this.id = "boss_1_destroyer"; // Updated name

    // --- Boss Specific Stats ---
    this.width = 300;
    this.height = 100;
    // this.maxHealth = 180;
    // this.health = this.maxHealth;
    this.health = 1;
    this.color = "#383848";
    this.deckColor = "#585868";
    this.detailColor = "#D05050"; // Muted red
    this.scoreValue = 2000;
    this.enemyType = "ship";

    // --- Movement: Left-to-Right Patrol ---
    this.speedX = 0.6; // Slightly slower patrol
    this.patrolTargetX1 = 40;
    this.patrolTargetX2 = this.game.width - this.width - 40; // Adjust bounds for new width
    this.moveDirectionX = 1; // Start moving right (1)
    this.x = -this.width; // Start off-screen left
    this.targetY = this.game.height - this.height - 40; // Lower position
    this.y = this.targetY; // Set initial Y to the target Y

    // Optional Bobbing
    this.speedY = 0.15;
    this.driftDirection = 1;
    this.driftRange = 10;

    // Note: 'hasReachedPosition' is not really needed for patrol movement,
    // but can be kept if entry animation is different later. Let's remove for now.
    // this.hasReachedPosition = false;

    // --- Weak Points --- <<< NEW
    this.weakPoints = [];
    this.createWeakPoints(); // Call helper to initialize
    this.activeWeakPoints = this.weakPoints.length; // Track remaining active points

    // --- Attack Patterns & Timers ---
    this.attackPhase = 1;
    // Artillery (aimed shots)
    this.artilleryTimer = 2500 + Math.random() * 1000; // Initial delay
    this.artilleryInterval = 4200; // Time between aimed shots
    // --- NEW: Spread Gun ---
    this.spreadGunTimer = 1500 + Math.random() * 800;
    this.spreadGunInterval = 2500; // Fires more often than artillery
    // Missile Launcher
    this.missileTimer = 7000 + Math.random() * 2000; // Initial delay
    this.missileInterval = 8000; // Time between missile launches

    console.log(`Boss1 Created (Destroyer) with ${this.weakPoints.length} weak points.`);

    // Timers store time *until* next shot (counts down)
    this.mainGunTimer = 3000 + Math.random() * 1000; // Time until first shot
    this.mainGunInterval = 4000; // Time between shots
    this.aaGunTimer = 1000 + Math.random() * 500;
    this.aaGunInterval = 1200;

    // No minions in this version yet
  }

  createWeakPoints() {
    this.weakPoints = []; // Clear just in case
    // Define weak points relative to boss's top-left (x=0, y=0 is boss origin)
    // Values: offsetX, offsetY, width, height, health, type
    // Make them slightly larger/easier to hit
    this.weakPoints.push(new BossWeakPoint(this, 50, -10, 40, 30, 60, "artillery")); // Forward Artillery Turret (on deck)
    this.weakPoints.push(new BossWeakPoint(this, 130, 0, 50, 25, 45, "spreadGun")); // Mid Spread Gun (on deck)
    this.weakPoints.push(new BossWeakPoint(this, this.width - 70, 5, 40, 40, 55, "missile")); // Aft Missile Launcher (on deck)
    this.activeWeakPoints = this.weakPoints.length;
  }

  // Called by BossWeakPoint when destroyed
  weakPointDestroyed(type) {
    this.activeWeakPoints--;
    console.log(`Boss weak point ${type} destroyed! ${this.activeWeakPoints} remaining.`);

    // Optional: Increase attack rate of remaining weapons?
    if (this.activeWeakPoints === 1 && this.attackPhase === 1) {
      console.log("Boss1 Phase 2: One weapon left!");
      this.attackPhase = 2;
      this.artilleryInterval *= 0.7; // ~30% faster
      this.spreadGunInterval *= 0.7;
      this.missileInterval *= 0.75;
    }

    // --- WIN CONDITION ---
    if (this.activeWeakPoints <= 0 && !this.markedForDeletion) {
      console.log("Boss1 All Weak Points Destroyed! BOSS DEFEATED!");
      this.markedForDeletion = true; // Mark the main boss object for deletion
      // Base cleanup won't add score unless health was 0, so add score here
      this.game.addScore(this.scoreValue);
      // Trigger large chain explosion
      this.triggerDefeatExplosion();
      // Notify game state (optional - game loop detects markedForDeletion)
      // this.game.bossDefeated(); // The game loop handles this by checking markedForDeletion now
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
    // Play final big explosion sound?
    // playSound('bossExplosion');
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
    this.spreadGunTimer -= safeDeltaTime; // Update new timer
    this.missileTimer -= safeDeltaTime;

    // Check attacks based on timers AND weak point status
    const artilleryWP = this.weakPoints.find((wp) => wp.type === "artillery");
    if (artilleryWP && artilleryWP.isActive && this.artilleryTimer <= 0) {
      this.fireArtillery(artilleryWP);
      this.artilleryTimer = this.artilleryInterval + Math.random() * 500; // Reset timer
    }

    // --- Fire Spread Gun ---
    const spreadGunWP = this.weakPoints.find((wp) => wp.type === "spreadGun");
    if (spreadGunWP && spreadGunWP.isActive && this.spreadGunTimer <= 0) {
      this.fireSpreadGun(spreadGunWP);
      this.spreadGunTimer = this.spreadGunInterval + Math.random() * 400; // Reset spread timer
    }

    const missileWP = this.weakPoints.find((wp) => wp.type === "missile");
    if (missileWP && missileWP.isActive && this.missileTimer <= 0) {
      this.fireMissileFromLauncher(missileWP);
      this.missileTimer = this.missileInterval + Math.random() * 1000;
    }

    // --- Hit Flash Update for main boss body ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  } // End Boss1 update
  // --- Attack Pattern Methods ---
  fireArtillery(turret) {
    // Aimed shot towards player
    playSound("explosion"); // Heavier sound
    const bulletSpeed = 3.5; // Artillery shell speed
    const shellX = turret.x + turret.width / 2 - 6; // Center of turret X, adjust for shell width
    const shellY = turret.y - 8; // Slightly above turret Y, adjust for shell height

    // Calculate angle towards player center
    const player = this.game.player;
    if (!player || player.markedForDeletion) {
      // Don't fire if player doesn't exist (e.g., game over transition)
      console.log("Boss1 fireArtillery: Player not found or invalid.");
      return;
    }
    const angle = Math.atan2(player.y + player.height / 2 - shellY, player.x + player.width / 2 - shellX);

    // Calculate velocity components
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
      // shell.damage = 5; // Maybe make it more damaging? Requires adding damage to EnemyBullet
    } else if (shell) {
      console.warn("fireArtillery: Could not modify last projectile, was not an EnemyBullet?");
    }
  }

  // --- NEW Spread Gun Attack ---
  fireSpreadGun(gun) {
    // console.log("Boss1 firing spread gun");
    playSound("enemyShoot"); // Use standard shoot sound or maybe something distinct?
    const bulletSpeedX = -4.5; // Slightly faster than artillery base X speed
    const bulletX = gun.x; // Fire from front of spread gun weak point
    const bulletYCenter = gun.y + gun.height / 2 - 4; // Center Y

    // Fire 5 bullets in a 'W' or fan shape upwards/forwards
    const angles = [-0.4, -0.2, 0, 0.2, 0.4]; // Spread angles in radians
    angles.forEach((angle) => {
      const speedX = Math.cos(angle) * bulletSpeedX; // Adjust X slightly based on angle too
      const speedY = Math.sin(angle) * bulletSpeedX * -1; // Y speed based on X speed and angle
      this.game.addEnemyProjectile(new EnemyBullet(this.game, bulletX, bulletYCenter, speedX, speedY));
    });
  }

  fireMissileFromLauncher(launcher) {
    const missileX = launcher.x + launcher.width / 2 - 6;
    const missileY = launcher.y - 10;
    this.game.addEnemyProjectile(new TrackingMissile(this.game, missileX, missileY));
    // Sound played by missile constructor
  }

  // --- Attack Pattern Methods ---
  fireMainGun(turret) {
    // Fire from the turret's position
    // console.log("Boss1 firing main gun");
    playSound("explosion"); // Use heavy explosion sound?
    const shellSpeedX = -2.5; // Slower shell
    const shellSpeedY = -3; // Angled upwards
    const shellX = turret.x - 10; // Start left of turret
    const shellY = turret.y + turret.height / 2 - 8; // Adjust for shell size (needs new projectile type)

    // --- TODO: Create a new 'Shell' projectile class ---
    // For now, use a larger, slower EnemyBullet
    this.game.addEnemyProjectile(new EnemyBullet(this.game, shellX, shellY, shellSpeedX, shellSpeedY)); // Placeholder bullet
    // Modify bullet appearance if possible or create Shell class
    const bullet = this.game.enemyProjectiles[this.game.enemyProjectiles.length - 1];
    if (bullet) {
      bullet.width = 16;
      bullet.height = 16;
      bullet.color = "darkgrey";
    }
  }

  fireAAGun(activeGuns) {
    // Fire bursts from active AA gun positions
    // console.log("Boss1 firing AA guns");
    playSound("enemyShoot"); // Rapid sound?
    const bulletSpeedX = -6;
    activeGuns.forEach((gun) => {
      // Fire a small spread from each gun
      const gunYCenter = gun.y + gun.height / 2 - 4;
      this.game.addEnemyProjectile(new EnemyBullet(this.game, gun.x, gunYCenter, bulletSpeedX, 0)); // Straight
      this.game.addEnemyProjectile(new EnemyBullet(this.game, gun.x, gunYCenter - 5, bulletSpeedX * 0.9, -0.8)); // Angled up slightly
      this.game.addEnemyProjectile(new EnemyBullet(this.game, gun.x, gunYCenter + 5, bulletSpeedX * 0.9, 0.8)); // Angled down slightly
    });
  }

  fireMissileFromLauncher(launcher) {
    // console.log("Boss1 firing missile");
    const missileX = launcher.x + launcher.width / 2 - 6; // Center of launcher
    const missileY = launcher.y - 10; // Above launcher
    this.game.addEnemyProjectile(new TrackingMissile(this.game, missileX, missileY));
  }

  // --- Hit Method (Handles Weak Points) ---
  hit(projectile) {
    if (this.markedForDeletion || !projectile || projectile.markedForDeletion) return;

    const projectileType = projectile instanceof Bomb ? "bomb" : "bullet";
    const damage = projectile.damage || 1;

    let weakPointHitRegistered;

    // Check Weak Points
    for (const wp of this.weakPoints) {
      if (wp.isActive && checkCollision(projectile, wp)) {
        weakPointHitRegistered = true; // Mark that collision occurred with a weak point area

        // Apply damage based on type
        if (projectileType === "bomb") {
          // console.log(`   -> Bomb hit WeakPoint ${wp.type} (Health: ${wp.health}/${wp.maxHealth})`);
          wp.hit(damage); // Damage weak point, destruction handled internally
        } else {
          // Bullet
          // console.log(`   -> Bullet hit WeakPoint ${wp.type}. Flashing only.`);
          wp.isHit = true;
          wp.hitTimer = wp.hitDuration; // Flash
        }
        projectile.markedForDeletion = true; // Projectile is consumed by hitting weak point
        break; // Stop checking other weak points for this projectile
      }
    }
  } // End hit method

  draw(context) {
    if (this.markedForDeletion || !context) return;
    context.save();

    // --- Draw Base Hull --- (Adjust shape for 3 weapons)
    // Main Lower Hull
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y + 20, this.width, this.height - 20);
    // Main Deck
    context.fillStyle = this.deckColor;
    context.fillRect(this.x + 10, this.y, this.width - 20, this.height - 10);
    // Bridge Structure (Mid-Aft)
    context.fillStyle = this.color;
    context.fillRect(this.x + this.width * 0.5, this.y - 15, 80, 30);
    // Details
    context.fillStyle = this.detailColor;
    context.fillRect(this.x + 20, this.y + 5, 30, 10);
    context.fillRect(this.x + this.width - 50, this.y + 5, 30, 10);

    context.restore();

    // --- Draw Weak Points --- (They draw themselves relative to boss pos)
    this.weakPoints.forEach((wp) => wp.draw(context));
  }
} // End Boss1 class
