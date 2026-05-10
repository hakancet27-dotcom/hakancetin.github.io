const fs = require('fs');
const path = 'C:/Users/hakan/OneDrive/Desktop/Cascade/Projects/hakancetin.github.io/taktak-src/src/components/GameScene.tsx';
let lines = fs.readFileSync(path, 'utf8').split('\n');

// Keep everything up to return ( line (index 1148)
const keepLines = lines.slice(0, 1148);

const returnBlock = [
  '  return (',
  '    <div ref={mountRef} className="w-full h-full relative">',
  '      {isDead && (',
  "        <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.7)',zIndex:50,overflowY:'auto',padding:'16px'}}>",
  "          <div style={{background:'#111',borderRadius:'16px',padding:'24px',maxWidth:'340px',width:'100%',border:'1px solid #333',textAlign:'center'}}>",
  "            <div style={{fontSize:'2rem',fontWeight:'bold',color:'#d44',marginBottom:'4px'}}>{language === 'tr' ? 'ÖLDÜN' : 'DEAD'}</div>",
  "            <div style={{color:'#fc4',fontSize:'1rem',marginBottom:'16px'}}>{language === 'tr' ? 'Dalga' : 'Wave'} {stateRef.current.wave} \u00b7 {deadScore} {language === 'tr' ? 'Öldürme' : 'Kills'}</div>",
  "            <div style={{marginBottom:'16px'}}>",
  "              <div style={{display:'flex',gap:'8px',marginBottom:'10px'}}>",
  "                <input value={playerName} onChange={e=>setPlayerName(e.target.value)} maxLength={20} placeholder={language === 'tr' ? 'Ad\u0131n\u0131z' : 'Your name'} style={{flex:1,padding:'8px 12px',background:'#1a1a2e',border:'1px solid #444',borderRadius:'8px',color:'#fff',fontSize:'0.9rem',outline:'none'}} />",
  "                <button onClick={()=>submitScore()} style={{padding:'8px 14px',background:'linear-gradient(135deg,#00ff88,#4ecdc4)',border:'none',borderRadius:'8px',color:'#000',fontWeight:'bold',cursor:'pointer',fontSize:'0.85rem'}}>{scoreSaved ? (language === 'tr' ? 'Kaydedildi! \u2713' : 'Saved! \u2713') : (language === 'tr' ? 'Kaydet' : 'Save')}</button>",
  '              </div>',
  "              <div style={{background:'#0a0a0a',borderRadius:'10px',padding:'10px',border:'1px solid #222',textAlign:'left'}}>",
  "                <div style={{fontSize:'0.8rem',color:'#00ff88',fontWeight:'bold',marginBottom:'8px'}}>{language === 'tr' ? '\uD83C\uDFC6 Top Skorlar' : '\uD83C\uDFC6 Top Scores'}</div>",
  '                {leaderboard.length === 0',
  "                  ? <p style={{fontSize:'0.8rem',color:'#888'}}>{language === 'tr' ? 'Hen\u00fcz skor yok' : 'No scores yet'}</p>",
  '                  : leaderboard.map((s,i)=>(',
  "                      <div key={i} style={{padding:'5px 4px',borderBottom:'1px solid #222',display:'flex',justifyContent:'space-between'}}>",
  "                        <span style={{color:'#666',fontSize:'0.75rem'}}>#{i+1}</span>",
  "                        <div><span style={{color:'#00ff88',fontWeight:'bold',fontSize:'0.85rem'}}>{s.score}</span><span style={{color:'#888',fontSize:'0.75rem',marginLeft:'6px'}}>{s.playerName||'Anonim'}</span></div>",
  '                      </div>',
  '                    ))',
  '                }',
  '              </div>',
  '            </div>',
  "            <button onClick={()=>setScoreSaved(false)} style={{padding:'10px 28px',background:'linear-gradient(135deg,#ff6b6b,#ff2244)',border:'none',borderRadius:'10px',color:'#fff',fontWeight:'bold',cursor:'pointer',fontSize:'0.95rem'}}>{language === 'tr' ? '\uD83D\uDD01 Tekrar Oyna' : '\uD83D\uDD01 Play Again'}</button>",
  '          </div>',
  '        </div>',
  '      )}',
  '    </div>',
  '  );',
  '}'
].join('\n');

const newContent = keepLines.join('\n') + '\n' + returnBlock + '\n';
fs.writeFileSync(path, newContent, 'utf8');
console.log('Done - lines:', newContent.split('\n').length);
