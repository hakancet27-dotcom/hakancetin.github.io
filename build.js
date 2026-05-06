const { execSync } = require('child_process');
const fs = require('fs');

console.log('Building FaceRacer and Ninja...');

try {
  // Minify faceracer.source.js to faceracer.js
  execSync('npx terser assets/js/faceracer.source.js -c -m -o assets/js/faceracer.js', {
    stdio: 'inherit'
  });
  
  console.log('✓ FaceRacer minification complete: assets/js/faceracer.js');
  
  // Minify ninja/static/js/game.js to ninja/static/js/game.min.js
  execSync('npx terser ninja/static/js/game.js -c -m -o ninja/static/js/game.min.js', {
    stdio: 'inherit'
  });
  
  console.log('✓ Ninja minification complete: ninja/static/js/game.min.js');
  
} catch (error) {
  console.error('✗ Build failed:', error);
  process.exit(1);
}
