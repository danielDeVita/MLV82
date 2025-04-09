// js/game.js

// --- Imports (Ensure all needed classes are imported) ---
import { InputHandler } from './input.js';
import { Player } from './player.js';
import { Background } from './background.js';
import { EnemyPlane } from './enemyPlane.js';
import { EnemyShip } from './enemyShip.js';
import { EnemyShooterPlane } from './enemyShooterPlane.js';
import { EnemyShooterShip } from './enemyShooterShip.js';
import { EnemyDodgingPlane } from './enemyDodgingPlane.js';
import { EnemyTrackingShip } from './enemyTrackingShip.js';
import { Explosion } from './explosion.js';
import { PowerUpShield } from './powerUpShield.js';
import { PowerUpSpreadShot } from './powerUpSpreadShot.js';
import { PowerUpExtraLife } from './powerUpExtraLife.js';
import { PowerUpBullet } from './powerUpBullet.js'; // Assuming these exist now
import { PowerUpBomb } from './powerUpBomb.js';     // Assuming these exist now
import { checkCollision } from './utils.js';
import { playSound } from './audio.js';
import { Bomb } from './bomb.js';



export class Game {
    constructor(canvasId, width, height) {
        this.canvas = document.getElementById(canvasId);
        if (!this.canvas) throw new Error(`Canvas element with ID "${canvasId}" not found.`);
        this.width = width; this.height = height;
        this.canvas.width = this.width; this.canvas.height = this.height;
        this.context = this.canvas.getContext('2d');
        if (!this.context) throw new Error("Failed to get 2D context.");
        console.log("Game Constructor: Context obtained.");

        // Initialize core components
        this.input = new InputHandler(this);
        this.background = new Background(this.width, this.height);
        this.player = new Player(this);

        // Game object arrays
        this.projectiles = []; this.enemyProjectiles = []; this.enemies = [];
        this.explosions = []; this.powerUps = [];

        // Game state
        this.score = 0; this.isGameOver = false; this.lastTime = 0;

        // Difficulty / Spawning
        this.difficultyLevel = 0; this.scoreForNextLevel = 300;
        this.baseEnemyPlaneInterval = 2000; this.baseEnemyShipInterval = 6000;
        this.enemyPlaneTimer = 0; this.enemyShipTimer = 0;
        this.powerUpDropChance = 0.1;

        // UI Element References
        this.scoreElement = document.getElementById('score');
        this.livesElement = document.getElementById('lives');
        this.difficultyElement = document.getElementById('difficulty-level');
        this.powerupStatusElement = document.getElementById('powerup-status');
        this.gameOverElement = document.getElementById('game-over');
        this.restartButton = document.getElementById('restartButton');

        // --- Event Listeners ---
        if (this.restartButton) {
            this.restartButton.addEventListener('click', this.restart.bind(this));
            // console.log("DEBUG: CONSTRUCTOR - Restart listener attached.");
        } else { console.error("DEBUG: CONSTRUCTOR - Restart button element NOT found!"); }

        console.log("Game Constructor: Finished.");

        // --- Initial UI Update ---
        this.updateUI(); // Initial UI setup
    }

