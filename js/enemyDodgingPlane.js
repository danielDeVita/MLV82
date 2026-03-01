import { EnemyPlane } from "./enemyPlane.js";
import { EnemyBullet } from "./enemyBullet.js"; // <<< Import EnemyBullet
import { playSound } from "./audio.js"; // <<< Import playSound
import { lerp } from "./utils.js";

import { Bullet } from "./bullet.js";
import { Bomb } from "./bomb.js";

// Aggressive tuning preset for enemy dodger behavior.
const DODGER_TUNING = {
  reactionCooldownMinMs: 850,
  reactionCooldownMaxMs: 1450,
  reactionCheckIntervalMs: 220,
  reactionChance: 0.72,
  maxPredictionFrames: 68,
  verticalLeewayMultiplier: 1.25,
  dodgeDistanceMin: 42,
  dodgeDistanceMax: 76,
  evadeMaxSpeed: 2.4,
  evadeAcceleration: 0.26,
  returnMaxSpeed: 1.6,
  returnAcceleration: 0.16,
  holdMinMs: 160,
  holdMaxMs: 320,
  settleTolerancePx: 2.2,
};

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
    this.reactionCooldownTimer = this.nextReactionCooldown();
    this.reactionCheckTimer =
      Math.random() * DODGER_TUNING.reactionCheckIntervalMs;
    this.maneuverState = "idle";
    this.maneuverOffsetY = 0;
    this.maneuverVelocityY = 0;
    this.maneuverTargetOffsetY = 0;
    this.maneuverHoldTimer = 0;
    this.isDodging = false;

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

    // --- Reaction Checks (only while idle) ---
    this.reactionCooldownTimer -= safeDeltaTime;
    this.reactionCheckTimer -= safeDeltaTime;
    if (
      this.maneuverState === "idle" &&
      this.reactionCooldownTimer <= 0 &&
      this.reactionCheckTimer <= 0
    ) {
      this.attemptReaction();
      this.reactionCheckTimer =
        DODGER_TUNING.reactionCheckIntervalMs * (0.75 + Math.random() * 0.7);
    }

    // --- Maneuver update ---
    const baseY = this.y;
    this.updateManeuver(safeDeltaTime, deltaScale);
    this.isDodging = this.maneuverState !== "idle";

    const potentialY = baseY + this.maneuverOffsetY;
    const topBound = 5;
    const bottomBound = this.game.height - this.height - 85; // Consistent boundary
    this.y = Math.max(topBound, Math.min(bottomBound, potentialY));
    this.maneuverOffsetY = this.y - baseY;

    // --- Shooting Logic (only when not dodging) ---
    this.shootTimer -= safeDeltaTime; // Decrement timer
    if (
      this.shootTimer <= 0 &&
      this.maneuverState !== "evade" &&
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
      this.maneuverState !== "idle" ||
      !this.game.player ||
      this.game.player.markedForDeletion
    ) {
      return;
    }

    const checkRange = 450; // How far ahead to look for projectiles
    const maxPredictionTime = DODGER_TUNING.maxPredictionFrames;
    const verticalLeeway =
      this.height * DODGER_TUNING.verticalLeewayMultiplier;
    const playerProjectiles = this.game.projectiles;
    const planeCenterX = this.x + this.width / 2;
    const planeCenterY = this.y + this.height / 2;
    const dangerZoneTop = planeCenterY - verticalLeeway / 2;
    const dangerZoneBottom = planeCenterY + verticalLeeway / 2;

    for (const p of playerProjectiles) {
      // Check if it's a relevant projectile type, not destroyed, and within horizontal range
      if (
        (p instanceof Bullet || p instanceof Bomb) &&
        !p.markedForDeletion &&
        p.x > this.x - checkRange && // Projectile is behind the check range start
        p.x < this.x + this.width
      ) {
        const { vx, vy } = this.getProjectileVelocity(p);
        if (!Number.isFinite(vx) || !Number.isFinite(vy) || vx <= 0.05) {
          continue;
        }

        const projectileCenterX = p.x + (p.width || 0) / 2;
        const projectileCenterY = p.y + (p.height || 0) / 2;
        const dx = planeCenterX - projectileCenterX;
        if (dx < -10 || dx > checkRange) {
          continue;
        }
        const timeToReach = dx / vx;
        if (timeToReach < 0 || timeToReach > maxPredictionTime) {
          continue;
        }
        const predictedProjY = projectileCenterY + vy * timeToReach;

        // Check if the predicted projectile path intersects the danger zone
        if (
          predictedProjY > dangerZoneTop &&
          predictedProjY < dangerZoneBottom
        ) {
          if (Math.random() > DODGER_TUNING.reactionChance) {
            continue;
          }
          // Threat detected! Determine dodge direction
          const dodgeDir = predictedProjY > planeCenterY ? -1 : 1; // Dodge UP if projectile below center, DOWN if above
          this.startManeuver(dodgeDir);
          // console.log(`Dodger ${this.id} reacting! Dir: ${dodgeDir}`); // Debug log
          return; // React to the first threat found in this check cycle
        }
      }
    }
  } // --- >>> End attemptReaction Method <<< ---

  getProjectileVelocity(projectile) {
    if (
      typeof projectile.speedX === "number" ||
      typeof projectile.speedY === "number"
    ) {
      return {
        vx: Number.isFinite(projectile.speedX) ? projectile.speedX : 0,
        vy: Number.isFinite(projectile.speedY) ? projectile.speedY : 0,
      };
    }

    if (typeof projectile.speed === "number") {
      const angle = Number.isFinite(projectile.angle) ? projectile.angle : 0;
      return {
        vx: Math.cos(angle) * projectile.speed,
        vy: Math.sin(angle) * projectile.speed,
      };
    }

    return { vx: 0, vy: 0 };
  }

  nextReactionCooldown() {
    return this.randomRange(
      DODGER_TUNING.reactionCooldownMinMs,
      DODGER_TUNING.reactionCooldownMaxMs
    );
  }

  moveTowards(current, target, maxStep) {
    if (current < target) return Math.min(target, current + maxStep);
    if (current > target) return Math.max(target, current - maxStep);
    return current;
  }

  stepManeuverTowards(targetOffset, maxSpeed, acceleration, deltaScale) {
    const offsetDelta = targetOffset - this.maneuverOffsetY;
    const desiredDirection = Math.sign(offsetDelta);
    const desiredVelocity = desiredDirection * maxSpeed;
    const velocityStep = acceleration * deltaScale;

    this.maneuverVelocityY = this.moveTowards(
      this.maneuverVelocityY,
      desiredVelocity,
      velocityStep
    );

    const previousOffset = this.maneuverOffsetY;
    this.maneuverOffsetY += this.maneuverVelocityY * deltaScale;

    const passedTarget =
      (offsetDelta > 0 && this.maneuverOffsetY > targetOffset) ||
      (offsetDelta < 0 && this.maneuverOffsetY < targetOffset);

    if (passedTarget) {
      this.maneuverOffsetY = targetOffset;
      this.maneuverVelocityY = lerp(this.maneuverVelocityY, 0, 0.6);
    } else if (Math.abs(this.maneuverOffsetY - previousOffset) < 0.01) {
      this.maneuverVelocityY = lerp(this.maneuverVelocityY, 0, 0.12);
    }
  }

  startManeuver(direction) {
    if (this.maneuverState !== "idle") return;

    const dodgeDir = direction >= 0 ? 1 : -1;
    const dodgeDistance = this.randomRange(
      DODGER_TUNING.dodgeDistanceMin,
      DODGER_TUNING.dodgeDistanceMax
    );

    const topBound = 5;
    const bottomBound = this.game.height - this.height - 85;
    const currentCenterY = this.y + this.height / 2;
    const minCenterY = topBound + this.height / 2;
    const maxCenterY = bottomBound + this.height / 2;
    const desiredCenterY = currentCenterY + dodgeDir * dodgeDistance;
    const targetCenterY = Math.max(minCenterY, Math.min(maxCenterY, desiredCenterY));
    const targetOffset = targetCenterY - currentCenterY;

    if (Math.abs(targetOffset) < 6) return;

    this.maneuverState = "evade";
    this.maneuverTargetOffsetY = targetOffset;
    this.maneuverHoldTimer = 0;
    this.maneuverVelocityY = lerp(this.maneuverVelocityY, 0, 0.7);
    this.reactionCooldownTimer = this.nextReactionCooldown();
  }

  updateManeuver(safeDeltaTime, deltaScale) {
    const settleTolerance = DODGER_TUNING.settleTolerancePx;

    if (this.maneuverState === "idle") {
      this.maneuverVelocityY = lerp(this.maneuverVelocityY, 0, 0.08);
      this.maneuverOffsetY = lerp(this.maneuverOffsetY, 0, 0.07 * deltaScale);
      if (Math.abs(this.maneuverOffsetY) < 0.05) this.maneuverOffsetY = 0;
      return;
    }

    if (this.maneuverState === "evade") {
      this.stepManeuverTowards(
        this.maneuverTargetOffsetY,
        DODGER_TUNING.evadeMaxSpeed,
        DODGER_TUNING.evadeAcceleration,
        deltaScale
      );
      if (
        Math.abs(this.maneuverOffsetY - this.maneuverTargetOffsetY) <=
        settleTolerance
      ) {
        this.maneuverState = "hold";
        this.maneuverHoldTimer = this.randomRange(
          DODGER_TUNING.holdMinMs,
          DODGER_TUNING.holdMaxMs
        );
        this.maneuverVelocityY = lerp(this.maneuverVelocityY, 0, 0.8);
      }
      return;
    }

    if (this.maneuverState === "hold") {
      this.maneuverHoldTimer -= safeDeltaTime;
      this.maneuverOffsetY = lerp(
        this.maneuverOffsetY,
        this.maneuverTargetOffsetY,
        0.18 * deltaScale
      );
      this.maneuverVelocityY = lerp(this.maneuverVelocityY, 0, 0.2);
      if (this.maneuverHoldTimer <= 0) {
        this.maneuverState = "return";
      }
      return;
    }

    if (this.maneuverState === "return") {
      this.stepManeuverTowards(
        0,
        DODGER_TUNING.returnMaxSpeed,
        DODGER_TUNING.returnAcceleration,
        deltaScale
      );
      if (Math.abs(this.maneuverOffsetY) <= settleTolerance) {
        this.maneuverState = "idle";
        this.maneuverOffsetY = 0;
        this.maneuverVelocityY = 0;
        this.reactionCooldownTimer = Math.max(
          this.reactionCooldownTimer,
          this.nextReactionCooldown()
        );
      }
    }
  }

  // --- NEW: Shoot method ---
  shoot() {
    // Simple shot straight left from center
    const bulletX = this.x; // Fire from front edge
    const bulletY = this.y + this.height / 2 - 4; // Center vertically adjust for bullet height
    let speedY = 0;
    const player = this.game?.player;
    if (player && !player.markedForDeletion) {
      const playerCenterY = player.y + player.height / 2;
      const shooterCenterY = bulletY + 4;
      speedY = Math.max(-1.6, Math.min(1.6, (playerCenterY - shooterCenterY) / 145));
    }
    this.game.addEnemyProjectile(
      new EnemyBullet(this.game, bulletX, bulletY, -5, speedY)
    );
    playSound("enemyShoot"); // Use the generic enemy shoot sound
  }
}
