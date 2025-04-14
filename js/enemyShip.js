import { Enemy } from "./enemy.js";
import { randomInt } from "./utils.js";

export class EnemyShip extends Enemy {
  constructor(game, speedBoost = 0) {
    super(game); // Calls base Enemy constructor
    this.width = 80;
    this.height = 40;

    // this.speedX = randomInt(1, 2) + speedBoost;
    this.enemyType = "ship"; // Set type

    // --- >>> ADJUST Y POSITION CALCULATION <<< ---
    // Ensure seaLevelY exists in game object (default if missing for safety)
    const seaLevel =
      game.seaLevelY !== undefined ? game.seaLevelY : game.height * 0.5; // Default to 50% if undefined

    // Calculate the vertical space available for the sea
    const availableSeaHeight = game.height - seaLevel;

    // Calculate the maximum random offset within the sea, ensuring the ship fits
    // Subtract ship height and a small padding (e.g., 10px) from the bottom
    const maxSpawnOffset = availableSeaHeight - this.height - 10;

    // Ensure the offset isn't negative if the sea area is too small for the ship
    const safeMaxSpawnOffset = Math.max(0, maxSpawnOffset);

    // Calculate a random vertical position within the allowed sea area
    const randomOffset = Math.random() * safeMaxSpawnOffset;

    // Set the final Y position: sea level + random offset
    this.y = seaLevel + randomOffset;
    // --- >>> END ADJUST Y POSITION <<< ---

    // --- Movement ---
    this.speedX =
      (1 + Math.random() * 0.5 + speedBoost) * (Math.random() < 0.5 ? 1 : 0.8); // Move left, some speed variation
    this.x = this.game.width; // Start off-screen right

    // --- Set Health HERE ---
    this.maxHealth = 5; // Max health for basic ship
    this.health = this.maxHealth;
    // --- End Health ---

    this.scoreValue = 50;
    this.color = "darkslategray";
    this.deckColor = "slategray";
    this.detailColor = "gray";

    console.log(
      `EnemyShip ${this.id} constructed. Health: ${this.health}/${this.maxHealth}`
    ); // Log health here
  } // End Constructor

  // Make sure update receives deltaTime
  update(deltaTime) {
    const safeDeltaTime = Math.max(0.1, deltaTime);
    const deltaScale = safeDeltaTime / 16.67;

    // --- Horizontal Movement ---
    this.x -= this.speedX * deltaScale; // Scale speed
    if (this.x + this.width < 0) {
      this.markedForDeletion = true;
      return; // Exit early
    }

    // Ships typically don't have vertical movement here

    // --- Hit Flash Update ---
    if (this.isHit) {
      this.hitTimer -= safeDeltaTime; // Use raw delta for timers
      if (this.hitTimer <= 0) {
        this.isHit = false;
      }
    }
  } // End of EnemyShip update

  // --- >>> UPDATED hit Method <<< ---
  hit(damage = 1, projectileType = "bullet") {
    if (this.markedForDeletion) return; // Skip if already dying

    // --- Calculate Effective Damage Based on Projectile Type ---
    let effectiveDamage = damage; // Start with the projectile's base damage
    let resistanceFactor = 1.0; // 1.0 = no change, < 1.0 = resistance, > 1.0 = vulnerability

    if (projectileType === "bomb") {
      // Bombs are fully effective (or maybe even bonus damage?)
      resistanceFactor = 1.0; // Example: 100% effective
      // console.log(` -> Ship Hit by BOMB: Applying ${resistanceFactor}x damage factor.`);
    } else if (projectileType === "bullet") {
      // Bullets are less effective against ship armor
      resistanceFactor = 0.25; // Example: Bullets only do 25% of their base damage
      // console.log(` -> Ship Hit by BULLET: Applying ${resistanceFactor}x damage factor.`);
    } else {
      // Handle potential other types if needed, otherwise default
      // console.log(` -> Ship Hit by UNKNOWN type '${projectileType}': Applying default 1.0x damage factor.`);
    }

    effectiveDamage *= resistanceFactor;

    // Optional: Ensure minimum damage is dealt unless resistance is 100%
    // if (effectiveDamage < 0.1 && resistanceFactor < 1.0) {
    //     effectiveDamage = 0.1;
    // }
    // Ensure damage is not negative
    effectiveDamage = Math.max(0, effectiveDamage);

    // --- Call the BASE Enemy.hit method ---
    // Pass the *calculated* effective damage. The base method handles:
    // - Reducing health (`this.health -= effectiveDamage`)
    // - Setting hit flash (`this.isHit = true`, `this.hitTimer = ...`)
    // - Checking if health <= 0 and setting `this.markedForDeletion`
    // - Triggering explosion/sound via `this.destroy()` if markedForDeletion
    // - Adding score via `this.destroy()`
    super.hit(effectiveDamage, projectileType); // <<< Use super.hit()

    // console.log(`   -> Ship health after super.hit: ${this.health.toFixed(1)}`); // Optional check
  } // --- >>> END UPDATED hit Method <<< ---

  // Overriding draw completely, need hit flash logic wrapper here
  draw(context) {
    // Don't draw if marked for deletion
    if (this.markedForDeletion) return;

    context.save(); // Save context state for potential hit flash changes

    // Determine main fill color based on hit state
    const currentHullColor = this.isHit ? "white" : this.color;
    const currentDeckColor = this.isHit ? "white" : this.deckColor;
    const currentDetailColor = this.isHit ? "white" : this.detailColor;

    // --- Draw Custom Ship Shape ---
    // Hull
    context.fillStyle = currentHullColor;
    context.fillRect(
      this.x,
      this.y + this.height * 0.3,
      this.width,
      this.height * 0.7
    );
    // Deck/Superstructure
    context.fillStyle = currentDeckColor;
    context.fillRect(
      this.x + this.width * 0.2,
      this.y,
      this.width * 0.6,
      this.height * 0.4
    );
    // Small turret/detail
    context.fillStyle = currentDetailColor;
    context.fillRect(
      this.x + this.width * 0.45,
      this.y - this.height * 0.1,
      this.width * 0.1,
      this.height * 0.2
    );
    // --- End Custom Shape ---

    context.restore(); // Restore original context state (like fillStyle)

    // --- Call Base Draw Method (which now ONLY draws health bar) ---
    super.draw(context); // <<< This calls Enemy.draw() to draw the health bar
  }
}
