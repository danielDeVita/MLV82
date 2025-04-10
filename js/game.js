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
import { EnemyBullet } from "./enemyBullet.js";
import { TrackingMissile } from "./trackingMissile.js";
import { Explosion } from "./explosion.js";
import { PowerUp } from "./powerUp.js";
import { PowerUpShield } from "./powerUpShield.js";
import { PowerUpSpreadShot } from "./powerUpSpreadShot.js";
import { PowerUpExtraLife } from "./powerUpExtraLife.js";
import { PowerUpBullet } from "./powerUpBullet.js";
import { PowerUpBomb } from "./powerUpBomb.js";
import { Boss1 } from "./boss1.js"; // <<< BOSS IMPORT
import { checkCollision } from "./utils.js";
import { loadSounds, playSound } from "./audio.js";
import { Bomb } from "./bomb.js";
import { Bullet } from "./bullet.js";

export class Game {
  constructor(canvasId, width, height) {
    console.log("DEBUG: Constructor START");
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) throw new Error(`FATAL: Canvas element ID="${canvasId}" NOT FOUND.`);
    this.width = width;
    this.height = height;
    this.canvas.width = this.width;
    this.canvas.height = this.height;

    console.log("DEBUG: Constructor - Getting context...");
    this.context = this.canvas.getContext("2d"); // <<< GET CONTEXT
    if (!this.context) {
      // <<< VERIFY CONTEXT
      throw new Error("FATAL: Failed to get 2D context. Browser issue?");
    }
    console.log("DEBUG: Constructor - Context obtained:", this.context); // Log it

    // --- Initialize properties AFTER context is verified ---
    this.lastTime = 0;
    this.isGameOver = false;
    this.projectiles = [];
    this.enemyProjectiles = [];
    this.enemies = [];
    this.explosions = [];
    this.powerUps = [];
    this.score = 0;
    this.difficultyLevel = 0;
    this.scoreForNextLevel = 300;
    this.baseEnemyPlaneInterval = 2000;
    this.baseEnemyShipInterval = 6000;
    this.enemyPlaneTimer = 0;
    this.enemyShipTimer = 0;
    this.powerUpDropChance = 0.1;
    this.bossActive = false;
    this.currentBoss = null;
    this.boss1Defeated = false;
    this.boss2Defeated = false;
    this.boss3Defeated = false;
    this.BOSS1_SCORE_THRESHOLD = 10;
    this.BOSS2_SCORE_THRESHOLD = 2500;
    this.BOSS3_SCORE_THRESHOLD = 4000;

    this.bossPowerUpTimer = 0;
    this.bossPowerUpBaseInterval = 15000; // Base 15 seconds
    this.bossPowerUpRandomInterval = 5000; // Add up to 5s random
    this.bossPowerUpInterval = this.bossPowerUpBaseInterval + Math.random() * this.bossPowerUpRandomInterval; // Initial interval

    // Initialize core components AFTER context verification
    try {
      this.input = new InputHandler(this);
      this.background = new Background(this.width, this.height);
      this.background.game = this; // Give background access
      this.player = new Player(this);
    } catch (error) {
      console.error("Error initializing components:", error);
      throw error;
    }

    // UI Elements
    this.scoreElement = document.getElementById("score");
    this.livesElement = document.getElementById("lives");
    this.difficultyElement = document.getElementById("difficulty-level");
    this.powerupStatusElement = document.getElementById("powerup-status");
    this.gameOverElement = document.getElementById("game-over");
    this.restartButton = document.getElementById("restartButton");

    // Event Listeners
    if (this.restartButton) {
      this.restartButton.addEventListener("click", this.restart.bind(this));
    } else {
      console.error("Restart button not found!");
    }

