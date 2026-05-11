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
      '  <script>if(typeof firebaseConfig !== \'undefined\' && !firebase.apps.length) firebase.initializeApp(firebaseConfig);</script>',
      '  <!-- Taktak Leaderboard Functions -->',
      '  <script>',
      '    function taktakSubmitScore() {',
      '      if (typeof firebase === \'undefined\' || !firebase.apps.length) return;',
      '      const name = document.getElementById(\'taktakPlayerName\')?.value || \'Anonymous\';',
      '      const score = parseInt(window.taktakFinalScore || 0);',
      '      if (!score || score <= 0) return;',
      '      const ref = firebase.database().ref(\'taktak-leaderboard\');',
      '      ref.push({',
      '        name: name.trim(),',
      '        score: score,',
      '        timestamp: Date.now()',
      '      }).then(() => {',
      '        alert(\'Skor kaydedildi!\');',
      '        taktakLoadLeaderboard();',
      '      }).catch(err => {',
      '        console.error(\'Skor kaydedilemedi:\', err);',
      '        alert(\'Skor kaydedilemedi!\');',
      '      });',
      '    }',
      '    function taktakLoadLeaderboard() {',
      '      if (typeof firebase === \'undefined\' || !firebase.apps.length) return;',
      '      const listEl = document.getElementById(\'taktak-leaderboard-list\');',
      '      if (!listEl) return;',
      '      firebase.database().ref(\'taktak-leaderboard\')',
      '        .orderByChild(\'score\').limitToLast(10)',
      '        .once(\'value\', snapshot => {',
      '          const scores = [];',
      '          snapshot.forEach(child => {',
      '            scores.push({ id: child.key, ...child.val() });',
      '          });',
      '          scores.sort((a, b) => b.score - a.score);',
      '          listEl.innerHTML = scores.map((item, i) => ',
      '            `<div style="display:flex;justify-content:space-between;padding:4px 8px;margin:2px 0;background:rgba(255,255,255,0.05);border-radius:4px;">',
      '            <span>${i+1}. ${item.name}</span>',
      '            <span style="color:#00ff88;font-weight:bold;">${item.score}</span>',
      '            </div>`',
      '          ).join(\'\') || \'<p style="font-size:0.85rem;color:#888;">Henüz skor yok</p>\';',
      '        }).catch(err => {',
      '          console.error(\'Leaderboard yüklenemedi:\', err);',
      '        });',
      '    }',
      '    window.taktakSubmitScore = taktakSubmitScore;',
      '    window.taktakLoadLeaderboard = taktakLoadLeaderboard;',
      '  </script>'
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
    
    // Inject leaderboard form into game over screen
    const finalDistContent = fs.readFileSync(distHtml, 'utf8');
    const leaderboardForm = [
      '    if (window.taktakFinalScore > 0) {',
      '      const formHtml = `',
      '        <div style="position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:rgba(0,0,0,0.9);padding:20px;border-radius:10px;border:1px solid #333;z-index:10000;">',
      '          <h3 style="color:#fff;margin:0 0 15px 0;">🏆 Skor Kaydet</h3>',
      '          <p style="color:#00ff88;margin:0 0 10px 0;">Final Skor: ${window.taktakFinalScore}</p>',
      '          <div style="display:flex;gap:10px;margin-bottom:15px;">',
      '            <input id="taktakPlayerName" type="text" placeholder="Adınız" maxlength="20" style="flex:1;padding:8px;background:#1a1a2e;border:1px solid #444;border-radius:4px;color:#fff;">',
      '            <button onclick="taktakSubmitScore()" style="padding:8px 16px;background:linear-gradient(135deg,#00ff88,#4ecdc4);border:none;border-radius:4px;color:#000;font-weight:bold;cursor:pointer;">Kaydet</button>',
      '          </div>',
      '          <div style="background:#111;border-radius:8px;padding:10px;border:1px solid #333;">',
      '            <div style="font-size:0.85rem;color:#00ff88;font-weight:bold;margin-bottom:8px;">🏆 Top Skorlar</div>',
      '            <div id="taktak-leaderboard-list"><p style="font-size:0.85rem;color:#888;">Henüz skor yok</p></div>',
      '          </div>',
      '          <button onclick="this.parentElement.remove()" style="margin-top:15px;padding:8px 16px;background:#333;border:none;border-radius:4px;color:#fff;cursor:pointer;">Kapat</button>',
      '        </div>',
      '      `;',
      '      document.body.insertAdjacentHTML(\'beforeend\', formHtml);',
      '      taktakLoadLeaderboard();',
      '    }'
    ].join('\n');
    
    // Inject score tracking and form display
    const injectScript = '<script>window.taktakFinalScore = 0; window.addEventListener("load", () => { ' + finalDistContent.replace(/.*?<\/script>/s, '') + ' });</script>';
    const updatedContent = finalDistContent.replace(
      '</body>',
      '<script>' + leaderboardForm + '</script></body>'
    );
    fs.writeFileSync(distHtml, updatedContent, 'utf8');
    
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
