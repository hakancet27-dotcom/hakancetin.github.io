// Meyve Ninja - Web Version
const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const video = document.getElementById('input-video');

// Game dimensions
const GENISLIK = 900;
const YUKSEKLIK = 650;
canvas.width = GENISLIK;
canvas.height = YUKSEKLIK;

// Colors
const ARKA_PLAN = '#0f0a19';
const BEYAZ = '#ffffff';
const SARI = '#ffdc32';
const KIRMIZI = '#dc3c3c';
const YESIL = '#3cc864';
const TURUNCU = '#ff8c1e';
const PEMBE = '#ff64b4';
const ACIK_MAVI = '#64c8ff';
const GRI = '#787878';

// Meyveler
const MEYVELER = [
    { ad: 'karpuz', renk: '#4cb43c', ic: '#ff4c4c', r: 45, gorsel: '/static/images/karpuz.png' },
    { ad: 'portakal', renk: '#ff8a30', ic: '#ffc850', r: 35, gorsel: '/static/images/portakal.png' },
    { ad: 'elma', renk: '#e84848', ic: '#ffb4b4', r: 38, gorsel: '/static/images/elma.png' },
    { ad: 'limon', renk: '#e6e640', ic: '#ffffa0', r: 32, gorsel: '/static/images/limon.png' },
    { ad: 'uzum', renk: '#8a2be2', ic: '#c0a0ff', r: 28, gorsel: '/static/images/üzüm.png' },
    { ad: 'muz', renk: '#ffe135', ic: '#fffacd', r: 40, gorsel: '/static/images/muz.png' },
    { ad: 'bomba', renk: '#2a2a2a', ic: '#ff0000', r: 40, bomba: true, gorsel: '/static/images/bomba.png' }
];

// Game state
let meyveler = [];
let efektler = [];
let puanEfektleri = [];
let puan = 0;
let can = 5;
let combo = 0;
let sonKesik = 0;

// Görsel cache
const gorselCache = {};

// Görsel yükle
function gorselYukle(yol) {
    if (gorselCache[yol]) {
        return gorselCache[yol];
    }

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = yol;
    gorselCache[yol] = img;
    return img;
}

let oyunBitti = false;
let oyunAktif = false;
let sonMeyve = 0;
let meyveAralik = 1200;
let baslaZamani = 0;
let elPoz = null;
let elYonu = null; // Parmağın yönü
let oncekiEl = null;
let aktifIz = null;
let yildizlar = [];
let seviye = 1;
let yumrukZamani = 0; // Yumruk işareti zamanı
let audioContext = null;

// Initialize stars for background
for (let i = 0; i < 80; i++) {
    yildizlar.push({
        x: Math.random() * GENISLIK,
        y: Math.random() * YUKSEKLIK,
        par: Math.random() * 1.2 + 0.3
    });
}

// Ses fonksiyonları
function initAudio() {
    if (!audioContext) {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
}

function playSes(tur) {
    if (!audioContext) initAudio();
    if (audioContext.state === 'suspended') audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    switch(tur) {
        case 'kes':
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.1);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            break;
        case 'combo':
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(800, audioContext.currentTime + 0.15);
            gainNode.gain.setValueAtTime(0.2, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.15);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.15);
            break;
        case 'miss':
            oscillator.frequency.setValueAtTime(200, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(100, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'basla':
            oscillator.frequency.setValueAtTime(300, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(600, audioContext.currentTime + 0.2);
            gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.2);
            break;
        case 'bitis':
            oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(150, audioContext.currentTime + 0.5);
            gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.5);
            break;
    }
}

// Meyve class
class Meyve {
    constructor(hizCarpani = 1, veri = null) {
        this.veri = veri || MEYVELER[Math.floor(Math.random() * MEYVELER.length)];
        this.x = Math.random() * (GENISLIK - 120) + 60;
        this.y = -50; // Yukarıdan başla
        this.hizX = (Math.random() - 0.5) * 2;
        this.hizY = Math.random() * 1.5 + 1.5 * hizCarpani; // Daha yavaş
        this.r = this.veri.r;
        this.kesik = false;
        this.alfa = 255;
        this.don = 0;
        this.donHiz = (Math.random() - 0.5) * 3;
        this.parcalar = []; // Kesilince doldurulacak
    }

    guncelle() {
        if (!this.kesik) {
            this.x += this.hizX;
            this.y += this.hizY;
            this.don += this.donHiz;
            // Yan sınırlarda sekme
            if (this.x < this.r || this.x > GENISLIK - this.r) {
                this.hizX *= -1;
            }
        } else {
            // Parçalara yer çekimi ekle
            this.parcalar.forEach(parca => {
                parca.hizY += 0.15;
                parca.x += parca.hizX;
                parca.y += parca.hizY;

                // Yan sınırlarda sekme
                if (parca.x < 0 || parca.x > GENISLIK) {
                    parca.hizX *= -0.7;
                }
            });

            this.alfa = Math.max(0, this.alfa - 6);
        }
    }

    ciz(ctx) {
        if (!this.kesik) {
            ctx.save();
            ctx.translate(this.x, this.y);
            ctx.rotate(this.don * Math.PI / 180);

            // Görsel varsa kullan
            if (this.veri.gorsel) {
                const img = gorselYukle(this.veri.gorsel);
                if (img.complete && img.naturalWidth > 0) {
                    // Görsel çiz
                    const boyut = this.r * 2;
                    ctx.drawImage(img, -boyut / 2, -boyut / 2, boyut, boyut);

                    // Görsel gerçek boyutunu sakla
                    this.gorselBoyut = this.r;
                } else {
                    // Görsel yüklenmediyse fallback
                    this.cizFallback(ctx);
                }
            } else {
                // Görsel yoksa fallback
                this.cizFallback(ctx);
            }

            ctx.restore();
        } else {
            // Kesilmiş meyve - dinamik parçalar
            ctx.globalAlpha = this.alfa / 255;

            const kesAci = Math.atan2(this.kesYonu.y, this.kesYonu.x);

            this.parcalar.forEach((parca, i) => {
                ctx.save();
                ctx.translate(parca.x, parca.y);
                ctx.rotate(kesAci + parca.aci);

                // Parça şekli (kesme yönüne göre açılı)
                const aciAraligi = Math.PI * 2 / this.parcalar.length;
                const baslangicAci = -aciAraligi / 2;
                const bitisAci = aciAraligi / 2;

                // Gradient
                const gradient = ctx.createRadialGradient(-parca.r * 0.3, -parca.r * 0.3, 0, 0, 0, parca.r);
                gradient.addColorStop(0, this.veri.renk);
                gradient.addColorStop(0.7, this.koyuRengi(this.veri.renk));
                gradient.addColorStop(1, this.cokKoyuRengi(this.veri.renk));

                ctx.beginPath();
                ctx.arc(0, 0, parca.r, baslangicAci, bitisAci);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fillStyle = gradient;
                ctx.fill();

                // İç kısım
                const icGradient = ctx.createRadialGradient(-parca.r * 0.2, -parca.r * 0.2, 0, 0, 0, parca.r * 0.55);
                icGradient.addColorStop(0, this.veri.ic);
                icGradient.addColorStop(1, this.koyuRengi(this.veri.ic));

                ctx.beginPath();
                ctx.arc(0, 0, parca.r * 0.55, baslangicAci, bitisAci);
                ctx.lineTo(0, 0);
                ctx.closePath();
                ctx.fillStyle = icGradient;
                ctx.fill();

                // Kesme kenarı
                ctx.beginPath();
                ctx.moveTo(0, -parca.r);
                ctx.lineTo(0, parca.r);
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
                ctx.lineWidth = 2;
                ctx.stroke();

                ctx.restore();
            });

            ctx.globalAlpha = 1;
        }
    }

    getKesmeYaricapi() {
        // Görsel boyutu varsa onu kullan, yoksa meyve yarıçapı
        return this.gorselBoyut || this.r;
    }

