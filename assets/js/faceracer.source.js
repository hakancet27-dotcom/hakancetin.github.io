/*
 * FaceRacer - Kafa Kontrol Oyunu (SOURCE CODE)
 * Copyright (c) 2026 Hakan Çetin
 * Tüm hakları saklıdır.
 * 
 * Bu oyun Three.js ve MediaPipe Face Mesh kullanır
 * Yüz takibi ile kafa hareketlerini araba kontrolüne dönüştürür
 * 
 * GELİŞTİRME NOTLARI:
 * - İyileştirmeler için BU DOSYAYI düzenleyin
 * - Deploy için obfuscation tool'u kullanın
 * - faceracer.js production versiyonudur
 * 
 * ÖNEMLİ DEĞİŞİKLİKLER (27.04.2026):
 * - Kafa hareketi tespiti bütünsel hale getirildi
 * - Sadece üst yüz landmark'ları kullanıldı (omuz hareketleri filtrelendi)
 * - Alın ağırlığı artırıldı (%70), çene etkisi tamamen kaldırıldı
 * - Yüz boyutu normalize edildi (mesafe değişimleri azaltıldı)
 * - Sandalyeye yaslanma sorunu düzeltildi
 * - Profesyonel 3 aşamalı kalibrasyon sistemi (piyasa standartları)
 * - Kalite kontrolü kaldırıldı, sadece süreye dayalı sistem
 * - Yaw hassasiyeti düşürüldü (200 → 50) daha doğal kontrol için
 * - Pitch eski haline döndü (nose tip - upper face center / face height)
 * - Speed mapping eski haline döndü (1 - pitch)
 * - Smoothing artırıldı (0.8 → 0.3) stabilizasyon için
 * - Deadzone yükseltildi (0.005 → 0.05) yapışmayı önlemek için
 * - Kalibrasyon süreleri uzatıldı (3+4+4 = 11 saniye)
 * - Örnek toplama kapasitesi artırıldı (60→90)
 * - Detaylı talimatlar ve görsel geri bildirimler
 * - Dinamik hassasiyet hesaplaması (kullanıcıya özel)
 * - Görsel geri bildirim ve animasyonlar
 * - Ayna etkisi tamamen düzeltildi
 * - Omuz hareketleri etkisi minimize edildi
 * 
 * YENİ OYUN MEKANİKLERİ (27.04.2026):
 * - 3 renk sistemi: Yeşil (turbo), Sarı (altın), Kırmızı (arıza)
 * - Yeşil: Turbo puanı kazandırır, arıza oranını azaltır
 * - Sarı: Altın puanı kazandırır
 * - Kırmızı: Arıza oranını artırır, hızı düşürür, kaza sayısı artar
 * - 5 kaza sonrası araba patlar ve oyun biter
 * - Yeni HUD elementleri: Altın, Arıza, Turbo, Kaza, Mesafe
 * - Mesafe takibi eklendi
 * - endGame fonksiyonu eklendi
 * - Toplam skor hesaplaması eklendi: Altın + Turbo + (Mesafe/10) - (Kaza × 50)
 * - Oyun mekanikleri ve skor hesaplaması kontrol rehberine eklendi
 * - Kontroller bölümü küçük butonu ile açılır/kapanır hale getirildi
 * - Oyun sonu ekranı eklendi: "Araba Patladı!" mesajı ve istatistikler
 * - "Tekrar Oyna" butonu eklendi, yeni oyuna başlatır
 * - restartGame fonksiyonu eklendi ve global olarak erişilebilir yapıldı
 * - Oyun sonu ekranından turbo ve kaza bilgisi kaldırıldı (gereksiz)
 * - Gerçekçi hızlanma sistemi: 0'dan başlar, kademeli artar
 * - targetSpeed ve acceleration sistemi eklendi
 * - Acceleration düşürüldü (2 → 0.2) gerçekçi hızlanma için (20+ saniye)
 * - Kaza durumunda targetSpeed düşer, kademeli yavaşlama
 * - Tekrar oyna kalibrasyon yapmadan direkt oyunu başlatır
 * - Kalibrasyon verileri korunur, sadece oyun state'i resetlenir
 * - Speed mapping formülü: (1 - pitch) * 145, nitrosuz max 290 km/h
 * - Nitro kademeli hız artışı: +10 km/h/frame, max 300 km/h
 * - Turbo threshold eklendi: 100 turbo puanı toplamadan turbo çalışmaz (10 yeşil)
 * - HUD'da turbo threshold gösteriliyor (0/100)
 * - Kırmızıların oranı %40 azaltıldı (33% → 20.7%)
 * - Yeşil ve sarı oranları artırıldı (her biri 39.65%)
 * - Particle system eklendi: Egzoz, duman ve alev efektleri
 * - Turbo aktifken egzozdan mavi partikeller çıkar
 * - Kırmızıya çarpınca kaputtan duman oranı artar
 * - Yeşil toplayınca arıza oranına orantılı duman azalır
 * - Arıza %80+ olduğunda alev efektleri başlar
 * - Arabaya egzoz boruları eklendi
 * - Particle system iyileştirildi: Canvas texture, blending modes
 * - Partikeller her zaman kameraya bakar (billboarding)
 * - Duman ve alev daha gerçekçi görünümlü texture'lar
 * - Alev rengi sarıdan kırmızıya değişir
 * - Additive blending ile parlak efektler
 * - Turbo threshold kontrolü sıkılaştırıldı (double check)
 * - Ses efektleri eklendi: Web Audio API ile dinamik sesler
 * - Yeşil: Çift tonlu yükselen ses (C5-E5 akoru)
 * - Sarı: Coin/altın sesi (çınlayan metal)
 * - Kırmızı: Çarpma sesi (metal gürültü)
 * - Patlama: Derin bas + gürültü
 * - Turbo süresi eklendi: 5 saniye boyunca aktif kalır
 * - Turbo süresi bitince otomatik kapanır, hız normale döner
 * - Zorluk modu eklendi: Normal ve Kolay
 * - Normal mod: %20.7 kırmızı engel
 * - Kolay mod: %16.6 kırmızı engel (%20 daha az)
 * - Kalibrasyondan sonra direkt normal modda başlar
 * - Kolay mod butonu ayrı bir buton olarak sağ alt köşede
 * - Tekrar oynada zorluk normal'e resetlenir
 */

let gameState = {
    isCalibrated: false,
    isPlaying: false,
    score: 0,
    speed: 0,
    maxSpeed: 320,
    yaw: 0,
    pitch: 0,
    nitroActive: false,
    baseYaw: 0,
    basePitch: 0,
    carPosition: 0,
    obstacles: [],
    roadSegments: [],
    trees: [],
    calibrationSamples: [],
    smoothedYaw: 0,
    smoothedPitch: 0,
    calibrationPhase: 0,
    calibrationRanges: null,
    calibrationData: null,
    // New game mechanics
    goldPoints: 0,
    health: 100, // Saglamlik (0=patlama, 100=tam)
    turboPoints: 0,
    turboThreshold: 100, // Turbo çalışmak için gereken minimum puan (10 yeşil)
    distance: 0,
    targetSpeed: 0,
    acceleration: 0.2, // Speed change per frame (realistic acceleration)
    nitroTimer: 0, // Turbo süresi sayacı
    nitroDuration: 5, // Turbo süresi (saniye)
    difficulty: 'normal', // 'normal' veya 'easy'
    wallTouching: false,
    wallTouchStart: null,
    lastWallDamage: 0,
    selectedCar: 'standard',
    selectedCarColor: null,  // Custom color selected by user

    cameraPreset: 1,
    lastSpeed: -1,
    fps: 0,
    lastFrameTime: 0,
    lastSpeedClass: ''
};


// Car configurations
const CAR_CONFIGS = {
    defaultColors: {
        standard: 0x00ff88,
        fast: 0x4488ff,
        super: 0xff2244
    },
    standard: {
        name: 'Standart',
        maxSpeed: 320,
        turboMaxSpeed: 350,
        acceleration: 0.2,
        color: 0x00ff88,
        topColor: 0x00cc6a
    },
    fast: {
        name: 'Hizli',
        maxSpeed: 340,
        turboMaxSpeed: 370,
        acceleration: 0.22,
        color: 0x4488ff,
        topColor: 0x2266dd
    },
    super: {
        name: 'Super',
        maxSpeed: 360,
        turboMaxSpeed: 390,
        acceleration: 0.24,
        color: 0xff2244,
        topColor: 0xcc1133
    }
};

// Three.js Setup
let scene, camera, renderer, car, road;
let animationId;

// Particle systems
let exhaustParticles = [];
let smokeParticles = [];
let fireParticles = [];

// MediaPipe Setup
let faceMesh;
let cameraUtils;

// Audio Context
let audioContext;

// Sound functions
function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function playGreenSound() {
    if (!audioContext) return;
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(523, audioContext.currentTime); // C5
    oscillator1.frequency.exponentialRampToValueAtTime(1047, audioContext.currentTime + 0.1); // C6
    
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(659, audioContext.currentTime); // E5
    oscillator2.frequency.exponentialRampToValueAtTime(1319, audioContext.currentTime + 0.1); // E6
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(audioContext.currentTime + 0.2);
    oscillator2.stop(audioContext.currentTime + 0.2);
}

function playYellowSound() {
    if (!audioContext) return;
    const oscillator1 = audioContext.createOscillator();
    const oscillator2 = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator1.type = 'sine';
    oscillator1.frequency.setValueAtTime(1568, audioContext.currentTime);
    oscillator1.frequency.exponentialRampToValueAtTime(3136, audioContext.currentTime + 0.05);
    
    oscillator2.type = 'sine';
    oscillator2.frequency.setValueAtTime(2093, audioContext.currentTime);
    oscillator2.frequency.exponentialRampToValueAtTime(4186, audioContext.currentTime + 0.05);
    
    gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    
    oscillator1.connect(gainNode);
    oscillator2.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator1.start();
    oscillator2.start();
    oscillator1.stop(audioContext.currentTime + 0.15);
    oscillator2.stop(audioContext.currentTime + 0.15);
}

