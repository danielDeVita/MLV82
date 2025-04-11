// js/player.js
import { Bullet } from "./bullet.js";
import { Bomb } from "./bomb.js";
import { playSound } from "./audio.js";

export class Player {
  // ========================
  //      CONSTRUCTOR
  // ========================
  constructor(game) {
    this.game = game;
    this.width = 50;
    this.height = 30;
    this.x = 50;
    this.y = game.height / 2 - this.height / 2;
    this.speed = 5;
    this.color = "red";
    this.initialLives = 3; // Starting lives for testing (change back to 3 for release)
    this.lives = this.initialLives;
    this.maxLives = 5; // Max lives (adjust if needed)

    // --- Shooting Cooldown ---
    this.shootCooldown = 200; // Base cooldown in milliseconds
    this.originalShootCooldown = this.shootCooldown; // Store the base value for rapid fire
    this.lastShotTime = 0; // Time since last shot

    // --- Bombing Cooldown ---
    this.bombCooldown = 1000; // milliseconds
    this.lastBombTime = 0; // Time since last bomb

    // --- Power-up States & Timers ---
    this.bulletPowerUpActive = false;
    this.bulletPowerUpTimer = 0;
    this.bulletPowerUpDuration = 10000; // 10 seconds

    this.bombPowerUpActive = false;
    this.bombPowerUpTimer = 0;
    this.bombPowerUpDuration = 15000; // 15 seconds

    this.spreadShotActive = false;
    this.spreadShotTimer = 0;
    this.spreadShotDuration = 12000; // 12 seconds

    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldDuration = 8000; // 8 seconds
    this.shieldColor = "rgba(0, 255, 255, 0.3)";

    this.rapidFireActive = false;
    this.rapidFireTimer = 0;
    this.rapidFireDuration = 8000; // 8 seconds duration
    this.rapidFireMultiplier = 2.5; // Fire 2.5x faster

    // --- Invincibility (Post-hit and Power-up) ---
    this.invincible = false;
    this.invincibilityDuration = 1500; // Post-hit duration (1.5s)
    this.powerUpInvincibilityDuration = 6000; // Power-up duration (6s)
    this.invincibilityTimer = 0; // Time remaining for current invincibility
  } // End Constructor

