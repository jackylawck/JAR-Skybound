// ============================================================
// main.js - J.A.R. Skybound Pro 主控中樞 v2.6 (完整雙語與觸控版)
// ============================================================

import { SIM_CONFIG, I18N } from './config.js';
import { SoundEngine } from './audio.js';
import { HUD } from './hud.js';
import { Autopilot } from './autopilot.js';
import { FMS } from './fms.js';

const sound = new SoundEngine();
const ap = new Autopilot();
const fms = new FMS();

let lastFrameTime = performance.now();
let s_buffer = { altitude: 10000, speed: 250, heading: 0, pitch: 0, roll: 0, x: 0, y: 0 };

const keyStateControls = {
    elevator: 0,
    aileron: 0,
    rudder: 0,
    throttle: 0.6,
    brake: 0,
    isManualThrottleInput: false
};

// 1. 介面雙語即時切換邏輯
function applyLanguage() {
    const lang = SIM_CONFIG.currentLang;
    const t = I18N[lang];

    document.getElementById('ui-title').innerText = t.title;
    document.getElementById('ui-subtitle').innerText = t.subtitle;
    document.getElementById('start-btn').innerText = t.startBtn;
    document.getElementById('btn-lang').innerText = t.langBtn;
    document.getElementById('ui-mode-label').innerText = t.modeLabel;
    document.getElementById('ui-weather-label').innerText = t.weatherLabel;
    document.getElementById('ui-thr-label').innerText = t.throttle;

    // 按鈕組文字
    const levelBtns = document.querySelectorAll('#group-level .opt-btn');
    levelBtns[0].innerText = t.modes.junior;
    levelBtns[1].innerText = t.modes.advanced;
    levelBtns[2].innerText = t.modes.captain;

    const weatherBtns = document.querySelectorAll('#group-weather .opt-btn');
    weatherBtns[0].innerText = t.weather.day;
    weatherBtns[1].innerText = t.weather.sunset;
    weatherBtns[2].innerText = t.weather.night;
    weatherBtns[3].innerText = t.weather.storm;
}

document.getElementById('btn-lang').addEventListener('click', () => {
    SIM_CONFIG.currentLang = (SIM_CONFIG.currentLang === 'zh') ? 'en' : 'zh';
    applyLanguage();
});
applyLanguage();

// 2. 難度級別與天氣點擊選擇
document.querySelectorAll('#group-level .opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#group-level .opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SIM_CONFIG.currentLevel = btn.dataset.val;
        document.getElementById('tel-mode').innerText = `LEVEL: ${SIM_CONFIG.currentLevel.toUpperCase()}`;
    });
});

document.querySelectorAll('#group-weather .opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('#group-weather .opt-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        SIM_CONFIG.currentWeather = btn.dataset.val;
        applyWeather(SIM_CONFIG.currentWeather);
    });
});

