/*
 * FaceRacer - Kafa Kontrol Oyunu
 * Copyright (c) 2026 Hakan Çetin - Tüm hakları saklıdır.
 */
let gameState = {
    isCalibrated: false,
    isPlaying: false,
    score: 0,
    speed: 0,
    maxSpeed: 150,
    yaw: 0,
    pitch: 0,
    nitroActive: false,
    baseYaw: 0,
    basePitch: 0,
    carPosition: 0,
    obstacles: [],
    roadSegments: [],
    calibrationSamples: [],
    smoothedYaw: 0,
    smoothedPitch: 0,
    calibrationPhase: 0,
    calibrationRanges: null,
    calibrationData: null,
    // New game mechanics
    goldPoints: 0,
    damageLevel: 0,
    turboPoints: 0,
    turboThreshold: 100, // Turbo çalışmak için gereken minimum puan (10 yeşil)
    crashCount: 0,
    maxCrashes: 5,
    distance: 0,
    targetSpeed: 0,
    acceleration: 0.2, // Speed change per frame (realistic acceleration)
    nitroTimer: 0, // Turbo süresi sayacı
    nitroDuration: 5, // Turbo süresi (saniye)
    difficulty: 'normal', // 'normal' veya 'easy'
    // Wall collision tracking
    wallTouching: false,
    wallTouchStart: null,
    lastWallDamage: 0,
    // Pause system
    isPaused: false,
    eyebrowRaiseStart: null,
    eyebrowRaiseCount: 0,
    lastEyebrowCheck: 0
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

function playWallFrictionSound() {
    if (!audioContext) return;
    
    // Create harsh metallic screech sound for wall friction
    const bufferSize = audioContext.sampleRate * 0.8;
    const buffer = audioContext.createBuffer(1, bufferSize, audioContext.sampleRate);
    const data = buffer.getChannelData(0);
    
    for (let i = 0; i < bufferSize; i++) {
        // Harsh metallic noise with sawtooth-like characteristics
        const t = i / bufferSize;
        const noise = (Math.random() * 2 - 1);
        const sawtooth = (t * 10) % 2 - 1;
        data[i] = (noise * 0.7 + sawtooth * 0.3) * 0.8;
    }
    
    const source = audioContext.createBufferSource();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();
    const distortion = audioContext.createWaveShaper();
    
    // Add distortion for harsher sound
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
    // Create spark particles at wall contact point
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
        
        // Animate particle
        const velocity = {
            x: (wallX < 0 ? 1 : -1) * Math.random() * 0.3,
            y: Math.random() * 0.3,
            z: -gameState.speed * 0.02
        };
        
        // Remove after animation
        setTimeout(() => {
            scene.remove(particle);
            geometry.dispose();
            material.dispose();
        }, 500);
        
        // Simple animation
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

// DOM Elements
const canvas = document.getElementById('gameCanvas');
const video = document.getElementById('cameraVideo');
const calibrationOverlay = document.getElementById('calibrationOverlay');
const countdownEl = document.getElementById('countdown');
const hud = document.getElementById('hud');
const controls = document.getElementById('controls');
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
    camera.position.set(0, 10, 20);
    camera.lookAt(0, 0, 0);

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
    const roadGeometry = new THREE.PlaneGeometry(20, 500);
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
    leftBarrier.position.set(-11, 1, -200);
    scene.add(leftBarrier);

    const rightBarrier = new THREE.Mesh(barrierGeometry, barrierMaterial);
    rightBarrier.position.set(11, 1, -200);
    scene.add(rightBarrier);
}

function createCar() {
    car = new THREE.Group();

    // Car body
    const bodyGeometry = new THREE.BoxGeometry(2, 1, 4);
    const bodyMaterial = new THREE.MeshStandardMaterial({ color: 0x00ff88 });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    body.position.y = 0.5;
    body.castShadow = true;
    car.add(body);

    // Car top
    const topGeometry = new THREE.BoxGeometry(1.8, 0.8, 2);
    const topMaterial = new THREE.MeshStandardMaterial({ color: 0x00cc6a });
    const top = new THREE.Mesh(topGeometry, topMaterial);
    top.position.y = 1.4;
    top.position.z = -0.5;
    top.castShadow = true;
    car.add(top);

    // Wheels
    const wheelGeometry = new THREE.CylinderGeometry(0.4, 0.4, 0.3, 16);
    const wheelMaterial = new THREE.MeshStandardMaterial({ color: 0x111111 });

    const wheelPositions = [
        [-1, 0.4, 1.2],
        [1, 0.4, 1.2],
        [-1, 0.4, -1.2],
        [1, 0.4, -1.2]
    ];

    wheelPositions.forEach(pos => {
        const wheel = new THREE.Mesh(wheelGeometry, wheelMaterial);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(...pos);
        wheel.castShadow = true;
        car.add(wheel);
    });

    // Exhaust pipes
    const exhaustGeometry = new THREE.CylinderGeometry(0.1, 0.15, 0.5, 8);
    const exhaustMaterial = new THREE.MeshStandardMaterial({ color: 0x333333 });
    
    const leftExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    leftExhaust.rotation.x = Math.PI / 2;
    leftExhaust.position.set(-0.6, 0.3, 2.2);
    car.add(leftExhaust);
    
    const rightExhaust = new THREE.Mesh(exhaustGeometry, exhaustMaterial);
    rightExhaust.rotation.x = Math.PI / 2;
    rightExhaust.position.set(0.6, 0.3, 2.2);
    car.add(rightExhaust);

    car.position.y = 0.5;
    scene.add(car);
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
    scene.add(tree);
}

function createObstacle() {
    const obstacleGeometry = new THREE.BoxGeometry(2, 2, 2);
    // 3 colors: Green (turbo), Yellow (gold), Red (damage)
    // Normal: Red 20.7%, Easy: Red 16.56% (20% less)
    const rand = Math.random();
    let color, type;
    
    if (gameState.difficulty === 'easy') {
        // Easy mode: Less red obstacles
        if (rand < 0.4172) {
            color = 0x00ff00; // Green - Turbo (41.72%)
            type = 'turbo';
        } else if (rand < 0.8344) {
            color = 0xffd700; // Yellow/Gold - Points (41.72%)
            type = 'gold';
        } else {
            color = 0xff0000; // Red - Damage (16.56%)
            type = 'damage';
        }
    } else {
        // Normal mode
        if (rand < 0.3965) {
            color = 0x00ff00; // Green - Turbo (39.65%)
            type = 'turbo';
        } else if (rand < 0.793) {
            color = 0xffd700; // Yellow/Gold - Points (39.65%)
            type = 'gold';
        } else {
            color = 0xff0000; // Red - Damage (20.7%)
            type = 'damage';
        }
    }
    
    const obstacleMaterial = new THREE.MeshStandardMaterial({ color });
    const obstacle = new THREE.Mesh(obstacleGeometry, obstacleMaterial);
    obstacle.position.set(
        (Math.random() - 0.5) * 14,
        1,
        -200
    );
    obstacle.castShadow = true;
    obstacle.userData = { type }; // Store type for collision logic
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
    // Don't update if paused
    if (gameState.isPaused) return;
    
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
    const smokeRate = Math.floor(gameState.damageLevel / 10);
    for (let i = 0; i < smokeRate; i++) {
        if (Math.random() < 0.2) {
            createSmokeParticle();
        }
    }
    
    // Generate fire particles when damage is high (near explosion)
    if (gameState.damageLevel >= 80) {
        const fireRate = Math.floor((gameState.damageLevel - 80) / 5);
        for (let i = 0; i < fireRate; i++) {
            if (Math.random() < 0.4) {
                createFireParticle();
            }
        }
    }
    
    // Move road segments
    gameState.roadSegments.forEach(segment => {
        segment.position.z += gameState.speed * 0.01;
        if (segment.position.z > 20) {
            segment.position.z = -480;
        }
    });

    // Move obstacles
    gameState.obstacles.forEach((obstacle, index) => {
        obstacle.position.z += gameState.speed * 0.01;

        // Check collision
        if (obstacle.position.z > 8 && obstacle.position.z < 12) {
            const distance = Math.abs(obstacle.position.x - car.position.x);
            if (distance < 2) {
                // Collision based on type
                const type = obstacle.userData.type;
                if (type === 'turbo') {
                    gameState.turboPoints += 10;
                    const oldDamage = gameState.damageLevel;
                    gameState.damageLevel = Math.max(0, gameState.damageLevel - 5);
                    playGreenSound();
                    // Remove some smoke particles when damage is reduced
                    if (oldDamage > gameState.damageLevel) {
                        const particlesToRemove = Math.floor((oldDamage - gameState.damageLevel) / 2);
                        for (let i = 0; i < particlesToRemove && smokeParticles.length > 0; i++) {
                            const p = smokeParticles.pop();
                            scene.remove(p);
                        }
                    }
                } else if (type === 'gold') {
                    gameState.goldPoints += 10;
                    playYellowSound();
                } else if (type === 'damage') {
                    gameState.damageLevel += 10;
                    gameState.crashCount++;
                    gameState.targetSpeed *= 0.8; // Reduce target speed
                    playRedSound();
                    // Check if car explodes
                    if (gameState.crashCount >= gameState.maxCrashes) {
                        endGame();
                        return;
                    }
                }
                scene.remove(obstacle);
                gameState.obstacles.splice(index, 1);
            }
        }

        // Remove if passed
        if (obstacle.position.z > 30) {
            scene.remove(obstacle);
            gameState.obstacles.splice(index, 1);
        }
    });

    // Spawn new obstacles
    if (Math.random() < 0.02 * (gameState.speed / 50)) {
        createObstacle();
    }

    // Update car position based on yaw
    const targetX = gameState.yaw * 10;
    car.position.x += (targetX - car.position.x) * 0.1;
    car.rotation.z = -gameState.yaw * 0.3;

    // Wall collision detection
    const WALL_LEFT = -8;
    const WALL_RIGHT = 8;
    const now = Date.now();
    
    // Prevent car from going through walls
    if (car.position.x < WALL_LEFT) {
        car.position.x = WALL_LEFT;
    } else if (car.position.x > WALL_RIGHT) {
        car.position.x = WALL_RIGHT;
    }
    
    // Check if car is touching wall
    if (car.position.x <= WALL_LEFT || car.position.x >= WALL_RIGHT) {
        // Car is touching wall
        if (!gameState.wallTouching) {
            // Just started touching wall
            gameState.wallTouching = true;
            gameState.wallTouchStart = now;
            gameState.lastWallDamage = now;
            playWallFrictionSound(); // Immediate sound on first contact
        } else {
            // Still touching wall - check if 1 second passed
            if (now - gameState.lastWallDamage >= 1000) {
                // Apply 20% damage every second
                gameState.damageLevel = Math.min(100, gameState.damageLevel + 20);
                gameState.lastWallDamage = now;
                playWallFrictionSound();
                
                // Create wall friction particles
                createWallFrictionParticles(car.position.x <= WALL_LEFT ? WALL_LEFT : WALL_RIGHT);
                
                // Check if car explodes
                if (gameState.damageLevel >= 100) {
                    endGame();
                    return;
                }
            }
        }
    } else {
        // Not touching wall anymore
        gameState.wallTouching = false;
        gameState.wallTouchStart = null;
    }

    // Apply nitro
    let currentSpeed = gameState.speed;
    if (gameState.nitroActive) {
        currentSpeed = Math.min(300, currentSpeed + 10); // Gradual nitro boost
    }

    // Update distance
    gameState.distance += currentSpeed * 0.01;

    // Calculate total score
    gameState.score = gameState.goldPoints + gameState.turboPoints + Math.round(gameState.distance / 10) - (gameState.crashCount * 50);

    // Update HUD
    document.getElementById('score').textContent = gameState.score;
    document.getElementById('speed').textContent = Math.round(currentSpeed);
    document.getElementById('yawValue').textContent = gameState.yaw.toFixed(2);
    document.getElementById('pitchValue').textContent = gameState.pitch.toFixed(2);
    document.getElementById('nitroStatus').textContent = gameState.nitroActive ? 'Açık 🔥' : 'Kapalı';
    document.getElementById('nitroStatus').style.color = gameState.nitroActive ? '#ff6b00' : '#00ff88';
    // New HUD elements
    document.getElementById('goldPoints').textContent = gameState.goldPoints;
    document.getElementById('damageLevel').textContent = gameState.damageLevel + '%';
    document.getElementById('turboPoints').textContent = gameState.turboPoints;
    document.getElementById('turboThreshold').textContent = gameState.turboThreshold;
    document.getElementById('crashCount').textContent = gameState.crashCount + '/' + gameState.maxCrashes;
    document.getElementById('distance').textContent = Math.round(gameState.distance) + 'm';
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
            // Check for pause gesture (eyes closed for 2 seconds)
            checkPauseGesture(landmarks);
            
            // Apply smooth filtering (low-pass filter)
            const yawAlpha = 0.3; // Yaw smoothing (değişmeyecek - sağ-sol hassasiyeti koru)
            const pitchAlpha = 0.5; // Pitch smoothing (artırıldı - hız/fren tepkisi artar)
            gameState.smoothedYaw = yawAlpha * yaw + (1 - yawAlpha) * gameState.smoothedYaw;
            gameState.smoothedPitch = pitchAlpha * pitch + (1 - pitchAlpha) * gameState.smoothedPitch;
            
            // Use calibrated values with smoothing
            const rawYaw = gameState.smoothedYaw - gameState.baseYaw;
            const rawPitch = gameState.smoothedPitch - gameState.basePitch;
            
            // Apply deadzone to reduce jitter (higher to prevent sticking)
            const deadzone = 0.05; // Higher deadzone to prevent sticking
            gameState.yaw = Math.max(-1, Math.min(1, 
                Math.abs(rawYaw) > deadzone ? rawYaw : 0
            ));
            // Pitch değerini normalize et - 1'e çıkmasını engelle
            gameState.pitch = Math.max(-1, Math.min(1, 
                Math.abs(rawPitch) > deadzone ? rawPitch * 0.5 : 0
            ));
            
            // Map pitch to target speed (inverted: head up = faster)
            gameState.targetSpeed = Math.max(0, Math.min(290, 
                (1 - gameState.pitch) * 145
            ));
            
            // Gradually accelerate/decelerate to target speed
            if (gameState.speed < gameState.targetSpeed) {
                gameState.speed = Math.min(gameState.targetSpeed, gameState.speed + gameState.acceleration);
            } else if (gameState.speed > gameState.targetSpeed) {
                gameState.speed = Math.max(gameState.targetSpeed, gameState.speed - gameState.acceleration);
            }
            
            // Update debug values
            const rawYawEl = document.getElementById('rawYaw');
            const rawPitchEl = document.getElementById('rawPitch');
            if (rawYawEl) rawYawEl.textContent = rawYaw.toFixed(3);
            if (rawPitchEl) rawPitchEl.textContent = rawPitch.toFixed(3);

            // Update control panel debug values
            const controlRawYawEl = document.getElementById('controlRawYaw');
            const controlRawPitchEl = document.getElementById('controlRawPitch');
            if (controlRawYawEl) controlRawYawEl.textContent = rawYaw.toFixed(3);
            if (controlRawPitchEl) controlRawPitchEl.textContent = rawPitch.toFixed(3);
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

// Difficulty selection
function selectDifficulty(difficulty) {
    gameState.difficulty = difficulty;
    difficultyOverlay.classList.add('hidden');
    // Start game directly (calibration already done)
    hud.classList.remove('hidden');
    toggleControls.classList.remove('hidden');
    video.classList.remove('calibrating');
    gameState.isPlaying = true;
    updateEasyModeButton();
}

// Toggle easy mode
function toggleEasyMode() {
    gameState.difficulty = gameState.difficulty === 'normal' ? 'easy' : 'normal';
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
            duration: 3, 
            instruction: 'Dik durun, alnınız çerçevenin tam ortasında olsun',
            type: 'center',
            detail: 'Bu pozisyon referans noktanız olacak'
        },
        { 
            text: 'Kafanızı sağa ve sola hareket ettirin', 
            duration: 4, 
            instruction: '↔️ Kafanızı hafifçe sağa ve sola çevirin',
            type: 'horizontal',
            detail: 'Küçük hareketler yeterli, omuzları hareket ettirmeyin'
        },
        { 
            text: 'Kafanızı yukarı ve aşağı hareket ettirin', 
            duration: 4, 
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
        <p style="font-size: 1rem; color: #ccc; margin-bottom: 10px;">${currentPhase.instruction}</p>
        <p style="font-size: 0.9rem; color: #888; margin-bottom: 20px; font-style: italic;">${currentPhase.detail}</p>
        
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
                padding: 20px;
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
                margin-bottom: 10px;
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
                font-size: 0.9rem;
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
                setTimeout(runCalibrationPhase, 500);
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
        <p style="font-size: 1rem; color: #ff6b00;">${errorMessage}</p>
        <p style="font-size: 0.9rem; color: #888; margin-top: 20px;">${retryInstruction}</p>
        <button onclick="retryPhase(${phase})" style="margin-top: 20px; padding: 15px 30px; background: #00ff88; border: none; border-radius: 10px; cursor: pointer; font-size: 1rem; font-weight: bold;">
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

function endGame() {
    gameState.isPlaying = false;
    
    // Play explosion sound
    playExplosionSound();
    
    // Show game over screen with play again button
    calibrationOverlay.style.display = 'flex';
    calibrationOverlay.classList.remove('hidden');
    hud.style.display = 'none';
    toggleControls.classList.add('hidden');
    
    const calibrationContent = document.querySelector('.calibration-content');
    const finalScore = gameState.score;
    
    calibrationContent.innerHTML = `
        <h1>💥 Araba Patladı!</h1>
        <div style="margin: 20px 0; padding: 20px; background: rgba(255, 0, 0, 0.1); border-radius: 10px; border: 1px solid #ff0000;">
            <p style="font-size: 1.5rem; color: #00ff88; margin: 10px 0; font-weight: bold;">📊 Skor: ${finalScore}</p>
            <p style="font-size: 1rem; color: #ffd700; margin: 10px 0;">🟡 Altın: ${gameState.goldPoints}</p>
            <p style="font-size: 1rem; color: #00bfff; margin: 10px 0;">📏 Mesafe: ${Math.round(gameState.distance)}m</p>
        </div>
        
        <div style="display: flex; gap: 20px; margin: 20px 0;">
            <!-- Score Submission Form -->
            <div id="scoreSubmission" style="flex: 1; padding: 20px; background: rgba(0, 255, 136, 0.1); border-radius: 10px; border: 1px solid #00ff88;">
                <h3 style="color: #00ff88; margin-bottom: 15px;">🏆 Skorunu Kaydet</h3>
                <input type="text" id="playerName" placeholder="Adınız" maxlength="20" style="width: 100%; padding: 10px; font-size: 1rem; border-radius: 5px; border: 1px solid #00ff88; background: rgba(0,0,0,0.5); color: white; margin-bottom: 10px; box-sizing: border-box;">
                <button onclick="submitScore(${finalScore})" style="width: 100%; padding: 10px 20px; background: #00ff88; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; font-weight: bold;">
                    Kaydet
                </button>
                <p id="submitMessage" style="margin-top: 10px; font-size: 0.9rem; color: #888;"></p>
            </div>
            
            <!-- Leaderboard Display -->
            <div id="leaderboard" style="flex: 2; padding: 20px; background: rgba(0,0,0,0.5); border-radius: 10px; border: 1px solid #444;">
                <h3 style="color: #00ff88; margin-bottom: 15px;">🌎 Global Sıralama - Top 10</h3>
                <div id="leaderboardList" style="max-height: 200px; overflow-y: auto;">
                    <p style="color: #888;">Yükleniyor...</p>
                </div>
            </div>
        </div>
        
        <button onclick="restartGame()" style="margin-top: 20px; padding: 15px 30px; background: #00ff88; border: none; border-radius: 10px; cursor: pointer; font-size: 1.2rem; font-weight: bold;">
            🔄 Tekrar Oyna
        </button>
    `;
    
    // Load leaderboard after displaying game over screen
    setTimeout(() => {
        loadLeaderboard();
    }, 100);
}

function restartGame() {
    // Reset game state (keep calibration, reset difficulty to normal)
    gameState.score = 0;
    gameState.goldPoints = 0;
    gameState.damageLevel = 0;
    gameState.turboPoints = 0;
    gameState.turboThreshold = 100;
    gameState.crashCount = 0;
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
    toggleControls.classList.remove('hidden');
    gameState.isPlaying = true;
    updateEasyModeButton();
}

// Make restartGame globally accessible
window.restartGame = restartGame;

// Leaderboard Functions
function submitScore(score) {
    const playerNameInput = document.getElementById('playerName');
    const submitMessage = document.getElementById('submitMessage');
    const playerName = playerNameInput.value.trim();
    
    if (!playerName) {
        submitMessage.textContent = 'Lütfen adınızı girin';
        submitMessage.style.color = '#ff6b00';
        return;
    }
    
    if (playerName.length > 20) {
        submitMessage.textContent = 'Adınız 20 karakterden kısa olmalı';
        submitMessage.style.color = '#ff6b00';
        return;
    }
    
    // Spam protection - check localStorage
    const lastSubmit = localStorage.getItem('lastScoreSubmit');
    const now = Date.now();
    if (lastSubmit && (now - parseInt(lastSubmit)) < 30000) { // 30 seconds
        submitMessage.textContent = '30 saniye sonra tekrar deneyin';
        submitMessage.style.color = '#ff6b00';
        return;
    }
    
    const scoreData = {
        name: playerName,
        score: score,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };
    
    // Save to Firebase
    const scoresRef = firebase.database().ref('scores');
    scoresRef.push(scoreData)
        .then(() => {
            submitMessage.textContent = '✅ Skor kaydedildi!';
            submitMessage.style.color = '#00ff88';
            playerNameInput.disabled = true;
            localStorage.setItem('lastScoreSubmit', now.toString());
            
            // Refresh leaderboard
            loadLeaderboard();
        })
        .catch((error) => {
            console.error('Score submission error:', error);
            submitMessage.textContent = '❌ Hata oluştu, tekrar deneyin';
            submitMessage.style.color = '#ff6b00';
        });
}

function loadLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    
    const scoresRef = firebase.database().ref('scores');
    
    scoresRef.orderByChild('score').limitToLast(10).once('value')
        .then((snapshot) => {
            const scores = [];
            snapshot.forEach((childSnapshot) => {
                scores.push({
                    key: childSnapshot.key,
                    ...childSnapshot.val()
                });
            });
            
            // Sort by score (descending)
            scores.sort((a, b) => b.score - a.score);
            
            if (scores.length === 0) {
                leaderboardList.innerHTML = '<p style="color: #888;">Henüz skor kaydedilmemiş</p>';
                return;
            }
            
            // Build leaderboard HTML
            let html = '<table style="width: 100%; border-collapse: collapse;">';
            html += '<tr style="border-bottom: 1px solid #444;">';
            html += '<th style="padding: 8px; text-align: left; color: #888; font-size: 0.9rem;">#</th>';
            html += '<th style="padding: 8px; text-align: left; color: #888; font-size: 0.9rem;">Oyuncu</th>';
            html += '<th style="padding: 8px; text-align: right; color: #888; font-size: 0.9rem;">Skor</th>';
            html += '</tr>';
            
            scores.forEach((score, index) => {
                const rank = index + 1;
                let rankEmoji = '';
                if (rank === 1) rankEmoji = '🥇 ';
                else if (rank === 2) rankEmoji = '🥈 ';
                else if (rank === 3) rankEmoji = '🥉 ';
                else rankEmoji = `${rank}. `;
                
                const rowColor = rank <= 3 ? '#00ff88' : (index % 2 === 0 ? '#fff' : '#ccc');
                
                html += `<tr style="border-bottom: 1px solid #333;">`;
                html += `<td style="padding: 8px; color: ${rowColor}; font-weight: bold;">${rankEmoji}</td>`;
                html += `<td style="padding: 8px; color: ${rowColor};">${escapeHtml(score.name)}</td>`;
                html += `<td style="padding: 8px; text-align: right; color: ${rowColor}; font-weight: bold;">${score.score}</td>`;
                html += '</tr>';
            });
            
            html += '</table>';
            leaderboardList.innerHTML = html;
        })
        .catch((error) => {
            console.error('Leaderboard load error:', error);
            leaderboardList.innerHTML = '<p style="color: #ff6b00;">❌ Sıralama yüklenemedi</p>';
        });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Make leaderboard functions globally accessible
window.submitScore = submitScore;
window.loadLeaderboard = loadLeaderboard;

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
        gameState.difficulty = 'normal'; // Start in normal mode
        calibrationOverlay.classList.add('hidden');
        hud.classList.remove('hidden');
        toggleControls.classList.remove('hidden');
        video.classList.remove('calibrating');
        gameState.isPlaying = true;
        updateEasyModeButton();
    }, 1500);
}

