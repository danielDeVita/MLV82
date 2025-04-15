// js/enemyBeamShip.js
import { EnemyShip } from "./enemyShip.js";
import { playSound } from "./audio.js";
import { checkCollision, lerp } from "./utils.js";

export class EnemyBeamShip extends EnemyShip {
  constructor(game, speedBoost = 0) {
    super(game, speedBoost);

    this.id = `enemy_beamship_angled_${Math.random()
      .toString(36)
      .substring(2, 9)}`;
    this.health = 10;
    this.maxHealth = this.health;
    this.scoreValue = 190; // Slightly more score
    this.color = "#483D8B";
    this.deckColor = "#778899";
    this.detailColor = "#FF00FF";

    this.speedX *= 0.85; // Example: 15% slower than default EnemyShip

    // Beam Attack State & Timers
    this.beamState = "COOLDOWN";
    this.beamChargeTime = 1500;
    this.beamFireTime = 1800; // Shorter fire time?
    this.beamCooldownTime = 4500 + Math.random() * 1500; // Shorter range: 4.5s - 6s (was 5.5s - 7.5s)
    // Start with maybe 1/3 to 2/3 of cooldown remaining?
    this.beamTimer = this.beamCooldownTime * (0.33 + Math.random() * 0.33);

    // Beam Visual Properties
    this.beamWidth = 12;
    this.beamMaxLength = this.game.width * 0.8;
    this.beamColorOuter = "rgba(255, 0, 255, 0.3)";
    this.beamColorCore = "rgba(255, 150, 255, 0.8)";
    this.chargeColor = "rgba(255, 0, 255, 0.7)";

    // Beam Angle & Origin
    this.beamAngle = 0;
    this.beamOriginX = 0;
    this.beamOriginY = 0;

    // --- >>> NEW: Beam Extension <<< ---
    this.currentBeamLength = 0; // How long the beam is *right now*
    // --- >>> END NEW <<< ---

    // Movement Control
    this.originalSpeedX = this.speedX;
    this.stopMovement = false;
  }

  // Inside js/enemyBeamShip.js -> EnemyBeamShip class

