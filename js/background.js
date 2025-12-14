import { randomInt, lerp, lerpColor } from "./utils.js";

export class Background {
  constructor(gameWidth, gameHeight) {
    this.game = null; // Will be set via setGame()
    this.gameWidth = gameWidth;
    this.gameHeight = gameHeight;
    this.baseGameSpeed = 0.5; // Affects star drift

    // --- Color & State Definitions ---
    // Define the properties for each time of day
    // Note: Removed 'sea' and 'wave' colors as sea is CSS now
    this.dayState = {
      sky: "#87CEEB",
      sunMoon: "#FEFFBF",
      starAlpha: 0.0,
      isSun: true,
    };
    this.sunsetState = {
      sky: "#E17000",
      sunMoon: "#FF8C00",
      starAlpha: 0.0,
      isSun: true,
    };
    this.duskState = {
      sky: "#483D8B",
      sunMoon: "#FFFFE0",
      starAlpha: 0.5,
      isSun: false,
    };
    this.nightState = {
      sky: "#0B0B22",
      sunMoon: "#FFFFE0",
      starAlpha: 1.0,
      isSun: false,
    };

    // Current visual properties, updated via lerping
    this.currentSkyColor = this.dayState.sky;
    this.currentSunMoonColor = this.dayState.sunMoon;
    this.currentStarAlphaMultiplier = this.dayState.starAlpha;

    // Sun/Moon position control
    this.sunMoonY = this.gameHeight * 0.15; // Initial Y for sun
    this.displaySunMoon = true; // Whether to draw the current celestial body
    this.isMoon = false; // Track whether to show moon (true) or sun (false)
    this.useBrightSun = true;
    this.lastSunX = this.gameWidth * 0.25;

    // Stars
    this.stars = [];
    this.createStars(150); // Create stars

    // Transition Score Thresholds (initialized, but set properly in setGame)
    this.t1_start = 1000;
    this.t1_end = 2000;
    this.t2_start = 5000;
    this.t2_end = 6000;
    this.t3_start = 14000;
    this.t3_end = 15000;

    // --- Get reference to container for CSS variable update ---
    this.gameContainerElement = document.getElementById("game-container");
    if (!this.gameContainerElement) {
      console.error(
        "Background constructor: Failed to get #game-container element!"
      );
    }

    // --- Load Sun and Moon Images ---
    this.sunImage = new Image();
    this.sunImage.src = "images/sun.png";
    this.sunImageLoaded = false;
    this.sunImage.onload = () => {
      this.sunImageLoaded = true;
      console.log("Sun image loaded");
    };

    this.brightSunImage = new Image();
    this.brightSunImage.src = "images/bright-sun.png";
    this.brightSunImageLoaded = false;
    this.brightSunImage.onload = () => {
      this.brightSunImageLoaded = true;
      console.log("Bright sun image loaded");
    };

    this.moonImage = new Image();
    this.moonImage.src = "images/larger-moon.png";
    this.moonImageLoaded = false;
    this.moonImage.onload = () => {
      this.moonImageLoaded = true;
      console.log("Moon image loaded");
    };

    console.log("Background Initialized (Canvas Sky/Stars + CSS Layers)");
  }

  // Link to the main game instance to access score and thresholds
  setGame(gameInstance) {
    this.game = gameInstance;
    if (!this.game) {
      console.error("Background: Game instance failed to set!");
      return;
    }
    // Define transition points relative to boss score thresholds from game instance
    const B1_SCORE = this.game.BOSS1_SCORE_THRESHOLD; // e.g., 1800
    const B2_SCORE = this.game.BOSS2_SCORE_THRESHOLD; // e.g., 6500
    const B3_SCORE = this.game.BOSS3_SCORE_THRESHOLD; // e.g., 15000
    const PADDING = 150; // Score padding around boss for transitions
    const T3_DURATION = 2000; // Duration of final fade to night

    this.t1_start = B1_SCORE - PADDING;
    this.t1_end = B1_SCORE + PADDING * 2;
    this.t2_start = B2_SCORE - PADDING;
    this.t2_end = B2_SCORE + PADDING * 2;
    this.t3_end = B3_SCORE;
    this.t3_start = Math.max(this.t2_end + 100, this.t3_end - T3_DURATION);

    console.log(
      `Background Transitions Set: T1(${this.t1_start}-${this.t1_end}), T2(${this.t2_start}-${this.t2_end}), T3(${this.t3_start}-${this.t3_end})`
    );

    // Validation
    if (this.t1_end >= this.t2_start || this.t2_end >= this.t3_start) {
      console.warn("Background transition score ranges might be overlapping!");
    }
    if (this.t3_end !== B3_SCORE) {
      console.error(
        `Error: T3 transition end (${this.t3_end}) does not match Boss 3 threshold (${B3_SCORE})!`
      );
    }
    if (this.game.seaLevelY === undefined) {
      console.error("Background: Game instance missing 'seaLevelY' property!");
      this.game.seaLevelY = this.gameHeight * 0.6;
    }
  }

