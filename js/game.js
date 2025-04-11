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

import { Explosion } from "./explosion.js";

import { PowerUpShield } from "./powerUpShield.js";
import { PowerUpSpreadShot } from "./powerUpSpreadShot.js";
import { PowerUpExtraLife } from "./powerUpExtraLife.js";
import { PowerUpBullet } from "./powerUpBullet.js";
import { PowerUpBomb } from "./powerUpBomb.js";
import { Boss1 } from "./boss1.js"; // <<< BOSS IMPORT
import { Boss2 } from "./boss2.js";
import { Boss3 } from "./boss3.js";
import { checkCollision } from "./utils.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js";

export class Game {
  constructor(canvasId, width, height) {
    console.log("DEBUG: Constructor START");
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas)
      throw new Error(`FATAL: Canvas element ID="${canvasId}" NOT FOUND.`);
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

    // --- NEW: Timer/Interval for Boss 1 Helper Planes ---
    this.boss1HelperPlaneTimer = 0;
    this.boss1HelperPlaneBaseInterval = 1800; // How often helpers spawn (adjust as needed)
    this.boss1HelperPlaneRandomInterval = 600; // Random variance

    this.powerUpDropChance = 0.1;

    this.bossActive = false;
    this.currentBoss = null;
    this.boss1Defeated = false;
    this.boss2Defeated = false;
    this.boss3Defeated = false;
    this.BOSS1_SCORE_THRESHOLD = 800;
    this.BOSS2_SCORE_THRESHOLD = 5000;
    this.BOSS3_SCORE_THRESHOLD = 9500;

    this.bossPowerUpTimer = 0;
    this.bossPowerUpBaseInterval = 15000; // Base 15 seconds
    this.bossPowerUpRandomInterval = 5000; // Add up to 5s random
    this.bossPowerUpInterval =
      this.bossPowerUpBaseInterval +
      Math.random() * this.bossPowerUpRandomInterval; // Initial interval

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
      [
        ...this.projectiles,
        ...this.enemyProjectiles,
        ...this.enemies,
        ...this.explosions,
        ...this.powerUps,
      ].forEach((obj) => obj.update(deltaTime));

      if (this.bossActive) {
        this.bossPowerUpTimer += deltaTime;
        if (this.bossPowerUpTimer >= this.bossPowerUpInterval) {
          this.bossPowerUpTimer = 0; // Use subtraction reset for accuracy: this.bossPowerUpTimer -= this.bossPowerUpInterval;
          this.bossPowerUpInterval =
            this.bossPowerUpBaseInterval +
            Math.random() * this.bossPowerUpRandomInterval; // Reset next interval

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

      // --->>> CHECK LOGGING BEFORE ENEMY DRAW <<<---
      console.log(`--- Drawing Frame ---`);
      this.enemies.forEach((e, index) => {
        // Make sure this log is active and check its output!
        console.log(
          `Drawing enemy index ${index}: ID=${e.id}, Type=${
            e.constructor.name
          }, X=${e.x?.toFixed(0)}, Y=${e.y?.toFixed(0)}, Health=${
            e.health
          }, MaxHealth=${e.maxHealth}`
        );

        if (e && typeof e.draw === "function") {
          // Check if draw exists
          e.draw(this.context); // <<<< This should be the ONLY call that leads to weak point drawing
        } else {
          console.warn(
            `Enemy at index ${index} is invalid or has no draw method:`,
            e
          );
        }

        if (e instanceof Boss3) {
          const towerWP = e.weakPoints.find((wp) => wp.type === "controlTower");
          // Also log the tower weak point health for comparison
          console.log(
            `   Boss3 Tower WP: X=${towerWP?.x?.toFixed(
              0
            )}, Y=${towerWP?.y?.toFixed(0)}, Health=${
              towerWP?.health
            }, MaxHealth=${towerWP?.maxHealth}`
          );
        }
        // --- Now actually draw ---
        e.draw(this.context);
      });
      // --->>> END LOGGING <<<---
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
      // Check Boss 1 spawn FIRST
      if (!this.boss1Defeated && this.score >= this.BOSS1_SCORE_THRESHOLD) {
        // console.log("handleBossState: Conditions met for Boss 1");
        this.spawnBoss(1);
      }
      // Check Boss 2 spawn only AFTER Boss 1 is defeated
      else if (
        this.boss1Defeated &&
        !this.boss2Defeated &&
        this.score >= this.BOSS2_SCORE_THRESHOLD
      ) {
        // console.log("handleBossState: Conditions met for Boss 2");
        this.spawnBoss(2);
      }
      // Check Boss 3 spawn AFTER Boss 2 is defeated <<< THIS IS THE ONE
      else if (
        this.boss1Defeated &&
        this.boss2Defeated &&
        !this.boss3Defeated &&
        this.score >= this.BOSS3_SCORE_THRESHOLD
      ) {
        console.log(
          "handleBossState: Conditions met for Boss 3, calling spawnBoss(3)..."
        ); // <<< Make sure this log appears
        this.spawnBoss(3);
      }
      // --- No other conditions met for spawning ---
      // else { console.log("handleBossState: No boss spawn conditions met."); }
    } else if (
      this.bossActive &&
      this.currentBoss &&
      this.currentBoss.markedForDeletion
    ) {
      // console.log("handleBossState: Boss active and marked for deletion, calling bossDefeated...");
      this.bossDefeated();
    }
  }

