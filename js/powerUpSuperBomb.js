// js/powerUpSuperBomb.js
import { PowerUp } from "./powerUp.js";
import { playSound } from "./audio.js";

export class PowerUpSuperBomb extends PowerUp {
  constructor(game, x, y) {
    super(game, x, y);
    this.type = "superBomb";
    this.color = "#FFD700"; // Gold color for super bomb
    this.letter = "S"; // 'S' for Super? Or keep 'B' but different color? Let's use S.
  }

  activate(player) {
    if (!player) return;
    this.markedForDeletion = true;
    player.activateSuperBombPickup(); // Call method to arm the super bomb
    playSound("powerup"); // Or a special sound 'superBombArmed'
  }
}
