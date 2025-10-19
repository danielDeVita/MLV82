import { EnemyPlane } from "./enemyPlane.js";
import { randomInt } from "./utils.js";
import { EnemyBullet } from "./enemyBullet.js"; // <<< Import EnemyBullet
import { playSound } from "./audio.js"; // <<< Import playSound
import { lerp } from "./utils.js";

import { Bullet } from "./bullet.js";
import { Bomb } from "./bomb.js";

// // Helper function for Lerp (if not globally available)
// function lerp(start, end, amount) {
//   amount = Math.max(0, Math.min(1, amount));
//   return start + (end - start) * amount;
// }

export class EnemyDodgingPlane extends EnemyPlane {
  constructor(game, speedBoost = 0) {
    // --- Call parent constructor FIRST ---
    super(game, speedBoost); // Inherits movement & rotation params

    // --- Override ONLY what's needed for Dodger ---
    // 1. Sprite Properties (Use inherited scale/dims)
    this.image = new Image();
    this.image.src = "images/AMENAZA 3.png";
    // If scale different, recalc width/height
    // this.width = this.spriteWidth * this.scale; this.height = this.spriteHeight * this.scale;

    // 2. Override Stats
    this.maxHealth = 4;
    this.health = this.maxHealth;
    this.scoreValue = 90;

    // 3. Override Movement Parameters (Optional - if different from base)
    // this.speedX = (2.5 + speedBoost);
    // this.frequency = 0.009;
    // this.amplitude = 45;
    // this.initialY = ... // Recalc if needed

    // --- REMOVED Rotation Parameter Recalculation ---

    // 4. Dodger Behaviour Properties
    this.dodgeCooldown = 500;
    this.dodgeTimer = this.dodgeCooldown;
    this.dodgeSpeed = 8;
    this.dodgeDuration = 150;
    this.isDodging = false;
    this.dodgeDirection = 0;
    this.dodgeCheckTimer = Math.random() * this.dodgeCooldown; // Added missing check timer init

    // 5. Shooter Component
    this.shootTimer = Math.random() * 2000 + 1500;
    this.shootInterval = 2500 + Math.random() * 1000;
  } // End Constructor

  update(deltaTime) {
    // --- >>> Call super.update() FIRST <<< ---
    // This now handles: Horizontal Move, Base Sine Wave Vertical Move,
    // BOUNDARY CHECKS, **ROTATION CALCULATION/UPDATE**, Hit Flash
    super.update(deltaTime);

    // Exit if parent update marked for deletion
    if (this.markedForDeletion) return;

    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Dodging Check & State Update ---
    this.dodgeCheckTimer += safeDeltaTime;
    if (this.isDodging) {
      this.dodgeTimer -= safeDeltaTime;
      if (this.dodgeTimer <= 0) {
        this.isDodging = false;
        this.dodgeCheckTimer = 0; // Start cooldown
      }
    } else {
      if (this.dodgeCheckTimer >= this.dodgeCooldown) {
        this.attemptReaction(); // Tries to set isDodging = true
        this.dodgeCheckTimer = 0; // Reset check timer anyway
      }
    }

    // --- Apply Dodge Offset Additively ---
    // We ADD the dodge movement to the position already set by super.update()
    if (this.isDodging) {
      const dodgeAmount = this.dodgeDirection * this.dodgeSpeed * deltaScale;
      const potentialY = this.y + dodgeAmount;

      // Apply boundaries AGAIN after adding dodge offset
      const topBound = 5;
      const bottomBound = this.game.height - this.height - 85; // Consistent boundary
      this.y = Math.max(topBound, Math.min(bottomBound, potentialY));
    }

    // --- Shooting Logic (only when not dodging) ---
    this.shootTimer -= safeDeltaTime; // Decrement timer
    if (
      this.shootTimer <= 0 &&
      !this.isDodging &&
      this.x < this.game.width * 0.95
    ) {
      this.shoot();
      this.shootTimer = this.shootInterval + Math.random() * 500 - 250;
    }
  } // End update

  // --- >>> attemptReaction Method <<< ---
  attemptReaction() {
    // Ensure player exists and isn't dodging
    if (
      this.isDodging ||
      !this.game.player ||
      this.game.player.markedForDeletion
    ) {
      return;
    }

    const checkRange = 450; // How far ahead to look for projectiles
    const verticalLeeway = this.height * 1.5; // How far above/below to consider a threat
    const playerProjectiles = this.game.projectiles;

    for (const p of playerProjectiles) {
      // Check if it's a relevant projectile type, not destroyed, and within horizontal range
      if (
        (p instanceof Bullet || p instanceof Bomb) &&
        !p.markedForDeletion &&
        p.x > this.x - checkRange && // Projectile is behind the check range start
        p.x < this.x + this.width
      ) {
        // Projectile hasn't passed the plane's front
        // Estimate projectile Y position when it reaches the plane's front edge (simple linear projection)
        // This could be more sophisticated, but might be enough for arcade feel
        const timeToReach = Math.max(0.01, (this.x - p.x) / (p.speed || 10)); // Avoid division by zero
        const predictedProjY = p.y + (p.velocityY || 0) * timeToReach; // Use velocityY if available (Bullet has it via angle?)

        // Define the vertical danger zone around the plane's center
        const planeCenterY = this.y + this.height / 2;
        const dangerZoneTop = planeCenterY - verticalLeeway / 2;
        const dangerZoneBottom = planeCenterY + verticalLeeway / 2;

        // Check if the predicted projectile path intersects the danger zone
        if (
          predictedProjY > dangerZoneTop &&
          predictedProjY < dangerZoneBottom
        ) {
          // Threat detected! Determine dodge direction
          const dodgeDir = predictedProjY > planeCenterY ? -1 : 1; // Dodge UP if projectile below center, DOWN if above
          this.startDodge(dodgeDir);
          // console.log(`Dodger ${this.id} reacting! Dir: ${dodgeDir}`); // Debug log
          return; // React to the first threat found in this check cycle
        }
      }
    }
  } // --- >>> End attemptReaction Method <<< ---

  startDodge(direction) {
    this.isDodging = true;
    this.dodgeDirection = direction;
    this.dodgeTimer = this.dodgeDuration; // Start duration timer
    this.dodgeCheckTimer = 0; // Ensure cooldown starts after this dodge ends
  }
  // Keep attemptReaction, startDodge, shoot, draw (inherited)

  // Keep attemptReaction, startDodge, shoot, draw (inherited)

  resetDodgeCooldown() {
    this.dodgeCooldown = 600 + Math.random() * 600; // Keep this cooldown
  }

  // --- NEW: Shoot method ---
  shoot() {
    // Simple shot straight left from center
    const bulletX = this.x; // Fire from front edge
    const bulletY = this.y + this.height / 2 - 4; // Center vertically adjust for bullet height
    this.game.addEnemyProjectile(
      new EnemyBullet(this.game, bulletX, bulletY, -5)
    ); // Speed -5 (adjust as needed)
    playSound("enemyShoot"); // Use the generic enemy shoot sound
  }
}
