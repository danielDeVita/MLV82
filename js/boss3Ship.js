// js/boss3Ship.js
import { EnemyShip } from "./enemyShip.js";
import { EnemyBullet } from "./enemyBullet.js"; // For AA and main cannon
import { Bomb } from "./bomb.js"; // For hit checks AND reused for depth charges
import { SuperBomb } from "./superBomb.js"; // For hit checks
import { playSound } from "./audio.js";
import { checkCollision } from "./utils.js"; // May not be needed directly in this file anymore
import { randomInt } from "./utils.js";

export class Boss3Ship extends EnemyShip {
  constructor(game, speedBoost = 0) {
    super(game, speedBoost); // Call base EnemyShip constructor

    this.id = "boss_3_ship_component_v3"; // Update version
    this.enemyType = "ship"; // Important for effects/collisions

    // --- Stats ---
    this.width = 350;
    this.height = 120;
    // --- >>> INCREASE HEALTH DRAMATICALLY <<< ---
    this.maxHealth = 2000; // Example: Was 850, try much higher
    this.health = this.maxHealth;
    // --- >>> END INCREASE <<< ---
    this.scoreValue = 3000; // Score split between components

    // Appearance
    this.color = "#2F4F4F";
    this.deckColor = "#696969";
    this.detailColor = "#FF4500";

    // --- Movement ---
    this.speedX = 0.4;
    this.targetY = this.game.height - this.height - 50; // Position low
    this.y = this.targetY;
    this.x = this.game.width + this.width; // Start off-screen right
    this.entryTargetX = this.game.width - this.width - 100; // Target X position on screen
    this.isEntering = true;
    this.moveDirectionX = -1; // Initialize for patrol after entry

    // --- Attack Timers <<< ---
    // Main Cannon (Aimed)
    this.mainCannonTimer = randomInt(3000, 5000);
    this.mainCannonInterval = 4000; // Faster cannon

    // AA Guns (Upward Burst)
    this.aaGunTimer = randomInt(1000, 2500);
    this.aaGunInterval = 1600; // Faster AA

    // Depth Charge Attack Timer
    this.depthChargeTimer = randomInt(7000, 10000); // Starts later
    this.depthChargeInterval = 8500; // Cooldown for barrage
    this.depthChargeCount = 4; // How many charges per barrage
    this.depthChargeDelay = 200; // Delay between each charge drop
    // --- >>> END Attack Timers <<< ---

    console.log(`${this.id} created. Health: ${this.health}`);
  }

  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Entry Logic ---
    if (this.isEntering) {
      this.x -= this.speedX * 2 * deltaScale; // Move left to enter
      if (this.x <= this.entryTargetX) {
        this.x = this.entryTargetX; // Snap
        this.isEntering = false;
        this.moveDirectionX = -1; // Start patrolling LEFT after entry
        console.log(`${this.id} entry complete.`);
      }
      // Update hit flash timer even during entry
      if (this.isHit) {
        this.hitTimer -= safeDeltaTime;
        if (this.hitTimer <= 0) {
          this.isHit = false;
        }
      }
      return; // No attacks or patrol during entry
    }
    // --- End Entry Logic ---

    // --- Normal Update (Patrol Movement + Attacks) ---

    // Horizontal Patrol Movement
    this.x += this.speedX * this.moveDirectionX * deltaScale;
    const shipMinX = 50;
    const shipMaxX = this.game.width - this.width - 50;
    if (this.x <= shipMinX && this.moveDirectionX === -1) {
      this.x = shipMinX;
      this.moveDirectionX = 1;
    } else if (this.x >= shipMaxX && this.moveDirectionX === 1) {
      this.x = shipMaxX;
      this.moveDirectionX = -1;
    }

    // Fixed Y position (no vertical movement logic from super needed)
    this.y = this.targetY;

    // --- Attack Logic ---
    // Main Cannon
    this.mainCannonTimer -= safeDeltaTime;
    if (this.mainCannonTimer <= 0) {
      this.fireMainCannon();
      this.mainCannonTimer =
        this.mainCannonInterval + Math.random() * 1000 - 500;
    }
    // AA Guns
    this.aaGunTimer -= safeDeltaTime;
    if (this.aaGunTimer <= 0) {
      this.fireAAGuns();
      this.aaGunTimer = this.aaGunInterval + Math.random() * 600 - 300;
    }
    // Depth Charge Attack
    this.depthChargeTimer -= safeDeltaTime;
    if (this.depthChargeTimer <= 0) {
      this.fireDepthCharges();
      this.depthChargeTimer =
        this.depthChargeInterval + Math.random() * 2000 - 1000;
    }
    // --- End Attack Logic ---

    // --- Hit Flash Update ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  } // End update

