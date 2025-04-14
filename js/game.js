// js/game.js

// --- Imports (Include Boss1) ---
import { InputHandler } from "./input.js";
import { Player } from "./player.js";
import { Background } from "./background.js";
import { EnemyPlane } from "./enemyPlane.js";
import { EnemyShip } from "./enemyShip.js";
import { EnemyShooterPlane } from "./enemyShooterPlane.js";
import { EnemyShooterShip } from "./enemyShooterShip.js";
import { EnemyDodgingPlane } from "./enemyDodgingPlane.js";
import { EnemyTrackingShip } from "./enemyTrackingShip.js";
import { EnemyMineLayerPlane } from "./enemyMineLayerPlane.js"; // <<< IMPORT
import { Mine } from "./mine.js"; // <<< IMPORT
import { EnemyBeamShip } from "./enemyBeamShip.js";

import { Explosion } from "./explosion.js";

import { PowerUpShield } from "./powerUpShield.js";
import { PowerUpSpreadShot } from "./powerUpSpreadShot.js";
import { PowerUpExtraLife } from "./powerUpExtraLife.js";
import { PowerUpBullet } from "./powerUpBullet.js";
import { PowerUpBomb } from "./powerUpBomb.js";
import { PowerUpRapidFire } from "./powerUpRapidFire.js";
import { PowerUpInvincibility } from "./powerUpInvincibility.js";

import { SuperBomb } from "./superBomb.js"; // <<< IMPORT SuperBomb
import { PowerUpSuperBomb } from "./powerUpSuperBomb.js";

import { Boss1 } from "./boss1.js"; // <<< BOSS IMPORT
import { Boss2 } from "./boss2.js";
// import { Boss3 } from "./boss3.js";
import { Boss3Ship } from "./boss3Ship.js"; // <<< IMPORT BOSS 3 SHIP
import { Boss3Plane } from "./boss3Plane.js"; // <<< IMPORT BOSS 3 PLANE
import { checkCollision } from "./utils.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js";

export class Game {
  constructor(canvasId, width, height) {
    console.log("DEBUG: Constructor START");
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas)
      throw new Error(`FATAL: Canvas element ID="${canvasId}" NOT FOUND.`);

    // --- Set fixed dimensions and get context ---
    this.width = width;
    this.height = height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext("2d");
    if (!this.context) throw new Error("FATAL: Failed to get 2D context.");
    console.log("DEBUG: Constructor - Context obtained.");

    // --- Initialize properties that DON'T change based on level start ---
    // These are core settings or base values used elsewhere.
    this.lastTime = 0; // For deltaTime calculation
    this.isGameOver = false; // Game state flag
    this.projectiles = []; // Player bullets/bombs
    this.enemyProjectiles = []; // Enemy bullets/missiles/mines
    this.enemies = []; // All active enemies (regular + bosses)
    this.explosions = []; // Visual effects
    this.powerUps = []; // Collectible power-ups
    this.baseEnemyPlaneInterval = 2000; // Base time between regular plane spawns
    this.baseEnemyShipInterval = 6000; // Base time between regular ship spawns
    this.boss1HelperPlaneBaseInterval = 1800; // Base time between Boss 1 helper spawns
    this.boss1HelperPlaneRandomInterval = 600; // Random variance for Boss 1 helpers
    this.powerUpDropChance = 0.1; // Base chance for enemy to drop power-up on death

    // Default intervals for timed power-ups during boss fights
    this.defaultBossPowerUpBaseInterval = 15000;
    this.defaultBossPowerUpRandomInterval = 5000;

    // Specific intervals for Boss 2 timed power-ups
    this.boss2PowerUpBaseInterval = 9000;
    this.boss2PowerUpRandomInterval = 3000;

    // Score thresholds to trigger bosses
    this.BOSS1_SCORE_THRESHOLD = 800;
    this.BOSS2_SCORE_THRESHOLD = 5000;
    // --- >>> INCREASE THIS VALUE <<< ---
    this.BOSS3_SCORE_THRESHOLD = 14000; // Example: Increased from 9500
    // --- >>> END INCREASE <<< ---

    // --- Initialize properties that WILL BE OVERWRITTEN by initializeLevel ---
    // Set safe defaults here, but initializeLevel is the source of truth at game start/restart.
    this.score = 0;
    this.difficultyLevel = 0;
    this.scoreForNextLevel = 300;
    this.enemyPlaneTimer = 0;
    this.enemyShipTimer = 0;
    this.boss1HelperPlaneTimer = 0;
    this.bossActive = false;
    // this.currentBoss = null;

    // --- Boss Tracking ---
    this.currentBossInstance = null; // For Boss 1 & 2
    this.currentBossNumber = null; // Which boss fight is active (1, 2, or 3)
    this.boss3Ship = null; // Reference to the Boss 3 Ship instance
    this.boss3Plane = null; // Reference to the Boss 3 Plane instance
    this.boss1Defeated = false;
    this.boss2Defeated = false;
    this.boss3Defeated = false;
    this.bossPowerUpTimer = 0;

    // Initialize using the DEFAULT values. spawnBoss will set the correct one later.
    this.bossPowerUpInterval =
      this.defaultBossPowerUpBaseInterval + // <<< USE DEFAULT HERE
      Math.random() * this.defaultBossPowerUpRandomInterval; // <<< USE DEFAULT HERE
    // --- >>> END CORRECTION <<< ---

    // --- Initialize Core Components ---
    // These need the 'this' (game instance) reference but their specific state
    // (like player lives) will be managed by initializeLevel/reset methods.
    try {
      this.input = new InputHandler(this);
      this.background = new Background(this.width, this.height);
      this.background.game = this; // Give background access to game instance
      this.player = new Player(this); // Player reads its own defaults first
    } catch (error) {
      console.error("Error initializing core components:", error);
      throw error; // Stop if core components fail
    }

    // --- Get UI Elements ---
    this.scoreElement = document.getElementById("score");
    this.livesElement = document.getElementById("lives");
    this.difficultyElement = document.getElementById("difficulty-level");
    this.powerupStatusElement = document.getElementById("powerup-status");
    this.gameOverElement = document.getElementById("game-over");
    this.restartButton = document.getElementById("restartButton");

    // --- Setup Event Listeners ---
    if (this.restartButton) {
      // Use bind to ensure 'this' refers to the Game instance inside the handler
      this.restartButton.addEventListener("click", this.restart.bind(this));
    } else {
      console.error("Restart button not found!");
    }

