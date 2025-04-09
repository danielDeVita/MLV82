// js/background.js

// Represents a single layer for parallax effect
class BackgroundLayer {
    constructor(imageSrc, speedModifier, gameWidth, gameHeight, yOffset = 0) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.speedModifier = speedModifier;
        this.image = new Image();
        this.image.src = imageSrc;
        this.width = gameWidth; // Assume full width needed
        this.height = gameHeight; // Assume full height needed
        this.x = 0;
        this.y = yOffset;
        this.x2 = this.width;
    }

    // --- CORRECTED: Update now accepts deltaTime ---
    update(baseGameSpeed, deltaTime) {
        const safeDeltaTime = Math.max(0.1, deltaTime);
        const deltaScale = safeDeltaTime / 16.67;

        const effectiveSpeed = baseGameSpeed * this.speedModifier;
        const moveAmount = effectiveSpeed * deltaScale; // Scale move amount

        this.x -= moveAmount;
        this.x2 -= moveAmount;

        // Resetting logic (adjust slightly with moveAmount)
        if (this.x <= -this.width) {
            this.x = this.width + this.x2 - (moveAmount * 0.1); // Use moveAmount for precise reset
        }
        if (this.x2 <= -this.width) {
            this.x2 = this.width + this.x - (moveAmount * 0.1); // Use moveAmount for precise reset
        }
    }

    draw(context) {
        if (!this.image.complete || this.image.naturalWidth === 0) {
            context.fillStyle = 'grey'; // Placeholder
            context.fillRect(this.x, this.y, this.width, this.height);
            context.fillRect(this.x2, this.y, this.width, this.height);
            return;
        }
        context.drawImage(this.image, this.x, this.y, this.width, this.height);
        context.drawImage(this.image, this.x2, this.y, this.width, this.height);
    }
}

// Manages all background layers
export class Background {
    constructor(gameWidth, gameHeight) {
        this.gameWidth = gameWidth;
        this.gameHeight = gameHeight;
        this.baseGameSpeed = 1; // Base speed multiplier

        // Define Layers
        const layer1 = new BackgroundLayer('images/sky.png', 0.1, gameWidth, gameHeight);
        const layer2 = new BackgroundLayer('images/far-clouds.png', 0.3, gameWidth, gameHeight);
        const layer3 = new BackgroundLayer('images/near-clouds.png', 0.6, gameWidth, gameHeight);
        const layer4 = new BackgroundLayer('images/sea.png', 1.0, gameWidth, gameHeight, gameHeight - 100);

        this.layers = [layer1, layer2, layer3, layer4];

        // Fallback drawing properties
        this.drawFallback = true; // Set to false if using real images
        this.seaLevelY = gameHeight - 100;
    }

    // --- CORRECTED: Update now passes deltaTime down ---
    update(deltaTime) {
        this.layers.forEach(layer => {
            layer.update(this.baseGameSpeed, deltaTime); // Pass deltaTime here
        });
    }

    draw(context) {
        // Draw image layers
        this.layers.forEach(layer => {
            layer.draw(context);
        });

        // Draw fallback elements if needed
        if (this.drawFallback) {
            context.fillStyle = 'darkblue'; // Sea
            context.fillRect(0, this.seaLevelY, this.gameWidth, this.gameHeight - this.seaLevelY);
            context.fillStyle = 'white'; // Waves (changed to white)
            for (let i = 0; i < this.gameWidth; i += 20) {
                let waveX = (i - (this.layers[3].x % 40)) % this.gameWidth;
                if (waveX < 0) waveX += this.gameWidth;
                context.fillRect(waveX, this.seaLevelY + 5 + Math.sin(i * 0.5 + Date.now() * 0.002) * 2, 10, 3);
            }
        }
    }
}