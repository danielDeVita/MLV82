import { EnemyPlane } from "./enemyPlane.js";
import { EnemyShip } from "./enemyShip.js";
import { EnemyShooterPlane } from "./enemyShooterPlane.js";
import { EnemyShooterShip } from "./enemyShooterShip.js";
import { EnemyDodgingPlane } from "./enemyDodgingPlane.js";
import { EnemyTrackingShip } from "./enemyTrackingShip.js";
import { EnemyMineLayerPlane } from "./enemyMineLayerPlane.js";
import { EnemyBeamShip } from "./enemyBeamShip.js";

const SPECIAL_SPAWN_CAP = 0.95; // Aggressive preset

function normalizeSpecialChances(chances, maxSpecialTotal = 0.85) {
  const normalized = {};
  let total = 0;

  for (const [key, value] of Object.entries(chances)) {
    const safeValue = Number.isFinite(value) ? Math.max(0, value) : 0;
    normalized[key] = safeValue;
    total += safeValue;
  }

  if (total > maxSpecialTotal && total > 0) {
    const scale = maxSpecialTotal / total;
    for (const key of Object.keys(normalized)) {
      normalized[key] *= scale;
    }
    total = maxSpecialTotal;
  }

  return { ...normalized, baseChance: Math.max(0, 1 - total) };
}

export function handleSpawning(game, deltaTime) {
  if (game.bossActive) {
    if (
      game.currentBossNumber === 1 &&
      game.currentBossInstance &&
      game.currentBossInstance.activeWeakPoints <= 2 &&
      game.currentBossInstance.activeWeakPoints > 0
    ) {
      game.boss1HelperPlaneTimer -= deltaTime;
      if (game.boss1HelperPlaneTimer <= 0) {
        game.boss1HelperPlaneTimer =
          game.boss1HelperPlaneBaseInterval +
          Math.random() * game.boss1HelperPlaneRandomInterval;
        const speedBoost = game.difficultyLevel * 0.2;
        const PlaneClass =
          Math.random() < 0.6 ? EnemyShooterPlane : EnemyDodgingPlane;
        game.enemies.push(new PlaneClass(game, speedBoost));
      }
    } else if (game.currentBossNumber === 3) {
      if (game.isSpawningPlaneHelpers) {
        game.helperPlaneSpawnTimer -= deltaTime;
        if (game.helperPlaneSpawnTimer <= 0) {
          spawnBoss3HelperPlanes(game, 1, "mixed");
          game.helperPlaneSpawnTimer =
            game.helperPlaneSpawnInterval + Math.random() * 1000 - 500;
        }
      }
      if (game.isSpawningShipHelpers) {
        game.helperShipSpawnTimer -= deltaTime;
        if (game.helperShipSpawnTimer <= 0) {
          spawnBoss3HelperShips(game, 1, "mixed");
          game.helperShipSpawnTimer =
            game.helperShipSpawnInterval + Math.random() * 1500 - 750;
        }
      }
    }
    return;
  }

  const speedBoost = game.difficultyLevel * 0.3;
  const minPlaneInt = 500;
  const minShipInt = 1800;
  const planeReduct = game.difficultyLevel * 150;
  const shipReduct = game.difficultyLevel * 300;
  const currentPlaneInt = Math.max(
    minPlaneInt,
    game.baseEnemyPlaneInterval - planeReduct
  );
  const currentShipInt = Math.max(
    minShipInt,
    game.baseEnemyShipInterval - shipReduct
  );
  const level = game.difficultyLevel;

  game.enemyPlaneTimer += deltaTime;
  if (game.enemyPlaneTimer >= currentPlaneInt) {
    game.enemyPlaneTimer = 0;
    let PlaneClass = null;
    let mineLayerChance = 0;
    let dodgerChance = 0;
    let shooterPlaneChance = 0.25;

    if (game.boss2Defeated && level > 4) {
      mineLayerChance = 0.15 + level * 0.03;
      dodgerChance = 0.2 + level * 0.04;
      shooterPlaneChance = 0.35 + level * 0.03;
    } else if (game.boss1Defeated && level > 1) {
      dodgerChance = 0.15 + level * 0.05;
      shooterPlaneChance = 0.3 + level * 0.05;
    } else {
      shooterPlaneChance = 0.2 + level * 0.1;
    }

    const planeChances = normalizeSpecialChances(
      { mineLayerChance, dodgerChance, shooterPlaneChance },
      SPECIAL_SPAWN_CAP
    );
    const rPlane = Math.random();
    if (rPlane < planeChances.mineLayerChance) PlaneClass = EnemyMineLayerPlane;
    else if (rPlane < planeChances.mineLayerChance + planeChances.dodgerChance)
      PlaneClass = EnemyDodgingPlane;
    else if (
      rPlane <
      planeChances.mineLayerChance +
        planeChances.dodgerChance +
        planeChances.shooterPlaneChance
    )
      PlaneClass = EnemyShooterPlane;
    else PlaneClass = EnemyPlane;

    if (PlaneClass) game.enemies.push(new PlaneClass(game, speedBoost));
  }

  game.enemyShipTimer += deltaTime;
  if (game.enemyShipTimer >= currentShipInt) {
    game.enemyShipTimer = 0;
    let ShipClass = null;
    let beamShipChance = 0;
    let trackingShipChance = 0;
    let shooterShipChance = 0.25;

    if (game.boss2Defeated && level > 5) {
      beamShipChance = 0.18 + level * 0.03;
      trackingShipChance = 0.2 + level * 0.04;
      shooterShipChance = 0.3 + level * 0.03;
    } else if (game.boss1Defeated && level > 1) {
      trackingShipChance = 0.15 + level * 0.05;
      shooterShipChance = 0.3 + level * 0.05;
    } else {
      shooterShipChance = 0.2 + level * 0.1;
    }

    const shipChances = normalizeSpecialChances(
      { beamShipChance, trackingShipChance, shooterShipChance },
      SPECIAL_SPAWN_CAP
    );
    const rShip = Math.random();
    if (rShip < shipChances.beamShipChance) ShipClass = EnemyBeamShip;
    else if (rShip < shipChances.beamShipChance + shipChances.trackingShipChance)
      ShipClass = EnemyTrackingShip;
    else if (
      rShip <
      shipChances.beamShipChance +
        shipChances.trackingShipChance +
        shipChances.shooterShipChance
    )
      ShipClass = EnemyShooterShip;
    else ShipClass = EnemyShip;

    if (ShipClass) game.enemies.push(new ShipClass(game, speedBoost));
  }
}

