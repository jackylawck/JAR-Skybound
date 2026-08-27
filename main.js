// ============================================================
// main.js - J.A.R. Skybound v3.6 (大氣、遠山、海面、精細客機與 FPS 監控)
// ============================================================

if (window.top !== window.self) {
    window.top.location = window.self.location;
}

import { SIM_CONFIG, I18N, UNITS } from './config.js';
import { SoundEngine } from './audio.js';
import { HUD } from './hud.js';
import { Autopilot } from './autopilot.js';
import { FMS } from './fms.js';

class FlightDataRecorder {
    constructor(sampleRateHz = 20) {
        this.interval = 1.0 / sampleRateHz;
        this.records = [];
        this.lastSampleTime = 0;
    }
    recordFrame(timeSec, s, ctrl, ap) {
        if (timeSec - this.lastSampleTime < this.interval) return;
        this.lastSampleTime = timeSec;
        if (this.records.length >= 36000) this.records.shift();
        
        this.records.push({
            timestamp_s: timeSec.toFixed(2),
            alt_ft: s.altitude.toFixed(1),
            alt_m: (s.altitude * UNITS.FT_TO_M).toFixed(1),
            ias_kt: s.speed.toFixed(1),
            tas_mps: (s.speed * UNITS.KTS_TO_MPS).toFixed(1),
            mach: s.mach.toFixed(3),
            pitch_deg: s.pitch.toFixed(2),
            roll_deg: s.roll.toFixed(2),
            hdg_deg: s.heading.toFixed(2),
            aoa_deg: s.aoa.toFixed(2),
            beta_deg: s.beta.toFixed(2),
            nz_g: s.gForce.toFixed(2),
            elev_cmd: ctrl.elevator.toFixed(3),
            ail_cmd: ctrl.aileron.toFixed(3),
            rud_cmd: ctrl.rudder.toFixed(3),
            thr_cmd: ctrl.throttle.toFixed(3),
            brk_cmd: ctrl.brake.toFixed(2),
            eng1_n1: s.engineData ? s.engineData.eng1_N1.toFixed(1) : 0,
            eng1_ff: s.engineData ? s.engineData.eng1_FF.toFixed(0) : 0,
            eng2_n1: s.engineData ? s.engineData.eng2_N1.toFixed(1) : 0,
            eng2_ff: s.engineData ? s.engineData.eng2_FF.toFixed(0) : 0,
            ap_master: ap.modes.AP_MASTER ? 1 : 0,
            ap_lnav: ap.modes.LNAV ? 1 : 0,
            ap_vnav: ap.modes.VNAV ? 1 : 0
        });
    }
    exportCSV() {
        if (this.records.length === 0) return alert("尚無飛行數據可導出！");
        const sanitize = (val) => {
            const str = String(val);
            return (/^[=+\-@\t\r]/.test(str)) ? `'${str}` : str;
        };
        const headers = Object.keys(this.records[0]).map(sanitize).join(",");
        const rows = this.records.map(r => Object.values(r).map(sanitize).join(",")).join("\n");
        const blob = new Blob([headers + "\n" + rows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Skybound_ARINC717_FDR_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

class FlightOscilloscope {
    constructor(canvas, maxPoints = 120) {
        this.canvas = canvas;
        this.ctx = canvas ? canvas.getContext('2d') : null;
        this.maxPoints = maxPoints;
        this.channels = { aoa: [], pitch: [], speed: [], gForce: [], n1: [] };
        this.activeMode = 'aero';
        this.isVisible = true;
        this.isDirty = false;
    }
    pushData(aoa, pitch, speed, gForce, n1) {
        const pushClamp = (arr, v) => { arr.push(v); if (arr.length > this.maxPoints) arr.shift(); };
        pushClamp(this.channels.aoa, aoa);
        pushClamp(this.channels.pitch, pitch);
        pushClamp(this.channels.speed, speed);
        pushClamp(this.channels.gForce, gForce);
        pushClamp(this.channels.n1, n1);
        this.isDirty = true;
    }
    switchMode() {
        this.activeMode = (this.activeMode === 'aero') ? 'perf' : 'aero';
        const label = document.getElementById('scope-mode-label');
        if (label) label.innerText = this.activeMode.toUpperCase();
    }
    render() {
        if (!this.ctx || !this.isVisible || !this.isDirty) return;
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        ctx.clearRect(0, 0, W, H);
        ctx.fillStyle = 'rgba(5, 15, 25, 0.85)';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(0, 150, 200, 0.15)';
        ctx.lineWidth = 1;
        for (let x = 0; x < W; x += 30) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y < H; y += 20) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        if (this.activeMode === 'aero') {
            this.drawCurve(this.channels.aoa, -5, 25, '#ff5500');
            this.drawCurve(this.channels.pitch, -30, 30, '#00ffcc');
            this.drawCurve(this.channels.gForce, 0, 3.5, '#ff00ff');
        } else {
            this.drawCurve(this.channels.speed, 100, 400, '#ffff00');
            this.drawCurve(this.channels.n1, 20, 100, '#00ff66');
        }
        this.isDirty = false;
    }
    drawCurve(data, minVal, maxVal, color) {
        if (data.length < 2) return;
        const ctx = this.ctx, W = this.canvas.width, H = this.canvas.height;
        const stepX = W / (this.maxPoints - 1);
        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 0; i < data.length; i++) {
            const normY = 1.0 - (data[i] - minVal) / (maxVal - minVal);
            const clampedY = Math.max(2, Math.min(H - 2, normY * H));
            const x = i * stepX;
            if (i === 0) ctx.moveTo(x, clampedY); else ctx.lineTo(x, clampedY);
        }
        ctx.stroke();
    }
    toggle() {
        this.isVisible = !this.isVisible;
        this.canvas.style.display = this.isVisible ? 'block' : 'none';
    }
}

const sound = new SoundEngine();
const ap = new Autopilot();
const fms = new FMS();
const fdr = new FlightDataRecorder(20);

let lastFrameTime = performance.now();
let s_buffer = { altitude: 10000, speed: 250, heading: 0, pitch: 0, roll: 0, x: 0, y: 0 };
let physicsWorker = null;

const keyStateControls = { elevator: 0, aileron: 0, rudder: 0, throttle: 0.6, brake: 0, isManualThrottleInput: false };

// 1. 雙語國際化
function applyLanguage() {
    const lang = SIM_CONFIG.currentLang;
    const t = I18N[lang];
    const safeSet = (id, txt) => { const el = document.getElementById(id); if (el) el.innerText = txt; };
    safeSet('ui-title', t.title);
    safeSet('ui-subtitle', t.subtitle);
    safeSet('start-btn', t.startBtn);
    safeSet('btn-lang', t.langBtn);
    safeSet('ui-mode-label', t.modeLabel);
    safeSet('ui-weather-label', t.weatherLabel);
    safeSet('ui-thr-label', t.throttle);

    const levelBtns = document.querySelectorAll('#group-level .opt-btn');
    if (levelBtns.length >= 3) {
        levelBtns[0].innerText = t.modes.junior;
        levelBtns[1].innerText = t.modes.advanced;
        levelBtns[2].innerText = t.modes.captain;
    }
    const weatherBtns = document.querySelectorAll('#group-weather .opt-btn');
    if (weatherBtns.length >= 4) {
        weatherBtns[0].innerText = t.weather.day;
        weatherBtns[1].innerText = t.weather.sunset;
        weatherBtns[2].innerText = t.weather.night;
        weatherBtns[3].innerText = t.weather.storm;
    }
    safeSet('btn-rud-left', t.rudderL);
    safeSet('btn-rud-right', t.rudderR);
    safeSet('btn-brake', t.brakes);
}

document.getElementById('btn-lang')?.addEventListener('click', () => {
    SIM_CONFIG.currentLang = (SIM_CONFIG.currentLang === 'zh') ? 'en' : 'zh';
    applyLanguage();
});
applyLanguage();

// 2. 難度與氣象選擇
document.querySelectorAll('#group-level .opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#group-level .opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SIM_CONFIG.currentLevel = btn.dataset.val;
        const telMode = document.getElementById('tel-mode');
        if (telMode) telMode.innerText = `LEVEL: ${SIM_CONFIG.currentLevel.toUpperCase()}`;
        if (physicsWorker) physicsWorker.postMessage({ type: 'config', level: SIM_CONFIG.currentLevel, weather: SIM_CONFIG.currentWeather });
    });
});

