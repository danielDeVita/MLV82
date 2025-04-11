// js/mine.js
import { playSound } from "./audio.js";
// Mines don't really need to inherit Projectile if they don't move after spawn
// Let's make it a distinct object type for clarity.

export class Mine {
  constructor(game, x, y) {
    this.game = game;
    this.x = x;
    this.y = y;
    this.width = 20; // Collision width
    this.height = 20; // Collision height
    this.image = null; // Placeholder for a potential mine sprite
    this.color = "#DC143C"; // Crimson red for visibility
    this.outlineColor = "#A00000";

    this.markedForDeletion = false;

    // Lifespan
    this.maxLifetime = 7000 + Math.random() * 3000; // Exists for 7-10 seconds
    this.lifetimeTimer = this.maxLifetime;

    // Optional: Blinking before despawn
    this.blinkDuration = 1000; // Start blinking 1 second before despawn
    this.isBlinking = false;

    // console.log(`Mine created at ${this.x.toFixed(0)}, ${this.y.toFixed(0)}`);
  }

  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);

    // Countdown lifespan
    this.lifetimeTimer -= safeDeltaTime;

    // Check for blinking state
    this.isBlinking = this.lifetimeTimer <= this.blinkDuration;

    // Mark for deletion if lifespan ends
    if (this.lifetimeTimer <= 0) {
      this.markedForDeletion = true;
      // Optional: small puff effect when despawning?
      // this.game.createExplosion(this.x + this.width/2, this.y + this.height/2, 'tiny');
      playSound("powerupExpire"); // Use a subtle sound for despawn
    }

    // --- No movement logic needed as it's stationary ---
  }

  draw(context) {
    if (this.markedForDeletion) return;

    context.save();

    // Blinking effect
    if (this.isBlinking && Math.floor(Date.now() / 150) % 2 === 0) {
      // Don't draw every few frames to simulate blink
      context.restore();
      return;
    }

    // --- Draw a simple spiky mine shape ---
    const centerX = this.x + this.width / 2;
    const centerY = this.y + this.height / 2;
    const radius = this.width / 2;
    const spikes = 8;
    const outerRadius = radius * 0.9;
    const innerRadius = radius * 0.5;

    context.fillStyle = this.color;
    context.strokeStyle = this.outlineColor;
    context.lineWidth = 2;

    context.beginPath();
    context.moveTo(centerX + outerRadius, centerY); // Start point

    for (let i = 0; i < spikes; i++) {
      // Outer spike point
      let angle = (i + 0.5) * ((Math.PI * 2) / spikes);
      context.lineTo(
        centerX + outerRadius * Math.cos(angle),
        centerY + outerRadius * Math.sin(angle)
      );
      // Inner valley point
      angle = (i + 1.0) * ((Math.PI * 2) / spikes);
      context.lineTo(
        centerX + innerRadius * Math.cos(angle),
        centerY + innerRadius * Math.sin(angle)
      );
    }
    context.closePath();
    context.fill();
    context.stroke();
    // --- End mine shape ---

    context.restore();
  }

  // No hit() method needed for Option B (indestructible by shots)
  // Collision handling will be done in Game.js
}