function playRedSound() {
    if (!audioContext) return;
    const bufferSize = audioContext.sampleRate * 0.3;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 3);
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    source.buffer = buffer;
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(2000, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.3);
    filter.Q.value = 1;
    
    gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start();
}

function playExplosionSound() {
    if (!audioContext) return;
    const bufferSize = audioContext.sampleRate * 0.8;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        const envelope = Math.pow(1 - i / bufferSize, 2);
        data[i] = (Math.random() * 2 - 1) * envelope;
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    
    source.buffer = buffer;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, audioContext.currentTime);
    filter.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.8);
    
    gainNode.gain.setValueAtTime(0.6, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    
    source.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    source.start();
}

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const video = document.getElementById('cameraVideo');
const calibrationOverlay = document.getElementById('calibrationOverlay');
const countdownEl = document.getElementById('countdown');
const hud = document.getElementById('hud');
const speedometer = document.getElementById('speedometer');
const controls = document.getElementById('controlsPanel');
const toggleControls = document.getElementById('toggleControls');
const startButton = document.getElementById('startButton');
const loadingEl = document.getElementById('loading');
const difficultyOverlay = document.getElementById('difficultyOverlay');
const easyModeBtn = document.getElementById('easyModeBtn');

// Initialize Three.js Scene
function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);

    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    // Default camera: Yakin (Preset 1)
    camera.position.set(0, 5, 12);
    camera.lookAt(0, 0.5, -3);

    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Create Road
    createRoad();

    // Create Car
    createCar();

    // Create Environment
    createEnvironment();

    // Handle window resize
    window.addEventListener('resize', onWindowResize);

    // Start animation loop
    animate();
}

function createRoad() {
    // Dikey modda yol genişliğini azalt (araba ekrandan çıkmasın)
    const isPortrait = window.innerHeight > window.innerWidth;
    const roadWidth = isPortrait ? 14 : 20;
    const roadGeometry = new THREE.PlaneGeometry(roadWidth, 500);
    const roadMaterial = new THREE.MeshStandardMaterial({ 
        color: 0x333333,
        roughness: 0.8
    });
    road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -200;
    road.receiveShadow = true;
    scene.add(road);

    // Road lines
    for (let i = 0; i < 20; i++) {
        const lineGeometry = new THREE.PlaneGeometry(0.3, 5);
        const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const line = new THREE.Mesh(lineGeometry, lineMaterial);
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.01, -i * 25);
        scene.add(line);
        gameState.roadSegments.push(line);
    }

    // Side barriers
    const barrierGeometry = new THREE.BoxGeometry(1, 2, 500);
    const barrierMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
    
    const leftBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    leftBarrier.position.set(-roadWidth / 2, 1, -200);
    scene.add(leftBarrier);

    const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    rightBarrier.position.set(roadWidth / 2, 1, -200);
    scene.add(rightBarrier);
}

function createCar() {
    let config = CAR_CONFIGS[gameState.selectedCar] || CAR_CONFIGS.standard;
    // Use custom color if selected
    if (gameState.selectedCarColor) {
        config = { ...config, color: gameState.selectedCarColor, topColor: gameState.selectedCarColor };
    }

    // Remove old car if exists
    if (car) {
        scene.remove(car);
    }

    car = new THREE.Group();

    if (gameState.selectedCar === 'super') {
        createSuperCar(config);
    } else if (gameState.selectedCar === 'fast') {
        createFastCar(config);
    } else {
        createStandardCar(config);
    }

    // Apply car stats
    gameState.maxSpeed = config.maxSpeed;
    gameState.acceleration = config.acceleration;

    car.position.y = 0.5;
    car.scale.set(1, 1, 1);  // Reset scale
    scene.add(car);
}

function createStandardCar(config) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2, 1, 4), new THREE.MeshStandardMaterial({ color: config.color }));
    body.position.y = 0.5; body.castShadow = true; car.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.8, 2), new THREE.MeshStandardMaterial({ color: config.topColor }));
    top.position.y = 1.4; top.position.z = -0.5; top.castShadow = true; car.add(top);
    addBaseCarDetails(car, config, 2, 4);
    addStandardCarDetails(car, config);
    addWheels(car);
    addExhaust(car);
}

function createFastCar(config) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.8, 4.5), new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.4, roughness: 0.3 }));
    body.position.y = 0.4; body.castShadow = true; car.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.6, 1.8), new THREE.MeshStandardMaterial({ color: config.topColor, metalness: 0.5, roughness: 0.2 }));
    top.position.y = 1.1; top.position.z = -0.3; top.castShadow = true; car.add(top);
    const spoilerMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2, 0.08, 0.5), spoilerMat);
    spoiler.position.set(0, 1.2, 1.8); car.add(spoiler);
    const standGeo = new THREE.BoxGeometry(0.08, 0.3, 0.08);
    [[-0.7, 1.05, 1.8], [0.7, 1.05, 1.8]].forEach(pos => {
        const s = new THREE.Mesh(standGeo, spoilerMat); s.position.set(...pos); car.add(s);
    });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x444444 });
    [[-1.1, 0.5, 0], [1.1, 0.5, 0]].forEach(pos => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.3, 3.5), stripeMat); s.position.set(...pos); car.add(s);
    });
    addBaseCarDetails(car, config, 2.2, 4.5);
    addSportCarDetails(car, config);
    addWheels(car);
    addExhaust(car);
}

function createSuperCar(config) {
    // Wide aggressive body
    const bodyGeometry = new THREE.BoxGeometry(2.4, 0.7, 5);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.6, roughness: 0.15 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.35;
    body.castShadow = true;
    car.add(body);

    // Low aerodynamic top
    const topGeometry = new THREE.BoxGeometry(1.4, 0.5, 1.6);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.1 });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 0.95;
    top.position.z = -0.2;
    top.castShadow = true;
    car.add(top);

    // Big spoiler
    const spoilerGeo = new THREE.BoxGeometry(2.4, 0.1, 0.6);
    const spoilerMat = new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.5 });
    const spoiler = new THREE.Mesh(spoilerGeo, spoilerMat);
    spoiler.position.set(0, 1.3, 2);
    car.add(spoiler);
    const standGeo = new THREE.BoxGeometry(0.1, 0.5, 0.1);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [[-0.9, 1.05, 2], [0.9, 1.05, 2]].forEach(pos => {
        const stand = new THREE.Mesh(standGeo, standMat);
        stand.position.set(...pos);
        car.add(stand);
    });

    // Neon underglow
    const neonGeo = new THREE.BoxGeometry(2.2, 0.05, 4.5);
    const neonMat = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 });
    const neon = new THREE.Mesh(neonGeo, neonMat);
    neon.position.y = 0.02;
    car.add(neon);

    // Hood scoop
    const scoopGeo = new THREE.BoxGeometry(0.6, 0.2, 0.8);
    const scoopMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const scoop = new THREE.Mesh(scoopGeo, scoopMat);
    scoop.position.set(0, 0.8, -1.2);
    car.add(scoop);

    // Side skirts
    const skirtGeo = new THREE.BoxGeometry(0.15, 0.25, 4.2);
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    [[-1.25, 0.15, 0], [1.25, 0.15, 0]].forEach(pos => {
        const skirt = new THREE.Mesh(skirtGeo, skirtMat);
        skirt.position.set(...pos);
        car.add(skirt);
    });

    // Racing stripes
    const stripeGeo = new THREE.BoxGeometry(0.3, 0.02, 4.8);
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x666666 });
    [[-0.4, 0.71, 0], [0.4, 0.71, 0]].forEach(pos => {
        const stripe = new THREE.Mesh(stripeGeo, stripeMat);
        stripe.position.set(...pos);
        car.add(stripe);
    });

    addWheels(car, 0.45);
    addExhaust(car, true);
}

function addBoxPart(carGroup, size, position, material) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
    mesh.position.set(...position);
    mesh.castShadow = true;
    carGroup.add(mesh);
    return mesh;
}

function addBaseCarDetails(carGroup, config, width, length) {
    const glassMat = new THREE.MeshStandardMaterial({ color: 0x071827, metalness: 0.2, roughness: 0.08, emissive: 0x041522, emissiveIntensity: 0.25 });
    const headlightMat = new THREE.MeshStandardMaterial({ color: 0xffffcc, emissive: 0xffffaa, emissiveIntensity: 0.55 });
    const tailMat = new THREE.MeshStandardMaterial({ color: 0xff2222, emissive: 0xaa0000, emissiveIntensity: 0.45 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.5, roughness: 0.35 });
    const accentMat = new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.45, roughness: 0.22 });
    addBoxPart(carGroup, [width * 0.7, 0.05, 0.12], [0, 1.82, -0.95], glassMat);
    addBoxPart(carGroup, [width * 0.62, 0.05, 0.12], [0, 1.58, 0.35], glassMat);
    addBoxPart(carGroup, [0.08, 0.38, 1.25], [-width * 0.48, 1.35, -0.35], glassMat);
    addBoxPart(carGroup, [0.08, 0.38, 1.25], [width * 0.48, 1.35, -0.35], glassMat);
    [[-width * 0.32, 0.72, -length * 0.5 - 0.03], [width * 0.32, 0.72, -length * 0.5 - 0.03]].forEach(pos => addBoxPart(carGroup, [0.34, 0.16, 0.08], pos, headlightMat));
    [[-width * 0.34, 0.72, length * 0.5 + 0.03], [width * 0.34, 0.72, length * 0.5 + 0.03]].forEach(pos => addBoxPart(carGroup, [0.32, 0.15, 0.08], pos, tailMat));
    addBoxPart(carGroup, [width * 0.9, 0.16, 0.18], [0, 0.35, -length * 0.5 - 0.05], trimMat);
    addBoxPart(carGroup, [width * 0.9, 0.16, 0.18], [0, 0.35, length * 0.5 + 0.05], trimMat);
    addBoxPart(carGroup, [width * 0.92, 0.04, length * 0.46], [0, 1.04, -0.62], accentMat);
}