document.querySelectorAll('#group-weather .opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#group-weather .opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SIM_CONFIG.currentWeather = btn.dataset.val;
        applyWeather(SIM_CONFIG.currentWeather);
        if (physicsWorker) physicsWorker.postMessage({ type: 'config', level: SIM_CONFIG.currentLevel, weather: SIM_CONFIG.currentWeather });
    });
});

// ============================================================
// 3. 次世代 Three.js 渲染管線 (Rayleigh 大氣、遠山、海面、精細客機)
// ============================================================
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.2, 200000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
document.getElementById('canvas-container')?.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xccddff, 0.7); 
scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xfff8ee, 1.5); 
sunLight.position.set(8000, 12000, 6000); 
scene.add(sunLight);

// 🎨 A. 大氣散射著色器穹頂 (Rayleigh Dome)
const skyGeo = new THREE.SphereGeometry(150000, 32, 20);
const skyMat = new THREE.ShaderMaterial({
    vertexShader: `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform vec3 horizonColor;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize(vWorldPosition).y;
            vec3 col = mix(bottomColor, horizonColor, max(0.0, 1.0 - abs(h) * 3.5));
            if (h > 0.0) {
                col = mix(horizonColor, topColor, pow(h, exponent));
            }
            gl_FragColor = vec4(col, 1.0);
        }
    `,
    uniforms: {
        topColor: { value: new THREE.Color(0x184c8a) },
        horizonColor: { value: new THREE.Color(0x9eccf8) },
        bottomColor: { value: new THREE.Color(0x1a2618) },
        exponent: { value: 0.55 }
    },
    side: THREE.BackSide,
    depthWrite: false
});
const skyDome = new THREE.Mesh(skyGeo, skyMat);
scene.add(skyDome);

