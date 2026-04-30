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
    goldPoints: 0,
    health: 100,
    turboPoints: 0,
    turboThreshold: 100,
    distance: 0,
    targetSpeed: 0,
    acceleration: 1.5, // DÜZELTME: 0.2'den 1.5'e
    nitroTimer: 0, // Turbo süresi sayacı
    nitroDuration: 5, // Turbo süresi (saniye)
    difficulty: 'normal', // 'normal' veya 'easy'
    wallTouching: false,
    wallTouchStart: null,
    lastWallDamage: 0,
    selectedCar: 'standard',
    selectedCarColor: null,
    cameraPreset: 1,
    lastSpeed: -1,
    lastSpeedClass: ''
};

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
        acceleration: 1.5,
        color: 0x00ff88,
        topColor: 0x00cc6a
    },
    fast: {
        name: 'Hizli',
        maxSpeed: 340,
        turboMaxSpeed: 370,
        acceleration: 1.65,
        color: 0x4488ff,
        topColor: 0x2266dd
    },
    super: {
        name: 'Super',
        maxSpeed: 360,
        turboMaxSpeed: 390,
        acceleration: 1.8,
        color: 0xff2244,
        topColor: 0xcc1133
    }
};

let scene, camera, renderer, car, road;
let animationId;
let playStartedAtMs = 0;

// Particle systems
let exhaustParticles = [];
let smokeParticles = [];
let fireParticles = [];
let faceMesh;
let cameraUtils;
let audioContext;

function isMobileCalibrationDevice() {
    return window.innerWidth <= 768 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function getCalibrationProfile() {
    if (isMobileCalibrationDevice()) {
        return {
            yawMultiplier: 1.65,
            pitchMultiplier: 0.82,
            smoothingAlpha: 0.18,
            deadzone: 0.08,
            sampleLimit: 135,
            minSamples: 30,
            minMovementThreshold: 0.035,
            centerStabilityThreshold: 0.42,
            centerDuration: 3,
            movementDuration: 4,
            cameraWidth: 480,
            cameraHeight: 640,
            blinkThreshold: 0.012
        };
    }
    return {
        yawMultiplier: 2.5,
        pitchMultiplier: 1,
        smoothingAlpha: 0.3,
        deadzone: 0.05,
        sampleLimit: 90,
        minSamples: 20,
        minMovementThreshold: 0.05,
        centerStabilityThreshold: 0.3,
        centerDuration: 2,
        movementDuration: 3,
        cameraWidth: 640,
        cameraHeight: 480,
        blinkThreshold: 0.015
    };
}

function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
}

function playGreenSound() {
    if (!audioContext) return;
    const o1 = audioContext.createOscillator();
    const o2 = audioContext.createOscillator();
    const g = audioContext.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(523, audioContext.currentTime);
    o1.frequency.exponentialRampToValueAtTime(1047, audioContext.currentTime + 0.1);
    o2.type = 'sine';
    o2.frequency.setValueAtTime(659, audioContext.currentTime);
    o2.frequency.exponentialRampToValueAtTime(1319, audioContext.currentTime + 0.1);
    g.gain.setValueAtTime(0.2, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    o1.connect(g); o2.connect(g); g.connect(audioContext.destination);
    o1.start(); o2.start();
    o1.stop(audioContext.currentTime + 0.2);
    o2.stop(audioContext.currentTime + 0.2);
}

function playYellowSound() {
    if (!audioContext) return;
    const o1 = audioContext.createOscillator();
    const o2 = audioContext.createOscillator();
    const g = audioContext.createGain();
    o1.type = 'sine';
    o1.frequency.setValueAtTime(1568, audioContext.currentTime);
    o1.frequency.exponentialRampToValueAtTime(3136, audioContext.currentTime + 0.05);
    o2.type = 'sine';
    o2.frequency.setValueAtTime(2093, audioContext.currentTime);
    o2.frequency.exponentialRampToValueAtTime(4186, audioContext.currentTime + 0.05);
    g.gain.setValueAtTime(0.2, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
    o1.connect(g); o2.connect(g); g.connect(audioContext.destination);
    o1.start(); o2.start();
    o1.stop(audioContext.currentTime + 0.15);
    o2.stop(audioContext.currentTime + 0.15);
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
    const g = audioContext.createGain();
    const f = audioContext.createBiquadFilter();
    source.buffer = buffer;
    f.type = 'bandpass';
    f.frequency.setValueAtTime(2000, audioContext.currentTime);
    f.frequency.exponentialRampToValueAtTime(500, audioContext.currentTime + 0.3);
    f.Q.value = 1;
    g.gain.setValueAtTime(0.4, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
    source.connect(f); f.connect(g); g.connect(audioContext.destination);
    source.start();
}

function playExplosionSound() {
    if (!audioContext) return;
    const bufferSize = audioContext.sampleRate * 0.8;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
    }
    const source = audioContext.createBufferSource();
    const g = audioContext.createGain();
    const f = audioContext.createBiquadFilter();
    source.buffer = buffer;
    f.type = 'lowpass';
    f.frequency.setValueAtTime(2000, audioContext.currentTime);
    f.frequency.exponentialRampToValueAtTime(50, audioContext.currentTime + 0.8);
    g.gain.setValueAtTime(0.6, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    source.connect(f); f.connect(g); g.connect(audioContext.destination);
    source.start();
}

function playWallFrictionSound() {
    if (!audioContext) return;
    const bufferSize = audioContext.sampleRate * 0.8;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const t = i / bufferSize;
        data[i] = ((Math.random() * 2 - 1) * 0.7 + ((t * 10) % 2 - 1) * 0.3) * 0.8;
    }
    const source = audioContext.createBufferSource();
    const g = audioContext.createGain();
    const f = audioContext.createBiquadFilter();
    const dist = audioContext.createWaveShaper();
    const curve = new Float32Array(44100);
    for (let i = 0; i < 44100; i++) {
        const x = i * 2 / 44100 - 1;
        curve[i] = (3 + 100) * x * 20 * (Math.PI / 180) / (Math.PI + 100 * Math.abs(x));
    }
    dist.curve = curve;
    dist.oversample = '4x';
    source.buffer = buffer;
    f.type = 'highpass';
    f.frequency.setValueAtTime(1000, audioContext.currentTime);
    f.Q.value = 10;
    g.gain.setValueAtTime(0.5, audioContext.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.8);
    source.connect(dist); dist.connect(f); f.connect(g); g.connect(audioContext.destination);
    source.start();
}

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

function initThreeJS() {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87CEEB);
    scene.fog = new THREE.Fog(0x87CEEB, 50, 200);
    camera = new THREE.PerspectiveCamera(getCameraFov(), window.innerWidth / window.innerHeight, 0.1, 1000);
    applyCameraPreset();
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);
    createRoad();
    createCar();
    createEnvironment();
    window.addEventListener('resize', onWindowResize);
    animate();
}

