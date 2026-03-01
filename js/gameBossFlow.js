import { Boss1 } from "./boss1.js";
import { Boss2 } from "./boss2.js";
import { Boss3Ship } from "./boss3Ship.js";
import { Boss3Plane } from "./boss3Plane.js";

export function handleBossState(game) {
  if (!game.bossActive) {
    if (!game.boss1Defeated && game.score >= game.BOSS1_SCORE_THRESHOLD) {
      spawnBoss(game, 1);
    } else if (
      game.boss1Defeated &&
      !game.boss2Defeated &&
      game.score >= game.BOSS2_SCORE_THRESHOLD
    ) {
      spawnBoss(game, 2);
    } else if (
      game.boss1Defeated &&
      game.boss2Defeated &&
      !game.boss3Defeated &&
      game.score >= game.BOSS3_SCORE_THRESHOLD
    ) {
      spawnBoss(game, 3);
    }
    return;
  }

  if (game.currentBossNumber === 3) {
    const shipExistsAndActive = game.boss3Ship && !game.boss3Ship.markedForDeletion;
    const planeExistsAndActive =
      game.boss3Plane && !game.boss3Plane.markedForDeletion;

    if (!shipExistsAndActive && planeExistsAndActive && !game.isSpawningShipHelpers) {
      game.isSpawningShipHelpers = true;
      game.helperShipSpawnTimer = 0;
      game.isSpawningPlaneHelpers = false;
    } else if (
      !planeExistsAndActive &&
      shipExistsAndActive &&
      !game.isSpawningPlaneHelpers
    ) {
      game.isSpawningPlaneHelpers = true;
      game.helperPlaneSpawnTimer = 0;
      game.isSpawningShipHelpers = false;
    }

    if (!shipExistsAndActive && !planeExistsAndActive && !game.boss3Defeated) {
      bossDefeated(game, 3);
    }
    return;
  }

  if (game.currentBossInstance && game.currentBossInstance.markedForDeletion) {
    bossDefeated(game, game.currentBossNumber);
  }
}

export function spawnBoss(game, bossNumber) {
  if (game.bossActive) {
    console.warn(`Attempted to spawn Boss ${bossNumber} while boss already active.`);
    return;
  }

  game.bossActive = true;
  game.currentBossNumber = bossNumber;
  game.enemies = [];
  game.enemyProjectiles = [];

  if (bossNumber === 3) {
    try {
      game.boss3Ship = new Boss3Ship(game);
      game.boss3Plane = new Boss3Plane(game);
      game.enemies.push(game.boss3Ship);
      game.enemies.push(game.boss3Plane);
      game.currentBossInstance = null;
    } catch (error) {
      console.error("ERROR Instantiating Boss 3 Components:", error);
      game.bossActive = false;
      game.currentBossNumber = null;
      game.boss3Ship = null;
      game.boss3Plane = null;
      return;
    }
  } else {
    let bossInstance = null;
    try {
      if (bossNumber === 1) {
        bossInstance = new Boss1(game);
      } else if (bossNumber === 2) {
        bossInstance = new Boss2(game);
      }
    } catch (error) {
      console.error(`Error instantiating Boss ${bossNumber}:`, error);
      game.bossActive = false;
      game.currentBossNumber = null;
      return;
    }

    if (bossInstance) {
      game.enemies.push(bossInstance);
      game.currentBossInstance = bossInstance;
      game.boss3Ship = null;
      game.boss3Plane = null;
    } else {
      console.error(`Unknown boss number ${bossNumber} to spawn.`);
      game.bossActive = false;
      game.currentBossNumber = null;
      return;
    }
  }

  game.bossPowerUpTimer = 0;
  let baseInterval;
  let randomInterval;
  if (bossNumber === 2) {
    baseInterval = game.boss2PowerUpBaseInterval;
    randomInterval = game.boss2PowerUpRandomInterval;
  } else {
    baseInterval = game.defaultBossPowerUpBaseInterval;
    randomInterval = game.defaultBossPowerUpRandomInterval;
  }
  game.bossPowerUpInterval = baseInterval + Math.random() * randomInterval;
}

export function bossDefeated(game, bossNumber) {
  if (
    !game.bossActive &&
    ((bossNumber === 1 && game.boss1Defeated) ||
      (bossNumber === 2 && game.boss2Defeated) ||
      (bossNumber === 3 && game.boss3Defeated))
  ) {
    return;
  }

  if (bossNumber === 1) {
    game.boss1Defeated = true;
  } else if (bossNumber === 2) {
    game.boss2Defeated = true;
  } else if (bossNumber === 3) {
    game.boss3Defeated = true;
  }

  game.bossActive = false;
  game.currentBossInstance = null;
  game.currentBossNumber = null;
  game.boss3Ship = null;
  game.boss3Plane = null;
  game.isSpawningPlaneHelpers = false;
  game.isSpawningShipHelpers = false;

  const numPowerups = bossNumber === 1 ? 3 : bossNumber === 2 ? 4 : 5;
  const dropX = game.width / 2;
  const dropY = 100;

  for (let i = 0; i < numPowerups; i++) {
    game.createPowerUp(
      dropX + (Math.random() - 0.5) * 150,
      dropY + (Math.random() - 0.5) * 40,
      "air"
    );
  }

  game.enemyPlaneTimer = 0;
  game.enemyShipTimer = 0;
  if (bossNumber === 1) game.boss1HelperPlaneTimer = 0;

  if (bossNumber === 3) {
    const runId = game.runId;
    setTimeout(() => {
      if (!game || game.runId !== runId) return;
      game.gameWon();
    }, 1500);
  }
}
