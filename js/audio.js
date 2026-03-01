import { SOUND_ALIASES, SOUND_DEFS } from "./audioMap.js";

const sounds = {};
let isMuted = false;
const warnedUnknownKeys = new Set();
const warnedMissingFiles = new Set();

function warnOnce(warnedSet, key, message) {
  if (warnedSet.has(key)) return;
  warnedSet.add(key);
  console.warn(message);
}

function createAudio(fileName, volume = 0.5, soundKey = fileName) {
  const path = `sounds/${fileName}.wav`;
  try {
    if (typeof Audio !== "undefined") {
      const audio = new Audio();
      audio.volume = volume;
      audio.src = path;

      audio.onerror = () => {
        warnOnce(
          warnedMissingFiles,
          soundKey,
          `Error loading sound for key "${soundKey}": ${path}`
        );
      };
      return audio;
    }
  } catch (e) {
    console.error(
      `Could not create audio element for "${soundKey}" (${path}). Error:`,
      e
    );
  }
  warnOnce(
    warnedMissingFiles,
    soundKey,
    `Using placeholder for sound "${soundKey}" (${path})`
  );
  return {
    play: () => {},
    currentTime: 0,
    volume: volume,
    src: path,
    isPlaceholder: true,
  };
}

function resolveSoundKey(name) {
  if (typeof name !== "string" || !name) return null;
  return SOUND_ALIASES[name] || name;
}

export function loadSounds() {
  Object.keys(sounds).forEach((key) => {
    delete sounds[key];
  });

  Object.entries(SOUND_DEFS).forEach(([key, def]) => {
    sounds[key] = createAudio(def.file, def.volume, key);
  });
}

export function playSound(name) {
  if (isMuted) return;
  const resolvedKey = resolveSoundKey(name);
  if (!resolvedKey) return;

  const sound = sounds[resolvedKey];
  if (!sound) {
    warnOnce(
      warnedUnknownKeys,
      String(name),
      `Unknown sound key "${name}" (resolved as "${resolvedKey}").`
    );
    return;
  }

  if (!sound.isPlaceholder && sound instanceof Audio) {
    sound.currentTime = 0;
    sound.play().catch(() => {
      // Playback can fail before first user interaction. Ignore silently.
    });
  }
}
loadSounds();
