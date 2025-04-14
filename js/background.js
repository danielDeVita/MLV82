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
    this.game = null;
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;

    // --- Color & State Definitions (Adjusted) ---
    this.dayState = {
      sky: "#87CEEB",
      sea: "#1E90FF",
      sunMoon: "#FEFFBF",
      wave: "#FFFFFF",
      starAlpha: 0.0,
      isSun: true,
    }; // Slightly pale yellow sun
    this.sunsetState = {
      sky: "#E17000",
      sea: "#336699",
      sunMoon: "#FF8C00",
      wave: "#CCCCCC",
      starAlpha: 0.0,
      isSun: true,
    }; // Deeper orange sunset sky, darker orange sun
    this.duskState = {
      sky: "#483D8B",
      sea: "#191970",
      sunMoon: "#FFFFE0",
      wave: "#BBBBBB",
      starAlpha: 0.5,
      isSun: false,
    }; // Dark slate blue sky, start showing moon/stars
    this.nightState = {
      sky: "#0B0B22",
      sea: "#000044",
      sunMoon: "#FFFFE0",
      wave: "#AAAAAA",
      starAlpha: 1.0,
      isSun: false,
    }; // Full night

    // Current visual properties
    this.currentSkyColor = this.dayState.sky;
    this.currentSeaColor = this.dayState.sea;
    this.currentSunMoonColor = this.dayState.sunMoon;
    this.currentWaveColor = this.dayState.wave;
    this.currentStarAlphaMultiplier = this.dayState.starAlpha;

    // Sun/Moon position control
    this.sunMoonY = this.gameHeight * 0.15; // Start high
    this.displaySunMoon = true;

    this.stars = [];
    this.createStars(150);

    // Transition Score Thresholds (PLACEHOLDERS - set in setGame)
    this.phase1EndScore = 800; // End of pure Day (around Boss 1)
    this.phase2EndScore = 4800; // End of Sunset (around Boss 2)
    this.phase3EndScore = 13500; // End of Dusk (around Boss 3)

    console.log("Background Initialized (Canvas Draw Version)");
  }

  setGame(gameInstance) {
    this.game = gameInstance;
    if (!this.game) {
      console.error("Background: Game instance failed to set!");
      return;
    }

    // --- Define phase end points relative to boss thresholds ---
    // Add less padding maybe, to ensure states are reached closer to bosses
    const PADDING_BEFORE_BOSS = 100; // Start changing slightly before boss
    const PADDING_AFTER_BOSS = 300; // Finish change a bit after boss
    const TRANSITION_DURATION_DEFAULT = 3000; // How many score points a transition takes

    this.phase1EndScore = this.game.BOSS1_SCORE_THRESHOLD - PADDING_BEFORE_BOSS; // End Day just before B1
    // End Sunset just before B2
    this.phase2EndScore = this.game.BOSS2_SCORE_THRESHOLD - PADDING_BEFORE_BOSS;
    // End Dusk just before B3 (Full night arrives for B3)
    this.phase3EndScore = this.game.BOSS3_SCORE_THRESHOLD - PADDING_BEFORE_BOSS;

    // --- Define transition start/end based on phases ---
    // Transition 1: Day -> Sunset
    this.t1_start = this.phase1EndScore;
    this.t1_end = Math.min(
      this.phase2EndScore,
      this.t1_start + TRANSITION_DURATION_DEFAULT
    ); // Ensure transition ends before next phase starts solidly

    // Transition 2: Sunset -> Dusk (Start showing moon/stars)
    this.t2_start = this.phase2EndScore;
    this.t2_end = Math.min(
      this.phase3EndScore,
      this.t2_start + TRANSITION_DURATION_DEFAULT
    );

    // Transition 3: Dusk -> Night (Full night)
    this.t3_start = this.phase3EndScore;
    // Make the final transition to full night quicker?
    this.t3_end = this.t3_start + TRANSITION_DURATION_DEFAULT * 0.5;

    console.log(
      `Background Phases Set: DayEnd ${this.phase1EndScore}, SunsetEnd ${this.phase2EndScore}, DuskEnd ${this.phase3EndScore}`
    );
    console.log(
      `Background Transitions: T1(${this.t1_start}-${this.t1_end}), T2(${this.t2_start}-${this.t2_end}), T3(${this.t3_start}-${this.t3_end})`
    );

    if (this.game.seaLevelY === undefined) {
      console.error("Background: Game instance missing 'seaLevelY' property!");
      this.game.seaLevelY = this.gameHeight * 0.6; // Fallback
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
    if (!this.game) return;

    // --- Define Target States & Amount for Lerping ---
    let startState, endState;
    let transitionAmount = 0;

    // Define key Y positions for celestial bodies
    const highY = this.gameHeight * 0.15; // Highest point
    const midY = this.gameHeight * 0.4; // Mid-sky
    const lowY = this.game.seaLevelY - 40; // Just above the horizon (seaLevelY is defined in game.js)
    const belowHorizonY = this.game.seaLevelY + 60; // Off-screen below horizon

    let targetSunMoonY = belowHorizonY; // Default to off-screen
    this.displaySunMoon = true; // Assume we draw something unless specified otherwise

    // --- Determine Phase and Calculate ---
    if (score < this.t1_start) {
      // --- Phase: Day ---
      startState = this.dayState;
      endState = this.dayState;
      transitionAmount = 0;
      // Sun moves from high towards mid
      targetSunMoonY = lerp(highY, midY, score / this.t1_start);
      this.displaySunMoon = startState.isSun;
    } else if (score < this.t1_end) {
      // --- Transition 1: Day -> Sunset ---
      startState = this.dayState;
      endState = this.sunsetState;
      const duration = this.t1_end - this.t1_start;
      transitionAmount = duration <= 0 ? 1 : (score - this.t1_start) / duration;
      // Sun moves from mid towards low (horizon)
      targetSunMoonY = lerp(midY, lowY, transitionAmount);
      this.displaySunMoon = startState.isSun;
    } else if (score < this.t2_start) {
      // --- Phase: Sunset ---
      startState = this.sunsetState;
      endState = this.sunsetState;
      transitionAmount = 0;
      // Sun stays low near horizon
      targetSunMoonY = lowY;
      this.displaySunMoon = startState.isSun;
    } else if (score < this.t2_end) {
      // --- Transition 2: Sunset -> Dusk ---
      startState = this.sunsetState;
      endState = this.duskState; // Transitioning towards dusk (moon state)
      const duration = this.t2_end - this.t2_start;
      transitionAmount = duration <= 0 ? 1 : (score - this.t2_start) / duration;
      // Sun moves from low to below horizon
      targetSunMoonY = lerp(lowY, belowHorizonY, transitionAmount * 2); // Make it dip faster
      // Decide based on *endState* if it's the moon, show only moon after sun sets
      this.displaySunMoon = !endState.isSun; // Only display if the target state is moon
      // Moon also needs a position - let's have it rise during this phase?
      if (this.displaySunMoon) {
        // If we should display moon
        targetSunMoonY = lerp(belowHorizonY, midY, transitionAmount); // Moon rises from below to mid
      }
    } else if (score < this.t3_start) {
      // --- Phase: Dusk ---
      startState = this.duskState;
      endState = this.duskState;
      transitionAmount = 0;
      // Moon stays at mid height
      targetSunMoonY = midY;
      this.displaySunMoon = !startState.isSun; // It's the moon
    } else if (score < this.t3_end) {
      // --- Transition 3: Dusk -> Night ---
      startState = this.duskState;
      endState = this.nightState;
      const duration = this.t3_end - this.t3_start;
      transitionAmount = duration <= 0 ? 1 : (score - this.t3_start) / duration;
      // Moon moves from mid to high
      targetSunMoonY = lerp(midY, highY, transitionAmount);
      this.displaySunMoon = !startState.isSun; // It's the moon
    } else {
      // --- Phase: Night ---
      startState = this.nightState;
      endState = this.nightState;
      transitionAmount = 0;
      // Moon stays high
      targetSunMoonY = highY;
      this.displaySunMoon = !startState.isSun; // It's the moon
    }

    // Clamp transition amount
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
    // Lerp sun/moon color based on transition state (use start/end sunMoon prop)
    this.currentSunMoonColor = lerpColor(
      startState.sunMoon,
      endState.sunMoon,
      transitionAmount
    );

    // Smoothly update the Y position towards target
    // Use a higher lerp factor for faster movement if needed, e.g., 0.1
    this.sunMoonY = lerp(this.sunMoonY, targetSunMoonY, 0.05);

    // --- Update Stars (unchanged) ---
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;
    if (this.currentStarAlphaMultiplier > 0) {
      this.stars.forEach((star) => {
        star.x -= star.driftSpeed * deltaScale;
        if (star.x < -star.radius) {
          star.x = this.gameWidth + star.radius;
        }
        if (Math.random() < 0.05) {
          star.opacity = Math.random() * 0.5 + 0.3;
        }
      });
    }
  }

  draw(context) {
    if (!this.game || !context) return;
    const seaLevel = this.game.seaLevelY;
    if (typeof seaLevel !== "number" || isNaN(seaLevel)) return;

    try {
      // 1. Draw Sky
      context.fillStyle = this.currentSkyColor;
      context.fillRect(0, 0, this.gameWidth, this.gameHeight);

      // 2. Draw Stars
      if (this.currentStarAlphaMultiplier > 0.01) {
        context.save();
        context.globalAlpha = this.currentStarAlphaMultiplier;
        this.stars.forEach((star) => {
          if (star.y < seaLevel) {
            // Clip below sea level
            const finalAlpha = context.globalAlpha * star.opacity;
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
        // Check if current color matches the moon color to determine size/position
        const isMoon =
          this.currentSunMoonColor === this.nightState.sunMoon ||
          this.currentSunMoonColor === this.duskState.sunMoon; // Check against base moon color
        const sunMoonRadius = isMoon ? 30 : 40;
        const sunMoonX = isMoon ? this.gameWidth * 0.75 : this.gameWidth * 0.25;
        const effectiveDrawY = Math.min(
          this.sunMoonY,
          seaLevel - sunMoonRadius - 10
        ); // Keep above sea

        if (effectiveDrawY > -sunMoonRadius) {
          // Only draw if potentially visible
          context.fillStyle = this.currentSunMoonColor;
          context.beginPath();
          context.arc(sunMoonX, effectiveDrawY, sunMoonRadius, 0, Math.PI * 2);
          context.fill();
        }
      }

      // 4. Draw Sea
      context.fillStyle = this.currentSeaColor;
      const seaDrawHeight = Math.max(0, this.gameHeight - seaLevel);
      context.fillRect(0, seaLevel, this.gameWidth, seaDrawHeight);

      // 5. Draw Dashed Sea Line
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