// Event Listeners
startButton.addEventListener('click', startCalibration);
toggleControls.addEventListener('click', () => {
    controls.style.display = controls.style.display === 'none' ? 'block' : 'none';
});

// Domain Locking - Sadece hakancetin.com.tr'de çalışır
(function() {
    const allowedDomains = ['hakancetin.com.tr', 'www.hakancetin.com.tr', 'localhost', '127.0.0.1'];
    const currentDomain = window.location.hostname;
    
    if (!allowedDomains.includes(currentDomain)) {
        document.body.innerHTML = `
            <div style="display: flex; justify-content: center; align-items: center; height: 100vh; background: #1a1a2e; color: #fff; font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                <div>
                    <h1 style="color: #ff6b6b;">⚠️ Erişim Engellendi</h1>
                    <p style="margin-top: 20px; font-size: 1.1rem;">Bu oyun sadece hakancetin.com.tr adresinde çalışır.</p>
                    <p style="margin-top: 10px; color: #888;">Lütfen resmi siteyi ziyaret edin: <a href="https://hakancetin.com.tr" style="color: #00ff88;">hakancetin.com.tr</a></p>
                </div>
            </div>
        `;
        throw new Error('Domain not allowed: ' + currentDomain);
    }
})();

// Watermark
console.log('%c FaceRacer © 2026 Hakan Çetin', 'color: #00ff88; font-size: 20px; font-weight: bold;');
console.log('%c Tüm hakları saklıdır. https://hakancetin.com.tr', 'color: #888; font-size: 12px;');

