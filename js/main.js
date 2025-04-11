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

    // 1. Normal Release Start:
    // const gameConfig = {}; // Empty uses defaults (score 0, level 0, 3 lives, no bosses defeated)

    // 2. Test Boss 1 Start:
    // const gameConfig = {
    //     startScore: 800,
    //     startDifficulty: 2, // Approx level for score 800
    //     playerLives: 99,
    //     defeatedBosses: [], // No bosses defeated yet
    //     startWithPowerups: ['shield']
    // };

    // 3. Test Boss 2 Start:
    // const gameConfig = {
    //     startScore: 5000,
    //     startDifficulty: 4,
    //     playerLives: 99,
    //     defeatedBosses: [1], // Boss 1 is defeated
    //     startWithPowerups: ['shield', 'rapid', 'spread']
    // };

    // 4. Test Boss 3 Start:
    // const gameConfig = {
    //     startScore: 9500,
    //     startDifficulty: 6,
    //     playerLives: 99,
    //     defeatedBosses: [1, 2], // Boss 1 & 2 defeated
    //     startWithPowerups: ['bullet', 'bomb', 'shield', 'invincibility']
    // };

    // 5. Test Mine Layers / Beam Ships (Example):
    // const gameConfig = {
    //     startScore: 3000, // Score where these enemies might start appearing frequently
    //     startDifficulty: 4,
    //     playerLives: 10
    // };

    // 6. Configuration for extended playthrough
    const gameConfig = {
      startScore: 0, // Start from the beginning
      startDifficulty: 0, // Start at level 0
      playerLives: 300, // Start with a huge number of lives
      defeatedBosses: [], // No bosses defeated at start
      startWithPowerups: [], // Start with no powerups (optional, could add ['shield'] etc.)
    };

    // --- Pass the CHOSEN config to game.start ---
    game.start(gameConfig);

    console.log("game.start() called.");
  } catch (error) {
    console.error("Error during game initialization:", error);
  }
});