// 🎨 B. 遠景連綿山巒 (Procedural Mountain Ridgelines)
const mountainGroup = new THREE.Group();
const mtnGeo = new THREE.ConeGeometry(4500, 3200, 7);
const mtnMat = new THREE.MeshLambertMaterial({ color: 0x334433, flatShading: true });
for (let a = 0; a < Math.PI * 2; a += 0.35) {
    const dist = 35000 + Math.sin(a * 4) * 6000;
    const mtn = new THREE.Mesh(mtnGeo, mtnMat);
    mtn.position.set(Math.cos(a) * dist, 1200 + Math.random() * 600, Math.sin(a) * dist);
    mtn.scale.set(1 + Math.random() * 0.8, 0.8 + Math.random() * 0.7, 1 + Math.random() * 0.8);
    mountainGroup.add(mtn);
}
scene.add(mountainGroup);

// 🎨 C. 2048px 高精雙層大地紋理
function createHighResTerrainTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 2048; canvas.height = 2048;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e2d1a'; ctx.fillRect(0, 0, 2048, 2048);

    const fieldColors = ['#283b22', '#32452a', '#22301c', '#3a4a30', '#2a3520', '#1c2617', '#344229'];
    const cols = 32, rows = 32;
    const cw = 2048 / cols, ch = 2048 / rows;
    for (let i = 0; i < cols; i++) {
        for (let j = 0; j < rows; j++) {
            ctx.fillStyle = fieldColors[(i * 11 + j * 17) % fieldColors.length];
            ctx.fillRect(i * cw + 2, j * ch + 2, cw - 4, ch - 4);
        }
    }
    ctx.strokeStyle = 'rgba(90, 85, 75, 0.35)'; ctx.lineWidth = 3;
    for (let k = 0; k < 2048; k += 128) {
        ctx.beginPath(); ctx.moveTo(0, k); ctx.lineTo(2048, k); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(k, 0); ctx.lineTo(k, 2048); ctx.stroke();
    }
    const imgData = ctx.getImageData(0, 0, 2048, 2048);
    const data = imgData.data;
    for (let p = 0; p < data.length; p += 4) {
        const n = (Math.random() - 0.5) * 16;
        data[p] = Math.max(0, Math.min(255, data[p] + n));
        data[p+1] = Math.max(0, Math.min(255, data[p+1] + n));
        data[p+2] = Math.max(0, Math.min(255, data[p+2] + n));
    }
    ctx.putImageData(imgData, 0, 0);
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(35, 35);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
}

const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(160000, 160000),
    new THREE.MeshLambertMaterial({ map: createHighResTerrainTexture() })
);
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

// 🎨 D. 動態反光海面 (Dynamic Ocean Specular Surface)
const oceanGeo = new THREE.PlaneGeometry(80000, 120000);
const oceanMat = new THREE.MeshPhongMaterial({
    color: 0x0f2d4a,
    emissive: 0x04111f,
    specular: 0x88ccff,
    shininess: 90,
    transparent: true,
    opacity: 0.88
});
const ocean = new THREE.Mesh(oceanGeo, oceanMat);
ocean.rotation.x = -Math.PI / 2;
ocean.position.set(-50000, -0.5, 0); // 位於跑道左側西面大洋
scene.add(ocean);

// 🎨 E. ICAO 規範跑道與機場地景
function createRunwayTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 1024; canvas.height = 4096;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1a1c1e'; ctx.fillRect(0, 0, 1024, 4096);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(40, 0, 20, 4096); ctx.fillRect(964, 0, 20, 4096);
    for (let y = 150; y < 3946; y += 160) { ctx.fillRect(502, y, 20, 90); }
    for (let y = 400; y <= 1200; y += 200) {
        ctx.fillRect(200, y, 90, 14); ctx.fillRect(320, y, 90, 14);
        ctx.fillRect(614, y, 90, 14); ctx.fillRect(734, y, 90, 14);
        ctx.fillRect(200, 4096 - y - 14, 90, 14); ctx.fillRect(320, 4096 - y - 14, 90, 14);
        ctx.fillRect(614, 4096 - y - 14, 90, 14); ctx.fillRect(734, 4096 - y - 14, 90, 14);
    }
    for (let x = 100; x <= 900; x += 65) { ctx.fillRect(x, 80, 36, 220); ctx.fillRect(x, 3796, 36, 220); }
    ctx.font = 'bold 150px Consolas, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('09', 512, 480);
    ctx.save(); ctx.translate(512, 3616); ctx.rotate(Math.PI); ctx.fillText('27', 0, 0); ctx.restore();
    const tex = new THREE.CanvasTexture(canvas);
    tex.anisotropy = renderer.capabilities.getMaxAnisotropy();
    return tex;
}

const runway = new THREE.Mesh(new THREE.PlaneGeometry(90, 6000), new THREE.MeshLambertMaterial({ map: createRunwayTexture() }));
runway.rotation.x = -Math.PI / 2; runway.position.set(0, 0.2, 3000); scene.add(runway);

const taxiway = new THREE.Mesh(new THREE.PlaneGeometry(40, 6000), new THREE.MeshLambertMaterial({ color: 0x22262a }));
taxiway.rotation.x = -Math.PI / 2; taxiway.position.set(130, 0.15, 3000); scene.add(taxiway);

