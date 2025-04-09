const gameArea = document.getElementById('game-area');
const playerElement = document.getElementById('player');

// Game State
const gameState = {
    player: {
        x: 50, // Initial X position (matches CSS)
        y: 285, // Initial Y position (matches CSS)
        width: 50, // Matches CSS
        height: 30, // Matches CSS
        speed: 5,
        element: playerElement
    },
    keysPressed: {}, // Track currently pressed keys
    bullets: [],     // Array to hold active bullets
    enemies: [],     // Array to hold active enemies
    gameAreaWidth: gameArea.offsetWidth,
    gameAreaHeight: gameArea.offsetHeight,
    enemySpawnInterval: 2000, // Spawn enemy every 2 seconds (milliseconds)
    lastEnemySpawnTime: 0,
    bulletIdCounter: 0, // Simple way to give unique IDs to bullet elements
    enemyIdCounter: 0   // Simple way to give unique IDs to enemy elements
};

// --- Input Handling ---
window.addEventListener('keydown', (event) => {
    gameState.keysPressed[event.key.toLowerCase()] = true;
    // Prevent default browser action for arrow keys and space
    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(event.key.toLowerCase())) {
        event.preventDefault();
    }
});

window.addEventListener('keyup', (event) => {
    gameState.keysPressed[event.key.toLowerCase()] = false;
});

// --- Game Loop ---
function gameLoop(timestamp) {
    update(timestamp); // Update game state
    render();      // Draw everything based on state
    requestAnimationFrame(gameLoop); // Request next frame
}

// --- Update Function ---
function update(timestamp) {
    movePlayer();
    moveBullets();
    moveEnemies();
    checkCollisions();
    spawnEnemies(timestamp);
    cleanup(); // Remove off-screen elements
}

// --- Render Function ---
function render() {
    // Update player position
    gameState.player.element.style.left = gameState.player.x + 'px';
    gameState.player.element.style.top = gameState.player.y + 'px';

    // Update bullet positions
    gameState.bullets.forEach(bullet => {
        bullet.element.style.left = bullet.x + 'px';
        bullet.element.style.top = bullet.y + 'px';
    });

     // Update enemy positions
     gameState.enemies.forEach(enemy => {
        enemy.element.style.left = enemy.x + 'px';
        enemy.element.style.top = enemy.y + 'px';
    });
}

function movePlayer() {
    const player = gameState.player;
    const keys = gameState.keysPressed;

    if (keys['arrowup'] || keys['w']) {
        player.y -= player.speed;
    }
    if (keys['arrowdown'] || keys['s']) {
        player.y += player.speed;
    }
    if (keys['arrowleft'] || keys['a']) {
        player.x -= player.speed;
    }
    if (keys['arrowright'] || keys['d']) {
        player.x += player.speed;
    }

    // Boundary checks - keep player within game area
    if (player.x < 0) {
        player.x = 0;
    }
    if (player.x + player.width > gameState.gameAreaWidth) {
        player.x = gameState.gameAreaWidth - player.width;
    }
    if (player.y < 0) {
        player.y = 0;
    }
    if (player.y + player.height > gameState.gameAreaHeight) {
        player.y = gameState.gameAreaHeight - player.height;
    }
}

function shoot() {
    const player = gameState.player;
    const bulletId = 'bullet-' + gameState.bulletIdCounter++;

    // Create bullet state object
    const newBullet = {
        id: bulletId,
        x: player.x + player.width, // Start at the front-right of the plane
        y: player.y + player.height / 2 - 2, // Center vertically (-2 because bullet height is 4)
        width: 10, // Matches CSS
        height: 4,  // Matches CSS
        speed: 8,
        element: null // Will create DOM element next
    };

    // Create bullet HTML element
    const bulletElement = document.createElement('div');
    bulletElement.id = bulletId;
    bulletElement.className = 'bullet';
    bulletElement.style.left = newBullet.x + 'px';
    bulletElement.style.top = newBullet.y + 'px';

    newBullet.element = bulletElement; // Assign element to state object
    gameState.bullets.push(newBullet); // Add to active bullets
    gameArea.appendChild(bulletElement); // Add to the game area in HTML
}

function moveBullets() {
    gameState.bullets.forEach(bullet => {
        bullet.x += bullet.speed;
    });
}

// Modify the 'keydown' event listener slightly to call shoot:
window.addEventListener('keydown', (event) => {
    const key = event.key.toLowerCase();
    gameState.keysPressed[key] = true;

    // Shoot on space press (only trigger once per press)
    // We check if it *wasn't* pressed before this event
    if (key === ' ' && !gameState.keysPressed[' ']) {
         // This logic inside keydown ensures it fires only once per press start
         // But for rapid fire, we might want a cooldown instead.
         // For simplicity now, let's allow rapid fire if held:
         // We'll handle the actual shooting in the update loop if space is held
    }


    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
        event.preventDefault();
    }
});