function createRoad() {
    const isPortrait = window.innerHeight > window.innerWidth;
    const roadWidth = isPortrait ? 14 : 20;
    const roadGeometry = new THREE.PlaneGeometry(roadWidth, 500);
    const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.8 });
    road = new THREE.Mesh(roadGeometry, roadMaterial);
    road.rotation.x = -Math.PI / 2;
    road.position.z = -200;
    road.receiveShadow = true;
    scene.add(road);
    for (let i = 0; i < 20; i++) {
        const line = new THREE.Mesh(
            new THREE.PlaneGeometry(0.3, 5),
            new THREE.MeshBasicMaterial({ color: 0xffffff })
        );
        line.rotation.x = -Math.PI / 2;
        line.position.set(0, 0.01, -i * 25);
        scene.add(line);
        gameState.roadSegments.push(line);
    }
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
    if (gameState.selectedCarColor) {
        config = { ...config, color: gameState.selectedCarColor, topColor: gameState.selectedCarColor };
    }
    if (car) scene.remove(car);
    car = new THREE.Group();
    if (gameState.selectedCar === 'super') createSuperCar(config);
    else if (gameState.selectedCar === 'fast') createFastCar(config);
    else createStandardCar(config);
    gameState.maxSpeed = config.maxSpeed;
    gameState.acceleration = config.acceleration;
    car.position.y = 0.5;
    car.scale.set(1, 1, 1);
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
    const body = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.7, 5), new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.6, roughness: 0.15 }));
    body.position.y = 0.35; body.castShadow = true; car.add(body);
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 1.6), new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8, roughness: 0.1 }));
    top.position.y = 0.95; top.position.z = -0.2; top.castShadow = true; car.add(top);
    const spoilerMat = new THREE.MeshStandardMaterial({ color: config.color, metalness: 0.5 });
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.1, 0.6), spoilerMat);
    spoiler.position.set(0, 1.3, 2); car.add(spoiler);
    const standMat = new THREE.MeshStandardMaterial({ color: 0x222222 });
    [[-0.9, 1.05, 2], [0.9, 1.05, 2]].forEach(pos => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 0.1), standMat); s.position.set(...pos); car.add(s);
    });
    const neon = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.05, 4.5), new THREE.MeshStandardMaterial({ color: config.color, emissive: config.color, emissiveIntensity: 0.8, transparent: true, opacity: 0.6 }));
    neon.position.y = 0.02; car.add(neon);
    const scoop = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x111111 }));
    scoop.position.set(0, 0.8, -1.2); car.add(scoop);
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    [[-1.25, 0.15, 0], [1.25, 0.15, 0]].forEach(pos => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.25, 4.2), skirtMat); s.position.set(...pos); car.add(s);
    });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0x666666 });
    [[-0.4, 0.71, 0], [0.4, 0.71, 0]].forEach(pos => {
        const s = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.02, 4.8), stripeMat); s.position.set(...pos); car.add(s);
    });
    addBaseCarDetails(car, config, 2.4, 5);
    addSuperCarDetails(car, config);
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
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200, 500), new THREE.MeshStandardMaterial({ color: 0x228B22 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -0.1; ground.position.z = -200; scene.add(ground);
    gameState.trees = [];
    for (let i = 0; i < 42; i++) {
        createTree(-14 - Math.random() * 26, -i * 14 - Math.random() * 8);
        createTree(14 + Math.random() * 26, -i * 14 - Math.random() * 8);
    }
}

function createTree(x, z) {
    const tree = new THREE.Group();
    const type = Math.floor(Math.random() * 3);
    const scale = 0.85 + Math.random() * 1.35;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.34 * scale, 2.2 * scale, 6), new THREE.MeshStandardMaterial({ color: 0x8B4513 }));
    trunk.position.y = 1.1 * scale; tree.add(trunk);
    const leafColor = [0x1f7a2e, 0x2d9b3f, 0x17612b][type];
    const leavesMat = new THREE.MeshStandardMaterial({ color: leafColor });
    if (type === 0) {
        const l = new THREE.Mesh(new THREE.ConeGeometry(1.25 * scale, 3.1 * scale, 7), leavesMat);
        l.position.y = 3.2 * scale; tree.add(l);
    } else if (type === 1) {
        const l = new THREE.Mesh(new THREE.SphereGeometry(1.25 * scale, 8, 6), leavesMat);
        l.position.y = 3.1 * scale; tree.add(l);
    } else {
        [2.4, 3.25, 4.0].forEach((height, index) => {
            const l = new THREE.Mesh(new THREE.ConeGeometry((1.25 - index * 0.22) * scale, 1.5 * scale, 7), leavesMat);
            l.position.y = height * scale; tree.add(l);
        });
    }
    tree.position.set(x, 0, z);
    tree.castShadow = true;
    tree.userData.side = x < 0 ? -1 : 1;
    scene.add(tree);
    gameState.trees.push(tree);
}

function createObstacle() {
    const rand = Math.random();
    let color, type;
    if (gameState.difficulty === 'easy') {
        if (rand < 0.4172) { color = 0x00ff00; type = 'turbo'; }
        else if (rand < 0.8344) { color = 0xffd700; type = 'gold'; }
        else { color = 0xff0000; type = 'damage'; }
    } else {
        if (rand < 0.3965) { color = 0x00ff00; type = 'turbo'; }
        else if (rand < 0.793) { color = 0xffd700; type = 'gold'; }
        else { color = 0xff0000; type = 'damage'; }
    }
    const obstacle = new THREE.Group();
    const core = new THREE.Mesh(new THREE.BoxGeometry(2, 2, 2), new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.25, roughness: 0.35 }));
    core.castShadow = true; obstacle.add(core);
    addObstacleDetails(obstacle, type, color);
    obstacle.position.set((Math.random() - 0.5) * 14, 1, -200);
    obstacle.userData = { type };
    scene.add(obstacle);
    gameState.obstacles.push(obstacle);
}

function addObstacleDetails(obstacle, type, color) {
    const glowMat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.22 });
    const iconMat = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xffffff, emissiveIntensity: 0.35 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x330000, emissive: 0x220000, emissiveIntensity: 0.25 });
    const halo = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.06, 6, 24), glowMat);
    halo.rotation.x = Math.PI / 2; halo.position.y = 1.05; obstacle.add(halo);
    if (type === 'turbo') {
        const bolt = new THREE.Mesh(new THREE.ConeGeometry(0.38, 1.15, 3), iconMat);
        bolt.rotation.z = -0.35; bolt.position.set(0, 0.25, -1.04); obstacle.add(bolt);
        [-0.55, 0, 0.55].forEach(x => {
            const line = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.08, 0.9), iconMat);
            line.position.set(x, -0.55, 1.04); obstacle.add(line);
        });
    } else if (type === 'gold') {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.12, 18), iconMat);
        coin.rotation.x = Math.PI / 2; coin.position.set(0, 0.12, -1.04); obstacle.add(coin);
        [-0.28, 0.28].forEach(x => {
            const shine = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.8), iconMat);
            shine.rotation.z = x < 0 ? 0.55 : -0.55; shine.position.set(x, 0.14, -1.12); obstacle.add(shine);
        });
    } else {
        [0.75, -0.75].forEach(angle => {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(0.22, 1.35, 0.12), darkMat);
            bar.rotation.z = angle; bar.position.set(0, 0.08, -1.04); obstacle.add(bar);
        });
        const warning = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.8, 3), darkMat);
        warning.rotation.z = Math.PI; warning.position.set(0, -0.7, -1.04); obstacle.add(warning);
    }
}

function createSmokeTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,0.8)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.4)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}

function createFireTexture() {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d');
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,200,1)'); g.addColorStop(0.2, 'rgba(255,200,50,0.9)');
    g.addColorStop(0.5, 'rgba(255,100,0,0.6)'); g.addColorStop(1, 'rgba(255,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
}

const smokeTexture = createSmokeTexture();
const fireTexture = createFireTexture();

function createExhaustParticle() {
    const size = 0.15 + Math.random() * 0.1;
    const material = new THREE.MeshBasicMaterial({
        color: gameState.nitroActive ? new THREE.Color(0x00ffff) : new THREE.Color(0x888888),
        transparent: true, opacity: 0.6, map: smokeTexture,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const particle = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    const exhaustX = Math.random() > 0.5 ? -0.6 : 0.6;
    particle.position.set(car.position.x + exhaustX, car.position.y + 0.3, car.position.z + 2.2);
    particle.lookAt(camera.position);
    particle.userData = {
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.15, Math.random() * 0.15, 0.4 + Math.random() * 0.3),
        life: 1.0, maxLife: 1.0, type: 'exhaust'
    };
    scene.add(particle); exhaustParticles.push(particle);
}

function createSmokeParticle() {
    const size = 0.4 + Math.random() * 0.3;
    const gray = 0.4 + Math.random() * 0.2;
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(gray, gray, gray),
        transparent: true, opacity: 0.4, map: smokeTexture,
        blending: THREE.NormalBlending, depthWrite: false
    });
    const particle = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    particle.position.set(
        car.position.x + (Math.random() - 0.5) * 1.2,
        car.position.y + 0.6 + Math.random() * 0.6,
        car.position.z + (Math.random() - 0.5) * 1
    );
    particle.lookAt(camera.position);
    particle.userData = {
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.25, 0.15 + Math.random() * 0.15, -0.15),
        life: 1.0, maxLife: 1.0, type: 'smoke'
    };
    scene.add(particle); smokeParticles.push(particle);
}

function createFireParticle() {
    const size = 0.25 + Math.random() * 0.2;
    const fireColors = [0xff4500, 0xff6600, 0xff8800, 0xffaa00, 0xffcc00];
    const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(fireColors[Math.floor(Math.random() * fireColors.length)]),
        transparent: true, opacity: 0.8, map: fireTexture,
        blending: THREE.AdditiveBlending, depthWrite: false
    });
    const particle = new THREE.Mesh(new THREE.PlaneGeometry(size, size), material);
    particle.position.set(
        car.position.x + (Math.random() - 0.5) * 1.8,
        car.position.y + Math.random() * 1.2,
        car.position.z + (Math.random() - 0.5) * 2.5
    );
    particle.lookAt(camera.position);
    particle.userData = {
        velocity: new THREE.Vector3((Math.random() - 0.5) * 0.4, 0.3 + Math.random() * 0.4, (Math.random() - 0.5) * 0.4),
        life: 1.0, maxLife: 1.0, type: 'fire'
    };
    scene.add(particle); fireParticles.push(particle);
}

function updateParticles() {
    for (let i = exhaustParticles.length - 1; i >= 0; i--) {
        const p = exhaustParticles[i];
        p.position.add(p.userData.velocity);
        p.userData.life -= 0.025;
        const lr = p.userData.life / p.userData.maxLife;
        p.material.opacity = lr * 0.6;
        p.scale.setScalar(1 + (1 - lr) * 2);
        p.lookAt(camera.position);
        if (p.userData.life <= 0) { scene.remove(p); exhaustParticles.splice(i, 1); }
    }
    for (let i = smokeParticles.length - 1; i >= 0; i--) {
        const p = smokeParticles[i];
        p.position.add(p.userData.velocity);
        p.userData.velocity.x *= 0.98;
        p.userData.life -= 0.012;
        const lr = p.userData.life / p.userData.maxLife;
        p.material.opacity = lr * 0.4;
        p.scale.setScalar(1 + (1 - lr) * 3);
        p.lookAt(camera.position);
        if (p.userData.life <= 0) { scene.remove(p); smokeParticles.splice(i, 1); }
    }
    for (let i = fireParticles.length - 1; i >= 0; i--) {
        const p = fireParticles[i];
        p.position.add(p.userData.velocity);
        p.userData.life -= 0.035;
        const lr = p.userData.life / p.userData.maxLife;
        p.material.opacity = lr * 0.8;
        p.scale.setScalar(1 + (1 - lr) * 2.5);
        p.lookAt(camera.position);
        if (lr < 0.5) p.material.color.setHSL(0.05 + (1 - lr) * 0.05, 1, 0.5);
        if (p.userData.life <= 0) { scene.remove(p); fireParticles.splice(i, 1); }
    }
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.fov = getCameraFov();
    camera.updateProjectionMatrix();
    applyCameraPreset();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    animationId = requestAnimationFrame(animate);
    if (gameState.isPlaying) updateGame();
    renderer.render(scene, camera);
}