function addStandardCarDetails(carGroup, config) {
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xb8c6d1, metalness: 0.85, roughness: 0.18 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x191919, metalness: 0.35, roughness: 0.3 });
    addBoxPart(carGroup, [1.55, 0.05, 0.12], [0, 1.86, -0.1], chromeMat);
    addBoxPart(carGroup, [0.28, 0.08, 0.95], [-1.06, 0.82, -0.1], darkMat);
    addBoxPart(carGroup, [0.28, 0.08, 0.95], [1.06, 0.82, -0.1], darkMat);
    addBoxPart(carGroup, [0.16, 0.3, 0.08], [-1.08, 1.28, -1.25], darkMat);
    addBoxPart(carGroup, [0.16, 0.3, 0.08], [1.08, 1.28, -1.25], darkMat);
}

function addSportCarDetails(carGroup, config) {
    const blackMat = new THREE.MeshStandardMaterial({ color: 0x080808, metalness: 0.5, roughness: 0.2 });
    const accentMat = new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.55, roughness: 0.18 });
    addBoxPart(carGroup, [2.25, 0.08, 0.45], [0, 0.18, -2.45], blackMat);
    addBoxPart(carGroup, [0.16, 0.22, 3.8], [-1.23, 0.28, 0], blackMat);
    addBoxPart(carGroup, [0.16, 0.22, 3.8], [1.23, 0.28, 0], blackMat);
    addBoxPart(carGroup, [0.65, 0.08, 1.05], [0, 0.86, -1.35], blackMat);
    addBoxPart(carGroup, [0.08, 0.22, 0.85], [-1.2, 1.02, -1.2], accentMat);
    addBoxPart(carGroup, [0.08, 0.22, 0.85], [1.2, 1.02, -1.2], accentMat);
}

function addSuperCarDetails(carGroup, config) {
    const carbonMat = new THREE.MeshStandardMaterial({ color: 0x050505, metalness: 0.7, roughness: 0.12 });
    const glowMat = new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 0.9, transparent: true, opacity: 0.75 });
    addBoxPart(carGroup, [2.7, 0.08, 0.55], [0, 0.14, -2.72], carbonMat);
    addBoxPart(carGroup, [1.8, 0.1, 0.45], [0, 0.14, 2.72], carbonMat);
    addBoxPart(carGroup, [0.22, 0.25, 4.8], [-1.38, 0.2, 0], carbonMat);
    addBoxPart(carGroup, [0.22, 0.25, 4.8], [1.38, 0.2, 0], carbonMat);
    addBoxPart(carGroup, [0.35, 0.04, 4.6], [-0.78, 0.76, 0], glowMat);
    addBoxPart(carGroup, [0.35, 0.04, 4.6], [0.78, 0.76, 0], glowMat);
    addBoxPart(carGroup, [0.9, 0.08, 1.2], [0, 0.86, -1.45], carbonMat);
}

function addWheels(carGroup, radius) {
    radius = radius || 0.4;
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const rimMat = new THREE.MeshStandardMaterial({ color: 0x888888, metalness: 0.8 });
    const spokeMat = new THREE.MeshStandardMaterial({ color: 0xd0d0d0, metalness: 0.75, roughness: 0.2 });
    [[-1, radius, 1.4], [1, radius, 1.4], [-1, radius, -1.4], [1, radius, -1.4]].forEach(pos => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, 0.3, 16), wheelMat);
        wheel.rotation.z = Math.PI / 2; wheel.position.set(...pos); wheel.castShadow = true; carGroup.add(wheel);
        const rim = new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.6, radius * 0.6, 0.32, 8), rimMat);
        rim.rotation.z = Math.PI / 2; rim.position.set(...pos); carGroup.add(rim);
        [0, Math.PI / 2].forEach(angle => {
            const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.04, radius * 1.05, 0.34), spokeMat);
            spoke.rotation.z = angle; spoke.position.set(...pos); carGroup.add(spoke);
        });
    });
}

function addExhaust(carGroup, dual) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x333333, metalness: 0.6 });
    const positions = dual
        ? [[-0.8, 0.3, 2.5], [-0.4, 0.3, 2.5], [0.4, 0.3, 2.5], [0.8, 0.3, 2.5]]
        : [[-0.6, 0.3, 2.2], [0.6, 0.3, 2.2]];
    positions.forEach(pos => {
        const e = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.5, 8), mat);
        e.rotation.x = Math.PI / 2; e.position.set(...pos); carGroup.add(e);
    });
}

function createEnvironment() {
    // Ground
    const groundGeometry = new THREE.PlaneGeometry(200, 500);
    const groundMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.1;
    ground.position.z = -200;
    scene.add(ground);

    // Trees
    for (let i = 0; i < 30; i++) {
        createTree(-15 - Math.random() * 20, -i * 20);
        createTree(15 + Math.random() * 20, -i * 20);
    }
}

function createTree(x, z) {
    const tree = new THREE.Group();

    const trunkGeometry = new THREE.CylinderGeometry(0.3, 0.4, 2, 8);
    const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x8B4513 });
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1;
    tree.add(trunk);

    const leavesGeometry = new THREE.ConeGeometry(1.5, 3, 8);
    const leavesMaterial = new THREE.MeshStandardMaterial({ color: 0x228B22 });
    const leaves = new THREE.Mesh(leavesGeometry, leavesMaterial);
    leaves.position.y = 3;
    tree.add(leaves);

    tree.position.set(x, 0, z);
    tree.castShadow = true;
    tree.userData.side = x < 0 ? -1 : 1;
    scene.add(tree);
    gameState.trees.push(tree);
}

function createObstacle() {
    const rand = Math.random();
    let color, type, geometry;
    
    if (gameState.difficulty === 'easy') {
        if (rand < 0.4172) {
            color = 0x00ff00;
            type = 'turbo';
            geometry = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 8);
        } else if (rand < 0.8344) {
            color = 0xffd700;
            type = 'gold';
            geometry = new THREE.OctahedronGeometry(1.2, 0);
        } else {
            color = 0xff0000;
            type = 'damage';
            geometry = new THREE.BoxGeometry(2, 2, 2);
        }
    } else {
        if (rand < 0.3965) {
            color = 0x00ff00;
            type = 'turbo';
            geometry = new THREE.CylinderGeometry(0.8, 0.8, 1.5, 8);
        } else if (rand < 0.793) {
            color = 0xffd700;
            type = 'gold';
            geometry = new THREE.OctahedronGeometry(1.2, 0);
        } else {
            color = 0xff0000;
            type = 'damage';
            geometry = new THREE.BoxGeometry(2, 2, 2);
        }
    }
    
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color, metalness: 0.3, roughness: 0.4 });
    const obstacle = new THREE.Mesh(geometry, obstacleMaterial);
    obstacle.position.set(
        (Math.random() - 0.5) * 14,
        1,
        -200
    );
    obstacle.castShadow = true;
    obstacle.userData = { type };
    scene.add(obstacle);
    gameState.obstacles.push(obstacle);
}

// Create smoke texture
function createSmokeTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(255, 255, 255, 0.8)');
    gradient.addColorStop(0.6, 'rgba(255, 255, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

// Create fire texture
function createFireTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    
    const gradient = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    gradient.addColorStop(0, 'rgba(255, 255, 200, 1)');
    gradient.addColorStop(0.2, 'rgba(255, 200, 50, 0.9)');
    gradient.addColorStop(0.5, 'rgba(255, 100, 0, 0.6)');
    gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 64, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    return texture;
}

const smokeTexture = createSmokeTexture();
const fireTexture = createFireTexture();

// Particle system functions
function createExhaustParticle() {
    const size = 0.15 + Math.random() * 0.1;
    const geometry = new THREE.PlaneGeometry(size, size);
    const color = gameState.nitroActive ? new THREE.Color(0x00ffff) : new THREE.Color(0x888888);
    
    const material = new THREE.MeshBasicMaterial({ 
        color: color,
        transparent: true,
        opacity: 0.6,
        map: smokeTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const particle = new THREE.Mesh(geometry, material);
    
    // Random exhaust position
    const exhaustX = Math.random() > 0.5 ? -0.6 : 0.6;
    particle.position.set(
        car.position.x + exhaustX,
        car.position.y + 0.3,
        car.position.z + 2.2
    );
    
    particle.lookAt(camera.position);
    
    particle.userData = {
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.15,
            Math.random() * 0.15,
            0.4 + Math.random() * 0.3
        ),
        life: 1.0,
        maxLife: 1.0,
        type: 'exhaust'
    };
    
    scene.add(particle);
    exhaustParticles.push(particle);
}

function createSmokeParticle() {
    const size = 0.4 + Math.random() * 0.3;
    const geometry = new THREE.PlaneGeometry(size, size);
    
    const gray = 0.4 + Math.random() * 0.2;
    const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(gray, gray, gray),
        transparent: true,
        opacity: 0.4,
        map: smokeTexture,
        blending: THREE.NormalBlending,
        depthWrite: false
    });
    
    const particle = new THREE.Mesh(geometry, material);
    
    particle.position.set(
        car.position.x + (Math.random() - 0.5) * 1.2,
        car.position.y + 0.6 + Math.random() * 0.6,
        car.position.z + (Math.random() - 0.5) * 1
    );
    
    particle.lookAt(camera.position);
    
    particle.userData = {
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.25,
            0.15 + Math.random() * 0.15,
            -0.15
        ),
        life: 1.0,
        maxLife: 1.0,
        type: 'smoke'
    };
    
    scene.add(particle);
    smokeParticles.push(particle);
}

