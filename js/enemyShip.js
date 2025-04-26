import { Enemy } from "./enemy.js";
import { randomInt } from "./utils.js";

export class EnemyShip extends Enemy {
  constructor(game, speedBoost = 0) {
    super(game); // Calls base Enemy constructor

    // --- >>> Sprite Dimensions & Scaling <<< ---
    this.spriteWidth = 240; // <<< ACTUAL width of png
    this.spriteHeight = 105; // <<< ACTUAL height of png
    this.scale = 1.0; // Start with no scaling for base ship
    // --- Gameplay dimensions based on sprite and scale ---
    this.width = this.spriteWidth * this.scale;
    this.height = this.spriteHeight * this.scale;
    // --- End Dimensions ---
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
    // this.color = "darkslategray";
    // this.deckColor = "slategray";
    // this.detailColor = "gray";

    // --- >>> Load Sprite <<< ---
    this.image = new Image();
    this.image.src = "images/baseShip240x105.png"; // <<< YOUR FILENAME HERE
    // --- >>> END Load Sprite <<< ---

    // --- Animation State (Initialize for static sprite) ---
    this.frameX = 0;
    this.frameY = 0;
    this.maxFrame = 0;
    this.fps = 10;
    this.frameTimer = 0;
    this.frameInterval = 1000 / this.fps;
    // --- END Animation State ---
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
    } else if (projectileType === "bullet") {
      // Bullets are less effective against ship armor
      resistanceFactor = 0.25; // Example: Bullets only do 25% of their base damage
    } else {
      // Handle potential other types if needed, otherwise default
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
  } // --- >>> END UPDATED hit Method <<< ---

  // Overriding draw completely, need hit flash logic wrapper here
  draw(context) {
    // Don't draw if marked for deletion
    if (!context || this.markedForDeletion) return;
    context.save();

    // --- Hit Flash Effect (Simple Flicker) ---
    let shouldDraw = true;
    if (this.isHit) {
      // Reduce flicker chance for larger sprites?
      if (Math.random() < 0.4) {
        shouldDraw = false;
      }
    }

    // --- Draw Sprite ---
    if (shouldDraw && this.image?.complete && this.image.naturalWidth > 0) {
      context.drawImage(
        this.image,
        this.frameX * this.spriteWidth, // Src X (0 for static)
        this.frameY * this.spriteHeight, // Src Y (0 for static)
        this.spriteWidth, // Src W (actual sprite width)
        this.spriteHeight, // Src H (actual sprite height)
        this.x, // Dest X
        this.y, // Dest Y
        this.width, // Dest W (scaled width)
        this.height // Dest H (scaled height)
      );
    } else if (shouldDraw) {
      // Fallback
      context.fillStyle = "darkgrey"; // Fallback color
      context.fillRect(this.x, this.y, this.width, this.height);
    }

    context.restore();

    // --- Draw Health Bar ---
    // Call parent Enemy.draw() AFTER restoring context
    super.draw(context);
  } // --- >>> END Draw Method <<< ---
}
