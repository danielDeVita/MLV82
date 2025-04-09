// js/main.js
import { Game } from './game.js';

window.addEventListener('load', function () {
    console.log("Window loaded. Initializing game..."); // Log 1
    const canvasId = 'gameCanvas';
    const gameWidth = 1280; 
    const gameHeight = 720; 

    try {
        const game = new Game(canvasId, gameWidth, gameHeight);
        console.log("Game instance created. Starting game loop..."); // Log 2
        game.start();
        console.log("game.start() called."); // Log 3
    } catch (error) {
        console.error("Error during game initialization:", error); // Log Error
    }
});