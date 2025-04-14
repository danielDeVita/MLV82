// js/background.js
// NOTE: This version ONLY handles drawing the sky color, sun, moon, and stars onto the CANVAS.
// Scrolling layers are handled by CSS.

import { randomInt, lerp, lerpColor } from "./utils.js";

// function lerp(start, end, amount) {
//   amount = Math.max(0, Math.min(1, amount));
//   return start + (end - start) * amount;
// }
// function lerpColor(hexColor1, hexColor2, amount) {
//   try {
//     if (
//       !/^#[0-9A-F]{6}$/i.test(hexColor1) ||
//       !/^#[0-9A-F]{6}$/i.test(hexColor2)
//     ) {
//       throw new Error(`Invalid hex: ${hexColor1}, ${hexColor2}`);
//     }
//     const r1 = parseInt(hexColor1.slice(1, 3), 16),
//       g1 = parseInt(hexColor1.slice(3, 5), 16),
//       b1 = parseInt(hexColor1.slice(5, 7), 16);
//     const r2 = parseInt(hexColor2.slice(1, 3), 16),
//       g2 = parseInt(hexColor2.slice(3, 5), 16),
//       b2 = parseInt(hexColor2.slice(5, 7), 16);
//     if (isNaN(r1 + g1 + b1 + r2 + g2 + b2)) {
//       throw new Error("NaN parsing hex");
//     }
//     const r = Math.round(lerp(r1, r2, amount)),
//       g = Math.round(lerp(g1, g2, amount)),
//       b = Math.round(lerp(b1, b2, amount));
//     const toHex = (c) => c.toString(16).padStart(2, "0");
//     return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
//   } catch (e) {
//     console.error("Error lerpColor:", e);
//     return hexColor1;
//   }
// }

// ======================================================
// Represents a SINGLE background layer object (CSS Controlled Version)
// NOTE: This class is now only used internally by the Background class below
//       if we needed JS control over layer properties like opacity later.
//       For the pure CSS layer approach, this class definition itself isn't
//       strictly necessary anymore, but keeping it doesn't hurt.
// ======================================================
class BackgroundLayer {
  constructor(imageSrc, speedModifier, gameWidth, gameHeight, yOffset = 0) {
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.speedModifier = speedModifier; // Used by CSS animation duration, not directly here
    this.image = new Image(); // Still useful to check if image exists for fallback logic
    if (imageSrc && typeof imageSrc === "string") {
      this.image.src = imageSrc;
    } else {
      this.image.src = "";
    }
    this.width = gameWidth;
    this.height = gameHeight; // Store dimensions
    this.x = 0;
    this.y = yOffset;
    this.x2 = this.width; // Initial positions
    this.opacity = 1.0; // Can be controlled later if needed
  }

  // --- UPDATE METHOD IS NOT USED for CSS layers ---
  // The CSS animation handles the scrolling based on duration set in style.css
  // We keep the method signature for potential future use or consistency.
  update(baseGameSpeed, deltaTime) {
    // No JavaScript position update needed for CSS parallax layers
  }

  // --- DRAW METHOD IS NOT USED for CSS layers ---
  // The browser draws the CSS background images automatically.
  // We keep the method signature for potential future use or consistency.
  draw(context, opacity = 1.0, tintColor = null) {
    // No JavaScript canvas drawing needed for CSS parallax layers
  }
} // End of BackgroundLayer class

export class Background {
  constructor(gameWidth, gameHeight) {
    this.game = null; // Will be set via setGame()
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.baseGameSpeed = 0.5; // Affects star drift

    // --- Color & State Definitions ---
    // Define the properties for each time of day
    this.dayState = {
      sky: "#87CEEB",
      sea: "#1E90FF",
      sunMoon: "#FFFF00",
      wave: "#FFFFFF",
      starAlpha: 0.0,
      isSun: true,
    };
    this.afternoonState = {
      sky: "#FFB347",
      sea: "#4682B4",
      sunMoon: "#FFA500",
      wave: "#DDDDDD",
      starAlpha: 0.0,
      isSun: true,
    };
    this.nightState = {
      sky: "#0B0B22",
      sea: "#000044",
      sunMoon: "#FFFFE0",
      wave: "#AAAAAA",
      starAlpha: 1.0,
      isSun: false,
    }; // isSun is false for moon

    // Current visual properties, updated via lerping
    this.currentSkyColor = this.dayState.sky;
    this.currentSeaColor = this.dayState.sea;
    this.currentSunMoonColor = this.dayState.sunMoon;
    this.currentWaveColor = this.dayState.wave;
    this.currentStarAlphaMultiplier = this.dayState.starAlpha;

    // Sun/Moon position control
    this.sunMoonY = this.gameHeight * 0.15; // Initial Y for sun
    this.displaySunMoon = true; // Whether to draw the current celestial body

    // Stars
    this.stars = [];
    this.createStars(150);

    // Transition Score Thresholds (initialized, but set properly in update)
    this.dayToAfternoonStartScore = 1000;
    this.dayToAfternoonEndScore = 4500;
    this.afternoonToNightStartScore = 5200;
    this.afternoonToNightEndScore = 13500;

    console.log("Background Initialized (Canvas Draw Version)");
  }

