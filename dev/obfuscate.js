// JavaScript Obfuscation Script
// FaceRacer için kod koruma

const JavaScriptObfuscator = require('javascript-obfuscator');
const fs = require('fs');
const path = require('path');

// Dosya yolları
// Not: Geliştirme için `faceracer.source.js` düzenlenir.
// Deploy için bu script `faceracer.js` (obfuscated) + `faceracer.map.js` üretir.
const inputFile = './assets/js/faceracer.source.js';
const outputFile = './assets/js/faceracer.js';
const sourceMapFile = './assets/js/faceracer.map.js';

// Obfuscation ayarları
const obfuscationConfig = {
    compact: true,
    controlFlowFlattening: true,
    controlFlowFlatteningThreshold: 0.75,
    deadCodeInjection: true,
    deadCodeInjectionThreshold: 0.4,
    debugProtection: true,
    debugProtectionInterval: 4000,
    disableConsoleOutput: true,
    identifierNamesGenerator: 'hexadecimal',
    log: false,
    renameGlobals: false,
    rotateStringArray: true,
    selfDefending: true,
    shuffleStringArray: true,
    splitStrings: true,
    splitStringsChunkLength: 10,
    stringArray: true,
    stringArrayEncoding: ['base64'],
    stringArrayThreshold: 0.75,
    transformObjectKeys: true,
    unicodeEscapeSequence: false,
    sourceMap: true,
    sourceMapMode: 'separate',
    sourceMapFileName: 'faceracer.map.js',
    // Firebase ve global fonksiyonları koru
    reservedStrings: ['firebase', 'loadLeaderboard', 'submitScore', 'window']
};

// Obfuscation işlemi
try {
    console.log('🔒 FaceRacer obfuscation başlıyor...');
    
    // Giriş dosyasını oku
    const inputCode = fs.readFileSync(inputFile, 'utf8');
    console.log(`📁 Dosya okundu: ${inputFile}`);
    console.log(`📊 Boyut: ${(inputCode.length / 1024).toFixed(2)} KB`);
    
    // Obfuscation uygula
    const obfuscationResult = JavaScriptObfuscator.obfuscate(inputCode, obfuscationConfig);
    
    // Obfuscated kodu yaz
    fs.writeFileSync(outputFile, obfuscationResult.getObfuscatedCode());
    console.log(`✅ Obfuscated kod yazıldı: ${outputFile}`);
    
    // Source map'i yaz (sadece local'de)
    if (obfuscationResult.getSourceMap()) {
        fs.writeFileSync(sourceMapFile, obfuscationResult.getSourceMap());
        console.log('🗺️ Source map oluşturuldu (sadece local debug için)');
    }
    
    console.log('🎉 Obfuscation tamamlandı!');
    console.log(`📦 Çıktı: ${outputFile}`);
    console.log(`🔑 Source Map: ${sourceMapFile}`);
    console.log('⚠️ Source map GitHub\'a gönderilmeyecek (.gitignore)');
    
} catch (error) {
    console.error('❌ Obfuscation hatası:', error.message);
    process.exit(1);
}

// Yedekleme (source dosyasını sakla)
try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = `./assets/js/faceracer.source.backup.${timestamp}.js`;
    fs.copyFileSync(inputFile, backupFile);
    console.log(`💾 Yedek oluşturuldu: ${backupFile}`);
} catch (error) {
    console.log('⚠️ Yedekleme hatası:', error.message);
}