function createFireParticle() {
    const size = 0.25 + Math.random() * 0.2;
    const geometry = new THREE.PlaneGeometry(size, size);
    
    const fireColors = [0xff4500, 0xff6600, 0xff8800, 0xffaa00, 0xffcc00];
    const color = fireColors[Math.floor(Math.random() * fireColors.length)];
    
    const material = new THREE.MeshBasicMaterial({ 
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.8,
        map: fireTexture,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });
    
    const particle = new THREE.Mesh(geometry, material);
    
    particle.position.set(
        car.position.x + (Math.random() - 0.5) * 1.8,
        car.position.y + Math.random() * 1.2,
        car.position.z + (Math.random() - 0.5) * 2.5
    );
    
    particle.lookAt(camera.position);
    
    particle.userData = {
        velocity: new THREE.Vector3(
            (Math.random() - 0.5) * 0.4,
            0.3 + Math.random() * 0.4,
            (Math.random() - 0.5) * 0.4
        ),
        life: 1.0,
        maxLife: 1.0,
        type: 'fire'
    };
    
    scene.add(particle);
    fireParticles.push(particle);
}

function updateParticles() {
    // Update exhaust particles
    for (let i = exhaustParticles.length - 1; i >= 0; i--) {
        const p = exhaustParticles[i];
        p.position.add(p.userData.velocity);
        p.userData.life -= 0.025;
        
        const lifeRatio = p.userData.life / p.userData.maxLife;
        p.material.opacity = lifeRatio * 0.6;
        p.scale.setScalar(1 + (1 - lifeRatio) * 2);
        p.lookAt(camera.position);
        
        if (p.userData.life <= 0) {
            scene.remove(p);
            exhaustParticles.splice(i, 1);
        }
    }
    
    // Update smoke particles
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.position.add(p.userData.velocity);
        p.userData.velocity.x *= 0.98; // Slow down horizontal movement
        p.userData.life -= 0.012;
        
        const lifeRatio = p.userData.life / p.userData.maxLife;
        p.material.opacity = lifeRatio * 0.4;
        p.scale.setScalar(1 + (1 - lifeRatio) * 3);
        p.lookAt(camera.position);
        
        if (p.userData.life <= 0) {
            scene.remove(p);
            smokeParticles.splice(i, 1);
        }
    }
    
    // Update fire particles
    for (let i = fireParticles.length - 1; i >= 0; i--) {
        const p = fireParticles[i];
        p.position.add(p.userData.velocity);
        p.userData.life -= 0.035;
        
        const lifeRatio = p.userData.life / p.userData.maxLife;
        p.material.opacity = lifeRatio * 0.8;
        p.scale.setScalar(1 + (1 - lifeRatio) * 2.5);
        p.lookAt(camera.position);
        
        // Color shift from yellow to red
        if (lifeRatio < 0.5) {
            p.material.color.setHSL(0.05 + (1 - lifeRatio) * 0.05, 1, 0.5);
        }
        
        if (p.userData.life <= 0) {
            scene.remove(p);
            fireParticles.splice(i, 1);
        }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    animationId = requestAnimationFrame(animate);

    if (gameState.isPlaying) {
        updateGame();
    }

    renderer.render(scene, camera);
}

function updateGame() {
    // Calculate FPS
    const currentTime = performance.now();
    const delta = currentTime - gameState.lastFrameTime;
    gameState.lastFrameTime = currentTime;
    gameState.fps = Math.round(1000 / delta);

    // Update particles
    updateParticles();
    
    // Generate exhaust particles (more when nitro is active)
    if (gameState.speed > 10) {
        const exhaustRate = gameState.nitroActive ? 3 : 1;
        for (let i = 0; i < exhaustRate; i++) {
            if (Math.random() < 0.3) {
                createExhaustParticle();
            }
        }
    }
    
    // Generate smoke particles based on damage level
    const smokeRate = Math.floor((100 - gameState.health) / 10);
    for (let i = 0; i < smokeRate; i++) {
        if (Math.random() < 0.2) {
            createSmokeParticle();
        }
    }
    
    // Generate fire particles when damage is high (near explosion)
    if (gameState.health <= 20) {
        const fireRate = Math.floor((20 - gameState.health) / 5);
        for (let i = 0; i < fireRate; i++) {
            if (Math.random() < 0.4) {
                createFireParticle();
            }
        }
    }
    
    // Move road segments
    gameState.roadSegments.forEach(seg => {
        seg.position.z += gameState.speed * 0.01;
        if (seg.position.z > 20) seg.position.z = -480;
    });

    gameState.trees.forEach(tree => {
        tree.position.z += gameState.speed * 0.012;
        if (tree.position.z > 35) {
            tree.position.z = -560 - Math.random() * 40;
            tree.position.x = tree.userData.side * (14 + Math.random() * 26);
        }
    });    

    // Move obstacles
    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
        const obstacle = gameState.obstacles[i];
        obstacle.position.z += gameState.speed * 0.01;

        // Check collision
        if (obstacle.position.z > 8 && obstacle.position.z < 12) {
            const distance = Math.abs(obstacle.position.x - car.position.x);
            if (distance < 2) {
                // Collision based on type
                const type = obstacle.userData.type;
                if (type === 'turbo') {
                    gameState.turboPoints += 10;
                    const oldHealth = gameState.health;
                    gameState.health = Math.min(100, gameState.health + 5);
                    playGreenSound();
                    // Remove some smoke particles when damage is reduced
                    if (gameState.health > oldHealth) {
                        const particlesToRemove = Math.floor((gameState.health - oldHealth) / 2);
                        for (let i = 0; i < particlesToRemove && smokeParticles.length > 0; i++) {
                            const p = smokeParticles.pop();
                            scene.remove(p);
                        }
                    }
                } else if (type === 'gold') {
                    gameState.goldPoints += 10;
                    playYellowSound();
                } else if (type === 'damage') {
                    gameState.health -= 20;
                    // Immediately reduce actual speed by 15%
                    gameState.speed *= 0.85;
                    playRedSound();
                    // Check if car explodes
                    if (gameState.health <= 0) {
                        gameState.health = 0;
                        endGame();
                        return;
                    }
                }
                scene.remove(obstacle);
                gameState.obstacles.splice(i, 1);
            }
        }

        // Remove if passed
        if (obstacle.position.z > 30) {
            scene.remove(obstacle);
            gameState.obstacles.splice(i, 1);
        }
    }

    // Spawn new obstacles
    if (Math.random() < 0.02 * (gameState.speed / 50)) {
        createObstacle();
    }

    // Update car position based on yaw
    const targetX = gameState.yaw * 10;
    car.position.x += (targetX - car.position.x) * 0.1;
    car.rotation.z = -gameState.yaw * 0.3;
    

    


    // Wall collision detection
    const isPortrait = window.innerHeight > window.innerWidth;
    const WALL_LEFT = isPortrait ? -5 : -7;
    const WALL_RIGHT = isPortrait ? 5 : 7;
    const now = Date.now();

    // Prevent car from going through walls
    if (car.position.x < WALL_LEFT) {
        car.position.x = WALL_LEFT;
    } else if (car.position.x > WALL_RIGHT) {
        car.position.x = WALL_RIGHT;
    }

    // Check if car is touching wall
    if (car.position.x <= WALL_LEFT || car.position.x >= WALL_RIGHT) {
        if (!gameState.wallTouching) {
            gameState.wallTouching = true;
            gameState.wallTouchStart = now;
            gameState.lastWallDamage = now;
            playWallFrictionSound();
        } else {
            if (now - gameState.lastWallDamage >= 100) {
                gameState.health = Math.max(0, gameState.health - 2);
                gameState.lastWallDamage = now;
                if (gameState.health % 20 === 0 || gameState.health <= 0) {
                    playWallFrictionSound();
                    createWallFrictionParticles(car.position.x <= WALL_LEFT ? WALL_LEFT : WALL_RIGHT);
                }
                if (gameState.health <= 0) {
                    endGame();
                    return;
                }
            }
        }
    } else {
        gameState.wallTouching = false;
        gameState.wallTouchStart = null;
    }

    // Apply nitro - boost gameState.speed directly
    if (gameState.nitroActive) {
        const turboMax = CAR_CONFIGS[gameState.selectedCar] ? CAR_CONFIGS[gameState.selectedCar].turboMaxSpeed : 350;
        gameState.speed = Math.min(turboMax, gameState.speed + 0.5);
    }
    let currentSpeed = gameState.speed;

    // Update distance
    gameState.distance += currentSpeed * 0.01;

    // Calculate total score
    gameState.score = gameState.goldPoints + gameState.turboPoints + Math.round(gameState.distance / 10);

    // Update HUD
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('damageLevel').textContent = gameState.health;
    document.getElementById('turboPoints').textContent = gameState.turboPoints;
    document.getElementById('turboThreshold').textContent = gameState.turboThreshold;
    document.getElementById('fps').textContent = gameState.fps;
    
    // Update turbo bar
    const turboFill = document.getElementById('turboFill');
    if (turboFill) {
        const percentage = (gameState.turboPoints / gameState.turboThreshold) * 100;
        turboFill.style.width = percentage + '%';
        if (gameState.turboPoints >= gameState.turboThreshold) {
            turboFill.classList.add('full');
        } else {
            turboFill.classList.remove('full');
        }
    }
    document.getElementById('distance').textContent = Math.round(gameState.distance) + 'm';

    // Update speedometer (optimized)
    updateSpeedometer(currentSpeed);
}


function playWallFrictionSound() {
    if (!audioContext) return;
    const bufferSize = audioContext.sampleRate * 0.8;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        const noise = (Math.random() * 2 - 1);
        const sawtooth = (t * 10) % 2 - 1;
        data[i] = (noise * 0.7 + sawtooth * 0.3) * 0.8;
    }
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const distortion = audioContext.createWaveShaper();
    function makeDistortionCurve(amount) {
        const k = typeof amount === 'number' ? amount : 50;
        const n_samples = 44100;
        const curve = new Float32Array(n_samples);
        const deg = Math.PI / 180;
        for (let i = 0; i < n_samples; i++) {
            const x = i * 2 / n_samples - 1;
            curve[i] = (3 + k) * x * 20 * deg / (Math.PI + k * Math.abs(x));
        }
        return curve;
    }
    distortion.curve = makeDistortionCurve(100);
    distortion.oversample = '4x';
    source.buffer = buffer;
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(1000, audioContext.currentTime);
    filter.Q.value = 10;
    gainNode.gain.setValueAtTime(0.5, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    source.connect(distortion);
    distortion.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);
    source.start();
}