// 機場建築群
const airportGroup = new THREE.Group();
const towerBase = new THREE.Mesh(new THREE.CylinderGeometry(4, 6, 45, 16), new THREE.MeshLambertMaterial({ color: 0xdde2e6 }));
towerBase.position.set(200, 22.5, 3000);
const towerTop = new THREE.Mesh(new THREE.CylinderGeometry(9, 6, 10, 16), new THREE.MeshLambertMaterial({ color: 0x223344 }));
towerTop.position.set(200, 48, 3000);
const terminal = new THREE.Mesh(new THREE.BoxGeometry(70, 18, 280), new THREE.MeshLambertMaterial({ color: 0x8899aa }));
terminal.position.set(240, 9, 2800);
airportGroup.add(towerBase, towerTop, terminal);
scene.add(airportGroup);

// 🎨 F. 發光跑道燈與 PAPI 系統
function createGlowSpriteTexture(colorStr) {
    const canvas = document.createElement('canvas'); canvas.width = 64; canvas.height = 64;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, colorStr); grad.addColorStop(0.3, colorStr); grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(canvas);
}

const glowTexWhite = createGlowSpriteTexture('rgba(255,255,240,1.0)');
const glowTexGreen = createGlowSpriteTexture('rgba(0,255,120,1.0)');
const glowTexRed = createGlowSpriteTexture('rgba(255,40,40,1.0)');

const lightSpriteMatWhite = new THREE.SpriteMaterial({ map: glowTexWhite, transparent: true, blending: THREE.AdditiveBlending });
const lightSpriteMatGreen = new THREE.SpriteMaterial({ map: glowTexGreen, transparent: true, blending: THREE.AdditiveBlending });
const lightSpriteMatRed = new THREE.SpriteMaterial({ map: glowTexRed, transparent: true, blending: THREE.AdditiveBlending });

for (let z = 0; z <= 6000; z += 120) {
    const spL = new THREE.Sprite(lightSpriteMatWhite); spL.position.set(-47, 1.2, z); spL.scale.set(4.5, 4.5, 1); scene.add(spL);
    const spR = new THREE.Sprite(lightSpriteMatWhite); spR.position.set(47, 1.2, z); spR.scale.set(4.5, 4.5, 1); scene.add(spR);
}
for (let x = -42; x <= 42; x += 12) {
    const spT = new THREE.Sprite(lightSpriteMatGreen); spT.position.set(x, 1.2, 0); spT.scale.set(5, 5, 1); scene.add(spT);
    const spE = new THREE.Sprite(lightSpriteMatRed); spE.position.set(x, 1.2, 6000); spE.scale.set(5, 5, 1); scene.add(spE);
}

const papiSprites = [];
for (let p = 0; p < 4; p++) {
    const sp = new THREE.Sprite(lightSpriteMatWhite.clone());
    sp.position.set(-62 - (p * 5), 1.5, 350); sp.scale.set(4.5, 4.5, 1);
    scene.add(sp); papiSprites.push(sp);
}

// 🎨 G. 3D 程序化噴氣客機模型 (附座艙視角立柱)
const airplaneGroup = new THREE.Group();
const planeBodyMat = new THREE.MeshStandardMaterial({ color: 0xf0f3f6, roughness: 0.35, metalness: 0.2 });
const planeDarkMat = new THREE.MeshStandardMaterial({ color: 0x1a232f, roughness: 0.5 });

// 機身
const fuselage = new THREE.Mesh(new THREE.CylinderGeometry(1.9, 1.9, 32, 24), planeBodyMat);
fuselage.rotation.x = Math.PI / 2;
// 機鼻
const noseCone = new THREE.Mesh(new THREE.ConeGeometry(1.9, 5, 24), planeBodyMat);
noseCone.rotation.x = -Math.PI / 2; noseCone.position.set(0, 0, 18.5);
// 主翼 (後掠翼 + 翼尖小翼)
const wingL = new THREE.Mesh(new THREE.BoxGeometry(15, 0.3, 4.5), planeBodyMat);
wingL.position.set(-9, -0.2, 2); wingL.rotation.y = -0.35; wingL.rotation.z = 0.05;
const wingR = new THREE.Mesh(new THREE.BoxGeometry(15, 0.3, 4.5), planeBodyMat);
wingR.position.set(9, -0.2, 2); wingR.rotation.y = 0.35; wingR.rotation.z = -0.05;
const wingletL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.5), planeDarkMat);
wingletL.position.set(-16.2, 0.6, 4.5);
const wingletR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.6, 1.5), planeDarkMat);
wingletR.position.set(16.2, 0.6, 4.5);
// 垂直與水平尾翼
const vTail = new THREE.Mesh(new THREE.BoxGeometry(0.4, 5.5, 4.2), planeDarkMat);
vTail.position.set(0, 3.8, -13); vTail.rotation.x = -0.4;
const hTailL = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.25, 2.2), planeBodyMat);
hTailL.position.set(-3.2, 0.6, -14); hTailL.rotation.y = -0.3;
const hTailR = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.25, 2.2), planeBodyMat);
hTailR.position.set(3.2, 0.6, -14); hTailR.rotation.y = 0.3;
// 雙發動機短艙
const engMesh1 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.9, 4.2, 16), planeDarkMat);
engMesh1.rotation.x = Math.PI / 2; engMesh1.position.set(-5.4, -1.2, 2.5);
const engMesh2 = new THREE.Mesh(new THREE.CylinderGeometry(1.0, 0.9, 4.2, 16), planeDarkMat);
engMesh2.rotation.x = Math.PI / 2; engMesh2.position.set(5.4, -1.2, 2.5);