  spawnBoss(bossNumber) {
    console.log(`--- Spawning Boss ${bossNumber} ---`);
    this.bossActive = true;
    // Clear out most regular enemies? Keep ships maybe? Or clear all?
    this.enemies = this.enemies.filter(
      (e) =>
        !(
          e instanceof EnemyPlane ||
          e instanceof EnemyShip ||
          e instanceof EnemyShooterPlane ||
          e instanceof EnemyShooterShip ||
          e instanceof EnemyDodgingPlane ||
          e instanceof EnemyTrackingShip
        )
    );
    this.enemyProjectiles = []; // Clear projectiles

    let bossInstance = null;
    try {
      // Add try-catch around instantiation
      if (bossNumber === 1) {
        bossInstance = new Boss1(this);
      } else if (bossNumber === 2) {
        bossInstance = new Boss2(this);
      } else if (bossNumber === 3) {
        bossInstance = new Boss3(this);
      } // <<< CHECK THIS LINE
    } catch (error) {
      console.error(`ERROR Instantiating Boss ${bossNumber}:`, error);
      this.bossActive = false; // Reset if instantiation fails
      return; // Stop processing
    }

    if (bossInstance) {
      console.log(`Successfully instantiated ${bossInstance.id}`); // <<< Add log
      this.enemies.push(bossInstance);
      this.currentBoss = bossInstance;
      // Reset power-up timer when boss spawns
      this.bossPowerUpTimer = 0;
      this.bossPowerUpInterval =
        this.bossPowerUpBaseInterval +
        Math.random() * this.bossPowerUpRandomInterval;
    } else {
      console.error(`Unknown boss number requested: ${bossNumber}`);
      this.bossActive = false; // Failed to spawn, reset state
    }
  }

  bossDefeated() {
    // Check if a boss was actually active and marked
    if (!this.currentBoss) {
      console.warn("bossDefeated called but no currentBoss was set.");
      this.bossActive = false; // Ensure state is reset
      return;
    }

    console.log(`--- Boss Defeated! (${this.currentBoss.id}) ---`);

    // Set the defeated flag for the specific boss
    if (this.currentBoss instanceof Boss1 && !this.boss1Defeated) {
      this.boss1Defeated = true;
    } else if (this.currentBoss instanceof Boss2 && !this.boss2Defeated) {
      this.boss2Defeated = true;
    } else if (this.currentBoss instanceof Boss3 && !this.boss3Defeated) {
      this.boss3Defeated = true;
    } // <<< CHECK THIS LINE

    // Reset general boss state
    this.bossActive = false;
    this.currentBoss = null; // Clear the reference

    // Drop powerups (maybe more for later bosses?)
    const numPowerups = this.boss1Defeated && !this.boss2Defeated ? 3 : 4; // Example: 3 for B1, 4 for B2
    for (let i = 0; i < numPowerups; i++) {
      // Spread them out a bit
      this.createPowerUp(
        this.width / 2 + (i - (numPowerups - 1) / 2) * 80,
        this.height * 0.6
      );
    }

    // Resume normal spawning timers immediately
    this.enemyPlaneTimer = 0;
    this.enemyShipTimer = 0;
  }

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
    // --- REVISED LOGIC ---