  // ========================
  //        UPDATE
  // ========================
  update(input, deltaTime) {
    // Ensure deltaTime is valid
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67; // Scale factor for 60fps baseline

    // --- Movement ---
    const scaledSpeed = this.speed * deltaScale;
    if (input.isKeyDown("arrowup") || input.isKeyDown("w"))
      this.y -= scaledSpeed;
    if (input.isKeyDown("arrowdown") || input.isKeyDown("s"))
      this.y += scaledSpeed;
    if (input.isKeyDown("arrowleft") || input.isKeyDown("a"))
      this.x -= scaledSpeed;
    if (input.isKeyDown("arrowright") || input.isKeyDown("d"))
      this.x += scaledSpeed;

    // --- Boundaries ---
    const bottomBoundary = this.game.height - this.height - 80; // Max Y position
    this.x = Math.max(0, Math.min(this.game.width - this.width, this.x)); // Clamp X
    this.y = Math.max(0, Math.min(bottomBoundary, this.y)); // Clamp Y

    // --- Shooting Logic ---
    this.lastShotTime += safeDeltaTime; // Increment time since last shot
    const currentShootCooldown = this.rapidFireActive
      ? this.originalShootCooldown / this.rapidFireMultiplier // Use faster cooldown if active
      : this.originalShootCooldown; // Use normal cooldown
    // Check if player wants to shoot AND cooldown is ready
    if (input.shouldShoot() && this.lastShotTime >= currentShootCooldown) {
      this.shoot(); // Call the shoot method
      this.lastShotTime = 0; // Reset the timer
    }

    // --- Bombing Logic ---
    this.lastBombTime += safeDeltaTime; // Increment time since last bomb
    // Check if player wants to bomb AND cooldown is ready
    if (input.shouldDropBomb() && this.lastBombTime >= this.bombCooldown) {
      this.dropBomb(); // Call the dropBomb method
      this.lastBombTime = 0; // Reset the timer
    }

    // --- Power-up Timers & Status Display ---
    let powerUpStatusText = ""; // Holds the text to display (only shows one at a time)

    if (this.bulletPowerUpActive) {
      this.bulletPowerUpTimer -= safeDeltaTime;
      if (this.bulletPowerUpTimer <= 0) this.deactivateBulletPowerUp();
      else
        powerUpStatusText = `Bullet Power: ${Math.ceil(
          this.bulletPowerUpTimer / 1000
        )}s`;
    }
    if (this.bombPowerUpActive) {
      this.bombPowerUpTimer -= safeDeltaTime;
      if (this.bombPowerUpTimer <= 0) this.deactivateBombPowerUp();
      // Show only if no higher priority status is active
      else if (!powerUpStatusText)
        powerUpStatusText = `Bomb Power: ${Math.ceil(
          this.bombPowerUpTimer / 1000
        )}s`;
    }
    if (this.spreadShotActive) {
      this.spreadShotTimer -= safeDeltaTime;
      if (this.spreadShotTimer <= 0) this.deactivateSpreadShot();
      else if (!powerUpStatusText)
        powerUpStatusText = `Spread Shot: ${Math.ceil(
          this.spreadShotTimer / 1000
        )}s`;
    }
    if (this.shieldActive) {
      this.shieldTimer -= safeDeltaTime;
      if (this.shieldTimer <= 0) this.deactivateShield(false);
      else if (!powerUpStatusText)
        powerUpStatusText = `Shield: ${Math.ceil(this.shieldTimer / 1000)}s`;
    }
    if (this.rapidFireActive) {
      this.rapidFireTimer -= safeDeltaTime;
      if (this.rapidFireTimer <= 0) this.deactivateRapidFire();
      // Rapid fire overrides previous displays if active
      else
        powerUpStatusText = `Rapid Fire: ${Math.ceil(
          this.rapidFireTimer / 1000
        )}s`;
    }

    // --- Invincibility Timer (Handles both post-hit and power-up) ---
    if (this.invincible) {
      this.invincibilityTimer -= safeDeltaTime;
      if (this.invincibilityTimer <= 0) {
        this.invincible = false;
        // console.log("Invincibility ended."); // Optional log
      } else {
        // Show invincibility status only if shield/rapid fire/etc. aren't active
        if (!powerUpStatusText && !this.shieldActive) {
          powerUpStatusText = `Invincible: ${Math.ceil(
            this.invincibilityTimer / 1000
          )}s`;
        }
      }
    }
    // Update the UI element with the determined status text
    this.game.updatePowerUpStatus(powerUpStatusText);
  } // End of Player update

  draw(context) {
    // --- ADD SAFETY CHECK ---
    if (!context) {
      console.error("Player.draw received undefined context!");
      return; // Don't try to draw
    }
    context.save();

    // Draw Shield Visual
    if (this.shieldActive) {
      context.fillStyle = this.shieldColor;
      context.beginPath();
      context.arc(
        this.x + this.width / 2,
        this.y + this.height / 2,
        Math.max(this.width, this.height) * 0.8,
        0,
        Math.PI * 2
      );
      context.fill();
    }

    // Invincibility Blink
    if (this.invincible && !this.shieldActive) {
      context.globalAlpha = Math.floor(Date.now() / 100) % 2 === 0 ? 0.5 : 1.0;
    }

    // Draw Player Shape
    context.fillStyle = this.color;
    context.beginPath();
    context.moveTo(this.x + this.width * 0.1, this.y + this.height * 0.2);
    context.lineTo(this.x + this.width * 0.5, this.y);
    context.lineTo(this.x + this.width * 0.9, this.y + this.height * 0.2);
    context.lineTo(this.x + this.width, this.y + this.height * 0.5);
    context.lineTo(this.x + this.width * 0.8, this.y + this.height);
    context.lineTo(this.x + this.width * 0.2, this.y + this.height);
    context.lineTo(this.x, this.y + this.height * 0.5);
    context.closePath();
    context.fill();

    context.restore();
  }

  shoot() {
    const bulletX = this.x + this.width;
    const bulletY =
      this.y + this.height / 2 - (this.bulletPowerUpActive ? 3 : 2);
    const poweredUp = this.bulletPowerUpActive;

    // Base shot (angle 0)
    this.game.addProjectile(
      new Bullet(this.game, bulletX, bulletY, poweredUp, 0)
    );

    // Spread Shot Logic
    if (this.spreadShotActive) {
      const angleUp = -0.2; // Radians upwards
      const angleDown = 0.2; // Radians downwards
      // Add angled bullets (make sure Bullet class handles angle in its update)
      this.game.addProjectile(
        new Bullet(this.game, bulletX, bulletY - 5, poweredUp, angleUp)
      );
      this.game.addProjectile(
        new Bullet(this.game, bulletX, bulletY + 5, poweredUp, angleDown)
      );
    }

    playSound("shoot");
  }

