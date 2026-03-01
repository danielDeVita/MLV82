import { EnemyPlane } from "./enemyPlane.js";
import { EnemyShip } from "./enemyShip.js";
import { EnemyShooterPlane } from "./enemyShooterPlane.js";
import { EnemyShooterShip } from "./enemyShooterShip.js";
import { EnemyDodgingPlane } from "./enemyDodgingPlane.js";
import { EnemyTrackingShip } from "./enemyTrackingShip.js";
import { EnemyMineLayerPlane } from "./enemyMineLayerPlane.js";
import { Mine } from "./mine.js";
import { EnemyBeamShip } from "./enemyBeamShip.js";
import { SuperBomb } from "./superBomb.js";
import { Boss1 } from "./boss1.js";
import { Boss2 } from "./boss2.js";
import { Boss3Ship } from "./boss3Ship.js";
import { Boss3Plane } from "./boss3Plane.js";
import { checkCollision } from "./utils.js";
import { playSound } from "./audio.js";
import { Bomb } from "./bomb.js";

export function handleCollisions(game) {
  game.projectiles.forEach((projectile) => {
    if (!projectile || projectile.markedForDeletion) return;
    for (let i = 0; i < game.enemies.length; i++) {
      const enemy = game.enemies[i];
      if (!enemy || enemy.markedForDeletion || projectile.markedForDeletion)
        continue;

      if (!checkCollision(projectile, enemy)) continue;

      if (
        projectile instanceof SuperBomb &&
        (enemy instanceof EnemyPlane ||
          enemy instanceof Boss3Plane ||
          enemy.enemyType === "air")
      ) {
        enemy.hit(projectile);
        projectile.markedForDeletion = true;
        game.createExplosion(
          projectile.x + projectile.width / 2,
          projectile.y + projectile.height / 2,
          "air"
        );
      } else if (
        enemy instanceof Boss1 ||
        enemy instanceof Boss2 ||
        enemy instanceof Boss3Ship ||
        enemy instanceof Boss3Plane
      ) {
        enemy.hit(projectile);
      } else if (!(projectile instanceof SuperBomb)) {
        const projectileType = projectile instanceof Bomb ? "bomb" : "bullet";
        enemy.hit(projectile.damage || 1, projectileType);
        if (
          projectileType !== "bomb" ||
          enemy.enemyType === "ship" ||
          enemy.enemyType === "ground_installation"
        ) {
          projectile.markedForDeletion = true;
        }
      }

      if (projectile.markedForDeletion) break;
    }
  });

  game.enemyProjectiles.forEach((enemyProjectile) => {
    if (!enemyProjectile || enemyProjectile.markedForDeletion) return;
    if (!checkCollision(game.player, enemyProjectile)) return;

    if (game.player.shieldActive) {
      enemyProjectile.markedForDeletion = true;
      game.player.deactivateShield(true);
      game.createExplosion(
        enemyProjectile.x + enemyProjectile.width / 2,
        enemyProjectile.y + enemyProjectile.height / 2,
        "tiny"
      );
      return;
    }

    if (game.player.invincible) {
      if (!(enemyProjectile instanceof Mine)) {
        enemyProjectile.markedForDeletion = true;
        game.createExplosion(
          enemyProjectile.x + enemyProjectile.width / 2,
          enemyProjectile.y + enemyProjectile.height / 2,
          "tiny"
        );
      }
      return;
    }

    enemyProjectile.markedForDeletion = true;
    const explosionType = enemyProjectile instanceof Mine ? "ground" : "tiny";
    const sound = enemyProjectile instanceof Mine ? "explosion" : null;
    game.createExplosion(
      enemyProjectile.x + enemyProjectile.width / 2,
      enemyProjectile.y + enemyProjectile.height / 2,
      explosionType
    );
    if (sound) playSound(sound);
    game.player.hit();
  });

  if (!game.player.shieldActive && !game.player.invincible) {
    game.enemies.forEach((enemy) => {
      if (!enemy || enemy.markedForDeletion) return;
      if (!checkCollision(game.player, enemy)) return;

      let playerTakesDamage = false;
      if (
        enemy instanceof Boss1 ||
        enemy instanceof Boss2 ||
        enemy instanceof Boss3Ship ||
        enemy instanceof Boss3Plane
      ) {
        playerTakesDamage = true;
      } else if (enemy.enemyType !== "ground_installation") {
        enemy.hit(100, "collision");
        playerTakesDamage = true;
      }

      if (playerTakesDamage) {
        game.player.hit();
      }
    });
  }

  game.powerUps.forEach((powerUp) => {
    if (!powerUp || powerUp.markedForDeletion) return;
    if (checkCollision(game.player, powerUp)) {
      powerUp.activate(game.player);
    }
  });
}

export function cleanupObjects(game) {
  const superBombsHitWater = [];
  game.projectiles = game.projectiles.filter((projectile) => {
    if (!projectile.markedForDeletion) return true;
    if (projectile instanceof SuperBomb && projectile.hitWater) {
      superBombsHitWater.push(projectile);
      game.createExplosion(
        projectile.x + projectile.width / 2,
        projectile.y + projectile.height / 2 - 10,
        "waterSplash"
      );
      playSound("splash");
    }
    return false;
  });

  if (superBombsHitWater.length > 0) {
    triggerSuperBombEffect(game);
  }

  game.enemyProjectiles = game.enemyProjectiles.filter((o) => !o.markedForDeletion);
  game.enemies = game.enemies.filter((o) => !o.markedForDeletion);
  game.explosions = game.explosions.filter((o) => !o.markedForDeletion);
  game.powerUps = game.powerUps.filter((o) => !o.markedForDeletion);
}

export function triggerSuperBombEffect(game) {
  const shipDamage = 25;
  const planeDamage = 1;
  game.enemies.forEach((enemy) => {
    if (
      enemy.markedForDeletion ||
      enemy instanceof Boss1 ||
      enemy instanceof Boss2 ||
      enemy instanceof Boss3Ship ||
      enemy instanceof Boss3Plane
    )
      return;

    if (
      enemy instanceof EnemyShip ||
      enemy instanceof EnemyShooterShip ||
      enemy instanceof EnemyTrackingShip ||
      enemy instanceof EnemyBeamShip
    ) {
      enemy.hit(shipDamage, "bomb");
      game.createExplosion(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2,
        "ship"
      );
    } else if (
      enemy instanceof EnemyPlane ||
      enemy instanceof EnemyShooterPlane ||
      enemy instanceof EnemyDodgingPlane ||
      enemy instanceof EnemyMineLayerPlane
    ) {
      enemy.hit(planeDamage, "bomb");
    }
  });
}

