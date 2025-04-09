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
        this.width = 200;
        this.height = 100;
        this.maxHealth = 150;
        this.health = this.maxHealth;
        this.color = '#444444';
        this.detailColor1 = '#cccccc';
        this.detailColor2 = '#990000';
        this.scoreValue = 1000;
        this.enemyType = 'ship'; // Use ship explosion/hit rules

        // --- Movement ---
        this.targetX = this.game.width - this.width - 50;
        this.targetY = 100;
        this.speedX = 1.5;
        this.speedY = 0.5;
        this.driftDirection = 1;
        this.driftRange = 50;
        this.hasReachedPosition = false;
        this.x = this.game.width; // Start off-screen right
        this.y = this.targetY; // Start at target Y

        // --- Attack Patterns ---
        this.attackPhase = 1;
        this.bulletPatternTimer = 0;
        this.bulletPatternInterval = 1500;
        this.missileTimer = 0;
        this.missileInterval = 5000;
        this.minionSpawnTimer = 0;
        this.minionSpawnInterval = 8000;

        console.log("Boss1 Created!");
    }

    update(deltaTime) {
        const safeDeltaTime = Math.max(0.1, deltaTime);
        const deltaScale = safeDeltaTime / 16.67;

        // --- Movement ---
        if (!this.hasReachedPosition) {
            this.x -= this.speedX * deltaScale;
            if (this.x <= this.targetX) {
                this.x = this.targetX;
                this.hasReachedPosition = true;
                console.log("Boss1 Reached Position");
            }
        } else {
            // Drift
            this.y += this.speedY * this.driftDirection * deltaScale;
            if (this.y <= this.targetY - this.driftRange) { this.y = this.targetY - this.driftRange; this.driftDirection = 1; }
            else if (this.y >= this.targetY + this.driftRange) { this.y = this.targetY + this.driftRange; this.driftDirection = -1; }
        }

        // --- Attack Logic ---
        if (this.hasReachedPosition) {
            // Phase Transition
            if (this.health <= this.maxHealth * 0.5 && this.attackPhase === 1) {
                 console.log("Boss1 Entering Phase 2!");
                 this.attackPhase = 2;
                 this.bulletPatternInterval = 1000; // Faster bullets
                 this.missileInterval = 3500;    // Faster missiles
            }

            // Attacks (Timers incremented by raw delta)
            this.bulletPatternTimer += safeDeltaTime;
            if (this.bulletPatternTimer >= this.bulletPatternInterval) { this.bulletPatternTimer = 0; this.fireBulletPattern(); }

            this.missileTimer += safeDeltaTime;
            if (this.missileTimer >= this.missileInterval) { this.missileTimer = 0; this.fireMissile(); }

            if (this.attackPhase === 2) {
                this.minionSpawnTimer += safeDeltaTime;
                if (this.minionSpawnTimer >= this.minionSpawnInterval) { this.minionSpawnTimer = 0; this.spawnMinion(); }
            }
        }

        // --- Hit Flash Update ---
        if (this.isHit) { this.hitTimer -= safeDeltaTime; if (this.hitTimer <= 0) { this.isHit = false; } }
    }

    fireBulletPattern() {
        // console.log("Boss1 firing bullet pattern");
        playSound('enemyShoot');
        const bulletSpeedX = -5; const yOffset = this.height * 0.3;
        const bulletYCenter = this.y + this.height / 2 - 4; // Adjust for bullet height
        const bulletXOrigin = this.x; // Fire from front edge

        this.game.addEnemyProjectile(new EnemyBullet(this.game, bulletXOrigin, bulletYCenter, bulletSpeedX, 0));
        this.game.addEnemyProjectile(new EnemyBullet(this.game, bulletXOrigin, bulletYCenter - yOffset, bulletSpeedX, -0.5));
        this.game.addEnemyProjectile(new EnemyBullet(this.game, bulletXOrigin, bulletYCenter + yOffset, bulletSpeedX, 0.5));
         if (this.attackPhase === 2) {
              this.game.addEnemyProjectile(new EnemyBullet(this.game, this.x + 20, this.y + 10, bulletSpeedX * 1.2, -0.2)); // Slightly faster side bullets
              this.game.addEnemyProjectile(new EnemyBullet(this.game, this.x + 20, this.y + this.height - 10, bulletSpeedX * 1.2, 0.2));
         }
    }

    fireMissile() {
         // console.log("Boss1 firing missile");
         const missileX = this.x - 10; // Fire slightly in front
         const missileY = this.y + this.height / 2 - 5; // Center Y adjust for missile height
         this.game.addEnemyProjectile(new TrackingMissile(this.game, missileX, missileY));
    }

    spawnMinion() {
         console.warn("Boss1 spawnMinion() called, but minion spawning requires EnemyShooterPlane import and potentially constructor adjustments.");
        // Example (Needs EnemyShooterPlane import & potentially updated constructor):
        // const minionX = this.x + this.width / 2;
        // const minionY = this.y + this.height / 2;
        // this.game.enemies.push(new EnemyShooterPlane(this.game, 0, minionX, minionY));
    }

    // Override base hit logic for different vulnerability
    hit(damage, projectileType = 'bullet') {
        let actualDamage = damage;
        if (projectileType === 'bullet') {
            actualDamage = Math.ceil(damage * 0.5); // Bullets do half damage
             // console.log(`Boss1 Hit: Bullet damage reduced to ${actualDamage}`);
        } else {
             // console.log(`Boss1 Hit: Bomb damage ${actualDamage}`);
        }
        // Call the ORIGINAL base class hit method from Enemy.js
        // using 'super' which refers to the parent class (Enemy)
        Enemy.prototype.hit.call(this, actualDamage); // Explicitly call Enemy's hit
        // Note: Don't use super.hit() if EnemyShip also overrides hit, call Enemy's directly
    }

    draw(context) {
        if (this.markedForDeletion) return;
        context.save();
        if (this.isHit) { context.globalAlpha = 0.7; context.fillStyle = 'white'; context.fillRect(this.x - 5, this.y - 5 - 15, this.width + 10, this.height + 10 + 15); context.globalAlpha = 1.0; } // Adjust flash Y for turret

        // Draw Boss Shape
        context.fillStyle = this.color;
        context.fillRect(this.x, this.y + 20, this.width, this.height - 20);
        context.fillStyle = this.detailColor1;
        context.fillRect(this.x + 30, this.y, this.width - 60, this.height - 10);
        context.fillStyle = this.color;
        context.fillRect(this.x + this.width * 0.6, this.y - 15, 50, 30); // Bridge
        context.fillStyle = this.detailColor2;
        context.fillRect(this.x + 10, this.y + this.height * 0.4, 20, 10); // Red detail 1
        context.fillRect(this.x + this.width - 30, this.y + this.height * 0.4, 20, 10); // Red detail 2
        context.restore();

        // Draw Health Bar using base class method
        super.draw(context); // Calls Enemy.draw()
    }
}