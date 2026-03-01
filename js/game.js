import { InputHandler } from "./input.js";
import { Player } from "./player.js";
import { Background } from "./background.js";
import { Explosion } from "./explosion.js";
import { debugLog } from "./debug.js";
import { createPowerUp as createGamePowerUp } from "./gamePowerups.js";
import {
  gameWon as markGameWon,
  gameOver as markGameOver,
  drawGameOver as drawGameOverOverlay,
  drawGameWon as drawGameWonOverlay,
  updateUI as updateGameUi,
  updateScoreUI as updateGameScoreUi,
  updateLivesUI as updateGameLivesUi,
  updateDifficultyUI as updateGameDifficultyUi,
  updatePowerUpStatus as updateGamePowerUpStatus,
  updateDifficulty as updateGameDifficulty,
  initializeLevel as initializeGameLevel,
  updateAmmoUI as updateGameAmmoUi,
} from "./gameStateUi.js";
import {
  handleBossState as handleGameBossState,
  spawnBoss as spawnGameBoss,
  bossDefeated as markBossDefeated,
} from "./gameBossFlow.js";
import {
  handleSpawning as handleGameSpawning,
  spawnBoss3HelperPlanes as spawnBoss3HelperPlanesInternal,
  spawnBoss3HelperShips as spawnBoss3HelperShipsInternal,
  spawnBoss2HelperShips as spawnBoss2HelperShipsInternal,
} from "./gameSpawning.js";
import {
  handleCollisions as handleGameCollisions,
  cleanupObjects as cleanupGameObjects,
  triggerSuperBombEffect as triggerSuperBombEffectInternal,
} from "./gameCombat.js";

export class Game {
  constructor(canvasId, width, height) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas)
      throw new Error(`FATAL: Canvas element ID="${canvasId}" NOT FOUND.`);

    // --- Set fixed dimensions and get context ---
    this.width = width;
    this.height = height;

    const dpr = window.devicePixelRatio || 1;

    this.canvas.width = Math.floor(this.width * dpr);
    this.canvas.height = Math.floor(this.height * dpr);

    this.canvas.style.width = `${this.width}px`;
    this.canvas.style.height = `${this.height}px`;

    this.context = this.canvas.getContext("2d");

    this.context.imageSmoothingEnabled = false;

    this.context.scale(dpr, dpr);

    // --- >>> ADD SEA LEVEL DEFINITION <<< ---
    // Example: Sea starts at 40% down the screen (60% sea area)
    this.seaLevelY = this.height * 0.7;
    // Example: Sea starts at 30% down the screen (70% sea area)
    // this.seaLevelY = this.height * 0.30;

    // --- >>> END ADD <<< ---

    if (!this.context) throw new Error("FATAL: Failed to get 2D context.");

    // --- Initialize properties ---
    this.lastTime = 0;
    this.runId = 0;
    this.loopBound = this.loop.bind(this);
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

    // --- >>> GET Ammo UI Elements <<< ---
    this.bulletAmmoElement = document.getElementById("bullet-ammo"); // Added
    this.bombAmmoElement = document.getElementById("bomb-ammo"); // Added
    // --- >>> END GET <<< ---

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

    // Sounds are preloaded in audio.js via loadSounds().
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

      // --- >>> UPDATE AMMO UI IN LOOP <<< ---
      this.updateAmmoUI(); // Added call to update ammo display every frame
      // --- >>> END UPDATE <<< ---

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
      requestAnimationFrame(this.loopBound);
    } else {
    }
  } // End loop

  // --- Game State and Boss Handling ---
  handleBossState() {
    handleGameBossState(this);
  }

  spawnBoss(bossNumber) {
    spawnGameBoss(this, bossNumber);
  }

  bossDefeated(bossNumber) {
    markBossDefeated(this, bossNumber);
  }

  // --- >>> NEW gameWon Method <<< ---
  gameWon() {
    markGameWon(this);
  }
  // --- >>> END gameWon Method <<< ---

  // --- Spawning ---
  handleSpawning(deltaTime) {
    handleGameSpawning(this, deltaTime);
  }

  // --- Boss 3 Helper Spawning Methods ---
  spawnBoss3HelperPlanes(count = 2, type = "mixed") {
    spawnBoss3HelperPlanesInternal(this, count, type);
  }

  spawnBoss3HelperShips(count = 2, type = "mixed") {
    spawnBoss3HelperShipsInternal(this, count, type);
  }

  // --- Collisions ---
  handleCollisions() {
    handleGameCollisions(this);
  }

  // --- Cleanup and Effects ---
  cleanupObjects() {
    cleanupGameObjects(this);
  }

  spawnBoss2HelperShips(count = 1, type = "shooter") {
    spawnBoss2HelperShipsInternal(this, count, type);
  }

  resetBoss1HelperSpawnTimer() {
    // Reset the timer - potentially start negative for a quicker first spawn
    this.boss1HelperPlaneTimer = -(
      this.boss1HelperPlaneBaseInterval * 0.3 +
      Math.random() * this.boss1HelperPlaneRandomInterval * 0.3
    ); // Example: ~30% of interval delay
    debugLog(
      `Game: Resetting Boss 1 helper plane spawn timer to ${this.boss1HelperPlaneTimer.toFixed(
        0
      )}ms.`
    );
  }
  // --- >>> END ADDED METHOD <<< ---

  triggerSuperBombEffect() {
    triggerSuperBombEffectInternal(this);
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
    updateGameUi(this);
  }
  updateScoreUI() {
    updateGameScoreUi(this);
  }
  updateLivesUI() {
    updateGameLivesUi(this);
  }
  updateDifficultyUI() {
    updateGameDifficultyUi(this);
  }
  updatePowerUpStatus(text = "") {
    updateGamePowerUpStatus(this, text);
  }
  updateDifficulty() {
    updateGameDifficulty(this);
  }

  // --- Powerup Creation ---
  createPowerUp(x, y, originType = "air") {
    createGamePowerUp(this, x, y, originType);
  }

  // --- Game State Methods ---
  gameOver() {
    markGameOver(this);
  }

  drawGameOver() {
    drawGameOverOverlay(this);
  }

  // --- >>> NEW drawGameWon Method <<< ---
  drawGameWon() {
    drawGameWonOverlay(this);
  }
  // --- >>> END drawGameWon Method <<< ---

  // --- Level Initialization / Start / Restart ---
  initializeLevel(config = {}) {
    initializeGameLevel(this, config);
  }

  start(startConfig = {}) {
    this.initializeLevel(startConfig);
    if (!this.isGameOver && !this.isGameWon) {
      // Check both flags
      requestAnimationFrame(this.loopBound);
    }
  }

  restart() {
    this.initializeLevel({}); // Use default config
    // Ensure loop restarts if called from an overlay state
    if (this.isGameOver || this.isGameWon) {
      requestAnimationFrame(this.loopBound);
    } else if (!this.lastTime) {
      // Handle case where loop might not have started yet

      requestAnimationFrame(this.loopBound);
    }
  } // End restart

  // --- Ammo UI Update Method ---
  updateAmmoUI() {
    updateGameAmmoUi(this);
  }
  // --- End Ammo UI ---
} // End Game Class