function createWallFrictionParticles(wallX) {
    for (let i = 0; i < 10; i++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(3);
        positions[0] = wallX + (Math.random() - 0.5) * 0.5;
        positions[1] = 0.5 + Math.random() * 0.5;
        positions[2] = car.position.z + (Math.random() - 0.5) * 2;
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({
            color: 0xffaa00,
            size: 0.3,
            transparent: true,
            opacity: 1
        });
        const particle = new THREE.Points(geometry, material);
        scene.add(particle);
        const velocity = {
            x: (wallX < 0 ? 1 : -1) * Math.random() * 0.3,
            y: Math.random() * 0.3,
            z: -gameState.speed * 0.02
        };
        setTimeout(() => {
            scene.remove(particle);
            geometry.dispose();
            material.dispose();
        }, 100);
        let frame = 0;
        const animateParticle = () => {
            if (frame < 30) {
                const positions = particle.geometry.attributes.position.array;
                positions[0] += velocity.x;
                positions[1] += velocity.y;
                positions[2] += velocity.z;
                particle.geometry.attributes.position.needsUpdate = true;
                material.opacity = 1 - (frame / 30);
                frame++;
                requestAnimationFrame(animateParticle);
            }
        };
        animateParticle();
    }
}

// Camera toggle (Yakin / Uzak)
function toggleCameraPreset() {
    const btn = document.getElementById('toggleCamera');
    if (gameState.cameraPreset === 1) {
        gameState.cameraPreset = 2;
        camera.position.set(0, 7, 14);
        camera.lookAt(0, 0, -2);
        if (btn) btn.textContent = '\u{1F4F7} Uzak';
    } else {
        gameState.cameraPreset = 1;
        camera.position.set(0, 5, 12);
        camera.lookAt(0, 0.5, -3);
        if (btn) btn.textContent = '\u{1F4F7} Yakin';
    }
}

// Make toggleCameraPreset globally accessible
window.toggleCameraPreset = toggleCameraPreset;

// Optimized speedometer update (only when speed changes)
function updateSpeedometer(currentSpeed) {
    const speed = Math.round(currentSpeed);
    if (Math.abs(speed - gameState.lastSpeed) < 1) return;
    gameState.lastSpeed = speed;
    const speedMain = document.getElementById('speedMain');
    if (!speedMain) return;
    speedMain.textContent = speed;
    let newClass = '';
    if (speed < 200) { newClass = 'speed-low'; }
    else if (speed < 300) { newClass = 'speed-medium'; }
    else { newClass = 'speed-high'; }
    if (newClass !== gameState.lastSpeedClass) {
        speedMain.className = 'speed-value ' + newClass;
        gameState.lastSpeedClass = newClass;
    }
}

// MediaPipe Face Mesh Setup
async function initMediaPipe() {
    try {
        faceMesh = new FaceMesh({locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }});

        faceMesh.setOptions({
            maxNumFaces: 1,
            refineLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        faceMesh.onResults(onFaceResults);

        // Start camera
        await startCamera();
        
        loadingEl.style.display = 'none';
        startButton.classList.remove('hidden');
    } catch (error) {
        console.error('MediaPipe initialization error:', error);
        loadingEl.innerHTML = '<p style="color: red;">Hata: Kamera yüklenemedi</p>';
    }
}

async function startCamera() {
    try {
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: 640, height: 480 }
        });
        video.srcObject = stream;
        
        video.addEventListener('loadeddata', () => {
            detectFace();
        });
    } catch (error) {
        console.error('Camera access error:', error);
        loadingEl.innerHTML = '<p style="color: red;">Hata: Kameraya erişilemedi</p>';
    }
}

async function detectFace() {
    if (!faceMesh || !video) return;

    await faceMesh.send({image: video});
    requestAnimationFrame(detectFace);
}

function onFaceResults(results) {
    if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Use only upper face landmarks to focus on head movement, not body
        const forehead = landmarks[10];
        const foreheadUpper = landmarks[151]; // Upper forehead
        const leftEyebrow = landmarks[70];
        const rightEyebrow = landmarks[300];
        const leftEye = landmarks[33];
        const rightEye = landmarks[263];
        const noseBridge = landmarks[6];
        const noseTip = landmarks[1];
        
        // Calculate upper face center (same for both yaw and pitch)
        const upperFaceCenterX = (leftEyebrow.x + rightEyebrow.x + leftEye.x + rightEye.x) / 4;
        const upperFaceCenterY = (forehead.y * 0.7 + foreheadUpper.y * 0.3 + noseBridge.y * 0.3) / 1.3;
        
        // Calculate face size for normalization
        const faceHeight = Math.abs(forehead.y - noseBridge.y);
        const faceWidth = Math.abs(rightEyebrow.x - leftEyebrow.x);
        
        // Yaw: Use nose tip position directly (simplified)
        // PERFECT YAW SETTINGS: nose tip directly, 2.5x sensitivity, center 0.5
        const yawSensitivity = gameState.calibrationData ? gameState.calibrationData.yawSensitivity * 2.5 : 50; // 2.5x sensitivity
        const yaw = (0.5 - noseTip.x) * yawSensitivity; // Center is 0.5
        
        // Pitch: Use nose tip relative to upper face center (original method)
        const pitchSensitivity = gameState.calibrationData ? gameState.calibrationData.pitchSensitivity : 25;
        const pitch = (noseTip.y - upperFaceCenterY) / faceHeight * pitchSensitivity;

        if (!gameState.isCalibrated) {
            // Collect calibration samples
            gameState.calibrationSamples.push({ yaw, pitch });
            
            // Keep last 90 samples (about 3 seconds at 30fps) for better averaging
            if (gameState.calibrationSamples.length > 90) {
                gameState.calibrationSamples.shift();
            }
        } else {
            // Apply smooth filtering (low-pass filter)
            const alpha = 0.3; // Lower = more smoothing (stabilize)
            gameState.smoothedYaw = alpha * yaw + (1 - alpha) * gameState.smoothedYaw;
            gameState.smoothedPitch = alpha * pitch + (1 - alpha) * gameState.smoothedPitch;
            
            // Use calibrated values with smoothing
            const rawYaw = gameState.smoothedYaw - gameState.baseYaw;
            const rawPitch = gameState.smoothedPitch - gameState.basePitch;
            
            // Apply deadzone to reduce jitter (higher to prevent sticking)
            const deadzone = 0.05; // Higher deadzone to prevent sticking
            gameState.yaw = Math.max(-1, Math.min(1, 
                Math.abs(rawYaw) > deadzone ? rawYaw : 0
            ));
            gameState.pitch = Math.max(-1, Math.min(1, 
                Math.abs(rawPitch) > deadzone ? rawPitch : 0
            ));
            
            // Map pitch to target speed (inverted: head up = faster)
            gameState.targetSpeed = Math.max(0, Math.min(gameState.maxSpeed, 
                (1 - gameState.pitch) * 160
            ));
            
            // Gradually accelerate/decelerate to target speed
            if (gameState.speed < gameState.targetSpeed) {
                gameState.speed = Math.min(gameState.targetSpeed, gameState.speed + gameState.acceleration);
            } else if (gameState.speed > gameState.targetSpeed) {
                gameState.speed = Math.max(gameState.targetSpeed, gameState.speed - gameState.acceleration);
            }
            


            // Update debug values
        }

        // Detect eye blink for nitro
        const leftEyeTop = landmarks[159];
        const leftEyeBottom = landmarks[145];
        const rightEyeTop = landmarks[386];
        const rightEyeBottom = landmarks[374];
        
        const leftEyeOpen = Math.abs(leftEyeTop.y - leftEyeBottom.y);
        const rightEyeOpen = Math.abs(rightEyeTop.y - rightEyeBottom.y);
        
        // Adjusted blink threshold
        if ((leftEyeOpen < 0.015 || rightEyeOpen < 0.015) && gameState.turboPoints >= gameState.turboThreshold && gameState.nitroTimer <= 0) {
            gameState.nitroActive = true;
            gameState.nitroTimer = gameState.nitroDuration;
            gameState.turboPoints = 0; // Turbo puanini tuket
            video.classList.add('nitro-active');
        }
        
        // Decrease nitro timer
        if (gameState.nitroTimer > 0) {
            gameState.nitroTimer -= 1/60; // Assuming 60 FPS
            if (gameState.nitroTimer <= 0) {
                gameState.nitroActive = false;
                gameState.nitroTimer = 0;
                video.classList.remove('nitro-active');
            }
        }
        
        // Force nitro off if threshold not met (double check)
        if (gameState.turboPoints < gameState.turboThreshold) {
            gameState.nitroActive = false;
            gameState.nitroTimer = 0;
            video.classList.remove('nitro-active');
        }
    }
}


// Car selection with unlock system
const CAR_UNLOCK_SCORES = {
    standard: 0,
    fast: 1000,
    super: 2000
};

function getBestScore() {
    return parseInt(localStorage.getItem('faceracer_bestScore') || '0');
}

function saveBestScore(score) {
    const best = getBestScore();
    if (score > best) {
        localStorage.setItem('faceracer_bestScore', score.toString());
        return true;
    }
    return false;
}

function isCarUnlocked(carType) {
    return getBestScore() >= CAR_UNLOCK_SCORES[carType];
}

function selectCar(carType) {
    if (!isCarUnlocked(carType)) return;
    gameState.selectedCar = carType;
    gameState.selectedCarColor = null;  // Reset custom color
    createCar();
    updateCarSelection();
    // Scale up car for preview
    if (car) {
        car.scale.set(1.5, 1.5, 1.5);
    }
}

