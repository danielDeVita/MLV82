// js/powerUpRapidFire.js
import { PowerUp } from "./powerUp.js";
import { playSound } from "./audio.js";

export class PowerUpRapidFire extends PowerUp {
  constructor(game, x, y, originType = "air") {
    // <<< Pass originType to super() >>>
    super(game, x, y, originType);
    // Override properties
    this.type = "rapidFire";
    this.color = "orange"; // Choose a distinct color
    this.letter = "R"; // 'R' for Rapid
  }

  // Override the activate method
  activate(player) {
    if (!player) return;
    this.markedForDeletion = true; // Remove the item
    player.activateRapidFire(); // Call the new method on player
    playSound("powerup"); // Use generic sound or add a specific one ('rapidFirePickup'?)
  }
}