// 3. Three.js 場景與日夜天氣模擬
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50000);
camera.position.set(0, 1.6, -6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
sunLight.position.set(1000, 1000, 1000);
scene.add(sunLight);

// 建立可視化地表與跑道網格
const groundTexSize = 512;
const groundTexData = new Uint8Array(groundTexSize * groundTexSize * 3);
for (let i = 0; i < groundTexSize * groundTexSize * 3; i += 3) {
    const d = Math.random() * 80 + 90;
    groundTexData[i] = d * 0.6; groundTexData[i + 1] = d * 0.8; groundTexData[i + 2] = d * 0.5;
}
const groundTex = new THREE.DataTexture(groundTexData, groundTexSize, groundTexSize, THREE.RGBFormat);
groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping;
groundTex.repeat.set(100, 100);
groundTex.needsUpdate = true;

const ground = new THREE.Mesh(new THREE.PlaneGeometry(60000, 60000), new THREE.MeshLambertMaterial({ map: groundTex }));
ground.rotation.x = -Math.PI / 2;
ground.position.y = -1.0;
scene.add(ground);

// 跑道與跑道導引燈
const runway = new THREE.Mesh(new THREE.PlaneGeometry(80, 5000), new THREE.MeshLambertMaterial({ color: 0x222222 }));
runway.rotation.x = -Math.PI / 2;
runway.position.z = 2500;
scene.add(runway);

// 跑道中線燈條
const centerline = new THREE.Mesh(new THREE.PlaneGeometry(2, 5000), new THREE.MeshBasicMaterial({ color: 0x00ffcc }));
centerline.rotation.x = -Math.PI / 2;
centerline.position.set(0, 0.05, 2500);
scene.add(centerline);

function applyWeather(mode) {
    const envSpan = document.getElementById('tel-env');
    if (mode === 'day') {
        scene.background = new THREE.Color(0x7ec0ee);
        scene.fog = new THREE.FogExp2(0xcfdbe0, 0.0001);
        ambientLight.color.setHex(0xffffff); ambientLight.intensity = 0.7;
        sunLight.color.setHex(0xffffff); sunLight.intensity = 1.2;
        envSpan.innerText = 'ENV: DAY CLEAR';
    } else if (mode === 'sunset') {
        scene.background = new THREE.Color(0xd35400);
        scene.fog = new THREE.FogExp2(0xe67e22, 0.00015);
        ambientLight.color.setHex(0xffaa77); ambientLight.intensity = 0.5;
        sunLight.color.setHex(0xff4500); sunLight.intensity = 0.9;
        envSpan.innerText = 'ENV: SUNSET';
    } else if (mode === 'night') {
        scene.background = new THREE.Color(0x02050e);
        scene.fog = new THREE.FogExp2(0x050a15, 0.0002);
        ambientLight.color.setHex(0x112233); ambientLight.intensity = 0.2;
        sunLight.color.setHex(0x224466); sunLight.intensity = 0.3;
        envSpan.innerText = 'ENV: NIGHT IFR';
    } else if (mode === 'storm') {
        scene.background = new THREE.Color(0x2c3e50);
        scene.fog = new THREE.FogExp2(0x34495e, 0.0004);
        ambientLight.color.setHex(0x556677); ambientLight.intensity = 0.4;
        sunLight.color.setHex(0x8899aa); sunLight.intensity = 0.5;
        envSpan.innerText = 'ENV: STORM';
    }
}
applyWeather('day');

// 4. 初始化 Canvas HUD
const hudCanvas = document.createElement('canvas');
hudCanvas.id = 'hud-canvas';
hudCanvas.style.position = 'absolute';
hudCanvas.style.top = '0';
hudCanvas.style.left = '0';
hudCanvas.style.width = '100vw';
hudCanvas.style.height = '100vh';
hudCanvas.style.pointerEvents = 'none';
hudCanvas.style.zIndex = '15';
document.getElementById('sim-interface').appendChild(hudCanvas);
const hud = new HUD(hudCanvas);

// 5. 行動端觸控操控器邏輯 (Virtual Stick + Throttle + Rudder)
const stickZone = document.getElementById('virtual-stick-zone');
const stickKnob = document.getElementById('virtual-stick-knob');
let stickTouchId = null;
let stickCenter = { x: 0, y: 0 };

stickZone.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const touch = e.changedTouches[0];
    stickTouchId = touch.identifier;
    const rect = stickZone.getBoundingClientRect();
    stickCenter = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
});

window.addEventListener('touchmove', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        if (touch.identifier === stickTouchId) {
            const dx = touch.clientX - stickCenter.x;
            const dy = touch.clientY - stickCenter.y;
            const dist = Math.hypot(dx, dy);
            const maxR = 45;
            const clampedDist = Math.min(dist, maxR);
            const angle = Math.atan2(dy, dx);

            const knobX = Math.cos(angle) * clampedDist;
            const knobY = Math.sin(angle) * clampedDist;
            stickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;

            // 映射到飛機舵面：X -> 副翼 (Aileron), Y -> 升降舵 (Elevator)
            keyStateControls.aileron = (knobX / maxR) * 0.7;
            keyStateControls.elevator = (knobY / maxR) * 0.7;
        }
    }
});

window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === stickTouchId) {
            stickTouchId = null;
            stickKnob.style.transform = `translate(-50%, -50%)`;
            keyStateControls.aileron = 0;
            keyStateControls.elevator = 0;
        }
    }
});

// 油門推桿
const throttleSlider = document.getElementById('touch-throttle');
const thrValText = document.getElementById('thr-val-text');
throttleSlider.addEventListener('input', (e) => {
    const val = parseFloat(e.target.value) / 100;
    keyStateControls.throttle = val;
    keyStateControls.isManualThrottleInput = true;
    thrValText.innerText = `${Math.round(val * 100)}%`;
});

// 方向舵與剎車按鈕
const btnRudL = document.getElementById('btn-rud-left');
const btnRudR = document.getElementById('btn-rud-right');
const btnBrk = document.getElementById('btn-brake');

