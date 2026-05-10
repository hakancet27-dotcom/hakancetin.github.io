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
    // Inject Firebase SDK into dist/index.html
    const distHtml = path.join(taktakSrc, 'dist', 'index.html');
    let distContent = fs.readFileSync(distHtml, 'utf8');
    const firebaseSDK = [
      '  <!-- Firebase SDK -->',
      '  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>',
      '  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js"></script>',
      '  <script src="../config.js"></script>',
      '  <script>if(typeof firebaseConfig !== \'undefined\' && !firebase.apps.length) firebase.initializeApp(firebaseConfig);</script>'
    ].join('\n');
    distContent = distContent.replace('<body>', '<body>\n' + firebaseSDK);
    // Inject CSP meta tag
    const cspTag = '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\' \'unsafe-eval\' https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://www.gstatic.com https://*.firebaseio.com; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; media-src \'self\' blob:; connect-src \'self\' https://cdn.jsdelivr.net https://www.gstatic.com wss: https://*.firebaseio.com https://*.googleapis.com https://*.firebaseapp.com https://*.gstatic.com https://*.google-analytics.com https://analytics.google.com https://www.google.com; font-src \'self\'; object-src \'none\'; base-uri \'self\';">';
    if (distContent.includes('</head>')) {
      distContent = distContent.replace('</head>', '  ' + cspTag + '\n  </head>');
    } else {
      // Vite singlefile: no </head>, inject after <html...>
      distContent = distContent.replace(/<html[^>]*>/, '$&\n<head>\n  ' + cspTag + '\n</head>');
    }
    fs.writeFileSync(distHtml, distContent, 'utf8');
    // Copy dist -> taktak/
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
