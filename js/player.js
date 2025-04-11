// js/player.js
import { Bullet } from "./bullet.js";
import { Bomb } from "./bomb.js";
import { playSound } from "./audio.js";

export class Player {
  constructor(game) {
    this.game = game;
    this.width = 50;
    this.height = 30;
    this.x = 50;
    this.y = game.height / 2 - this.height / 2;
    this.speed = 5;
    this.color = "red";
    this.lives = 300; // 3 originally
    this.maxLives = 500; //5 originally

    // Shooting cooldown
    this.shootCooldown = 200; // milliseconds
    this.lastShotTime = 0;

    // Bombing cooldown
    this.bombCooldown = 1000; // milliseconds
    this.lastBombTime = 0;

    // --- Power-up state ---
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

    // Invincibility after hit
    this.invincible = false;
    this.invincibilityDuration = 1500; // 1.5 seconds
    this.invincibilityTimer = 0;
  }

  update(input, deltaTime) {
    // Ensure deltaTime is a positive number, fallback if not (shouldn't happen often now)
    const safeDeltaTime = Math.max(0.1, deltaTime); // Use minimum delta to prevent division by zero/stalling
    const deltaScale = safeDeltaTime / 16.67; // Scaling factor relative to 60fps

    // --- Movement ---
    const scaledSpeed = this.speed * deltaScale; // Scale base speed
    if (input.isKeyDown("arrowup") || input.isKeyDown("w")) this.y -= scaledSpeed;
    if (input.isKeyDown("arrowdown") || input.isKeyDown("s")) this.y += scaledSpeed;
    if (input.isKeyDown("arrowleft") || input.isKeyDown("a")) this.x -= scaledSpeed;
    if (input.isKeyDown("arrowright") || input.isKeyDown("d")) this.x += scaledSpeed;

    // --- Boundaries ---
    const bottomBoundary = this.game.height - this.height - 80;
    if (this.x < 0) this.x = 0;
    if (this.x > this.game.width - this.width) this.x = this.game.width - this.width;
    if (this.y < 0) this.y = 0;
    if (this.y > bottomBoundary) this.y = bottomBoundary;

    // --- Cooldown Timers (Increment by raw deltaTime) ---
    this.lastShotTime += safeDeltaTime;
    if (input.shouldShoot() && this.lastShotTime >= this.shootCooldown) {
      this.shoot();
      this.lastShotTime = 0;
    }
    this.lastBombTime += safeDeltaTime;
    if (input.shouldDropBomb() && this.lastBombTime >= this.bombCooldown) {
      this.dropBomb();
      this.lastBombTime = 0;
    }

    // --- Power-up Timers (Decrement by raw deltaTime) ---
    let powerUpStatusText = "";
    if (this.bulletPowerUpActive) {
      this.bulletPowerUpTimer -= safeDeltaTime;
      if (this.bulletPowerUpTimer <= 0) this.deactivateBulletPowerUp();
      else powerUpStatusText = `Bullet Power: ${Math.ceil(this.bulletPowerUpTimer / 1000)}s`;
    }
    if (this.bombPowerUpActive) {
      this.bombPowerUpTimer -= safeDeltaTime;
      if (this.bombPowerUpTimer <= 0) this.deactivateBombPowerUp();
      else powerUpStatusText = `Bomb Power: ${Math.ceil(this.bombPowerUpTimer / 1000)}s`;
    }
    if (this.spreadShotActive) {
      this.spreadShotTimer -= safeDeltaTime;
      if (this.spreadShotTimer <= 0) this.deactivateSpreadShot();
      else powerUpStatusText = `Spread Shot: ${Math.ceil(this.spreadShotTimer / 1000)}s`;
    }
    if (this.shieldActive) {
      this.shieldTimer -= safeDeltaTime;
      if (this.shieldTimer <= 0) this.deactivateShield(false);
      else powerUpStatusText = `Shield: ${Math.ceil(this.shieldTimer / 1000)}s`;
    }
    this.game.updatePowerUpStatus(powerUpStatusText);

    // --- Invincibility Timer (Decrement by raw deltaTime) ---
    if (this.invincible) {
      this.invincibilityTimer -= safeDeltaTime;
      if (this.invincibilityTimer <= 0) {
        this.invincible = false;
      }
    }
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
      context.arc(this.x + this.width / 2, this.y + this.height / 2, Math.max(this.width, this.height) * 0.8, 0, Math.PI * 2);
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
    const bulletY = this.y + this.height / 2 - (this.bulletPowerUpActive ? 3 : 2);
    const poweredUp = this.bulletPowerUpActive;

    // Base shot (angle 0)
    this.game.addProjectile(new Bullet(this.game, bulletX, bulletY, poweredUp, 0));

    // Spread Shot Logic
    if (this.spreadShotActive) {
      const angleUp = -0.2; // Radians upwards
      const angleDown = 0.2; // Radians downwards
      // Add angled bullets (make sure Bullet class handles angle in its update)
      this.game.addProjectile(new Bullet(this.game, bulletX, bulletY - 5, poweredUp, angleUp));
      this.game.addProjectile(new Bullet(this.game, bulletX, bulletY + 5, poweredUp, angleDown));
    }

    playSound("shoot");
  }

  dropBomb() {
    const bombX = this.x + this.width / 2 - (this.bombPowerUpActive ? 6 : 4);
    const bombY = this.y + this.height;
    this.game.addProjectile(new Bomb(this.game, bombX, bombY, this.bombPowerUpActive));
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

  hit() {
    if (this.shieldActive) {
      this.deactivateShield(true);
      this.game.createExplosion(this.x + this.width / 2, this.y + this.height / 2, "tiny");
      return;
    }
    if (!this.invincible) {
      this.lives--;
      playSound("hit");
      this.game.updateLivesUI();
      if (this.lives <= 0) {
        this.game.gameOver();
      } else {
        this.invincible = true;
        this.invincibilityTimer = this.invincibilityDuration;
      }
    }
  }

  reset() {
    this.x = 50;
    this.y = this.game.height / 2 - this.height / 2;
    this.lives = 300; // Reset to base lives, 3 originally
    this.bulletPowerUpActive = false;
    this.bulletPowerUpTimer = 0;
    this.bombPowerUpActive = false;
    this.bombPowerUpTimer = 0;
    this.spreadShotActive = false;
    this.spreadShotTimer = 0;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.invincible = false;
    this.invincibilityTimer = 0;
    this.lastBombTime = 0;
    this.lastShotTime = 0;
    console.log("Player state reset.");
  }
}
