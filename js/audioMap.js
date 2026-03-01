// Centralized sound catalog for canonical sound keys and compatibility aliases.
export const SOUND_DEFS = {
  shoot: { file: "shoot", volume: 0.3 },
  bomb: { file: "bomb_drop", volume: 0.5 },
  explosion: { file: "explosion", volume: 0.4 },
  powerup: { file: "powerup", volume: 0.5 },
  gameOver: { file: "game_over", volume: 0.6 },
  hit: { file: "hit", volume: 0.5 },
  enemyShoot: { file: "enemy_shoot", volume: 0.2 },
  missileLaunch: { file: "missile_launch", volume: 0.4 },
  shieldUp: { file: "shield_up", volume: 0.5 },
  shieldDown: { file: "shield_down", volume: 0.5 },
  extraLife: { file: "extra_life", volume: 0.6 },
  powerupExpire: { file: "powerup_expire", volume: 0.3 },
  rapidFirePickup: { file: "rapidFirePickup", volume: 0.5 },
  invinciblePickup: { file: "invinciblePickup", volume: 0.5 },
  charge_up: { file: "charge_up", volume: 0.4 },
  laser_beam: { file: "laser_beam", volume: 0.6 },
};

// Backward-compatible aliases used across older gameplay code paths.
export const SOUND_ALIASES = {
  bomb_drop: "bomb",
  gameWon: "powerup",
  splash: "powerupExpire",
  ammoEmpty: "powerupExpire",
  bossPlaneDestroyed: "explosion",
  bossShipDestroyed: "explosion",
  enemy_spawn: "enemyShoot",
  laser_end: "powerupExpire",
  puff: "powerupExpire",
  superBombArmed: "powerup",
};

