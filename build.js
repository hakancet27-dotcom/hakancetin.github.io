const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

console.log('=== BUILD STARTED ===');

try {
  // 1. FaceRacer: minify source -> faceracer.js
  execSync('npx terser assets/js/faceracer.source.js -c -m -o assets/js/faceracer.js', {
    stdio: 'inherit', cwd: ROOT
  });
  console.log('✓ FaceRacer: assets/js/faceracer.js');

  // 2. Ninja: minify source -> game.min.js
  execSync('npx terser ninja/static/js/game.source.js -c -m -o ninja/static/js/game.min.js', {
    stdio: 'inherit', cwd: ROOT
  });
  console.log('✓ Ninja: ninja/static/js/game.min.js');

  // 3. Taktak: vite build
  const taktakSrc = path.join(ROOT, 'taktak-src');
  if (fs.existsSync(taktakSrc)) {
    // Install deps if node_modules missing
    if (!fs.existsSync(path.join(taktakSrc, 'node_modules'))) {
      console.log('  Installing Taktak dependencies...');
      execSync('npm install', { stdio: 'inherit', cwd: taktakSrc });
    }
    execSync('npm run build', { stdio: 'inherit', cwd: taktakSrc });
    // Copy dist -> taktak/
    const distHtml = path.join(taktakSrc, 'dist', 'index.html');
    const distImages = path.join(taktakSrc, 'dist', 'images');
    fs.copyFileSync(distHtml, path.join(ROOT, 'taktak', 'index.html'));
    if (fs.existsSync(distImages)) {
      execSync(`xcopy "${distImages}" "${path.join(ROOT, 'taktak', 'images')}" /E /I /Y`, { stdio: 'inherit' });
    }
    console.log('✓ Taktak: taktak/index.html');
  } else {
    console.log('⚠ taktak-src/ bulunamadı, Taktak build atlandı');
  }

  console.log('=== BUILD COMPLETE ===');
} catch (error) {
  console.error('✗ Build failed:', error.message);
  process.exit(1);
}
