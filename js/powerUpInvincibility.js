// js/powerUpInvincibility.js
import { PowerUp } from "./powerUp.js";
import { playSound } from "./audio.js";

export class PowerUpInvincibility extends PowerUp {
  constructor(game, x, y, originType = "air") {
    // <<< Pass originType to super() >>>
    super(game, x, y, originType);
    // Override properties
    this.type = "invincibility";
    this.color = "gold"; // Choose a distinct color
    this.letter = "I"; // 'I' for Invincible
  }

  // Override the activate method
  activate(player) {
    if (!player) return;
    this.markedForDeletion = true; // Remove the item
    player.activateInvincibilityPowerUp(); // Call the new method on player
    playSound("shieldUp"); // Reuse shield sound? Or add 'invinciblePickup'?
  }
}
