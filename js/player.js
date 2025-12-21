// js/player.js
import { Bullet } from "./bullet.js";
import { Bomb } from "./bomb.js";
import { SuperBomb } from "./superBomb.js";
import { playSound } from "./audio.js";

export class Player {
  // ========================
  //      CONSTRUCTOR
  // ========================
  constructor(game) {
    this.game = game;

    // --- Sprite Dimensions (Set to your new resized sprite) ---
    this.spriteWidth = 256; // Width of the sprite frame
    this.spriteHeight = 256; // Height of the sprite frame
    // --- Scaling (Match enemy scale for consistent sizing) ---
    this.scale = 0.65;
    // --- Gameplay dimensions match sprite dimensions (scaled) ---
    this.width = this.spriteWidth * this.scale;
    this.height = this.spriteHeight * this.scale;
    // --- End Dimensions ---

    this.x = 50;
    this.y = game.height / 2 - this.height / 2;

    // --- Movement Physics ---
    this.velocityX = 0;
    this.velocityY = 0;
    this.acceleration = 0.35;
    this.maxSpeed = 6;
    this.friction = 0.92; // Example friction

    // --- >>> Load Player Idle Sprite <<< ---
    this.imageIdle = new Image();
    this.imageIdle.src = "images/JUGADOR 1.png"; // <<< YOUR RESIZED FILENAME HERE
    // --- >>> END Load Player Sprite <<< ---

    // --- Placeholder for other state images (Add later) ---
    // this.imageThrustNozzle = new Image();
    // this.imageThrustNozzle.src = 'images/mirage128_thrust.png';
    // this.imageDamage = new Image();
    // this.imageDamage.src = 'images/mirage128_damage.png';
    // this.imageNoseUp = new Image();
    // this.imageNoseUp.src = 'images/mirage128_noseup.png';
    // ---

    // --- Set initial image ---
    this.currentImage = this.imageIdle;

    // --- Animation State (Simplified for single static frame initially) ---
    this.frameX = 0; // Current frame index on the sprite sheet (horizontal)
    this.frameY = 0; // Current frame index on the sprite sheet (vertical)
    this.maxFrame = 0; // Max frame index for the *current* animation (0 for static idle)
    this.fps = 10; // Frames per second for animations (will be used later)
    this.frameTimer = 0;
    this.frameInterval = 1000 / this.fps;
    // --- End Animation State ---

    this.color = "red";
    this.initialLives = 3;
    this.lives = this.initialLives;
    this.maxLives = 5;

    // --- Ammo Limits ---
    this.initialBulletAmmo = 4500;
    this.initialBombAmmo = 600;
    this.bulletAmmo = this.initialBulletAmmo;
    this.bombAmmo = this.initialBombAmmo;
    // --- End Ammo Limits ---

    // --- Shooting Cooldown ---
    this.shootCooldown = 200;
    this.originalShootCooldown = this.shootCooldown;
    this.lastShotTime = 0;

    // --- Bombing Cooldown ---
    this.bombCooldown = 1000;
    this._lastBombTimestamp = 0; // Internal timestamp for cooldown

    // --- Power-up States & Timers ---
    this.bulletPowerUpActive = false;
    this.bulletPowerUpTimer = 0;
    this.bulletPowerUpDuration = 10000;
    this.bombPowerUpActive = false;
    this.bombPowerUpTimer = 0;
    this.bombPowerUpDuration = 15000;
    this.spreadShotActive = false;
    this.spreadShotTimer = 0;
    this.spreadShotDuration = 12000;
    this.shieldActive = false;
    this.shieldTimer = 0;
    this.shieldDuration = 8000;
    this.shieldColor = "rgba(0, 255, 255, 0.3)";
    this.rapidFireActive = false;
    this.rapidFireTimer = 0;
    this.rapidFireDuration = 8000;
    this.rapidFireMultiplier = 2.5;
    this.invincible = false;
    this.invincibilityDuration = 1500;
    this.powerUpInvincibilityDuration = 6000;
    this.invincibilityTimer = 0;
    this.superBombArmed = false;
  } // End Constructor