    // 1. Check for Boss 1 Phase 3+ Helper Spawns
    if (
      this.bossActive &&
      this.currentBoss instanceof Boss1 &&
      this.currentBoss.activeWeakPoints <= 2 && // Trigger when 2 OR 1 points remain
      this.currentBoss.activeWeakPoints > 0 // But not when 0 points remain
    ) {
      this.boss1HelperPlaneTimer += deltaTime;

      // --- >>> Adjust Interval Based on Phase? (Optional) <<< ---
      let currentBaseInterval = this.boss1HelperPlaneBaseInterval;

      if (this.currentBoss.activeWeakPoints === 1) {
        // Halve the base interval when only 1 WP left?
        // currentBaseInterval = this.boss1HelperPlaneBaseInterval * 0.6; // Example: 40% faster spawns
      }
      const currentHelperInterval =
        currentBaseInterval +
        Math.random() * this.boss1HelperPlaneRandomInterval;
      // --- >>> End Optional Interval Adjustment <<< ---

      if (this.boss1HelperPlaneTimer >= currentHelperInterval) {
        this.boss1HelperPlaneTimer = 0; // Reset

        // --- >>> Spawn MORE planes in final phase <<< ---
        const planesToSpawn = this.currentBoss.activeWeakPoints === 1 ? 2 : 1; // Spawn 2 if 1 WP left, else 1
        // --- >>> END Spawn MORE planes <<< ---

        console.log(
          `Spawning Boss 1 helper plane (Dodger) - ${this.currentBoss.activeWeakPoints} WP left`
        );

        for (let i = 0; i < planesToSpawn; i++) {
          // Add slight delay/offset for multiple spawns? Optional.
          // setTimeout(() => { // Might cause issues if boss dies during timeout
          this.enemies.push(new EnemyDodgingPlane(this, 0));
          // }, i * 100); // Example: 100ms delay for second plane
        }
      }
      // Return here to prevent other spawning logic
      return;
    }

    // 2. Check if any other boss phase is active (or different boss)
    if (this.bossActive) {
      return; // No regular spawns
    }

    // 3. If no boss is active, proceed with regular enemy spawning
    const speedBoost = this.difficultyLevel * 0.3; // Use current difficulty
    const minPlaneInt = 500,
      minShipInt = 2000,
      planeReduct = this.difficultyLevel * 150,
      shipReduct = this.difficultyLevel * 300;
    const currentPlaneInt = Math.max(
      minPlaneInt,
      this.baseEnemyPlaneInterval - planeReduct
    );
    const currentShipInt = Math.max(
      minShipInt,
      this.baseEnemyShipInterval - shipReduct
    );

    // Spawn Regular Planes
    this.enemyPlaneTimer += deltaTime;
    if (this.enemyPlaneTimer >= currentPlaneInt) {
      this.enemyPlaneTimer -= currentPlaneInt; // Use subtraction reset is slightly more accurate
      let p;
      const r = Math.random(),
        dC = this.difficultyLevel > 1 ? 0.15 + this.difficultyLevel * 0.05 : 0,
        sC = this.difficultyLevel > 0 ? 0.35 + this.difficultyLevel * 0.1 : 0;
      if (r < dC) p = new EnemyDodgingPlane(this, speedBoost);
      else if (r < dC + sC) p = new EnemyShooterPlane(this, speedBoost);
      else p = new EnemyPlane(this, speedBoost);
      this.enemies.push(p);
    }

