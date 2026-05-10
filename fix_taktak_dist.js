const fs = require('fs');
const p = 'C:/Users/hakan/OneDrive/Desktop/Cascade/Projects/hakancetin.github.io/taktak-src/dist/index.html';
let c = fs.readFileSync(p, 'utf8');
const sdk = [
  '  <!-- Firebase SDK -->',
  '  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js"></script>',
  '  <script src="https://www.gstatic.com/firebasejs/10.7.0/firebase-database-compat.js"></script>',
  '  <script src="../config.js"></script>',
  '  <script>if(typeof firebaseConfig !== \'undefined\' && !firebase.apps.length) firebase.initializeApp(firebaseConfig);</script>'
].join('\n');
c = c.replace('<body>', '<body>\n' + sdk);
fs.writeFileSync(p, c, 'utf8');
console.log('Done');