export function spawnBoss3HelperPlanes(game, count = 2, type = "mixed") {
  if (!game.enemies) return;
  for (let i = 0; i < count; i++) {
    let PlaneClass = EnemyShooterPlane;
    if (type === "mixed" && Math.random() < 0.5)
      PlaneClass = EnemyDodgingPlane;
    else if (type === "dodger") PlaneClass = EnemyDodgingPlane;
    try {
      const helperPlane = new PlaneClass(game, 0.2);
      game.enemies.push(helperPlane);
    } catch (error) {
      console.error("ERROR creating/pushing helper plane:", error);
    }
  }
}

export function spawnBoss3HelperShips(game, count = 2, type = "mixed") {
  for (let i = 0; i < count; i++) {
    let ShipClass = EnemyShooterShip;
    if (type === "mixed" && Math.random() < 0.4)
      ShipClass = EnemyTrackingShip;
    else if (type === "tracking") ShipClass = EnemyTrackingShip;
    const ship = new ShipClass(game, 0.1);
    ship.x = game.width + 60 + i * 90;
    ship.y -= i * 10;
    game.enemies.push(ship);
  }
}

export function spawnBoss2HelperShips(game, count = 1, type = "shooter") {
  for (let i = 0; i < count; i++) {
    let ship = null;
    const speedBoost = game.difficultyLevel * 0.1;
    if (type === "tracking") {
      ship = new EnemyTrackingShip(game, speedBoost);
    } else {
      ship = new EnemyShooterShip(game, speedBoost);
    }
    if (ship) {
      ship.y -= i * 15;
      ship.x = game.width + 50 + i * 80;
      game.enemies.push(ship);
    }
  }
}