function updateGame() {
    updateParticles();

    if (gameState.speed > 10) {
        const exhaustRate = gameState.nitroActive ? 3 : 1;
        for (let i = 0; i < exhaustRate; i++) {
            if (Math.random() < 0.3) createExhaustParticle();
        }
    }

    const smokeRate = Math.floor((100 - gameState.health) / 10);
    for (let i = 0; i < smokeRate; i++) {
        if (Math.random() < 0.2) createSmokeParticle();
    }

    if (gameState.health <= 20) {
        const fireRate = Math.floor((20 - gameState.health) / 5);
        for (let i = 0; i < fireRate; i++) {
            if (Math.random() < 0.4) createFireParticle();
        }
    }

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

    for (let i = gameState.obstacles.length - 1; i >= 0; i--) {
        const obstacle = gameState.obstacles[i];
        obstacle.position.z += gameState.speed * 0.01;

        if (obstacle.position.z > 8 && obstacle.position.z < 12) {
            if (Math.abs(obstacle.position.x - car.position.x) < 2) {
                const type = obstacle.userData.type;
                if (type === 'turbo') {
                    gameState.turboPoints += 10;
                    const oldHealth = gameState.health;
                    gameState.health = Math.min(100, gameState.health + 5);
                    playGreenSound();
                    if (gameState.health > oldHealth) {
                        const toRemove = Math.floor((gameState.health - oldHealth) / 2);
                        for (let j = 0; j < toRemove && smokeParticles.length > 0; j++) {
                            scene.remove(smokeParticles.pop());
                        }
                    }
                } else if (type === 'gold') {
                    gameState.goldPoints += 10;
                    playYellowSound();
                } else if (type === 'damage') {
                    gameState.health -= 20;
                    gameState.speed *= 0.85;
                    playRedSound();
                    if (gameState.health <= 0) { gameState.health = 0; endGame(); return; }
                }
                scene.remove(obstacle);
                gameState.obstacles.splice(i, 1);
                continue;
            }
        }

        if (obstacle.position.z > 30) {
            scene.remove(obstacle);
            gameState.obstacles.splice(i, 1);
        }
    }

    if (Math.random() < 0.02 * (gameState.speed / 50)) createObstacle();

    const targetX = gameState.yaw * 10;
    car.position.x += (targetX - car.position.x) * 0.1;
    car.rotation.z = -gameState.yaw * 0.3;

    const WALL_LEFT = -7;
    const WALL_RIGHT = 7;
    const now = Date.now();

    if (car.position.x < WALL_LEFT) car.position.x = WALL_LEFT;
    else if (car.position.x > WALL_RIGHT) car.position.x = WALL_RIGHT;

    if (car.position.x <= WALL_LEFT || car.position.x >= WALL_RIGHT) {
        if (!gameState.wallTouching) {
            gameState.wallTouching = true;
            gameState.wallTouchStart = now;
            gameState.lastWallDamage = now;
            playWallFrictionSound();
        } else if (now - gameState.lastWallDamage >= 100) {
            gameState.health = Math.max(0, gameState.health - 2);
            gameState.lastWallDamage = now;
            if (gameState.health > 0 && gameState.health % 20 === 0) {
                playWallFrictionSound();
                createWallFrictionParticles(car.position.x <= WALL_LEFT ? WALL_LEFT : WALL_RIGHT);
            }
            if (gameState.health <= 0) { endGame(); return; }
        }
    } else {
        gameState.wallTouching = false;
        gameState.wallTouchStart = null;
    }

    if (gameState.nitroActive) {
        const turboMax = CAR_CONFIGS[gameState.selectedCar] ? CAR_CONFIGS[gameState.selectedCar].turboMaxSpeed : 350;
        gameState.speed = Math.min(turboMax, gameState.speed + 0.5);
    }

    gameState.distance += gameState.speed * 0.01;
    gameState.score = gameState.goldPoints + gameState.turboPoints + Math.round(gameState.distance / 10);

    document.getElementById('score').textContent = gameState.score;
    document.getElementById('damageLevel').textContent = gameState.health;
    document.getElementById('turboPoints').textContent = gameState.turboPoints;
    document.getElementById('turboThreshold').textContent = gameState.turboThreshold;

    const turboFill = document.getElementById('turboFill');
    if (turboFill) {
        turboFill.style.width = Math.min(100, (gameState.turboPoints / gameState.turboThreshold) * 100) + '%';
        turboFill.classList.toggle('full', gameState.turboPoints >= gameState.turboThreshold);
    }
}

function updateSpeedometer(speed) {
    const speedEl = document.getElementById('speedMain');
    if (!speedEl) return;

    const rounded = Math.max(0, Math.round(speed || 0));
    if (rounded === gameState.lastSpeed) return;
    gameState.lastSpeed = rounded;

    speedEl.textContent = String(rounded);

    let cls = 'speed-low';
    if (rounded >= 220) cls = 'speed-high';
    else if (rounded >= 120) cls = 'speed-medium';

    if (cls !== gameState.lastSpeedClass) {
        speedEl.classList.remove('speed-low', 'speed-medium', 'speed-high');
        speedEl.classList.add(cls);
        gameState.lastSpeedClass = cls;
    }
=======
    document.getElementById('distance').textContent = Math.round(gameState.distance) + 'm';
    updateSpeedometer(gameState.speed);
>>>>>>> 3d5ca52fb562068c5cbf29586a14cbdc108941bb
}

function updateSpeedometer(speed) {
    const el = document.getElementById('speedMain');
    if (!el) return;
    const rounded = Math.max(0, Math.round(speed || 0));
    if (rounded === gameState.lastSpeed) return;
    gameState.lastSpeed = rounded;
    el.textContent = String(rounded);
    let cls = rounded >= 220 ? 'speed-high' : rounded >= 120 ? 'speed-medium' : 'speed-low';
    if (cls !== gameState.lastSpeedClass) {
        el.classList.remove('speed-low', 'speed-medium', 'speed-high');
        el.classList.add(cls);
        gameState.lastSpeedClass = cls;
    }
}

function createWallFrictionParticles(wallX) {
    for (let i = 0; i < 10; i++) {
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(3);
        positions[0] = wallX + (Math.random() - 0.5) * 0.5;
        positions[1] = 0.5 + Math.random() * 0.5;
        positions[2] = car.position.z + (Math.random() - 0.5) * 2;
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        const material = new THREE.PointsMaterial({ color: 0xffaa00, size: 0.3, transparent: true, opacity: 1 });
        const particle = new THREE.Points(geometry, material);
        scene.add(particle);
        const velocity = { x: (wallX < 0 ? 1 : -1) * Math.random() * 0.3, y: Math.random() * 0.3, z: -gameState.speed * 0.02 };
        setTimeout(() => { scene.remove(particle); geometry.dispose(); material.dispose(); }, 100);
        let frame = 0;
        const animateParticle = () => {
            if (frame < 30) {
                const pos = particle.geometry.attributes.position.array;
                pos[0] += velocity.x; pos[1] += velocity.y; pos[2] += velocity.z;
                particle.geometry.attributes.position.needsUpdate = true;
                material.opacity = 1 - frame / 30;
                frame++;
                requestAnimationFrame(animateParticle);
            }
        };
        animateParticle();
    }
}

function getCameraFov() {
    return window.innerWidth <= 768 && window.innerHeight > window.innerWidth ? 85 : 75;
}

function applyCameraPreset() {
    if (!camera) return;
    const isMobile = window.innerWidth <= 768;
    const isPortrait = window.innerHeight > window.innerWidth;
    if (gameState.cameraPreset === 2) {
        camera.position.set(0, isMobile && isPortrait ? 8 : isMobile ? 8 : 7, isMobile && isPortrait ? 20 : isMobile ? 18 : 14);
        camera.lookAt(0, 0, -2);
    } else {
        camera.position.set(0, isMobile && isPortrait ? 7 : isMobile ? 6 : 5, isMobile && isPortrait ? 18 : isMobile ? 15 : 12);
        camera.lookAt(0, 0.5, -3);
    }
}

function toggleCameraPreset() {
    const btn = document.getElementById('toggleCamera');
    gameState.cameraPreset = gameState.cameraPreset === 1 ? 2 : 1;
    applyCameraPreset();
    if (btn) btn.textContent = gameState.cameraPreset === 2 ? '📷 Uzak' : '📷 Yakın';
}
window.toggleCameraPreset = toggleCameraPreset;

