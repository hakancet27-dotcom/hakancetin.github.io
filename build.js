const { execSync } = require('child_process');
const fs = require('fs');

console.log('Building FaceRacer...');

try {
  // Minify faceracer.source.js to faceracer.js
  execSync('npx terser assets/js/faceracer.source.js -c -m -o assets/js/faceracer.js', {
    stdio: 'inherit'
  });
  
  console.log('✓ Minification complete: assets/js/faceracer.js');
} catch (error) {
  console.error('✗ Build failed:', error);
  process.exit(1);
}