  createStars(count) {
    this.stars = [];
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * this.gameWidth,
        y: Math.random() * this.gameHeight * 0.8, // Spawn mostly higher up
        radius: Math.random() * 1.2 + 0.3,
        opacity: Math.random() * 0.5 + 0.3,
        driftSpeed: Math.random() * 0.05 + 0.01,
      });
    }
  }

  update(deltaTime, score = 0) {
    if (!this.game) return;

    // --- Determine Current Phase and Transition ---
    let startState, endState;
    let transitionAmount = 0;

    // Define key Y positions for celestial bodies
    const highY = this.gameHeight * 0.15;
    const midY = this.gameHeight * 0.4;
    // Adjust lowY based on game's seaLevelY property
    const seaLevel = this.game.seaLevelY || this.gameHeight * 0.6; // Use game value or fallback
    const lowY = seaLevel - 40;
    const belowHorizonY = seaLevel + 60;

    let targetSunMoonY = belowHorizonY;
    this.displaySunMoon = true;

    // Determine phase and set start/end states for lerping
    if (score < this.t1_start) {
      startState = this.dayState;
      endState = this.dayState;
      transitionAmount = 0;
      targetSunMoonY = lerp(highY, midY, score / this.t1_start);
      this.displaySunMoon = true;
      this.isMoon = false; // Sun phase
      this.useBrightSun = true;
    } else if (score < this.t1_end) {
      startState = this.dayState;
      endState = this.sunsetState;
      const duration = this.t1_end - this.t1_start;
      transitionAmount = duration <= 0 ? 1 : (score - this.t1_start) / duration;
      targetSunMoonY = lerp(midY, lowY, transitionAmount);
      this.displaySunMoon = true;
      this.isMoon = false; // Sun phase
      this.useBrightSun = false;
    } else if (score < this.t2_start) {
      startState = this.sunsetState;
      endState = this.sunsetState;
      transitionAmount = 0;
      targetSunMoonY = lowY;
      this.displaySunMoon = true;
      this.isMoon = false; // Sun phase
      this.useBrightSun = false;
    } else if (score < this.t2_end) {
      startState = this.sunsetState;
      endState = this.duskState;
      const duration = this.t2_end - this.t2_start;
      transitionAmount = duration <= 0 ? 1 : (score - this.t2_start) / duration;
      // Sun sets, moon rises
      this.displaySunMoon = true;
      this.isMoon = true; // Switch to moon during dusk transition
      this.useBrightSun = false;
      targetSunMoonY = lerp(belowHorizonY, midY, transitionAmount);
    } else if (score < this.t3_start) {
      startState = this.duskState;
      endState = this.duskState;
      transitionAmount = 0;
      targetSunMoonY = midY;
      this.displaySunMoon = true;
      this.isMoon = true; // Moon phase
      this.useBrightSun = false;
    } else if (score < this.t3_end) {
      startState = this.duskState;
      endState = this.nightState;
      const duration = this.t3_end - this.t3_start;
      transitionAmount = duration <= 0 ? 1 : (score - this.t3_start) / duration;
      targetSunMoonY = lerp(midY, highY, transitionAmount);
      this.displaySunMoon = true;
      this.isMoon = true; // Moon phase
      this.useBrightSun = false;
    } else {
      startState = this.nightState;
      endState = this.nightState;
      transitionAmount = 0;
      targetSunMoonY = highY;
      this.displaySunMoon = true;
      this.isMoon = true; // Moon phase
      this.useBrightSun = false;
    }

    // Clamp transition amount
    transitionAmount = Math.max(0, Math.min(1, transitionAmount));

    // --- Calculate Interpolated Visual Properties ---
    try {
      this.currentSkyColor = lerpColor(
        startState.sky,
        endState.sky,
        transitionAmount
      );
      // Removed sea/wave color lerping
      this.currentStarAlphaMultiplier = lerp(
        startState.starAlpha,
        endState.starAlpha,
        transitionAmount
      );
      this.currentSunMoonColor = lerpColor(
        startState.sunMoon,
        endState.sunMoon,
        transitionAmount
      );
    } catch (e) {
      console.error("Error during color/alpha lerping:", e);
      this.currentSkyColor = this.dayState.sky;
      this.currentStarAlphaMultiplier = 0;
      this.currentSunMoonColor = this.dayState.sunMoon; // Fallbacks
    }
    // Smoothly update the Y position towards target
    this.sunMoonY = lerp(this.sunMoonY, targetSunMoonY, 0.05);

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

    // --- Update CSS Variable for Sky Color ---
    if (this.gameContainerElement) {
      this.gameContainerElement.style.setProperty(
        "--sky-color",
        this.currentSkyColor
      );
    }
  }

  draw(context) {
    if (!this.game || !context) return;
    // Use game's seaLevelY for clipping, ensure it's valid
    const seaLevel = this.game.seaLevelY;
    if (typeof seaLevel !== "number" || isNaN(seaLevel)) {
      console.warn(
        `Background.draw: Invalid seaLevelY (${seaLevel}), using fallback.`
      );
      // It's better to let it draw potentially clipped than stop entirely maybe?
      // return; // Or maybe just proceed with a guess?
    }
    const safeSeaLevel =
      typeof seaLevel === "number" ? seaLevel : this.gameHeight * 0.6; // Use fallback if needed

    try {
      // --- 1. Draw Sky Background on Canvas (Optional but Recommended) ---
      // Provides base color behind transparent CSS layers and prevents flickering.
   /*    context.fillStyle = this.currentSkyColor;
      context.fillRect(0, 0, this.gameWidth, this.gameHeight); */

      // --- 2. Draw Stars (clipped above safeSeaLevel) ---
      if (this.currentStarAlphaMultiplier > 0.01) {
        context.save();
        context.globalAlpha = this.currentStarAlphaMultiplier;
        this.stars.forEach((star) => {
          if (star.y < safeSeaLevel) {
            // Use safeSeaLevel for clipping
            const finalAlpha = context.globalAlpha * star.opacity;
            context.fillStyle = `rgba(255, 255, 255, ${finalAlpha})`;
            context.beginPath();
            context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
            context.fill();
          }
        });
        context.restore();
      }

      // --- 3. Draw Sun or Moon (clipped above safeSeaLevel) ---
      if (this.displaySunMoon) {
        const sunMoonRadius = this.isMoon ? 40 : 40;
        const sunX = this.gameWidth * 0.25;
        const sunMoonX = this.isMoon ? this.lastSunX : sunX;
        // Ensure effectiveDrawY is calculated correctly and keeps object above sea
        const effectiveDrawY = Math.min(
          this.sunMoonY,
          safeSeaLevel - sunMoonRadius - 10
        );

        if (effectiveDrawY > -sunMoonRadius) {
          if (!this.isMoon) {
            this.lastSunX = sunMoonX;
          }
          // Draw if visible - use images if loaded, otherwise fallback to circles
          const imageSize = sunMoonRadius * 2;
          if (this.isMoon && this.moonImageLoaded) {
            context.drawImage(
              this.moonImage,
              sunMoonX - sunMoonRadius,
              effectiveDrawY - sunMoonRadius,
              imageSize,
              imageSize
            );
          } else if (
            !this.isMoon &&
            this.useBrightSun &&
            this.brightSunImageLoaded
          ) {
            context.drawImage(
              this.brightSunImage,
              sunMoonX - sunMoonRadius,
              effectiveDrawY - sunMoonRadius,
              imageSize,
              imageSize
            );
          } else if (!this.isMoon && this.sunImageLoaded) {
            context.drawImage(
              this.sunImage,
              sunMoonX - sunMoonRadius,
              effectiveDrawY - sunMoonRadius,
              imageSize,
              imageSize
            );
          } else {
            // Fallback to circle if image not loaded
            context.fillStyle = this.currentSunMoonColor;
            context.beginPath();
            context.arc(sunMoonX, effectiveDrawY, sunMoonRadius, 0, Math.PI * 2);
            context.fill();
          }
        }
      }

      // --- 4. & 5. Sea and Wave Drawing REMOVED ---
      // Assumed handled by CSS layers
    } catch (e) {
      console.error("Error during Background.draw:", e);
    }
  } // End draw()
} // End Background class