function setCarColor(color) {
    gameState.selectedCarColor = color;
    createCar();  // Recreate car with new color
    if (car) {
        car.scale.set(1.5, 1.5, 1.5);  // Keep scaled up
    }
    updateCarSelection();  // Update button colors
}

window.setCarColor = setCarColor;  // Make globally accessible

function updateCarSelection() {
    const bestScore = getBestScore();
    document.querySelectorAll('.car-select-btn').forEach(btn => {
        const type = btn.dataset.car;
        const needed = CAR_UNLOCK_SCORES[type];
        const unlocked = bestScore >= needed;
        const selected = gameState.selectedCar === type;

        btn.classList.toggle('car-locked', !unlocked);
        btn.classList.toggle('car-selected', selected);
        btn.style.opacity = unlocked ? '1' : '0.4';
        btn.style.cursor = unlocked ? 'pointer' : 'not-allowed';

        // Update button border color based on selected car color
        if (selected && gameState.selectedCarColor) {
            const colorHex = gameState.selectedCarColor.toString(16).padStart(6, '0');
            btn.style.borderColor = '#' + colorHex;
            btn.style.background = `rgba(${(gameState.selectedCarColor >> 16) & 255}, ${(gameState.selectedCarColor >> 8) & 255}, ${gameState.selectedCarColor & 255}, 0.15)`;
        } else if (selected) {
            // Default colors
            const defaultColors = CAR_CONFIGS.defaultColors[type];
            const colorHex = defaultColors.toString(16).padStart(6, '0');
            btn.style.borderColor = '#' + colorHex;
        }


        const lockEl = btn.querySelector('.car-lock-text');
        if (lockEl) {
            lockEl.textContent = unlocked ? '' : '\u{1F512} ' + needed + ' skor gerekli';
        }
    });
}

// Difficulty selection
function selectDifficulty(difficulty) {
    console.log('selectDifficulty called, gameState.maxSpeed:', gameState.maxSpeed, 'gameState.acceleration:', gameState.acceleration);
    gameState.difficulty = difficulty;
    difficultyOverlay.classList.add('hidden');
    // Start game directly (calibration already done)
    hud.classList.remove('hidden');
    speedometer.classList.remove('hidden');
    document.getElementById('toggleCamera').classList.remove('hidden');
    toggleControls.classList.remove('hidden');
    video.classList.remove('calibrating');  // Remove calibrating class
    createCar();  // Apply car config (maxSpeed, acceleration)
    gameState.isPlaying = true;
    updateEasyModeButton();
}

// Toggle easy mode
function toggleEasyMode() {
    gameState.difficulty = gameState.difficulty === 'normal' ? 'easy' : 'normal';
    easyModeBtn.classList.remove('hidden');  // Show button when toggled
    updateEasyModeButton();
}

// Update easy mode button text
function updateEasyModeButton() {
    if (gameState.difficulty === 'easy') {
        easyModeBtn.textContent = '🔴 Normal Moda Geç';
        easyModeBtn.style.background = '#ff6b6b';
    } else {
        easyModeBtn.textContent = '🟢 Kolay Moda Geç';
        easyModeBtn.style.background = '#4ecdc4';
    }
}

// Make functions globally accessible
window.selectDifficulty = selectDifficulty;
window.toggleEasyMode = toggleEasyMode;

// Calibration
function startCalibration() {
    startButton.classList.add('hidden');
    calibrationOverlay.classList.remove('hidden');
    
    // Initialize audio
    initAudio();
    
    // Move camera to calibration position
    video.classList.add('calibrating');
    
    // Reset calibration data
    gameState.calibrationSamples = [];
    gameState.calibrationPhase = 0;
    gameState.calibrationRanges = {
        yawMin: 0,
        yawMax: 0,
        pitchMin: 0,
        pitchMax: 0
    };
    
    runCalibrationPhase();
}

function runCalibrationPhase() {
    const phases = [
        { 
            text: 'Yüzünüzü tam ortaya getirin', 
            duration: 2, 
            instruction: 'Dik durun, alnınız çerçevenin tam ortasında olsun',
            type: 'center',
            detail: 'Bu pozisyon referans noktanız olacak'
        },
        { 
            text: 'Kafanızı sağa ve sola hareket ettirin', 
            duration: 3, 
            instruction: '↔️ Kafanızı hafifçe sağa ve sola çevirin',
            type: 'horizontal',
            detail: 'Küçük hareketler yeterli, omuzları hareket ettirmeyin'
        },
        { 
            text: 'Kafanızı yukarı ve aşağı hareket ettirin', 
            duration: 3, 
            instruction: '↕️ Kafanızı hafifçe yukarı ve aşağı eğin',
            type: 'vertical',
            detail: 'Gövdenizi hareket ettirmeden sadece kafayı eğin'
        }
    ];
    
    const currentPhase = phases[gameState.calibrationPhase];
    
    // Update UI with enhanced visualization
    const calibrationContent = document.querySelector('.calibration-content');
    calibrationContent.innerHTML = `
        <h1>🏎️ FaceRacer</h1>
        <p style="font-size: 1.2rem; color: #00ff88; font-weight: bold;">${currentPhase.text}</p>
        <p style="font-size: 0.85rem; color: #ccc; margin-bottom: 6px;">${currentPhase.instruction}</p>
        <p style="font-size: 0.75rem; color: #888; margin-bottom: 12px; font-style: italic;">${currentPhase.detail}</p>
        
        <div class="calibration-visualizer">
            <div class="calibration-grid">
                ${currentPhase.type === 'center' ? `
                    <div class="center-indicator">
                        <div class="center-dot"></div>
                    </div>
                ` : currentPhase.type === 'horizontal' ? `
                    <div class="horizontal-indicator">
                        <div class="arrow left">←</div>
                        <div class="arrow right">→</div>
                    </div>
                ` : `
                    <div class="vertical-indicator">
                        <div class="arrow up">↑</div>
                        <div class="arrow down">↓</div>
                    </div>
                `}
            </div>
        </div>
        
        <div class="calibration-progress">
            <div class="progress-bar">
                ${phases.map((_, i) => `
                    <div class="progress-segment ${i < gameState.calibrationPhase ? 'completed' : ''} ${i === gameState.calibrationPhase ? 'active' : ''}"></div>
                `).join('')}
            </div>
            <div class="progress-text">${gameState.calibrationPhase + 1} / ${phases.length}</div>
        </div>
        
        <div class="countdown" id="countdown">${currentPhase.duration}</div>
    `;
    
    // Add enhanced CSS
    if (!document.getElementById('calibrationStyles')) {
        const style = document.createElement('style');
        style.id = 'calibrationStyles';
        style.textContent = `
            .calibration-visualizer {
                margin: 30px 0;
                padding: 12px;
                background: rgba(0, 255, 136, 0.1);
                border-radius: 15px;
                border: 2px solid #00ff88;
            }
            .calibration-grid {
                width: 200px;
                height: 200px;
                margin: 0 auto;
                position: relative;
            }
            .center-indicator {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            .center-dot {
                width: 40px;
                height: 40px;
                background: #00ff88;
                border-radius: 50%;
                animation: centerPulse 1.5s infinite;
                box-shadow: 0 0 20px #00ff88;
            }
            .horizontal-indicator {
                width: 100%;
                height: 100%;
                display: flex;
                align-items: center;
                justify-content: space-between;
                padding: 0 20px;
            }
            .vertical-indicator {
                width: 100%;
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: space-between;
                padding: 20px 0;
            }
            .arrow {
                font-size: 3rem;
                color: #00ff88;
                animation: arrowBounce 1s infinite;
            }
            .arrow.left { animation-delay: 0s; }
            .arrow.right { animation-delay: 0.5s; }
            .arrow.up { animation-delay: 0s; }
            .arrow.down { animation-delay: 0.5s; }
            @keyframes centerPulse {
                0%, 100% { transform: scale(1); opacity: 1; }
                50% { transform: scale(1.2); opacity: 0.7; }
            }
            @keyframes arrowBounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
            }
            .calibration-progress {
                margin: 25px 0;
            }
            .progress-bar {
                display: flex;
                gap: 8px;
                margin-bottom: 6px;
            }
            .progress-segment {
                flex: 1;
                height: 8px;
                background: #333;
                border-radius: 4px;
                transition: all 0.3s;
            }
            .progress-segment.completed {
                background: #00ff88;
            }
            .progress-segment.active {
                background: #00ff88;
                animation: progressPulse 1s infinite;
            }
            .progress-text {
                text-align: center;
                color: #888;
                font-size: 0.75rem;
            }
            @keyframes progressPulse {
                0%, 100% { opacity: 1; }
                50% { opacity: 0.6; }
            }
        `;
        document.head.appendChild(style);
    }
    
    let countdown = currentPhase.duration;
    const countdownEl = document.getElementById('countdown');
    
    const countdownInterval = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;
        
        if (countdown <= 0) {
            clearInterval(countdownInterval);
            
            // Process phase and move to next (no quality check - time-based)
            processCalibrationPhase();
            gameState.calibrationPhase++;
            
            if (gameState.calibrationPhase < phases.length) {
                gameState.calibrationSamples = [];
                setTimeout(runCalibrationPhase, 200);
            } else {
                finalizeCalibration();
            }
        }
    }, 1000);
}

