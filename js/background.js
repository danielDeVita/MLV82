// js/background.js
import { randomInt } from './utils.js'; // Keep if randomInt is needed elsewhere

// --- Helper function for Linear Interpolation (Lerp) ---
// (Could also be moved to utils.js)
function lerp(start, end, amount) {
    amount = Math.max(0, Math.min(1, amount)); // Clamp amount
    return start + (end - start) * amount;
}

// Helper to lerp RGB color components
function lerpColor(hexColor1, hexColor2, amount) {
    try {
        const r1 = parseInt(hexColor1.slice(1, 3), 16);
        const g1 = parseInt(hexColor1.slice(3, 5), 16);
        const b1 = parseInt(hexColor1.slice(5, 7), 16);
        const r2 = parseInt(hexColor2.slice(1, 3), 16);
        const g2 = parseInt(hexColor2.slice(3, 5), 16);
        const b2 = parseInt(hexColor2.slice(5, 7), 16);
        if (isNaN(r1) || isNaN(g1) || isNaN(b1) || isNaN(r2) || isNaN(g2) || isNaN(b2)) {
            throw new Error("Invalid hex color format");
        }
        const r = Math.round(lerp(r1, r2, amount));
        const g = Math.round(lerp(g1, g2, amount));
        const b = Math.round(lerp(b1, b2, amount));
        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    } catch (e) {
        console.error(`Error lerping colors: ${hexColor1}, ${hexColor2}`, e);
        return hexColor1; // Return start color on error
    }
}

// ======================================================
// Represents a SINGLE background layer object
// ======================================================
class BackgroundLayer {
    constructor(imageSrc, speedModifier, gameWidth, gameHeight, yOffset = 0) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.speedModifier = speedModifier;
        this.image = new Image();
        // Basic check if image source seems valid
        if (imageSrc && typeof imageSrc === 'string') {
            this.image.src = imageSrc;
        } else {
            console.warn("Invalid imageSrc provided for BackgroundLayer, using fallback.");
            this.image.src = ''; // Prevent attempting to load invalid source
        }
        this.width = gameWidth; // Assume image width matches game width
        this.height = gameHeight; // Assume image height matches game height unless offset
        this.x = 0;
        this.y = yOffset;
        this.x2 = this.width;
        this.opacity = 1.0; // For potential tinting/fading later
    }

    update(baseGameSpeed, deltaTime) {
        const safeDeltaTime = Math.max(0.1, deltaTime);
        const deltaScale = safeDeltaTime / 16.67;
        const effectiveSpeed = baseGameSpeed * this.speedModifier;
        const moveAmount = effectiveSpeed * deltaScale;

        this.x -= moveAmount;
        this.x2 -= moveAmount;

        // Seamless looping reset logic
        if (this.x <= -this.width) { this.x += this.width * 2; }
        if (this.x2 <= -this.width) { this.x2 += this.width * 2; }
    }

    draw(context, opacity = 1.0) {
        context.save();
        context.globalAlpha = opacity * this.opacity; // Apply combined opacity

        const imageLoaded = this.image.complete && this.image.naturalWidth > 0;

        if (!imageLoaded) {
            if (this.image.src && this.image.src !== window.location.href) {
                 context.fillStyle = 'rgba(128, 128, 128, 0.5)'; // Grey placeholder
                 context.fillRect(this.x, this.y, this.width, this.height);
                 context.fillRect(this.x2, this.y, this.width, this.height);
            }
        } else {
            try {
                context.drawImage(this.image, this.x, this.y, this.width, this.height);
                context.drawImage(this.image, this.x2, this.y, this.width, this.height);
            } catch (e) {
                console.error("Error drawing background layer image:", e, this.image.src);
                 context.fillStyle = 'rgba(255, 0, 0, 0.3)'; // Red error placeholder
                 context.fillRect(this.x, this.y, this.width, this.height);
                 context.fillRect(this.x2, this.y, this.width, this.height);
            }
        }
        context.restore();
    }
} // End of BackgroundLayer class


