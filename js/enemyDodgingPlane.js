import { EnemyPlane } from "./enemyPlane.js";
import { randomInt } from "./utils.js";
import { EnemyBullet } from "./enemyBullet.js"; // <<< Import EnemyBullet
import { playSound } from "./audio.js"; // <<< Import playSound

// Helper function for Lerp (if not globally available)
function lerp(start, end, amount) {
  amount = Math.max(0, Math.min(1, amount));
  return start + (end - start) * amount;
}

export class EnemyDodgingPlane extends EnemyPlane {
  constructor(game, speedBoost = 0) {
    // Call parent but override sine wave params later
    super(game, speedBoost);
    this.health = 1; // Still 1 hit kill
    this.maxHealth = this.health;
    this.scoreValue = 55; // Increased score for added threat
    this.color = "orange";
    this.enemyType = "air";

    // --- Sine Wave Properties (Wide Amplitude, SLOWER Frequency) ---
    this.amplitude = 120 + Math.random() * 60; // New Range: 60px to 100px (Much narrower)
    // DECREASE Frequency for slower oscillations
    this.frequency = 0.025 + Math.random() * 0.015;

    this.angle = Math.random() * Math.PI * 2;
    this.initialY = undefined;

    // --- Reactive Dodge Properties --- (Keep these)
    this.dodgeCooldown = 700 + Math.random() * 600;
    this.dodgeCheckTimer = Math.random() * this.dodgeCooldown;
    this.isReacting = false;
    this.reactionDuration = 700;
    this.reactionTimer = 0;
    this.reactionStrength = 100;
    this.reactionDirection = 0;

    // --- Smoothing Properties --- (Keep these)
    this.currentReactionOffset = 0;
    this.targetReactionOffset = 0;
    this.baseReactionLerpSpeed = 0.08;

    // --- NEW: Random Wobble Properties ---
    this.wobbleStrength = 25 + Math.random() * 15; // Max distance wobble moves (e.g., 25-40px)
    this.wobbleChangeInterval = 300 + Math.random() * 400; // How often target wobble changes (0.3-0.7s)
    this.wobbleTimer = 0;
    this.currentTargetWobbleOffset = 0; // The random offset we are moving towards
    this.currentWobbleOffset = 0; // The actual smoothed wobble offset being applied
    this.wobbleLerpSpeed = 0.08; // How quickly to lerp towards the target wobble (make it slower than reaction)

    // --- Horizontal Speed ---
    this.speedX = (randomInt(3, 5) || 3.5) + speedBoost;

    // --- NEW: Shooting Properties ---
    this.shootTimer = 0;
    // Fire slightly less often than dedicated shooters? Or more unpredictably?
    this.shootInterval = 1100 + Math.random() * 800; // Range: 1.1s to 1.9s
    this.shootTimer = Math.random() * this.shootInterval; // Random initial offset
  }

