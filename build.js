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
    
    // Inject leaderboard that listens for taktakGameOver event from GameScene
    const finalDistContent = fs.readFileSync(distHtml, 'utf8');
    
    const leaderboardScript = `
    <script>
      // Listen for game over event from GameScene
      window.addEventListener('taktakGameOver', function(e) {
        var kills = e.detail.kills || 0;
        var wave = e.detail.wave || 1;
        window.taktakFinalScore = kills;
        document.getElementById('taktak-score-display').textContent = kills;
        document.getElementById('taktak-wave-display').textContent = wave;
        document.getElementById('taktak-leaderboard-overlay').style.display = 'flex';
        taktakLoadLeaderboard();
      });
    </script>
    <div id="taktak-leaderboard-overlay" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);display:none;justify-content:center;align-items:center;z-index:10000;">
      <div style="background:#1a1a2e;padding:30px;border-radius:15px;border:2px solid #00ff88;text-align:center;max-width:420px;width:90%;font-family:Arial,sans-serif;">
        <h2 style="color:#fff;margin:0 0 10px 0;">OYUN BİTTİ!</h2>
        <p style="color:#00ff88;margin:0 0 5px 0;font-size:1.3rem;font-weight:bold;">Skor: <span id="taktak-score-display">0</span></p>
        <p style="color:#fc4;margin:0 0 20px 0;font-size:0.9rem;">Dalga: <span id="taktak-wave-display">1</span></p>
        <div style="display:flex;gap:10px;margin-bottom:15px;justify-content:center;">
          <input id="taktakPlayerName" type="text" placeholder="Adınız" maxlength="20" style="flex:1;padding:10px;background:#0a0a0a;border:1px solid #444;border-radius:6px;color:#fff;font-size:14px;">
          <button onclick="taktakSubmitScore()" style="padding:10px 20px;background:#00ff88;border:none;border-radius:6px;color:#000;font-weight:bold;cursor:pointer;font-size:14px;">Kaydet</button>
        </div>
        <div style="background:#0a0a0a;padding:12px;border-radius:8px;margin-bottom:15px;">
          <div style="color:#00ff88;font-weight:bold;margin-bottom:8px;">Top Skorlar</div>
          <div id="taktak-leaderboard-list"><p style="color:#888;font-size:0.85rem;">Yükleniyor...</p></div>
        </div>
        <button onclick="location.reload()" style="padding:10px 25px;background:#333;border:none;border-radius:6px;color:#fff;cursor:pointer;font-size:14px;">Tekrar Oyna</button>
      </div>
    </div>
    `;
    
    const updatedContent = finalDistContent.replace(
      '</body>',
      leaderboardScript + '</body>'
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
