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
    this.game = null; // <<< IMPORTANT: This MUST be set by the Game instance after creation
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.baseGameSpeed = 0.5; // Used for star drift?

    // --- Color Definitions ---
    this.dayColors = {
      sky: "#87CEEB",
      sea: "#1E90FF",
      sun: "#FFFF00",
      waveColor: "#FFFFFF",
      starAlphaMultiplier: 0.0,
    };
    this.afternoonColors = {
      sky: "#FFB347",
      sea: "#4682B4",
      sun: "#FFA500",
      waveColor: "#DDDDDD",
      starAlphaMultiplier: 0.0,
    };
    this.nightColors = {
      sky: "#0B0B22",
      sea: "#000044",
      moon: "#FFFFE0",
      waveColor: "#AAAAAA",
      starAlphaMultiplier: 1.0,
    }; // Stars fully visible at night

    // --- Current State Variables ---
    this.currentSkyColor = this.dayColors.sky;
    this.currentSeaColor = this.dayColors.sea;
    this.currentSunColor = this.dayColors.sun;
    this.currentMoonColor = this.nightColors.moon;
    this.currentWaveColor = this.dayColors.waveColor;
    this.currentStarAlphaMultiplier = this.dayColors.starAlphaMultiplier; // For fading stars in/out

    this.showSun = true;
    this.showMoon = false;
    this.sunY = this.gameHeight * 0.15; // Initial Y position
    this.moonY = this.gameHeight * 0.15; // Initial Y position

    this.stars = [];
    this.createStars(150); // Create stars

    // --- Transition Timing ---
    this.AFTERNOON_START_SCORE = 3000; // Example threshold
    this.NIGHT_START_SCORE = 7000; // Example threshold
    this.CYCLE_DURATION = 5000; // Time (in score points) for transition between phases

    // console.log("Canvas Background Manager Initialized.");
  }

  // --- Needs reference to the Game instance ---
  setGame(gameInstance) {
    this.game = gameInstance;
    if (!this.game) {
      console.error("Background: Game instance not set correctly!");
    }
    if (this.game && this.game.seaLevelY === undefined) {
      console.error(
        "Background: Game instance is missing 'seaLevelY' property!"
      );
      // Set a default fallback if needed, though game.js should define it
      this.game.seaLevelY = this.gameHeight * 0.5;
    }
  }

  createStars(count) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.gameWidth,
        // Spawn stars only above the *initial* guess of sea level
        // (will be clipped later if sea level changes drastically)
        y: Math.random() * (this.gameHeight * 0.6), // Spawn higher up initially
        radius: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.5 + 0.3, // Base flicker opacity
        driftSpeed: Math.random() * 0.1 + 0.02,
      });
    }
    // console.log(`Created ${this.stars.length} stars.`);
  }

  update(deltaTime, score = 0) {
    // Ensure game reference is set
    if (!this.game || this.game.seaLevelY === undefined) {
      // console.warn("Background.update skipped: Game reference or seaLevelY missing.");
      return;
    }

    // --- Calculate Transition Progress ---
    let skyC1,
      skyC2,
      seaC1,
      seaC2,
      sunC1,
      sunC2,
      waveC1,
      waveC2,
      starA1,
      starA2;
    let transitionAmount = 0;
    this.showSun = false;
    this.showMoon = false;

    // Determine phase and set start/end colors/alphas
    if (score < this.AFTERNOON_START_SCORE) {
      // --- Day ---
      const phaseProgress =
        this.AFTERNOON_START_SCORE <= 0
          ? 1
          : score / this.AFTERNOON_START_SCORE;
      skyC1 = skyC2 = this.dayColors.sky;
      seaC1 = seaC2 = this.dayColors.sea;
      sunC1 = sunC2 = this.dayColors.sun;
      waveC1 = waveC2 = this.dayColors.waveColor;
      starA1 = starA2 = this.dayColors.starAlphaMultiplier;
      this.showSun = true;
      this.sunY = lerp(
        this.gameHeight * 0.15,
        this.gameHeight * 0.5,
        phaseProgress
      ); // Sun moves down
      transitionAmount = 0; // Not transitioning between phases
    } else if (score < this.AFTERNOON_START_SCORE + this.CYCLE_DURATION) {
      // --- Day -> Afternoon ---
      transitionAmount =
        (score - this.AFTERNOON_START_SCORE) / this.CYCLE_DURATION;
      skyC1 = this.dayColors.sky;
      skyC2 = this.afternoonColors.sky;
      seaC1 = this.dayColors.sea;
      seaC2 = this.afternoonColors.sea;
      sunC1 = this.dayColors.sun;
      sunC2 = this.afternoonColors.sun;
      waveC1 = this.dayColors.waveColor;
      waveC2 = this.afternoonColors.waveColor;
      starA1 = this.dayColors.starAlphaMultiplier;
      starA2 = this.afternoonColors.starAlphaMultiplier;
      this.showSun = true;
      this.sunY = lerp(
        this.gameHeight * 0.5,
        this.gameHeight + 50,
        transitionAmount
      ); // Sun sets below horizon
    } else if (score < this.NIGHT_START_SCORE) {
      // --- Afternoon ---
      skyC1 = skyC2 = this.afternoonColors.sky;
      seaC1 = seaC2 = this.afternoonColors.sea;
      sunC1 = sunC2 = this.afternoonColors.sun; // Sun color stays, even if not shown
      waveC1 = waveC2 = this.afternoonColors.waveColor;
      starA1 = starA2 = this.afternoonColors.starAlphaMultiplier;
      this.showSun = false; // Sun has set
      transitionAmount = 0; // Not transitioning between phases
    } else if (score < this.NIGHT_START_SCORE + this.CYCLE_DURATION) {
      // --- Afternoon -> Night ---
      transitionAmount = (score - this.NIGHT_START_SCORE) / this.CYCLE_DURATION;
      skyC1 = this.afternoonColors.sky;
      skyC2 = this.nightColors.sky;
      seaC1 = this.afternoonColors.sea;
      seaC2 = this.nightColors.sea;
      sunC1 = sunC2 = this.afternoonColors.sun; // Sun color irrelevant
      waveC1 = this.afternoonColors.waveColor;
      waveC2 = this.nightColors.waveColor;
      starA1 = this.afternoonColors.starAlphaMultiplier;
      starA2 = this.nightColors.starAlphaMultiplier;
      this.showMoon = true;
      // Moon rises from below horizon up to its peak position
      this.moonY = lerp(
        this.gameHeight + 30,
        this.gameHeight * 0.15,
        transitionAmount
      );
    } else {
      // --- Night ---
      skyC1 = skyC2 = this.nightColors.sky;
      seaC1 = seaC2 = this.nightColors.sea;
      sunC1 = sunC2 = this.afternoonColors.sun; // Sun color irrelevant
      waveC1 = waveC2 = this.nightColors.waveColor;
      starA1 = starA2 = this.nightColors.starAlphaMultiplier;
      this.showMoon = true;
      this.moonY = this.gameHeight * 0.15; // Moon stays high
      transitionAmount = 1; // Fully transitioned to night state
    }

    // Calculate Interpolated Values
    try {
      this.currentSkyColor = lerpColor(skyC1, skyC2, transitionAmount);
      this.currentSeaColor = lerpColor(seaC1, seaC2, transitionAmount);
      this.currentWaveColor = lerpColor(waveC1, waveC2, transitionAmount);
      this.currentStarAlphaMultiplier = lerp(starA1, starA2, transitionAmount);
      if (this.showSun) {
        this.currentSunColor = lerpColor(sunC1, sunC2, transitionAmount);
      }
      this.currentMoonColor = this.nightColors.moon; // Moon color doesn't change
    } catch (e) {
      console.error("Error during color lerping:", e);
      // Assign default values on error to prevent crashes
      this.currentSkyColor = this.dayColors.sky;
      this.currentSeaColor = this.dayColors.sea;
      this.currentWaveColor = this.dayColors.waveColor;
      this.currentStarAlphaMultiplier = 0;
      this.currentSunColor = this.dayColors.sun;
      this.currentMoonColor = this.nightColors.moon;
    }

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
    // Ensure game reference and context are valid
    if (!this.game || !context) {
      // console.error("Background.draw skipped: Game reference or context missing.");
      return;
    }
    // Ensure seaLevelY is valid
    const seaLevel = this.game.seaLevelY;
    if (typeof seaLevel !== "number" || isNaN(seaLevel)) {
      console.error(`Background.draw skipped: Invalid seaLevelY: ${seaLevel}`);
      return; // Don't draw if sea level isn't set right
    }

    try {
      // --- 1. Draw Sky Background ---
      context.fillStyle = this.currentSkyColor;
      context.fillRect(0, 0, this.gameWidth, this.gameHeight);

      // --- 2. Draw Stars (If applicable) ---
      if (this.currentStarAlphaMultiplier > 0.01) {
        // Only draw if stars are somewhat visible
        context.save();
        // Use the main multiplier AND the individual star opacity
        context.globalAlpha = this.currentStarAlphaMultiplier;
        this.stars.forEach((star) => {
          // Only draw stars *above* the current sea level
          if (star.y < seaLevel) {
            // Combine global alpha with star's twinkle opacity
            const finalAlpha = context.globalAlpha * star.opacity;
            context.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
            context.beginPath();
            context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            context.fill();
          }
        });
        context.restore(); // Restore globalAlpha
      }

      // --- 3. Draw Sun or Moon ---
      // Ensure sun/moon are drawn only above the sea
      const sunMoonRadius = this.showSun ? 40 : 30; // Sun is bigger
      const sunMoonVisibleY = this.showSun ? this.sunY : this.moonY;
      // Calculate effective Y, ensuring it's above seaLevel
      const effectiveDrawY = Math.min(
        sunMoonVisibleY,
        seaLevel - sunMoonRadius - 10
      );

      if (this.showMoon && effectiveDrawY > 0) {
        // Only draw if above top edge
        context.fillStyle = this.currentMoonColor;
        context.beginPath();
        context.arc(
          this.gameWidth * 0.75,
          effectiveDrawY,
          sunMoonRadius,
          0,
          Math.PI * 2
        );
        context.fill();
      } else if (this.showSun && effectiveDrawY > 0) {
        // Only draw if above top edge
        context.fillStyle = this.currentSunColor;
        context.beginPath();
        context.arc(
          this.gameWidth * 0.25,
          effectiveDrawY,
          sunMoonRadius,
          0,
          Math.PI * 2
        );
        context.fill();
      }

      // --- 4. Draw the Sea Rectangle ---
      context.fillStyle = this.currentSeaColor;
      // Ensure height calculation is non-negative
      const seaDrawHeight = Math.max(0, this.gameHeight - seaLevel);
      context.fillRect(0, seaLevel, this.gameWidth, seaDrawHeight);

      // --- 5. Draw the Dashed Sea Line / Wave effect ---
      const lineY = seaLevel + 2; // Slightly below the fill edge
      context.strokeStyle = this.currentWaveColor; // Use transitioned wave color
      context.lineWidth = 2;
      context.setLineDash([10, 10]); // Dashes
      context.beginPath();
      context.moveTo(0, lineY);
      context.lineTo(this.gameWidth, lineY);
      context.stroke();
      context.setLineDash([]); // Reset line dash
    } catch (e) {
      console.error("Error during Background.draw:", e);
    }
  } // End draw()
} // End Background class