  // Link to the main game instance to access score and thresholds
  setGame(gameInstance) {
    this.game = gameInstance;
    if (!this.game) {
      console.error("Background: Game instance failed to set!");
      return;
    }
    // Define transition points relative to boss score thresholds from game instance
    // Add some padding so transitions don't start/end exactly when bosses spawn
    const PADDING_START = 200; // Start transition this many points after boss threshold
    const PADDING_END = 500; // End transition this many points before next boss threshold

    this.dayToAfternoonStartScore =
      this.game.BOSS1_SCORE_THRESHOLD + PADDING_START;
    this.dayToAfternoonEndScore = this.game.BOSS2_SCORE_THRESHOLD - PADDING_END;
    this.afternoonToNightStartScore =
      this.game.BOSS2_SCORE_THRESHOLD + PADDING_START;
    this.afternoonToNightEndScore =
      this.game.BOSS3_SCORE_THRESHOLD - PADDING_END;

    console.log(
      `Background Transitions Set: Day->Aft (${this.dayToAfternoonStartScore}-${this.dayToAfternoonEndScore}), Aft->Night (${this.afternoonToNightStartScore}-${this.afternoonToNightEndScore})`
    );

    // Basic validation
    if (
      this.dayToAfternoonEndScore <= this.dayToAfternoonStartScore ||
      this.afternoonToNightEndScore <= this.afternoonToNightStartScore
    ) {
      console.warn(
        "Background transition score thresholds seem overlapping or invalid based on Boss scores!"
      );
    }
    if (this.game.seaLevelY === undefined) {
      console.error(
        "Background: Game instance is missing 'seaLevelY' property!"
      );
      this.game.seaLevelY = this.gameHeight * 0.6; // Set a fallback if needed
    }
  }

