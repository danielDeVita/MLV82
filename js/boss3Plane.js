import { EnemyPlane } from "./enemyPlane.js";
import { EnemyBullet } from "./enemyBullet.js";
import { TrackingMissile } from "./trackingMissile.js";
import { BossWeakPoint } from "./bossWeakPoint.js"; // <<< IMPORT WEAK POINT
import { playSound } from "./audio.js";
import { randomInt } from "./utils.js";
import { Bullet } from "./bullet.js";
import { Bomb } from "./bomb.js";
import { SuperBomb } from "./superBomb.js";
import { checkCollision } from "./utils.js"; // <<< IMPORT checkCollision
import { Enemy } from "./enemy.js";

export class Boss3Plane extends EnemyPlane {
  constructor(game, speedBoost = 0) {
    super(game, speedBoost); // Calls EnemyPlane -> Enemy constructors
    this.id = "boss_3_plane_wp_v2"; // Update version ID
    this.enemyType = "air";
    this.width = 300;
    this.height = 110;

    // --- Set Health HERE ---
    this.maxHealth = 1600; // Increased health
    this.health = this.maxHealth;
    // --- End Health ---

    this.scoreValue = 3000; // Score now comes primarily from weak points + final bonus
    this.color = "#8B0000";
    this.detailColor = "#FFA500";

    // Movement properties
    this.amplitude = 60;
    this.frequency = 0.007;
    this.speedX = 1.8;
    this.initialY = this.game.height * 0.3;
    this.y = this.initialY;
    this.angle = Math.random() * Math.PI * 2;
    this.minX = 20;
    this.maxX = this.game.width - this.width - 20;
    this.moveDirectionX = 1;

    // Entry Logic state
    this.x = -this.width - 50;
    this.entryTargetX = this.minX + 50;
    this.isEntering = true;

    // Weak Point Setup
    this.weakPoints = [];
    this.activeWeakPoints = 0;
    this.createWeakPoints();

    // Attack Timers
    this.spreadTimer = randomInt(1500, 3000);
    this.spreadInterval = 2000;
    this.bombRunTimer = randomInt(8000, 12000);
    this.bombRunInterval = 11000;
    this.isBombing = false;
    this.bombDropCount = 0;
    this.maxBombsInRun = 10;
    this.bombDropDelay = 130;
    this.bombDropTimer = 0;
    this.missileTimer = randomInt(6000, 9000);
    this.missileInterval = 7000;
    this.missileSalvoCount = 3;
    this.missileSalvoDelay = 300;

    console.log(
      `${this.id} created with ${this.weakPoints.length} weak points. Health: ${this.health}/${this.maxHealth}`
    );
  } // End Constructor

  // Inside js/boss3Plane.js -> Boss3Plane class

