import { InputHandler } from "./input.js";
import { Player } from "./player.js";
import { Background } from "./background.js";
import { EnemyPlane } from "./enemyPlane.js";
import { EnemyShip } from "./enemyShip.js";
import { EnemyShooterPlane } from "./enemyShooterPlane.js";
import { EnemyShooterShip } from "./enemyShooterShip.js";
import { EnemyDodgingPlane } from "./enemyDodgingPlane.js";
import { EnemyTrackingShip } from "./enemyTrackingShip.js";
import { EnemyMineLayerPlane } from "./enemyMineLayerPlane.js";
import { Mine } from "./mine.js";
import { EnemyBeamShip } from "./enemyBeamShip.js";
import { Explosion } from "./explosion.js";
import { PowerUpShield } from "./powerUpShield.js";
import { PowerUpSpreadShot } from "./powerUpSpreadShot.js";
import { PowerUpExtraLife } from "./powerUpExtraLife.js";
import { PowerUpBullet } from "./powerUpBullet.js";
import { PowerUpBomb } from "./powerUpBomb.js";
import { PowerUpRapidFire } from "./powerUpRapidFire.js";
import { PowerUpInvincibility } from "./powerUpInvincibility.js";
import { SuperBomb } from "./superBomb.js";
import { PowerUpSuperBomb } from "./powerUpSuperBomb.js";
import { Boss1 } from "./boss1.js";
import { Boss2 } from "./boss2.js";
import { Boss3Ship } from "./boss3Ship.js";
import { Boss3Plane } from "./boss3Plane.js";
import { checkCollision } from "./utils.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js";

