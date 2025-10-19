// js/enemyPlane.js
import { Enemy } from "./enemy.js";
import { randomInt } from "./utils.js"; // Keep for speed/position
import { lerp } from "./utils.js";

export class EnemyPlane extends Enemy {
  constructor(game, speedBoost = 0) {
    super(game);
    // ... Sprite, Scale, Dimensions ...
    this.spriteWidth = 256;
    this.spriteHeight = 256;
    this.scale = 0.65;
    this.width = this.spriteWidth * this.scale;
    this.height = this.spriteHeight * this.scale;
    // ... Positioning & Movement ...
    this.x = this.game.width;
    const topSpawnMargin = 20;
    const bottomSpawnMargin = 150 + this.height;
    const maxPossibleY = this.game.height - bottomSpawnMargin;
    const minPossibleY = topSpawnMargin;
    this.initialY = randomInt(
      minPossibleY,
      Math.max(minPossibleY + 1, maxPossibleY)
    );
    this.y = this.initialY;
    this.speedX = 2.0 + Math.random() * 1.0 + speedBoost;
    this.angle = Math.random() * Math.PI * 2;
    this.amplitude = 40 + Math.random() * 30; // Random Amplitude
    this.frequency = 0.004 + Math.random() * 0.0025; // Random Frequency

    // --- >>> Calculate Rotation Params Dynamically ONCE <<< ---
    this.rotation = 0;
    this.targetRotation = 0;
    this.lastY = this.y;
    this.targetRotationFromVelocity = 0;
    this.targetRotationFromSine = 0;
    const baseMaxRotationDeg = 8;
    const baseRotationSpeed = 0.08;
    const freqRange = 0.0065 - 0.004;
    const normalizedFreq =
      freqRange <= 0 ? 0.5 : (this.frequency - 0.004) / freqRange;
    const ampRange = 70 - 40;
    const normalizedAmp =
      ampRange <= 0 ? 0.5 : (this.amplitude - 40) / ampRange;
    this.maxRotationDegrees =
      baseMaxRotationDeg + (normalizedFreq + normalizedAmp) * 0.5 * 10;
    this.rotationSpeed =
      baseRotationSpeed + (normalizedFreq + normalizedAmp) * 0.5 * 0.07;
    this.maxRotationDegrees = Math.max(
      5,
      Math.min(25, this.maxRotationDegrees)
    ); // Clamp
    this.rotationSpeed = Math.max(0.05, Math.min(0.25, this.rotationSpeed)); // Clamp
    this.sineInfluenceFactor = 0.6;
    this.velocityInfluenceFactor = 1.0;
    // --- >>> END Dynamic Calculation <<< ---

    // ... (rest of constructor: type, health, score, image loading, animation state) ...
    this.enemyType = "air";
    this.maxHealth = 3;
    this.health = this.maxHealth;
    this.scoreValue = 30;
    this.image = new Image();
    this.image.src = "images/AMENAZA 1.png";
    this.frameX = 0;
    this.frameY = 0;
    this.maxFrame = 0;
    this.fps = 10;
    this.frameTimer = 0;
    this.frameInterval = 1000 / this.fps;
  } // End Constructor

  // Override update to ensure sine calculation uses the correct initialY and applies bounds
  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // Store previous Y position *before* calculating new position
    this.lastY = this.y;

    // --- Horizontal Movement --- (Scaled)
    this.x -= this.speedX * deltaScale;
    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
      return; // Exit early
    }

    // --- Sine Wave Vertical Movement ---
    // Ensure initialY is valid
    if (this.initialY === undefined || isNaN(this.initialY)) {
      this.initialY = this.game.height / 2;
    } // Fallback

    this.angle += this.frequency * deltaScale; // Scale frequency based on time
    this.y = this.initialY + Math.sin(this.angle) * this.amplitude;

    // --- Boundaries ---
    const topBound = 5;
    const bottomBound = this.game.height - this.height - 85; // Keep consistent bounds
    this.y = Math.max(topBound, Math.min(bottomBound, this.y));

    // --- Calculate Rotation Components ---
    // 1. Rotation based on Vertical Velocity
    const verticalVelocity = (this.y - this.lastY) / deltaScale;
    const maxTiltVelocity = 1.5; // Velocity for max tilt
    const clampedVelocityInfluence = Math.max(
      -1,
      Math.min(1, verticalVelocity / maxTiltVelocity)
    );
    // Remember: We flipped the sign before, so keep it flipped if that worked visually
    this.targetRotationFromVelocity =
      -1 *
      ((this.maxRotationDegrees * Math.PI) / 180) *
      clampedVelocityInfluence *
      this.velocityInfluenceFactor;

    // 2. Rotation based on Sine Wave Position
    // Cosine gives us the horizontal position in the cycle:
    // Cos(angle) is 1 at the peak (rightmost turning point of sine y), -1 at the trough (leftmost).
    // We want to tilt DOWN (positive rotation) at the peak (Cos=1)
    // We want to tilt UP (negative rotation) at the trough (Cos=-1)
    // So, target rotation = max_radians * (-cosine(angle)) seems right.
    const maxSineRotationRadians =
      ((this.maxRotationDegrees * Math.PI) / 180) * this.sineInfluenceFactor; // Apply influence factor
    // Flip the cosine sign to get the desired tilt direction
    this.targetRotationFromSine =
      maxSineRotationRadians * -Math.cos(this.angle);

    // 3. Combine Target Rotations (Simple addition for now, can use averaging or weighting)
    this.targetRotation =
      this.targetRotationFromVelocity + this.targetRotationFromSine;

    // 4. Clamp combined rotation to prevent excessive tilting
    const maxTotalRotationRadians = (this.maxRotationDegrees * Math.PI) / 180;
    this.targetRotation = Math.max(
      -maxTotalRotationRadians,
      Math.min(maxTotalRotationRadians, this.targetRotation)
    );

    // 5. Smoothly rotate towards the combined target rotation
    this.rotation = lerp(
      this.rotation,
      this.targetRotation,
      this.rotationSpeed * deltaScale
    );

    // --- Hit Flash Update (From Base Class logic) ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime;
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }

    // --- Animation Update (if maxFrame > 0, currently not used for static) ---
    // this.frameTimer += safeDeltaTime;
    // if (this.frameTimer > this.frameInterval) {
    //     this.frameTimer = 0;
    //     if (this.maxFrame > 0) {
    //          if (this.frameX < this.maxFrame) this.frameX++;
    //          else this.frameX = 0;
    //     }
    // }
  } // End of EnemyPlane update

  // Draw method - Use the one that draws the plane shape and cockpit
  draw(context) {
    if (!context || this.markedForDeletion) return;
    context.save();
    let shouldDraw = true;
    if (this.isHit && Math.random() < 0.5) {
      shouldDraw = false;
    }
    // Apply Rotation centered
    const pivotX = this.x + this.width / 2;
    const pivotY = this.y + this.height / 2;
    context.translate(pivotX, pivotY);
    context.rotate(this.rotation); // Use the lerped rotation
    // Draw Sprite offset from center
    if (shouldDraw && this.image?.complete && this.image.naturalWidth > 0) {
      context.drawImage(
        this.image,
        this.frameX * this.spriteWidth,
        this.frameY * this.spriteHeight,
        this.spriteWidth,
        this.spriteHeight,
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    } else if (shouldDraw) {
      /* Fallback */ context.fillStyle = "purple";
      context.fillRect(
        -this.width / 2,
        -this.height / 2,
        this.width,
        this.height
      );
    }
    context.restore(); // Restore context BEFORE drawing health bar
    // Draw Health Bar
    super.draw(context);
  } // End draw
}