async function initMediaPipe() {
    try {
        faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        faceMesh.onResults(onFaceResults);
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
        const profile = getCalibrationProfile();
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: profile.cameraWidth, height: profile.cameraHeight }
        });
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => detectFace());
    } catch (error) {
        console.error('Camera access error:', error);
        loadingEl.innerHTML = '<p style="color: red;">Hata: Kameraya erişilemedi</p>';
    }
}

async function detectFace() {
    if (!faceMesh || !video) return;
    await faceMesh.send({ image: video });
    requestAnimationFrame(detectFace);
}

function onFaceResults(results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) return;

    const landmarks = results.multiFaceLandmarks[0];
    const forehead = landmarks[10];
    const foreheadUpper = landmarks[151];
    const leftEyebrow = landmarks[70];
    const rightEyebrow = landmarks[300];
    const leftEye = landmarks[33];
    const rightEye = landmarks[263];
    const noseBridge = landmarks[6];
    const noseTip = landmarks[1];

<<<<<<< HEAD
        if (!gameState.isCalibrated) {
            // Collect calibration samples
            gameState.calibrationSamples.push({ yaw, pitch });
            
            // Keep latest samples for stable averaging
            if (gameState.calibrationSamples.length > calibrationProfile.sampleLimit) {
                gameState.calibrationSamples.shift();
            }
        } else {
            // Apply smooth filtering (low-pass filter)
            const alpha = calibrationProfile.smoothingAlpha; // Lower = more smoothing (stabilize)
            gameState.smoothedYaw = alpha * yaw + (1 - alpha) * gameState.smoothedYaw;
            gameState.smoothedPitch = alpha * pitch + (1 - alpha) * gameState.smoothedPitch;
            
            // Use calibrated values with smoothing
            const rawYaw = gameState.smoothedYaw - gameState.baseYaw;
            const rawPitch = gameState.smoothedPitch - gameState.basePitch;
            
            // Apply deadzone to reduce jitter
            const deadzone = calibrationProfile.deadzone;
            gameState.yaw = Math.max(-1, Math.min(1, 
                Math.abs(rawYaw) > deadzone ? rawYaw : 0
            ));
            gameState.pitch = Math.max(-1, Math.min(1, 
                Math.abs(rawPitch) > deadzone ? rawPitch : 0
            ));
            
            
            // DÜZELTME: Minimum hız garantisi — araba asla durmasın
            const normalizedPitch = Math.max(-1, Math.min(1, gameState.pitch));
            gameState.targetSpeed = Math.max(
                30, // minimum 30 km/h
                Math.min(gameState.maxSpeed, (1 - normalizedPitch) * 160)
            );

            // Kademeli hızlanma/yavaşlama
            if (gameState.speed < gameState.targetSpeed) {
                gameState.speed = Math.min(gameState.targetSpeed, gameState.speed + gameState.acceleration);
            } else if (gameState.speed > gameState.targetSpeed) {
                gameState.speed = Math.max(gameState.targetSpeed, gameState.speed - gameState.acceleration);
            }

    const upperFaceCenterY = (forehead.y * 0.7 + foreheadUpper.y * 0.3 + noseBridge.y * 0.3) / 1.3;
    const faceHeight = Math.abs(forehead.y - noseBridge.y);

    const profile = getCalibrationProfile();
    const yawSensitivity = gameState.calibrationData ? gameState.calibrationData.yawSensitivity * profile.yawMultiplier : 50;
    const pitchSensitivity = gameState.calibrationData ? gameState.calibrationData.pitchSensitivity * profile.pitchMultiplier : 25;

    const yaw = (0.5 - noseTip.x) * yawSensitivity;
    const pitch = (noseTip.y - upperFaceCenterY) / faceHeight * pitchSensitivity;

    if (!gameState.isCalibrated) {
        gameState.calibrationSamples.push({ yaw, pitch });
        if (gameState.calibrationSamples.length > profile.sampleLimit) {
            gameState.calibrationSamples.shift();
        }
        return;
    }

    // Göz kırpma — nitro
    const leftEyeOpen = Math.abs(landmarks[159].y - landmarks[145].y);
    const rightEyeOpen = Math.abs(landmarks[386].y - landmarks[374].y);

    if ((leftEyeOpen < profile.blinkThreshold || rightEyeOpen < profile.blinkThreshold)
        && gameState.turboPoints >= gameState.turboThreshold
        && gameState.nitroTimer <= 0) {
        gameState.nitroActive = true;
        gameState.nitroTimer = gameState.nitroDuration;
        gameState.turboPoints = 0;
        video.classList.add('nitro-active');
    }

    if (gameState.nitroTimer > 0) {
        gameState.nitroTimer -= 1 / 60;
        if (gameState.nitroTimer <= 0) {
            gameState.nitroActive = false;
            gameState.nitroTimer = 0;
            video.classList.remove('nitro-active');
        }
    }

    // Turbo puanı yetmiyorsa nitroyu kapat
    if (gameState.turboPoints < gameState.turboThreshold && !gameState.nitroActive) {
        gameState.nitroTimer = 0;
        video.classList.remove('nitro-active');
    }
}

const CAR_UNLOCK_SCORES = { standard: 0, fast: 1000, super: 2000 };

function getBestScore() { return parseInt(localStorage.getItem('faceracer_bestScore') || '0'); }
function saveBestScore(score) {
    if (score > getBestScore()) { localStorage.setItem('faceracer_bestScore', score.toString()); return true; }
    return false;
}
function isCarUnlocked(carType) { return getBestScore() >= CAR_UNLOCK_SCORES[carType]; }

function selectCar(carType) {
    if (!isCarUnlocked(carType)) return;
    gameState.selectedCar = carType;
    gameState.selectedCarColor = null;
    createCar();
    updateCarSelection();
    if (car) car.scale.set(1.5, 1.5, 1.5);
}

function setCarColor(color) {
    gameState.selectedCarColor = color;
    createCar();
    if (car) car.scale.set(1.5, 1.5, 1.5);
    updateCarSelection();
}
window.setCarColor = setCarColor;

function updateCarSelection() {
    const bestScore = getBestScore();
    document.querySelectorAll('.car-select-btn').forEach(btn => {
        const type = btn.dataset.car;
        const unlocked = bestScore >= CAR_UNLOCK_SCORES[type];
        const selected = gameState.selectedCar === type;
        btn.classList.toggle('car-locked', !unlocked);
        btn.classList.toggle('car-selected', selected);
        btn.style.opacity = unlocked ? '1' : '0.4';
        btn.style.cursor = unlocked ? 'pointer' : 'not-allowed';
        if (selected && gameState.selectedCarColor) {
            const hex = gameState.selectedCarColor.toString(16).padStart(6, '0');
            btn.style.borderColor = '#' + hex;
            btn.style.background = `rgba(${(gameState.selectedCarColor >> 16) & 255},${(gameState.selectedCarColor >> 8) & 255},${gameState.selectedCarColor & 255},0.15)`;
        } else if (selected) {
            btn.style.borderColor = '#' + CAR_CONFIGS.defaultColors[type].toString(16).padStart(6, '0');
        }
        const lockEl = btn.querySelector('.car-lock-text');
        if (lockEl) lockEl.textContent = unlocked ? '' : '🔒 ' + CAR_UNLOCK_SCORES[type] + ' skor gerekli';
    });
}