function checkPhaseQuality(phase) {
    if (gameState.calibrationSamples.length < 20) return false; // Need at least 20 samples (lowered for laptops)
    
    const minMovementThreshold = 0.05; // Lowered threshold for laptops
    
    if (phase === 1) { // Horizontal
        const yawValues = gameState.calibrationSamples.map(s => s.yaw);
        const yawMin = Math.min(...yawValues);
        const yawMax = Math.max(...yawValues);
        const yawRange = yawMax - yawMin;
        return yawRange >= minMovementThreshold;
    } else if (phase === 2) { // Vertical
        const pitchValues = gameState.calibrationSamples.map(s => s.pitch);
        const pitchMin = Math.min(...pitchValues);
        const pitchMax = Math.max(...pitchValues);
        const pitchRange = pitchMax - pitchMin;
        return pitchRange >= minMovementThreshold;
    } else { // Center - check if face is stable (low variance)
        const yawValues = gameState.calibrationSamples.map(s => s.yaw);
        const pitchValues = gameState.calibrationSamples.map(s => s.pitch);
        const yawVariance = Math.max(...yawValues) - Math.min(...yawValues);
        const pitchVariance = Math.max(...pitchValues) - Math.min(...pitchValues);
        // Center should be stable (low movement) - relaxed threshold
        return yawVariance < 0.3 && pitchVariance < 0.3;
    }
}

function showPhaseError(phase) {
    const calibrationContent = document.querySelector('.calibration-content');
    
    let errorMessage = '';
    let retryInstruction = '';
    
    if (phase === 1) {
        errorMessage = 'Yatay hareket yeterli algılanamadı';
        retryInstruction = 'Kafanızı daha belirgin sağa ve sola çevirin';
    } else if (phase === 2) {
        errorMessage = 'Dikey hareket yeterli algılanamadı';
        retryInstruction = 'Kafanızı daha belirgin yukarı ve aşağı eğin';
    } else {
        errorMessage = 'Yüz algılanamadı';
        retryInstruction = 'Yüzünüzü kameraya doğru tutun';
    }
    
    calibrationContent.innerHTML = `
        <h1>⚠️ Kalibrasyon Yetersiz</h1>
        <p style="font-size: 0.85rem; color: #ff6b00;">${errorMessage}</p>
        <p style="font-size: 0.75rem; color: #888; margin-top: 12px;">${retryInstruction}</p>
        <button onclick="retryPhase(${phase})" style="margin-top: 12px; padding: 10px 20px; background: #00ff88; border: none; border-radius: 10px; cursor: pointer; font-size: 0.85rem; font-weight: bold;">
            Tekrar Dene
        </button>
    `;
}

function retryPhase(phase) {
    gameState.calibrationSamples = [];
    // Don't change calibrationPhase - retry the same phase
    runCalibrationPhase();
}

// Make retryPhase globally accessible
window.retryPhase = retryPhase;

// Firebase Leaderboard Functions
function submitScore(score) {
    if (!firebase || !firebase.database()) {
        console.error('Firebase not initialized');
        return;
    }
    
    const playerNameInput = document.getElementById('playerName');
    const playerName = playerNameInput ? playerNameInput.value : 'Anonim';
    
    const leaderboardRef = firebase.database().ref('leaderboard');
    const newScoreRef = leaderboardRef.push();
    
    newScoreRef.set({
        score: score,
        timestamp: Date.now(),
        car: gameState.selectedCar,
        difficulty: gameState.difficulty,
        playerName: playerName
    }).then(() => {
        console.log('Score submitted successfully');
        loadLeaderboard('easy');
        loadLeaderboard('normal');
    }).catch((error) => {
        console.error('Error submitting score:', error);
    });
}

function loadLeaderboard(difficulty = 'normal') {
    if (!firebase || !firebase.database()) {
        console.error('Firebase not initialized');
        return;
    }
    
    const leaderboardRef = firebase.database().ref('leaderboard');
    leaderboardRef.orderByChild('score').limitToLast(10).once('value', (snapshot) => {
        const scores = [];
        snapshot.forEach((childSnapshot) => {
            const score = childSnapshot.val();
            // Filter by difficulty if specified
            if (!difficulty || score.difficulty === difficulty) {
                scores.push(score);
            }
        });
        scores.reverse();
        console.log('Leaderboard loaded (' + difficulty + '):', scores);

        // Update UI - update both leaderboardContent and leaderboardList
        const leaderboardContent = document.getElementById('leaderboardContent');
        const leaderboardList = document.getElementById('leaderboardList');
        const easyLeaderboardList = document.getElementById('easyLeaderboardList');
        const normalLeaderboardList = document.getElementById('normalLeaderboardList');
        
        const htmlContent = scores.length === 0 
            ? '<p style="font-size: 0.9rem; color: #888;">Henüz skor yok</p>'
            : scores.map((score, index) => 
                `<div style="padding: 8px; border-bottom: 1px solid #444; display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-size: 0.9rem; color: #888;">#${index + 1}</span>
                    <div style="text-align: right;">
                        <span style="font-size: 0.9rem; font-weight: bold; color: #00ff88;">${score.score}</span>
                        <span style="font-size: 0.7rem; color: #888; margin-left: 8px;">${score.playerName || 'Anonim'}</span>
                    </div>
                </div>`
            ).join('');
        
        if (leaderboardContent) {
            leaderboardContent.innerHTML = htmlContent;
        }
        if (leaderboardList) {
            leaderboardList.innerHTML = htmlContent;
        }
        if (easyLeaderboardList && difficulty === 'easy') {
            easyLeaderboardList.innerHTML = htmlContent;
        }
        if (normalLeaderboardList && difficulty === 'normal') {
            normalLeaderboardList.innerHTML = htmlContent;
        }
    }).catch((error) => {
        console.error('Error loading leaderboard:', error);
        const errorHtml = '<p style="font-size: 0.9rem; color: #ff0000;">Hata: ' + error.message + '</p>';
        const leaderboardContent = document.getElementById('leaderboardContent');
        const leaderboardList = document.getElementById('leaderboardList');
        const easyLeaderboardList = document.getElementById('easyLeaderboardList');
        const normalLeaderboardList = document.getElementById('normalLeaderboardList');
        if (leaderboardContent) {
            leaderboardContent.innerHTML = errorHtml;
        }
        if (leaderboardList) {
            leaderboardList.innerHTML = errorHtml;
        }
        if (easyLeaderboardList) {
            easyLeaderboardList.innerHTML = errorHtml;
        }
        if (normalLeaderboardList) {
            normalLeaderboardList.innerHTML = errorHtml;
        }
    });
}

// Make functions globally accessible
window.submitScore = submitScore;
window.loadLeaderboard = loadLeaderboard;