    // --- Main Game Loop ---
    loop(timestamp) {
        const currentTime = performance.now ? performance.now() : timestamp;

        // --- Game Over Check ---
        if (this.isGameOver) {
            this.drawGameOver(); // Draw the overlay
            return; // Stop the loop entirely when game is over
        }

        // --- DeltaTime Calculation (Robust Version using performance.now) ---
        const MAX_DELTA_TIME_MS = 100;
        let deltaTime = 0;
        if (this.lastTime > 0) {
            deltaTime = currentTime - this.lastTime;
            if (deltaTime <= 0) { deltaTime = 16.67; }
            else if (deltaTime > MAX_DELTA_TIME_MS) { deltaTime = MAX_DELTA_TIME_MS; this.lastTime = currentTime; }
            else { this.lastTime = currentTime; }
        } else { deltaTime = 16.67; this.lastTime = currentTime; }

        // --- ====== GAME LOGIC START ====== ---
        try {
            // --- 1. Clear Canvas ---
            this.context.clearRect(0, 0, this.width, this.height);

            // --- 2. Update Game Objects ---
            this.background.update(deltaTime);
            this.player.update(this.input, deltaTime);
            [...this.projectiles, ...this.enemyProjectiles, ...this.enemies, ...this.explosions, ...this.powerUps].forEach(obj => obj.update(deltaTime));

            // --- 3. Handle Difficulty & Spawning ---
            this.updateDifficulty();
            this.handleSpawning(deltaTime);

            // --- 4. Check Collisions ---
            this.handleCollisions();

            // --- 5. Draw Everything ---
            this.background.draw(this.context);
            this.powerUps.forEach(pu => pu.draw(this.context));
            this.enemies.forEach(e => e.draw(this.context));
            this.enemyProjectiles.forEach(ep => ep.draw(this.context));
            this.player.draw(this.context);
            this.projectiles.forEach(p => p.draw(this.context));
            this.explosions.forEach(ex => ex.draw(this.context));

            // --- 6. Remove marked objects ---
            this.cleanupObjects();

        } catch (error) {
            console.error("ERROR during game update/draw loop:", error);
            this.isGameOver = true; // Stop game on critical error
            this.drawGameOver(); // Draw the overlay on error too
            return;
        }
        // --- ====== GAME LOGIC END ====== ---

        requestAnimationFrame(this.loop.bind(this)); // Request next frame
    } // End of loop

    // --- Helper Methods ---

    updateDifficulty() {
        if (this.score >= this.scoreForNextLevel) {
            this.difficultyLevel++;
            this.scoreForNextLevel += 300 + (this.difficultyLevel * this.difficultyLevel * 50);
            console.log(`Difficulty Increased: ${this.difficultyLevel}`);
            this.updateDifficultyUI();
            this.powerUpDropChance = Math.min(0.25, 0.1 + this.difficultyLevel * 0.015);
        }
    }

    handleSpawning(deltaTime) {
        // Calculate intervals & speed boost based on difficulty
        const minPlaneInterval = 500, minShipInterval = 2000;
        const planeIntervalReduction = this.difficultyLevel * 150;
        const shipIntervalReduction = this.difficultyLevel * 300;
        const currentPlaneInterval = Math.max(minPlaneInterval, this.baseEnemyPlaneInterval - planeIntervalReduction);
        const currentShipInterval = Math.max(minShipInterval, this.baseEnemyShipInterval - shipIntervalReduction);
        const speedBoost = this.difficultyLevel * 0.3;

        // Spawn Planes
        this.enemyPlaneTimer += deltaTime;
        if (this.enemyPlaneTimer >= currentPlaneInterval) {
            // --- Corrected Timer Reset ---
            this.enemyPlaneTimer -= currentPlaneInterval; // Subtract interval instead of setting to 0
            // Or use modulo for safety: this.enemyPlaneTimer %= currentPlaneInterval;

            let planeToAdd;
            const rand = Math.random();
            const dodgeChance = this.difficultyLevel > 1 ? 0.15 + this.difficultyLevel * 0.05 : 0;
            const shooterChance = this.difficultyLevel > 0 ? 0.35 + this.difficultyLevel * 0.10 : 0;

            // DEBUG LOGS (Keep these for now)
            console.log(`DEBUG SPAWN Check: Level=${this.difficultyLevel}, Rand=${rand.toFixed(3)}, DodgeChance=${dodgeChance.toFixed(3)}, ShooterChance=${shooterChance.toFixed(3)}`);

            if (rand < dodgeChance) {
                console.log("DEBUG SPAWN: Spawning DodgerPlane");
                planeToAdd = new EnemyDodgingPlane(this, speedBoost);
            } else if (rand < dodgeChance + shooterChance) {
                console.log("DEBUG SPAWN: Spawning ShooterPlane");
                planeToAdd = new EnemyShooterPlane(this, speedBoost);
            } else {
                console.log("DEBUG SPAWN: Spawning EnemyPlane (Base)");
                planeToAdd = new EnemyPlane(this, speedBoost);
            }
            this.enemies.push(planeToAdd);
        }

        // Spawn Ships
        this.enemyShipTimer += deltaTime;
        if (this.enemyShipTimer >= currentShipInterval) {
            // --- Corrected Timer Reset ---
            this.enemyShipTimer -= currentShipInterval; // Subtract interval
            // Or use modulo: this.enemyShipTimer %= currentShipInterval;

            let shipToAdd;
            const rand = Math.random();

            const trackingChance = this.difficultyLevel > 1 ? 0.15 + this.difficultyLevel * 0.05 : 0;
            const shooterChance = this.difficultyLevel > 0 ? 0.35 + this.difficultyLevel * 0.10 : 0;

            if (rand < trackingChance) shipToAdd = new EnemyTrackingShip(this, speedBoost);
            else if (rand < trackingChance + shooterChance) shipToAdd = new EnemyShooterShip(this, speedBoost);
            else shipToAdd = new EnemyShip(this, speedBoost);
            this.enemies.push(shipToAdd);
        }
    } // End of handleSpawning