export class Game {
  constructor(canvasId, width, height) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas)
      throw new Error(`FATAL: Canvas element ID="${canvasId}" NOT FOUND.`);

    // --- Set fixed dimensions and get context ---
    this.width = width;
    this.height = height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;
    this.context = this.canvas.getContext("2d");

    // --- >>> ADD SEA LEVEL DEFINITION <<< ---
    // Example: Sea starts at 40% down the screen (60% sea area)
    this.seaLevelY = this.height * 0.7;
    // Example: Sea starts at 30% down the screen (70% sea area)
    // this.seaLevelY = this.height * 0.30;

    // --- >>> END ADD <<< ---

    if (!this.context) throw new Error("FATAL: Failed to get 2D context.");

    // --- Initialize properties ---
    this.lastTime = 0;
    this.isGameOver = false; // Game state flag
    this.isGameWon = false; // <<< NEW: Game Won state flag
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.explosions = [];
    this.powerUps = [];
    this.baseEnemyPlaneInterval = 2000;
    this.baseEnemyShipInterval = 6000;
    this.boss1HelperPlaneBaseInterval = 1800;
    this.boss1HelperPlaneRandomInterval = 600;
    this.powerUpDropChance = 0.1;

    // Boss 3 Reinforcement State & Timers
    this.isSpawningPlaneHelpers = false;
    this.helperPlaneSpawnTimer = 0;
    this.helperPlaneSpawnInterval = 3500;
    this.isSpawningShipHelpers = false;
    this.helperShipSpawnTimer = 0;
    this.helperShipSpawnInterval = 4500;

    // Power-up Timers
    this.defaultBossPowerUpBaseInterval = 15000;
    this.defaultBossPowerUpRandomInterval = 5000;
    this.boss2PowerUpBaseInterval = 9000;
    this.boss2PowerUpRandomInterval = 3000;

    // Score thresholds
    this.BOSS1_SCORE_THRESHOLD = 1800; // Example: Higher than 800, lower than 2500
    this.BOSS2_SCORE_THRESHOLD = 6500; // Example: Higher than 5000, lower than 9000
    this.BOSS3_SCORE_THRESHOLD = 15000; // Example: Higher than 14000, lower than 18000

    // --- Initialize properties reset by initializeLevel ---
    this.score = 0;
    this.difficultyLevel = 0;
    this.scoreForNextLevel = 300;
    this.enemyPlaneTimer = 0;
    this.enemyShipTimer = 0;
    this.boss1HelperPlaneTimer = 0;
    this.bossActive = false;
    this.currentBossInstance = null;
    this.currentBossNumber = null;
    this.boss3Ship = null;
    this.boss3Plane = null;
    this.boss1Defeated = false;
    this.boss2Defeated = false;
    this.boss3Defeated = false; // Key flag for winning
    this.bossPowerUpTimer = 0;
    this.bossPowerUpInterval =
      this.defaultBossPowerUpBaseInterval +
      Math.random() * this.defaultBossPowerUpRandomInterval;

    // --- Initialize Core Components ---
    try {
      this.input = new InputHandler(this);
      this.background = new Background(this.width, this.height);
      this.background.setGame(this); // <<< ADD THIS LINE

      this.background.game = this;
      this.player = new Player(this);
    } catch (error) {
      console.error("Error initializing core components:", error);
      throw error;
    }

    // --- Get UI Elements ---
    this.scoreElement = document.getElementById("score");
    this.livesElement = document.getElementById("lives");
    this.difficultyElement = document.getElementById("difficulty-level");
    this.powerupStatusElement = document.getElementById("powerup-status");
    this.gameOverElement = document.getElementById("game-over");
    this.restartButton = document.getElementById("restartButton");
    // --- >>> GET NEW UI ELEMENTS <<< ---
    this.gameWonElement = document.getElementById("game-won");
    this.finalScoreWonElement = document.getElementById("final-score-won");
    this.restartButtonWon = document.getElementById("restartButtonWon");
    // --- >>> END GET <<< ---

    // --- Setup Event Listeners ---
    if (this.restartButton) {
      this.restartButton.addEventListener("click", this.restart.bind(this));
    } else {
      console.error("Restart button (Game Over) not found!");
    }

    // --- >>> ADD LISTENER FOR NEW BUTTON <<< ---
    if (this.restartButtonWon) {
      this.restartButtonWon.addEventListener("click", this.restart.bind(this));
    } else {
      console.error("Restart button (Game Won) not found!");
    }
    // --- >>> END ADD <<< ---

    // --- (Optional but recommended) Add a sound for winning ---
    // Make sure you have a 'gameWon.wav' or similar in your sounds folder
    playSound("gameWon", "sounds/gameWon.wav"); // Adjust path/filename if needed
  } // End Constructor

  // --- Main Game Loop ---
  loop(timestamp) {
    // --- >>> ADD CHECK FOR GAME WON <<< ---
    if (this.isGameWon) {
      this.drawGameWon(); // Keep drawing overlay if game is won
      return; // Stop the loop
    }
    // --- >>> END ADD <<< ---

    // Check game over state (existing check)
    if (this.isGameOver) {
      this.drawGameOver(); // Keep drawing overlay if game is over
      return; // Stop the loop
    }

    // DeltaTime Calculation
    const currentTime = performance.now ? performance.now() : timestamp;
    const MAX_DELTA_TIME_MS = 100;
    let deltaTime = 0;
    if (this.lastTime > 0) {
      deltaTime = currentTime - this.lastTime;
      deltaTime = Math.max(0.1, Math.min(MAX_DELTA_TIME_MS, deltaTime));
    } else {
      deltaTime = 16.67;
    }
    this.lastTime = currentTime;

    // --- ====== GAME LOGIC START ====== ---
    try {
      // 1. Clear Canvas
      this.context.clearRect(0, 0, this.width, this.height);

      // 2. Update All Game Objects
      this.background.update(deltaTime, this.score);
      this.player.update(this.input, deltaTime);
      [
        ...this.projectiles,
        ...this.enemyProjectiles,
        ...this.enemies,
        ...this.explosions,
        ...this.powerUps,
      ].forEach((obj) => {
        if (obj && typeof obj.update === "function") {
          obj.update(deltaTime);
        } else {
          // console.warn("Update loop encountered invalid object:", obj);
        }
      });

      // Timed Boss Power-up Logic
      if (this.bossActive) {
        this.bossPowerUpTimer += deltaTime;
        if (this.bossPowerUpTimer >= this.bossPowerUpInterval) {
          this.bossPowerUpTimer = 0; // Reset timer
          let baseInterval, randomInterval;
          if (this.currentBossNumber === 2) {
            baseInterval = this.boss2PowerUpBaseInterval;
            randomInterval = this.boss2PowerUpRandomInterval;
          } else {
            baseInterval = this.defaultBossPowerUpBaseInterval;
            randomInterval = this.defaultBossPowerUpRandomInterval;
          }
          this.bossPowerUpInterval =
            baseInterval + Math.random() * randomInterval;

          const spawnX = Math.random() * (this.width * 0.7) + this.width * 0.1;
          const spawnY = 50 + Math.random() * 50;

          this.createPowerUp(spawnX, spawnY, "air");
        }
      }

      // 3. Game State Checks & Spawning
      this.updateDifficulty();
      this.handleBossState(); // Checks for spawning/completion
      this.handleSpawning(deltaTime); // Handles regular and boss helper spawns

      // 4. Collisions
      this.handleCollisions();

      // --- 5. Draw Everything ---
      if (!this.context) {
        throw new Error("Context lost before drawing phase!");
      }
      this.background.draw(this.context);
      this.powerUps.forEach((pu) => pu.draw(this.context));
      this.enemies.forEach((e) => {
        if (e && typeof e.draw === "function") e.draw(this.context);
      });
      this.enemyProjectiles.forEach((ep) => ep.draw(this.context));
      this.player.draw(this.context);
      this.projectiles.forEach((p) => p.draw(this.context));
      this.explosions.forEach((ex) => ex.draw(this.context));

      // --- 6. Cleanup ---
      this.cleanupObjects();
    } catch (error) {
      console.error("ERROR during game loop:", error);
      this.isGameOver = true; // Trigger game over state on error
      this.drawGameOver(); // Attempt to draw overlay
      return; // Stop the loop on error
    }

    // Request next frame ONLY if game is not over or won
    if (!this.isGameOver && !this.isGameWon) {
      // <<< MODIFIED CONDITION
      requestAnimationFrame(this.loop.bind(this));
    } else {
    }
  } // End loop

  // --- Game State and Boss Handling ---
  handleBossState() {
    // Check for Spawning a NEW Boss Fight
    if (!this.bossActive) {
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
    }
    // Check for Boss Fight Progression / Completion
    else {
      // Handle Boss 3 Specific State
      if (this.currentBossNumber === 3) {
        const shipExistsAndActive =
          this.boss3Ship && !this.boss3Ship.markedForDeletion;
        const planeExistsAndActive =
          this.boss3Plane && !this.boss3Plane.markedForDeletion;

        // Trigger SHIP reinforcements
        if (
          !shipExistsAndActive &&
          planeExistsAndActive &&
          !this.isSpawningShipHelpers
        ) {
          this.isSpawningShipHelpers = true;
          this.helperShipSpawnTimer = 0;
          this.isSpawningPlaneHelpers = false;
        }
        // Trigger PLANE reinforcements
        else if (
          !planeExistsAndActive &&
          shipExistsAndActive &&
          !this.isSpawningPlaneHelpers
        ) {
          this.isSpawningPlaneHelpers = true;
          this.helperPlaneSpawnTimer = 0;
          this.isSpawningShipHelpers = false;
        }
        // Check for COMPLETE Boss 3 Defeat
        if (
          !shipExistsAndActive &&
          !planeExistsAndActive &&
          !this.boss3Defeated
        ) {
          this.bossDefeated(3); // Signal Boss 3 encounter is over
        }
      }
      // Handle Boss 1 or Boss 2 Defeat
      else if (
        this.currentBossInstance &&
        this.currentBossInstance.markedForDeletion
      ) {
        this.bossDefeated(this.currentBossNumber); // Signal defeat for Boss 1 or 2
      }
    } // End else (bossActive)
  } // End handleBossState

  spawnBoss(bossNumber) {
    if (this.bossActive) {
      console.warn(
        `Attempted to spawn Boss ${bossNumber} while boss already active.`
      );
      return;
    }

    this.bossActive = true;
    this.currentBossNumber = bossNumber;

    // Clear regular enemies/projectiles
    this.enemies = [];
    this.enemyProjectiles = [];

    // Boss 3 Specific Spawning
    if (bossNumber === 3) {
      try {
        this.boss3Ship = new Boss3Ship(this);
        this.boss3Plane = new Boss3Plane(this);
        this.enemies.push(this.boss3Ship);
        this.enemies.push(this.boss3Plane);
        this.currentBossInstance = null; // No single instance for B3
      } catch (error) {
        console.error(`ERROR Instantiating Boss 3 Components:`, error);
        this.bossActive = false;
        this.currentBossNumber = null;
        this.boss3Ship = null;
        this.boss3Plane = null;
        return;
      }
    }
    // Spawning for Boss 1 or 2
    else {
      let bossInstance = null;
      try {
        if (bossNumber === 1) {
          bossInstance = new Boss1(this);
        } else if (bossNumber === 2) {
          bossInstance = new Boss2(this);
        }
      } catch (error) {
        console.error(`Error instantiating Boss ${bossNumber}:`, error);
        this.bossActive = false;
        this.currentBossNumber = null;
        return;
      }

      if (bossInstance) {
        this.enemies.push(bossInstance);
        this.currentBossInstance = bossInstance;
        this.boss3Ship = null;
        this.boss3Plane = null; // Ensure B3 refs are null
      } else {
        console.error(`Unknown boss number ${bossNumber} to spawn.`);
        this.bossActive = false;
        this.currentBossNumber = null;
        return;
      }
    }

    // Set Initial power-up interval
    this.bossPowerUpTimer = 0;
    let baseInterval, randomInterval;
    if (bossNumber === 2) {
      baseInterval = this.boss2PowerUpBaseInterval;
      randomInterval = this.boss2PowerUpRandomInterval;
    } else {
      baseInterval = this.defaultBossPowerUpBaseInterval;
      randomInterval = this.defaultBossPowerUpRandomInterval;
    }
    this.bossPowerUpInterval = baseInterval + Math.random() * randomInterval;
  }

  bossDefeated(bossNumber) {
    // Prevent multiple calls
    if (
      !this.bossActive &&
      ((bossNumber === 1 && this.boss1Defeated) ||
        (bossNumber === 2 && this.boss2Defeated) ||
        (bossNumber === 3 && this.boss3Defeated))
    ) {
      // console.warn(`bossDefeated(${bossNumber}) called redundantly.`); // Optional warning
      return;
    }

    // Set the specific defeated flag
    if (bossNumber === 1) {
      this.boss1Defeated = true;
    } else if (bossNumber === 2) {
      this.boss2Defeated = true;
    } else if (bossNumber === 3) {
      this.boss3Defeated = true;
    } // <<< Mark Boss 3 as done

    // Reset general boss state
    this.bossActive = false;
    this.currentBossInstance = null;
    this.currentBossNumber = null;
    this.boss3Ship = null;
    this.boss3Plane = null;
    this.isSpawningPlaneHelpers = false;
    this.isSpawningShipHelpers = false;

    // Drop powerups
    const numPowerups = bossNumber === 1 ? 3 : bossNumber === 2 ? 4 : 5;
    const dropX = this.width / 2; // Center drop area
    const dropY = 100;

    for (let i = 0; i < numPowerups; i++) {
      this.createPowerUp(
        dropX + (Math.random() - 0.5) * 150,
        dropY + (Math.random() - 0.5) * 40,
        "air"
      );
    }

    // Resume normal spawning timers
    this.enemyPlaneTimer = 0;
    this.enemyShipTimer = 0;
    if (bossNumber === 1) this.boss1HelperPlaneTimer = 0; // Reset B1 helper timer specifically

    // --- >>> TRIGGER GAME WON CHECK <<< ---
    if (bossNumber === 3) {
      // Delay slightly to let defeat animations/sounds play out?
      setTimeout(() => {
        this.gameWon(); // Call the game won method
      }, 1500); // Example 1.5 second delay
    }
    // --- >>> END TRIGGER <<< ---
  } // End bossDefeated

  // --- >>> NEW gameWon Method <<< ---
  gameWon() {
    if (this.isGameWon || this.isGameOver) {
      return;
    }
    this.isGameWon = true; // Set the flag

    // Optional: Clear remaining entities
    // this.enemies = []; this.projectiles = []; this.enemyProjectiles = [];

    // Update final score display
    if (this.finalScoreWonElement) {
      this.finalScoreWonElement.textContent = `Final Score: ${this.score}`;
    } else {
      console.error("Final Score Won UI element not found!");
    }

    // Show the game won screen overlay
    if (this.gameWonElement) {
      this.gameWonElement.style.display = "block";
    } else {
      console.error("Game Won UI element not found!");
    }

    playSound("gameWon"); // Play victory sound
    this.updatePowerUpStatus(""); // Clear power-up text
    if (this.livesElement) {
      this.livesElement.classList.remove("low-lives");
    }
  }
  // --- >>> END gameWon Method <<< ---

  // --- Spawning ---
  handleSpawning(deltaTime) {
    // SECTION 1: BOSS ACTIVE SPAWNING
    if (this.bossActive) {
      // 1a. Boss 1 Helper Spawns
      if (
        this.currentBossNumber === 1 &&
        this.currentBossInstance &&
        this.currentBossInstance.activeWeakPoints <= 2 &&
        this.currentBossInstance.activeWeakPoints > 0
      ) {
        this.boss1HelperPlaneTimer -= deltaTime;
        if (this.boss1HelperPlaneTimer <= 0) {
          this.boss1HelperPlaneTimer =
            this.boss1HelperPlaneBaseInterval +
            Math.random() * this.boss1HelperPlaneRandomInterval;
          const speedBoost = this.difficultyLevel * 0.2;
          let PlaneClass =
            Math.random() < 0.6 ? EnemyShooterPlane : EnemyDodgingPlane;

          this.enemies.push(new PlaneClass(this, speedBoost));
        }
      }
      // 1b. Boss 3 Helper Spawns
      else if (this.currentBossNumber === 3) {
        if (this.isSpawningPlaneHelpers) {
          this.helperPlaneSpawnTimer -= deltaTime;
          if (this.helperPlaneSpawnTimer <= 0) {
            this.spawnBoss3HelperPlanes(1, "mixed");
            this.helperPlaneSpawnTimer =
              this.helperPlaneSpawnInterval + Math.random() * 1000 - 500;
          }
        }
        if (this.isSpawningShipHelpers) {
          this.helperShipSpawnTimer -= deltaTime;
          if (this.helperShipSpawnTimer <= 0) {
            this.spawnBoss3HelperShips(1, "mixed");
            this.helperShipSpawnTimer =
              this.helperShipSpawnInterval + Math.random() * 1500 - 750;
          }
        }
      }
      return; // Prevent regular spawning
    } // End if(this.bossActive)

    // SECTION 2: REGULAR SPAWNING (No boss active)
    const speedBoost = this.difficultyLevel * 0.3;
    const minPlaneInt = 500,
      minShipInt = 1800;
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
    const rPlane = Math.random();
    const rShip = Math.random();
    const level = this.difficultyLevel;

    // Spawn Planes
    this.enemyPlaneTimer += deltaTime;
    if (this.enemyPlaneTimer >= currentPlaneInt) {
      this.enemyPlaneTimer = 0; // Reset timer more accurately
      let PlaneClass = null;
      let mineLayerChance = 0,
        dodgerChance = 0,
        shooterPlaneChance = 0.25;

      if (this.boss2Defeated && level > 4) {
        // Stage 3
        mineLayerChance = 0.15 + level * 0.03;
        dodgerChance = 0.2 + level * 0.04;
        shooterPlaneChance = 0.35 + level * 0.03;
      } else if (this.boss1Defeated && level > 1) {
        // Stage 2
        dodgerChance = 0.15 + level * 0.05;
        shooterPlaneChance = 0.3 + level * 0.05;
      } else {
        // Stage 1
        shooterPlaneChance = 0.2 + level * 0.1;
      }
      // Normalize probabilities and select class based on rPlane
      if (rPlane < mineLayerChance) PlaneClass = EnemyMineLayerPlane;
      else if (rPlane < mineLayerChance + dodgerChance)
        PlaneClass = EnemyDodgingPlane;
      else if (rPlane < mineLayerChance + dodgerChance + shooterPlaneChance)
        PlaneClass = EnemyShooterPlane;
      else PlaneClass = EnemyPlane;

      if (PlaneClass) this.enemies.push(new PlaneClass(this, speedBoost));
    } // End Plane Spawn

    // Spawn Ships
    this.enemyShipTimer += deltaTime;
    if (this.enemyShipTimer >= currentShipInt) {
      this.enemyShipTimer = 0; // Reset timer more accurately
      let ShipClass = null;
      let beamShipChance = 0,
        trackingShipChance = 0,
        shooterShipChance = 0.25;

      if (this.boss2Defeated && level > 5) {
        // Stage 3
        beamShipChance = 0.18 + level * 0.03;
        trackingShipChance = 0.2 + level * 0.04;
        shooterShipChance = 0.3 + level * 0.03;
      } else if (this.boss1Defeated && level > 1) {
        // Stage 2
        trackingShipChance = 0.15 + level * 0.05;
        shooterShipChance = 0.3 + level * 0.05;
      } else {
        // Stage 1
        shooterShipChance = 0.2 + level * 0.1;
      }
      // Normalize probabilities and select class based on rShip
      if (rShip < beamShipChance) ShipClass = EnemyBeamShip;
      else if (rShip < beamShipChance + trackingShipChance)
        ShipClass = EnemyTrackingShip;
      else if (rShip < beamShipChance + trackingShipChance + shooterShipChance)
        ShipClass = EnemyShooterShip;
      else ShipClass = EnemyShip;

      if (ShipClass) this.enemies.push(new ShipClass(this, speedBoost));
    } // End Ship Spawn
  } // End handleSpawning

  // --- Boss 3 Helper Spawning Methods ---
  spawnBoss3HelperPlanes(count = 2, type = "mixed") {
    if (!this.enemies) return;
    for (let i = 0; i < count; i++) {
      let PlaneClass = EnemyShooterPlane;
      if (type === "mixed" && Math.random() < 0.5)
        PlaneClass = EnemyDodgingPlane;
      else if (type === "dodger") PlaneClass = EnemyDodgingPlane;
      try {
        const helperPlane = new PlaneClass(this, 0.2);
        this.enemies.push(helperPlane);
      } catch (e) {
        console.error(`ERROR creating/pushing helper plane:`, e);
      }
    }
  }
  spawnBoss3HelperShips(count = 2, type = "mixed") {
    for (let i = 0; i < count; i++) {
      let ShipClass = EnemyShooterShip;
      if (type === "mixed" && Math.random() < 0.4)
        ShipClass = EnemyTrackingShip;
      else if (type === "tracking") ShipClass = EnemyTrackingShip;
      const ship = new ShipClass(this, 0.1);
      ship.x = this.width + 60 + i * 90;
      ship.y -= i * 10;
      this.enemies.push(ship);
    }
  }

  // --- Collisions ---
  handleCollisions() {
    // Player Projectiles vs Enemies
    this.projectiles.forEach((p) => {
      if (!p || p.markedForDeletion) return;
      for (let i = 0; i < this.enemies.length; i++) {
        const e = this.enemies[i];
        if (!e || e.markedForDeletion || p.markedForDeletion) continue;

        if (checkCollision(p, e)) {
          // SuperBomb direct hit vs Air Enemy
          if (
            p instanceof SuperBomb &&
            (e instanceof EnemyPlane ||
              e instanceof Boss3Plane ||
              e.enemyType === "air")
          ) {
            e.hit(p);
            p.markedForDeletion = true;
            this.createExplosion(p.x + p.width / 2, p.y + p.height / 2, "air");
          }
          // Projectile vs Boss (handled by boss .hit method)
          else if (
            e instanceof Boss1 ||
            e instanceof Boss2 ||
            e instanceof Boss3Ship ||
            e instanceof Boss3Plane
          ) {
            e.hit(p); // Pass projectile ref
          }
          // Regular projectile vs Regular enemy
          else if (!(p instanceof SuperBomb)) {
            const pType = p instanceof Bomb ? "bomb" : "bullet";
            e.hit(p.damage || 1, pType);
            // Consume non-bomb projectiles, or bombs hitting valid targets
            if (
              pType !== "bomb" ||
              e.enemyType === "ship" ||
              e.enemyType === "ground_installation"
            ) {
              p.markedForDeletion = true;
            }
          }
          // If projectile was consumed, stop checking it against other enemies
          if (p.markedForDeletion) break;
        }
      }
    });

    // Player vs Enemy Projectiles (and Mines)
    this.enemyProjectiles.forEach((ep) => {
      if (!ep || ep.markedForDeletion) return;
      if (checkCollision(this.player, ep)) {
        if (this.player.shieldActive) {
          ep.markedForDeletion = true;
          this.player.deactivateShield(true);
          this.createExplosion(
            ep.x + ep.width / 2,
            ep.y + ep.height / 2,
            "tiny"
          );
          return;
        }
        if (this.player.invincible) {
          // Maybe destroy projectiles but not mines?
          if (!(ep instanceof Mine)) {
            ep.markedForDeletion = true;
            this.createExplosion(
              ep.x + ep.width / 2,
              ep.y + ep.height / 2,
              "tiny"
            );
          }
          return;
        }
        // Player hit
        ep.markedForDeletion = true;
        const explosionType = ep instanceof Mine ? "ground" : "tiny";
        const sound = ep instanceof Mine ? "explosion" : null; // Only special sound for mine
        this.createExplosion(
          ep.x + ep.width / 2,
          ep.y + ep.height / 2,
          explosionType
        );
        if (sound) playSound(sound);
        this.player.hit();
      }
    });

    // Player vs Enemies (Collision Damage)
    if (!this.player.shieldActive && !this.player.invincible) {
      this.enemies.forEach((e) => {
        if (!e || e.markedForDeletion) return;
        if (checkCollision(this.player, e)) {
          let playerTakesDamage = false;
          // Boss collision
          if (
            e instanceof Boss1 ||
            e instanceof Boss2 ||
            e instanceof Boss3Ship ||
            e instanceof Boss3Plane
          ) {
            playerTakesDamage = true;
            // Optionally damage boss slightly: e.hit(1, 'collision');
          }
          // Regular enemy collision
          else if (e.enemyType !== "ground_installation") {
            e.hit(100, "collision"); // Destroy regular enemy
            playerTakesDamage = true;
          }
          // Apply damage to player if applicable
          if (playerTakesDamage) {
            this.player.hit(); // Player takes damage, gets invincibility
          }
        }
      });
    }

    // Player vs PowerUps
    this.powerUps.forEach((pu) => {
      if (!pu || pu.markedForDeletion) return;
      if (checkCollision(this.player, pu)) {
        pu.activate(this.player); // PowerUp handles its own activation/deletion
      }
    });
  } // End handleCollisions

  // --- Cleanup and Effects ---
  cleanupObjects() {
    let superBombsHitWater = [];
    this.projectiles = this.projectiles.filter((p) => {
      if (p.markedForDeletion) {
        if (p instanceof SuperBomb && p.hitWater) {
          superBombsHitWater.push(p);
          this.createExplosion(
            p.x + p.width / 2,
            p.y + p.height / 2 - 10,
            "waterSplash"
          );
          playSound("splash");
        }
        return false;
      }
      return true;
    });

    if (superBombsHitWater.length > 0) {
      this.triggerSuperBombEffect();
    }

    this.enemyProjectiles = this.enemyProjectiles.filter(
      (o) => !o.markedForDeletion
    );
    this.enemies = this.enemies.filter((o) => !o.markedForDeletion);
    this.explosions = this.explosions.filter((o) => !o.markedForDeletion);
    this.powerUps = this.powerUps.filter((o) => !o.markedForDeletion);
  }

  spawnBoss2HelperShips(count = 1, type = "shooter") {
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

  triggerSuperBombEffect() {
    const shipDamage = 25;
    const planeDamage = 1;
    this.enemies.forEach((enemy) => {
      if (
        enemy.markedForDeletion ||
        enemy instanceof Boss1 ||
        enemy instanceof Boss2 ||
        enemy instanceof Boss3Ship ||
        enemy instanceof Boss3Plane
      )
        return;
      // Hit Ships
      if (
        enemy instanceof EnemyShip ||
        enemy instanceof EnemyShooterShip ||
        enemy instanceof EnemyTrackingShip ||
        enemy instanceof EnemyBeamShip
      ) {
        enemy.hit(shipDamage, "bomb");
        this.createExplosion(
          enemy.x + enemy.width / 2,
          enemy.y + enemy.height / 2,
          "ship"
        );
      }
      // Hit Planes (optional)
      else if (
        enemy instanceof EnemyPlane ||
        enemy instanceof EnemyShooterPlane ||
        enemy instanceof EnemyDodgingPlane ||
        enemy instanceof EnemyMineLayerPlane
      ) {
        enemy.hit(planeDamage, "bomb");
        // this.createExplosion(enemy.x + enemy.width / 2, enemy.y + enemy.height / 2, 'tiny'); // Optional explosion
      }
    });
  }

  // --- Helper Methods ---
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
    this.updateScoreUI();
    this.updateLivesUI();
    this.updateDifficultyUI();
    this.updatePowerUpStatus("");
  }
  updateScoreUI() {
    if (this.scoreElement)
      this.scoreElement.textContent = `Score: ${this.score}`;
  }
  updateLivesUI() {
    if (this.livesElement && this.player) {
      this.livesElement.textContent = `Lives: ${this.player.lives}`;
      this.livesElement.classList.toggle("low-lives", this.player.lives <= 1);
    }
  }
  updateDifficultyUI() {
    if (this.difficultyElement)
      this.difficultyElement.textContent = `Level: ${this.difficultyLevel}`;
  }
  updatePowerUpStatus(text = "") {
    if (this.powerupStatusElement)
      this.powerupStatusElement.textContent =
        this.isGameOver || this.isGameWon ? "" : text;
  } // Clear on win too
  updateDifficulty() {
    if (
      !this.isGameOver &&
      !this.isGameWon &&
      this.score >= this.scoreForNextLevel
    ) {
      // Check win flag too
      this.difficultyLevel++;
      this.scoreForNextLevel += 300 + this.difficultyLevel ** 2 * 50;
      this.updateDifficultyUI();
      this.powerUpDropChance = Math.min(
        0.25,
        0.1 + this.difficultyLevel * 0.015
      );
    }
  }

  // --- Powerup Creation ---
  createPowerUp(x, y, originType = "air") {
    const rand = Math.random();
    let PowerUpClass = null;
    const chances = {
      shield: 0.15,
      spread: 0.15,
      life: 0.07,
      bullet: 0.15,
      bomb: 0.15,
      rapid: 0.12,
      invincibility: 0.11,
      superBomb: 0.1,
    };
    let cumulative = 0;

    if (rand < (cumulative += chances.shield)) PowerUpClass = PowerUpShield;
    else if (rand < (cumulative += chances.spread))
      PowerUpClass = PowerUpSpreadShot;
    else if (
      rand < (cumulative += chances.life) &&
      this.player &&
      this.player.lives < this.player.maxLives
    )
      PowerUpClass = PowerUpExtraLife;
    else if (rand < (cumulative += chances.bullet))
      PowerUpClass = PowerUpBullet;
    else if (rand < (cumulative += chances.bomb)) PowerUpClass = PowerUpBomb;
    else if (rand < (cumulative += chances.rapid))
      PowerUpClass = PowerUpRapidFire;
    else if (rand < (cumulative += chances.invincibility))
      PowerUpClass = PowerUpInvincibility;
    else if (rand < (cumulative += chances.superBomb))
      PowerUpClass = PowerUpSuperBomb;

    if (PowerUpClass) {
      this.powerUps.push(new PowerUpClass(this, x, y, originType));
    }
  }

  // --- Game State Methods ---
  gameOver() {
    if (!this.isGameOver && !this.isGameWon) {
      // Don't trigger if already won

      this.isGameOver = true;
      if (this.gameOverElement) this.gameOverElement.style.display = "block";
      else console.error("Game Over UI element not found!");
      playSound("gameOver");
      this.updatePowerUpStatus("");
      if (this.livesElement) this.livesElement.classList.remove("low-lives");
    }
  }

  drawGameOver() {
    if (!this.context) return;
    this.context.fillStyle = "rgba(0,0,0,0.5)";
    this.context.fillRect(0, 0, this.width, this.height);
  }

  // --- >>> NEW drawGameWon Method <<< ---
  drawGameWon() {
    if (!this.context) return;
    // Optional: Draw something on canvas behind the HTML overlay
    // this.context.fillStyle = "rgba(50, 100, 200, 0.5)";
    // this.context.fillRect(0, 0, this.width, this.height);
  }
  // --- >>> END drawGameWon Method <<< ---

  // --- Level Initialization / Start / Restart ---
  initializeLevel(config = {}) {
    const defaults = {
      startScore: 0,
      startDifficulty: 0,
      playerLives: 3,
      defeatedBosses: [],
      startWithPowerups: [],
    };
    if (this.player) defaults.playerLives = this.player.initialLives || 3;
    const effectiveConfig = { ...defaults, ...config };

    // Reset flags
    this.isGameOver = false;
    this.isGameWon = false; // <<< RESET GAME WON FLAG

    // Reset core state
    this.lastTime = 0;
    this.score = effectiveConfig.startScore;
    this.difficultyLevel = effectiveConfig.startDifficulty;
    this.scoreForNextLevel = 300;
    for (let i = 0; i < this.difficultyLevel; i++) {
      this.scoreForNextLevel += 300 + i ** 2 * 50;
    }

    // Reset Player
    if (this.player) {
      this.player.initialLives = effectiveConfig.playerLives;
      this.player.reset();

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
            console.warn(`   Unknown starting powerup: ${powerupName}`);
        }
      });
    } else {
      console.error("INIT LEVEL Error: Player object does not exist!");
      return;
    }

    // Clear Dynamic Arrays
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.explosions = [];
    this.powerUps = [];

    // Reset Spawning Timers
    this.enemyPlaneTimer = 0;
    this.enemyShipTimer = 0;
    this.boss1HelperPlaneTimer = 0;
    this.bossPowerUpTimer = 0;
    this.bossPowerUpInterval =
      this.defaultBossPowerUpBaseInterval +
      Math.random() * this.defaultBossPowerUpRandomInterval;

    // Reset Boss State
    this.bossActive = false;
    this.currentBossInstance = null;
    this.currentBossNumber = null;
    this.boss3Ship = null;
    this.boss3Plane = null;
    this.boss1Defeated = effectiveConfig.defeatedBosses.includes(1);
    this.boss2Defeated = effectiveConfig.defeatedBosses.includes(2);
    this.boss3Defeated = effectiveConfig.defeatedBosses.includes(3);
    this.isSpawningPlaneHelpers = false;
    this.helperPlaneSpawnTimer = 0;
    this.isSpawningShipHelpers = false;
    this.helperShipSpawnTimer = 0;

    // Update UI
    this.updateUI();

    // --- Hide Overlays ---
    if (this.gameOverElement) this.gameOverElement.style.display = "none";
    if (this.gameWonElement) this.gameWonElement.style.display = "none"; // <<< HIDE GAME WON OVERLAY
  }

  start(startConfig = {}) {
    this.initializeLevel(startConfig);
    if (!this.isGameOver && !this.isGameWon) {
      // Check both flags
      requestAnimationFrame(this.loop.bind(this));
    }
  }

  restart() {
    this.initializeLevel({}); // Use default config
    // Ensure loop restarts if called from an overlay state
    if (this.isGameOver || this.isGameWon) {
      requestAnimationFrame(this.loop.bind(this));
    } else if (!this.lastTime) {
      // Handle case where loop might not have started yet

      requestAnimationFrame(this.loop.bind(this));
    }
  } // End restart
} // End Game Class
