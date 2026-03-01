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
    // Stagger spawn off-screen to avoid "single-file" enemy columns.
    this.x = this.game.width + randomInt(0, 220);
    this.speedX = 2.0 + Math.random() * 1.0 + speedBoost;
    this.angle = Math.random() * Math.PI * 2;
    this.amplitude = 45 + Math.random() * 28; // Random Amplitude
    // Slower base wave so trajectories are longer and less twitchy.
    this.frequency = 0.0022 + Math.random() * 0.0014;
    const { topBound, bottomBound } = this.getVerticalBounds();
    const maxVerticalSwing = Math.max(14, (bottomBound - topBound) * 0.5 - 4);
    this.primaryAmplitude = Math.min(
      this.amplitude,
      maxVerticalSwing * (0.62 + Math.random() * 0.2)
    );
    const tentativeSecondaryAmplitude =
      this.primaryAmplitude * (0.12 + Math.random() * 0.1);
    this.secondaryAmplitude = Math.min(
      tentativeSecondaryAmplitude,
      Math.max(0, maxVerticalSwing - this.primaryAmplitude)
    );
    this.totalAmplitude = this.primaryAmplitude + this.secondaryAmplitude;
    this.amplitude = this.primaryAmplitude;
    this.secondaryAngle = Math.random() * Math.PI * 2;
    this.secondaryFrequency = this.frequency * (0.55 + Math.random() * 0.35);

    const minInitialY = topBound + this.totalAmplitude;
    const maxInitialY = bottomBound - this.totalAmplitude;
    this.initialY =
      maxInitialY <= minInitialY
        ? (topBound + bottomBound) / 2
        : randomInt(Math.floor(minInitialY), Math.ceil(maxInitialY));
    this.targetInitialY = this.initialY;
    this.y = this.calculateWaveY();

    // Add subtle variation so planes do not move at perfectly fixed pace/center line.
    this.speedOscillationPhase = Math.random() * Math.PI * 2;
    this.speedOscillationFrequency = 0.0018 + Math.random() * 0.0016;
    this.speedOscillationAmplitude = 0.08 + Math.random() * 0.1;
    this.verticalDriftInterval = 3600 + Math.random() * 3400;
    // Fully random initial phase to avoid synchronized direction changes.
    this.verticalDriftTimer = Math.random() * this.verticalDriftInterval;
    this.verticalDriftLerpRate = 0.008 + Math.random() * 0.007;
    this.playerBiasChance = 0.65;
    this.playerBiasWeight = 0.42;
    this.minDriftStep = 40 + Math.random() * 35;
    this.maxDriftStep = this.minDriftStep + 40 + Math.random() * 35;
    this.driftDirection = Math.random() < 0.5 ? -1 : 1;
    this.directionFlipChance = 0.28;
    this.directionPersistence = 1 - this.directionFlipChance;

    // --- >>> Calculate Rotation Params Dynamically ONCE <<< ---
    this.rotation = 0;
    this.targetRotation = 0;
    this.lastY = this.y;
    this.targetRotationFromVelocity = 0;
    this.targetRotationFromSine = 0;

    const baseMaxRotationDeg = 10;
    const freqRange = 0.0065 - 0.004;
    const normalizedFreq =
      freqRange <= 0 ? 0.5 : (this.frequency - 0.004) / freqRange;
    const ampRange = maxVerticalSwing - 40;
    const normalizedAmp =
      ampRange <= 0 ? 0.5 : (this.totalAmplitude - 40) / ampRange;
    this.maxRotationDegrees =
      baseMaxRotationDeg + normalizedFreq * 6 + normalizedAmp * 4;
    this.maxRotationDegrees = Math.max(
      9,
      Math.min(22, this.maxRotationDegrees)
    ); // Clamp
    this.rotationResponsiveness = 0.18 + normalizedFreq * 0.18;
    this.rotationVelocityForMaxTilt = 2.1 + normalizedFreq * 0.9;
    this.rotationLevelingFactor = 0.08 + normalizedAmp * 0.07;
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

  getVerticalBounds() {
    const topBound = 5;
    const bottomBound = this.game.height - this.height - 85;
    return { topBound, bottomBound: Math.max(topBound + 1, bottomBound) };
  }

  randomRange(min, max) {
    return min + Math.random() * (max - min);
  }

  getInitialYRange() {
    const { topBound, bottomBound } = this.getVerticalBounds();
    const waveSpan = Math.max(8, this.totalAmplitude + 2);
    const minY = topBound + waveSpan;
    const maxY = bottomBound - waveSpan;
    if (maxY <= minY) {
      const center = (topBound + bottomBound) / 2;
      return { minY: center, maxY: center };
    }
    return { minY, maxY };
  }

  calculateWaveY() {
    return (
      this.initialY +
      Math.sin(this.angle) * this.primaryAmplitude +
      Math.sin(this.secondaryAngle) * this.secondaryAmplitude
    );
  }

  chooseNextDriftTarget() {
    const { minY, maxY } = this.getInitialYRange();
    const edgePadding = 18;
    if (this.initialY <= minY + edgePadding) {
      this.driftDirection = 1;
    } else if (this.initialY >= maxY - edgePadding) {
      this.driftDirection = -1;
    } else if (Math.random() > this.directionPersistence) {
      this.driftDirection *= -1;
    }

    const driftDistance = this.randomRange(this.minDriftStep, this.maxDriftStep);
    let targetY = this.initialY + this.driftDirection * driftDistance;

    const player = this.game?.player;
    if (
      player &&
      !player.markedForDeletion &&
      Math.random() < this.playerBiasChance
    ) {
      const playerCenterY = player.y + player.height / 2;
      const clampedPlayerY = Math.max(minY, Math.min(maxY, playerCenterY));
      targetY = lerp(targetY, clampedPlayerY, this.playerBiasWeight);
    }

    this.targetInitialY = Math.max(minY, Math.min(maxY, targetY));
  }

  // Override update to ensure sine calculation uses the correct initialY and applies bounds
  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // Store previous Y position *before* calculating new position
    this.lastY = this.y;

    // --- Horizontal Movement --- (Scaled)
    this.speedOscillationPhase += this.speedOscillationFrequency * safeDeltaTime;
    const speedMultiplier =
      1 + Math.sin(this.speedOscillationPhase) * this.speedOscillationAmplitude;
    this.x -= this.speedX * Math.max(0.65, speedMultiplier) * deltaScale;
    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
      return; // Exit early
    }

    // --- Sine Wave Vertical Movement ---
    // Ensure initialY is valid
    if (this.initialY === undefined || isNaN(this.initialY)) {
      const { minY, maxY } = this.getInitialYRange();
      this.initialY = (minY + maxY) / 2;
      this.targetInitialY = this.initialY;
    } // Fallback

    this.verticalDriftTimer -= safeDeltaTime;
    if (this.verticalDriftTimer <= 0) {
      this.chooseNextDriftTarget();
      const driftJitter = this.verticalDriftInterval * 0.6;
      this.verticalDriftTimer =
        this.verticalDriftInterval + this.randomRange(-driftJitter, driftJitter);
      if (this.verticalDriftTimer < 900) this.verticalDriftTimer = 900;
    }
    this.initialY = lerp(
      this.initialY,
      this.targetInitialY,
      this.verticalDriftLerpRate * deltaScale
    );

    this.angle += this.frequency * deltaScale; // Scale frequency based on time
    this.secondaryAngle += this.secondaryFrequency * deltaScale;
    this.y = this.calculateWaveY();

    // --- Boundaries ---
    const { topBound, bottomBound } = this.getVerticalBounds();
    this.y = Math.max(topBound, Math.min(bottomBound, this.y));

    // --- Calculate Rotation Components ---
    // 1. Rotation based on actual Vertical Velocity
    const verticalVelocity = (this.y - this.lastY) / Math.max(0.001, deltaScale);
    const normalizedVelocity = Math.max(
      -1,
      Math.min(1, verticalVelocity / this.rotationVelocityForMaxTilt)
    );
    const velocityDeadZone = 0.03;
    const velocityForTilt =
      Math.abs(normalizedVelocity) < velocityDeadZone ? 0 : normalizedVelocity;
    const maxRotationRadians = (this.maxRotationDegrees * Math.PI) / 180;
    this.targetRotationFromVelocity =
      -velocityForTilt * maxRotationRadians;

    // 2. Small leveling assist so planes settle naturally between maneuvers.
    const verticalError = this.targetInitialY - this.y;
    const normalizationDenominator = Math.max(25, this.totalAmplitude * 2);
    const levelingInfluence = Math.max(
      -1,
      Math.min(1, verticalError / normalizationDenominator)
    );
    this.targetRotationFromSine =
      -levelingInfluence * this.rotationLevelingFactor;

    // 3. Combine target rotations.
    this.targetRotation =
      this.targetRotationFromVelocity + this.targetRotationFromSine;

    // 4. Clamp combined rotation to prevent excessive tilting.
    const maxTotalRotationRadians = maxRotationRadians;
    this.targetRotation = Math.max(
      -maxTotalRotationRadians,
      Math.min(maxTotalRotationRadians, this.targetRotation)
    );

    // 5. Smoothly rotate towards the combined target rotation.
    const rotationLerpAmount =
      1 - Math.exp(-this.rotationResponsiveness * deltaScale);
    this.rotation = lerp(
      this.rotation,
      this.targetRotation,
      rotationLerpAmount
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