function endGame() {
    saveBestScore(gameState.score);
    gameState.isPlaying = false;

    // Play explosion sound
    playExplosionSound();

    // Show game over screen with play again button
    calibrationOverlay.style.display = 'flex';
    calibrationOverlay.classList.remove('hidden');
    hud.style.display = 'none';
    
    // Dim the game canvas
    const canvas = document.getElementById('gameCanvas');
    canvas.style.opacity = '0.3';
    
    // Dim turbo bar
    const turboContainer = document.getElementById('turboBarContainer');
    if (turboContainer) {
        turboContainer.style.opacity = '0.3';
    }
    toggleControls.classList.add('hidden');
    easyModeBtn.classList.remove('hidden');  // Show easy mode button

    const calibrationContent = document.querySelector('.calibration-content');
    const finalScore = gameState.score;

    calibrationContent.innerHTML = `
        <h1>&#128163; Araba Patlad&#305;!</h1>
        <div style="margin: 12px 0; padding: 12px; background: rgba(255, 0, 0, 0.1); border-radius: 10px; border: 1px solid #ff0000;">
            <p style="font-size: 1.2rem; color: #00ff88; margin: 6px 0; font-weight: bold;">&#127942; Skor: ${finalScore}</p>
            <p style="font-size: 0.85rem; color: #ffd700; margin: 6px 0;">&#129001; Alt&#305;n: ${gameState.goldPoints}</p>
            <p style="font-size: 0.85rem; color: #00bfff; margin: 6px 0;">&#128200; Mesafe: ${Math.round(gameState.distance)}m</p>
        </div>

        <div style="margin-bottom: 12px;">
            <p style="color: #aaa; font-size: 0.75rem; margin-bottom: 6px;">Araba Se&#231;:</p>
            <div style="margin-bottom: 8px;">
                <p style="color: #aaa; font-size: 0.7rem; margin-bottom: 4px;">Renk Se&#231;:</p>
                <div style="display: flex; gap: 6px; justify-content: center;">
                    <div onclick="setCarColor(0xff0000)" style="width: 24px; height: 24px; background: #ff0000; border-radius: 50%; cursor: pointer; border: 2px solid #444; transition: all 0.2s;"></div>
                    <div onclick="setCarColor(0x0066ff)" style="width: 24px; height: 24px; background: #0066ff; border-radius: 50%; cursor: pointer; border: 2px solid #444; transition: all 0.2s;"></div>
                    <div onclick="setCarColor(0x00ff00)" style="width: 24px; height: 24px; background: #00ff00; border-radius: 50%; cursor: pointer; border: 2px solid #444; transition: all 0.2s;"></div>
                    <div onclick="setCarColor(0xffff00)" style="width: 24px; height: 24px; background: #ffff00; border-radius: 50%; cursor: pointer; border: 2px solid #444; transition: all 0.2s;"></div>
                    <div onclick="setCarColor(0x9900ff)" style="width: 24px; height: 24px; background: #9900ff; border-radius: 50%; cursor: pointer; border: 2px solid #444; transition: all 0.2s;"></div>
                    <div onclick="setCarColor(0xff6600)" style="width: 24px; height: 24px; background: #ff6600; border-radius: 50%; cursor: pointer; border: 2px solid #444; transition: all 0.2s;"></div>
                </div>
            </div>
            <div style="display: flex; gap: 8px; justify-content: center; flex-wrap: wrap;">
                <button class="car-select-btn car-selected" data-car="standard" onclick="selectCar('standard')" style="background: rgba(0,255,136,0.15); border: 2px solid #00ff88; border-radius: 10px; padding: 6px 10px; cursor: pointer; color: white; min-width: 80px; transition: all 0.2s;">
                    <div style="font-size: 1.2rem;">&#128663;</div>
                    <div style="font-size: 0.75rem; font-weight: bold; color: #00ff88;">Standart</div>
                    <div style="font-size: 0.65rem; color: #888;">320 km/h</div>
                    <div class="car-lock-text" style="font-size: 0.6rem; color: #ff4444; margin-top: 2px;"></div>
                </button>
                <button class="car-select-btn" data-car="fast" onclick="selectCar('fast')" style="background: rgba(68,136,255,0.15); border: 2px solid #4488ff; border-radius: 10px; padding: 6px 10px; cursor: pointer; color: white; min-width: 80px; transition: all 0.2s;">
                    <div style="font-size: 1.2rem;">&#127950;</div>
                    <div style="font-size: 0.75rem; font-weight: bold; color: #4488ff;">H&#305;zl&#305;</div>
                    <div style="font-size: 0.65rem; color: #888;">340 km/h</div>
                    <div class="car-lock-text" style="font-size: 0.6rem; color: #ff4444; margin-top: 2px;"></div>
                </button>
                <button class="car-select-btn" data-car="super" onclick="selectCar('super')" style="background: rgba(255,34,68,0.15); border: 2px solid #ff2244; border-radius: 10px; padding: 6px 10px; cursor: pointer; color: white; min-width: 80px; transition: all 0.2s;">
                    <div style="font-size: 1.2rem;">&#127937;</div>
                    <div style="font-size: 0.75rem; font-weight: bold; color: #ff2244;">Super</div>
                    <div style="font-size: 0.65rem; color: #888;">360 km/h</div>
                    <div class="car-lock-text" style="font-size: 0.6rem; color: #ff4444; margin-top: 2px;"></div>
                </button>
            </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; margin: 12px 0;">
            <div id="easyLeaderboard" style="padding: 10px; background: rgba(0,0,0,0.5); border-radius: 10px; border: 1px solid #4ecdc4;">
                <h3 style="color: #4ecdc4; margin-bottom: 8px; font-size: 0.9rem;">&#127942; Kolay Mod</h3>
                <div id="easyLeaderboardList" style="max-height: 120px; overflow-y: auto;">
                    <p style="color: #888; font-size: 0.8rem;">Y&#252;kleniyor...</p>
                </div>
            </div>
            <div id="scoreSubmission" style="padding: 10px; background: rgba(0, 255, 136, 0.1); border-radius: 10px; border: 1px solid #00ff88;">
                <h3 style="color: #00ff88; margin-bottom: 8px;">&#128196; Skorunu Kaydet</h3>
                <input type="text" id="playerName" placeholder="Ad&#305;n&#305;z" maxlength="20" style="width: 100%; padding: 10px; font-size: 0.85rem; border-radius: 5px; border: 1px solid #00ff88; background: rgba(0,0,0,0.5); color: white; margin-bottom: 6px; box-sizing: border-box;">
                <button onclick="submitScore(${finalScore})" style="width: 100%; padding: 8px 16px; background: #00ff88; border: none; border-radius: 5px; cursor: pointer; font-size: 0.85rem; font-weight: bold;">
                    Kaydet
                </button>
                <p id="submitMessage" style="margin-top: 6px; font-size: 0.75rem; color: #888;"></p>
            </div>
            <div id="normalLeaderboard" style="padding: 10px; background: rgba(0,0,0,0.5); border-radius: 10px; border: 1px solid #ff6b6b;">
                <h3 style="color: #ff6b6b; margin-bottom: 8px; font-size: 0.9rem;">&#127942; Normal Mod</h3>
                <div id="normalLeaderboardList" style="max-height: 120px; overflow-y: auto;">
                    <p style="color: #888; font-size: 0.8rem;">Y&#252;kleniyor...</p>
                </div>
            </div>
        </div>

        <button onclick="restartGame()" style="margin-top: 0px; padding: 10px 20px; background: #00ff88; border: none; border-radius: 10px; cursor: pointer; font-size: 1.02rem; font-weight: bold;">
            &#128257; Tekrar Oyna
        </button>
    `;

    updateCarSelection();

    // Load both leaderboards after displaying game over screen
    setTimeout(() => {
        loadLeaderboard('easy');
        loadLeaderboard('normal');
    }, 100);
}function restartGame() {
    // Reset game state (keep calibration, reset difficulty to normal)
    gameState.score = 0;
    gameState.goldPoints = 0;
    gameState.health = 100;
    gameState.turboPoints = 0;
    gameState.turboThreshold = 100;
    gameState.distance = 0;
    gameState.speed = 0;
    gameState.targetSpeed = 0;
    gameState.nitroTimer = 0;
    gameState.difficulty = 'normal'; // Reset to normal mode
    // Don't reset isCalibrated - keep calibration data
    
    // Clear obstacles
    gameState.obstacles.forEach(obs => scene.remove(obs));
    gameState.obstacles = [];
    
    // Clear particles
    exhaustParticles.forEach(p => scene.remove(p));
    exhaustParticles = [];
    smokeParticles.forEach(p => scene.remove(p));
    smokeParticles = [];
    fireParticles.forEach(p => scene.remove(p));
    fireParticles = [];
    
    // Hide game over screen and start game directly
    calibrationOverlay.style.display = 'none';
    hud.style.display = 'block';
    
    // Restore canvas opacity
    const canvas = document.getElementById('gameCanvas');
    canvas.style.opacity = '1';
    
    // Restore turbo bar opacity
    const turboContainer = document.getElementById('turboBarContainer');
    if (turboContainer) {
        turboContainer.style.opacity = '1';
    }
    speedometer.classList.remove('hidden');
    document.getElementById('toggleCamera').classList.remove('hidden');
    toggleControls.classList.remove('hidden');
    video.classList.remove('calibrating');  // Remove calibrating class
    createCar();  // Apply car config
    easyModeBtn.classList.add('hidden');  // Hide easy mode button
    
    gameState.isPlaying = true;
    updateEasyModeButton();
}

// Make restartGame globally accessible
window.restartGame = restartGame;

function processCalibrationPhase() {
    if (gameState.calibrationSamples.length === 0) return;
    
    const avgYaw = gameState.calibrationSamples.reduce((sum, s) => sum + s.yaw, 0) / gameState.calibrationSamples.length;
    const avgPitch = gameState.calibrationSamples.reduce((sum, s) => sum + s.pitch, 0) / gameState.calibrationSamples.length;
    
    // Calculate min/max during movement phases
    if (gameState.calibrationPhase === 1) { // Horizontal
        const yawValues = gameState.calibrationSamples.map(s => s.yaw);
        gameState.calibrationRanges.yawMin = Math.min(...yawValues);
        gameState.calibrationRanges.yawMax = Math.max(...yawValues);
    } else if (gameState.calibrationPhase === 2) { // Vertical
        const pitchValues = gameState.calibrationSamples.map(s => s.pitch);
        gameState.calibrationRanges.pitchMin = Math.min(...pitchValues);
        gameState.calibrationRanges.pitchMax = Math.max(...pitchValues);
    } else { // Center
        gameState.baseYaw = avgYaw;
        gameState.basePitch = avgPitch;
        gameState.smoothedYaw = avgYaw;
        gameState.smoothedPitch = avgPitch;
    }
}

function finalizeCalibration() {
    const yawRange = gameState.calibrationRanges.yawMax - gameState.calibrationRanges.yawMin;
    const pitchRange = gameState.calibrationRanges.pitchMax - gameState.calibrationRanges.pitchMin;
    
    // All phases passed - calculate final calibration data
    gameState.calibrationData = {
        baseYaw: gameState.baseYaw,
        basePitch: gameState.basePitch,
        yawRange: yawRange,
        pitchRange: pitchRange,
        yawSensitivity: yawRange > 0 ? 1.2 / yawRange : 20,
        pitchSensitivity: pitchRange > 0 ? 1.2 / pitchRange : 25
    };
    
    console.log('Calibration complete:', gameState.calibrationData);
    
    const calibrationContent = document.querySelector('.calibration-content');
    calibrationContent.innerHTML = `
        <h1>✅ Kalibrasyon Başarılı!</h1>
        <p style="font-size: 1.1rem; color: #00ff88;">Mükemmel! Oyun başlıyor...</p>
        <div style="margin-top: 25px; padding: 15px; background: rgba(0, 255, 136, 0.1); border-radius: 10px;">
            <p style="font-size: 0.85rem; color: #888; margin: 5px 0;">
                ✓ Yatay hassasiyet: ${gameState.calibrationData.yawSensitivity.toFixed(2)}
            </p>
            <p style="font-size: 0.85rem; color: #888; margin: 5px 0;">
                ✓ Dikey hassasiyet: ${gameState.calibrationData.pitchSensitivity.toFixed(2)}
            </p>
        </div>
    `;
    
    setTimeout(() => {
        gameState.isCalibrated = true;
        calibrationOverlay.classList.add('hidden');
        video.classList.remove('calibrating');  // Remove calibrating class
        createCar();  // Apply car config
        
        // Restore canvas opacity
        const canvas = document.getElementById('gameCanvas');
        canvas.style.opacity = '1';
        
        // Restore turbo bar opacity
        const turboContainer = document.getElementById('turboBarContainer');
        if (turboContainer) {
            turboContainer.style.opacity = '1';
        }
        if (car) {
            car.scale.set(1, 1, 1);  // Reset scale
        }
        hud.classList.remove('hidden');
        speedometer.classList.remove('hidden');
        document.getElementById('turboBarContainer').classList.remove('hidden');
        document.getElementById('toggleCamera').classList.remove('hidden');
        toggleControls.classList.remove('hidden');
        easyModeBtn.classList.add('hidden');  // Hide easy mode button
        gameState.isPlaying = true;
        updateEasyModeButton();
    }, 100);
}

// Event Listeners
startButton.addEventListener('click', startCalibration);
toggleControls.addEventListener('click', () => {
    document.getElementById("controlsPanel").style.display = document.getElementById("controlsPanel").style.display === 'none' ? 'block' : 'none';
});

// Initialize
initThreeJS();
initMediaPipe();
