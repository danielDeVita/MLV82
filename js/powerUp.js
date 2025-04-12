import { playSound } from "./audio.js";
import { randomInt } from "./utils.js";

export class PowerUp {
  // <<< Add originType back to constructor parameters >>>
  constructor(game, x, y, originType = "air") {
    this.game = game;
    this.x = x - 10; // Adjust spawn slightly for center based on size 20
    this.y = y - 10; // Adjust spawn slightly for center
    this.size = 20;
    this.width = this.size;
    this.height = this.size;
    this.markedForDeletion = false;
    this.angle = 0;
    this.angleSpeed = Math.random() * 0.1 - 0.05;
    this.originType = originType; // <<< Store the origin type

    // --- >>> Set speedY based on originType <<< ---
    this.defaultSpeed = 1; // Base speed magnitude
    this.speedY =
      this.originType === "ship" || this.originType === "ground_installation" // <<< Check both ship and ground
        ? -this.defaultSpeed
        : this.defaultSpeed;
    // --- >>> END Speed Logic <<< ---

    // Base type/color/letter (Subclasses override this)
    this.type = "base";
    this.color = "grey";
    this.letter = "?";
  }

  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // Vertical Movement (Up or Down)
    this.y += this.speedY * deltaScale;

    // Rotation
    this.angle += this.angleSpeed * deltaScale;

    // --- >>> Modified Bounds Check <<< ---
    if (this.speedY > 0 && this.y > this.game.height) {
      // Moving down, off bottom screen
      this.markedForDeletion = true;
    } else if (this.speedY < 0 && this.y + this.size < 0) {
      // Moving up, off top screen
      this.markedForDeletion = true;
    }
    // --- >>> END Bounds Check <<< ---
  } // End of PowerUp update

  draw(context) {
    context.save();
    context.translate(this.x, this.y); // Move origin to powerup center for rotation
    context.rotate(this.angle);

    // Draw a simple box or circle
    context.fillStyle = this.color;
    context.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);

    // Draw letter indicator
    context.fillStyle = "black";
    context.font = "14px Arial";
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText(this.letter, 0, 1); // Slight offset for better centering

    context.restore();
  }

  activate(player) {
    playSound("powerup");
    this.markedForDeletion = true;
    if (this.type === "bullet") {
      player.activateBulletPowerUp();
    } else if (this.type === "bomb") {
      player.activateBombPowerUp();
    }
  }
}
