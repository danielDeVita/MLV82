import { PowerUpShield } from "./powerUpShield.js";
import { PowerUpSpreadShot } from "./powerUpSpreadShot.js";
import { PowerUpExtraLife } from "./powerUpExtraLife.js";
import { PowerUpBullet } from "./powerUpBullet.js";
import { PowerUpBomb } from "./powerUpBomb.js";
import { PowerUpRapidFire } from "./powerUpRapidFire.js";
import { PowerUpInvincibility } from "./powerUpInvincibility.js";
import { PowerUpSuperBomb } from "./powerUpSuperBomb.js";

export const POWERUP_CHANCES = {
  shield: 0.15,
  spread: 0.15,
  life: 0.07,
  bullet: 0.15,
  bomb: 0.15,
  rapid: 0.12,
  invincibility: 0.11,
  superBomb: 0.1,
};

export function createPowerUp(game, x, y, originType = "air") {
  const rand = Math.random();
  let PowerUpClass = null;
  let cumulative = 0;

  if (rand < (cumulative += POWERUP_CHANCES.shield)) {
    PowerUpClass = PowerUpShield;
  } else if (rand < (cumulative += POWERUP_CHANCES.spread)) {
    PowerUpClass = PowerUpSpreadShot;
  } else if (
    rand < (cumulative += POWERUP_CHANCES.life) &&
    game.player &&
    game.player.lives < game.player.maxLives
  ) {
    PowerUpClass = PowerUpExtraLife;
  } else if (rand < (cumulative += POWERUP_CHANCES.bullet)) {
    PowerUpClass = PowerUpBullet;
  } else if (rand < (cumulative += POWERUP_CHANCES.bomb)) {
    PowerUpClass = PowerUpBomb;
  } else if (rand < (cumulative += POWERUP_CHANCES.rapid)) {
    PowerUpClass = PowerUpRapidFire;
  } else if (rand < (cumulative += POWERUP_CHANCES.invincibility)) {
    PowerUpClass = PowerUpInvincibility;
  } else if (rand < (cumulative += POWERUP_CHANCES.superBomb)) {
    PowerUpClass = PowerUpSuperBomb;
  }

  if (PowerUpClass) {
    game.powerUps.push(new PowerUpClass(game, x, y, originType));
  }
}

