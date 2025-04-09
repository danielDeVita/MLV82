// js/utils.js

/**
 * Simple Axis-Aligned Bounding Box (AABB) collision detection.
 * Checks if two rectangles overlap.
 * @param {object} rect1 - First rectangle with x, y, width, height properties.
 * @param {object} rect2 - Second rectangle with x, y, width, height properties.
 * @returns {boolean} True if the rectangles collide, false otherwise.
 */
export function checkCollision(rect1, rect2) {
  // Check for invalid inputs (optional but good practice)
  if (!rect1 || !rect2 || rect1.x === undefined || rect1.y === undefined || rect1.width === undefined || rect1.height === undefined ||
    rect2.x === undefined || rect2.y === undefined || rect2.width === undefined || rect2.height === undefined) {
    console.warn("Invalid input to checkCollision:", rect1, rect2);
    return false;
  }
  return (
    rect1.x < rect2.x + rect2.width &&
    rect1.x + rect1.width > rect2.x &&
    rect1.y < rect2.y + rect2.height &&
    rect1.y + rect1.height > rect2.y
  );
}

/**
* Generates a random integer between min (inclusive) and max (inclusive).
* @param {number} min - The minimum possible integer.
* @param {number} max - The maximum possible integer.
* @returns {number} A random integer within the specified range.
*/
export function randomInt(min, max) {
  // Ensure min/max are valid numbers
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
* Linearly interpolates between two numbers.
* @param {number} start - The starting value.
* @param {number} end - The ending value.
* @param {number} amount - The interpolation factor (0.0 to 1.0). Clamped internally.
* @returns {number} The interpolated value.
*/
export function lerp(start, end, amount) {
  amount = Math.max(0, Math.min(1, amount)); // Clamp amount to 0-1 range
  return start + (end - start) * amount;
}

/**
* Linearly interpolates between two hex colors.
* @param {string} hexColor1 - The starting hex color string (e.g., "#RRGGBB").
* @param {string} hexColor2 - The ending hex color string (e.g., "#RRGGBB").
* @param {number} amount - The interpolation factor (0.0 to 1.0).
* @returns {string} The interpolated hex color string. Returns hexColor1 on error.
*/
export function lerpColor(hexColor1, hexColor2, amount) {
  try {
    // Ensure inputs are valid hex strings
    if (!/^#[0-9A-F]{6}$/i.test(hexColor1) || !/^#[0-9A-F]{6}$/i.test(hexColor2)) {
      throw new Error(`Invalid hex color format: ${hexColor1}, ${hexColor2}`);
    }

    const r1 = parseInt(hexColor1.slice(1, 3), 16);
    const g1 = parseInt(hexColor1.slice(3, 5), 16);
    const b1 = parseInt(hexColor1.slice(5, 7), 16);

    const r2 = parseInt(hexColor2.slice(1, 3), 16);
    const g2 = parseInt(hexColor2.slice(3, 5), 16);
    const b2 = parseInt(hexColor2.slice(5, 7), 16);

    // Lerp each color component
    const r = Math.round(lerp(r1, r2, amount));
    const g = Math.round(lerp(g1, g2, amount));
    const b = Math.round(lerp(b1, b2, amount));

    // Convert back to hex, ensuring padding with '0' if needed
    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  } catch (e) {
    console.error("Error in lerpColor:", e);
    return hexColor1; // Return the starting color as a fallback
  }
}