    handleCollisions() {
        // Player Projectiles vs Enemies
        this.projectiles.forEach(p => {
            if (p.markedForDeletion) return;
            this.enemies.forEach(e => {
                if (e.markedForDeletion || p.markedForDeletion) return;
                if (checkCollision(p, e)) {
                    const pType = p instanceof Bomb ? 'bomb' : 'bullet';
                    e.hit(p.damage, pType);
                    if (!(p instanceof Bomb && (e instanceof EnemyPlane || e instanceof EnemyDodgingPlane || e instanceof EnemyShooterPlane))) { p.markedForDeletion = true; }
                }
            });
        });
        // Player vs Enemy Projectiles
        this.enemyProjectiles.forEach(ep => {
            if (ep.markedForDeletion) return;
            if (checkCollision(this.player, ep)) {
                if (!this.player.shieldActive && this.player.invincible) { }
                else { ep.markedForDeletion = true; this.player.hit(); }
            }
        });
        // Player vs Enemies
        if (!this.player.shieldActive && !this.player.invincible) {
            this.enemies.forEach(e => {
                if (e.markedForDeletion) return;
                if (checkCollision(this.player, e)) { e.hit(100); this.player.hit(); }
            });
        }
        // Player vs PowerUps
        this.powerUps.forEach(pu => {
            if (pu.markedForDeletion) return;
            if (checkCollision(this.player, pu)) { pu.activate(this.player); }
        });
    }

