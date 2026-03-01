#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require("fs");
const path = require("path");

const repoRoot = process.cwd();
const jsRoot = path.join(repoRoot, "js");
const audioMapPath = path.join(jsRoot, "audioMap.js");

function readFile(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function extractObjectBlock(source, exportName) {
  const blockRegex = new RegExp(
    `export\\s+const\\s+${exportName}\\s*=\\s*\\{([\\s\\S]*?)\\};`,
    "m"
  );
  const match = source.match(blockRegex);
  return match ? match[1] : "";
}

function extractTopLevelKeys(objectBlock) {
  const keyRegex = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*:/gm;
  const keys = new Set();
  let match;
  while ((match = keyRegex.exec(objectBlock)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function stripComments(source) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/gm, "$1");
}

function* walkJsFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkJsFiles(fullPath);
      continue;
    }
    if (entry.isFile() && fullPath.endsWith(".js")) {
      yield fullPath;
    }
  }
}

function collectPlaySoundKeys(rootDir) {
  const keys = new Set();
  const regex = /playSound\(\s*['"]([^'"]+)['"]/g;

  for (const filePath of walkJsFiles(rootDir)) {
    const raw = readFile(filePath);
    const source = stripComments(raw);
    let match;
    while ((match = regex.exec(source)) !== null) {
      keys.add(match[1]);
    }
  }

  return keys;
}

function main() {
  const audioMapSource = readFile(audioMapPath);
  const canonicalKeys = extractTopLevelKeys(
    extractObjectBlock(audioMapSource, "SOUND_DEFS")
  );
  const aliasKeys = extractTopLevelKeys(
    extractObjectBlock(audioMapSource, "SOUND_ALIASES")
  );
  const usedKeys = collectPlaySoundKeys(jsRoot);

  const allowed = new Set([...canonicalKeys, ...aliasKeys]);
  const missing = [...usedKeys].filter((key) => !allowed.has(key)).sort();

  console.log(
    `sound-check: used=${usedKeys.size} canonical=${canonicalKeys.size} aliases=${aliasKeys.size}`
  );
  if (missing.length > 0) {
    console.log(`sound-check: missing keys (${missing.length}): ${missing.join(", ")}`);
    process.exitCode = 1;
    return;
  }

  console.log("sound-check: missing keys = []");
}

main();