    // Spawn Regular Ships
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
  } // End handleSpawning

  handleCollisions() {
    // --- Player Projectiles vs Enemies ---
    this.projectiles.forEach((p) => {
      // --- ADD PRE-CHECK LOGGING ---
      if (typeof p !== "object" || p === null) {
        console.error(
          "!!! ERROR in projectiles loop: Found non-object item:",
          p
        );
        // Optionally, mark it for deletion here to prevent further errors
        // if (p && typeof p === 'object') { p.markedForDeletion = true; } // Only if it has the property
        return; // Skip this iteration
      }
      // --- END PRE-CHECK ---

      if (p.markedForDeletion) return; // Skip projectiles already marked

      this.enemies.forEach((e) => {
        if (e.markedForDeletion || p.markedForDeletion) return;

        if (checkCollision(p, e)) {
          // --- SPECIAL HANDLING FOR BOSS ---
          // <<< --- ADD Boss3 HERE --- >>>
          if (e instanceof Boss1 || e instanceof Boss2 || e instanceof Boss3) {
            // Combined check
            // --- ADD DEBUG LOG BEFORE BOSS HIT ---
            console.log(
              `DEBUG: Calling ${e.constructor.name}.hit() with projectile:`,
              p
            );
            if (typeof p !== "object" || p === null) {
              // Redundant check if pre-check is added
              console.error(
                `CRITICAL: About to call ${e.constructor.name}.hit() with NON-OBJECT:`,
                p
              );
            }
            // --- END DEBUG LOG ---

            e.hit(p); // <<< Pass the ENTIRE projectile object 'p'
            // Projectile deletion is handled inside Boss hit methods
          }
          // --- REGULAR ENEMY HANDLING ---
          else {
            const pType = p instanceof Bomb ? "bomb" : "bullet";
            e.hit(p.damage, pType); // Call regular enemy hit

            // Projectile deletion for regular enemies
            if (pType === "bomb") {
              // Delete bomb if it hits a SHIP (excluding Boss, handled above)
              if (
                e instanceof EnemyShip ||
                e instanceof EnemyShooterShip ||
                e instanceof EnemyTrackingShip
              ) {
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
        if (e.markedForDeletion) return; // Skip dead enemies

        // Check collision between player and the current enemy 'e'
        if (checkCollision(this.player, e)) {
          let isBossCollision =
            e instanceof Boss1 || e instanceof Boss2 || e instanceof Boss3;
          let playerDamaged = false; // Flag to track if player should take damage this collision

          if (isBossCollision) {
            // --- Player Collided with a BOSS ---
            console.log(
              `Player collided with Boss object: ${e.constructor.name}`
            );

            // --- SPECIAL CASE for Boss 3 (Airfield) ---
            if (e instanceof Boss3) {
              // For Boss 3, collision with the main base area ITSELF doesn't hurt the player.
              // Damage only occurs if the player hits an ACTIVE WEAK POINT of Boss 3.
              let hitActiveWeakPoint = false;
              for (const wp of e.weakPoints) {
                // Check collision ONLY against ACTIVE weak points
                if (wp.isActive && checkCollision(this.player, wp)) {
                  hitActiveWeakPoint = true;
                  console.log(
                    ` -> Player specifically hit ACTIVE Boss 3 weak point: ${wp.type}`
                  );
                  break; // Found a collision with an active part, no need to check others
                }
              }
              // Only damage the player if they hit an *active* part of the base
              if (hitActiveWeakPoint) {
                playerDamaged = true;
                // Optional: Damage the weak point slightly from player collision?
                // wp.hit(PLAYER_COLLISION_DAMAGE_TO_WP);
              } else {
                // Player hit the inactive base area or a destroyed weak point - NO DAMAGE.
                console.log(
                  " -> Player hit inactive/base area of Boss 3. No damage."
                );
              }
            } else {
              // Collision with Boss 1 or Boss 2 - these are moving ships/planes,
              // collision should damage the player.
              playerDamaged = true;
            }
            // --- End Boss 3 Specific Logic ---
          } else {
            // --- Player Collided with REGULAR ENEMY ---
            // console.log(`Player collided with Regular Enemy: ${e.constructor.name}`);
            e.hit(100); // Destroy regular enemy instantly
            playerDamaged = true; // Player takes damage from hitting regular enemy
          }

          // --- Apply Damage to Player if flagged ---
          if (playerDamaged) {
            this.player.hit();
          }
        } // End if(checkCollision)
      }); // End forEach enemy
    } // End Player vs Enemies invincibility check

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

  restart() {
    console.log("--- Restarting Game ---");

    this.bossPowerUpTimer = 0;
    this.boss1HelperPlaneTimer = 0; // Ensure helper timer is reset

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
    else if (rand < shieldChance + spreadChance)
      PowerUpClass = PowerUpSpreadShot;
    // Only drop life if player not at max lives
    else if (
      rand < shieldChance + spreadChance + lifeChance &&
      this.player &&
      this.player.lives < this.player.maxLives
    )
      PowerUpClass = PowerUpExtraLife;
    else if (rand < shieldChance + spreadChance + lifeChance + bulletChance)
      PowerUpClass = PowerUpBullet;
    else PowerUpClass = PowerUpBomb; // Assign remaining probability to Bomb

    if (PowerUpClass) {
      this.powerUps.push(new PowerUpClass(this, x, y));
    } else {
      // This case should ideally not be reached if probabilities sum correctly
      // If it does, maybe default to a base powerup or log a warning
      console.warn(
        "createPowerUp: No power-up class determined for random value:",
        rand
      );
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
    this.boss1HelperPlaneTimer = 0; // Ensure helper timer is reset

    // --- Reset Core Game State ---
    this.isGameOver = false; // Ensure game is not over
    this.lastTime = 0; // Reset time for delta calculation on first frame
    this.score =this.BOSS2_SCORE_THRESHOLD - 1; // Set score to meet threshold
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
    this.boss1Defeated = true; //PASAR A FALSE
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