  createStars(count) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.gameWidth,
        y: Math.random() * this.gameHeight, // Allow spawning anywhere initially, will clip drawing
        radius: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.5 + 0.3,
        driftSpeed: Math.random() * 0.05 + 0.01, // Slower drift
      });
    }
  }

  update(deltaTime, score = 0) {
    if (!this.game) return; // Don't update if game reference isn't set

    // --- Determine Current Phase and Transition ---
    let startState, endState;
    let transitionAmount = 0;

    // Define target Y positions for Sun/Moon
    const sunHighY = this.gameHeight * 0.15;
    const sunLowY = this.gameHeight * 0.55; // Lower position before setting
    const belowHorizonY = this.gameHeight + 60; // Off-screen bottom
    const moonHighY = this.gameHeight * 0.15;
    const moonLowY = this.gameHeight * 0.6; // Lower position when rising

    let targetSunMoonY = belowHorizonY; // Default to off-screen
    this.displaySunMoon = true;

    if (score < this.dayToAfternoonStartScore) {
      // --- Phase: Day ---
      startState = this.dayState;
      endState = this.dayState;
      transitionAmount = 0;
      // Sun moves from high towards low during the day phase
      targetSunMoonY = lerp(
        sunHighY,
        sunLowY,
        score / this.dayToAfternoonStartScore
      );
      this.displaySunMoon = startState.isSun;
    } else if (score < this.dayToAfternoonEndScore) {
      // --- Transition: Day -> Afternoon ---
      startState = this.dayState;
      endState = this.afternoonState;
      // Calculate progress within this specific transition range
      const duration =
        this.dayToAfternoonEndScore - this.dayToAfternoonStartScore;
      transitionAmount =
        duration <= 0 ? 1 : (score - this.dayToAfternoonStartScore) / duration;
      // Sun moves from low to below horizon (setting)
      targetSunMoonY = lerp(sunLowY, belowHorizonY, transitionAmount);
      this.displaySunMoon = startState.isSun; // Still the sun during this transition
    } else if (score < this.afternoonToNightStartScore) {
      // --- Phase: Afternoon ---
      startState = this.afternoonState;
      endState = this.afternoonState;
      transitionAmount = 0;
      targetSunMoonY = belowHorizonY; // Sun has set
      this.displaySunMoon = false; // Neither sun nor moon fully visible
    } else if (score < this.afternoonToNightEndScore) {
      // --- Transition: Afternoon -> Night ---
      startState = this.afternoonState;
      endState = this.nightState;
      // Calculate progress within this specific transition range
      const duration =
        this.afternoonToNightEndScore - this.afternoonToNightStartScore;
      transitionAmount =
        duration <= 0
          ? 1
          : (score - this.afternoonToNightStartScore) / duration;
      // Moon rises from below horizon towards high position
      targetSunMoonY = lerp(belowHorizonY, moonHighY, transitionAmount);
      // Decide when to show the moon based on transition progress (e.g., halfway)
      this.displaySunMoon = transitionAmount > 0.1 && !endState.isSun; // Show moon once it starts rising
    } else {
      // --- Phase: Night ---
      startState = this.nightState;
      endState = this.nightState;
      transitionAmount = 0;
      targetSunMoonY = moonHighY; // Moon stays high
      this.displaySunMoon = !startState.isSun; // It's the moon
    }

    // Clamp transition amount just in case
    transitionAmount = Math.max(0, Math.min(1, transitionAmount));

    // --- Calculate Interpolated Visual Properties ---
    this.currentSkyColor = lerpColor(
      startState.sky,
      endState.sky,
      transitionAmount
    );
    this.currentSeaColor = lerpColor(
      startState.sea,
      endState.sea,
      transitionAmount
    );
    this.currentWaveColor = lerpColor(
      startState.wave,
      endState.wave,
      transitionAmount
    );
    this.currentStarAlphaMultiplier = lerp(
      startState.starAlpha,
      endState.starAlpha,
      transitionAmount
    );
    // Determine which celestial body color to use
    this.currentSunMoonColor = startState.isSun
      ? lerpColor(startState.sunMoon, endState.sunMoon, transitionAmount)
      : endState.sunMoon;
    // Smoothly update the Y position
    this.sunMoonY = lerp(this.sunMoonY, targetSunMoonY, 0.05); // Smooth interpolation towards target Y

    // --- Update Stars ---
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;
    if (this.currentStarAlphaMultiplier > 0) {
      this.stars.forEach((star) => {
        star.x -= star.driftSpeed * deltaScale; // Horizontal drift
        if (star.x < -star.radius) {
          star.x = this.gameWidth + star.radius;
        }
        if (Math.random() < 0.05) {
          star.opacity = Math.random() * 0.5 + 0.3;
        } // Twinkle
      });
    }
  }

  draw(context) {
    if (!this.game || !context) return;
    const seaLevel = this.game.seaLevelY;
    if (typeof seaLevel !== "number" || isNaN(seaLevel)) return;

    try {
      // 1. Draw Sky Background
      context.fillStyle = this.currentSkyColor;
      context.fillRect(0, 0, this.gameWidth, this.gameHeight);

      // 2. Draw Stars
      if (this.currentStarAlphaMultiplier > 0.01) {
        context.save();
        context.globalAlpha = this.currentStarAlphaMultiplier; // Apply overall fade alpha
        this.stars.forEach((star) => {
          if (star.y < seaLevel) {
            // Only draw above sea level
            const finalAlpha = context.globalAlpha * star.opacity; // Combine fade and twinkle
            context.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
            context.beginPath();
            context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            context.fill();
          }
        });
        context.restore();
      }

      // 3. Draw Sun or Moon
      if (this.displaySunMoon) {
        const sunMoonRadius =
          this.currentSunMoonColor === this.nightState.sunMoon ? 30 : 40; // Moon is smaller
        const sunMoonX =
          this.currentSunMoonColor === this.nightState.sunMoon
            ? this.gameWidth * 0.75
            : this.gameWidth * 0.25; // Moon on right, sun on left
        // Ensure it's drawn above the sea visually
        const effectiveDrawY = Math.min(
          this.sunMoonY,
          seaLevel - sunMoonRadius - 10
        );

        if (effectiveDrawY > -sunMoonRadius) {
          // Only draw if at least partially visible on top edge
          context.fillStyle = this.currentSunMoonColor;
          context.beginPath();
          context.arc(sunMoonX, effectiveDrawY, sunMoonRadius, 0, Math.PI * 2);
          context.fill();
        }
      }

      // 4. Draw the Sea Rectangle
      context.fillStyle = this.currentSeaColor;
      const seaDrawHeight = Math.max(0, this.gameHeight - seaLevel);
      context.fillRect(0, seaLevel, this.gameWidth, seaDrawHeight);

      // 5. Draw the Dashed Sea Line
      const lineY = seaLevel + 2;
      context.strokeStyle = this.currentWaveColor;
      context.lineWidth = 2;
      context.setLineDash([10, 10]);
      context.beginPath();
      context.moveTo(0, lineY);
      context.lineTo(this.gameWidth, lineY);
      context.stroke();
      context.setLineDash([]);
    } catch (e) {
      console.error("Error during Background.draw:", e);
    }
  } // End draw()
} // End Background class
