#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const root = process.cwd();

function run(cmd, args) {
  const result = spawnSync(cmd, args, {
    cwd: root,
    encoding: "utf8",
    stdio: "pipe",
  });
  return result;
}

function mustPass(label, cmd, args) {
  const result = run(cmd, args);
  if (result.status !== 0) {
    console.error(`[FAIL] ${label}`);
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    process.exit(1);
  }
  console.log(`[OK] ${label}`);
}

function assertIncludes(filePath, pattern, label) {
  const absPath = path.join(root, filePath);
  const content = fs.readFileSync(absPath, "utf8");
  if (!content.includes(pattern)) {
    console.error(`[FAIL] ${label}: missing "${pattern}" in ${filePath}`);
    process.exit(1);
  }
  console.log(`[OK] ${label}`);
}

function main() {
  console.log("Running smoke regression checks...");

  mustPass("sound key consistency", "node", ["scripts/check-sound-keys.js"]);

  const syntaxFiles = [
    "js/game.js",
    "js/gameBossFlow.js",
    "js/gameSpawning.js",
    "js/gameCombat.js",
    "js/gameStateUi.js",
    "js/gamePowerups.js",
    "js/input.js",
    "js/debug.js",
    "js/boss1.js",
    "js/boss2.js",
    "js/boss3.js",
    "js/boss3Plane.js",
    "js/boss3Ship.js",
    "js/player.js",
    "js/background.js",
  ];
  for (const file of syntaxFiles) {
    mustPass(`syntax ${file}`, "node", ["--check", file]);
  }

  // Guardrails for async timer safety across restarts.
  const timerFiles = [
    "js/gameBossFlow.js",
    "js/boss1.js",
    "js/boss2.js",
    "js/boss3.js",
    "js/boss3Plane.js",
    "js/boss3Ship.js",
  ];
  for (const file of timerFiles) {
    assertIncludes(file, "runId", `runId guard marker in ${file}`);
  }

  // Input robustness when tab loses focus.
  assertIncludes("js/input.js", "resetInputState()", "input reset method present");
  assertIncludes(
    "js/input.js",
    "visibilitychange",
    "visibilitychange reset handler present"
  );
  assertIncludes("js/input.js", "window.addEventListener('blur'", "blur reset handler present");

  // Constructor should not trigger victory sound directly.
  const gameSource = fs.readFileSync(path.join(root, "js/game.js"), "utf8");
  if (gameSource.includes('playSound("gameWon"')) {
    console.error('[FAIL] game.js still contains direct playSound("gameWon") call');
    process.exit(1);
  }
  console.log('[OK] no direct playSound("gameWon") call in game.js');

  console.log("Smoke regression checks passed.");
}

main();
