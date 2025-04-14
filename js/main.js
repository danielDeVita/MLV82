// js/main.js
import { Game } from "./game.js";

window.addEventListener("load", function () {
  console.log("Window loaded. Initializing game...");
  const canvasId = "gameCanvas";
  const gameWidth = 1280;
  const gameHeight = 720;

  try {
    const game = new Game(canvasId, gameWidth, gameHeight);
    console.log("Game instance created. Starting game...");

    // --- CHOOSE YOUR STARTING CONFIGURATION ---
    // --- (Uncomment ONLY ONE `gameConfig` block at a time!) ---

    // 1. Normal Release Start:
    // ----------------------------------------------------
    // const gameConfig = {}; // Score 0, Level 0, Lives 3 (from Player), Bosses [], Powerups []

    // 2. Test Boss 1 Start:
    // ----------------------------------------------------
    // const gameConfig = {
    //     startScore: 800,           // Meets B1 threshold
    //     startDifficulty: 2,        // Approx level for score 800
    //     playerLives: 99,           // High lives for testing
    //     defeatedBosses: [],        // B1 not defeated yet
    //     startWithPowerups: ['shield'] // Example starting powerup
    // };

    // 3. Test Boss 2 Start:
    // ----------------------------------------------------
    // const gameConfig = {
    //     startScore: 5000,          // Meets B2 threshold
    //     startDifficulty: 6,        // Approx level for score 5000
    //     playerLives: 99,
    //     defeatedBosses: [1],       // Boss 1 MUST be defeated
    //     startWithPowerups: ['shield', 'rapid', 'spread'] // Example starting powerups
    // };

    // 4. Test Boss 3 Start:
    // ----------------------------------------------------
    // const gameConfig = {
    //   startScore: 14000, // Meets B3 threshold
    //   startDifficulty: 9, // Approx level for score 14000
    //   playerLives: 99,
    //   defeatedBosses: [1, 2], // Boss 1 & 2 MUST be defeated
    //   startWithPowerups: ["bullet", "bomb", "shield", "invincibility"], // Example starting powerups
    // };

    // 5. Test Mine Layers / Beam Ships (Mid-game after Boss 2):
    // ----------------------------------------------------
    // const gameConfig = {
    //   startScore: 7000, // Between B2 and B3 scores
    //   startDifficulty: 7, // Level > 5, so Mine Layers & Beam Ships can spawn
    //   playerLives: 30, // Decent lives for testing this phase
    //   defeatedBosses: [1, 2], // B1 and B2 MUST be defeated
    //   startWithPowerups: ["spread", "rapid"], // Example starting powerups
    // };

    // 6. Configuration for Extended Playthrough (Start from Scratch, Many Lives):
    // ----------------------------------------------------
    // const gameConfig = {
    //   startScore: 0,
    //   startDifficulty: 0,
    //   playerLives: 300, // Set high lives in player.js maxLives too!
    //   defeatedBosses: [],
    //   startWithPowerups: [],
    // };

    // --- Pass the CHOSEN config to game.start ---
    game.start(gameConfig);

    console.log("game.start() called.");
  } catch (error) {
    console.error("Error during game initialization:", error);
  }
});
