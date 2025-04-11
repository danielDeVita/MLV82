// js/audio.js - Should be the same as the last full version provided
const sounds = {};
let isMuted = false;

function createAudio(name, volume = 0.5) {
    const path = `sounds/${name}.wav`;
    try {
        if (typeof Audio !== 'undefined') {
            const audio = new Audio();
            audio.volume = volume;
            audio.src = path;
            // console.log(`Attempting to load sound: ${path}`);
            audio.onerror = () => { console.error(`Error loading sound: ${path}.`); };
            return audio;
        }
    } catch (e) { console.error(`Could not create audio element for ${name} (${path}). Error:`, e); }
    console.warn(`Using placeholder for sound: ${name}`);
    return { play: () => { }, currentTime: 0, volume: volume, src: path, isPlaceholder: true };
}

export function loadSounds() {
    console.log("--- Loading Sounds ---");
    sounds.shoot = createAudio('shoot', 0.3);
    sounds.bomb = createAudio('bomb_drop', 0.5);
    sounds.explosion = createAudio('explosion', 0.4);
    sounds.powerup = createAudio('powerup', 0.5);
    sounds.gameOver = createAudio('game_over', 0.6);
    sounds.hit = createAudio('hit', 0.5);
    sounds.enemyShoot = createAudio('enemy_shoot', 0.2);
    sounds.missileLaunch = createAudio('missile_launch', 0.4);
    sounds.shieldUp = createAudio('shield_up', 0.5);
    sounds.shieldDown = createAudio('shield_down', 0.5);
    sounds.extraLife = createAudio('extra_life', 0.6);
    sounds.powerupExpire = createAudio('powerup_expire', 0.3);
    sounds.rapidFirePickup = createAudio('powerup', 0.5); // Reuse or use specific sound
    sounds.invinciblePickup = createAudio('shield_up', 0.5); // Reuse or use specific sound
    console.log("--- Sound Loading Complete ---");
}

export function playSound(name) {
    if (isMuted) return;
    const sound = sounds[name];
    if (sound) {
        if (!sound.isPlaceholder && sound instanceof Audio) {
            sound.currentTime = 0;
            sound.play().catch(e => { /* ... error handling ... */ });
        } // else if (sound.isPlaceholder) { console.warn(`Attempted to play placeholder sound: ${name}`); }
        // else { console.error(`Sound object '${name}' is invalid.`); }
    } // else { console.warn(`Sound not found: ${name}`); }
}
loadSounds();