// 駕駛艙風擋立柱 (第一人稱座艙框)
const cockpitFrame = new THREE.Mesh(new THREE.TorusGeometry(1.5, 0.06, 8, 16, Math.PI), planeDarkMat);
cockpitFrame.position.set(0, 0.9, 13.5); cockpitFrame.rotation.x = Math.PI / 2;

airplaneGroup.add(fuselage, noseCone, wingL, wingR, wingletL, wingletR, vTail, hTailL, hTailR, engMesh1, engMesh2, cockpitFrame);
scene.add(airplaneGroup);

// 🎨 H. 三層立體漂浮雲海
function createProceduralCloudTexture() {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 1024;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#000000'; ctx.fillRect(0, 0, 1024, 1024);
    for (let i = 0; i < 90; i++) {
        const rx = Math.random() * 1024, ry = Math.random() * 1024, rr = 50 + Math.random() * 120;
        const grad = ctx.createRadialGradient(rx, ry, 0, rx, ry, rr);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
        grad.addColorStop(0.5, 'rgba(255, 255, 255, 0.12)');
        grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(rx, ry, rr, 0, Math.PI * 2); ctx.fill();
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping; tex.wrapT = THREE.RepeatWrapping;
    return tex;
}

const cloudTex1 = createProceduralCloudTexture(); cloudTex1.repeat.set(8, 8);
const cloudTex2 = createProceduralCloudTexture(); cloudTex2.repeat.set(12, 12);
const cloudLayer1 = new THREE.Mesh(new THREE.PlaneGeometry(120000, 120000), new THREE.MeshBasicMaterial({ map: cloudTex1, transparent: true, opacity: 0.4, depthWrite: false }));
cloudLayer1.rotation.x = Math.PI / 2; cloudLayer1.position.y = 2000; scene.add(cloudLayer1);

const cloudLayer2 = new THREE.Mesh(new THREE.PlaneGeometry(150000, 150000), new THREE.MeshBasicMaterial({ map: cloudTex2, transparent: true, opacity: 0.32, depthWrite: false }));
cloudLayer2.rotation.x = Math.PI / 2; cloudLayer2.position.y = 4200; scene.add(cloudLayer2);

function applyWeather(mode) {
    const envSpan = document.getElementById('tel-env');
    if (mode === 'day') {
        skyMat.uniforms.topColor.value.setHex(0x184c8a);
        skyMat.uniforms.horizonColor.value.setHex(0x9eccf8);
        scene.fog = new THREE.FogExp2(0xb2d6f8, 0.00003);
        ambientLight.color.setHex(0xddeeff); ambientLight.intensity = 0.7;
        sunLight.color.setHex(0xfff8ee); sunLight.intensity = 1.4;
        cloudLayer1.material.opacity = 0.4;
        if (envSpan) envSpan.innerText = 'ENV: DAY CLEAR';
    } else if (mode === 'sunset') {
        skyMat.uniforms.topColor.value.setHex(0x2d1746);
        skyMat.uniforms.horizonColor.value.setHex(0xdd5e26);
        scene.fog = new THREE.FogExp2(0xcc6633, 0.00005);
        ambientLight.color.setHex(0xffaa88); ambientLight.intensity = 0.5;
        sunLight.color.setHex(0xff5511); sunLight.intensity = 1.1;
        cloudLayer1.material.opacity = 0.55;
        if (envSpan) envSpan.innerText = 'ENV: SUNSET';
    } else if (mode === 'night') {
        skyMat.uniforms.topColor.value.setHex(0x010308);
        skyMat.uniforms.horizonColor.value.setHex(0x060f1e);
        scene.fog = new THREE.FogExp2(0x030715, 0.00007);
        ambientLight.color.setHex(0x223355); ambientLight.intensity = 0.2;
        sunLight.intensity = 0.05;
        cloudLayer1.material.opacity = 0.15;
        if (envSpan) envSpan.innerText = 'ENV: NIGHT IFR';
    } else if (mode === 'storm') {
        skyMat.uniforms.topColor.value.setHex(0x11161d);
        skyMat.uniforms.horizonColor.value.setHex(0x222d38);
        scene.fog = new THREE.FogExp2(0x1f272e, 0.0002);
        ambientLight.color.setHex(0x445566); ambientLight.intensity = 0.4;
        sunLight.intensity = 0.2;
        cloudLayer1.material.opacity = 0.85;
        if (envSpan) envSpan.innerText = 'ENV: STORM';
    }
}
applyWeather('day');

// 4. HUD 與示波器掛載
let hudCanvas = document.getElementById('hud-canvas');
if (!hudCanvas) {
    hudCanvas = document.createElement('canvas');
    hudCanvas.id = 'hud-canvas';
    hudCanvas.style.position = 'absolute';
    hudCanvas.style.top = '0';
    hudCanvas.style.left = '0';
    hudCanvas.style.width = '100vw';
    hudCanvas.style.height = '100vh';
    hudCanvas.style.pointerEvents = 'none';
    hudCanvas.style.zIndex = '12';
    document.getElementById('sim-interface')?.appendChild(hudCanvas);
}
const hud = new HUD(hudCanvas);

const oscCanvas = document.getElementById('oscilloscope-canvas');
const oscilloscope = new FlightOscilloscope(oscCanvas);
document.getElementById('btn-toggle-scope')?.addEventListener('click', () => oscilloscope.toggle());
document.getElementById('btn-scope-mode')?.addEventListener('click', () => oscilloscope.switchMode());
document.getElementById('btn-fdr-export')?.addEventListener('click', () => fdr.exportCSV());

let eng1Fault = false, eng2Fault = false;
document.getElementById('btn-fault-eng1')?.addEventListener('click', (e) => {
    eng1Fault = !eng1Fault;
    e.target.classList.toggle('active_fault', eng1Fault);
    if (physicsWorker) physicsWorker.postMessage({ type: 'fault', target: 'eng1', active: eng1Fault });
    if (eng1Fault) sound.speak("ENGINE 1 FLAMEOUT");
});
document.getElementById('btn-fault-eng2')?.addEventListener('click', (e) => {
    eng2Fault = !eng2Fault;
    e.target.classList.toggle('active_fault', eng2Fault);
    if (physicsWorker) physicsWorker.postMessage({ type: 'fault', target: 'eng2', active: eng2Fault });
    if (eng2Fault) sound.speak("ENGINE 2 FLAMEOUT");
});

// 5. 虛擬搖桿
const stickZone = document.getElementById('virtual-stick-zone');
const stickKnob = document.getElementById('virtual-stick-knob');
let isStickActive = false;
let stickCenter = { x: 0, y: 0 };

function resetStick() {
    isStickActive = false;
    if (stickKnob) stickKnob.style.transform = `translate(-50%, -50%)`;
    keyStateControls.aileron = 0;
    keyStateControls.elevator = 0;
}

function handleStickMove(clientX, clientY) {
    const dx = clientX - stickCenter.x;
    const dy = clientY - stickCenter.y;
    const dist = Math.hypot(dx, dy);
    const maxR = 40;
    if (dist < 2.0) {
        if (stickKnob) stickKnob.style.transform = `translate(-50%, -50%)`;
        keyStateControls.aileron = 0;
        keyStateControls.elevator = 0;
        return;
    }
    const clampedDist = Math.min(dist, maxR);
    const angle = Math.atan2(dy, dx);
    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    if (stickKnob) stickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
    keyStateControls.aileron = knobX / maxR;
    keyStateControls.elevator = knobY / maxR;
}

stickZone?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (ap.modes.AP_MASTER) { ap.toggleMode('AP_MASTER', s_buffer); updateMcpButtonsUI(); }
    isStickActive = true;
    const rect = stickZone.getBoundingClientRect();
    stickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    handleStickMove(e.touches[0].clientX, e.touches[0].clientY);
});
window.addEventListener('touchmove', (e) => {
    if (!isStickActive) return;
    handleStickMove(e.touches[0].clientX, e.touches[0].clientY);
});
window.addEventListener('touchend', resetStick);
window.addEventListener('touchcancel', resetStick);

