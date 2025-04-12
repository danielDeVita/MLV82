import { PowerUp } from "./powerUp.js";
import { playSound } from "./audio.js";

export class PowerUpSpreadShot extends PowerUp {
  constructor(game, x, y, originType = "air") {
    // <<< Pass originType to super() >>>
    super(game, x, y, originType);
    this.type = "spread";
    this.color = "lime";
    this.letter = "W"; // W for Wide/Weapon
  }

  activate(player) {
    this.markedForDeletion = true;
    player.activateSpreadShot();
    playSound("powerup"); // Use generic powerup sound? Or specific one?
  }
}
