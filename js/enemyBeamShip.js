// js/enemyBeamShip.js
import { EnemyShip } from "./enemyShip.js";
import { playSound } from "./audio.js";
import { checkCollision } from "./utils.js"; // For beam collision check

export class EnemyBeamShip extends EnemyShip {
  constructor(game, speedBoost = 0) {
    super(game, speedBoost); // Call base EnemyShip constructor

    this.id = `enemy_beamship_${Math.random().toString(36).substring(2, 9)}`;
    this.health = 10; // Tougher than basic shooter ship?
    this.maxHealth = this.health;
    this.scoreValue = 180;
    this.color = "#483D8B"; // DarkSlateBlue
    this.deckColor = "#778899"; // LightSlateGray
    this.detailColor = "#FF00FF"; // Magenta for beam emitter?

    // --- Beam Attack State ---
    this.beamState = "COOLDOWN"; // States: COOLDOWN, CHARGING, FIRING
    this.beamChargeTime = 1500; // ms to charge
    this.beamFireTime = 2000; // ms the beam stays active
    this.beamCooldownTime = 5000 + Math.random() * 2000; // Time between beam attacks

    this.beamTimer =
      this.beamCooldownTime / 2 + Math.random() * (this.beamCooldownTime / 2); // Start with random cooldown remaining

    // --- Beam Visual Properties ---
    this.beamWidth = 15; // Pixel width of the beam
    this.beamColorOuter = "rgba(255, 0, 255, 0.3)"; // Magenta translucent outer glow
    this.beamColorCore = "rgba(255, 150, 255, 0.8)"; // Brighter magenta core
    this.chargeColor = "rgba(255, 0, 255, 0.7)"; // Charging effect color

    // Beam collision properties (calculated during firing)
    this.beamRect = { x: 0, y: 0, width: 0, height: this.beamWidth };

    // Make it stop while charging/firing
    this.originalSpeedX = this.speedX;
    this.stopMovement = false;

    console.log(`${this.id} created.`);
  }

  update(deltaTime) {
    // --- Call parent update conditionally based on state ---
    if (!this.stopMovement) {
      super.update(deltaTime); // Handle movement, boundaries, standard hit flash
    } else {
      // If stopped, still handle basic updates like hit flash timer
      if (this.isHit) {
        const safeDeltaTime = Math.max(0.1, deltaTime);
        this.hitTimer -= safeDeltaTime;
        if (this.hitTimer <= 0) this.isHit = false;
      }
    }

    // Don't update beam logic if marked for deletion
    if (this.markedForDeletion) return;

    const safeDeltaTime = Math.max(0.1, deltaTime);

    // --- Beam State Machine ---
    this.beamTimer -= safeDeltaTime;

    if (this.beamState === "COOLDOWN") {
      this.stopMovement = false; // Ensure movement resumes
      if (this.beamTimer <= 0) {
        this.beamState = "CHARGING";
        this.beamTimer = this.beamChargeTime; // Set charge duration
        this.stopMovement = true; // Stop moving to charge
        playSound("charge_up"); // Need a charging sound
        console.log(`${this.id} charging beam...`);
      }
    } else if (this.beamState === "CHARGING") {
      this.stopMovement = true; // Ensure stopped
      if (this.beamTimer <= 0) {
        this.beamState = "FIRING";
        this.beamTimer = this.beamFireTime; // Set fire duration
        this.stopMovement = true; // Remain stopped while firing
        playSound("laser_beam"); // Need a continuous beam sound (or start/stop sounds)
        console.log(`${this.id} firing beam!`);
      }
    } else if (this.beamState === "FIRING") {
      this.stopMovement = true; // Ensure stopped
      // --- Beam Collision Check ---
      this.updateBeamRect(); // Calculate beam position/size
      const player = this.game.player;
      if (
        player &&
        !player.shieldActive &&
        !player.invincible &&
        checkCollision(player, this.beamRect)
      ) {
        console.log(`Player hit by beam from ${this.id}!`);
        player.hit(); // Damage player - potentially apply damage over time later?
        // Note: Beam persists even after hitting
      }
      // --- End Collision Check ---

      if (this.beamTimer <= 0) {
        this.beamState = "COOLDOWN";
        this.beamTimer = this.beamCooldownTime + Math.random() * 1000 - 500; // Set cooldown duration with variance
        this.stopMovement = false; // Resume movement
        console.log(`${this.id} beam cooldown.`);
        // playSound('laser_end'); // Optional beam end sound
      }
    }
  } // End update