  // --- Attack Methods ---
  fireMainCannon() {
    console.log(`${this.id} firing main cannon`);
    playSound("explosion");
    const player = this.game.player;
    if (!player || player.markedForDeletion) return;

    const shellOriginX = this.x + this.width * 0.5;
    const shellOriginY = this.y + 10;
    const shellSpeed = 4.0;
    const shellSize = 16;
    const angle = Math.atan2(
      player.y + player.height / 2 - shellOriginY,
      player.x + player.width / 2 - shellOriginX
    );
    // Add small random variance to angle
    const angleVariance = (Math.random() - 0.5) * 0.05; // +/- 0.025 radians approx
    const finalAngle = angle + angleVariance;

    const speedX = Math.cos(finalAngle) * shellSpeed;
    const speedY = Math.sin(finalAngle) * shellSpeed;
    const shell = new EnemyBullet(
      this.game,
      shellOriginX - shellSize / 2,
      shellOriginY - shellSize / 2,
      speedX,
      speedY
    );
    shell.width = shellSize;
    shell.height = shellSize;
    shell.color = this.detailColor;
    this.game.addEnemyProjectile(shell);
  }

  fireAAGuns() {
    playSound("enemyShoot");
    const bulletSpeedY = -7;
    const bulletSize = 6;
    const numGuns = 6; // Increased count
    const spread = this.width * 0.4;
    for (let i = 0; i < numGuns; i++) {
      const offsetX = (i / (numGuns - 1) - 0.5) * 2 * spread;
      const launchX = this.x + this.width / 2 + offsetX - bulletSize / 2;
      const launchY = this.y + 20;
      // Add tiny horizontal variance?
      const speedXVariance = (Math.random() - 0.5) * 0.5;
      const bullet = new EnemyBullet(
        this.game,
        launchX,
        launchY,
        speedXVariance,
        bulletSpeedY
      );
      bullet.width = bulletSize;
      bullet.height = bulletSize + 4;
      bullet.color = "#FFFF00";
      this.game.addEnemyProjectile(bullet);
    }
  }

  fireDepthCharges() {
    console.log(`${this.id} firing depth charge barrage!`);
    playSound("bomb_drop");

    const dropXStart = this.x + this.width * 0.2;
    const dropXEnd = this.x + this.width * 0.8;
    const dropY = this.y + this.height - 10;
    const chargeSize = 10;

    for (let i = 0; i < this.depthChargeCount; i++) {
      setTimeout(() => {
        if (this.markedForDeletion) return;
        const dropX = lerp(
          dropXStart,
          dropXEnd,
          i / (this.depthChargeCount - 1 || 1)
        );
        // Use Bomb class, falls and explodes on ground level
        const charge = new Bomb(
          this.game,
          dropX - chargeSize / 2,
          dropY,
          false
        );
        charge.color = "#696969"; // DimGray color
        charge.speedY = 4.5; // Fall speed
        charge.damage = 5; // Direct hit damage (low)
        charge.width = chargeSize;
        charge.height = chargeSize;
        // It will trigger 'ground' explosion from Bomb.update()
        this.game.addEnemyProjectile(charge); // Add to enemy projectiles
      }, i * this.depthChargeDelay);
    }
  }
  // --- END Attack Methods ---

  // --- Hit method ---
  hit(projectile) {
    if (
      this.markedForDeletion ||
      !projectile ||
      typeof projectile !== "object" ||
      projectile.markedForDeletion
    )
      return;
    const projectileType =
      projectile instanceof Bomb || projectile instanceof SuperBomb
        ? "bomb"
        : "bullet";
    const incomingDamage = projectile.damage || 1;
    const previousHealth = this.health;
    console.log(
      `Boss3Ship HIT: By ${
        projectile.constructor.name
      }, Type='${projectileType}', Dmg=${incomingDamage}, HealthBefore=${previousHealth.toFixed(
        1
      )}`
    );
    const effectiveDamage =
      incomingDamage * (projectileType === "bomb" ? 1.5 : 0.5); // Prefer bombs
    console.log(
      `   -> Applying ${effectiveDamage.toFixed(1)} effective damage.`
    );

    // Call EnemyShip's hit method - this handles flash and potentially damage reduction based on type
    super.hit(effectiveDamage, projectileType);

    // Trigger Reinforcements ONCE upon destruction
    if (previousHealth > 0 && this.health <= 0 && !this.markedForDeletion) {
      console.log(`${this.id} destroyed! Triggering Plane Reinforcements!`);
      this.game.spawnBoss3HelperPlanes(2, "mixed");
      this.markedForDeletion = true; // Ensure flag is set
    }
  } // End hit

  // Draw method
  draw(context) {
    if (this.markedForDeletion) return;
    context.save();
    const currentHullColor = this.isHit ? "white" : this.color;
    const currentDeckColor = this.isHit ? "white" : this.deckColor;
    const currentDetailColor = this.isHit ? "white" : this.detailColor;
    // Draw Base Ship Shape
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
    // Draw Details (Example: Main Cannon Turret Base)
    context.fillStyle = currentDetailColor;
    context.fillRect(
      this.x + this.width * 0.45,
      this.y - 5,
      this.width * 0.1,
      this.height * 0.2
    ); // Base
    // You could add more details like AA gun barrels here if desired
    context.restore();

    // Draw Health Bar (from Enemy.draw via EnemyShip)
    super.draw(context);
  } // End draw
} // End Boss3Ship class