  update(deltaTime) {
    // --- Movement & Hit Flash ---
    // Check if movement should be stopped
    if (!this.stopMovement) {
      super.update(deltaTime); // Handle movement, boundaries, standard hit flash from EnemyShip/Enemy
    }
    // >>> If stopped, STILL handle basic updates like hit flash timer <<<
    else if (this.isHit) {
      const safeDeltaTimeHit = Math.max(0.1, deltaTime); // Use safe delta for timer consistency
      this.hitTimer -= safeDeltaTimeHit;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
    // >>> End Hit Flash While Stopped <<<

    // Don't update beam logic if marked for deletion
    if (this.markedForDeletion) return;

    const safeDeltaTime = Math.max(0.1, deltaTime);

    // --- Beam State Machine ---
    this.beamTimer -= safeDeltaTime; // Decrement timer regardless of state

    if (this.beamState === "COOLDOWN") {
      this.stopMovement = false; // Ensure movement is enabled
      this.currentBeamLength = 0; // Ensure length is reset

      // --- >>> ADD ON-SCREEN CHECK <<< ---
      // Check if cooldown finished AND ship is mostly on screen
      const isOnScreen =
        this.x < this.game.width * 0.95 && this.x > -this.width * 0.1; // Example check: Mostly visible

      // >>> Check if cooldown finished <<<
      if (this.beamTimer <= 0 && isOnScreen) {
        this.beamState = "CHARGING"; // Transition state
        this.beamTimer = this.beamChargeTime; // Set charge duration timer
        this.stopMovement = true; // Stop movement to charge
        playSound("charge_up"); // Play charge sound
      }
      // >>> End Cooldown Check <<<
    } else if (this.beamState === "CHARGING") {
      this.stopMovement = true; // Ensure stopped
      this.currentBeamLength = 0; // Keep length at 0 during charge
      // Check if charging finished
      if (this.beamTimer <= 0) {
        this.beamState = "FIRING"; // Transition state
        this.beamTimer = this.beamFireTime; // Set fire duration timer
        this.stopMovement = true; // Remain stopped
        // Calculate and Store Angle when Firing Starts
        const player = this.game.player;
        this.beamOriginX = this.x;
        this.beamOriginY = this.y + this.height / 2;
        if (player && !player.markedForDeletion) {
          this.beamAngle = Math.atan2(
            player.y + player.height / 2 - this.beamOriginY,
            player.x + player.width / 2 - this.beamOriginX
          );
        } else {
          this.beamAngle = -Math.PI / 4;
        } // Default angle
        playSound("laser_beam"); // Play beam fire sound
      }
    } else if (this.beamState === "FIRING") {
      this.stopMovement = true; // Ensure stopped

      // Calculate Current Beam Length
      const fireProgress = Math.max(
        0,
        1.0 - this.beamTimer / this.beamFireTime
      ); // Ensure progress is 0-1
      this.currentBeamLength = lerp(0, this.beamMaxLength, fireProgress);

      // Beam Collision Check (Approximate)
      const player = this.game.player;
      if (
        player &&
        !player.shieldActive &&
        !player.invincible &&
        this.currentBeamLength > 10
      ) {
        // Check only if beam has some length
        const segments = 10;
        const dx = Math.cos(this.beamAngle);
        const dy = Math.sin(this.beamAngle);
        const checkMaxLen = this.currentBeamLength;
        for (let i = 1; i <= segments; i++) {
          const checkLength = (i / segments) * checkMaxLen;
          const beamSegmentRect = {
            x: this.beamOriginX + dx * checkLength - this.beamWidth,
            y: this.beamOriginY + dy * checkLength - this.beamWidth / 2,
            width: this.beamWidth * 2,
            height: this.beamWidth,
          };
          if (checkCollision(player, beamSegmentRect)) {
            player.hit();
            break;
          }
        }
      }
      // End Collision Check

      // Check if firing finished
      if (this.beamTimer <= 0) {
        this.beamState = "COOLDOWN"; // Transition state
        // Set cooldown duration timer with variance
        this.beamTimer = this.beamCooldownTime + Math.random() * 1000 - 500;
        this.stopMovement = false; // Allow movement again
        this.currentBeamLength = 0; // Reset beam length

        // playSound('laser_end'); // Optional beam end sound
      }
    } // End State Machine
  } // End update

  // updateBeamRect() - Removed, collision handled differently now

  // Inside js/enemyBeamShip.js -> EnemyBeamShip class

  draw(context) {
    if (this.markedForDeletion) return;
    context.save(); // Save 1

    const currentHullColor = this.isHit ? "white" : this.color;
    const currentDeckColor = this.isHit ? "white" : this.deckColor;
    const currentDetailColor = this.isHit ? "white" : this.detailColor;

    // Draw Base Ship Shape & Emitter
    // ... (ship drawing code remains the same) ...
    const emitterWidth = 15;
    const emitterHeight = 25;
    const emitterX = this.x - emitterWidth;
    const emitterY = this.y + this.height / 2 - emitterHeight / 2;
    context.fillStyle = currentDetailColor;
    context.fillRect(emitterX, emitterY, emitterWidth, emitterHeight);

    // Draw Beam Effects
    const beamDrawOriginX = this.x;
    const beamDrawOriginY = this.y + this.height / 2;

    if (this.beamState === "CHARGING") {
      // Draw charging glow
      const chargeRadius =
        ((this.beamChargeTime - this.beamTimer) / this.beamChargeTime) *
          (emitterHeight * 0.8) +
        5;
      context.fillStyle = this.chargeColor;
      context.beginPath();
      context.arc(emitterX, beamDrawOriginY, chargeRadius, 0, Math.PI * 2);
      context.fill();

      // --- >>> DRAW AIMING LASER SIGHT <<< ---
      const player = this.game.player;
      if (player && !player.markedForDeletion) {
        // Only draw if player exists
        // Calculate angle towards current player position
        const targetX = player.x + player.width / 2;
        const targetY = player.y + player.height / 2;
        const aimingAngle = Math.atan2(
          targetY - beamDrawOriginY,
          targetX - beamDrawOriginX
        );

        // Draw a thin, semi-transparent line
        context.save(); // Save for line style
        context.strokeStyle = "rgba(255, 0, 0, 0.5)"; // Faint red laser line
        context.lineWidth = 1;
        context.setLineDash([5, 5]); // Optional: Dashed line
        context.globalAlpha = 0.6 + Math.sin(Date.now() * 0.01) * 0.2; // Pulsing alpha

        context.beginPath();
        context.moveTo(beamDrawOriginX, beamDrawOriginY);
        // Calculate end point far away along the angle
        const lineLength = this.game.width * 1.5; // Ensure it goes off screen
        context.lineTo(
          beamDrawOriginX + Math.cos(aimingAngle) * lineLength,
          beamDrawOriginY + Math.sin(aimingAngle) * lineLength
        );
        context.stroke();
        context.setLineDash([]); // Reset dash
        context.globalAlpha = 1.0; // Reset alpha
        context.restore(); // Restore line style
      }
      // --- >>> END AIMING LASER SIGHT <<< ---
    } else if (this.beamState === "FIRING" && this.currentBeamLength > 0) {
      // Draw Rotated Beam (existing code)
      context.save();
      context.translate(beamDrawOriginX, beamDrawOriginY);
      context.rotate(this.beamAngle);
      context.globalAlpha = 0.5 + Math.random() * 0.2;
      context.fillStyle = this.beamColorOuter;
      context.fillRect(
        0,
        -this.beamWidth / 2,
        this.currentBeamLength,
        this.beamWidth
      );
      context.globalAlpha = 0.8 + Math.random() * 0.2;
      context.fillStyle = this.beamColorCore;
      const coreWidth = this.beamWidth * 0.5;
      context.fillRect(0, -coreWidth / 2, this.currentBeamLength, coreWidth);
      context.restore();
    }

    context.restore(); // Restore 1 (original state)

    // Draw Health Bar
    super.draw(context);
  } // End draw

  hit(damage, projectileType = "bullet") {
    super.hit(damage, projectileType);
  }
} // End EnemyBeamShip class