// Pause System Functions
function checkPauseGesture(landmarks) {
    if (!gameState.isPlaying || gameState.isPaused) return;
    
    const now = Date.now();
    
    // Prevent too frequent checks
    if (now - gameState.lastEyebrowCheck < 100) return; // Check every 100ms
    gameState.lastEyebrowCheck = now;
    
    // Get eyebrow landmarks
    const leftEyebrowTop = landmarks[70]; // Left eyebrow top
    const leftEyebrowBottom = landmarks[105]; // Left eyebrow bottom
    const rightEyebrowTop = landmarks[300]; // Right eyebrow top
    const rightEyebrowBottom = landmarks[334]; // Right eyebrow bottom
    const leftEye = landmarks[33]; // Left eye center
    const rightEye = landmarks[263]; // Right eye center
    
    // Calculate eyebrow height relative to eyes
    const leftEyebrowHeight = Math.abs(leftEyebrowTop.y - leftEye.y);
    const rightEyebrowHeight = Math.abs(rightEyebrowTop.y - rightEye.y);
    const avgEyebrowHeight = (leftEyebrowHeight + rightEyebrowHeight) / 2;
    
    // Eyebrow is raised if height is above threshold
    const eyebrowRaised = avgEyebrowHeight > 0.08;
    
    if (eyebrowRaised) {
        if (!gameState.eyebrowRaiseStart) {
            // Just started raising eyebrow
            gameState.eyebrowRaiseStart = now;
            gameState.eyebrowRaiseCount = 1;
        } else {
            // Still raising - check if it's a new raise (after lowering)
            if (now - gameState.eyebrowRaiseStart > 500) { // 500ms gap
                gameState.eyebrowRaiseCount++;
                gameState.eyebrowRaiseStart = now;
                
                // Check if we have 3 raises
                if (gameState.eyebrowRaiseCount >= 3) {
                    togglePause();
                    gameState.eyebrowRaiseCount = 0;
                    gameState.eyebrowRaiseStart = null;
                }
            }
        }
    } else {
        // Eyebrow not raised, check if we should reset
        if (gameState.eyebrowRaiseStart && (now - gameState.eyebrowRaiseStart > 1000)) {
            // Too long since last raise, reset
            gameState.eyebrowRaiseCount = 0;
            gameState.eyebrowRaiseStart = null;
        }
    }
}

