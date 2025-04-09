// Base class for things the player shoots/drops
export class Projectile {
    constructor(game, x, y) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.width = 10; // Default size, override in subclasses
        this.height = 4; // Default size, override in subclasses
        this.speed = 5;  // Default speed, override in subclasses
        this.markedForDeletion = false;
        this.color = 'yellow'; // Default color
    }

    update() {
        // Movement logic implemented in subclasses (Bullet, Bomb)
        // Check bounds
        if (this.x > this.game.width || this.x < 0 || this.y > this.game.height || this.y < 0) {
            this.markedForDeletion = true;
        }
    }

    draw(context) {
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y, this.width, this.height);
    }
}