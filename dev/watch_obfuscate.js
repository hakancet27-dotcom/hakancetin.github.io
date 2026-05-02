// Watcher script: on source changes, rebuild obfuscated bundle + sourcemap.
// Run: npm run watch

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const repoRoot = __dirname;
const sourceFile = path.join(repoRoot, 'assets', 'js', 'faceracer.source.js');

function now() {
  return new Date().toISOString().replace('T', ' ').replace('Z', '');
}

let pending = false;
let running = false;

function runBuild() {
  if (running) {
    pending = true;
    return;
  }

  running = true;
  pending = false;

  console.log(`[${now()}] 🔁 Build started`);

  const child = spawn(process.execPath, [path.join(repoRoot, 'obfuscate.js')], {
    cwd: repoRoot,
    stdio: 'inherit',
  });

  child.on('exit', (code) => {
    running = false;

    if (code === 0) {
      console.log(`[${now()}] ✅ Build finished`);
    } else {
      console.log(`[${now()}] ❌ Build failed (exit ${code})`);
    }

    if (pending) {
      // debounce: batch rapid saves into a single extra build
      setTimeout(runBuild, 150);
    }
  });
}

if (!fs.existsSync(sourceFile)) {
  console.error(`Source file not found: ${sourceFile}`);
  process.exit(1);
}

console.log(`[${now()}] 👀 Watching: ${sourceFile}`);
console.log(`[${now()}] Tip: keep this terminal open while coding`);

// Initial build so output matches source at start.
runBuild();

// fs.watch is enough for local dev; keep it simple.
fs.watch(sourceFile, { persistent: true }, (_eventType) => {
  // Some editors trigger multiple events per save; debounce via pending/running.
  runBuild();
});