function selectDifficulty(difficulty) {
    gameState.difficulty = difficulty;
    difficultyOverlay.classList.add('hidden');
    hud.classList.remove('hidden');
    speedometer.classList.remove('hidden');
    document.getElementById('turboBarContainer').classList.remove('hidden');
    document.getElementById('toggleCamera').classList.remove('hidden');
    toggleControls.classList.remove('hidden');
    video.classList.remove('calibrating');
    createCar();
    gameState.isPlaying = true;
<<<<<<< HEAD
    playStartedAtMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
=======
    playStartedAtMs = performance.now();
>>>>>>> 3d5ca52fb562068c5cbf29586a14cbdc108941bb
    updateEasyModeButton();
}

function toggleEasyMode() {
    gameState.difficulty = gameState.difficulty === 'normal' ? 'easy' : 'normal';
    easyModeBtn.classList.remove('hidden');
    updateEasyModeButton();
}

function updateEasyModeButton() {
    if (gameState.difficulty === 'easy') {
        easyModeBtn.textContent = '🔴 Normal Moda Geç';
        easyModeBtn.style.background = '#ff6b6b';
    } else {
        easyModeBtn.textContent = '🟢 Kolay Moda Geç';
        easyModeBtn.style.background = '#4ecdc4';
    }
}

window.selectDifficulty = selectDifficulty;
window.toggleEasyMode = toggleEasyMode;

function startCalibration() {
    startButton.classList.add('hidden');
    calibrationOverlay.classList.remove('hidden');
    initAudio();
    video.classList.add('calibrating');
    gameState.calibrationSamples = [];
    gameState.calibrationPhase = 0;
    gameState.calibrationRanges = { yawMin: 0, yawMax: 0, pitchMin: 0, pitchMax: 0 };
    runCalibrationPhase();
}