stickZone?.addEventListener('mousedown', (e) => {
    e.preventDefault();
    if (ap.modes.AP_MASTER) { ap.toggleMode('AP_MASTER', s_buffer); updateMcpButtonsUI(); }
    isStickActive = true;
    const rect = stickZone.getBoundingClientRect();
    stickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
    handleStickMove(e.clientX, e.clientY);
});
window.addEventListener('mousemove', (e) => {
    if (!isStickActive) return;
    handleStickMove(e.clientX, e.clientY);
});
window.addEventListener('mouseup', resetStick);

// 6. 鍵盤飛行控制
window.addEventListener('keydown', (e) => {
    if (ap.modes.AP_MASTER) { ap.toggleMode('AP_MASTER', s_buffer); updateMcpButtonsUI(); }
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') keyStateControls.elevator = -0.8;
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') keyStateControls.elevator = 0.8;
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') keyStateControls.aileron = -0.8;
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') keyStateControls.aileron = 0.8;
    if (e.key === 'q' || e.key === 'Q') keyStateControls.rudder = -1.0;
    if (e.key === 'e' || e.key === 'E') keyStateControls.rudder = 1.0;
    if (e.key === ' ') keyStateControls.brake = 1.0;
});
window.addEventListener('keyup', (e) => {
    if (['ArrowUp', 'ArrowDown', 'w', 's', 'W', 'S'].includes(e.key)) keyStateControls.elevator = 0;
    if (['ArrowLeft', 'ArrowRight', 'a', 'd', 'A', 'D'].includes(e.key)) keyStateControls.aileron = 0;
    if (['q', 'e', 'Q', 'E'].includes(e.key)) keyStateControls.rudder = 0;
    if (e.key === ' ') keyStateControls.brake = 0;
});