function togglePause() {
    gameState.isPaused = !gameState.isPaused;
    
    if (gameState.isPaused) {
        // Pause the game
        showPauseOverlay();
        // Stop the animation loop
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
        }
        playPauseSound();
    } else {
        // Resume the game
        hidePauseOverlay();
        // Restart the animation loop
        animate();
        playResumeSound();
    }
}

function showPauseOverlay() {
    const calibrationOverlay = document.getElementById('calibrationOverlay');
    const calibrationContent = document.querySelector('.calibration-content');
    
    calibrationOverlay.style.display = 'flex';
    calibrationOverlay.classList.remove('hidden');
    
    calibrationContent.innerHTML = `
        <h1>⏸️ OYUN DURAKLATILDI</h1>
        <div style="margin: 20px 0; padding: 20px; background: rgba(0, 255, 136, 0.1); border-radius: 10px; border: 1px solid #00ff88;">
            <p style="font-size: 1.2rem; color: #00ff88; margin: 10px 0;">Kaşınızı 3 kez kaldırın</p>
            <p style="font-size: 1rem; color: #ccc; margin: 10px 0;">Oyuna devam etmek için</p>
        </div>
        <button onclick="togglePause()" style="margin-top: 20px; padding: 15px 30px; background: #00ff88; border: none; border-radius: 10px; cursor: pointer; font-size: 1.2rem; font-weight: bold;">
            ▶️ Devam Et
        </button>
    `;
}

function hidePauseOverlay() {
    const calibrationOverlay = document.getElementById('calibrationOverlay');
    calibrationOverlay.style.display = 'none';
}

function playPauseSound() {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(440, audioContext.currentTime); // A4
    oscillator.frequency.exponentialRampToValueAtTime(220, audioContext.currentTime + 0.2); // A3
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

function playResumeSound() {
    if (!audioContext) return;
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(220, audioContext.currentTime); // A3
    oscillator.frequency.exponentialRampToValueAtTime(440, audioContext.currentTime + 0.2); // A4
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.start();
    oscillator.stop(audioContext.currentTime + 0.2);
}

// Make togglePause globally accessible
window.togglePause = togglePause;

// Initialize
initThreeJS();
initMediaPipe();