btnRudL.addEventListener('pointerdown', () => keyStateControls.rudder = -0.6);
btnRudL.addEventListener('pointerup', () => keyStateControls.rudder = 0);
btnRudR.addEventListener('pointerdown', () => keyStateControls.rudder = 0.6);
btnRudR.addEventListener('pointerup', () => keyStateControls.rudder = 0);
btnBrk.addEventListener('pointerdown', () => keyStateControls.brake = 1.0);
btnBrk.addEventListener('pointerup', () => keyStateControls.brake = 0);

// 6. MCP 面板按鈕綁定
const btnAP = document.getElementById('btn-ap');
const btnLNAV = document.getElementById('btn-lnav');
const btnVNAV = document.getElementById('btn-vnav');
const valSpd = document.getElementById('mcp-spd-val');
const valHdg = document.getElementById('mcp-hdg-val');
const valAlt = document.getElementById('mcp-alt-val');

ap.setVoiceCallback((msg) => sound.speak(msg));

btnAP.addEventListener('click', (e) => { e.stopPropagation(); ap.toggleMode('AP_MASTER', s_buffer); updateMcpButtonsUI(); });
btnLNAV.addEventListener('click', (e) => { e.stopPropagation(); const active = fms.toggleLNAV(s_buffer); ap.modes.LNAV = active; if (active) ap.modes.HDG_HOLD = false; updateMcpButtonsUI(); });
btnVNAV.addEventListener('click', (e) => { e.stopPropagation(); ap.toggleMode('VNAV', s_buffer); updateMcpButtonsUI(); });

function updateMcpButtonsUI() {
    btnAP.classList.toggle('active', ap.modes.AP_MASTER);
    btnLNAV.classList.toggle('active_lnav', ap.modes.LNAV);
    btnVNAV.classList.toggle('active_vnav', ap.modes.VNAV);
    valSpd.innerText = Math.round(ap.targets.speed);
    valHdg.innerText = Math.round(ap.targets.heading).toString().padStart(3, '0');
    valAlt.innerText = Math.round(ap.targets.altitude);
}

document.getElementById('spd-inc').addEventListener('click', () => { ap.setTarget('SPD', ap.targets.speed + 10); updateMcpButtonsUI(); });
document.getElementById('spd-dec').addEventListener('click', () => { ap.setTarget('SPD', ap.targets.speed - 10); updateMcpButtonsUI(); });
document.getElementById('hdg-inc').addEventListener('click', () => { ap.setTarget('HDG', ap.targets.heading + 5); updateMcpButtonsUI(); });
document.getElementById('hdg-dec').addEventListener('click', () => { ap.setTarget('HDG', ap.targets.heading - 5); updateMcpButtonsUI(); });
document.getElementById('alt-inc').addEventListener('click', () => { ap.setTarget('ALT', ap.targets.altitude + 500); updateMcpButtonsUI(); });
document.getElementById('alt-dec').addEventListener('click', () => { ap.setTarget('ALT', ap.targets.altitude - 500); updateMcpButtonsUI(); });

// 7. 鍵盤備份操控
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'q': case 'Q':
            keyStateControls.throttle = Math.min(1.0, keyStateControls.throttle + 0.05);
            keyStateControls.isManualThrottleInput = true;
            throttleSlider.value = Math.round(keyStateControls.throttle * 100);
            thrValText.innerText = `${throttleSlider.value}%`;
            break;
        case 'a': case 'A':
            keyStateControls.throttle = Math.max(0.0, keyStateControls.throttle - 0.05);
            keyStateControls.isManualThrottleInput = true;
            throttleSlider.value = Math.round(keyStateControls.throttle * 100);
            thrValText.innerText = `${throttleSlider.value}%`;
            break;
        case 'z': case 'Z': keyStateControls.rudder = -0.5; break;
        case 'x': case 'X': keyStateControls.rudder = 0.5; break;
        case 'ArrowUp': keyStateControls.elevator = -0.4; break;
        case 'ArrowDown': keyStateControls.elevator = 0.4; break;
        case 'ArrowLeft': keyStateControls.aileron = -0.4; break;
        case 'ArrowRight': keyStateControls.aileron = 0.4; break;
        case 'b': case 'B': keyStateControls.brake = 1.0; break;
    }
});

document.addEventListener('keyup', (e) => {
    switch (e.key) {
        case 'z': case 'Z': case 'x': case 'X': keyStateControls.rudder = 0; break;
        case 'ArrowUp': case 'ArrowDown': keyStateControls.elevator = 0; break;
        case 'ArrowLeft': case 'ArrowRight': keyStateControls.aileron = 0; break;
        case 'b': case 'B': keyStateControls.brake = 0; break;
    }
});

