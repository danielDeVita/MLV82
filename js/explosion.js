// js/explosion.js
import { playSound } from './audio.js';

export class Explosion {
    constructor(game, x, y, type = 'air') {
        this.game = game;
        this.x = x;
        this.y = y;
        this.type = type;

        const baseRadius = type === 'ground' ? 40 : (type === 'ship' ? 50 : (type === 'tiny' ? 10 : 30));
        this.maxRadius = baseRadius + Math.random() * (baseRadius * 0.2); // Random +/- 10% of base
        this.currentRadius = 0;

        this.speed = (type === 'tiny' ? 2 : 3) + Math.random(); // Slightly variable speed
        this.markedForDeletion = false;

        // Colors
        this.outerColor = 'rgba(255, 165, 0, 0.6)';
        this.innerColor = 'rgba(255, 255, 200, 0.8)';
        if (type === 'ground') { /* Brownish */ this.outerColor = 'rgba(139, 69, 19, 0.6)'; this.innerColor = 'rgba(255, 165, 0, 0.8)'; }
        else if (type === 'ship') { /* Redder */ this.outerColor = 'rgba(255, 0, 0, 0.6)'; this.innerColor = 'rgba(255, 100, 100, 0.8)'; }
        else if (type === 'tiny') { /* Grey/White */ this.outerColor = 'rgba(200, 200, 200, 0.5)'; this.innerColor = 'rgba(255, 255, 255, 0.7)'; }

        // --- Play Sound only for major explosions ---
        if (type !== 'tiny') {
            playSound('explosion');
        }
        console.log(`DEBUG: Explosion created type: ${type}, maxR: ${this.maxRadius.toFixed(1)}, speed: ${this.speed.toFixed(1)}`); // Log creation
    }

    update(deltaTime) {
        const safeDeltaTime = Math.max(0.1, deltaTime);
        const deltaScale = safeDeltaTime / 16.67;

        this.currentRadius += this.speed * deltaScale;
        // --- DEBUG LOG ---
        // console.log(`DEBUG: Explosion update - currentR: ${this.currentRadius.toFixed(1)}, maxR: ${this.maxRadius.toFixed(1)}, marked: ${this.markedForDeletion}`);

        if (!this.markedForDeletion && this.currentRadius >= this.maxRadius) {
            console.log(`DEBUG: Explosion MARKED FOR DELETION - currentR: ${this.currentRadius.toFixed(1)} >= maxR: ${this.maxRadius.toFixed(1)}`); // Log deletion mark
            this.markedForDeletion = true;
        }
    }

    draw(context) {
        // Don't draw if already marked (optional optimization)
        // if (this.markedForDeletion) return;

        context.save();
        const progress = this.currentRadius / this.maxRadius;
        // Make alpha fade faster towards the end
        const overallAlpha = Math.max(0, 1 - (progress * progress)); // Fade quadratically
        context.globalAlpha = overallAlpha;

        // Outer ring
        context.beginPath();
        context.arc(this.x, this.y, this.currentRadius, 0, Math.PI * 2);
        context.fillStyle = this.outerColor;
        context.fill();

        // Inner core
        const innerRadius = this.currentRadius * 0.6;
        if (innerRadius > 3) {
            context.beginPath();
            context.arc(this.x, this.y, innerRadius, 0, Math.PI * 2);
            context.fillStyle = this.innerColor;
            context.fill();
        }

        context.restore();
    }
}