    cizFallback(ctx) {
        // Meyve tipine göre özel çizim (fallback)
        if (this.veri.ad === 'karpuz') {
            this.cizKarpuz(ctx);
        } else if (this.veri.ad === 'portakal') {
            this.cizPortakal(ctx);
        } else if (this.veri.ad === 'elma') {
            this.cizElma(ctx);
        } else if (this.veri.ad === 'limon') {
            this.cizLimon(ctx);
        } else if (this.veri.ad === 'muz') {
            this.cizMuz(ctx);
        } else if (this.veri.ad === 'bomba') {
            this.cizBomba(ctx);
        } else {
            this.cizDigerMeyve(ctx);
        }
    }

    cizKarpuz(ctx) {
        const r = this.r;
        const ovalY = r * 0.9;

        // Gölge
        const golge = ctx.createRadialGradient(5, 5, 0, 5, 5, r);
        golge.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        golge.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.ellipse(5, 5, r * 0.95, ovalY * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = golge;
        ctx.fill();

        // Ana gövde - çok katmanlı gradient
        const gradient = ctx.createRadialGradient(-r * 0.3, -ovalY * 0.3, 0, 0, 0, r);
        gradient.addColorStop(0, '#4cb43c');
        gradient.addColorStop(0.4, '#3cb43c');
        gradient.addColorStop(0.7, '#2c842c');
        gradient.addColorStop(1, '#1c541c');

        ctx.beginPath();
        ctx.ellipse(0, 0, r, ovalY, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Karpuz çizgileri - gerçekçi
        ctx.strokeStyle = 'rgba(0, 60, 0, 0.3)';
        ctx.lineWidth = 2;
        for (let i = 0; i < 8; i++) {
            const y = -ovalY + (i + 1) * (ovalY * 2 / 9);
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.92, ovalY * 0.92, 0, Math.asin(y / ovalY), Math.PI - Math.asin(y / ovalY));
            ctx.stroke();
        }

        // Dikey çizgiler
        ctx.strokeStyle = 'rgba(0, 50, 0, 0.2)';
        ctx.lineWidth = 1.5;
        for (let i = -3; i <= 3; i++) {
            if (i === 0) continue;
            const x = i * r * 0.25;
            ctx.beginPath();
            ctx.ellipse(0, 0, r * 0.92, ovalY * 0.92, 0, Math.acos(x / (r * 0.92)), -Math.acos(x / (r * 0.92)));
            ctx.stroke();
        }

        // İç kısım
        const icGradient = ctx.createRadialGradient(-r * 0.1, -ovalY * 0.1, 0, 0, 0, r * 0.5);
        icGradient.addColorStop(0, '#ff4c4c');
        icGradient.addColorStop(0.5, '#dc3232');
        icGradient.addColorStop(1, '#a81818');

        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.5, ovalY * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = icGradient;
        ctx.fill();

        // Tohumlar - gerçekçi
        for (let i = 0; i < 12; i++) {
            const aci = (i / 12) * Math.PI * 2;
            const px = Math.cos(aci) * r * 0.35;
            const py = Math.sin(aci) * ovalY * 0.35;

            const tohumGrad = ctx.createRadialGradient(px - 0.8, py - 0.8, 0, px, py, 3);
            tohumGrad.addColorStop(0, '#4a4a4a');
            tohumGrad.addColorStop(1, '#1a1a1a');
            ctx.beginPath();
            ctx.ellipse(px, py, 2, 2.8, aci + Math.PI / 2, 0, Math.PI * 2);
            ctx.fillStyle = tohumGrad;
            ctx.fill();

            // Tohum parlama
            ctx.beginPath();
            ctx.arc(px - 0.6, py - 0.6, 0.7, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
            ctx.fill();
        }

        // Parlama
        const parlama = ctx.createRadialGradient(-r * 0.4, -ovalY * 0.4, 0, -r * 0.4, -ovalY * 0.4, r * 0.4);
        parlama.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        parlama.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(-r * 0.4, -ovalY * 0.4, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = parlama;
        ctx.fill();
    }

    cizPortakal(ctx) {
        const r = this.r;
        const ovalY = r * 0.85;

        // Gölge
        const golge = ctx.createRadialGradient(5, 5, 0, 5, 5, r);
        golge.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        golge.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.ellipse(5, 5, r * 0.95, ovalY * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = golge;
        ctx.fill();

        // Ana gövde
        const gradient = ctx.createRadialGradient(-r * 0.3, -ovalY * 0.3, 0, 0, 0, r);
        gradient.addColorStop(0, '#ffaa50');
        gradient.addColorStop(0.4, '#ff8a30');
        gradient.addColorStop(0.7, '#e66020');
        gradient.addColorStop(1, '#c64010');

        ctx.beginPath();
        ctx.ellipse(0, 0, r, ovalY, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Pütürlü doku - çok detaylı
        for (let i = 0; i < 50; i++) {
            const aci = Math.random() * Math.PI * 2;
            const rad = Math.random() * r * 0.92;
            const px = Math.cos(aci) * rad;
            const py = Math.sin(aci) * rad * (ovalY / r);
            const boyut = Math.random() * 1.5 + 0.5;
            ctx.beginPath();
            ctx.arc(px, py, boyut, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 200, 150, 0.15)';
            ctx.fill();
        }

        // Kabuk çizgileri
        ctx.strokeStyle = 'rgba(200, 120, 0, 0.15)';
        ctx.lineWidth = 0.8;
        for (let i = 0; i < 15; i++) {
            const aci = (i / 15) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(aci) * r * 0.95, Math.sin(aci) * ovalY * 0.95);
            ctx.stroke();
        }

        // İç kısım
        const icGradient = ctx.createRadialGradient(-r * 0.1, -ovalY * 0.1, 0, 0, 0, r * 0.5);
        icGradient.addColorStop(0, '#ffe0a0');
        icGradient.addColorStop(0.5, '#ffc850');
        icGradient.addColorStop(1, '#e6a040');

        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.5, ovalY * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = icGradient;
        ctx.fill();

        // Segmentler
        ctx.strokeStyle = 'rgba(255, 220, 180, 0.4)';
        ctx.lineWidth = 1;
        for (let i = 0; i < 10; i++) {
            const aci = (i / 10) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(0, 0);
            ctx.lineTo(Math.cos(aci) * r * 0.48, Math.sin(aci) * ovalY * 0.48);
            ctx.stroke();
        }

        // Sap
        const sapGrad = ctx.createLinearGradient(-3, -ovalY, 3, -ovalY);
        sapGrad.addColorStop(0, '#5a3c1a');
        sapGrad.addColorStop(0.5, '#3a2c0a');
        sapGrad.addColorStop(1, '#2a1c0a');
        ctx.beginPath();
        ctx.moveTo(0, -ovalY * 0.7);
        ctx.quadraticCurveTo(4, -ovalY, 0, -ovalY * 1.1);
        ctx.quadraticCurveTo(-4, -ovalY, 0, -ovalY * 0.7);
        ctx.fillStyle = sapGrad;
        ctx.fill();

        // Yaprak
        ctx.save();
        ctx.translate(0, -ovalY * 1.1);
        ctx.rotate(Math.PI / 6);
        const yaprakGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        yaprakGrad.addColorStop(0, '#4d7a47');
        yaprakGrad.addColorStop(1, '#1d4a17');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(8, -4, 12, 0);
        ctx.quadraticCurveTo(8, 4, 0, 0);
        ctx.fillStyle = yaprakGrad;
        ctx.fill();
        ctx.restore();

        // Parlama
        const parlama = ctx.createRadialGradient(-r * 0.35, -ovalY * 0.35, 0, -r * 0.35, -ovalY * 0.35, r * 0.45);
        parlama.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        parlama.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(-r * 0.35, -ovalY * 0.35, r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = parlama;
        ctx.fill();
    }

    cizElma(ctx) {
        const r = this.r;
        const ovalY = r * 0.85;

        // Gölge
        const golge = ctx.createRadialGradient(5, 5, 0, 5, 5, r);
        golge.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        golge.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.ellipse(5, 5, r * 0.95, ovalY * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = golge;
        ctx.fill();

        // Elma şekli - gerçekçi
        const gradient = ctx.createRadialGradient(-r * 0.25, -ovalY * 0.25, 0, 0, 0, r);
        gradient.addColorStop(0, '#ff6b6b');
        gradient.addColorStop(0.3, '#e84848');
        gradient.addColorStop(0.6, '#c82828');
        gradient.addColorStop(1, '#a81818');

        ctx.beginPath();
        ctx.moveTo(0, -ovalY);
        ctx.bezierCurveTo(r * 0.4, -ovalY * 0.7, r * 0.8, -ovalY * 0.4, r, 0);
        ctx.bezierCurveTo(r, ovalY * 0.4, r * 0.5, ovalY, 0, ovalY);
        ctx.bezierCurveTo(-r * 0.5, ovalY, -r, ovalY * 0.4, -r, 0);
        ctx.bezierCurveTo(-r * 0.8, -ovalY * 0.4, -r * 0.4, -ovalY * 0.7, 0, -ovalY);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Elma lekeleri
        for (let i = 0; i < 4; i++) {
            const aci = Math.random() * Math.PI * 2;
            const rad = Math.random() * r * 0.6;
            const px = Math.cos(aci) * rad;
            const py = Math.sin(aci) * rad * (ovalY / r);
            ctx.beginPath();
            ctx.arc(px, py, Math.random() * 3 + 1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(150, 50, 50, 0.2)';
            ctx.fill();
        }

        // İç kısım
        const icGradient = ctx.createRadialGradient(-r * 0.1, -ovalY * 0.1, 0, 0, 0, r * 0.5);
        icGradient.addColorStop(0, '#ffe0e0');
        icGradient.addColorStop(0.5, '#ffb4b4');
        icGradient.addColorStop(1, '#e89898');

        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.5, ovalY * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = icGradient;
        ctx.fill();

        // Çekirdek
        const cekGrad = ctx.createRadialGradient(-1, -1, 0, 0, 0, 4);
        cekGrad.addColorStop(0, '#7a5c3a');
        cekGrad.addColorStop(1, '#4a3c2a');
        ctx.beginPath();
        ctx.ellipse(0, 0, 3, 4, 0, 0, Math.PI * 2);
        ctx.fillStyle = cekGrad;
        ctx.fill();

        // Sap
        const sapGrad = ctx.createLinearGradient(-3, -ovalY, 3, -ovalY);
        sapGrad.addColorStop(0, '#6a4c2a');
        sapGrad.addColorStop(0.5, '#4a3c1a');
        sapGrad.addColorStop(1, '#3a2c0a');
        ctx.beginPath();
        ctx.moveTo(0, -ovalY * 0.75);
        ctx.quadraticCurveTo(5, -ovalY, 0, -ovalY * 1.15);
        ctx.quadraticCurveTo(-5, -ovalY, 0, -ovalY * 0.75);
        ctx.fillStyle = sapGrad;
        ctx.fill();

        // Yaprak
        ctx.save();
        ctx.translate(0, -ovalY * 1.15);
        ctx.rotate(Math.PI / 4);
        const yaprakGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 12);
        yaprakGrad.addColorStop(0, '#5d8a57');
        yaprakGrad.addColorStop(1, '#2d5a27');
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(9, -5, 14, 0);
        ctx.quadraticCurveTo(9, 5, 0, 0);
        ctx.fillStyle = yaprakGrad;
        ctx.fill();
        ctx.restore();

        // Parlama
        const parlama = ctx.createRadialGradient(-r * 0.35, -ovalY * 0.35, 0, -r * 0.35, -ovalY * 0.35, r * 0.4);
        parlama.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        parlama.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(-r * 0.35, -ovalY * 0.35, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = parlama;
        ctx.fill();
    }

    cizLimon(ctx) {
        const r = this.r;
        const ovalY = r * 0.7;

        // Gölge
        const golge = ctx.createRadialGradient(5, 5, 0, 5, 5, r);
        golge.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        golge.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.ellipse(5, 5, r * 0.95, ovalY * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = golge;
        ctx.fill();

        // Ana gövde
        const gradient = ctx.createRadialGradient(-r * 0.25, -ovalY * 0.25, 0, 0, 0, r);
        gradient.addColorStop(0, '#ffff60');
        gradient.addColorStop(0.4, '#e6e640');
        gradient.addColorStop(0.7, '#c6c620');
        gradient.addColorStop(1, '#a6a600');

        ctx.beginPath();
        ctx.ellipse(0, 0, r, ovalY, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Pütürlü doku
        for (let i = 0; i < 30; i++) {
            const aci = Math.random() * Math.PI * 2;
            const rad = Math.random() * r * 0.9;
            const px = Math.cos(aci) * rad;
            const py = Math.sin(aci) * rad * (ovalY / r);
            ctx.beginPath();
            ctx.arc(px, py, Math.random() * 1.2 + 0.4, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 200, 0.2)';
            ctx.fill();
        }

        // İç kısım
        const icGradient = ctx.createRadialGradient(-r * 0.1, -ovalY * 0.1, 0, 0, 0, r * 0.5);
        icGradient.addColorStop(0, '#ffffd0');
        icGradient.addColorStop(0.5, '#ffffa0');
        icGradient.addColorStop(1, '#e6e680');

        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.5, ovalY * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = icGradient;
        ctx.fill();

        // Parlama
        const parlama = ctx.createRadialGradient(-r * 0.35, -ovalY * 0.35, 0, -r * 0.35, -ovalY * 0.35, r * 0.45);
        parlama.addColorStop(0, 'rgba(255, 255, 255, 0.6)');
        parlama.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(-r * 0.35, -ovalY * 0.35, r * 0.45, 0, Math.PI * 2);
        ctx.fillStyle = parlama;
        ctx.fill();

        // Uç parlama
        const ucParlama = ctx.createRadialGradient(r * 0.3, ovalY * 0.2, 0, r * 0.3, ovalY * 0.2, r * 0.2);
        ucParlama.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        ucParlama.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(r * 0.3, ovalY * 0.2, r * 0.2, 0, Math.PI * 2);
        ctx.fillStyle = ucParlama;
        ctx.fill();
    }

    cizDigerMeyve(ctx) {
        const r = this.r;
        const ovalY = r * 0.85;

        // Gölge
        const golge = ctx.createRadialGradient(5, 5, 0, 5, 5, r);
        golge.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        golge.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.ellipse(5, 5, r * 0.95, ovalY * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = golge;
        ctx.fill();

        // Ana gövde
        const gradient = ctx.createRadialGradient(-r * 0.3, -ovalY * 0.3, 0, 0, 0, r);
        gradient.addColorStop(0, this.acikRengi(this.veri.renk));
        gradient.addColorStop(0.4, this.veri.renk);
        gradient.addColorStop(0.7, this.koyuRengi(this.veri.renk));
        gradient.addColorStop(1, this.cokKoyuRengi(this.veri.renk));

        ctx.beginPath();
        ctx.ellipse(0, 0, r, ovalY, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // İç kısım
        const icGradient = ctx.createRadialGradient(-r * 0.1, -ovalY * 0.1, 0, 0, 0, r * 0.5);
        icGradient.addColorStop(0, this.acikRengi(this.veri.ic));
        icGradient.addColorStop(0.5, this.veri.ic);
        icGradient.addColorStop(1, this.koyuRengi(this.veri.ic));

        ctx.beginPath();
        ctx.ellipse(0, 0, r * 0.5, ovalY * 0.5, 0, 0, Math.PI * 2);
        ctx.fillStyle = icGradient;
        ctx.fill();

        // Parlama
        const parlama = ctx.createRadialGradient(-r * 0.35, -ovalY * 0.35, 0, -r * 0.35, -ovalY * 0.35, r * 0.4);
        parlama.addColorStop(0, 'rgba(255, 255, 255, 0.5)');
        parlama.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(-r * 0.35, -ovalY * 0.35, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = parlama;
        ctx.fill();
    }

    cizMuz(ctx) {
        const r = this.r;
        const uzunluk = r * 2.5;
        const genislik = r * 0.6;

        // Gölge
        const golge = ctx.createRadialGradient(5, 5, 0, 5, 5, uzunluk * 0.5);
        golge.addColorStop(0, 'rgba(0, 0, 0, 0.25)');
        golge.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.ellipse(5, 5, uzunluk * 0.5, genislik * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = golge;
        ctx.fill();

        // Muz gövdesi - kavisli şekil
        const gradient = ctx.createLinearGradient(-uzunluk * 0.4, 0, uzunluk * 0.4, 0);
        gradient.addColorStop(0, '#ffe135');
        gradient.addColorStop(0.3, '#ffe035');
        gradient.addColorStop(0.6, '#e6c020');
        gradient.addColorStop(1, '#c6a010');

        ctx.save();
        ctx.rotate(-Math.PI / 6);

        ctx.beginPath();
        ctx.moveTo(-uzunluk * 0.4, -genislik * 0.3);
        ctx.quadraticCurveTo(0, -genislik * 0.5, uzunluk * 0.4, -genislik * 0.2);
        ctx.quadraticCurveTo(uzunluk * 0.5, 0, uzunluk * 0.4, genislik * 0.2);
        ctx.quadraticCurveTo(0, genislik * 0.5, -uzunluk * 0.4, genislik * 0.3);
        ctx.quadraticCurveTo(-uzunluk * 0.5, 0, -uzunluk * 0.4, -genislik * 0.3);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Muz lekeleri
        for (let i = 0; i < 5; i++) {
            const x = (Math.random() - 0.5) * uzunluk * 0.6;
            const y = (Math.random() - 0.5) * genislik * 0.8;
            ctx.beginPath();
            ctx.arc(x, y, Math.random() * 2 + 1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(180, 140, 20, 0.2)';
            ctx.fill();
        }

        // İç kısım
        const icGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, genislik * 0.4);
        icGradient.addColorStop(0, '#fffacd');
        icGradient.addColorStop(0.5, '#ffe0a0');
        icGradient.addColorStop(1, '#e6c080');

        ctx.beginPath();
        ctx.ellipse(0, 0, genislik * 0.4, genislik * 0.35, 0, 0, Math.PI * 2);
        ctx.fillStyle = icGradient;
        ctx.fill();

        // Sap
        const sapGrad = ctx.createLinearGradient(-uzunluk * 0.4, -genislik * 0.3, -uzunluk * 0.5, -genislik * 0.5);
        sapGrad.addColorStop(0, '#6a4c2a');
        sapGrad.addColorStop(1, '#3a2c1a');
        ctx.beginPath();
        ctx.moveTo(-uzunluk * 0.4, -genislik * 0.3);
        ctx.quadraticCurveTo(-uzunluk * 0.45, -genislik * 0.4, -uzunluk * 0.5, -genislik * 0.35);
        ctx.quadraticCurveTo(-uzunluk * 0.45, -genislik * 0.2, -uzunluk * 0.4, -genislik * 0.25);
        ctx.fillStyle = sapGrad;
        ctx.fill();

        // Parlama
        const parlama = ctx.createRadialGradient(-uzunluk * 0.2, -genislik * 0.2, 0, -uzunluk * 0.2, -genislik * 0.2, uzunluk * 0.3);
        parlama.addColorStop(0, 'rgba(255, 255, 255, 0.4)');
        parlama.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(-uzunluk * 0.2, -genislik * 0.2, uzunluk * 0.3, 0, Math.PI * 2);
        ctx.fillStyle = parlama;
        ctx.fill();

        ctx.restore();
    }

    cizBomba(ctx) {
        const r = this.r;

        // Gölge
        const golge = ctx.createRadialGradient(5, 5, 0, 5, 5, r);
        golge.addColorStop(0, 'rgba(0, 0, 0, 0.3)');
        golge.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.beginPath();
        ctx.ellipse(5, 5, r * 0.95, r * 0.95, 0, 0, Math.PI * 2);
        ctx.fillStyle = golge;
        ctx.fill();

        // Ana gövde - siyah bomba
        const gradient = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
        gradient.addColorStop(0, '#4a4a4a');
        gradient.addColorStop(0.4, '#2a2a2a');
        gradient.addColorStop(0.7, '#1a1a1a');
        gradient.addColorStop(1, '#0a0a0a');

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Bomba dokusu - metalik
        for (let i = 0; i < 15; i++) {
            const aci = Math.random() * Math.PI * 2;
            const rad = Math.random() * r * 0.9;
            const px = Math.cos(aci) * rad;
            const py = Math.sin(aci) * rad;
            ctx.beginPath();
            ctx.arc(px, py, Math.random() * 2 + 0.5, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
            ctx.fill();
        }

        // Kırmızı fitil
        const fitilGrad = ctx.createLinearGradient(0, -r, 0, -r * 1.3);
        fitilGrad.addColorStop(0, '#ff0000');
        fitilGrad.addColorStop(0.5, '#ff4444');
        fitilGrad.addColorStop(1, '#ff6666');
        ctx.beginPath();
        ctx.moveTo(0, -r);
        ctx.quadraticCurveTo(5, -r * 1.1, 0, -r * 1.25);
        ctx.quadraticCurveTo(-5, -r * 1.1, 0, -r);
        ctx.fillStyle = fitilGrad;
        ctx.fill();

        // Fitil ucu - kıvılcım
        const zaman = Date.now() / 100;
        const sparkX = Math.sin(zaman) * 3;
        const sparkY = -r * 1.25 + Math.cos(zaman * 2) * 2;

        const sparkGrad = ctx.createRadialGradient(sparkX, sparkY, 0, sparkX, sparkY, 8);
        sparkGrad.addColorStop(0, '#ffff00');
        sparkGrad.addColorStop(0.3, '#ff8800');
        sparkGrad.addColorStop(0.6, '#ff4400');
        sparkGrad.addColorStop(1, 'rgba(255, 0, 0, 0)');
        ctx.beginPath();
        ctx.arc(sparkX, sparkY, 8, 0, Math.PI * 2);
        ctx.fillStyle = sparkGrad;
        ctx.fill();

        // İkinci kıvılcım
        const spark2X = sparkX + Math.sin(zaman * 1.5) * 5;
        const spark2Y = sparkY + Math.cos(zaman * 1.5) * 3;
        ctx.beginPath();
        ctx.arc(spark2X, spark2Y, 4, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 200, 0, 0.6)';
        ctx.fill();

        // Parlama
        const parlama = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, -r * 0.3, -r * 0.3, r * 0.4);
        parlama.addColorStop(0, 'rgba(255, 255, 255, 0.3)');
        parlama.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(-r * 0.3, -r * 0.3, r * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = parlama;
        ctx.fill();

        // Dikkat işareti - kırmızı çerçeve
        ctx.strokeStyle = '#ff0000';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
        ctx.stroke();
    }

    acikRengi(hex) {
        // Hex'ten daha açık renk üret
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.min(255, r * 1.2)}, ${Math.min(255, g * 1.2)}, ${Math.min(255, b * 1.2)})`;
    }

    cokKoyuRengi(hex) {
        // Hex'ten çok koyu renk üret
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.max(0, r * 0.4)}, ${Math.max(0, g * 0.4)}, ${Math.max(0, b * 0.4)})`;
    }

    koyuRengi(hex) {
        // Hex'ten daha koyu renk üret
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgb(${Math.max(0, r * 0.7)}, ${Math.max(0, g * 0.7)}, ${Math.max(0, b * 0.7)})`;
    }

    kabukDokusu(ctx, ovalX, ovalY) {
        // Kabuk pütürleri ve dokusu
        if (this.veri.ad === 'portakal') {
            // Portakal kabuğu pütürleri
            for (let i = 0; i < 40; i++) {
                const aci = Math.random() * Math.PI * 2;
                const r = Math.random() * ovalX * 0.9;
                const px = Math.cos(aci) * r;
                const py = Math.sin(aci) * r * (ovalY / ovalX);
                if ((px * px) / (ovalX * ovalX) + (py * py) / (ovalY * ovalY) < 0.9) {
                    ctx.beginPath();
                    ctx.arc(px, py, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.fill();
                }
            }
        } else if (this.veri.ad === 'limon') {
            // Limon kabuğu pütürleri
            for (let i = 0; i < 25; i++) {
                const aci = Math.random() * Math.PI * 2;
                const r = Math.random() * ovalX * 0.85;
                const px = Math.cos(aci) * r;
                const py = Math.sin(aci) * r * (ovalY / ovalX);
                if ((px * px) / (ovalX * ovalX) + (py * py) / (ovalY * ovalY) < 0.85) {
                    ctx.beginPath();
                    ctx.arc(px, py, Math.random() * 1 + 0.3, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 200, 0.15)';
                    ctx.fill();
                }
            }
        }
    }

    meyveDokusu(ctx, ovalX, ovalY) {
        // Meyve tipine göre doku
        if (this.veri.ad === 'karpuz') {
            // Karpuz çizgileri - daha detaylı
            ctx.strokeStyle = 'rgba(0, 80, 0, 0.25)';
            ctx.lineWidth = 1.5;
            for (let i = 0; i < 7; i++) {
                const y = -ovalY + (i + 1) * (ovalY * 2 / 8);
                ctx.beginPath();
                ctx.ellipse(0, 0, ovalX * 0.9, ovalY * 0.9, 0, Math.asin(y / ovalY), Math.PI - Math.asin(y / ovalY));
                ctx.stroke();
            }
            // Dikey çizgiler
            ctx.strokeStyle = 'rgba(0, 80, 0, 0.15)';
            for (let i = -3; i <= 3; i++) {
                if (i === 0) continue;
                const x = i * ovalX * 0.3;
                ctx.beginPath();
                ctx.ellipse(0, 0, ovalX * 0.9, ovalY * 0.9, 0, Math.acos(x / (ovalX * 0.9)), -Math.acos(x / (ovalX * 0.9)));
                ctx.stroke();
            }
        } else if (this.veri.ad === 'portakal') {
            // Portakal pütürlü doku - daha detaylı
            for (let i = 0; i < 30; i++) {
                const aci = (i / 30) * Math.PI * 2;
                const px = Math.cos(aci) * ovalX * 0.85;
                const py = Math.sin(aci) * ovalY * 0.85;
                const boyut = Math.random() * 2 + 1;
                ctx.beginPath();
                ctx.arc(px, py, boyut, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
                ctx.fill();
            }
            // Portakal çizgileri
            ctx.strokeStyle = 'rgba(200, 150, 0, 0.1)';
            ctx.lineWidth = 0.5;
            for (let i = 0; i < 12; i++) {
                const aci = (i / 12) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(aci) * ovalX * 0.9, Math.sin(aci) * ovalY * 0.9);
                ctx.stroke();
            }
        } else if (this.veri.ad === 'limon') {
            // Limon dokusu - daha detaylı
            for (let i = 0; i < 20; i++) {
                const px = (Math.random() - 0.5) * ovalX * 1.6;
                const py = (Math.random() - 0.5) * ovalY * 1.6;
                if ((px * px) / (ovalX * ovalX) + (py * py) / (ovalY * ovalY) < 1) {
                    ctx.beginPath();
                    ctx.arc(px, py, Math.random() * 1.5 + 0.5, 0, Math.PI * 2);
                    ctx.fillStyle = 'rgba(255, 255, 200, 0.25)';
                    ctx.fill();
                }
            }
        } else if (this.veri.ad === 'elma') {
            // Elma dokusu - hafif çizgiler
            ctx.strokeStyle = 'rgba(200, 100, 100, 0.2)';
            ctx.lineWidth = 1;
            for (let i = 0; i < 5; i++) {
                const aci = (i / 5) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(aci) * ovalX * 0.8, Math.sin(aci) * ovalY * 0.8);
                ctx.stroke();
            }
        }
    }

    meyveLekeleri(ctx, ovalX, ovalY) {
        // Meyve lekeleri ve çizikleri
        if (this.veri.ad === 'elma' || this.veri.ad === 'portakal') {
            // Lekeler
            for (let i = 0; i < 3; i++) {
                const aci = Math.random() * Math.PI * 2;
                const r = Math.random() * ovalX * 0.6;
                const px = Math.cos(aci) * r;
                const py = Math.sin(aci) * r * (ovalY / ovalX);
                const boyut = Math.random() * 3 + 2;
                ctx.beginPath();
                ctx.arc(px, py, boyut, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
                ctx.fill();
            }
        }
    }

    icSuDamlalari(ctx, ovalX, ovalY) {
        // İç kısım su damlaları
        if (this.veri.ad === 'karpuz' || this.veri.ad === 'portakal') {
            for (let i = 0; i < 5; i++) {
                const aci = Math.random() * Math.PI * 2;
                const r = Math.random() * ovalX * 0.4;
                const px = Math.cos(aci) * r;
                const py = Math.sin(aci) * r * (ovalY / ovalX);
                ctx.beginPath();
                ctx.arc(px, py, Math.random() * 2 + 1, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
            }
        }
    }

    yansimaEfekti(ctx, ovalX, ovalY) {
        // Yansıma efekti
        const yansimaGradient = ctx.createRadialGradient(ovalX * 0.3, ovalY * 0.3, 0, ovalX * 0.3, ovalY * 0.3, ovalX * 0.4);
        yansimaGradient.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        yansimaGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.beginPath();
        ctx.arc(ovalX * 0.3, ovalY * 0.3, ovalX * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = yansimaGradient;
        ctx.fill();
    }

    meyveSap(ctx, ovalY) {
        // Meyve sapı
        if (this.veri.ad === 'karpuz' || this.veri.ad === 'uzum') {
            // Karpuz ve üzüm sapı yok
            return;
        }

        const sapRengi = '#4a2c0a';
        const sapGradient = ctx.createLinearGradient(-3, -ovalY, 3, -ovalY);
        sapGradient.addColorStop(0, '#6a3c1a');
        sapGradient.addColorStop(0.5, '#4a2c0a');
        sapGradient.addColorStop(1, '#2a1c0a');

        ctx.beginPath();
        ctx.moveTo(0, -ovalY * 0.8);
        ctx.quadraticCurveTo(5, -ovalY, 0, -ovalY * 1.2);
        ctx.quadraticCurveTo(-5, -ovalY, 0, -ovalY * 0.8);
        ctx.fillStyle = sapGradient;
        ctx.fill();
        ctx.strokeStyle = '#1a0c0a';
        ctx.lineWidth = 1;
        ctx.stroke();
    }

    icDetaylari(ctx, ovalX, ovalY) {
        // Meyve içi detayları (tohumlar, çekirdekler vb.)
        if (this.veri.ad === 'karpuz') {
            // Karpuz tohumları - daha detaylı
            for (let i = 0; i < 10; i++) {
                const aci = (i / 10) * Math.PI * 2;
                const px = Math.cos(aci) * ovalX * 0.45;
                const py = Math.sin(aci) * ovalY * 0.45;

                // Tohum dışı
                const tohumGradient = ctx.createRadialGradient(px - 1, py - 1, 0, px, py, 3);
                tohumGradient.addColorStop(0, '#3a3a3a');
                tohumGradient.addColorStop(1, '#1a1a1a');
                ctx.beginPath();
                ctx.ellipse(px, py, 2.5, 3.5, aci, 0, Math.PI * 2);
                ctx.fillStyle = tohumGradient;
                ctx.fill();

                // Tohum parlama
                ctx.beginPath();
                ctx.arc(px - 0.5, py - 0.5, 0.8, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
                ctx.fill();
            }
        } else if (this.veri.ad === 'portakal') {
            // Portakal segmentleri - daha detaylı
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
            ctx.lineWidth = 0.8;
            for (let i = 0; i < 8; i++) {
                const aci = (i / 8) * Math.PI * 2;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(aci) * ovalX, Math.sin(aci) * ovalY);
                ctx.stroke();
            }
        } else if (this.veri.ad === 'limon') {
            // Limon çekirdeği yok
        } else {
            // Elma çekirdeği - daha detaylı
            const cekirdekGradient = ctx.createRadialGradient(-1, -1, 0, 0, 0, 4);
            cekirdekGradient.addColorStop(0, '#6a4c2a');
            cekirdekGradient.addColorStop(1, '#3a2c1a');
            ctx.beginPath();
            ctx.ellipse(0, 0, 3, 4, 0, 0, Math.PI * 2);
            ctx.fillStyle = cekirdekGradient;
            ctx.fill();

            // Çekirdek parlama
            ctx.beginPath();
            ctx.arc(-1, -1, 1, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            ctx.fill();
        }
    }

    meyveYaprak(ctx, ovalY) {
        // Meyve yaprağı
        if (this.veri.ad !== 'portakal' && this.veri.ad !== 'elma') {
            return;
        }

        const yaprakRengi = '#2d5a27';
        const yaprakGradient = ctx.createRadialGradient(0, -ovalY * 1.3, 0, 0, -ovalY * 1.3, 15);
        yaprakGradient.addColorStop(0, '#4d7a47');
        yaprakGradient.addColorStop(1, '#1d4a17');

        ctx.save();
        ctx.translate(0, -ovalY * 1.2);
        ctx.rotate(Math.PI / 6);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(10, -5, 15, 0);
        ctx.quadraticCurveTo(10, 5, 0, 0);
        ctx.fillStyle = yaprakGradient;
        ctx.fill();
        ctx.strokeStyle = '#0d3a07';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Yaprak damarı
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(7, 0, 12, 0);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.lineWidth = 0.5;
        ctx.stroke();

        ctx.restore();
    }

    ekrandanCikti() {
        if (this.kesik) return this.alfa <= 0;
        return this.y > YUKSEKLIK + this.r + 10;
    }

    kes(yon, hiz) {
        this.kesik = true;
        this.alfa = 255;
        this.don = 0;
        this.kesYonu = yon; // Kesme yönünü kaydet

        // Kesme hızına göre parça sayısını belirle
        // Hız 3-6: 2 parça
        // Hız 6-10: 3 parça
        // Hız 10-14: 4 parça
        // Hız 14+: 5-6 parça
        let parcaSayisi;
        if (hiz < 6) parcaSayisi = 2;
        else if (hiz < 10) parcaSayisi = 3;
        else if (hiz < 14) parcaSayisi = 4;
        else parcaSayisi = Math.min(6, 5 + Math.floor((hiz - 14) / 5));

        // Kesme yönüne dik olarak parçalan
        const dikYon = { x: -yon.y, y: yon.x };

        // Parçaları oluştur
        this.parcalar = [];
        const guc = Math.min(10, hiz * 0.6);

        for (let i = 0; i < parcaSayisi; i++) {
            const aci = (i / parcaSayisi) * Math.PI * 2;
            const parca = {
                x: this.x + Math.cos(aci) * dikYon.x * 10,
                y: this.y + Math.sin(aci) * dikYon.y * 10,
                hizX: Math.cos(aci) * dikYon.x * guc + yon.x * 2 + (Math.random() - 0.5) * 3,
                hizY: Math.sin(aci) * dikYon.y * guc + yon.y * 2 + (Math.random() - 0.5) * 3,
                r: this.r / Math.sqrt(parcaSayisi),
                aci: aci
            };
            this.parcalar.push(parca);
        }

        // Kesme efekti ekle (hıza göre daha fazla)
        const efekSayisi = Math.min(20, Math.floor(hiz / 2) + 8);
        for (let i = 0; i < efekSayisi; i++) {
            efektler.push(new KesmeParcasi(this.x, this.y, this.veri.renk));
        }
    }
}

// Kesme parçacığı class (meyve suyu/su efekti)
class KesmeParcasi {
    constructor(x, y, renk) {
        this.x = x;
        this.y = y;
        this.renk = renk;
        this.hizX = (Math.random() - 0.5) * 8;
        this.hizY = (Math.random() - 0.5) * 8;
        this.boyut = Math.random() * 4 + 2;
        this.alfa = 255;
        this.zaman = Date.now();
    }

    guncelle() {
        this.x += this.hizX;
        this.y += this.hizY;
        this.hizY += 0.2; // Yer çekimi
        this.alfa -= 8;
    }

    ciz(ctx) {
        ctx.globalAlpha = this.alfa / 255;
        ctx.fillStyle = this.renk;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.boyut, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
    }

    bitti() {
        return this.alfa <= 0;
    }
}

// Kesme efekti class
class KesizEfekti {
    constructor(x, y) {
        this.noktalar = [{x, y}];
        this.zaman = Date.now();
        this.sure = 400;
    }

    ekle(x, y) {
        this.noktalar.push({x, y});
        if (this.noktalar.length > 12) this.noktalar.shift();
    }

    ciz(ctx) {
        const kalan = 1 - (Date.now() - this.zaman) / this.sure;
        if (kalan <= 0 || this.noktalar.length < 2) return;
        
        for (let i = 1; i < this.noktalar.length; i++) {
            const t = i / this.noktalar.length;
            const alfa = t * kalan;
            const kalinlik = Math.max(1, 4 * t * kalan);
            
            ctx.beginPath();
            ctx.moveTo(this.noktalar[i-1].x, this.noktalar[i-1].y);
            ctx.lineTo(this.noktalar[i].x, this.noktalar[i].y);
            ctx.strokeStyle = `rgba(${255 * kalan}, ${200 * t * kalan}, ${100 * kalan}, ${alfa})`;
            ctx.lineWidth = kalinlik;
            ctx.stroke();
        }
    }

    bitti() {
        return Date.now() - this.zaman > this.sure;
    }
}

// Puan efekti class
class PuanEfekti {
    constructor(x, y, metin, renk) {
        this.x = x;
        this.y = y;
        this.metin = metin;
        this.renk = renk;
        this.zaman = Date.now();
        this.sure = 1000;
    }

    guncelleVeCiz(ctx) {
        const kalan = 1 - (Date.now() - this.zaman) / this.sure;
        if (kalan <= 0) return false;
        
        this.y -= 1.5;
        ctx.save();
        ctx.globalAlpha = kalan;
        ctx.fillStyle = this.renk;
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(this.metin, this.x, this.y);
        ctx.restore();
        return true;
    }
}

// Arka plan çizimi
function arkaPlanCiz() {
    ctx.fillStyle = ARKA_PLAN;
    ctx.fillRect(0, 0, GENISLIK, YUKSEKLIK);
    
    // Yıldızlar
    const simdi = Date.now() / 1000;
    yildizlar.forEach(y => {
        const alfa = Math.floor(80 + 60 * Math.sin(simdi * y.par + y.y));
        ctx.beginPath();
        ctx.arc(y.x, y.y, 1 + y.par * 0.5, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${alfa}, ${alfa}, ${alfa + 30}, 0.8)`;
        ctx.fill();
    });
}

// Canları çiz
function canlarCiz() {
    const hearts = document.querySelectorAll('.heart');
    hearts.forEach((h, i) => {
        if (i < can) {
            h.classList.remove('lost');
        } else {
            h.classList.add('lost');
        }
    });
}

// UI güncelle
function uiGuncelle() {
    document.getElementById('score').textContent = puan;
    const sure = Math.floor((Date.now() - baslaZamani) / 1000);
    document.getElementById('timer').textContent = sure + 's';
    canlarCiz();
}

// Oyun döngüsü
function oyunDongusu() {
    if (!oyunAktif) return;
    
    // Arka plan
    arkaPlanCiz();
    
    if (!oyunBitti) {
        // Seviye hesapla (her 10 puanda bir seviye atla)
        seviye = 1 + Math.floor(puan / 10);

        // Yeni meyve ekle
        if (Date.now() - sonMeyve > meyveAralik) {
            // İleri seviyelerde 2 meyve birden gelebilir
            const sayi = (seviye >= 8 && Math.random() < 0.25) ? 2 : 1;
            for (let i = 0; i < sayi; i++) {
                // %15 şansla bomba düşür
                const bombaSansi = 0.15;
                const veri = Math.random() < bombaSansi ? MEYVELER[MEYVELER.length - 1] : MEYVELER[Math.floor(Math.random() * (MEYVELER.length - 1))];
                const m = new Meyve(1 + seviye * 0.03, veri); // Daha az hız artışı
                meyveler.push(m);
            }
            sonMeyve = Date.now();
            meyveAralik = Math.max(600, 1200 - seviye * 50);
        }
        
        // El takibi ve kesme
        if (elPoz) {
            if (!aktifIz) {
                aktifIz = new KesizEfekti(elPoz.x, elPoz.y);
            } else {
                aktifIz.ekle(elPoz.x, elPoz.y);
            }
            efektler.push(new KesizEfekti(elPoz.x, elPoz.y));
            
            // Hareket vektörü
            if (oncekiEl) {
                const dx = elPoz.x - oncekiEl.x;
                const dy = elPoz.y - oncekiEl.y;
                const hiz = Math.sqrt(dx*dx + dy*dy);
                
                if (hiz > 3 && elYonu) {
                    meyveler.forEach(m => {
                        if (!m.kesik) {
                            // Kılıcın ucunun pozisyonunu hesapla
                            const kılıcUzunluk = 150;
                            const kılıcGenislik = 15;
                            const kılıcUcX = elPoz.x + elYonu.x * kılıcUzunluk;
                            const kılıcUcY = elPoz.y + elYonu.y * kılıcUzunluk;

                            // Kılıç çizgisi ile meyve arasındaki mesafeyi kontrol et
                            // Kılıç çizgisi: elPoz -> kılıcUc (saptan uca)
                            const meyveX = m.x;
                            const meyveY = m.y;

                            // Kılıç çizgisi ile meyve arasındaki en kısa mesafeyi hesapla
                            const A = kılıcUcX - elPoz.x;
                            const B = kılıcUcY - elPoz.y;
                            const C = meyveX - elPoz.x;
                            const D = meyveY - elPoz.y;

                            const dot = A * C + B * D;
                            const lenSq = A * A + B * B;
                            let param = -1;
                            if (lenSq !== 0) param = dot / lenSq;

                            let xx, yy;
                            if (param < 0) {
                                xx = elPoz.x;
                                yy = elPoz.y;
                            } else if (param > 1) {
                                xx = kılıcUcX;
                                yy = kılıcUcY;
                            } else {
                                xx = elPoz.x + param * A;
                                yy = elPoz.y + param * B;
                            }

                            // Sap tarafı kontrolü - sadece bıçak kısmı (param >= 0) geçerli
                            if (param < 0) {
                                return; // Sap tarafı - geçersiz
                            }

                            const dx = meyveX - xx;
                            const dy = meyveY - yy;
                            const dist = Math.sqrt(dx * dx + dy * dy);

                            // Kılıç meyveye değdiyse kes - sadece meyve boyutu kadar
                            const kesmeYaricapi = m.getKesmeYaricapi();
                            if (dist < kesmeYaricapi + kılıcGenislik / 2) {
                                // Bomba kontrolü
                                if (m.veri.bomba) {
                                    // Bomba kesildi - oyun bitir
                                    can = 0;
                                    playSes('bitis');
                                    showGameOver();
                                    return;
                                }

                                m.kes(elYonu, hiz);
                                playSes('kes');

                                // Combo
                                const simdi = Date.now();
                                if (simdi - sonKesik < 1500) {
                                    combo++;
                                    if (combo >= 3) playSes('combo');
                                } else {
                                    combo = 1;
                                }
                                sonKesik = simdi;
                                
                                const kazanilan = combo;
                                puan += kazanilan;
                                let metin = '+' + kazanilan;
                                let renk = SARI;
                                if (combo >= 3) {
                                    metin += ' COMBO x' + combo + '!';
                                    renk = TURUNCU;
                                    showCombo();
                                }
                                puanEfektleri.push(new PuanEfekti(m.x, m.y - 20, metin, renk));
                            }
                        }
                    });
                }
            }
            oncekiEl = elPoz;
        } else {
            aktifIz = null;
            oncekiEl = null;
            elYonu = null;
            yumrukZamani = 0;
        }   
        // Meyveleri güncelle
        meyveler = meyveler.filter(m => {
            m.guncelle();
            if (m.ekrandanCikti()) {
                if (!m.kesik && !m.veri.bomba) {
                    can--;
                    playSes('miss');
                    puanEfektleri.push(new PuanEfekti(m.x, YUKSEKLIK - 60, 'Miss!', KIRMIZI));
                }
                return false;
            }
            return true;
        });

        // Efektleri temizle
        efektler = efektler.filter(e => {
            if (e instanceof KesmeParcasi) {
                e.guncelle();
                return !e.bitti();
            }
            return !e.bitti();
        });
        
        if (can <= 0) {
            oyunBitti = true;
            showGameOver();
        }
    }
    
    // Çizim
    meyveler.forEach(m => m.ciz(ctx));
    efektler.forEach(e => e.ciz(ctx));
    
    // El imleci - Kılıç çiz
    if (elPoz && elYonu) {
        const kılıcUzunluk = 150;
        const kılıcGenislik = 15;
        const aci = Math.atan2(elYonu.y, elYonu.x);

        ctx.save();
        ctx.translate(elPoz.x, elPoz.y);
        ctx.rotate(aci);

        // Kılıç bıçağı
        ctx.beginPath();
        ctx.moveTo(0, -kılıcGenislik / 2);
        ctx.lineTo(kılıcUzunluk, -kılıcGenislik / 4);
        ctx.lineTo(kılıcUzunluk, kılıcGenislik / 4);
        ctx.lineTo(0, kılıcGenislik / 2);
        ctx.closePath();
        ctx.fillStyle = '#C0C0C0'; // Gümüş
        ctx.fill();
        ctx.strokeStyle = '#808080';
        ctx.lineWidth = 1;
        ctx.stroke();

        // Kılıç ucu (keskin kısım)
        ctx.beginPath();
        ctx.moveTo(kılıcUzunluk, -kılıcGenislik / 4);
        ctx.lineTo(kılıcUzunluk + 15, 0);
        ctx.lineTo(kılıcUzunluk, kılıcGenislik / 4);
        ctx.closePath();
        ctx.fillStyle = '#E8E8E8';
        ctx.fill();
        ctx.strokeStyle = '#A0A0A0';
        ctx.stroke();

        // Sap
        ctx.beginPath();
        ctx.moveTo(0, -kılıcGenislik / 2);
        ctx.lineTo(-20, -kılıcGenislik / 3);
        ctx.lineTo(-20, kılıcGenislik / 3);
        ctx.lineTo(0, kılıcGenislik / 2);
        ctx.closePath();
        ctx.fillStyle = '#8B4513'; // Ahşap kahverengi
        ctx.fill();
        ctx.strokeStyle = '#5D3A1A';
        ctx.stroke();

        // Sap detayı
        ctx.beginPath();
        ctx.moveTo(-20, -kılıcGenislik / 3);
        ctx.lineTo(-25, -kılıcGenislik / 3);
        ctx.lineTo(-25, kılıcGenislik / 3);
        ctx.lineTo(-20, kılıcGenislik / 3);
        ctx.closePath();
        ctx.fillStyle = '#6B3510';
        ctx.fill();

        ctx.restore();

        // Parmağın konumu (küçük nokta)
        ctx.beginPath();
        ctx.arc(elPoz.x, elPoz.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
    }
    
    // Puan efektleri
    puanEfektleri = puanEfektleri.filter(pe => pe.guncelleVeCiz(ctx));
    
    // UI
    uiGuncelle();
    
    // Oyun bitti ekranı
    if (oyunBitti) {
        ctx.fillStyle = 'rgba(0,0,0,0.6)';
        ctx.fillRect(0, 0, GENISLIK, YUKSEKLIK);
    }
    
    requestAnimationFrame(oyunDongusu);
}

// Combo göster
function showCombo() {
    const display = document.getElementById('combo-display');
    display.textContent = 'COMBO x' + combo + '!';
    display.classList.add('show');
    setTimeout(() => display.classList.remove('show'), 1000);
}

// Oyun bitti
function showGameOver() {
    playSes('bitis');
    document.getElementById('final-score').textContent = 'Puan: ' + puan;
    document.getElementById('game-over-screen').classList.remove('hidden');
    const hint = document.getElementById('gesture-hint');
    if (hint) {
        hint.textContent = 'Tüm parmaklarınızı bükün (yumruk yapın)';
        hint.style.color = '#888';
    }
    oyunDurdur();
}

// Oyunu başlat
function oyunBaslat() {
    playSes('basla');
    meyveler = [];
    efektler = [];
    puanEfektleri = [];
    puan = 0;
    can = 5;
    combo = 0;
    sonKesik = 0;
    oyunBitti = false;
    oyunAktif = true;
    sonMeyve = Date.now();
    meyveAralik = 1200;
    baslaZamani = Date.now();
    seviye = 1;
    elYonu = null;
    yumrukZamani = 0;

    document.getElementById('start-screen').classList.add('hidden');
    document.getElementById('game-over-screen').classList.add('hidden');
    document.getElementById('gesture-progress').classList.add('hidden');

    oyunDongusu();
}

// Oyunu durdur
function oyunDurdur() {
    oyunAktif = false;
    oyunBitti = true;
    document.getElementById('gesture-progress').classList.add('hidden');
}

// MediaPipe Hands
const hands = new Hands({locateFile: (file) => {
    return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
}});

hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.7,
    minTrackingConfidence: 0.6
});

hands.onResults(onResults);

function onResults(results) {
    if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const hand = results.multiHandLandmarks[0];
        const indexTip = hand[8]; // İşaret parmağı ucu
        const indexBase = hand[5]; // İşaret parmağı kökü

        // Parmağın pozisyonu - daha geniş alan için çarpan
        const hareketCarpani = 1.3; // Hareket hassasiyeti
        const merkezX = GENISLIK / 2;
        const merkezY = YUKSEKLIK / 2;

        elPoz = {
            x: merkezX + ((1 - indexTip.x) - 0.5) * GENISLIK * hareketCarpani,
            y: merkezY + (indexTip.y - 0.5) * YUKSEKLIK * hareketCarpani
        };

        // Parmağın yönü (kökten uca vektör)
        const dx = (1 - indexTip.x) - (1 - indexBase.x);
        const dy = indexTip.y - indexBase.y;
        const uzunluk = Math.sqrt(dx*dx + dy*dy);

        elYonu = {
            x: dx / uzunluk,
            y: dy / uzunluk
        };

        // Yumruk işareti kontrolü (tüm parmaklar bükülü)
        const thumbTip = hand[4];
        const middleTip = hand[12];
        const ringTip = hand[16];
        const pinkyTip = hand[20];
        const middleBase = hand[9];
        const ringBase = hand[13];
        const pinkyBase = hand[17];

        // Parmağın bükülü olup olmadığını kontrol et (uç kökten aşağıda)
        const middleFolded = middleTip.y > middleBase.y;
        const ringFolded = ringTip.y > ringBase.y;
        const pinkyFolded = pinkyTip.y > pinkyBase.y;
        const indexFolded = indexTip.y > indexBase.y;

        // Yumruk = en az 3 parmak bükülü (işaret, orta, yüzük veya küçük)
        const yumrukYapildi = indexFolded && middleFolded && (ringFolded || pinkyFolded);

        if (yumrukYapildi) {
            // Sadece oyun başlamadıysa veya bittiyse göster
            if (!oyunAktif || oyunBitti) {
                if (yumrukZamani === 0) {
                    yumrukZamani = Date.now();
                } else {
                    const ilerleme = Math.min(100, (Date.now() - yumrukZamani) / 5);

                    if (!oyunBitti) {
                        // Başlangıç ekranında ilerleme çubuğu göster
                        const progressDiv = document.getElementById('gesture-progress');
                        progressDiv.classList.remove('hidden');
                        progressDiv.querySelector('.progress-bar-fill').style.width = ilerleme + '%';
                        progressDiv.querySelector('p').textContent = 'Yumruk tutun (0.5s)...';
                    } else {
                        // Oyun bitti ekranında hint'i güncelle
                        const hint = document.getElementById('gesture-hint');
                        if (hint) {
                            hint.textContent = `Yumruk tutun... %${Math.round(ilerleme)}`;
                            hint.style.color = '#ffdc3c';
                        }
                    }

                    if (Date.now() - yumrukZamani > 500) {
                        // 0.5 saniye yumruk tuttu - oyun başlat/tekrar oyna
                        initAudio(); // Audio context'i başlat
                        if (!oyunAktif) {
                            oyunBaslat();
                        } else if (oyunBitti) {
                            document.getElementById('game-over-screen').classList.add('hidden');
                            oyunBaslat();
                        }
                        yumrukZamani = 0;
                        if (!oyunBitti) {
                            document.getElementById('gesture-progress').classList.add('hidden');
                        }
                    }
                }
            }
        } else {
            yumrukZamani = 0;
            // Oyun başlamadıysa veya bittiyse yardım metni göster
            if (!oyunAktif || oyunBitti) {
                if (!oyunBitti) {
                    const progressDiv = document.getElementById('gesture-progress');
                    progressDiv.classList.remove('hidden');
                    progressDiv.querySelector('.progress-bar-fill').style.width = '0%';
                    progressDiv.querySelector('p').textContent = '👊 Tüm parmaklarınızı bükün (yumruk yapın)';
                } else {
                    // Oyun bitti ekranında hint'i güncelle
                    const hint = document.getElementById('gesture-hint');
                    if (hint) {
                        hint.textContent = 'Tüm parmaklarınızı bükün (yumruk yapın)';
                        hint.style.color = '#888';
                    }
                }
            } else {
                document.getElementById('gesture-progress').classList.add('hidden');
            }
        }
    } else {
        elPoz = null;
        elYonu = null;
        yumrukZamani = 0;
        // Oyun başlamadıysa veya bittiyse yardım metni göster
        if (!oyunAktif || oyunBitti) {
            if (!oyunBitti) {
                const progressDiv = document.getElementById('gesture-progress');
                progressDiv.classList.remove('hidden');
                progressDiv.querySelector('.progress-bar-fill').style.width = '0%';
                progressDiv.querySelector('p').textContent = '👊 Kameraya elinizi gösterin';
            } else {
                // Oyun bitti ekranında hint'i güncelle
                const hint = document.getElementById('gesture-hint');
                if (hint) {
                    hint.textContent = 'Kameraya elinizi gösterin';
                    hint.style.color = '#888';
                }
            }
        } else {
            document.getElementById('gesture-progress').classList.add('hidden');
        }
    }
}

// Kamera
let camera = null;

function startCamera() {
    document.getElementById('loading-screen').classList.remove('hidden');

    // Audio context'i başlat (kullanıcı etkileşimi için)
    initAudio();

    camera = new Camera(video, {
        onFrame: async () => {
            await hands.send({image: video});
        },
        width: 1280,
        height: 720
    });

    camera.start().then(() => {
        document.getElementById('loading-screen').classList.add('hidden');
        // Oyun başlatmayı bekle - çift parmak işareti ile başlayacak
        // oyunBaslat();
    }).catch(err => {
        alert('Kamera erişimi sağlanamadı. Lütfen kamera izni verin.');
        console.error(err);
    });
}

// Event listeners
// Çift parmak işareti ile kontrol - fare gerekmez

// Klavye kontrolü
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        oyunAktif = false;
        if (camera) camera.stop();
    }
});

// Sayfa yüklendiğinde kamera başlat
window.addEventListener('load', startCamera);
