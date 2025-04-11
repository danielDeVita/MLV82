import { Projectile } from "./projectile.js";

export class Bomb extends Projectile {
  constructor(game, x, y, poweredUp = false) {
    super(game, x, y);
    this.width = poweredUp ? 12 : 8;
    this.height = poweredUp ? 12 : 8;
    this.speedY = 3; // Vertical speed
    this.gravity = 0.1;
    this.color = poweredUp ? "cyan" : "black";
    this.damage = poweredUp ? 5 : 3; // Bombs do more damage
    this.poweredUp = poweredUp;
    this.groundLevel = game.height - 50; // Approximate ground/sea impact level
  }

  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67; // Scaling factor

    // --- Apply gravity (acceleration should scale with time squared, but scaling velocity is simpler) ---
    // Scale the change in speedY by deltaScale
    this.speedY += this.gravity * deltaScale;

    // --- Apply vertical movement (Scale the current speedY by deltaScale) ---
    this.y += this.speedY * deltaScale;

    // Check if hit ground/sea level
    if (this.y + this.height >= this.groundLevel) {
      this.y = this.groundLevel - this.height; // Stop at ground level
      this.markedForDeletion = true;
      this.game.createExplosion(
        this.x + this.width / 2,
        this.y + this.height / 2,
        "ground"
      );
    }
    // Note: Horizontal movement isn't typical for bombs unless dropped with plane's velocity
  } // End of Bomb update

  draw(context) {
    context.fillStyle = this.color;
    // Draw a simple circle for the bomb
    context.beginPath();
    context.arc(
      this.x + this.width / 2,
      this.y + this.height / 2,
      this.width / 2,
      0,
      Math.PI * 2
    );
    context.fill();

    if (this.poweredUp) {
      context.strokeStyle = "white";
      context.lineWidth = 1;
      context.stroke();
    }
  }
}
