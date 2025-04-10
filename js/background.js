// js/background.js
// NOTE: This version ONLY handles drawing the sky color, sun, moon, and stars onto the CANVAS.
// Scrolling layers are handled by CSS.

import { randomInt } from "./utils.js";
function lerp(start, end, amount) {
  amount = Math.max(0, Math.min(1, amount));
  return start + (end - start) * amount;
}
function lerpColor(hexColor1, hexColor2, amount) {
  try {
    if (
      !/^#[0-9A-F]{6}$/i.test(hexColor1) ||
      !/^#[0-9A-F]{6}$/i.test(hexColor2)
    ) {
      throw new Error(`Invalid hex: ${hexColor1}, ${hexColor2}`);
    }
    const r1 = parseInt(hexColor1.slice(1, 3), 16),
      g1 = parseInt(hexColor1.slice(3, 5), 16),
      b1 = parseInt(hexColor1.slice(5, 7), 16);
    const r2 = parseInt(hexColor2.slice(1, 3), 16),
      g2 = parseInt(hexColor2.slice(3, 5), 16),
      b2 = parseInt(hexColor2.slice(5, 7), 16);
    if (isNaN(r1 + g1 + b1 + r2 + g2 + b2)) {
      throw new Error("NaN parsing hex");
    }
    const r = Math.round(lerp(r1, r2, amount)),
      g = Math.round(lerp(g1, g2, amount)),
      b = Math.round(lerp(b1, b2, amount));
    const toHex = (c) => c.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
  } catch (e) {
    console.error("Error lerpColor:", e);
    return hexColor1;
  }
}

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
    this.baseGameSpeed = 0.5;
    this.dayColors = {
      sky: "#87CEEB",
      sea: "#0077CC",
      sun: "#FFFF00",
      cloudAlpha: 1.0,
      waveColor: "#FFFFFF",
    }; // White waves
    this.afternoonColors = {
      sky: "#FFB347",
      sea: "#0055AA",
      sun: "#FFA500",
      cloudAlpha: 0.9,
      waveColor: "#DDDDDD",
    };
    this.nightColors = {
      sky: "#0B0B22",
      sea: "#000044",
      moon: "#FFFFE0",
      cloudAlpha: 0.6,
      stars: true,
      waveColor: "#AAAAAA",
    }; // Darker clouds at night
    this.currentSkyColor = this.dayColors.sky;
    this.currentSeaColor = this.dayColors.sea;
    this.currentSunColor = this.dayColors.sun;
    this.currentMoonColor = this.nightColors.moon;
    this.currentCloudAlpha = this.dayColors.cloudAlpha;
    this.currentWaveColor = this.dayColors.waveColor;
    this.showSun = true;
    this.showMoon = false;
    this.sunY = this.gameHeight * 0.15;
    this.moonY = this.gameHeight * 0.15;
    this.nightProgress = 0;
    this.AFTERNOON_START_SCORE = 500;
    this.NIGHT_START_SCORE = 1500;
    this.CYCLE_END_SCORE = 2500;
    // Layers
    const layer1 = new BackgroundLayer(
      "images/far-clouds.png",
      0.2,
      gameWidth,
      gameHeight,
      50
    );
    const layer2 = new BackgroundLayer(
      "images/near-clouds.png",
      0.4,
      gameWidth,
      gameHeight,
      100
    ); // Changed from mid-clouds
    const layer3 = new BackgroundLayer(
      "images/sea.png",
      0.8,
      gameWidth,
      gameHeight,
      gameHeight - 100
    );
    this.layers = [layer1, layer2, layer3];
    this.seaLevelY = gameHeight - 100;
    this.drawFallback = !layer3.image.src.endsWith(".png"); // Check sea layer
    this.stars = [];
    if (this.nightColors.stars) {
      this.createStars();
    }
    this.gameContainerElement = document.getElementById("game-container"); // Keep reference
    // console.log("Hybrid Background Manager Initialized.");
  }

  createStars() {
    this.stars = []; // Initialize or clear the array
    const numStars = 150; // Density of stars
    for (let i = 0; i < numStars; i++) {
      this.stars.push({
        // Random position across the screen width
        x: Math.random() * this.gameWidth,
        // Random position in the upper 80% of the screen height (avoiding sea area)
        y: Math.random() * (this.gameHeight * 0.8),
        // Random size
        radius: Math.random() * 1.2 + 0.3, // Range: 0.3 to 1.5 pixels
        // Random initial opacity for twinkling effect base
        opacity: Math.random() * 0.5 + 0.3, // Range: 0.3 to 0.8
        // Individual drift speed (very slow)
        driftSpeed: Math.random() * 0.1 + 0.02, // Range: 0.02 to 0.12
      });
    }
    console.log(`Created ${this.stars.length} stars.`); // Log creation
  }

  update(deltaTime, score = 0) {
    this.currentScore = score;
    this.layers.forEach((layer) => layer.update(this.baseGameSpeed, deltaTime));

    // --- Calculate Transition Progress ---
    let skyC1,
      skyC2,
      seaC1,
      seaC2,
      sunC1,
      sunC2,
      cloudA1,
      cloudA2,
      waveC1,
      waveC2; // Declare all needed vars
    let transitionAmount = 0;
    this.showSun = false;
    this.showMoon = false;
    this.nightProgress = 0;

    // Determine phase and set BOTH start and end colors for ALL properties
    if (score < this.AFTERNOON_START_SCORE) {
      // Day
      skyC1 = skyC2 = this.dayColors.sky;
      seaC1 = seaC2 = this.dayColors.sea;
      sunC1 = sunC2 = this.dayColors.sun;
      cloudA1 = cloudA2 = this.dayColors.cloudAlpha;
      waveC1 = waveC2 = this.dayColors.waveColor;
      this.showSun = true;
      this.sunY = lerp(
        this.gameHeight * 0.15,
        this.gameHeight * 0.5,
        score / this.AFTERNOON_START_SCORE
      );
    } else if (score < this.NIGHT_START_SCORE) {
      // Day -> Afternoon Transition
      const phaseDuration = this.NIGHT_START_SCORE - this.AFTERNOON_START_SCORE;
      transitionAmount =
        phaseDuration <= 0
          ? 1.0
          : (score - this.AFTERNOON_START_SCORE) / phaseDuration;
      skyC1 = this.dayColors.sky;
      skyC2 = this.afternoonColors.sky;
      seaC1 = this.dayColors.sea;
      seaC2 = this.afternoonColors.sea;
      sunC1 = this.dayColors.sun;
      sunC2 = this.afternoonColors.sun;
      cloudA1 = this.dayColors.cloudAlpha;
      cloudA2 = this.afternoonColors.cloudAlpha;
      waveC1 = this.dayColors.waveColor;
      waveC2 = this.afternoonColors.waveColor;
      this.showSun = true;
      this.sunY = lerp(
        this.gameHeight * 0.5,
        this.gameHeight - 50,
        transitionAmount
      ); // Sun sets
    } else {
      // Afternoon -> Night Transition (or stay Night)
      const phaseDuration = this.CYCLE_END_SCORE - this.NIGHT_START_SCORE;
      transitionAmount =
        phaseDuration <= 0
          ? 1.0
          : Math.min(1.0, (score - this.NIGHT_START_SCORE) / phaseDuration);
      skyC1 = this.afternoonColors.sky;
      skyC2 = this.nightColors.sky;
      seaC1 = this.afternoonColors.sea;
      seaC2 = this.nightColors.sea;
      // Set sun colors even though not shown, to avoid undefined if lerpColor is called unexpectedly
      sunC1 = sunC2 = this.afternoonColors.sun;
      cloudA1 = this.afternoonColors.cloudAlpha;
      cloudA2 = this.nightColors.cloudAlpha;
      waveC1 = this.afternoonColors.waveColor;
      waveC2 = this.nightColors.waveColor;
      this.showMoon = true;
      this.moonY = lerp(
        this.gameHeight * 0.6,
        this.gameHeight * 0.15,
        transitionAmount
      ); // Moon rises
      this.nightProgress = transitionAmount;
    }

    // Calculate Interpolated Values (Now safe, as start/end colors always defined)
    this.currentSkyColor = lerpColor(skyC1, skyC2, transitionAmount);
    this.currentSeaColor = lerpColor(seaC1, seaC2, transitionAmount);
    this.currentCloudAlpha = lerp(cloudA1, cloudA2, transitionAmount);
    this.currentWaveColor = lerpColor(waveC1, waveC2, transitionAmount);
    // Only calculate sun color if needed
    if (this.showSun) {
      this.currentSunColor = lerpColor(sunC1, sunC2, transitionAmount);
    }
    this.currentMoonColor = this.nightColors.moon;

    // Update CSS var
    if (this.gameContainerElement) {
      this.gameContainerElement.style.setProperty(
        "--sky-color",
        this.currentSkyColor
      );
    }

    // Update stars (position/twinkle)
    const safeDeltaTime = Math.max(0.1, deltaTime); // Use safeDeltaTime here too
    const deltaScale = safeDeltaTime / 16.67;
    if (this.nightProgress > 0 && this.nightColors.stars) {
      this.stars.forEach((star) => {
        // Apply horizontal drift based on individual speed and deltaTime
        star.x -= star.driftSpeed * deltaScale;
        // Wrap stars around screen
        if (star.x < -star.radius) {
          star.x = this.gameWidth + star.radius;
          // Optionally randomize Y position slightly when wrapping
          // star.y = Math.random() * (this.gameHeight * 0.8);
        }
        // Simple twinkle effect: small chance to change opacity each frame
        if (Math.random() < 0.05) {
          // 5% chance each frame
          star.opacity = Math.random() * 0.5 + 0.3; // Re-randomize opacity (0.3 to 0.8)
        }
      });
    }
  }

  draw(context) {
    if (!context) {
      console.error("Background.draw: Canvas context is missing!");
      return;
    }
    try {
      // 1. Draw Base Sky Color on Canvas
      context.fillStyle = this.currentSkyColor;
      context.fillRect(0, 0, this.gameWidth, this.gameHeight);

      // 2. Draw Stars (If applicable)
      // Use the locally stored nightProgress calculated in update
      if (this.nightProgress > 0 && this.nightColors.stars) {
        this.stars.forEach((star) => {
          context.save();
          // Fade stars in based on night progress, combine with individual opacity
          // Make fade-in slightly faster
          context.globalAlpha =
            Math.min(1.0, this.nightProgress * 2.0) * star.opacity;
          context.fillStyle = "white"; // Simple white stars
          context.beginPath();
          // Draw small circle for star
          context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
          context.fill();
          context.restore(); // Restore alpha
        });
      }

      // 3. Draw Sun or Moon on Canvas
      if (this.showMoon) {
        context.fillStyle = this.currentMoonColor; // Use calculated moon color (usually fixed)
        context.beginPath();
        // Draw moon (adjust position/size as needed)
        context.arc(this.gameWidth * 0.75, this.moonY, 30, 0, Math.PI * 2);
        context.fill();
      } else if (this.showSun) {
        context.fillStyle = this.currentSunColor; // Use calculated sun color
        context.beginPath();
        // Draw sun (adjust position/size as needed)
        context.arc(this.gameWidth * 0.25, this.sunY, 40, 0, Math.PI * 2);
        context.fill();
        // Optional: Add simple sun rays/glow?
        // context.fillStyle = 'rgba(255, 255, 0, 0.1)'; // Yellow glow
        // for (let i=0; i<3; i++) {
        //    context.beginPath();
        //    context.arc(this.gameWidth*0.25, this.sunY, 40 + (i+1)*15, 0, Math.PI*2);
        //    context.fill();
        // }
      }

      // --- Fallback Sea/Wave Drawing --- (If using fallback)
      const seaLayer = this.layers[2]; // Index 2 is sea image in this version
      const seaImageLoaded =
        seaLayer && seaLayer.image.complete && seaLayer.image.naturalWidth > 0;
      if (this.drawFallback || !seaImageLoaded) {
        context.fillStyle = this.currentSeaColor;
        context.fillRect(
          0,
          this.seaLevelY,
          this.gameWidth,
          this.gameHeight - this.seaLevelY
        );
        context.fillStyle = this.currentWaveColor;
        const seaLayerX = seaLayer ? seaLayer.x : 0;
        for (let i = 0; i < this.gameWidth; i += 25) {
          let waveX = (i - (seaLayerX % 50)) % this.gameWidth;
          if (waveX < 0) waveX += this.gameWidth;
          context.fillRect(
            waveX,
            this.seaLevelY + 5 + Math.sin(i * 0.4 + Date.now() * 0.0015) * 2,
            15,
            3
          );
        }
      } // else: CSS handles drawing the actual sea image layer
    } catch (e) {
      console.error("Error during Background.draw:", e);
    }
  } // End of draw method
} // End of Background class
