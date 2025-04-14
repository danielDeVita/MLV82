// js/bullet.js
import { Projectile } from "./projectile.js";

export class Bullet extends Projectile {
  constructor(game, x, y, poweredUp = false, angle = 0) {
    super(game, x, y);
    this.width = poweredUp ? 15 : 10;
    this.height = poweredUp ? 6 : 4;
    this.speed = 10;
    this.color = poweredUp ? "orange" : "yellow";
    this.damage = poweredUp ? 2 : 1;
    this.poweredUp = poweredUp;
    this.angle = angle;
    this.prevX = x; // Initialize previous position
    this.prevY = y; // Initialize previous position
  }

  update(deltaTime) {
    // Store position BEFORE moving
    this.prevX = this.x;
    this.prevY = this.y;

    // Movement Calculation
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;
    const moveSpeed = this.speed * deltaScale;
    this.x += Math.cos(this.angle) * moveSpeed;
    this.y += Math.sin(this.angle) * moveSpeed;

    // Off-Screen Check
    if (
      this.x > this.game.width ||
      this.x + this.width < 0 ||
      this.y > this.game.height ||
      this.y + this.height < 0
    ) {
      this.markedForDeletion = true;
    }
  }

  draw(context) {
    context.fillStyle = this.color;
    context.fillRect(this.x, this.y, this.width, this.height);
    if (this.poweredUp) {
      context.fillStyle = "rgba(255, 255, 0, 0.5)";
      context.fillRect(this.x - 5, this.y + 1, 5, this.height - 2);
    }
  }
}