const throttleSlider = document.getElementById('touch-throttle');
const thrValText = document.getElementById('thr-val-text');
throttleSlider?.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 100;
    keyStateControls.throttle = val;
    keyStateControls.isManualThrottleInput = true;
    if (thrValText) thrValText.innerText = `${Math.round(val * 100)}%`;
});

document.getElementById('btn-rud-left')?.addEventListener('pointerdown', () => keyStateControls.rudder = -1.0);
document.getElementById('btn-rud-left')?.addEventListener('pointerup', () => keyStateControls.rudder = 0);
document.getElementById('btn-rud-right')?.addEventListener('pointerdown', () => keyStateControls.rudder = 1.0);
document.getElementById('btn-rud-right')?.addEventListener('pointerup', () => keyStateControls.rudder = 0);
document.getElementById('btn-brake')?.addEventListener('pointerdown', () => keyStateControls.brake = 1.0);
document.getElementById('btn-brake')?.addEventListener('pointerup', () => keyStateControls.brake = 0);

// 7. MCP 面板
const btnAP = document.getElementById('btn-ap');
const btnLNAV = document.getElementById('btn-lnav');
const btnVNAV = document.getElementById('btn-vnav');
const valSpd = document.getElementById('mcp-spd-val');
const valHdg = document.getElementById('mcp-hdg-val');
const valAlt = document.getElementById('mcp-alt-val');

ap.setVoiceCallback((msg) => sound.speak(msg));
btnAP?.addEventListener('click', (e) => { e.stopPropagation(); ap.toggleMode('AP_MASTER', s_buffer); updateMcpButtonsUI(); });
btnLNAV?.addEventListener('click', (e) => { e.stopPropagation(); const active = fms.toggleLNAV(s_buffer); ap.modes.LNAV = active; if (active) ap.modes.HDG_HOLD = false; updateMcpButtonsUI(); });
btnVNAV?.addEventListener('click', (e) => { e.stopPropagation(); ap.toggleMode('VNAV', s_buffer); updateMcpButtonsUI(); });

function updateMcpButtonsUI() {
    btnAP?.classList.toggle('active', ap.modes.AP_MASTER);
    btnLNAV?.classList.toggle('active_lnav', ap.modes.LNAV);
    btnVNAV?.classList.toggle('active_vnav', ap.modes.VNAV);
    if (valSpd) valSpd.innerText = Math.round(ap.targets.speed);
    if (valHdg) valHdg.innerText = Math.round(ap.targets.heading).toString().padStart(3, '0');
    if (valAlt) valAlt.innerText = Math.round(ap.targets.altitude);
}

document.getElementById('spd-inc')?.addEventListener('click', () => { ap.setTarget('SPD', ap.targets.speed + 10); updateMcpButtonsUI(); });
document.getElementById('spd-dec')?.addEventListener('click', () => { ap.setTarget('SPD', ap.targets.speed - 10); updateMcpButtonsUI(); });
document.getElementById('hdg-inc')?.addEventListener('click', () => { ap.setTarget('HDG', ap.targets.heading + 5); updateMcpButtonsUI(); });
document.getElementById('hdg-dec')?.addEventListener('click', () => { ap.setTarget('HDG', ap.targets.heading - 5); updateMcpButtonsUI(); });
document.getElementById('alt-inc')?.addEventListener('click', () => { ap.setTarget('ALT', ap.targets.altitude + 500); updateMcpButtonsUI(); });
document.getElementById('alt-dec')?.addEventListener('click', () => { ap.setTarget('ALT', ap.targets.altitude - 500); updateMcpButtonsUI(); });

// 8. 模擬迴圈與 FPS 計算
let cloudOffset = 0;
let frameCount = 0;
let lastFpsTime = performance.now();