  // Helper to calculate the beam's collision rectangle
  updateBeamRect() {
    // Beam originates from the front-center of the ship
    this.beamRect.x = this.x - this.game.width; // Start way off-screen left (acts as length)
    this.beamRect.y = this.y + this.height / 2 - this.beamWidth / 2; // Center vertically
    this.beamRect.width = this.game.width; // Make it span towards the front of the ship
    // height is set in constructor (this.beamWidth)
  }

  draw(context) {
    // Don't draw if marked for deletion
    if (this.markedForDeletion) return;

    context.save(); // Save context state

    // Use colors defined in this class, adjusted for hit state
    const currentHullColor = this.isHit ? "white" : this.color;
    const currentDeckColor = this.isHit ? "white" : this.deckColor;
    const currentDetailColor = this.isHit ? "white" : this.detailColor;

    // --- Draw Base Ship Shape (Copied from EnemyShip draw, customize as needed) ---
    context.fillStyle = currentHullColor;
    context.fillRect(
      this.x,
      this.y + this.height * 0.3,
      this.width,
      this.height * 0.7
    );
    context.fillStyle = currentDeckColor;
    context.fillRect(
      this.x + this.width * 0.2,
      this.y,
      this.width * 0.6,
      this.height * 0.4
    );
    // --- Draw Beam Emitter Detail ---
    context.fillStyle = currentDetailColor;
    const emitterWidth = 15;
    const emitterHeight = 25;
    const emitterX = this.x - emitterWidth; // Position at front
    const emitterY = this.y + this.height / 2 - emitterHeight / 2; // Center vertically
    context.fillRect(emitterX, emitterY, emitterWidth, emitterHeight);

    // --- Draw Beam Effects ---
    const beamStartY = this.y + this.height / 2; // Beam vertical center

    if (this.beamState === "CHARGING") {
      // Draw charging glow
      const chargeRadius =
        ((this.beamChargeTime - this.beamTimer) / this.beamChargeTime) *
          (emitterHeight * 0.8) +
        5; // Grows as it charges
      context.fillStyle = this.chargeColor;
      context.beginPath();
      context.arc(emitterX, beamStartY, chargeRadius, 0, Math.PI * 2);
      context.fill();
    } else if (this.beamState === "FIRING") {
      // Draw the beam (simple rectangle)
      const beamX = emitterX - this.game.width; // Start far left
      const beamDrawWidth = this.game.width; // Extend to emitter

      // Outer Glow
      context.globalAlpha = 0.5 + Math.random() * 0.2; // Flicker alpha
      context.fillStyle = this.beamColorOuter;
      context.fillRect(
        beamX,
        beamStartY - this.beamWidth / 2,
        beamDrawWidth,
        this.beamWidth
      );

      // Inner Core
      context.globalAlpha = 0.8 + Math.random() * 0.2; // Flicker alpha
      context.fillStyle = this.beamColorCore;
      const coreWidth = this.beamWidth * 0.5;
      context.fillRect(
        beamX,
        beamStartY - coreWidth / 2,
        beamDrawWidth,
        coreWidth
      );

      context.globalAlpha = 1.0; // Reset alpha
    }

    context.restore(); // Restore original context state

    // --- Call Base Draw Method (for health bar) ---
    super.draw(context); // Draws health bar via EnemyShip -> Enemy
  }
} // End EnemyBeamShip class