// ==================================================================
// Manages ALL background layers and time-of-day transitions
// ==================================================================
export class Background {
    constructor(gameWidth, gameHeight) {
        this.game = null; // Initialize game reference (set from Game constructor)
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.baseGameSpeed = 0.5; // Base speed for background scrolling

        // Time of Day Palettes
        this.dayColors = { sky: '#87CEEB', sea: '#0077CC', sun: '#FFFF00', cloudAlpha: 1.0, waveColor: 'white' };
        this.afternoonColors = { sky: '#FFB347', sea: '#0055AA', sun: '#FFA500', cloudAlpha: 0.9, waveColor: '#DDDDDD' };
        this.nightColors = { sky: '#0B0B22', sea: '#000044', moon: '#FFFFE0', cloudAlpha: 0.4, stars: true, waveColor: '#AAAAAA' };

        // Current interpolated state
        this.currentSkyColor = this.dayColors.sky;
        this.currentSeaColor = this.dayColors.sea;
        this.currentSunColor = this.dayColors.sun;
        this.currentMoonColor = this.nightColors.moon;
        this.currentCloudAlpha = this.dayColors.cloudAlpha;
        this.currentWaveColor = this.dayColors.waveColor;
        this.showSun = true; this.showMoon = false;
        this.sunY = this.gameHeight * 0.15; this.moonY = this.gameHeight * 0.15;

        // Score thresholds for transitions
        this.AFTERNOON_START_SCORE = 500;
        this.NIGHT_START_SCORE = 1500;
        this.CYCLE_END_SCORE = 2500; // Score when night is fully transitioned

        // --- CORRECT PLACEMENT: Define Layers HERE ---
        const layer1 = new BackgroundLayer('images/far-clouds.png', 0.2, gameWidth, gameHeight, 50);
        const layer2 = new BackgroundLayer('images/near-clouds.png', 0.4, gameWidth, gameHeight, 100);
        const layer3 = new BackgroundLayer('images/sea.png', 0.8, gameWidth, gameHeight, gameHeight - 100); // Sea image layer

        // Store layers in an array property of the Background instance
        this.layers = [layer1, layer2, layer3]; // Note: Removed the static sky layer

        // Fallback drawing properties
        this.seaLevelY = gameHeight - 100;
        // Check if the specific sea layer image exists for fallback decision
        this.drawFallback = !layer3.image.src.endsWith('.png');

        // Stars
        this.stars = [];
        if (this.nightColors.stars) { this.createStars(); }
    }

    createStars() {
       this.stars = [];
       for (let i = 0; i < 150; i++) {
           this.stars.push({
               x: Math.random() * this.gameWidth,
               y: Math.random() * (this.gameHeight * 0.7),
               radius: Math.random() * 1.2 + 0.3,
               opacity: Math.random() * 0.5 + 0.3
           });
       }
    }

    // Update background based on game score
    update(deltaTime, score = 0) {
        // Store score for draw method access if needed (or rely on this.game.score if game ref is set)
        this.currentScore = score;

        // --- Update Layer Scrolling ---
        this.layers.forEach(layer => layer.update(this.baseGameSpeed, deltaTime));

        // --- Calculate Transition Progress ---
        let skyColor1, skyColor2, seaColor1, seaColor2, sunColor1, sunColor2, cloudAlpha1, cloudAlpha2, waveColor1, waveColor2;
        let transitionAmount = 0;
        this.showSun = false; this.showMoon = false;

        // Determine phase and interpolation values based on score
        if (score < this.AFTERNOON_START_SCORE) { // Day
            skyColor1 = skyColor2 = this.dayColors.sky; seaColor1 = seaColor2 = this.dayColors.sea;
            sunColor1 = sunColor2 = this.dayColors.sun; cloudAlpha1 = cloudAlpha2 = this.dayColors.cloudAlpha;
            waveColor1 = waveColor2 = this.dayColors.waveColor;
            this.showSun = true;
            this.sunY = lerp(this.gameHeight * 0.15, this.gameHeight * 0.5, score / this.AFTERNOON_START_SCORE);

        } else if (score < this.NIGHT_START_SCORE) { // Day -> Afternoon Transition
            const phaseDuration = this.NIGHT_START_SCORE - this.AFTERNOON_START_SCORE;
            transitionAmount = phaseDuration <= 0 ? 1.0 : (score - this.AFTERNOON_START_SCORE) / phaseDuration;
            skyColor1 = this.dayColors.sky; skyColor2 = this.afternoonColors.sky;
            seaColor1 = this.dayColors.sea; seaColor2 = this.afternoonColors.sea;
            sunColor1 = this.dayColors.sun; sunColor2 = this.afternoonColors.sun;
            cloudAlpha1 = this.dayColors.cloudAlpha; cloudAlpha2 = this.afternoonColors.cloudAlpha;
            waveColor1 = this.dayColors.waveColor; waveColor2 = this.afternoonColors.waveColor;
            this.showSun = true;
            this.sunY = lerp(this.gameHeight * 0.5, this.gameHeight - 50, transitionAmount); // Sun sets

        } else { // Afternoon -> Night Transition (or stay Night)
            const phaseDuration = this.CYCLE_END_SCORE - this.NIGHT_START_SCORE;
            transitionAmount = phaseDuration <= 0 ? 1.0 : Math.min(1.0, (score - this.NIGHT_START_SCORE) / phaseDuration);
            skyColor1 = this.afternoonColors.sky; skyColor2 = this.nightColors.sky;
            seaColor1 = this.afternoonColors.sea; seaColor2 = this.nightColors.sea;
            cloudAlpha1 = this.afternoonColors.cloudAlpha; cloudAlpha2 = this.nightColors.cloudAlpha;
            waveColor1 = this.afternoonColors.waveColor; waveColor2 = this.nightColors.waveColor;
            this.showMoon = true;
            this.moonY = lerp(this.gameHeight * 0.6, this.gameHeight * 0.15, transitionAmount); // Moon rises
        }

        // Calculate Interpolated Values
        this.currentSkyColor = lerpColor(skyColor1, skyColor2, transitionAmount);
        this.currentSeaColor = lerpColor(seaColor1, seaColor2, transitionAmount);
        this.currentCloudAlpha = lerp(cloudAlpha1, cloudAlpha2, transitionAmount);
        this.currentWaveColor = lerpColor(waveColor1, waveColor2, transitionAmount);
        if (this.showSun) { this.currentSunColor = lerpColor(sunColor1, sunColor2, transitionAmount); }
        this.currentMoonColor = this.nightColors.moon;

        // Update stars
        const deltaScale = Math.max(0.1, deltaTime) / 16.67;
        this.stars.forEach(star => {
              star.x -= 0.1 * deltaScale; // Slow drift
              if (star.x < -star.radius) star.x = this.gameWidth + star.radius;
              if (Math.random() < 0.05) { star.opacity = Math.random() * 0.5 + 0.3; } // Twinkle
         });
    }