  update(deltaTime) {
    // Exit if already marked for deletion
    if (this.markedForDeletion) return;

    // Ensure deltaTime is valid
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Entry Logic ---
    if (this.isEntering) {
      // --- Log Entry State Start ---
      // console.log(`Plane ${this.id} ENTERING: X=${this.x?.toFixed(0)}, SpeedX=${this.speedX}, EntryTargetX=${this.entryTargetX?.toFixed(0)}`);

      // Safety check for speed value
      if (typeof this.speedX !== "number" || isNaN(this.speedX)) {
        console.error(
          `Plane ${this.id} has invalid speedX: ${this.speedX}. Resetting to 1.0`
        );
        this.speedX = 1.0; // Default speed if invalid
      }

      // Move right to enter
      const moveAmount = this.speedX * 2 * deltaScale; // Enter faster
      this.x += moveAmount;
      // console.log(`   Moved by ${moveAmount.toFixed(1)}, New X = ${this.x.toFixed(0)}`);

      // Check if entry target reached
      // Safety check for target value
      if (typeof this.entryTargetX !== "number" || isNaN(this.entryTargetX)) {
        console.error(
          `Plane ${this.id} has invalid entryTargetX: ${this.entryTargetX}. Setting default.`
        );
        this.entryTargetX = 100; // Default target if invalid
      }

      if (this.x >= this.entryTargetX) {
        console.log(
          `!!! Plane ${this.id} ENTRY COMPLETE at X=${this.x.toFixed(0)} !!!`
        );
        this.x = this.entryTargetX; // Snap to position
        this.isEntering = false;
        // Ensure moveDirectionX is set for normal patrol start
        this.moveDirectionX = 1; // Start moving right initially in patrol
      }

      // Optional: Move vertically using sine wave during entry
      try {
        // Wrap sine wave math in try-catch
        if (this.initialY === undefined || isNaN(this.initialY)) {
          this.initialY = this.game.height * 0.3;
          console.warn(`Plane ${this.id} initialY reset.`);
        }
        if (typeof this.angle !== "number" || isNaN(this.angle)) this.angle = 0;
        if (typeof this.frequency !== "number" || isNaN(this.frequency))
          this.frequency = 0.007;
        if (typeof this.amplitude !== "number" || isNaN(this.amplitude))
          this.amplitude = 60;

        this.angle += this.frequency * deltaScale;
        this.y = this.initialY + Math.sin(this.angle) * this.amplitude;
        const entryTopBound = 10;
        const entryBottomBound = this.game.height - this.height - 150;
        this.y = Math.max(entryTopBound, Math.min(entryBottomBound, this.y)); // Clamp Y
      } catch (e) {
        console.error(`Error during plane vertical entry movement: ${e}`, this);
      }

      // Update hit flash timer even during entry
      if (this.isHit) {
        this.hitTimer -= safeDeltaTime;
        if (this.hitTimer <= 0) {
          this.isHit = false;
        }
      }

      return; // IMPORTANT: Stop further processing during entry phase
    }
    // --- End Entry Logic ---

    // --- Normal Update (Only runs if isEntering is false) ---

    // --- Horizontal Patrol Movement ---
    // Initialize direction if needed (should be set by entry logic now)
    if (this.moveDirectionX === undefined) {
      this.moveDirectionX = 1;
      console.warn(
        `Plane ${this.id} needed moveDirectionX reset in normal update.`
      );
    }

    // Safety check speed
    if (typeof this.speedX !== "number" || isNaN(this.speedX))
      this.speedX = 1.8;

    // Update horizontal position
    this.x += this.speedX * this.moveDirectionX * deltaScale;

    // Check horizontal boundaries and reverse direction
    // Safety check boundaries
    if (typeof this.minX !== "number" || isNaN(this.minX)) this.minX = 20;
    if (typeof this.maxX !== "number" || isNaN(this.maxX))
      this.maxX = this.game.width - this.width - 20;

    if (this.x <= this.minX && this.moveDirectionX === -1) {
      // console.log(`Plane ${this.id} HIT LEFT BOUNDARY at X=${this.x.toFixed(0)}. Reversing.`);
      this.x = this.minX;
      this.moveDirectionX = 1;
    } else if (this.x >= this.maxX && this.moveDirectionX === 1) {
      // console.log(`Plane ${this.id} HIT RIGHT BOUNDARY at X=${this.x.toFixed(0)}. Reversing.`);
      this.x = this.maxX;
      this.moveDirectionX = -1;
    }
    // --- End Horizontal Movement ---

    // --- Vertical Sine Wave Movement ---
    try {
      // Wrap sine wave math
      if (this.initialY === undefined || isNaN(this.initialY)) {
        this.initialY = this.game.height * 0.3;
      }
      if (typeof this.angle !== "number" || isNaN(this.angle)) this.angle = 0;
      if (typeof this.frequency !== "number" || isNaN(this.frequency))
        this.frequency = 0.007;
      if (typeof this.amplitude !== "number" || isNaN(this.amplitude))
        this.amplitude = 60;

      this.angle += this.frequency * deltaScale;
      this.y = this.initialY + Math.sin(this.angle) * this.amplitude;
      const topBound = 10;
      const bottomBound = this.game.height - this.height - 150;
      this.y = Math.max(topBound, Math.min(bottomBound, this.y)); // Clamp Y
    } catch (e) {
      console.error(`Error during plane vertical normal movement: ${e}`, this);
    }
    // --- End Vertical Movement ---

    // --- Update Weak Points ---
    try {
      this.weakPoints.forEach((wp) => wp.update(deltaTime));
    } catch (e) {
      console.error(`Error updating weak points for ${this.id}: ${e}`, this);
    }

    // --- Attack Logic ---
    try {
      // Wrap attack logic
      // Check Spread Shot Timer (only if not bombing and WP active)
      const spreadWP = this.weakPoints.find((wp) => wp.type === "spreadGun");
      if (spreadWP && spreadWP.isActive && !this.isBombing) {
        this.spreadTimer -= safeDeltaTime;
        if (this.spreadTimer <= 0) {
          this.fireSpreadShot();
          this.spreadTimer = this.spreadInterval + Math.random() * 500 - 250;
        }
      }

      // Check Missile Salvo Timer (only if WP active)
      const missileWP = this.weakPoints.find((wp) => wp.type === "missilePod");
      if (missileWP && missileWP.isActive) {
        this.missileTimer -= safeDeltaTime;
        if (this.missileTimer <= 0) {
          this.fireMissileSalvo();
          this.missileTimer = this.missileInterval + Math.random() * 1500 - 750;
        }
      }

      // Check Bombing Run Timer (only if WP active)
      const bombBayWP = this.weakPoints.find((wp) => wp.type === "bombBay");
      if (bombBayWP && bombBayWP.isActive) {
        this.bombRunTimer -= safeDeltaTime;
        if (!this.isBombing && this.bombRunTimer <= 0) {
          this.startBombingRun();
        }
        // Bombing state machine
        if (this.isBombing) {
          this.bombDropTimer -= safeDeltaTime;
          if (
            this.bombDropTimer <= 0 &&
            this.bombDropCount < this.maxBombsInRun
          ) {
            this.dropBomb();
            this.bombDropCount++;
            this.bombDropTimer = this.bombDropDelay;
          }
          if (this.bombDropCount >= this.maxBombsInRun) {
            this.isBombing = false;
            this.bombRunTimer =
              this.bombRunInterval + Math.random() * 2000 - 1000;
            console.log(`${this.id}: Bombing run complete.`);
          }
        }
      } else if (this.isBombing) {
        // Stop bombing if bomb bay destroyed mid-run
        this.isBombing = false;
        console.log(`${this.id}: Bombing run aborted (bomb bay destroyed).`);
      }
    } catch (e) {
      console.error(`Error during ${this.id} attack logic: ${e}`, this);
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

  /**
   * Fires a 5-bullet spread shot horizontally forwards (left).
   */
  fireSpreadShot() {
    // console.log(`${this.id} firing spread shot`); // Optional log
    playSound("enemyShoot");
    const bulletSpeedX = -5.0; // Fire left
    const bulletX = this.x; // Fire from front edge (left side) of the plane's hitbox
    const bulletYCenter = this.y + this.height / 2 - 4; // Vertically centered, adjust for bullet height
    const angles = [-0.35, -0.15, 0, 0.15, 0.35]; // Radians relative to negative X axis

    angles.forEach((angle) => {
      const speedX = Math.cos(angle) * bulletSpeedX;
      // Use absolute value for magnitude if desired, or direct multiplication for different effect
      const speedY = Math.sin(angle) * Math.abs(bulletSpeedX);
      this.game.addEnemyProjectile(
        new EnemyBullet(this.game, bulletX, bulletYCenter, speedX, speedY)
      );
    });
  }

  /**
   * Initiates the bombing run state.
   */
  startBombingRun() {
    // Prevent starting if already bombing or destroyed
    if (this.isBombing || this.markedForDeletion) return;

    console.log(`${this.id} starting bombing run!`);
    this.isBombing = true;
    this.bombDropCount = 0; // Reset count for this run
    this.bombDropTimer = 100; // Small initial delay before first bomb
    // Optional: Stop horizontal patrol during bombing run?
    // this.originalSpeedX = this.speedX; // Store current speed
    // this.speedX = 0; // Stop horizontal movement
  }

  /**
   * Drops a single bomb projectile below the plane. Called repeatedly during a bombing run.
   */
  dropBomb() {
    // console.log(`${this.id} dropping bomb ${this.bombDropCount + 1}`); // Optional log
    playSound("bomb_drop");
    const bombX = this.x + this.width / 2 - 5; // Center X relative to plane
    const bombY = this.y + this.height; // Drop from bottom edge

    // Use EnemyBullet styled as a bomb
    const bombProjectile = new EnemyBullet(this.game, bombX, bombY, 0, 5.5); // Falls straight down (speedX=0), speedY=5.5
    bombProjectile.width = 10;
    bombProjectile.height = 10;
    bombProjectile.color = this.detailColor; // Use plane's detail color (Orange)
    this.game.addEnemyProjectile(bombProjectile);
  }

  /**
   * Fires a salvo of tracking missiles.
   */
  fireMissileSalvo() {
    console.log(`${this.id} firing missile salvo!`);
    // Sound is played by TrackingMissile constructor

    const launchY = this.y + this.height / 2; // Launch from vertical center
    const launchOffsetX = 30; // Horizontal distance between missile launches

    for (let i = 0; i < this.missileSalvoCount; i++) {
      // Use setTimeout to stagger the launches slightly
      setTimeout(() => {
        // Check if boss component is still alive when timeout fires
        if (this.markedForDeletion || !this.game || this.game.isGameOver)
          return;

        // Alternate launch position slightly left/right of center based on i
        // Calculation for centering the salvo: (i - (totalCount - 1) / 2) * offset
        const launchX =
          this.x +
          this.width / 2 +
          (i - (this.missileSalvoCount - 1) / 2) * launchOffsetX;
        this.game.addEnemyProjectile(
          new TrackingMissile(this.game, launchX, launchY)
        );
      }, i * this.missileSalvoDelay); // Stagger using delay (e.g., 0ms, 300ms, 600ms for 3 missiles)
    }
  }
  // --- END Attack Methods ---

  // Inside js/boss3Plane.js -> Boss3Plane class

  hit(projectile) {
    // --- Basic Initial Checks ---
    if (
      this.markedForDeletion ||
      !projectile ||
      typeof projectile !== "object" ||
      projectile.markedForDeletion
    ) {
      return; // Stop processing this hit
    }

    // --- Ensure Previous Position Exists (Might be needed elsewhere) ---
    if (
      projectile instanceof Bullet &&
      (projectile.prevX === undefined || projectile.prevY === undefined)
    ) {
      projectile.prevX = projectile.x; // Initialize if missing
      projectile.prevY = projectile.y;
    }

    // --- Determine Projectile Type and Calculate Effective Damage ---
    const isBullet = projectile instanceof Bullet;
    const isBomb =
      projectile instanceof Bomb || projectile instanceof SuperBomb;
    const incomingDamage = projectile.damage || 1; // Get base damage, default to 1
    let effectiveDamage = incomingDamage; // Start with base damage

    if (isBullet) {
      effectiveDamage *= 1.5; // Example: Bullets do 150% damage to plane components
    }

    // --- Flag to track if any weak point was successfully hit by this projectile ---
    let weakPointWasHit = false;

    // --- Iterate Through Weak Points for Collision Check ---
    for (const wp of this.weakPoints) {
      if (!wp.isActive) {
        continue; // Move to the next weak point in the loop
      }

      // --- Force Weak Point Position Update ---
      wp.updatePosition();

      // --- Create Adjusted Hitbox Representation for Bullets ---
      let projectileHitbox = projectile; // Default: use the original projectile object
      if (isBullet) {
        // If it's a bullet, create a new hitbox object centered around the bullet's (x,y).
        projectileHitbox = {
          x: projectile.x - projectile.width / 2, // Calculate centered X
          y: projectile.y - projectile.height / 2, // Calculate centered Y
          width: projectile.width, // Use the bullet's original width
          height: projectile.height, // Use the bullet's original height
        };
        // Safety check for NaN
        if (isNaN(projectileHitbox.x) || isNaN(projectileHitbox.y)) {
          projectileHitbox = projectile; // Revert to original projectile data if centering failed
        }
      }

      // --- Perform Collision Check ---
      const collisionResult = checkCollision(projectileHitbox, wp);

      // --- Detailed Logging REMOVED ---
      // console.log( `...` ); // <-- REMOVED

      // --- Process the Hit if Collision Occurred ---
      if (collisionResult) {
        // --- Log Confirmation REMOVED ---
        // console.log(`      >>> SUCCESSFUL WP COLLISION DETECTED with ${wp.type} <<<`); // <-- REMOVED

        wp.hit(effectiveDamage); // Notify weak point
        projectile.markedForDeletion = true; // Consume projectile hitting WP
        weakPointWasHit = true;
        break; // Exit the loop early
      }
    } // --- End of weak point loop ---

    // --- Handle Hits That Missed Weak Points ---
    if (!weakPointWasHit && !projectile.markedForDeletion && isBullet) {
      // --- Logic to handle body hits REMOVED (no flash, no deletion) ---
      // console.log(`  -> Bullet hit plane body but missed WPs. Bullet continues.`); // <-- REMOVED / Optional
    } else if (!weakPointWasHit && !projectile.markedForDeletion && isBomb) {
      // Bombs hitting body but missing WPs are ignored
    }
  } // End hit() method

  // Inside js/boss3Plane.js -> Boss3Plane class
  draw(context) {
    if (this.markedForDeletion || !context) return;
    context.save(); // Save context state

    // --- >>> DRAW MAIN BOUNDING BOX REMOVED <<< ---

    // Apply main body hit flash if needed
    // (Only triggers now if a non-WP part of the *main* plane is hit by something ELSE,
    // or if you re-enable the flash in the hit() method for missed bullets)
    if (this.isHit) {
      // Keep a simple flash effect if you want visual feedback for ANY hit on the body
      // (e.g., if the main collision check in game.js triggers this)
      context.globalAlpha = 0.7; // Simple semi-transparent flash
    }

    // --- Draw Base Plane Shape (Unchanged) ---
    context.fillStyle = this.color; // Base color (Dark Red)
    context.beginPath();
    context.moveTo(this.x + this.width * 0.1, this.y + this.height * 0.2);
    context.lineTo(this.x + this.width * 0.5, this.y); // Nose
    context.lineTo(this.x + this.width * 0.9, this.y + this.height * 0.2);
    context.lineTo(this.x + this.width, this.y + this.height * 0.5); // Wingtip
    context.lineTo(this.x + this.width * 0.8, this.y + this.height); // Tail corner
    context.lineTo(this.x + this.width * 0.2, this.y + this.height); // Tail corner
    context.lineTo(this.x, this.y + this.height * 0.5); // Wingtip
    context.closePath();
    context.fill();
    // --- Draw Cockpit (Unchanged) ---
    context.fillStyle = this.detailColor; // Detail color (Orange)
    context.beginPath();
    context.arc(
      this.x + this.width * 0.8,
      this.y + this.height * 0.3,
      this.width * 0.08,
      0,
      Math.PI * 2
    );
    context.fill();
    // --- End Base Plane Shape ---

    context.restore(); // Restore context state

    // --- Draw Active Weak Points ---
    // Weak points draw themselves AFTER the main body and AFTER context restore
    this.weakPoints.forEach((wp) => {
      if (wp.isActive) {
        wp.draw(context); // Weak point draws itself (Original pink box + health bar)
      }
    });
  }

  createWeakPoints() {
    this.weakPoints = [];
    // Args: boss, offsetX, offsetY, width, height, maxHealth, type

    // --- Keep LOW HEALTH for testing hit frequency ---
    const wpHealth = 60;
    const bombBayBonusHealth = 20;
    const totalBombBayHealth = wpHealth + bombBayBonusHealth; // Should be 80

    // --- >>> FURTHER ADJUSTED offsetY and INCREASED Size <<< ---

    // 1. Left Wing Weapon Pod (Spread Shot)
    const wingPodY = this.height * 0.35; // Slightly higher again (was 0.40)
    const wingPodWidth = 75; // INCREASED (was 60)
    const wingPodHeight = 35; // INCREASED (was 25)
    this.weakPoints.push(
      new BossWeakPoint(
        this,
        30, // offsetX
        wingPodY, // <<< Adjusted offsetY
        wingPodWidth, // <<< Increased Width
        wingPodHeight, // <<< Increased Height
        wpHealth, // Low health (60)
        "spreadGun"
      )
    );

    // 2. Right Wing Weapon Pod (Missile Salvo)
    this.weakPoints.push(
      new BossWeakPoint(
        this,
        this.width - 30 - wingPodWidth, // Adjust offsetX based on new width
        wingPodY, // <<< Adjusted offsetY
        wingPodWidth, // <<< Increased Width
        wingPodHeight, // <<< Increased Height
        wpHealth, // Low health (60)
        "missilePod"
      )
    );

    // 3. Center Bomb Bay (Bombing Runs)
    const bombBayY = this.height * 0.55; // Slightly higher again (was 0.60)
    const bombBayWidth = 100; // INCREASED (was 80)
    const bombBayHeight = 30; // INCREASED (was 20)
    this.weakPoints.push(
      new BossWeakPoint(
        this,
        this.width / 2 - bombBayWidth / 2, // Adjust offsetX based on new width
        bombBayY, // <<< Adjusted offsetY
        bombBayWidth, // <<< Increased Width
        bombBayHeight, // <<< Increased Height
        totalBombBayHealth, // Low health (80)
        "bombBay"
      )
    );
    // --- >>> END ADJUSTMENTS <<< ---

    this.activeWeakPoints = this.weakPoints.length; // Set initial count
    console.log(
      `DEBUG createWeakPoints: Created ${this.activeWeakPoints} plane weak points. Pods W/H=${wingPodWidth}/${wingPodHeight}, Bay W/H=${bombBayWidth}/${bombBayHeight}, Base HP=${wpHealth}`
    );
  }

  weakPointDestroyed(type, index) {
    if (this.markedForDeletion) return;

    this.activeWeakPoints--;
    console.log(
      `Plane Weak Point Destroyed: ${type}! ${this.activeWeakPoints} remaining.`
    );
    this.game.addScore(250); // Score per part

    // Check if ALL weak points are now destroyed
    if (this.activeWeakPoints <= 0) {
      console.log(
        `${this.id} All Weak Points destroyed! Marking for deletion. Game state will trigger PLANE Reinforcements!`
      );

      this.markedForDeletion = true; // Set flag first
      this.game.addScore(this.scoreValue); // Final bonus score

      // REMOVED THE DIRECT SPAWN CALL FROM HERE
      // The Game.handleBossState method will now detect this plane's
      // markedForDeletion status and set the isSpawningPlaneHelpers flag.

      // Trigger Final Explosion Sequence
      this.triggerDefeatExplosion();
    } // End win condition check
  } // End weakPointDestroyed

  /**
   * Creates a series of explosions over the boss component's area upon defeat.
   */
  triggerDefeatExplosion() {
    console.log(`Triggering Defeat Explosion for ${this.id}`);
    // Number of explosions for this component
    const numExplosions = this.enemyType === "ship" ? 15 : 12; // More for the ship?
    // Duration of the explosion sequence
    const duration = this.enemyType === "ship" ? 2000 : 1600; // Slightly longer for ship?

    for (let i = 0; i < numExplosions; i++) {
      // Use setTimeout to stagger the explosions over the duration
      setTimeout(() => {
        // Double-check game isn't over when the timeout actually runs
        if (!this.game || this.game.isGameOver) {
          return;
        }

        // Calculate random position within the component's bounds
        const randomX = this.x + Math.random() * this.width;
        const randomY = this.y + Math.random() * this.height;

        // Determine explosion type based on component type
        let explosionType = "air"; // Default
        if (this.enemyType === "ship") {
          explosionType = Math.random() < 0.7 ? "ship" : "air"; // Mostly ship explosions
        } else {
          // Assumed 'air' type for plane
          explosionType = Math.random() < 0.7 ? "air" : "tiny"; // Mostly air explosions
        }

        // Create the explosion via the game instance
        this.game.createExplosion(randomX, randomY, explosionType);
      }, i * (duration / numExplosions) + Math.random() * 150); // Staggered timing with slight randomness
    }

    // Optional: Play a distinct final explosion sound for each component?
    // if(this.enemyType === 'ship') playSound('bossShipDestroyed');
    // else playSound('bossPlaneDestroyed');
  } // End triggerDefeatExplosion

  // --- Attack Methods ---

  /**
   * Fires a 5-bullet spread shot horizontally forwards (left).
   */
  fireSpreadShot() {
    // console.log(`${this.id} firing spread shot`); // Optional log
    playSound("enemyShoot");
    const bulletSpeedX = -5.0; // Fire left
    const bulletX = this.x; // Fire from front edge (left side) of the plane's hitbox
    const bulletYCenter = this.y + this.height / 2 - 4; // Vertically centered, adjust for bullet height
    const angles = [-0.35, -0.15, 0, 0.15, 0.35]; // Radians relative to negative X axis

    angles.forEach((angle) => {
      const speedX = Math.cos(angle) * bulletSpeedX;
      // Ensure Y speed calculation correctly uses bulletSpeedX for magnitude and angle sign
      const speedY = Math.sin(angle) * Math.abs(bulletSpeedX); // Or use * bulletSpeed for different effect
      this.game.addEnemyProjectile(
        new EnemyBullet(this.game, bulletX, bulletYCenter, speedX, speedY)
      );
    });
  }

  /**
   * Initiates the bombing run state.
   */
  startBombingRun() {
    // Prevent starting if already bombing or destroyed
    if (this.isBombing || this.markedForDeletion) return;

    console.log(`${this.id} starting bombing run!`);
    this.isBombing = true;
    this.bombDropCount = 0; // Reset count for this run
    this.bombDropTimer = 100; // Small initial delay before first bomb
    // Optional: Stop horizontal patrol during bombing run?
    // this.originalSpeedX = this.speedX; // Store current speed
    // this.speedX = 0; // Stop horizontal movement
  }

  /**
   * Drops a single bomb projectile below the plane. Called repeatedly during a bombing run.
   */
  dropBomb() {
    // console.log(`${this.id} dropping bomb ${this.bombDropCount + 1}`); // Optional log
    playSound("bomb_drop");
    const bombX = this.x + this.width / 2 - 5; // Center X relative to plane
    const bombY = this.y + this.height; // Drop from bottom edge

    // Use EnemyBullet styled as a bomb
    const bombProjectile = new EnemyBullet(this.game, bombX, bombY, 0, 5.5); // Falls straight down (speedX=0), speedY=5.5
    bombProjectile.width = 10;
    bombProjectile.height = 10;
    bombProjectile.color = this.detailColor; // Use plane's detail color (Orange)
    this.game.addEnemyProjectile(bombProjectile);
  }

  /**
   * Fires a salvo of tracking missiles.
   */
  fireMissileSalvo() {
    console.log(`${this.id} firing missile salvo!`);
    // Sound is played by TrackingMissile constructor, can add another sound here if needed

    const launchY = this.y + this.height / 2; // Launch from vertical center
    const launchOffsetX = 30; // Horizontal distance between missile launches

    for (let i = 0; i < this.missileSalvoCount; i++) {
      // Use setTimeout to stagger the launches slightly
      setTimeout(() => {
        // Check if boss component is still alive when timeout fires
        if (this.markedForDeletion || !this.game || this.game.isGameOver)
          return;

        // Alternate launch position slightly left/right of center based on i
        // Calculation for centering the salvo: (i - (totalCount - 1) / 2) * offset
        const launchX =
          this.x +
          this.width / 2 +
          (i - (this.missileSalvoCount - 1) / 2) * launchOffsetX;
        this.game.addEnemyProjectile(
          new TrackingMissile(this.game, launchX, launchY)
        );
      }, i * this.missileSalvoDelay); // Stagger using delay (e.g., 0ms, 300ms, 600ms for 3 missiles)
    }
  }
  // --- END Attack Methods ---
} // End Boss3Plane class
