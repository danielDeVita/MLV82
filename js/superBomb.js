// js/superBomb.js
import { Bomb } from "./bomb.js"; // Inherit from regular Bomb

export class SuperBomb extends Bomb {
  constructor(game, x, y) {
    // Call parent Bomb constructor - don't need poweredUp for this one
    super(game, x, y, false);

    // Override properties for Super Bomb
    this.width = 14; // Make it bigger
    this.height = 14;
    this.color = "#FFD700"; // Gold color
    this.borderColor = "#FFA500"; // Orange outline
    this.damage = 50; // High damage if it directly hits a plane
    this.isSuper = true; // Flag to easily identify this type

    // Inherits speedY, gravity, groundLevel check from Bomb
  }

  // Override update slightly to mark *why* it's being deleted
  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    this.speedY += this.gravity * deltaScale;
    this.y += this.speedY * deltaScale;

    // Check if hit ground/sea level
    if (this.y + this.height >= this.groundLevel) {
      this.y = this.groundLevel - this.height; // Stop at ground level
      this.markedForDeletion = true;
      // --- ADD FLAG for hitting water ---
      this.hitWater = true;
      // Base Bomb creates explosion, maybe we don't want one here,
      // or want a specific water splash? For now, let base handle it.
      // this.game.createExplosion(this.x + this.width / 2, this.y + this.height / 2, 'ground');
    }
  }

  // Override draw for distinct appearance
  draw(context) {
    context.fillStyle = this.color;
    context.strokeStyle = this.borderColor;
    context.lineWidth = 2;

    // Draw a different shape? Maybe larger circle?
    context.beginPath();
    context.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2,
      0,
      Math.PI * 2
    );
    context.fill();
    context.stroke();

    // Add a simple 'S' or star?
    context.fillStyle = "black";
    context.font = "bold 10px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(
      "S",
      this.x + this.width / 2,
      this.y + this.height / 2 + 1
    );
  }
}