    cleanupObjects() {
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);
        this.enemyProjectiles = this.enemyProjectiles.filter(ep => !ep.markedForDeletion);
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.explosions = this.explosions.filter(ex => !ex.markedForDeletion);
        this.powerUps = this.powerUps.filter(pu => !pu.markedForDeletion);
    }

    addProjectile(projectile) { this.projectiles.push(projectile); }
    addEnemyProjectile(projectile) { this.enemyProjectiles.push(projectile); }
    createExplosion(x, y, type) { this.explosions.push(new Explosion(this, x, y, type)); }

    // Use specific PowerUp classes
    createPowerUp(x, y) {
        const rand = Math.random();
        let PowerUpClass = null;
        const shieldChance = 0.20, spreadChance = 0.20, lifeChance = 0.10;
        const bulletChance = 0.25, bombChance = 0.25; // Sum should be <= 1

        if (rand < shieldChance) PowerUpClass = PowerUpShield;
        else if (rand < shieldChance + spreadChance) PowerUpClass = PowerUpSpreadShot;
        else if (rand < shieldChance + spreadChance + lifeChance && this.player.lives < this.player.maxLives) PowerUpClass = PowerUpExtraLife;
        else if (rand < shieldChance + spreadChance + lifeChance + bulletChance) PowerUpClass = PowerUpBullet;
        else PowerUpClass = PowerUpBomb; // Assign remaining probability

        if (PowerUpClass) { this.powerUps.push(new PowerUpClass(this, x, y)); }
    }

    addScore(amount) { this.score += amount; this.updateScoreUI(); }
    updateUI() {
        this.updateScoreUI(); this.updateLivesUI();
        this.updateDifficultyUI(); this.updatePowerUpStatus('');
    }
    updateScoreUI() { if (this.scoreElement) this.scoreElement.textContent = `Score: ${this.score}`; }
    updateLivesUI() {
        if (this.livesElement && this.player) {
            this.livesElement.textContent = `Lives: ${this.player.lives}`;
            this.livesElement.classList.toggle('low-lives', this.player.lives <= 1);
        }
    }
    updateDifficultyUI() { if (this.difficultyElement) this.difficultyElement.textContent = `Level: ${this.difficultyLevel}`; }
    updatePowerUpStatus(text) {
        if (this.powerupStatusElement) {
            this.powerupStatusElement.textContent = this.isGameOver ? '' : text;
        }
    }

    // --- Game State Methods ---
    gameOver() {
        if (!this.isGameOver) {
            console.log("--- GAME OVER ---");
            this.isGameOver = true;
            if (this.gameOverElement) this.gameOverElement.style.display = 'block';
            else console.error("Game Over element not found!");
            playSound('gameOver');
            this.updatePowerUpStatus('');
            if (this.livesElement) this.livesElement.classList.remove('low-lives');
        }
    }

    restart() {
        console.log("--- Restarting Game ---");
        try {
            if (this.player) this.player.reset(); else console.error("Restart: Player missing!");

            this.projectiles = []; this.enemyProjectiles = []; this.enemies = [];
            this.explosions = []; this.powerUps = [];
            console.log("DEBUG: RESTART - Arrays cleared.");

            this.score = 0; this.difficultyLevel = 0; this.scoreForNextLevel = 300;
            this.isGameOver = false; // CRITICAL
            console.log(`DEBUG: RESTART - isGameOver is now: ${this.isGameOver}`);

            this.enemyPlaneTimer = 0; this.enemyShipTimer = 0;
            this.lastTime = 0; // Reset lastTime for deltaTime
            console.log("DEBUG: RESTART - Timers and lastTime reset.");

            if (this.gameOverElement) this.gameOverElement.style.display = 'none';
            this.updateUI(); // Update all UI elements
            console.log("DEBUG: RESTART - UI updated.");

            console.log("DEBUG: RESTART - Requesting animation frame.");
            requestAnimationFrame(this.loop.bind(this)); // Kick off loop again

        } catch (error) {
            console.error("DEBUG: ERROR INSIDE RESTART FUNCTION!", error);
        }
    }

    drawGameOver() {
        if (!this.context) return;
        this.context.fillStyle = 'rgba(0, 0, 0, 0.5)';
        this.context.fillRect(0, 0, this.width, this.height);
    }

    start() {
        console.log("Game Starting...");
        this.isGameOver = false;
        this.lastTime = 0; // Reset time
        this.score = 0; this.difficultyLevel = 0; this.scoreForNextLevel = 300;
        if (this.player) this.player.reset(); // Reset player
        // Clear all dynamic objects
        this.projectiles = []; this.enemyProjectiles = []; this.enemies = [];
        this.explosions = []; this.powerUps = [];
        this.enemyPlaneTimer = 0; this.enemyShipTimer = 0; // Reset timers

        this.updateUI(); // Set initial UI

        requestAnimationFrame(this.loop.bind(this)); // Start the main loop
    }

} // End of Game class