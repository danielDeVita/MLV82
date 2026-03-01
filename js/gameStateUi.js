import { playSound } from "./audio.js";

export function gameWon(game) {
  if (game.isGameWon || game.isGameOver) {
    return;
  }
  game.isGameWon = true;

  if (game.finalScoreWonElement) {
    game.finalScoreWonElement.textContent = `Final Score: ${game.score}`;
  } else {
    console.error("Final Score Won UI element not found!");
  }

  if (game.gameWonElement) {
    game.gameWonElement.style.display = "block";
  } else {
    console.error("Game Won UI element not found!");
  }

  playSound("gameWon");
  updatePowerUpStatus(game, "");
  if (game.livesElement) {
    game.livesElement.classList.remove("low-lives");
  }
}

export function gameOver(game) {
  if (!game.isGameOver && !game.isGameWon) {
    game.isGameOver = true;
    if (game.gameOverElement) game.gameOverElement.style.display = "block";
    else console.error("Game Over UI element not found!");
    playSound("gameOver");
    updatePowerUpStatus(game, "");
    if (game.livesElement) game.livesElement.classList.remove("low-lives");
  }
}

export function drawGameOver(game) {
  if (!game.context) return;
  game.context.fillStyle = "rgba(0,0,0,0.5)";
  game.context.fillRect(0, 0, game.width, game.height);
}

export function drawGameWon(game) {
  if (!game.context) return;
  // Optional background effect for won overlay can be added here later.
}

export function updateUI(game) {
  updateScoreUI(game);
  updateLivesUI(game);
  updateDifficultyUI(game);
  updatePowerUpStatus(game, "");
  updateAmmoUI(game);
}

export function updateScoreUI(game) {
  if (game.scoreElement) game.scoreElement.textContent = `Score: ${game.score}`;
}

export function updateLivesUI(game) {
  if (game.livesElement && game.player) {
    game.livesElement.textContent = `Lives: ${game.player.lives}`;
    game.livesElement.classList.toggle("low-lives", game.player.lives <= 1);
  }
}

export function updateDifficultyUI(game) {
  if (game.difficultyElement)
    game.difficultyElement.textContent = `Level: ${game.difficultyLevel}`;
}

export function updatePowerUpStatus(game, text = "") {
  if (game.powerupStatusElement) {
    game.powerupStatusElement.textContent =
      game.isGameOver || game.isGameWon ? "" : text;
  }
}

export function updateDifficulty(game) {
  if (
    !game.isGameOver &&
    !game.isGameWon &&
    game.score >= game.scoreForNextLevel
  ) {
    game.difficultyLevel++;
    game.scoreForNextLevel += 300 + game.difficultyLevel ** 2 * 50;
    updateDifficultyUI(game);
    game.powerUpDropChance = Math.min(0.25, 0.1 + game.difficultyLevel * 0.015);
  }
}

export function initializeLevel(game, config = {}) {
  const defaults = {
    startScore: 0,
    startDifficulty: 0,
    playerLives: 3,
    defeatedBosses: [],
    startWithPowerups: [],
  };
  if (game.player) defaults.playerLives = game.player.initialLives || 3;
  const effectiveConfig = { ...defaults, ...config };

  // Invalidate asynchronous callbacks scheduled by previous runs.
  game.runId = (game.runId || 0) + 1;

  game.isGameOver = false;
  game.isGameWon = false;

  game.lastTime = 0;
  game.score = effectiveConfig.startScore;
  game.difficultyLevel = effectiveConfig.startDifficulty;
  game.scoreForNextLevel = 300;
  for (let i = 0; i < game.difficultyLevel; i++) {
    game.scoreForNextLevel += 300 + i ** 2 * 50;
  }

  if (game.player) {
    game.player.initialLives = effectiveConfig.playerLives;
    game.player.reset();

    effectiveConfig.startWithPowerups.forEach((powerupName) => {
      switch (powerupName.toLowerCase()) {
        case "shield":
          game.player.activateShield();
          break;
        case "spread":
          game.player.activateSpreadShot();
          break;
        case "bullet":
          game.player.activateBulletPowerUp();
          break;
        case "bomb":
          game.player.activateBombPowerUp();
          break;
        case "rapid":
          game.player.activateRapidFire();
          break;
        case "invincibility":
          game.player.activateInvincibilityPowerUp();
          break;
        default:
          console.warn(`   Unknown starting powerup: ${powerupName}`);
      }
    });
  } else {
    console.error("INIT LEVEL Error: Player object does not exist!");
    return;
  }

  game.projectiles = [];
  game.enemyProjectiles = [];
  game.enemies = [];
  game.explosions = [];
  game.powerUps = [];

  game.enemyPlaneTimer = 0;
  game.enemyShipTimer = 0;
  game.boss1HelperPlaneTimer = 0;
  game.bossPowerUpTimer = 0;
  game.bossPowerUpInterval =
    game.defaultBossPowerUpBaseInterval +
    Math.random() * game.defaultBossPowerUpRandomInterval;

  game.bossActive = false;
  game.currentBossInstance = null;
  game.currentBossNumber = null;
  game.boss3Ship = null;
  game.boss3Plane = null;
  game.boss1Defeated = effectiveConfig.defeatedBosses.includes(1);
  game.boss2Defeated = effectiveConfig.defeatedBosses.includes(2);
  game.boss3Defeated = effectiveConfig.defeatedBosses.includes(3);
  game.isSpawningPlaneHelpers = false;
  game.helperPlaneSpawnTimer = 0;
  game.isSpawningShipHelpers = false;
  game.helperShipSpawnTimer = 0;

  updateUI(game);

  if (game.gameOverElement) game.gameOverElement.style.display = "none";
  if (game.gameWonElement) game.gameWonElement.style.display = "none";
}

export function updateAmmoUI(game) {
  if (game.player) {
    if (game.bulletAmmoElement) {
      game.bulletAmmoElement.textContent = `Bullets: ${game.player.bulletAmmo}`;
      game.bulletAmmoElement.classList.toggle(
        "low-ammo",
        game.player.bulletAmmo <= 50
      );
    }
    if (game.bombAmmoElement) {
      game.bombAmmoElement.textContent = `Bombs: ${game.player.bombAmmo}`;
      game.bombAmmoElement.classList.toggle("low-ammo", game.player.bombAmmo <= 5);
    }
  } else {
    if (game.bulletAmmoElement) game.bulletAmmoElement.textContent = "Bullets: ---";
    if (game.bombAmmoElement) game.bombAmmoElement.textContent = "Bombs: ---";
  }
}
