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
    this.id = "boss_1_cruiser"; // More specific ID

    // --- Boss Specific Stats ---
    this.width = 220;
    this.height = 90;
    this.maxHealth = 180;
    this.health = this.maxHealth;
    this.color = "#404050"; // Slightly different dark grey/blue
    this.deckColor = "#606070";
    this.detailColor = "#FF6666"; // Lighter red/orange details
    this.scoreValue = 1500;
    this.enemyType = "ship";

    // --- Movement: Left-to-Right Patrol ---
    this.speedX = 0.7; // Slow patrol speed

    // Define VERTICAL position FIRST
    this.targetY = this.game.height - this.height - 50; // Desired vertical position (50px from bottom edge)
    this.y = this.targetY; // Set initial Y to the target Y

    // Define HORIZONTAL position and patrol bounds
    this.x = -this.width; // Start off-screen left
    this.patrolTargetX1 = 50; // Left patrol boundary
    this.patrolTargetX2 = this.game.width - this.width - 50; // Right patrol boundary
    this.moveDirectionX = 1; // Start moving right (1)

    // Vertical Bobbing parameters (optional)
    this.speedY = 0.2;
    this.driftDirection = 1;
    this.driftRange = 15;
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
    this.artilleryTimer = 2000 + Math.random() * 1000; // Initial delay
    this.artilleryInterval = 3500; // Time between aimed shots
    // Missile Launcher
    this.missileTimer = 6000 + Math.random() * 1500; // Initial delay
    this.missileInterval = 7000; // Time between missile launches
    // Timers store time *until* next shot (counts down)
    this.mainGunTimer = 3000 + Math.random() * 1000; // Time until first shot
    this.mainGunInterval = 4000; // Time between shots
    this.aaGunTimer = 1000 + Math.random() * 500;
    this.aaGunInterval = 1200;

    // No minions in this version yet

    console.log(`Boss1 Created (Cruiser) with ${this.weakPoints.length} weak points.`);
  }

  createWeakPoints() {
    // Define weak points relative to boss's top-left (x=0, y=0 is boss origin)
    // Values: offsetX, offsetY, width, height, health, type
    // Make them slightly larger/easier to hit
    this.weakPoints.push(new BossWeakPoint(this, 70, -15, 45, 35, 50, "artillery")); // Forward Artillery Turret (on deck)
    this.weakPoints.push(new BossWeakPoint(this, this.width - 70, 0, 40, 40, 40, "missile")); // Aft Missile Launcher (on deck)
  }

  // Called by BossWeakPoint when destroyed
  weakPointDestroyed(type) {
    this.activeWeakPoints--;
    console.log(`Boss weak point ${type} destroyed! ${this.activeWeakPoints} remaining.`);
    // Make attacks faster/different when one weak point is down?
    if (this.activeWeakPoints === 1 && this.attackPhase === 1) {
      console.log("Boss1 Phase 2: One weak point down!");
      this.attackPhase = 2;
      this.artilleryInterval = 2800; // Faster artillery
      this.missileInterval = 5500; // Faster missiles
    } else if (this.activeWeakPoints <= 0 && this.attackPhase < 3) {
      console.log("Boss1 Phase 3: All Weak Points Destroyed! Hull vulnerable!");
      this.attackPhase = 3;
    }
  }

  update(deltaTime) {
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
    // this.y = this.targetY + Math.sin(Date.now() * 0.0005) * this.driftRange;

    // --- Update Weak Points (Position and Hit Flash) ---
    this.weakPoints.forEach((wp) => wp.update(deltaTime));

    // --- Attack Logic ---
    // Update Attack Timers (Count down)
    this.artilleryTimer -= safeDeltaTime;
    this.missileTimer -= safeDeltaTime;

    // Check attacks based on timers AND weak point status
    const artilleryWP = this.weakPoints.find((wp) => wp.type === "artillery");
    if (artilleryWP && artilleryWP.isActive && this.artilleryTimer <= 0) {
      this.fireArtillery(artilleryWP);
      this.artilleryTimer = this.artilleryInterval + Math.random() * 500; // Reset timer
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

    // console.log(`Boss1 Hit Check: Received ${projectileType}, Damage=${damage}`);

    let hitWeakPoint = false;
    let weakPointDestroyedThisHit = false;

    // Check Weak Points FIRST
    for (const wp of this.weakPoints) {
      if (wp.isActive && checkCollision(projectile, wp)) {
        hitWeakPoint = true;
        if (projectileType === "bomb") {
          // Bombs damage weak points
          // console.log(`   -> Bomb hit WeakPoint ${wp.type} (Health: ${wp.health}/${wp.maxHealth})`);
          weakPointDestroyedThisHit = wp.hit(damage);
          projectile.markedForDeletion = true;
        } else {
          // Bullets flash weak points
          // console.log(`   -> Bullet hit WeakPoint ${wp.type}. Flashing only.`);
          wp.isHit = true;
          wp.hitTimer = wp.hitDuration;
          projectile.markedForDeletion = true;
        }
        break; // Stop after hitting one weak point
      }
    }

    // Damage Main Hull if appropriate
    const hullVulnerable = this.activeWeakPoints <= 0;
    const canDamageHull = (!hitWeakPoint && projectileType === "bomb") || hullVulnerable; // Only bombs damage hull unless vulnerable

    if (canDamageHull) {
      let actualDamage = 0;
      if (projectileType === "bomb") {
        actualDamage = damage; // Full bomb damage
      } else if (projectileType === "bullet" && hullVulnerable) {
        actualDamage = Math.ceil(damage * 0.3); // Reduced bullet damage when vulnerable
      }

      if (actualDamage > 0) {
        this.isHit = true;
        this.hitTimer = this.hitDuration;
        this.health -= actualDamage;
        console.log(`   -> Boss Hull Health: ${this.health}/${this.maxHealth}`);
        if (this.health <= 0 && !this.markedForDeletion) {
          console.log(`Boss1 HULL DESTROYED!`);
          this.markedForDeletion = true;
          this.weakPoints.forEach((wp) => (wp.isActive = false));
          this.game.createExplosion(this.x + this.width / 2, this.y + this.height / 2, "ship"); // Main explosion
          for (let i = 0; i < 8; i++) {
            setTimeout(() => {
              if (!this.game.isGameOver)
                this.game.createExplosion(
                  this.x + Math.random() * this.width,
                  this.y + Math.random() * this.height,
                  Math.random() < 0.5 ? "air" : "tiny"
                );
            }, i * 180 + Math.random() * 100);
          } // Chain explosions
        }
      } else if (projectileType === "bullet" && !hullVulnerable && !hitWeakPoint) {
        // Bullet hit hull but weak points active/missed weak point
        // console.log(`   -> Bullet hit hull, but weak points active/missed. No damage.`);
        projectile.markedForDeletion = true; // Consume bullet
      }

      // Mark projectile if it hit hull area and wasn't already marked
      if (!projectile.markedForDeletion) projectile.markedForDeletion = true;
    } else if (hitWeakPoint) {
      // Projectile hit weak point, already handled & marked for deletion there
    }
  } // End hit method

  draw(context) {
    if (this.markedForDeletion || !context) return;
    context.save();

    // --- Draw Base Hull ---
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y + 15, this.width, this.height - 15); // Main hull
    context.fillStyle = this.deckColor;
    context.fillRect(this.x + 20, this.y, this.width - 40, this.height - 5); // Deck area slightly inset
    // Bridge
    context.fillStyle = this.color;
    context.fillRect(this.x + this.width * 0.3, this.y - 10, 60, 20);
    // Details
    context.fillStyle = this.detailColor;
    context.fillRect(this.x + 30, this.y + 5, 25, 8);
    context.fillRect(this.x + this.width - 55, this.y + 5, 25, 8);

    // --- Draw Weak Points --- (They draw themselves relative to boss pos)
    this.weakPoints.forEach((wp) => wp.draw(context));

    // --- Main Boss Health Bar (Custom) ---
    if (!this.markedForDeletion) {
      const barWidth = this.width * 0.7;
      const barX = this.x + (this.width - barWidth) / 2;
      const barY = this.y - 25;
      const barHeight = 12;
      context.fillStyle = "darkred";
      context.fillRect(barX, barY, barWidth, barHeight);
      context.fillStyle = "orange"; // Use orange/yellow for boss health?
      const currentHealthWidth = Math.max(0, barWidth * (this.health / this.maxHealth));
      context.fillRect(barX, barY, currentHealthWidth, barHeight);
      context.strokeStyle = "white";
      context.lineWidth = 1;
      context.strokeRect(barX, barY, barWidth, barHeight); // Add border
    }

    // Optional: Main hull hit flash (subtle, draw last?)
    if (this.isHit) {
      // Only flash hull if a weak point wasn't the primary hit visual
      context.fillStyle = "rgba(255, 255, 255, 0.4)";
      context.fillRect(this.x, this.y - 10, this.width, this.height + 10); // Cover most area
    }

    context.restore();
    // No super.draw(context) needed if we draw custom health bar
  }
} // End Boss1 class