function runCalibrationPhase() {
    const profile = getCalibrationProfile();
    const phases = [
        { text: 'Yüzünüzü tam ortaya getirin', duration: profile.centerDuration, instruction: 'Dik durun, alnınız çerçevenin tam ortasında olsun', type: 'center', detail: 'Bu pozisyon referans noktanız olacak' },
        { text: 'Kafanızı sağa ve sola hareket ettirin', duration: profile.movementDuration, instruction: '↔️ Kafanızı hafifçe sağa ve sola çevirin', type: 'horizontal', detail: 'Küçük hareketler yeterli, omuzları hareket ettirmeyin' },
        { text: 'Kafanızı yukarı ve aşağı hareket ettirin', duration: profile.movementDuration, instruction: '↕️ Kafanızı hafifçe yukarı ve aşağı eğin', type: 'vertical', detail: 'Gövdenizi hareket ettirmeden sadece kafayı eğin' }
    ];
    const currentPhase = phases[gameState.calibrationPhase];
    const calibrationContent = document.querySelector('.calibration-content');
    calibrationContent.innerHTML = `
        <h1>🏎️ FaceRacer</h1>
        <p style="font-size:1.2rem;color:#00ff88;font-weight:bold;">${currentPhase.text}</p>
        <p style="font-size:0.85rem;color:#ccc;margin-bottom:6px;">${currentPhase.instruction}</p>
        <p style="font-size:0.75rem;color:#888;margin-bottom:12px;font-style:italic;">${currentPhase.detail}</p>
        <div class="calibration-visualizer">
            <div class="calibration-grid">
                ${currentPhase.type === 'center' ? '<div class="center-indicator"><div class="center-dot"></div></div>'
                : currentPhase.type === 'horizontal' ? '<div class="horizontal-indicator"><div class="arrow left">←</div><div class="arrow right">→</div></div>'
                : '<div class="vertical-indicator"><div class="arrow up">↑</div><div class="arrow down">↓</div></div>'}
            </div>
        </div>
        <div class="calibration-progress">
            <div class="progress-bar">
                ${phases.map((_, i) => `<div class="progress-segment ${i < gameState.calibrationPhase ? 'completed' : ''} ${i === gameState.calibrationPhase ? 'active' : ''}"></div>`).join('')}
            </div>
            <div class="progress-text">${gameState.calibrationPhase + 1} / ${phases.length}</div>
        </div>
        <div class="countdown" id="countdown">${currentPhase.duration}</div>
    `;

    if (!document.getElementById('calibrationStyles')) {
        const style = document.createElement('style');
        style.id = 'calibrationStyles';
        style.textContent = `
            .calibration-visualizer{margin:30px 0;padding:12px;background:rgba(0,255,136,0.1);border-radius:15px;border:2px solid #00ff88}
            .calibration-grid{width:200px;height:200px;margin:0 auto;position:relative}
            .center-indicator{width:100%;height:100%;display:flex;align-items:center;justify-content:center}
            .center-dot{width:40px;height:40px;background:#00ff88;border-radius:50%;animation:centerPulse 1.5s infinite;box-shadow:0 0 20px #00ff88}
            .horizontal-indicator{width:100%;height:100%;display:flex;align-items:center;justify-content:space-between;padding:0 20px}
            .vertical-indicator{width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:space-between;padding:20px 0}
            .arrow{font-size:3rem;color:#00ff88;animation:arrowBounce 1s infinite}
            .arrow.left{animation-delay:0s}.arrow.right{animation-delay:0.5s}.arrow.up{animation-delay:0s}.arrow.down{animation-delay:0.5s}
            @keyframes centerPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.2);opacity:0.7}}
            @keyframes arrowBounce{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
            .calibration-progress{margin:25px 0}
            .progress-bar{display:flex;gap:8px;margin-bottom:6px}
            .progress-segment{flex:1;height:8px;background:#333;border-radius:4px;transition:all 0.3s}
            .progress-segment.completed{background:#00ff88}
            .progress-segment.active{background:#00ff88;animation:progressPulse 1s infinite}
            .progress-text{text-align:center;color:#888;font-size:0.75rem}
            @keyframes progressPulse{0%,100%{opacity:1}50%{opacity:0.6}}
        `;
        document.head.appendChild(style);
    }

    let countdown = currentPhase.duration;
    const countdownEl = document.getElementById('countdown');
    const interval = setInterval(() => {
        countdown--;
        countdownEl.textContent = countdown;
        if (countdown <= 0) {
            clearInterval(interval);
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

function retryPhase(phase) {
    gameState.calibrationSamples = [];
    runCalibrationPhase();
}
window.retryPhase = retryPhase;

function submitScore(score) {
    if (!firebase || !firebase.database()) return;
    const playerName = (document.getElementById('playerName') || {}).value || 'Anonim';
    firebase.database().ref('leaderboard').push({
        score, playerName,
        timestamp: Date.now(),
        car: gameState.selectedCar,
        difficulty: gameState.difficulty
    }).then(() => {
        loadLeaderboard('easy');
        loadLeaderboard('normal');
    }).catch(e => console.error('Score submit error:', e));
}

function loadLeaderboard(difficulty = 'normal') {
    if (!firebase || !firebase.database()) return;
    firebase.database().ref('leaderboard').orderByChild('score').limitToLast(10)
        .once('value')
        .then(snapshot => {
            const scores = [];
            snapshot.forEach(child => {
                const s = child.val();
                if (!difficulty || s.difficulty === difficulty) scores.push(s);
            });
            scores.reverse();
            const html = scores.length === 0
                ? '<p style="color:#888;font-size:0.9rem;">Henüz skor yok</p>'
                : scores.map((s, i) => `
                    <div style="padding:8px;border-bottom:1px solid #444;display:flex;justify-content:space-between;">
                        <span style="color:#888;font-size:0.9rem;">#${i + 1}</span>
                        <div>
                            <span style="color:#00ff88;font-weight:bold;font-size:0.9rem;">${s.score}</span>
                            <span style="color:#fff;font-size:0.85rem;margin-left:8px;">${s.playerName || 'Anonim'}</span>
                        </div>
                    </div>`).join('');
            ['leaderboardList', 'leaderboardContent',
             difficulty === 'easy' ? 'easyLeaderboardList' : 'normalLeaderboardList'
            ].forEach(id => { const el = document.getElementById(id); if (el) el.innerHTML = html; });
        })
        .catch(e => console.error('Leaderboard load error:', e));
}

window.submitScore = submitScore;
window.loadLeaderboard = loadLeaderboard;

function endGame() {
    saveBestScore(gameState.score);
    gameState.isPlaying = false;
    playExplosionSound();
    calibrationOverlay.style.display = 'flex';
    calibrationOverlay.classList.remove('hidden');
    hud.style.display = 'none';
    document.getElementById('gameCanvas').style.opacity = '0.3';
    const turboContainer = document.getElementById('turboBarContainer');
    if (turboContainer) turboContainer.style.opacity = '0.3';
    toggleControls.classList.add('hidden');
    document.getElementById('toggleCamera').classList.add('hidden');
    easyModeBtn.classList.remove('hidden');
    easyModeBtn.classList.add('game-over-mode-toggle');

    const finalScore = gameState.score;
    document.querySelector('.calibration-content').innerHTML = `
        <h1>💥 Araba Patladı!</h1>
        <div style="margin:12px 0;padding:12px;background:rgba(255,0,0,0.1);border-radius:10px;border:1px solid #ff0000;">
            <p style="font-size:1.2rem;color:#00ff88;margin:6px 0;font-weight:bold;">🏆 Skor: ${finalScore}</p>
            <p style="font-size:0.85rem;color:#ffd700;margin:6px 0;">🟡 Altın: ${gameState.goldPoints}</p>
            <p style="font-size:0.85rem;color:#00bfff;margin:6px 0;">📏 Mesafe: ${Math.round(gameState.distance)}m</p>
        </div>
        <div style="margin-bottom:12px;">
            <p style="color:#aaa;font-size:0.75rem;margin-bottom:6px;">Araba Seç:</p>
            <div style="margin-bottom:8px;">
                <p style="color:#aaa;font-size:0.7rem;margin-bottom:4px;">Renk Seç:</p>
                <div style="display:flex;gap:6px;justify-content:center;">
                    ${[['#ff0000',0xff0000],['#0066ff',0x0066ff],['#00ff00',0x00ff00],['#ffff00',0xffff00],['#9900ff',0x9900ff],['#ff6600',0xff6600]].map(([hex,val]) =>
                        `<div onclick="setCarColor(${val})" style="width:24px;height:24px;background:${hex};border-radius:50%;cursor:pointer;border:2px solid #444;"></div>`
                    ).join('')}
                </div>
            </div>
            <div style="display:flex;gap:8px;justify-content:center;flex-wrap:wrap;">
                ${[['standard','🚗','Standart','320','#00ff88',0],['fast','🏎','Hızlı','340','#4488ff',1000],['super','🏁','Super','360','#ff2244',2000]].map(([type,emoji,name,speed,color,req]) =>
                    `<button class="car-select-btn" data-car="${type}" onclick="selectCar('${type}')" style="background:rgba(0,0,0,0.3);border:2px solid ${color};border-radius:10px;padding:6px 10px;cursor:pointer;color:white;min-width:80px;">
                        <div style="font-size:1.2rem;">${emoji}</div>
                        <div style="font-size:0.75rem;font-weight:bold;color:${color};">${name}</div>
                        <div style="font-size:0.65rem;color:#888;">${speed} km/h</div>
                        <div class="car-lock-text" style="font-size:0.6rem;color:#ff4444;margin-top:2px;"></div>
                    </button>`
                ).join('')}
            </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:12px 0;">
            <div style="padding:10px;background:rgba(0,0,0,0.5);border-radius:10px;border:1px solid #4ecdc4;">
                <h3 style="color:#4ecdc4;margin-bottom:8px;font-size:0.9rem;">🏆 Kolay Mod</h3>
                <div id="easyLeaderboardList"><p style="color:#888;font-size:0.8rem;">Yükleniyor...</p></div>
            </div>
            <div style="padding:10px;background:rgba(0,255,136,0.1);border-radius:10px;border:1px solid #00ff88;">
                <h3 style="color:#00ff88;margin-bottom:8px;">📋 Skorunu Kaydet</h3>
                <input type="text" id="playerName" placeholder="Adınız" maxlength="20" style="width:100%;padding:10px;font-size:0.85rem;border-radius:5px;border:1px solid #00ff88;background:rgba(0,0,0,0.5);color:white;margin-bottom:6px;box-sizing:border-box;">
                <button onclick="submitScore(${finalScore})" style="width:100%;padding:8px 16px;background:#00ff88;border:none;border-radius:5px;cursor:pointer;font-size:0.85rem;font-weight:bold;">Kaydet</button>
                <p id="submitMessage" style="margin-top:6px;font-size:0.75rem;color:#888;"></p>
            </div>
            <div style="padding:10px;background:rgba(0,0,0,0.5);border-radius:10px;border:1px solid #ff6b6b;">
                <h3 style="color:#ff6b6b;margin-bottom:8px;font-size:0.9rem;">🏆 Normal Mod</h3>
                <div id="normalLeaderboardList"><p style="color:#888;font-size:0.8rem;">Yükleniyor...</p></div>
            </div>
        </div>
        <button onclick="restartGame()" style="margin-top:0;padding:10px 20px;background:#00ff88;border:none;border-radius:10px;cursor:pointer;font-size:1.02rem;font-weight:bold;">🔄 Tekrar Oyna</button>
    `;

    updateCarSelection();
    setTimeout(() => { loadLeaderboard('easy'); loadLeaderboard('normal'); }, 100);
}

function restartGame() {
    gameState.score = 0; gameState.goldPoints = 0; gameState.health = 100;
    gameState.turboPoints = 0; gameState.turboThreshold = 100;
    gameState.distance = 0; gameState.speed = 0; gameState.targetSpeed = 0;
    gameState.nitroTimer = 0; gameState.nitroActive = false;
    gameState.difficulty = 'normal';

    gameState.obstacles.forEach(o => scene.remove(o)); gameState.obstacles = [];
    exhaustParticles.forEach(p => scene.remove(p)); exhaustParticles = [];
    smokeParticles.forEach(p => scene.remove(p)); smokeParticles = [];
    fireParticles.forEach(p => scene.remove(p)); fireParticles = [];

    calibrationOverlay.style.display = 'none';
    hud.style.display = 'block';
    document.getElementById('gameCanvas').style.opacity = '1';
    const turboContainer = document.getElementById('turboBarContainer');
    if (turboContainer) { turboContainer.style.opacity = '1'; turboContainer.classList.remove('hidden'); }
    speedometer.classList.remove('hidden');
    document.getElementById('toggleCamera').classList.remove('hidden');
    toggleControls.classList.remove('hidden');
    video.classList.remove('calibrating');
    createCar();
    easyModeBtn.classList.remove('game-over-mode-toggle');
    easyModeBtn.classList.add('hidden');
    gameState.isPlaying = true;
<<<<<<< HEAD
    playStartedAtMs = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
=======
    playStartedAtMs = performance.now();
>>>>>>> 3d5ca52fb562068c5cbf29586a14cbdc108941bb
    updateEasyModeButton();
}
window.restartGame = restartGame;

function processCalibrationPhase() {
    if (gameState.calibrationSamples.length === 0) return;
    const avgYaw = gameState.calibrationSamples.reduce((s, x) => s + x.yaw, 0) / gameState.calibrationSamples.length;
    const avgPitch = gameState.calibrationSamples.reduce((s, x) => s + x.pitch, 0) / gameState.calibrationSamples.length;
    if (gameState.calibrationPhase === 1) {
        const yaws = gameState.calibrationSamples.map(s => s.yaw);
        gameState.calibrationRanges.yawMin = Math.min(...yaws);
        gameState.calibrationRanges.yawMax = Math.max(...yaws);
    } else if (gameState.calibrationPhase === 2) {
        const pitches = gameState.calibrationSamples.map(s => s.pitch);
        gameState.calibrationRanges.pitchMin = Math.min(...pitches);
        gameState.calibrationRanges.pitchMax = Math.max(...pitches);
    } else {
        gameState.baseYaw = avgYaw;
        gameState.basePitch = avgPitch;
        gameState.smoothedYaw = avgYaw;
        gameState.smoothedPitch = avgPitch;
    }
}

function finalizeCalibration() {
    const yawRange = gameState.calibrationRanges.yawMax - gameState.calibrationRanges.yawMin;
    const pitchRange = gameState.calibrationRanges.pitchMax - gameState.calibrationRanges.pitchMin;
    gameState.calibrationData = {
        baseYaw: gameState.baseYaw,
        basePitch: gameState.basePitch,
<<<<<<< HEAD
        yawRange: yawRange,
        pitchRange: pitchRange,
=======
        yawRange, pitchRange,
>>>>>>> 3d5ca52fb562068c5cbf29586a14cbdc108941bb
        yawSensitivity: yawRange > 0 ? 60 / yawRange : 20,
        pitchSensitivity: pitchRange > 0 ? 60 / pitchRange : 25
    };

    document.querySelector('.calibration-content').innerHTML = `
        <h1>✅ Kalibrasyon Başarılı!</h1>
        <p style="font-size:1.1rem;color:#00ff88;">Mükemmel! Oyun başlıyor...</p>
        <div style="margin-top:25px;padding:15px;background:rgba(0,255,136,0.1);border-radius:10px;">
            <p style="font-size:0.85rem;color:#888;margin:5px 0;">✓ Yatay hassasiyet: ${gameState.calibrationData.yawSensitivity.toFixed(2)}</p>
            <p style="font-size:0.85rem;color:#888;margin:5px 0;">✓ Dikey hassasiyet: ${gameState.calibrationData.pitchSensitivity.toFixed(2)}</p>
        </div>
    `;

    setTimeout(() => {
        gameState.isCalibrated = true;
        gameState.isPlaying = true;
        gameState.speed = 30;        // DÜZELTME: Başlangıç hızı
        gameState.targetSpeed = 30;
        playStartedAtMs = performance.now();

<<<<<<< HEAD
        if (calibrationOverlay) calibrationOverlay.classList.add('hidden');
        if (video) video.classList.remove('calibrating');  // Remove calibrating class
        createCar();  // Apply car config
        
        // Restore canvas opacity
        const canvas = document.getElementById('gameCanvas');
        if (canvas) canvas.style.opacity = '1';
        
        // Restore turbo bar opacity
        const turboContainer = document.getElementById('turboBarContainer');
        if (turboContainer) {
            turboContainer.style.opacity = '1';
        }
        if (car) {
            car.scale.set(1, 1, 1);  // Reset scale
        }
        if (hud) hud.classList.remove('hidden');
        if (speedometer) speedometer.classList.remove('hidden');
        const turboEl = document.getElementById('turboBarContainer');
        if (turboEl) turboEl.classList.remove('hidden');
        const toggleCameraBtn = document.getElementById('toggleCamera');
        if (toggleCameraBtn) toggleCameraBtn.classList.remove('hidden');
        if (toggleControls) toggleControls.classList.remove('hidden');
        if (easyModeBtn) easyModeBtn.classList.add('hidden');  // Hide easy mode button
        updateEasyModeButton();
    }, 100);
}

startButton.addEventListener('click', startCalibration);
toggleControls.addEventListener('click', () => {
    const panel = document.getElementById('controlsPanel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
});

function toggleCameraPreset() {
    const btn = document.getElementById('toggleCamera');
    gameState.cameraPreset = gameState.cameraPreset === 1 ? 2 : 1;
    applyCameraPreset();
    if (btn) btn.textContent = gameState.cameraPreset === 2 ? '📷 Uzak' : '📷 Yakın';
}
window.toggleCameraPreset = toggleCameraPreset;

async function initMediaPipe() {
    try {
        faceMesh = new FaceMesh({ locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}` });
        faceMesh.setOptions({ maxNumFaces: 1, refineLandmarks: true, minDetectionConfidence: 0.5, minTrackingConfidence: 0.5 });
        faceMesh.onResults(onFaceResults);
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
        const profile = getCalibrationProfile();
        const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: 'user', width: profile.cameraWidth, height: profile.cameraHeight }
        });
        video.srcObject = stream;
        video.addEventListener('loadeddata', () => detectFace());
    } catch (error) {
        console.error('Camera access error:', error);
        loadingEl.innerHTML = '<p style="color: red;">Hata: Kameraya erişilemedi</p>';
    }
}

async function detectFace() {
    if (!faceMesh || !video) return;
    await faceMesh.send({ image: video });
    requestAnimationFrame(detectFace);
}

initThreeJS();
initMediaPipe();
