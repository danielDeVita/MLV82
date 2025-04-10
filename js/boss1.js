// js/boss1.js
import { Enemy } from './enemy.js';
import { EnemyBullet } from './enemyBullet.js';
import { TrackingMissile } from './trackingMissile.js';
import { playSound } from './audio.js';
// Optional: Import shooter plane if spawning minions
// import { EnemyShooterPlane } from './enemyShooterPlane.js';

export class Boss1 extends Enemy {
    constructor(game) {
        super(game); // Call base Enemy constructor
        this.id = 'boss_1'; // Specific ID

        // --- Boss Specific Stats ---
        this.width = 200; this.height = 100;
        this.maxHealth = 150; this.health = this.maxHealth;
        this.color = '#444444'; this.detailColor1 = '#cccccc'; this.detailColor2 = '#990000';
        this.scoreValue = 1000; this.enemyType = 'ship';

        // --- Movement ---
        this.targetX = this.game.width - this.width - 50; this.targetY = 100;
        this.speedX = 1.5; this.speedY = 0.5;
        this.driftDirection = 1; this.driftRange = 50;
        this.hasReachedPosition = false;
        this.x = this.game.width; this.y = this.targetY; // Start position

        // --- Attack Patterns ---
        this.attackPhase = 1;
        this.bulletPatternTimer = 0; this.bulletPatternInterval = 1500;
        this.missileTimer = 0; this.missileInterval = 5000;
        this.minionSpawnTimer = 0; this.minionSpawnInterval = 8000;

        // console.log("Boss1 Created!");
    }

    update(deltaTime) {
        const safeDeltaTime = Math.max(0.1, deltaTime);
        const deltaScale = safeDeltaTime / 16.67;

        // Movement logic (move left, then drift)
        if (!this.hasReachedPosition) { /* ... Move left ... */ }
        else { /* ... Drift up/down ... */ }

        // Attack Logic (only when in position)
        if (this.hasReachedPosition) {
            // Phase Transition
            if (this.health <= this.maxHealth * 0.5 && this.attackPhase === 1) { /* ... Transition to phase 2 ... */ }
            // Bullet Pattern
            this.bulletPatternTimer += safeDeltaTime;
            if (this.bulletPatternTimer >= this.bulletPatternInterval) { this.bulletPatternTimer = 0; this.fireBulletPattern(); }
            // Missile Attack
            this.missileTimer += safeDeltaTime;
            if (this.missileTimer >= this.missileInterval) { this.missileTimer = 0; this.fireMissile(); }
            // Phase 2 Minions
            if (this.attackPhase === 2) { this.minionSpawnTimer += safeDeltaTime; if (this.minionSpawnTimer >= this.minionSpawnInterval) { this.minionSpawnTimer = 0; this.spawnMinion(); } }
        }

        // Hit Flash Update
        if (this.isHit) { this.hitTimer -= safeDeltaTime; if (this.hitTimer <= 0) { this.isHit = false; } }
    }

    fireBulletPattern() { /* ... fires multiple EnemyBullets ... */ }
    fireMissile() { /* ... fires TrackingMissile ... */ }
    spawnMinion() { /* ... placeholder/implementation for spawning other enemies ... */ }

    // Override base hit logic
    hit(damage, projectileType = 'bullet') {
        let actualDamage = damage;
        if (projectileType === 'bullet') {
            actualDamage = Math.ceil(damage * 0.5); // Bullets do half damage
        }
        // console.log(`Boss1 Hit: Type=${projectileType}, OriginalDmg=${damage}, ActualDmg=${actualDamage}, CurrentHealth=${this.health}`);

        // --- Explicitly call the BASE Enemy class's hit method ---
        // Use .call(this, ...) to ensure 'this' inside Enemy.hit refers to the Boss1 instance
        Enemy.prototype.hit.call(this, actualDamage);

        // console.log(`Boss1 Hit: Health after super call = ${this.health}`);
    }

    draw(context) {
        if (this.markedForDeletion || !context) return; // Added context check
        context.save();
        // Hit Flash
        if (this.isHit) { context.globalAlpha = 0.7; context.fillStyle = 'white'; context.fillRect(this.x - 5, this.y - 5 - 15, this.width + 10, this.height + 10 + 15); context.globalAlpha = 1.0; }
        // Draw Boss Shape
        context.fillStyle = this.color; context.fillRect(this.x, this.y + 20, this.width, this.height - 20);
        context.fillStyle = this.detailColor1; context.fillRect(this.x + 30, this.y, this.width - 60, this.height - 10);
        context.fillStyle = this.color; context.fillRect(this.x + this.width * 0.6, this.y - 15, 50, 30);
        context.fillStyle = this.detailColor2; context.fillRect(this.x + 10, this.y + this.height * 0.4, 20, 10); context.fillRect(this.x + this.width - 30, this.y + this.height * 0.4, 20, 10);
        context.restore();
        // Draw Health Bar (using base class draw)
        super.draw(context);
    }
}