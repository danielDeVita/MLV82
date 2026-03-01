let debugEnabled = false;

try {
  if (typeof window !== "undefined" && window.localStorage) {
    debugEnabled = window.localStorage.getItem("mlv82_debug") === "1";
  }
} catch {
  debugEnabled = false;
}

export function setDebugEnabled(enabled) {
  debugEnabled = Boolean(enabled);
}

export function isDebugEnabled() {
  return debugEnabled;
}

export function debugLog(...args) {
  if (!debugEnabled) return;
  console.log(...args);
}

export function debugWarn(...args) {
  if (!debugEnabled) return;
  console.warn(...args);
}