  // ========================
  //        UPDATE
  // ========================
  update(input, deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Movement & Boundaries ---
    // (Physics calculation remains the same)
    let accelX = 0;
    let accelY = 0;
    const scaledAcceleration = this.acceleration * deltaScale;
    if (input.isKeyDown("arrowup") || input.isKeyDown("w"))
      accelY -= scaledAcceleration;
    if (input.isKeyDown("arrowdown") || input.isKeyDown("s"))
      accelY += scaledAcceleration;
    if (input.isKeyDown("arrowleft") || input.isKeyDown("a"))
      accelX -= scaledAcceleration;
    if (input.isKeyDown("arrowright") || input.isKeyDown("d"))
      accelX += scaledAcceleration;
    this.velocityX += accelX;
    this.velocityY += accelY;
    const frictionPower = Math.pow(this.friction, deltaScale);
    if (accelX === 0) {
      this.velocityX *= frictionPower;
      if (Math.abs(this.velocityX) < 0.1) this.velocityX = 0;
    }
    if (accelY === 0) {
      this.velocityY *= frictionPower;
      if (Math.abs(this.velocityY) < 0.1) this.velocityY = 0;
    }
    this.velocityX = Math.max(
      -this.maxSpeed,
      Math.min(this.maxSpeed, this.velocityX)
    );
    this.velocityY = Math.max(
      -this.maxSpeed,
      Math.min(this.maxSpeed, this.velocityY)
    );
    this.x += this.velocityX * deltaScale;
    this.y += this.velocityY * deltaScale;
    const bottomBoundary = this.game.height - this.height;
    this.x = Math.max(0, Math.min(this.game.width - this.width, this.x));
    this.y = Math.max(0, Math.min(bottomBoundary, this.y));

    // --- Shooting Input Check ---
    this.lastShotTime += safeDeltaTime;
    const currentShootCooldown = this.rapidFireActive
      ? this.originalShootCooldown / this.rapidFireMultiplier
      : this.originalShootCooldown;
    if (input.shouldShoot() && this.lastShotTime >= currentShootCooldown) {
      this.shoot(); // Ammo check happens inside shoot()
    }

    // --- Bombing Input Check ---
    if (input.shouldDropBomb()) {
      this.dropBomb(); // Ammo/cooldown check happens inside dropBomb()
    }

    // --- Power-up Timers & Status Display ---
    // (This section remains unchanged - displays timed powerups and super bomb status)
    let powerUpStatusText = "";
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
      else
        powerUpStatusText = `Rapid Fire: ${Math.ceil(
          this.rapidFireTimer / 1000
        )}s`;
    }
    if (this.invincible) {
      this.invincibilityTimer -= safeDeltaTime;
      if (this.invincibilityTimer <= 0) {
        this.invincible = false;
      } else {
        if (!powerUpStatusText && !this.shieldActive) {
          powerUpStatusText = `Invincible: ${Math.ceil(
            this.invincibilityTimer / 1000
          )}s`;
        }
      }
    }
    if (
      this.superBombArmed &&
      !powerUpStatusText &&
      !this.shieldActive &&
      !this.invincible
    ) {
      powerUpStatusText = "Super Bomb Ready (B)";
    }
    this.game.updatePowerUpStatus(powerUpStatusText);

    // --- Animation Logic (Simplified for now) ---
    // TODO: Select correct image based on state (thrust, damage, nose-up) later
    this.currentImage = this.imageIdle;

    // TODO: Handle frame cycling for animations later (idle bob, damage flash)
    // For now, just ensure static images use frame 0
    this.frameX = 0;
    this.maxFrame = 0; // Static image has only one frame (index 0)
    // Frame timer logic (not really needed for static image, but keep for future)
    // this.frameTimer += safeDeltaTime;
    // if (this.frameTimer > this.frameInterval) {
    //     this.frameTimer = 0;
    //     if (this.maxFrame > 0) { // Only advance if maxFrame > 0
    //          if (this.frameX < this.maxFrame) this.frameX++;
    //          else this.frameX = 0;
    //     }
    // }
    // --- End Animation Logic ---