    console.log("Game Constructor: Finished successfully.");
    this.updateUI(); // Initial UI setup
  }

  // --- Main Game Loop ---
  loop(timestamp) {
    // Check context at START
    if (!this.context) {
      console.error(`LOOP ERROR (Start): this.context is missing!`);
      this.isGameOver = true;
      return;
    }

    const currentTime = performance.now ? performance.now() : timestamp;
    if (this.isGameOver) {
      this.drawGameOver();
      return;
    } // Use validated context

    // DeltaTime Calculation
    const MAX_DELTA_TIME_MS = 100;
    let deltaTime = 0;
    if (this.lastTime > 0) {
      deltaTime = currentTime - this.lastTime;
      if (deltaTime <= 0) {
        deltaTime = 16.67;
      } else if (deltaTime > MAX_DELTA_TIME_MS) {
        deltaTime = MAX_DELTA_TIME_MS;
        this.lastTime = currentTime;
      } else {
        this.lastTime = currentTime;
      }
    } else {
      deltaTime = 16.67;
      this.lastTime = currentTime;
    }

    // --- ====== GAME LOGIC START ====== ---
    try {
      // 1. Clear Canvas
      this.context.clearRect(0, 0, this.width, this.height);

      // 2. Update
      this.background.update(deltaTime, this.score);
      this.player.update(this.input, deltaTime);
      [...this.projectiles, ...this.enemyProjectiles, ...this.enemies, ...this.explosions, ...this.powerUps].forEach((obj) => obj.update(deltaTime));

      if (this.bossActive) {
        this.bossPowerUpTimer += deltaTime;
        if (this.bossPowerUpTimer >= this.bossPowerUpInterval) {
          this.bossPowerUpTimer = 0; // Use subtraction reset for accuracy: this.bossPowerUpTimer -= this.bossPowerUpInterval;
          this.bossPowerUpInterval = this.bossPowerUpBaseInterval + Math.random() * this.bossPowerUpRandomInterval; // Reset next interval

          const spawnX = Math.random() * (this.width * 0.7) + this.width * 0.1; // Random X, avoid edges
          const spawnY = 50 + Math.random() * 50; // Spawn near top/mid screen
          console.log("Spawning timed boss power-up");
          this.createPowerUp(spawnX, spawnY);
        }
      }

      // 3. Spawn / Difficulty / Boss Checks
      this.updateDifficulty();
      this.handleBossState();
      this.handleSpawning(deltaTime);

      // 4. Collisions
      this.handleCollisions();

      // --- Check context BEFORE drawing ---
      if (!this.context) {
        throw new Error("Context lost before drawing phase!");
      }

      // --- 5. Draw Everything ---
      this.background.draw(this.context); // Draw canvas background elements
      // CSS layers are behind
      this.powerUps.forEach((pu) => pu.draw(this.context));
      this.enemies.forEach((e) => e.draw(this.context)); // Pass validated this.context
      this.enemyProjectiles.forEach((ep) => ep.draw(this.context));
      this.player.draw(this.context); // Pass validated this.context
      this.projectiles.forEach((p) => p.draw(this.context));
      this.explosions.forEach((ex) => ex.draw(this.context));

      // --- 6. Cleanup ---
      this.cleanupObjects();
    } catch (error) {
      console.error("ERROR during game loop:", error);
      this.isGameOver = true;
      this.drawGameOver();
      return;
    } // Use validated context
    // --- ====== GAME LOGIC END ====== ---

    requestAnimationFrame(this.loop.bind(this));
  } // End of loop

  // --- Boss State Management ---
  handleBossState() {
    if (!this.bossActive) {
      // Check spawn
      if (!this.boss1Defeated && this.score >= this.BOSS1_SCORE_THRESHOLD) {
        this.spawnBoss(1);
      }
      // Add Boss 2/3 later
    } else if (this.bossActive && this.currentBoss && this.currentBoss.markedForDeletion) {
      // Check defeat
      this.bossDefeated();
    }
  }
  spawnBoss(bossNumber) {
    console.log(`--- Spawning Boss ${bossNumber} ---`);
    this.bossActive = true;
    this.enemies = this.enemies.filter((e) => e instanceof EnemyShip || e instanceof EnemyShooterShip || e instanceof EnemyTrackingShip); // Keep ships?
    this.enemyProjectiles = [];
    let bossInstance = null;
    if (bossNumber === 1) {
      bossInstance = new Boss1(this);
    }
    if (bossInstance) {
      this.enemies.push(bossInstance);
      this.currentBoss = bossInstance;
    } else {
      console.error(`Unknown boss: ${bossNumber}`);
      this.bossActive = false;
    }
  }
  bossDefeated() {
    console.log(`--- Boss Defeated! (All weak points destroyed) ---`);
    let scoreBonus = 0;
    if (this.currentBoss instanceof Boss1 && !this.boss1Defeated) {
      this.boss1Defeated = true;
      scoreBonus = 2500;
    }
    // this.addScore(scoreBonus);
    this.bossActive = false;
    this.currentBoss = null;

    // Drop powerups
    for (let i = 0; i < 3; i++) {
      this.createPowerUp(this.width / 2 + (i - 1) * 60, this.height / 2);
    }
    // Resume normal spawning timers
    this.enemyPlaneTimer = 0;
    this.enemyShipTimer = 0;
  }

  // --- Other Helper Methods ---
  updateDifficulty() {
    if (!this.isGameOver && this.score >= this.scoreForNextLevel) {
      this.difficultyLevel++;
      this.scoreForNextLevel += 300 + this.difficultyLevel ** 2 * 50;
      this.updateDifficultyUI();
      this.powerUpDropChance = Math.min(0.25, 0.1 + this.difficultyLevel * 0.015);
    }
  }

  handleSpawning(deltaTime) {
    if (this.bossActive) return; // No regular spawns during boss
    const minPlaneInt = 500,
      minShipInt = 2000,
      planeReduct = this.difficultyLevel * 150,
      shipReduct = this.difficultyLevel * 300;
    const currentPlaneInt = Math.max(minPlaneInt, this.baseEnemyPlaneInterval - planeReduct);
    const currentShipInt = Math.max(minShipInt, this.baseEnemyShipInterval - shipReduct);
    const speedBoost = this.difficultyLevel * 0.3;
    // Spawn Planes
    this.enemyPlaneTimer += deltaTime;
    if (this.enemyPlaneTimer >= currentPlaneInt) {
      this.enemyPlaneTimer -= currentPlaneInt;
      let p;
      const r = Math.random(),
        dC = this.difficultyLevel > 1 ? 0.15 + this.difficultyLevel * 0.05 : 0,
        sC = this.difficultyLevel > 0 ? 0.35 + this.difficultyLevel * 0.1 : 0;
      if (r < dC) p = new EnemyDodgingPlane(this, speedBoost);
      else if (r < dC + sC) p = new EnemyShooterPlane(this, speedBoost);
      else p = new EnemyPlane(this, speedBoost);
      this.enemies.push(p);
    }
    // Spawn Ships
    this.enemyShipTimer += deltaTime;
    if (this.enemyShipTimer >= currentShipInt) {
      this.enemyShipTimer -= currentShipInt;
      let s;
      const r = Math.random(),
        tC = this.difficultyLevel > 2 ? 0.15 + this.difficultyLevel * 0.05 : 0,
        sC = this.difficultyLevel > 1 ? 0.35 + this.difficultyLevel * 0.1 : 0;
      if (r < tC) s = new EnemyTrackingShip(this, speedBoost);
      else if (r < tC + sC) s = new EnemyShooterShip(this, speedBoost);
      else s = new EnemyShip(this, speedBoost);
      this.enemies.push(s);
    }
  }

  handleCollisions() {
    // --- Player Projectiles vs Enemies ---
    this.projectiles.forEach((p) => {
      if (p.markedForDeletion) return; // Skip projectiles already marked

      this.enemies.forEach((e) => {
        // Skip checks if enemy is dead OR if projectile was marked by a previous enemy collision in this same frame
        if (e.markedForDeletion || p.markedForDeletion) return;

        // Check for collision between projectile and enemy bounding boxes
        if (checkCollision(p, e)) {
          // --- SPECIAL HANDLING FOR BOSS ---
          if (e instanceof Boss1) {
            console.log(`Collision detected between Projectile (${p.constructor.name}) and Boss1.`);
            e.hit(p); // <<< Pass the ENTIRE projectile object to the Boss's hit method
            // Projectile deletion is now handled INSIDE Boss1.hit or based on its return value if needed
          }
          // --- REGULAR ENEMY HANDLING ---
          else {
            const pType = p instanceof Bomb ? "bomb" : "bullet";
            e.hit(p.damage, pType); // Call regular enemy hit

            // Projectile deletion for regular enemies
            if (pType === "bomb") {
              // Delete bomb if it hits a SHIP (excluding Boss, handled above)
              if (e instanceof EnemyShip || e instanceof EnemyShooterShip || e instanceof EnemyTrackingShip) {
                p.markedForDeletion = true;
              }
            } else {
              // It's a bullet
              p.markedForDeletion = true; // Regular bullets disappear on hit
            }
          }
        }
      });
    }); // End Player Projectiles vs Enemies

    // --- Player vs Enemy Projectiles ---
    this.enemyProjectiles.forEach((ep) => {
      if (ep.markedForDeletion) return;
      if (checkCollision(this.player, ep)) {
        if (!this.player.shieldActive && this.player.invincible) {
        } // Hit invincible player
        else {
          ep.markedForDeletion = true;
          this.player.hit();
        } // Hit vulnerable player or shield
      }
    });

    // --- Player vs Enemies ---
    if (!this.player.shieldActive && !this.player.invincible) {
      this.enemies.forEach((e) => {
        if (e.markedForDeletion) return;
        // Special check: Don't die instantly from touching boss unless intended
        if (checkCollision(this.player, e)) {
          if (e instanceof Boss1) {
            // Player touched boss - apply damage to player, maybe small damage to boss?
            console.log("Player collided with Boss!");
            this.player.hit(); // Player takes damage
            // e.hit(null, 'collision'); // Optional: Boss takes minor collision damage? Needs hit method adjustment.
          } else {
            // Player collided with regular enemy
            e.hit(100); // Destroy enemy instantly
            this.player.hit(); // Player takes damage/loses life
          }
        }
      });
    }

    // --- Player vs PowerUps ---
    this.powerUps.forEach((pu) => {
      if (pu.markedForDeletion) return;
      if (checkCollision(this.player, pu)) {
        pu.activate(this.player); // PowerUp handles its own deletion
      }
    });
  } // End of handleCollisions

  cleanupObjects() {
    this.projectiles = this.projectiles.filter((o) => !o.markedForDeletion);
    this.enemyProjectiles = this.enemyProjectiles.filter((o) => !o.markedForDeletion);
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

  restart() {
    console.log("--- Restarting Game ---");

    this.bossPowerUpTimer = 0;

    try {
      // 1. Reset Player
      if (this.player) {
        this.player.reset();
      } else {
        console.error("Restart Error: Player object missing!");
        return;
      } // Stop if player missing

      // 2. Clear Game Object Arrays
      this.projectiles = [];
      this.enemyProjectiles = [];
      this.enemies = [];
      this.explosions = [];
      this.powerUps = [];
      // console.log("DEBUG: RESTART - Arrays cleared.");

      // 3. Reset Game State Variables
      this.score = 0;
      this.difficultyLevel = 0;
      this.scoreForNextLevel = 300;
      this.isGameOver = false; // CRITICAL: Allow loop to run again
      this.lastTime = 0; // Reset time for accurate delta on first frame

      // 4. Reset Boss State
      this.bossActive = false;
      this.currentBoss = null;
      this.boss1Defeated = false;
      this.boss2Defeated = false;
      this.boss3Defeated = false;

      // 5. Reset Timers
      this.enemyPlaneTimer = 0;
      this.enemyShipTimer = 0;
      // console.log("DEBUG: RESTART - Timers and lastTime reset.");

      // 6. Reset UI
      if (this.gameOverElement) this.gameOverElement.style.display = "none"; // Hide game over screen
      this.updateUI(); // Update score, lives, level displays to initial values
      // console.log("DEBUG: RESTART - UI updated.");

      // 7. Start the loop again
      console.log("DEBUG: RESTART - Requesting animation frame.");
      requestAnimationFrame(this.loop.bind(this));
    } catch (error) {
      console.error("ERROR during restart function:", error);
      // Attempt to force a game over state if restart fails critically
      this.isGameOver = true;
      if (this.gameOverElement) this.gameOverElement.style.display = "block"; // Show game over on failure
    }
  }

  // --- Powerup Creation Method ---
  createPowerUp(x, y) {
    const rand = Math.random();
    let PowerUpClass = null; // Use null initially
    const shieldChance = 0.2,
      spreadChance = 0.2,
      lifeChance = 0.1;
    const bulletChance = 0.25,
      bombChance = 0.25; // Sum should be <= 1

    if (rand < shieldChance) PowerUpClass = PowerUpShield;
    else if (rand < shieldChance + spreadChance) PowerUpClass = PowerUpSpreadShot;
    // Only drop life if player not at max lives
    else if (rand < shieldChance + spreadChance + lifeChance && this.player && this.player.lives < this.player.maxLives)
      PowerUpClass = PowerUpExtraLife;
    else if (rand < shieldChance + spreadChance + lifeChance + bulletChance) PowerUpClass = PowerUpBullet;
    else PowerUpClass = PowerUpBomb; // Assign remaining probability to Bomb

    if (PowerUpClass) {
      this.powerUps.push(new PowerUpClass(this, x, y));
    } else {
      // This case should ideally not be reached if probabilities sum correctly
      // If it does, maybe default to a base powerup or log a warning
      console.warn("createPowerUp: No power-up class determined for random value:", rand);
      // this.powerUps.push(new PowerUp(this, x, y)); // Optionally add base as fallback
    }
  }
  drawGameOver() {
    if (!this.context) return;
    this.context.fillStyle = "rgba(0,0,0,0.5)";
    this.context.fillRect(0, 0, this.width, this.height);
  }
  start() {
    console.log("Game Starting...");

    this.bossPowerUpTimer = 0;

    // --- Reset Core Game State ---
    this.isGameOver = false; // Ensure game is not over
    this.lastTime = 0; // Reset time for delta calculation on first frame
    this.score = 0; // Reset score
    this.difficultyLevel = 0; // Reset difficulty level
    this.scoreForNextLevel = 300; // Reset score threshold for next level

    // --- Reset Player State ---
    // Ensure player exists before trying to reset
    if (this.player) {
      this.player.reset();
    } else {
      // This would be a critical error if player wasn't created in constructor
      console.error("START Error: Player object does not exist!");
      // You might want to throw an error here to stop execution
      // throw new Error("Player failed to initialize.");
      return; // Stop start process if player is missing
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

    // --- Reset Boss State ---
    this.bossActive = false;
    this.currentBoss = null;
    this.boss1Defeated = false;
    this.boss2Defeated = false;
    this.boss3Defeated = false;

    // --- Update UI to Initial Values ---
    this.updateUI(); // Calls all individual UI update methods

    // --- Hide Game Over Screen (just in case it was somehow visible) ---
    if (this.gameOverElement) {
      this.gameOverElement.style.display = "none";
    }

    // --- Start the Main Game Loop ---
    console.log("DEBUG: START - Requesting first animation frame.");
    requestAnimationFrame(this.loop.bind(this));
  } // End of start method
} // End of loop