document.getElementById('start-btn')?.addEventListener('click', async () => {
    sound.init();
    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try { await DeviceOrientationEvent.requestPermission(); } catch (e) { console.error(e); }
    }
    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';

    physicsWorker = new Worker('physics.js');
    physicsWorker.postMessage({ type: 'config', level: SIM_CONFIG.currentLevel, weather: SIM_CONFIG.currentWeather });

    physicsWorker.onmessage = (e) => {
        const s = e.data;
        if (!s || typeof s !== 'object') return;
        s_buffer = s;

        const now = performance.now();
        const dt = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        // 實時 FPS 遙測計算
        frameCount++;
        if (now - lastFpsTime >= 1000) {
            const currentFps = Math.round((frameCount * 1000) / (now - lastFpsTime));
            const telFps = document.getElementById('tel-fps');
            if (telFps) telFps.innerText = `FPS: ${currentFps}`;
            frameCount = 0;
            lastFpsTime = now;
        }

        const fmsCmd = fms.update(s);
        const apCmds = ap.update(s, fmsCmd, dt);

        let finalControls = { ...keyStateControls };
        const apCfg = SIM_CONFIG.AUTOPILOT;

        if (apCmds && ap.modes.AP_MASTER) {
            if (Math.abs(keyStateControls.elevator) < apCfg.MANUAL_DEADZONE) finalControls.elevator = apCmds.elevator;
            if (Math.abs(keyStateControls.aileron) < apCfg.MANUAL_DEADZONE) finalControls.aileron = apCmds.aileron;
            if (keyStateControls.isManualThrottleInput) {
                ap.modes.SPD_HOLD = false; ap.modes.VNAV = false;
                keyStateControls.isManualThrottleInput = false;
            } else {
                finalControls.throttle = apCmds.throttle;
                if (throttleSlider) throttleSlider.value = Math.round(finalControls.throttle * 100);
                if (thrValText) thrValText.innerText = `${Math.round(finalControls.throttle * 100)}%`;
            }
        }

        physicsWorker.postMessage({ type: 'controls', ...finalControls });

        const eng1N1 = s.engineData ? s.engineData.eng1_N1 : 0;
        oscilloscope.pushData(s.aoa, s.pitch, s.speed, s.gForce, eng1N1);
        fdr.recordFrame(now / 1000, s, finalControls, ap);

        hud.update({
            speed: s.speed, altitude: s.altitude, mach: s.mach, aoa: s.aoa, gForce: s.gForce,
            pitch: s.pitch, roll: s.roll, heading: s.heading, alpha: s.aoa, beta: s.beta,
            vnav_active: ap.modes.VNAV, vdi_deviation: fmsCmd ? fmsCmd.vdi_deviation : 0,
            activeWaypoint: fmsCmd ? fmsCmd.activeWaypointId : null,
            waypointDistance: fmsCmd ? fmsCmd.distance : 0, vnav_phase: fmsCmd ? fmsCmd.vertical_phase : null
        });

        if (s.engineData) {
            const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
            setVal('eicas-n1-1', s.engineData.eng1_N1.toFixed(1));
            setVal('eicas-egt-1', Math.round(s.engineData.eng1_EGT));
            setVal('eicas-ff-1', Math.round(s.engineData.eng1_FF));
            setVal('eicas-n1-2', s.engineData.eng2_N1.toFixed(1));
            setVal('eicas-egt-2', Math.round(s.engineData.eng2_EGT));
            setVal('eicas-ff-2', Math.round(s.engineData.eng2_FF));
        }

        const qbarKpa = (0.5 * (s.density || 1.225) * Math.pow(s.speed * UNITS.KTS_TO_MPS, 2) * UNITS.PA_TO_KPA).toFixed(1);
        const telQbar = document.getElementById('tel-qbar');
        if (telQbar) telQbar.innerText = `QBAR: ${qbarKpa} kPa`;

        const vspeedFpm = (s.dz ? -s.dz : 0) * UNITS.M_TO_FT * 60;
        sound.update(finalControls.throttle, s.speed, s.altitude, vspeedFpm, s.aoa, s.altitude <= 5);

        // PAPI 盲降下滑燈物理視角計算
        const distToRwy = Math.hypot(s.x, s.y - 350);
        if (distToRwy > 100 && s.y < 350) {
            const currentGlideAngle = Math.atan2(s.altitude * 0.3048, distToRwy) * (180 / Math.PI);
            papiSprites[0].material = (currentGlideAngle > 3.5) ? lightSpriteMatWhite : lightSpriteMatRed;
            papiSprites[1].material = (currentGlideAngle > 3.2) ? lightSpriteMatWhite : lightSpriteMatRed;
            papiSprites[2].material = (currentGlideAngle > 2.8) ? lightSpriteMatWhite : lightSpriteMatRed;
            papiSprites[3].material = (currentGlideAngle > 2.5) ? lightSpriteMatWhite : lightSpriteMatRed;
        }

        // 動態海面與雲層流動
        cloudOffset += dt * 0.002;
        cloudTex1.offset.set(cloudOffset * 1.5, cloudOffset * 0.8);
        cloudTex2.offset.set(cloudOffset * 0.9, cloudOffset * 0.5);

        const planeAltitudeM = s.altMeters !== undefined ? s.altMeters : s.altitude * UNITS.FT_TO_M;
        const posX = s.x, posY = Math.max(2.4, planeAltitudeM + 2.4), posZ = s.y;

        // 同步 3D 飛機模型位置與姿態
        airplaneGroup.position.set(posX, posY - 0.4, posZ);
        airplaneGroup.rotation.order = 'YXZ';
        airplaneGroup.rotation.y = THREE.MathUtils.degToRad(-s.heading + 180);
        airplaneGroup.rotation.x = THREE.MathUtils.degToRad(-s.pitch);
        airplaneGroup.rotation.z = THREE.MathUtils.degToRad(s.roll);

        // 攝影機駕駛艙視角追隨
        camera.position.set(posX, posY, posZ);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = THREE.MathUtils.degToRad(-s.heading);
        camera.rotation.x = THREE.MathUtils.degToRad(s.pitch);
        camera.rotation.z = THREE.MathUtils.degToRad(-s.roll);
    };

    animate();
});

function animate() {
    requestAnimationFrame(animate);
    oscilloscope.render();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