    console.log("Game Constructor: Finished successfully.");
    // NOTE: updateUI() is NOT called here anymore.
    // It's called by initializeLevel (which is called by start/restart).
  } // End Constructor

  // Inside js/game.js -> Game class

  // --- Main Game Loop ---
  loop(timestamp) {
    // Check context at START
    if (!this.context) {
      console.error(`LOOP ERROR (Start): this.context is missing!`);
      this.isGameOver = true;
      this.drawGameOver(); // Attempt to draw game over overlay even if context lost mid-game later
      return;
    }

    // Check game over state at START
    if (this.isGameOver) {
      this.drawGameOver(); // Keep drawing overlay if game is over
      return;
    }

    // DeltaTime Calculation
    const currentTime = performance.now ? performance.now() : timestamp;
    const MAX_DELTA_TIME_MS = 100; // Prevent excessive jumps if tab loses focus
    let deltaTime = 0;
    if (this.lastTime > 0) {
      deltaTime = currentTime - this.lastTime;
      // Clamp delta time: handle potential pauses/freezes or very fast frames
      deltaTime = Math.max(0.1, Math.min(MAX_DELTA_TIME_MS, deltaTime));
    } else {
      deltaTime = 16.67; // Estimate for first frame (approx 60fps)
    }
    this.lastTime = currentTime;

    // --- ====== GAME LOGIC START ====== ---
    try {
      // 1. Clear Canvas
      this.context.clearRect(0, 0, this.width, this.height);

      // 2. Update All Game Objects
      this.background.update(deltaTime, this.score);
      this.player.update(this.input, deltaTime);
      // Use spread syntax for a single loop over all update-able arrays
      [
        ...this.projectiles,
        ...this.enemyProjectiles,
        ...this.enemies,
        ...this.explosions,
        ...this.powerUps,
      ].forEach((obj) => {
        if (obj && typeof obj.update === "function") {
          // Safety check
          obj.update(deltaTime);
        } else {
          console.warn("Update loop encountered invalid object:", obj);
        }
      });

      // Timed Boss Power-up Logic
      if (this.bossActive) {
        // Check general flag first
        this.bossPowerUpTimer += deltaTime;
        if (this.bossPowerUpTimer >= this.bossPowerUpInterval) {
          this.bossPowerUpTimer = 0; // Reset timer
          let baseInterval, randomInterval;
          // Use faster intervals ONLY if Boss 2 fight is active
          if (this.currentBossNumber === 2) {
            // Check specific boss number
            baseInterval = this.boss2PowerUpBaseInterval;
            randomInterval = this.boss2PowerUpRandomInterval;
          } else {
            // Default for Boss 1, Boss 3, or potentially future bosses
            baseInterval = this.defaultBossPowerUpBaseInterval;
            randomInterval = this.defaultBossPowerUpRandomInterval;
          }
          // Calculate interval for the *next* spawn
          this.bossPowerUpInterval =
            baseInterval + Math.random() * randomInterval;

          // Spawn the power-up
          const spawnX = Math.random() * (this.width * 0.7) + this.width * 0.1;
          const spawnY = 50 + Math.random() * 50;
          console.log(
            `Spawning timed boss power-up (Next interval: ${this.bossPowerUpInterval.toFixed(
              0
            )}ms)`
          );
          this.createPowerUp(spawnX, spawnY, "air"); // Timed drops float down
        }
      }

      // 3. Game State Checks & Spawning
      this.updateDifficulty();
      this.handleBossState(); // Checks for spawning new boss / ending current fight
      this.handleSpawning(deltaTime); // Handles regular enemy and Boss 1 helper spawns

      // 4. Collisions
      this.handleCollisions();

      // --- 5. Draw Everything (Single Pass) ---
      // Ensure context is still valid before drawing phase
      if (!this.context) {
        throw new Error("Context lost before drawing phase!");
      }

      this.background.draw(this.context);
      this.powerUps.forEach((pu) => pu.draw(this.context));

      // --- >>> SINGLE DRAW LOOP FOR ENEMIES <<< ---
      this.enemies.forEach((e) => {
        if (e && typeof e.draw === "function") {
          // Safety check
          e.draw(this.context); // Includes bosses & B3 components
        } else {
          console.warn("Draw loop encountered invalid enemy object:", e);
        }
      });
      // --- >>> END SINGLE DRAW LOOP <<< ---

      this.enemyProjectiles.forEach((ep) => ep.draw(this.context)); // Includes mines
      this.player.draw(this.context);
      this.projectiles.forEach((p) => p.draw(this.context)); // Includes SuperBomb
      this.explosions.forEach((ex) => ex.draw(this.context));

      // --- 6. Cleanup ---
      this.cleanupObjects();
    } catch (error) {
      console.error("ERROR during game loop:", error);
      this.isGameOver = true; // Trigger game over state on error
      this.drawGameOver(); // Attempt to draw overlay
      return; // Stop the loop on error
    }

    // Request next frame ONLY if game is not over
    if (!this.isGameOver) {
      requestAnimationFrame(this.loop.bind(this));
    } else {
      // If game ended cleanly (e.g., player died), drawGameOver was already called
      // If game ended via error, drawGameOver was called in catch block
      console.log("Game loop stopped.");
    }
  } // End loop

  // --- >>> REVISED Boss State Management <<< ---
  handleBossState() {
    if (!this.bossActive) {
      // Check if we need to SPAWN a boss
      if (!this.boss1Defeated && this.score >= this.BOSS1_SCORE_THRESHOLD) {
        this.spawnBoss(1);
      } else if (
        this.boss1Defeated &&
        !this.boss2Defeated &&
        this.score >= this.BOSS2_SCORE_THRESHOLD
      ) {
        this.spawnBoss(2);
      } else if (
        this.boss1Defeated &&
        this.boss2Defeated &&
        !this.boss3Defeated &&
        this.score >= this.BOSS3_SCORE_THRESHOLD
      ) {
        this.spawnBoss(3);
      }
    } else {
      // Boss IS active, check if it needs to be marked DEFEATED
      if (this.currentBossNumber === 3) {
        // Boss 3 defeat condition
        const shipDefeated =
          !this.boss3Ship || this.boss3Ship.markedForDeletion;
        const planeDefeated =
          !this.boss3Plane || this.boss3Plane.markedForDeletion;
        if (shipDefeated && planeDefeated && !this.boss3Defeated) {
          console.log(
            "handleBossState: Both Boss 3 components defeated! Calling bossDefeated(3)..."
          );
          this.bossDefeated(3);
        }
      } else if (
        this.currentBossInstance &&
        this.currentBossInstance.markedForDeletion
      ) {
        // Boss 1 or 2 defeat condition
        console.log(
          `handleBossState: Boss ${this.currentBossNumber} instance marked. Calling bossDefeated(${this.currentBossNumber})...`
        );
        this.bossDefeated(this.currentBossNumber);
      }
    }
  }

  // --- >>> REVISED spawnBoss Method <<< ---
  spawnBoss(bossNumber) {
    // Prevent spawning if already active
    if (this.bossActive) {
      console.warn(
        `Attempted to spawn Boss ${bossNumber} while boss already active.`
      );
      return;
    }

    console.log(`--- Spawning Boss ${bossNumber} ---`);
    this.bossActive = true; // Set flag immediately
    this.currentBossNumber = bossNumber; // <<< Store which boss fight it is

    // Clear regular enemies/projectiles
    this.enemies = this.enemies.filter(
      (e) =>
        e instanceof Boss1 ||
        e instanceof Boss2 ||
        e instanceof Boss3Ship ||
        e instanceof Boss3Plane
    ); // Keep only existing boss parts? Or clear all?
    this.enemies = []; // Let's clear all existing enemies for simplicity when a new boss starts
    this.enemyProjectiles = [];

    // --- Boss 3 Specific Spawning ---
    if (bossNumber === 3) {
      console.log("Instantiating Boss 3 Dual Components...");
      try {
        this.boss3Ship = new Boss3Ship(this);
        this.boss3Plane = new Boss3Plane(this);
        this.enemies.push(this.boss3Ship); // Add both to enemies array
        this.enemies.push(this.boss3Plane);
        this.currentBossInstance = null; // No single "current" boss for B3
        console.log(
          `   Spawned ${this.boss3Ship.id} and ${this.boss3Plane.id}`
        );
      } catch (error) {
        console.error(`ERROR Instantiating Boss 3 Components:`, error);
        this.bossActive = false;
        this.currentBossNumber = null; // Reset state on error
        this.boss3Ship = null;
        this.boss3Plane = null;
        return;
      }
    }
    // --- Spawning for Boss 1 or 2 ---
    else {
      let bossInstance = null;
      try {
        if (bossNumber === 1) {
          bossInstance = new Boss1(this);
        } else if (bossNumber === 2) {
          bossInstance = new Boss2(this);
        }
      } catch (error) {
        /* ... error handling ... */ this.bossActive = false;
        this.currentBossNumber = null;
        return;
      }

      if (bossInstance) {
        console.log(`Successfully instantiated ${bossInstance.id}`);
        this.enemies.push(bossInstance);
        this.currentBossInstance = bossInstance; // <<< Store the single boss instance
        this.boss3Ship = null;
        this.boss3Plane = null; // Ensure B3 refs are null
      } else {
        /* ... handle unknown boss ... */ this.bossActive = false;
        this.currentBossNumber = null;
        return;
      }
    }

    // Set Initial power-up interval (based on boss number now)
    this.bossPowerUpTimer = 0;
    let baseInterval, randomInterval;
    if (bossNumber === 2) {
      baseInterval = this.boss2PowerUpBaseInterval;
      randomInterval = this.boss2PowerUpRandomInterval;
      console.log("Setting initial Boss 2 power-up interval.");
    } else {
      baseInterval = this.defaultBossPowerUpBaseInterval;
      randomInterval = this.defaultBossPowerUpRandomInterval;
      console.log("Setting initial default power-up interval.");
    }
    this.bossPowerUpInterval = baseInterval + Math.random() * randomInterval;
  }

  // --- >>> REVISED bossDefeated Method <<< ---
  /** Handles logic when a boss fight concludes.
   * @param {number} bossNumber - The number of the boss that was just defeated.
   */
  bossDefeated(bossNumber) {
    // Check if this specific boss fight was actually marked as defeated
    if (
      (bossNumber === 1 && this.boss1Defeated) ||
      (bossNumber === 2 && this.boss2Defeated) ||
      (bossNumber === 3 && this.boss3Defeated)
    ) {
      console.warn(
        `bossDefeated called for Boss ${bossNumber}, but it was already marked as defeated.`
      );
      // Still reset generic boss state if somehow active
      this.bossActive = false;
      this.currentBossInstance = null;
      this.currentBossNumber = null;
      this.boss3Ship = null;
      this.boss3Plane = null;
      return;
    }

    console.log(`--- Boss ${bossNumber} Defeated! ---`);

    // Set the specific defeated flag
    if (bossNumber === 1) {
      this.boss1Defeated = true;
    } else if (bossNumber === 2) {
      this.boss2Defeated = true;
    } else if (bossNumber === 3) {
      this.boss3Defeated = true;
    }

    // Reset general boss state
    this.bossActive = false;
    this.currentBossInstance = null; // Clear single boss ref
    this.currentBossNumber = null; // Clear boss number tracker
    // Ensure Boss 3 refs are cleared (might be redundant if cleanupObjects runs first, but safe)
    this.boss3Ship = null;
    this.boss3Plane = null;

    // Drop powerups
    const numPowerups = bossNumber === 1 ? 3 : bossNumber === 2 ? 4 : 5; // More for later bosses
    for (let i = 0; i < numPowerups; i++) {
      /* ... spawn powerups ... */
    }

    // Resume normal spawning timers
    this.enemyPlaneTimer = 0;
    this.enemyShipTimer = 0;
    // Reset Boss 1 helper timer if Boss 1 was just defeated
    if (bossNumber === 1) this.boss1HelperPlaneTimer = 0;
  }

  // --- >>> ADD Reinforcement Spawning Methods <<< ---
  // These are called by the Boss components when THEY are destroyed
  spawnBoss3HelperPlanes(count = 2, type = "mixed") {
    console.log(`GAME: Spawning ${count} Boss 3 PLANE helpers.`);
    for (let i = 0; i < count; i++) {
      let PlaneClass = EnemyShooterPlane; // Default
      if (type === "mixed" && Math.random() < 0.5)
        PlaneClass = EnemyDodgingPlane;
      else if (type === "dodger") PlaneClass = EnemyDodgingPlane;
      this.enemies.push(new PlaneClass(this, 0.2)); // Small speed boost?
      // Maybe add slight delay between spawns?
    }
  }
  spawnBoss3HelperShips(count = 2, type = "mixed") {
    console.log(`GAME: Spawning ${count} Boss 3 SHIP helpers.`);
    for (let i = 0; i < count; i++) {
      let ShipClass = EnemyShooterShip; // Default
      if (type === "mixed" && Math.random() < 0.4)
        ShipClass = EnemyTrackingShip;
      else if (type === "tracking") ShipClass = EnemyTrackingShip;
      const ship = new ShipClass(this, 0.1);
      ship.x = this.width + 60 + i * 90; // Stagger entry
      ship.y -= i * 10;
      this.enemies.push(ship);
    }
  }
  // --- >>> END Reinforcement Methods <<< ---

  // --- Other Helper Methods ---
  updateDifficulty() {
    if (!this.isGameOver && this.score >= this.scoreForNextLevel) {
      this.difficultyLevel++;
      this.scoreForNextLevel += 300 + this.difficultyLevel ** 2 * 50;
      this.updateDifficultyUI();
      this.powerUpDropChance = Math.min(
        0.25,
        0.1 + this.difficultyLevel * 0.015
      );
    }
  }

  handleSpawning(deltaTime) {
    // --- SECTION 1: BOSS ACTIVE CHECKS ---

    // 1a. Boss 1 Helper Spawns (Only when Boss 1 is active and low health)
    if (
      this.bossActive &&
      this.currentBoss instanceof Boss1 &&
      this.currentBoss.activeWeakPoints <= 2 &&
      this.currentBoss.activeWeakPoints > 0
    ) {
      this.boss1HelperPlaneTimer += deltaTime;
      const currentHelperInterval =
        this.boss1HelperPlaneBaseInterval +
        Math.random() * this.boss1HelperPlaneRandomInterval;
      if (this.boss1HelperPlaneTimer >= currentHelperInterval) {
        this.boss1HelperPlaneTimer = 0;
        const planesToSpawn = this.currentBoss.activeWeakPoints === 1 ? 2 : 1;
        console.log(
          `Spawning ${planesToSpawn} Boss 1 helper plane(s) (Shooter/Basic?) - ${this.currentBoss.activeWeakPoints} WP left`
        );
        for (let i = 0; i < planesToSpawn; i++) {
          // --- Boss 1 Helpers: Use types available before Boss 1 ---
          let HelperPlaneClass =
            Math.random() < 0.4 ? EnemyShooterPlane : EnemyPlane; // 40% Shooter, 60% Basic?
          this.enemies.push(new HelperPlaneClass(this, 0)); // No extra boost for helpers?
        }
      }
      return; // Prevent regular spawns during Boss 1 helper phase
    }

    // 1b. Boss 2 Helper Spawns (Triggered by Boss 2 itself)
    // Note: We implemented this via Boss2 calling game.spawnBoss2HelperShips.
    // So, no specific check needed here, but we still need the general boss active check below.

    // 1c. General Boss Active Check
    if (this.bossActive) {
      return; // No regular spawns during ANY active boss fight (unless handled above)
    }

    // --- SECTION 2: REGULAR SPAWNING (No boss active) ---
    const speedBoost = this.difficultyLevel * 0.3;
    const minPlaneInt = 500,
      minShipInt = 1800; // Slightly faster min ship interval?
    const planeReduct = this.difficultyLevel * 150,
      shipReduct = this.difficultyLevel * 300;
    const currentPlaneInt = Math.max(
      minPlaneInt,
      this.baseEnemyPlaneInterval - planeReduct
    );
    const currentShipInt = Math.max(
      minShipInt,
      this.baseEnemyShipInterval - shipReduct
    );
    const r = Math.random(); // Use one random number per spawn type check

    // --- Spawn Planes ---
    this.enemyPlaneTimer += deltaTime;
    if (this.enemyPlaneTimer >= currentPlaneInt) {
      this.enemyPlaneTimer -= currentPlaneInt;
      let PlaneClass = null;

      // Define base probabilities - these will be adjusted by difficulty/progression
      let mineLayerChance = 0;
      let dodgerChance = 0;
      let shooterPlaneChance = 0.25; // Start with a base chance for shooters
      let basicPlaneChance = 1.0; // Remainder will be basic

      // --- Adjust Probabilities Based on Game Stage & Difficulty ---
      const level = this.difficultyLevel;

      if (this.boss2Defeated && level > 4) {
        // Stage 3: After Boss 2
        mineLayerChance = 0.15 + level * 0.03; // Introduce Mine Layers
        dodgerChance = 0.2 + level * 0.04; // Dodgers more common
        shooterPlaneChance = 0.35 + level * 0.03; // Shooters still common
      } else if (this.boss1Defeated && level > 1) {
        // Stage 2: After Boss 1
        dodgerChance = 0.15 + level * 0.05; // Introduce Dodgers
        shooterPlaneChance = 0.3 + level * 0.05; // Shooter chance increases
      } else {
        // Stage 1: Before Boss 1
        shooterPlaneChance = 0.2 + level * 0.1; // Shooter chance starts lower
      }

      // Normalize probabilities (ensure they roughly add up, basic takes remainder)
      basicPlaneChance = Math.max(
        0,
        1.0 - mineLayerChance - dodgerChance - shooterPlaneChance
      );
      shooterPlaneChance = Math.max(
        0,
        1.0 - mineLayerChance - dodgerChance - basicPlaneChance
      ); // Adjust shooter based on others
      dodgerChance = Math.max(
        0,
        1.0 - mineLayerChance - shooterPlaneChance - basicPlaneChance
      ); // Adjust dodger

      // --- Select Plane Type Based on Random Number r ---
      if (r < mineLayerChance) {
        PlaneClass = EnemyMineLayerPlane;
      } else if (r < mineLayerChance + dodgerChance) {
        PlaneClass = EnemyDodgingPlane;
      } else if (r < mineLayerChance + dodgerChance + shooterPlaneChance) {
        PlaneClass = EnemyShooterPlane;
      } else {
        // Remainder is Basic Plane
        PlaneClass = EnemyPlane;
      }

      if (PlaneClass) {
        this.enemies.push(new PlaneClass(this, speedBoost));
        // console.log(`Spawned: ${PlaneClass.name} (Lvl: ${level}, B1: ${this.boss1Defeated}, B2: ${this.boss2Defeated})`); // Debug log
      }
    } // End Plane Spawn Trigger

    // --- Spawn Ships ---
    this.enemyShipTimer += deltaTime;
    if (this.enemyShipTimer >= currentShipInt) {
      this.enemyShipTimer -= currentShipInt;
      let ShipClass = null;
      const rShip = Math.random(); // Separate random number for ships

      // Define base probabilities
      let beamShipChance = 0;
      let trackingShipChance = 0;
      let shooterShipChance = 0.25; // Start with base chance
      let basicShipChance = 1.0;

      // --- Adjust Probabilities Based on Game Stage & Difficulty ---
      const level = this.difficultyLevel;

      if (this.boss2Defeated && level > 5) {
        // Stage 3: After Boss 2
        beamShipChance = 0.18 + level * 0.03; // Introduce Beam Ships
        trackingShipChance = 0.2 + level * 0.04; // Trackers more common
        shooterShipChance = 0.3 + level * 0.03; // Shooters still common
      } else if (this.boss1Defeated && level > 1) {
        // Stage 2: After Boss 1
        trackingShipChance = 0.15 + level * 0.05; // Introduce Trackers
        shooterShipChance = 0.3 + level * 0.05; // Shooter chance increases
      } else {
        // Stage 1: Before Boss 1
        shooterShipChance = 0.2 + level * 0.1; // Shooter chance starts lower
      }

      // Normalize probabilities
      basicShipChance = Math.max(
        0,
        1.0 - beamShipChance - trackingShipChance - shooterShipChance
      );
      shooterShipChance = Math.max(
        0,
        1.0 - beamShipChance - trackingShipChance - basicShipChance
      );
      trackingShipChance = Math.max(
        0,
        1.0 - beamShipChance - shooterShipChance - basicShipChance
      );

      // --- Select Ship Type Based on Random Number rShip ---
      if (rShip < beamShipChance) {
        ShipClass = EnemyBeamShip;
      } else if (rShip < beamShipChance + trackingShipChance) {
        ShipClass = EnemyTrackingShip;
      } else if (
        rShip <
        beamShipChance + trackingShipChance + shooterShipChance
      ) {
        ShipClass = EnemyShooterShip;
      } else {
        // Remainder is Basic Ship
        ShipClass = EnemyShip;
      }

      if (ShipClass) {
        this.enemies.push(new ShipClass(this, speedBoost));
        // console.log(`Spawned: ${ShipClass.name} (Lvl: ${level}, B1: ${this.boss1Defeated}, B2: ${this.boss2Defeated})`); // Debug log
      }
    } // End Ship Spawn Trigger
  } // End handleSpawning

  handleCollisions() {
    // --- Player Projectiles vs Enemies ---
    this.projectiles.forEach((p) => {
      // Safety check for projectile validity & deletion status at start
      if (typeof p !== "object" || p === null || p.markedForDeletion) {
        return; // Skip this projectile entirely if invalid or already marked
      }

      // Loop through enemies to check for collision with projectile 'p'
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];

        // Skip if projectile was marked by a previous enemy in this inner loop, or if enemy is invalid/marked
        if (
          p.markedForDeletion ||
          !e ||
          typeof e !== "object" ||
          e.markedForDeletion
        ) {
          continue; // Move to the next enemy
        }

        // --- Check Collision ---
        if (checkCollision(p, e)) {
          console.log(
            `%%% COLLISION! Proj: ${p.constructor.name} (${p.x?.toFixed(
              0
            )},${p.y?.toFixed(0)}, Dmg:${p.damage}) vs Enemy: ${
              e.constructor.name
            } ${e.id} (${e.x?.toFixed(0)},${e.y?.toFixed(0)}, Health:${
              e.health
            })`
          );

          // --- Determine Hit Logic based on projectile and enemy types ---

          // 1. SuperBomb direct hit on an AIR enemy? (Including Boss3Plane)
          if (
            p instanceof SuperBomb &&
            (e instanceof EnemyPlane ||
              e instanceof EnemyShooterPlane ||
              e instanceof EnemyDodgingPlane ||
              e instanceof EnemyMineLayerPlane ||
              e instanceof Boss3Plane)
          ) {
            console.log(
              `   -> Handling SuperBomb vs Air Enemy ${e.constructor.name}...`
            );
            e.hit(p); // Pass the projectile itself to let the enemy calculate effective damage
            p.markedForDeletion = true; // Consume the SuperBomb
            this.createExplosion(p.x + p.width / 2, p.y + p.height / 2, "air");
          }
          // 2. Any projectile hitting Boss 1 or Boss 2?
          else if (e instanceof Boss1 || e instanceof Boss2) {
            console.log(
              `   -> Handling Projectile vs Boss 1/2 ${e.constructor.name}...`
            );
            e.hit(p); // Let the specific boss instance handle the projectile object
            // Projectile deletion is handled within Boss1/Boss2 hit methods if applicable
          }
          // 3. Any projectile hitting Boss 3 Components?
          else if (e instanceof Boss3Ship || e instanceof Boss3Plane) {
            console.log(
              `   -> Handling Projectile vs Boss 3 Component ${e.constructor.name}...`
            );
            e.hit(p); // Let the specific component instance handle the projectile object
            // Projectile deletion is handled within Boss3Ship/Boss3Plane hit methods if applicable
          }
          // 4. Regular Projectile (NOT SuperBomb) hitting Regular Enemy?
          else if (!(p instanceof SuperBomb)) {
            console.log(
              `   -> Handling Regular Projectile vs Regular Enemy ${e.constructor.name}...`
            );
            const pType = p instanceof Bomb ? "bomb" : "bullet";
            e.hit(p.damage || 1, pType); // Pass damage and type to regular enemy hit

            // Regular projectile deletion logic
            if (pType !== "bomb") {
              // Bullets always die on any regular enemy hit
              p.markedForDeletion = true;
            } else {
              // Regular Bombs only die on hitting regular ships
              if (
                e instanceof EnemyShip ||
                e instanceof EnemyShooterShip ||
                e instanceof EnemyTrackingShip ||
                e instanceof EnemyBeamShip
              ) {
                p.markedForDeletion = true;
              }
              // Note: Regular bomb hitting plane does NOT destroy the bomb itself here
            }
          }
          // 5. Else case (e.g., SuperBomb hitting regular ship - direct hit ignored, handled by water impact)
          else {
            // This block might be entered if a SuperBomb hits a regular ship directly.
            // We currently intend for only the water impact to damage ships from SuperBomb.
            console.log(
              `   -> Collision ignored (e.g., SuperBomb direct hit on ship): Proj=${p.constructor.name}, Enemy=${e.constructor.name}`
            );
          }

          // --- Break inner enemy loop if projectile was consumed ---
          if (p.markedForDeletion) {
            // console.log(`      Projectile marked for deletion after hitting ${e.id}, breaking inner loop.`); // Optional debug
            break;
          }
        } // end if(checkCollision)
      } // end for (enemies)
    }); // End forEach (projectiles)

    // --- Player vs Enemy Projectiles (AND MINES) ---
    this.enemyProjectiles.forEach((ep) => {
      if (!ep || ep.markedForDeletion) return; // Safety check
      if (checkCollision(this.player, ep)) {
        if (this.player.shieldActive) {
          ep.markedForDeletion = true;
          this.player.deactivateShield(true);
          this.createExplosion(
            ep.x + ep.width / 2,
            ep.y + ep.height / 2,
            "tiny"
          );
          playSound("shieldDown");
          return;
        }
        if (this.player.invincible) {
          return;
        } // Player immune, projectile continues

        // Player is vulnerable and hit
        ep.markedForDeletion = true; // Consume projectile/mine
        if (ep instanceof Mine) {
          console.log("Player hit a Mine!");
          this.createExplosion(
            ep.x + ep.width / 2,
            ep.y + ep.height / 2,
            "ground"
          );
          playSound("explosion");
        } else {
          // Hit by regular bullet/missile
        }
        this.player.hit(); // Apply damage/invincibility to player
      }
    }); // End Player vs Enemy Projectiles

    // --- Player vs Enemies ---
    if (!this.player.shieldActive && !this.player.invincible) {
      this.enemies.forEach((e) => {
        if (!e || e.markedForDeletion) return; // Safety check
        if (checkCollision(this.player, e)) {
          let playerDamaged = false; // Assume no damage initially

          if (e instanceof Boss1 || e instanceof Boss2) {
            console.log(
              `Player collided with Boss object: ${e.constructor.name}`
            );
            playerDamaged = true;
          } else if (e instanceof Boss3Ship) {
            console.log(
              `Player collided with Boss Component: ${e.constructor.name}`
            );
            playerDamaged = true; // Assume hull contact hurts
          } else if (e instanceof Boss3Plane) {
            console.log(
              `Player collided with Boss Component: ${e.constructor.name}`
            );
            playerDamaged = true; // Assume hull contact hurts
          } else {
            // Player Collided with REGULAR ENEMY
            e.hit(100); // Destroy regular enemy instantly
            playerDamaged = true;
          }
          // Apply damage to player if needed
          if (playerDamaged) {
            this.player.hit();
          }
        } // End if(checkCollision)
      }); // End forEach enemy
    } // End Player vs Enemies invincibility check

    // --- Player vs PowerUps ---
    this.powerUps.forEach((pu) => {
      if (!pu || pu.markedForDeletion) return; // Safety check
      if (checkCollision(this.player, pu)) {
        pu.activate(this.player); // PowerUp handles its own deletion
      }
    }); // End Player vs PowerUps
  } // End of handleCollisions

  // --- Modified cleanupObjects to trigger effect ---
  cleanupObjects() {
    let superBombsHitWater = []; // Track superbombs hitting water this frame

    // Filter projectiles, identify superbombs hitting water
    this.projectiles = this.projectiles.filter((p) => {
      if (p.markedForDeletion) {
        // Check if it's a superbomb that specifically hit the water
        if (p instanceof SuperBomb && p.hitWater) {
          superBombsHitWater.push(p); // Add to list for effect trigger
          this.createExplosion(
            p.x + p.width / 2,
            p.y + p.height / 2 - 10,
            "waterSplash"
          ); // <<< Need a 'waterSplash' effect type
          playSound("splash"); // <<< Need a splash sound
        }
        return false; // Remove marked projectiles
      }
      return true; // Keep non-marked projectiles
    });

    // Trigger effect AFTER filtering if any superbombs hit water
    if (superBombsHitWater.length > 0) {
      console.log(
        `${superBombsHitWater.length} SuperBomb(s) hit water, triggering effect!`
      );
      this.triggerSuperBombEffect(); // Call the ship-damaging effect
    }

    // Cleanup other arrays (unchanged)
    this.enemyProjectiles = this.enemyProjectiles.filter(
      (o) => !o.markedForDeletion
    );
    this.enemies = this.enemies.filter((o) => !o.markedForDeletion);
    this.explosions = this.explosions.filter((o) => !o.markedForDeletion);
    this.powerUps = this.powerUps.filter((o) => !o.markedForDeletion);
  }

  addProjectile(p) {
    this.projectiles.push(p);
  }
  addEnemyProjectile(p) {
    this.enemyProjectiles.push(p);
  }
  createExplosion(x, y, t) {
    this.explosions.push(new Explosion(this, x, y, t));
  }
  addScore(a) {
    this.score += a;
    this.updateScoreUI();
  }
  // --- UI Update Methods ---
  updateUI() {
    // Call all individual UI update functions
    this.updateScoreUI();
    this.updateLivesUI();
    this.updateDifficultyUI();
    this.updatePowerUpStatus(""); // Clear status initially or on reset
  }

  updateScoreUI() {
    if (this.scoreElement) {
      this.scoreElement.textContent = `Score: ${this.score}`;
    } else {
      // console.warn("Score UI element not found."); // Optional warning
    }
  }

  updateLivesUI() {
    if (this.livesElement && this.player) {
      // Check if player exists too
      this.livesElement.textContent = `Lives: ${this.player.lives}`;
      // Apply/remove warning class based on lives
      this.livesElement.classList.toggle("low-lives", this.player.lives <= 1);
    } else {
      // console.warn("Lives UI element or player not found.");
    }
  }

  updateDifficultyUI() {
    if (this.difficultyElement) {
      this.difficultyElement.textContent = `Level: ${this.difficultyLevel}`;
    } else {
      // console.warn("Difficulty UI element not found.");
    }
  }

  updatePowerUpStatus(text = "") {
    // Default to empty string
    if (this.powerupStatusElement) {
      // Only display status if game is not over, otherwise ensure it's clear
      this.powerupStatusElement.textContent = this.isGameOver ? "" : text;
    } else {
      // console.warn("Powerup Status UI element not found.");
    }
  }
  // --- Game State Methods ---
  gameOver() {
    // Prevent multiple calls and ensure game isn't already over
    if (!this.isGameOver) {
      console.log("--- GAME OVER ---");
      this.isGameOver = true; // Set game over flag

      // Show the game over screen
      if (this.gameOverElement) {
        this.gameOverElement.style.display = "block"; // Use block or flex depending on CSS
      } else {
        console.error("Game Over UI element not found!");
      }

      playSound("gameOver"); // Play sound
      this.updatePowerUpStatus(""); // Clear any active power-up text
      if (this.livesElement) {
        // Remove low-lives warning if present
        this.livesElement.classList.remove("low-lives");
      }
      // Note: The game loop will stop itself because isGameOver is true
    }
  }

  // --- NEW Method to be called by Boss1 ---
  /** Resets the spawn timer for Boss 1's helper planes. */
  resetBoss1HelperSpawnTimer() {
    this.boss1HelperPlaneTimer = -(this.boss1HelperPlaneBaseInterval * 0.5); // Start with a half-interval delay? Or just 0?
    console.log("Game: Resetting Boss 1 helper plane spawn timer.");
  }

  spawnBoss2HelperShips(count = 1, type = "shooter") {
    console.log(
      `GAME: Spawning ${count} Boss 2 helper ship(s) of type ${type}`
    );
    for (let i = 0; i < count; i++) {
      let ship = null;
      const speedBoost = this.difficultyLevel * 0.1;
      if (type === "tracking") {
        ship = new EnemyTrackingShip(this, speedBoost);
      } else {
        ship = new EnemyShooterShip(this, speedBoost);
      }
      if (ship) {
        ship.y -= i * 15;
        ship.x = this.width + 50 + i * 80;
        this.enemies.push(ship);
      }
    }
  }

  // --- Modified triggerSuperBombEffect (Now ONLY hits ships) ---
  triggerSuperBombEffect() {
    console.log("GAME: Triggering Super Bomb SHIP Effect!");
    const shipDamage = 25; // Enough to kill most ships
    const planeDamage = 1;

    this.enemies.forEach((enemy) => {
      if (
        enemy.markedForDeletion ||
        enemy instanceof Boss1 ||
        enemy instanceof Boss2 ||
        enemy instanceof Boss3Ship ||
        enemy instanceof Boss3Plane
      ) {
        return; // Skip bosses and dying enemies
      }
      // Check if it's a ship type
      if (
        enemy instanceof EnemyShip ||
        enemy instanceof EnemyShooterShip ||
        enemy instanceof EnemyTrackingShip ||
        enemy instanceof EnemyBeamShip
      ) {
        console.log(
          ` -> Super Bomb water effect hitting SHIP: ${enemy.id} (${enemy.constructor.name})`
        );
        enemy.hit(shipDamage, "bomb"); // Apply the reduced damage
        // Still create an explosion near the ship for visual feedback
        this.createExplosion(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
          "ship"
        );
      }
      // Optionally damage planes too
      else if (
        enemy instanceof EnemyPlane ||
        enemy instanceof EnemyShooterPlane ||
        enemy instanceof EnemyDodgingPlane ||
        enemy instanceof EnemyMineLayerPlane
      ) {
        // console.log(` -> Super Bomb water effect hitting PLANE: ${enemy.id} (${enemy.constructor.name})`); // Optional log
        enemy.hit(planeDamage, "bomb");
        // Maybe no explosion for planes hit by water effect? Or keep tiny?
        // this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'tiny');
      }
    });

    // Add screen flash or large water visual effect here?
    // this.triggerScreenFlash('rgba(255, 255, 100, 0.6)', 200);
  }

  // --- Powerup Creation Method ---
  createPowerUp(x, y, originType = "air") {
    const rand = Math.random();
    let PowerUpClass = null; // Use null initially

    // --- Adjust chances if needed ---
    const shieldChance = 0.15;
    const spreadChance = 0.15;
    const lifeChance = 0.07;
    const bulletChance = 0.15;
    const bombChance = 0.15;
    const rapidFireChance = 0.12;
    const invincibilityChance = 0.11;
    const superBombChance = 0.1; // Adjusted back slightly? Or keep high for testing?

    if (rand < shieldChance) {
      PowerUpClass = PowerUpShield;
    } else if (rand < shieldChance + spreadChance) {
      PowerUpClass = PowerUpSpreadShot;
    } else if (
      rand < shieldChance + spreadChance + lifeChance &&
      this.player &&
      this.player.lives < this.player.maxLives
    ) {
      // Only drop life if player not at max lives
      PowerUpClass = PowerUpExtraLife;
    } else if (rand < shieldChance + spreadChance + lifeChance + bulletChance) {
      PowerUpClass = PowerUpBullet;
    } else if (
      rand <
      shieldChance + spreadChance + lifeChance + bulletChance + bombChance
    ) {
      PowerUpClass = PowerUpBomb;
      // >>> NEW Checks <<<
    } else if (
      rand <
      shieldChance +
        spreadChance +
        lifeChance +
        bulletChance +
        bombChance +
        rapidFireChance
    ) {
      PowerUpClass = PowerUpRapidFire;
    } else if (
      rand <
      shieldChance +
        spreadChance +
        lifeChance +
        bulletChance +
        bombChance +
        rapidFireChance +
        invincibilityChance
    ) {
      PowerUpClass = PowerUpInvincibility;
    } // >>> NEW Check <<<
    else if (
      rand <
      shieldChance +
        spreadChance +
        lifeChance +
        bulletChance +
        bombChance +
        rapidFireChance +
        invincibilityChance +
        superBombChance
    ) {
      PowerUpClass = PowerUpSuperBomb; // Spawn the super bomb pickup
    }
    // Else: No powerup
    // Else: No powerup drops for the remaining probability range

    if (PowerUpClass) {
      console.log(`Spawning PowerUp: ${PowerUpClass.name}`); // Log which type
      this.powerUps.push(new PowerUpClass(this, x, y, originType));
    } else {
      // console.log("No power-up dropped this time."); // Optional log
    }
  }
  drawGameOver() {
    if (!this.context) return;
    this.context.fillStyle = "rgba(0,0,0,0.5)";
    this.context.fillRect(0, 0, this.width, this.height);
  }

  // --- >>> NEW Level Initialization Method <<< ---
  /**
   * Initializes or resets the game state based on configuration.
   * @param {object} [config={}] - Configuration object.
   * @param {number} [config.startScore=0] - The score to start with.
   * @param {number} [config.startDifficulty=0] - The difficulty level to start at.
   * @param {number} [config.playerLives=3] - Starting lives for the player.
   * @param {number[]} [config.defeatedBosses=[]] - Array of boss numbers already defeated (e.g., [1, 2]).
   * @param {string[]} [config.startWithPowerups=[]] - Array of powerup names ('shield', 'spread', 'bullet', 'bomb', 'rapid', 'invincibility').
   */
  initializeLevel(config = {}) {
    console.log(`--- Initializing Level --- Config:`, JSON.stringify(config));

    // Default configuration for a normal start (Level 0)
    const defaults = {
      startScore: 0,
      startDifficulty: 0,
      playerLives: 3, // Default normal lives from Player constructor
      defeatedBosses: [],
      startWithPowerups: [],
    };
    // Get player's default starting lives if player exists
    if (this.player) {
      defaults.playerLives = this.player.initialLives || 3;
    }

    // Merge provided config with defaults
    const effectiveConfig = { ...defaults, ...config };

    // --- Reset Core Game State Based on Config ---
    this.isGameOver = false;
    this.lastTime = 0;
    this.score = effectiveConfig.startScore;
    this.difficultyLevel = effectiveConfig.startDifficulty;

    // Calculate score needed for the *next* level based on starting level
    this.scoreForNextLevel = 300; // Start calculation from base
    for (let i = 0; i < this.difficultyLevel; i++) {
      // This formula should match updateDifficulty exactly
      this.scoreForNextLevel += 300 + i ** 2 * 50;
    }
    console.log(
      `   Level initialized to ${this.difficultyLevel}, Score ${this.score}, Next Level @ ${this.scoreForNextLevel}`
    );

    // --- Reset Player State ---
    if (this.player) {
      this.player.initialLives = effectiveConfig.playerLives; // Set desired starting lives
      this.player.reset(); // Resets to initialLives, clears powerups etc.
      console.log(`   Player reset with ${this.player.lives} lives.`);

      // Apply starting powerups if any
      if (effectiveConfig.startWithPowerups.length > 0)
        console.log(
          `   Applying starting powerups: ${effectiveConfig.startWithPowerups.join(
            ", "
          )}`
        );
      effectiveConfig.startWithPowerups.forEach((powerupName) => {
        switch (powerupName.toLowerCase()) {
          case "shield":
            this.player.activateShield();
            break;
          case "spread":
            this.player.activateSpreadShot();
            break;
          case "bullet":
            this.player.activateBulletPowerUp();
            break;
          case "bomb":
            this.player.activateBombPowerUp();
            break;
          case "rapid":
            this.player.activateRapidFire();
            break;
          case "invincibility":
            this.player.activateInvincibilityPowerUp();
            break;
          default:
            console.warn(
              `   Unknown starting powerup specified: ${powerupName}`
            );
        }
      });
    } else {
      console.error("INIT LEVEL Error: Player object does not exist!");
      return;
    }

    // --- Clear Dynamic Object Arrays ---
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.explosions = [];
    this.powerUps = [];

    // --- Reset Spawning Timers ---
    this.enemyPlaneTimer = 0;
    this.enemyShipTimer = 0;
    this.boss1HelperPlaneTimer = 0;
    this.bossPowerUpTimer = 0;
    // Reset boss powerup interval to default (spawnBoss will override if needed)
    this.bossPowerUpInterval =
      this.defaultBossPowerUpBaseInterval +
      Math.random() * this.defaultBossPowerUpRandomInterval;

    // --- Reset Boss State Based on Config ---
    this.bossActive = false;
    this.currentBossInstance = null;
    this.currentBossNumber = null;
    this.boss3Ship = null;
    this.boss3Plane = null;
    this.currentBoss = null;
    this.boss1Defeated = effectiveConfig.defeatedBosses.includes(1);
    this.boss2Defeated = effectiveConfig.defeatedBosses.includes(2);
    this.boss3Defeated = effectiveConfig.defeatedBosses.includes(3);
    console.log(
      `   Boss Defeated Flags Set: B1=${this.boss1Defeated}, B2=${this.boss2Defeated}, B3=${this.boss3Defeated}`
    );

    // --- Update UI to reflect initial state ---
    this.updateUI();

    // --- Hide Game Over Screen ---
    if (this.gameOverElement) {
      this.gameOverElement.style.display = "none";
    }

    console.log("--- Level Initialization Complete ---");
  }
  // --- >>> END initializeLevel Method <<< ---

  // --- Start method calls initializeLevel ---
  /**
   * Starts the game with a given configuration.
   * @param {object} [startConfig={}] - Optional configuration object passed to initializeLevel.
   */
  start(startConfig = {}) {
    console.log("Game Starting...");
    this.initializeLevel(startConfig); // Initialize with config (or defaults if empty)
    // Start the Main Game Loop
    console.log("DEBUG: START - Requesting first animation frame.");
    if (!this.isGameOver) {
      // Only request frame if not already ended by init error
      requestAnimationFrame(this.loop.bind(this));
    }
  } // End of start method

  // --- Restart method calls initializeLevel with defaults ---
  /**
   * Restarts the game from the beginning (Level 0, Score 0).
   */
  restart() {
    console.log("--- Restarting Game (using default config) ---");
    // Pass empty config to use defaults (score 0, level 0, lives 3, bosses false)
    this.initializeLevel({});
    // Reset specific boss references just in case
    this.currentBossInstance = null;
    this.currentBossNumber = null;
    this.boss3Ship = null;
    this.boss3Plane = null;
    if (!this.isGameOver) {
      requestAnimationFrame(this.loop.bind(this));
    } else {
      console.warn("Restart called but game loop wasn't stopped?");
      requestAnimationFrame(this.loop.bind(this));
    }
  }
}