    draw(context) {
        // 1. Draw Base Sky Color
        context.fillStyle = this.currentSkyColor;
        context.fillRect(0, 0, this.gameWidth, this.gameHeight);

        // 2. Draw Stars
        const score = this.game ? this.game.score : (this.currentScore || 0); // Use game score if available
        const nightProgress = Math.max(0, (score - this.NIGHT_START_SCORE) / (this.CYCLE_END_SCORE - this.NIGHT_START_SCORE || 1));
        if (nightProgress > 0 && this.nightColors.stars) {
             this.stars.forEach(star => {
                 context.save();
                 context.globalAlpha = Math.min(1.0, nightProgress * 1.5) * star.opacity;
                 context.fillStyle = 'white';
                 context.beginPath();
                 context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
                 context.fill();
                 context.restore();
             });
        }

        // 3. Draw Sun or Moon
         if (this.showMoon) {
             context.fillStyle = this.currentMoonColor;
             context.beginPath(); context.arc(this.gameWidth*0.75, this.moonY, 30, 0, Math.PI*2); context.fill();
         } else if (this.showSun) {
             context.fillStyle = this.currentSunColor;
             context.beginPath(); context.arc(this.gameWidth*0.25, this.sunY, 40, 0, Math.PI*2); context.fill();
         }

        // 4. Draw Parallax Layers (Clouds) with dynamic alpha
        this.layers.forEach((layer, index) => {
            if (index === 2) return; // Skip sea image layer (index 2 now)
            layer.draw(context, this.currentCloudAlpha);
        });

        // 5. Draw Sea (Fallback color OR Sea Image Layer)
        const seaLayer = this.layers[2]; // Index 2 is sea image
        const seaImageLoaded = seaLayer && seaLayer.image.complete && seaLayer.image.naturalWidth > 0;

        if (this.drawFallback || !seaImageLoaded) {
            // Draw fallback colored sea
            context.fillStyle = this.currentSeaColor;
            context.fillRect(0, this.seaLevelY, this.gameWidth, this.gameHeight - this.seaLevelY);
            // Draw waves
            context.fillStyle = this.currentWaveColor;
            const seaLayerX = seaLayer ? seaLayer.x : 0;
            for (let i = 0; i < this.gameWidth; i += 25) {
                let waveX = (i - (seaLayerX % 50)) % this.gameWidth;
                if (waveX < 0) waveX += this.gameWidth;
                context.fillRect(waveX, this.seaLevelY + 5 + Math.sin(i*0.4 + Date.now()*0.0015)*2, 15, 3);
            }
        } else {
            // Draw the sea image layer
            seaLayer.draw(context, 1.0); // Draw sea image normally
        }
    }
} // End of Background class