  // Inside js/enemyDodgingPlane.js -> EnemyDodgingPlane class
  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Horizontal Movement --- (Scaled)
    this.x -= this.speedX * deltaScale;
    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
      return;
    }

    // --- Capture initialY safely ONCE ---
    if (this.initialY === undefined || isNaN(this.initialY)) {
      this.initialY = this.y;
      if (isNaN(this.initialY)) {
        this.initialY = this.game.height / 2;
      }
    }

    // --- Calculate Base Vertical Position (Sine Wave) ---
    this.angle += this.frequency * deltaScale; // Scaled frequency
    let baseY = this.initialY + Math.sin(this.angle) * this.amplitude;

    // --- Boundaries ---
    const topBound = 5;
    const bottomBound = this.game.height - this.height - 85;
    baseY = Math.max(topBound, Math.min(bottomBound, baseY)); // Clamp base

    // --- Reactive Dodge Check & State Update ---
    this.dodgeCheckTimer += safeDeltaTime;
    if (this.isReacting) {
      this.reactionTimer += safeDeltaTime;
      this.targetReactionOffset = this.reactionDirection * this.reactionStrength;
      if (this.reactionTimer >= this.reactionDuration) {
        this.isReacting = false;
        this.targetReactionOffset = 0;
      }
    } else {
      this.targetReactionOffset = 0;
      if (this.dodgeCheckTimer >= this.dodgeCooldown) {
        this.attemptReaction();
        this.dodgeCheckTimer = 0; // Reset cooldown timer only after check
        this.resetDodgeCooldown();
      }
    }

    // --- Smoothly Move Current Offset Towards Target Offset using DeltaTime ---
    const reactionLerpAmount = Math.min(1, this.baseReactionLerpSpeed * deltaScale); // Calculate scaled lerp amount
    // --- Apply the lerp calculation ---
    this.currentReactionOffset = lerp(
      this.currentReactionOffset, // Start value
      this.targetReactionOffset, // Target value
      reactionLerpAmount // Amount to move towards target this frame
    ); // <<< CORRECTED LINE

    // --- Snap to target if very close ---
    const snapThreshold = 0.5;
    if (Math.abs(this.currentReactionOffset - this.targetReactionOffset) < snapThreshold) {
      this.currentReactionOffset = this.targetReactionOffset;
    }
    if (!this.isReacting && Math.abs(this.currentReactionOffset) < snapThreshold) {
      this.currentReactionOffset = 0;
    }

    // --- Calculate Final Vertical Position ---
    let finalY = baseY + this.currentWobbleOffset + this.currentReactionOffset; // Include wobble if that code is still present

    // --- Apply Boundaries to Final Position ---
    this.y = Math.max(topBound, Math.min(bottomBound, finalY));

    // --- Safety Check for NaN ---
    if (isNaN(this.y)) {
      console.error("!!! this.y became NaN! Resetting.");
      this.y = this.game.height / 2;
    }

    // --- Hit Flash Update ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }

    // --- Shooting logic ---
    this.shootTimer += safeDeltaTime;
    if (!this.markedForDeletion && this.shootTimer >= this.shootInterval && this.x < this.game.width * 0.9) {
      this.shoot();
      this.shootTimer = 0;
      this.shootInterval = 1800 + Math.random() * 1200;
    }
  } // End of update

  resetDodgeCooldown() {
    this.dodgeCooldown = 600 + Math.random() * 600; // Keep this cooldown
  }

  attemptReaction() {
    /* ... same as before ... */
    const verticalDistance = Math.abs(this.y + this.height / 2 - (this.game.player.y + this.game.player.height / 2));
    const horizontalDistance = this.x - (this.game.player.x + this.game.player.width);
    const triggerVerticalDistance = this.height * 5; // Keep wider trigger
    const triggerHorizontalDistance = this.game.width * 0.8;

    if (!this.isReacting && verticalDistance < triggerVerticalDistance && horizontalDistance > 0 && horizontalDistance < triggerHorizontalDistance) {
      this.isReacting = true;
      this.reactionTimer = 0;
      this.reactionDirection = this.game.player.y + this.game.player.height / 2 > this.y + this.height / 2 ? -1 : 1; // Push UP if player below, DOWN otherwise
      // console.log(`---> Reacting! Pushing ${this.reactionDirection === 1 ? 'DOWN' : 'UP'}`);
    }
  }

  // --- NEW: Shoot method ---
  shoot() {
    // Simple shot straight left from center
    const bulletX = this.x; // Fire from front edge
    const bulletY = this.y + this.height / 2 - 4; // Center vertically adjust for bullet height
    this.game.addEnemyProjectile(new EnemyBullet(this.game, bulletX, bulletY, -5)); // Speed -5 (adjust as needed)
    playSound("enemyShoot"); // Use the generic enemy shoot sound
  }

  // Draw method can remain the same
  draw(context) {
    // Don't draw if marked for deletion
    if (this.markedForDeletion) return;

    context.save();
    if (this.isHit) {
      context.fillStyle = "white";
    } else {
      context.fillStyle = this.color;
    } // Use orange color

    // --- Draw Base Plane Shape ---
    context.beginPath();
    context.moveTo(this.x + this.width * 0.1, this.y + this.height * 0.2);
    // ... rest of plane path ...
    context.closePath();
    context.fill();

    // --- Draw Cockpit ---
    context.fillStyle = "lightblue";
    context.beginPath();
    context.arc(this.x + this.width * 0.6, this.y + this.height * 0.35, this.width * 0.1, 0, Math.PI * 2);
    context.fill();

    // --- Draw Chevron ---
    context.fillStyle = "yellow"; // Chevron doesn't need to flash white
    context.beginPath();
    context.moveTo(this.x + this.width * 0.2, this.y + this.height * 0.3);
    context.lineTo(this.x + this.width * 0.4, this.y + this.height * 0.5);
    context.lineTo(this.x + this.width * 0.2, this.y + this.height * 0.7);
    context.closePath();
    context.fill();

    context.restore();

    // --- Call Base Draw Method (for consistency) ---
    super.draw(context); // <<< This calls Enemy.draw()
  }
}