// 8. 啟動與 Worker 運算循環
let physicsWorker;

document.getElementById('start-btn').addEventListener('click', async () => {
    sound.init();

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try { await DeviceOrientationEvent.requestPermission(); } catch (e) { console.error(e); }
    }

    document.getElementById('start-screen').style.display = 'none';

    physicsWorker = new Worker('physics.js');

    // 發送難度參數與環境到 Worker
    physicsWorker.postMessage({
        type: 'config',
        level: SIM_CONFIG.currentLevel,
        weather: SIM_CONFIG.currentWeather
    });

    window.addEventListener('deviceorientation', (e) => {
        physicsWorker.postMessage({ type: 'input', gamma: e.gamma || 0, beta: e.beta || 0 });
    });

    physicsWorker.onmessage = (e) => {
        const s = e.data;
        s_buffer = s;

        const now = performance.now();
        const dt = (now - lastFrameTime) / 1000;
        lastFrameTime = now;

        const fmsCmd = fms.update(s);
        const apCmds = ap.update(s, fmsCmd, dt);

        let finalControls = { ...keyStateControls };
        const apCfg = SIM_CONFIG.AUTOPILOT;

        if (apCmds && ap.modes.AP_MASTER) {
            if (Math.abs(keyStateControls.elevator) < apCfg.MANUAL_DEADZONE) {
                finalControls.elevator = apCmds.elevator;
            } else if (ap.modes.ALT_HOLD || ap.modes.VNAV) {
                ap.modes.ALT_HOLD = false; ap.modes.VNAV = false;
                sound.speak("ALT DISCONNECT");
                updateMcpButtonsUI();
            }

            if (Math.abs(keyStateControls.aileron) < apCfg.MANUAL_DEADZONE) {
                finalControls.aileron = apCmds.aileron;
            } else if (ap.modes.HDG_HOLD || ap.modes.LNAV) {
                ap.modes.HDG_HOLD = false; ap.modes.LNAV = false;
                sound.speak("HDG DISCONNECT");
                updateMcpButtonsUI();
            }

            if (keyStateControls.isManualThrottleInput) {
                if (ap.modes.SPD_HOLD || ap.modes.VNAV) {
                    ap.modes.SPD_HOLD = false; ap.modes.VNAV = false;
                    sound.speak("AUTO THROTTLE OFF");
                    updateMcpButtonsUI();
                }
                keyStateControls.isManualThrottleInput = false;
            } else {
                finalControls.throttle = apCmds.throttle;
                throttleSlider.value = Math.round(finalControls.throttle * 100);
                thrValText.innerText = `${throttleSlider.value}%`;
            }
        }

        physicsWorker.postMessage({ type: 'controls', ...finalControls });

        // HUD 數據更新
        hud.update({
            speed: s.speed,
            altitude: s.altitude,
            mach: s.mach,
            aoa: s.aoa,
            gForce: s.gForce,
            pitch: s.pitch,
            roll: s.roll,
            heading: s.heading,
            alpha: s.aoa,
            beta: s.beta,
            vnav_active: ap.modes.VNAV,
            vdi_deviation: fmsCmd ? fmsCmd.vdi_deviation : 0,
            activeWaypoint: fmsCmd ? fmsCmd.activeWaypointId : null,
            waypointDistance: fmsCmd ? fmsCmd.distance : 0,
            vnav_phase: fmsCmd ? fmsCmd.vertical_phase : null
        });

        // 頂部動態氣壓與即時環境數據條
        const qbarKpa = (0.5 * (s.density || 1.225) * Math.pow(s.speed * 0.51444, 2) / 1000).toFixed(1);
        document.getElementById('tel-qbar').innerText = `QBAR: ${qbarKpa} kPa`;

        const vspeedFpm = (s.dz ? -s.dz : 0) * 196.85;
        sound.update(finalControls.throttle, s.speed, s.altitude, vspeedFpm, s.aoa, s.altitude <= 5);

        // 駕駛艙相機姿態與位置同步
        camera.rotation.set(
            THREE.MathUtils.degToRad(s.pitch),
            THREE.MathUtils.degToRad(-s.heading),
            THREE.MathUtils.degToRad(-s.roll),
            'YZX'
        );
        camera.position.set(s.x * 0.05, Math.max(1.6, s.altitude * 0.3048 + 1.6), s.y * 0.05);
    };

    animate();
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