  dropBomb() {
    const bombX = this.x + this.width / 2 - (this.bombPowerUpActive ? 6 : 4);
    const bombY = this.y + this.height;
    this.game.addProjectile(
      new Bomb(this.game, bombX, bombY, this.bombPowerUpActive)
    );
    playSound("bomb");
  }

  // --- Power-up Activation/Deactivation ---
  activateBulletPowerUp() {
    this.bulletPowerUpActive = true;
    this.bulletPowerUpTimer = this.bulletPowerUpDuration;
  }
  deactivateBulletPowerUp() {
    if (this.bulletPowerUpActive) playSound("powerupExpire");
    this.bulletPowerUpActive = false;
  }
  activateBombPowerUp() {
    this.bombPowerUpActive = true;
    this.bombPowerUpTimer = this.bombPowerUpDuration;
  }
  deactivateBombPowerUp() {
    if (this.bombPowerUpActive) playSound("powerupExpire");
    this.bombPowerUpActive = false;
  }
  activateSpreadShot() {
    this.spreadShotActive = true;
    this.spreadShotTimer = this.spreadShotDuration;
  }
  deactivateSpreadShot() {
    if (this.spreadShotActive) playSound("powerupExpire");
    this.spreadShotActive = false;
  }
  activateShield() {
    if (!this.shieldActive) playSound("shieldUp"); // Play sound only when activating
    this.shieldActive = true;
    this.shieldTimer = this.shieldDuration;
    this.invincible = false;
    this.invincibilityTimer = 0;
  }
  deactivateShield(broken = false) {
    if (this.shieldActive) {
      this.shieldActive = false;
      if (broken) {
        playSound("shieldDown");
      } else {
        playSound("powerupExpire");
      }
    }
  }
  gainLife() {
    if (this.lives < this.maxLives) {
      this.lives++;
      this.game.updateLivesUI();
      playSound("extraLife");
    }
  }

  activateRapidFire() {
    console.log("Rapid Fire Activated!");
    this.rapidFireActive = true;
    this.rapidFireTimer = this.rapidFireDuration;
  }
  deactivateRapidFire() {
    if (this.rapidFireActive) {
      console.log("Rapid Fire Deactivated.");
    }
    this.rapidFireActive = false;
  }
  activateInvincibilityPowerUp() {
    console.log("Invincibility Power-up Activated!");
    this.invincible = true;
    this.invincibilityTimer = Math.max(
      this.invincibilityTimer,
      this.powerUpInvincibilityDuration
    );
    playSound("shieldUp");
  }

  hit() {
    if (this.shieldActive) {
      this.deactivateShield(true);
      this.game.createExplosion(
        this.x + this.width / 2,
        this.y + this.height / 2,
        "tiny"
      );
      return;
    }
    if (!this.invincible) {
      this.lives--;
      playSound("hit");
      this.game.updateLivesUI();
      if (this.lives <= 0) {
        this.game.gameOver();
      } else {
        // Grant post-hit invincibility
        this.invincible = true;
        // Use the longer of remaining timer or post-hit duration
        this.invincibilityTimer = Math.max(
          this.invincibilityTimer,
          this.invincibilityDuration
        );
      }
    }
  }

  reset() {
    this.x = 50;
    this.y = this.game.height / 2 - this.height / 2;
    this.lives = this.initialLives;
    this.bulletPowerUpActive = false;
    this.bulletPowerUpTimer = 0;
    this.bombPowerUpActive = false;
    this.bombPowerUpTimer = 0;
    this.spreadShotActive = false;
    this.spreadShotTimer = 0;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.rapidFireActive = false;
    this.rapidFireTimer = 0;
    this.invincible = false;
    this.invincibilityTimer = 0;
    this.lastBombTime = 0;
    this.lastShotTime = 0;
    console.log(`Player state reset. Lives set to: ${this.lives}`);
    this.game.updateLivesUI();
    this.game.updatePowerUpStatus("");
  }
}