// Modify update function to check for shooting key
 function update(timestamp) {
    movePlayer();
    // Check for shooting input here
    if (gameState.keysPressed[' ']) {
         // Add a simple cooldown or rapid fire limit if desired
         // For now, shoot every frame space is held (very fast!)
         // A better way: add a 'lastShotTime' and check timestamp
         shoot();
    }
    moveBullets();
    moveEnemies();
    checkCollisions();
    spawnEnemies(timestamp);
    cleanup();
}

function spawnEnemies(timestamp) {
    // Check if enough time has passed since the last spawn
    if (timestamp - gameState.lastEnemySpawnTime > gameState.enemySpawnInterval) {
        gameState.lastEnemySpawnTime = timestamp; // Reset timer

        const enemyId = 'enemy-' + gameState.enemyIdCounter++;
        const enemyWidth = 50; // Match CSS
        const enemyHeight = 30; // Match CSS

        // Create enemy state object
        const newEnemy = {
            id: enemyId,
            x: gameState.gameAreaWidth, // Start just off-screen right
            y: Math.random() * (gameState.gameAreaHeight - enemyHeight), // Random vertical position
            width: enemyWidth,
            height: enemyHeight,
            speed: 2 + Math.random() * 2, // Random speed between 2 and 4
            element: null
        };

        // Create enemy HTML element
        const enemyElement = document.createElement('div');
        enemyElement.id = enemyId;
        enemyElement.className = 'enemy plane'; // Use plane class for styling
        enemyElement.style.left = newEnemy.x + 'px';
        enemyElement.style.top = newEnemy.y + 'px';
        // Maybe give enemies a different color via inline style or another class
        // enemyElement.style.backgroundColor = 'darkgray'; // Already set in .enemy CSS

        newEnemy.element = enemyElement;
        gameState.enemies.push(newEnemy);
        gameArea.appendChild(enemyElement);
    }
}

function moveEnemies() {
    gameState.enemies.forEach(enemy => {
        enemy.x -= enemy.speed; // Move left
    });
}

// Simple Axis-Aligned Bounding Box (AABB) collision detection
function checkCollision(rect1, rect2) {
    return (
        rect1.x < rect2.x + rect2.width &&
        rect1.x + rect1.width > rect2.x &&
        rect1.y < rect2.y + rect2.height &&
        rect1.y + rect1.height > rect2.y
    );
}

function checkCollisions() {
    const bulletsToRemove = [];
    const enemiesToRemove = [];

    gameState.bullets.forEach((bullet, bulletIndex) => {
        gameState.enemies.forEach((enemy, enemyIndex) => {
            // Avoid checking against already marked-for-removal items
            if (bulletsToRemove.includes(bullet.id) || enemiesToRemove.includes(enemy.id)) {
                return;
            }

            if (checkCollision(bullet, enemy)) {
                console.log(`Collision between ${bullet.id} and ${enemy.id}`);
                // Mark for removal instead of removing directly while iterating
                if (!bulletsToRemove.includes(bullet.id)) {
                     bulletsToRemove.push(bullet.id);
                }
                 if (!enemiesToRemove.includes(enemy.id)) {
                     enemiesToRemove.push(enemy.id);
                }
                // Optional: Add score, explosion effect later
            }
        });
    });

     // Now remove the marked items from DOM and gameState
    bulletsToRemove.forEach(id => {
        const index = gameState.bullets.findIndex(b => b.id === id);
        if (index > -1) {
            gameState.bullets[index].element.remove(); // Remove from DOM
            gameState.bullets.splice(index, 1); // Remove from array
        }
    });

    enemiesToRemove.forEach(id => {
        const index = gameState.enemies.findIndex(e => e.id === id);
        if (index > -1) {
            gameState.enemies[index].element.remove(); // Remove from DOM
            gameState.enemies.splice(index, 1); // Remove from array
        }
    });


    // Optional: Check Player-Enemy Collision (Game Over condition)
    // gameState.enemies.forEach(enemy => {
    //     if (checkCollision(gameState.player, enemy)) {
    //         console.log("Game Over!");
    //         // Handle game over (e.g., stop loop, show message)
    //     }
    // });
}


// Add a cleanup section for bullets going off screen
function cleanup() {
    // Remove bullets that are off-screen
    gameState.bullets = gameState.bullets.filter(bullet => {
        if (bullet.x > gameState.gameAreaWidth) {
            bullet.element.remove(); // Remove from DOM
            return false; // Remove from array
        }
        return true; // Keep in array
    });

    // Remove enemies that are off-screen (to be added later)
    gameState.enemies = gameState.enemies.filter(enemy => {
         if (enemy.x + enemy.width < 0) { // Off screen left
            enemy.element.remove(); // Remove from DOM
            return false; // Remove from array
        }
        return true; // Keep in array
    });
}

// --- Start the Game ---
requestAnimationFrame(gameLoop); // Kick off the loop