    // Ammo UI update handled by Game loop
  } // End of Player update

  // ========================
  //         DRAW
  // ========================
  draw(context) {
    // if (!context) return;
    // context.save();
    // if (this.shieldActive) {
    //   /* draw shield */ context.fillStyle = this.shieldColor;
    //   context.beginPath();
    //   context.arc(
    //     this.x + this.width / 2,
    //     this.y + this.height / 2,
    //     Math.max(this.width, this.height) * 0.8,
    //     0,
    //     Math.PI * 2
    //   );
    //   context.fill();
    // }
    // if (this.invincible && !this.shieldActive) {
    //   context.globalAlpha = Math.floor(Date.now() / 100) % 2 === 0 ? 0.5 : 1.0;
    // }
    // // Draw Player Shape
    // context.fillStyle = this.color;
    // context.beginPath();
    // context.moveTo(this.x + this.width * 0.1, this.y + this.height * 0.2);
    // context.lineTo(this.x + this.width * 0.5, this.y);
    // context.lineTo(this.x + this.width * 0.9, this.y + this.height * 0.2);
    // context.lineTo(this.x + this.width, this.y + this.height * 0.5);
    // context.lineTo(this.x + this.width * 0.8, this.y + this.height);
    // context.lineTo(this.x + this.width * 0.2, this.y + this.height);
    // context.lineTo(this.x, this.y + this.height * 0.5);
    // context.closePath();
    // context.fill();
    // context.restore();

    if (!context) {
      console.error("Player.draw context missing!");
      return;
    }
    context.save();

    // Draw Shield Visual (Keep as is)
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

    // --- Draw Player Sprite ---
    // (Invincibility blink can be added later by modifying image or alpha here)
    if (this.invincible && !this.shieldActive) {
      // Example Blink: Draw normally sometimes, skip draw others
      if (Math.floor(Date.now() / 100) % 2 === 0) {
        // Don't draw - creates flicker (or draw damage frame)
      } else {
        this.drawSprite(context); // Draw normally
      }
    } else {
      this.drawSprite(context); // Draw normally if not invincible/blinking
    }

    context.restore();
  } // End draw

  // --- Helper method to draw the current sprite frame ---
  drawSprite(context) {
    if (
      this.currentImage &&
      this.currentImage.complete &&
      this.currentImage.naturalWidth > 0
    ) {
      context.drawImage(
        this.currentImage,
        this.frameX * this.spriteWidth, // Source X
        this.frameY * this.spriteHeight, // Source Y
        this.spriteWidth, // Source Width
        this.spriteHeight, // Source Height
        this.x, // Destination X
        this.y, // Destination Y
        this.width, // Destination Width (scaled)
        this.height // Destination Height (scaled)
      );
    } else {
      // Fallback rectangle
      context.fillStyle = "purple"; // Different color for fallback
      context.fillRect(this.x, this.y, this.width, this.height);
    }
  }

  // --- Modified Shoot Method (Checks & Decrements Ammo) ---
  shoot() {
    if (this.bulletAmmo <= 0) {
      // playSound('ammoEmpty');
      return; // Out of ammo
    }

    const bulletX = this.x + this.width;
    const bulletY =
      this.y + this.height / 2 - (this.bulletPowerUpActive ? 3 : 2);
    const poweredUp = this.bulletPowerUpActive;
    let bulletsFiredThisShot = 0;

    // Base shot
    if (this.bulletAmmo > 0) {
      this.game.addProjectile(
        new Bullet(this.game, bulletX, bulletY, poweredUp, 0)
      );
      this.bulletAmmo--;
      bulletsFiredThisShot++;
      // REMOVED: this.game.debug_totalBulletsFired++;
    }

    // Spread Shot
    if (this.spreadShotActive) {
      const angleUp = -0.2;
      const angleDown = 0.2;
      if (this.bulletAmmo > 0) {
        this.game.addProjectile(
          new Bullet(this.game, bulletX, bulletY - 5, poweredUp, angleUp)
        );
        this.bulletAmmo--;
        bulletsFiredThisShot++;
        // REMOVED: this.game.debug_totalBulletsFired++;
      }
      if (this.bulletAmmo > 0) {
        this.game.addProjectile(
          new Bullet(this.game, bulletX, bulletY + 5, poweredUp, angleDown)
        );
        this.bulletAmmo--;
        bulletsFiredThisShot++;
        // REMOVED: this.game.debug_totalBulletsFired++;
      }
    }

    if (bulletsFiredThisShot > 0) {
      playSound("shoot");
      this.lastShotTime = 0; // Reset cooldown timer
    }
  } // End shoot

  // --- Modified dropBomb Method (Checks & Decrements Ammo) ---
  dropBomb() {
    // Super Bomb (no ammo cost)
    if (this.superBombArmed) {
      this.superBombArmed = false;
      this.game.addProjectile(
        new SuperBomb(
          this.game,
          this.x + this.width / 2 - 7,
          this.y + this.height
        )
      );
      playSound("bomb");
      this.game.updatePowerUpStatus("");
      // REMOVED: this.game.debug_totalBombsDropped++;
      return;
    }

    // Regular Bomb
    const currentTime = performance.now ? performance.now() : Date.now();
    const timeSinceLastBomb = currentTime - this._lastBombTimestamp;
    if (timeSinceLastBomb < this.bombCooldown) return; // Cooldown check
    if (this.bombAmmo <= 0) return; // Ammo check

    // Drop Regular Bomb
    const bombX = this.x + this.width / 2 - (this.bombPowerUpActive ? 6 : 4);
    const bombY = this.y + this.height;
    this.game.addProjectile(
      new Bomb(this.game, bombX, bombY, this.bombPowerUpActive)
    );
    playSound("bomb");
    this._lastBombTimestamp = currentTime;
    this.bombAmmo--; // Decrement ammo
    // REMOVED: this.game.debug_totalBombsDropped++;
  } // End dropBomb

  // --- NEW Power-up Activation Method ---
  activateSuperBombPickup() {
    this.superBombArmed = true;
    // Update UI immediately if possible
    if (
      this.game.powerupStatusElement &&
      !this.game.powerupStatusElement.textContent
    ) {
      this.game.updatePowerUpStatus("Super Bomb Ready (B)");
    }
    // playSound('superBombArmed');
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
    this.rapidFireActive = true;
    this.rapidFireTimer = this.rapidFireDuration;
  }
  deactivateRapidFire() {
    if (this.rapidFireActive) {
    }
    this.rapidFireActive = false;
  }
  activateInvincibilityPowerUp() {
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

  // --- Reset Method ---
  reset() {
    this.x = 50;
    this.y = this.game.height / 2 - this.height / 2;
    this.lives = this.initialLives;
    this.velocityX = 0;
    this.velocityY = 0; // Reset Physics

    // Reset Ammo
    this.bulletAmmo = this.initialBulletAmmo;
    this.bombAmmo = this.initialBombAmmo;

    // Reset power-ups
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
    this.superBombArmed = false;

    // Reset cooldown timers
    this.lastShotTime = 0;
    this._lastBombTimestamp = 0;

    console.log(
      `Player state reset. Lives: ${this.lives}, Bullets: ${this.bulletAmmo}, Bombs: ${this.bombAmmo}`
    );
    // UI update called by game.initializeLevel -> game.updateUI
  }

  // --- Add Ammo Methods (Keep these) ---
  addBulletAmmo(amount) {
    this.bulletAmmo += amount;
    console.log(`Added ${amount} bullet ammo. Total: ${this.bulletAmmo}`);
  }
  addBombAmmo(amount) {
    this.bombAmmo += amount;
    console.log(`Added ${amount} bomb ammo. Total: ${this.bombAmmo}`);
  }
  // --- End add ammo methods ---
}
