// ============================================================
// main.js - J.A.R. Skybound Pro 主控中樞 v2.6
// ============================================================

import { SIM_CONFIG } from './config.js';
import { SoundEngine } from './audio.js';
import { HUD } from './hud.js';
import { Autopilot } from './autopilot.js';
import { FMS } from './fms.js';

const sound = new SoundEngine();
const ap = new Autopilot();
const fms = new FMS();

let lastFrameTime = performance.now();
let s_buffer = {};

const keyStateControls = {
    elevator: 0,
    aileron: 0,
    rudder: 0,
    throttle: 0.6,
    brake: 0,
    isManualThrottleInput: false
};

// 1. Three.js 場景與駕駛艙視角初始化
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x7ec0ee);
scene.fog = new THREE.FogExp2(0xcfdbe0, 0.0001);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 50000);
camera.position.set(0, 1.6, -6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container').appendChild(renderer.domElement);

const ambient = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambient);
const sun = new THREE.DirectionalLight(0xffffff, 1.2); sun.position.set(1000, 1000, 1000); scene.add(sun);

// 地表網格與跑道
const groundTexSize = 512;
const groundTexData = new Uint8Array(groundTexSize * groundTexSize * 3);
for (let i = 0; i < groundTexSize * groundTexSize * 3; i += 3) {
    const d = Math.random() * 80 + 100;
    groundTexData[i] = d * 0.7; groundTexData[i + 1] = d; groundTexData[i + 2] = d * 0.5;
}
const groundTex = new THREE.DataTexture(groundTexData, groundTexSize, groundTexSize, THREE.RGBFormat);
groundTex.wrapS = groundTex.wrapT = THREE.RepeatWrapping; groundTex.repeat.set(100, 100); groundTex.needsUpdate = true;
const ground = new THREE.Mesh(new THREE.PlaneGeometry(50000, 50000), new THREE.MeshLambertMaterial({ map: groundTex }));
ground.rotation.x = -Math.PI / 2; ground.position.y = -1.0; scene.add(ground);

const runwayMat = new THREE.MeshLambertMaterial({ color: 0x333333 });
const runway = new THREE.Mesh(new THREE.PlaneGeometry(60, 4000), runwayMat);
runway.rotation.x = -Math.PI / 2; runway.position.z = 2000; scene.add(runway);

// Canvas HUD 實例化
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

// 語音回調注入
ap.setVoiceCallback((msg) => sound.speak(msg));

// 2. MCP 面板按鈕與顯示事件綁定
const btnAP = document.getElementById('btn-ap');
const btnLNAV = document.getElementById('btn-lnav');
const btnVNAV = document.getElementById('btn-vnav');
const valSpd = document.getElementById('mcp-spd-val');
const valHdg = document.getElementById('mcp-hdg-val');
const valAlt = document.getElementById('mcp-alt-val');

btnAP.addEventListener('click', (e) => {
    e.stopPropagation();
    ap.toggleMode('AP_MASTER', s_buffer);
    updateMcpButtonsUI();
});

btnLNAV.addEventListener('click', (e) => {
    e.stopPropagation();
    const active = fms.toggleLNAV(s_buffer);
    ap.modes.LNAV = active;
    if (active) ap.modes.HDG_HOLD = false;
    updateMcpButtonsUI();
});

btnVNAV.addEventListener('click', (e) => {
    e.stopPropagation();
    ap.toggleMode('VNAV', s_buffer);
    updateMcpButtonsUI();
});

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

// 3. 鍵盤輸入事件綁定
document.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'q': case 'Q':
            keyStateControls.throttle = Math.min(1.0, keyStateControls.throttle + 0.05);
            keyStateControls.isManualThrottleInput = true;
            break;
        case 'a': case 'A':
            keyStateControls.throttle = Math.max(0.0, keyStateControls.throttle - 0.05);
            keyStateControls.isManualThrottleInput = true;
            break;
        case 'z': case 'Z': keyStateControls.rudder = -0.5; break;
        case 'x': case 'X': keyStateControls.rudder = 0.5; break;
        case 'ArrowUp': keyStateControls.elevator = -0.3; break;
        case 'ArrowDown': keyStateControls.elevator = 0.3; break;
        case 'ArrowLeft': keyStateControls.aileron = -0.3; break;
        case 'ArrowRight': keyStateControls.aileron = 0.3; break;
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

// 4. 啟動與 Worker 數據循環
let physicsWorker;

document.getElementById('start-btn').addEventListener('click', async () => {
    sound.init();

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try { await DeviceOrientationEvent.requestPermission(); } catch (e) { console.error(e); }
    }

    document.getElementById('start-screen').style.display = 'none';

    physicsWorker = new Worker('physics.js');

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
            // 人工優先 CWS
            if (Math.abs(keyStateControls.elevator) < apCfg.MANUAL_DEADZONE) {
                finalControls.elevator = apCmds.elevator;
            } else if (ap.modes.ALT_HOLD || ap.modes.VNAV) {
                ap.modes.ALT_HOLD = false;
                ap.modes.VNAV = false;
                sound.speak("ALT DISCONNECT");
                updateMcpButtonsUI();
            }

            if (Math.abs(keyStateControls.aileron) < apCfg.MANUAL_DEADZONE) {
                finalControls.aileron = apCmds.aileron;
            } else if (ap.modes.HDG_HOLD || ap.modes.LNAV) {
                ap.modes.HDG_HOLD = false;
                ap.modes.LNAV = false;
                sound.speak("HDG DISCONNECT");
                updateMcpButtonsUI();
            }

            // 人工油門優先
            if (keyStateControls.isManualThrottleInput) {
                if (ap.modes.SPD_HOLD || ap.modes.VNAV) {
                    ap.modes.SPD_HOLD = false;
                    ap.modes.VNAV = false;
                    sound.speak("AUTO THROTTLE OFF");
                    updateMcpButtonsUI();
                }
                keyStateControls.isManualThrottleInput = false;
            } else {
                finalControls.throttle = apCmds.throttle;
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

        // 音效更新
        const vspeedFpm = (s.dz ? -s.dz : 0) * 196.85;
        sound.update(finalControls.throttle, s.speed, s.altitude, vspeedFpm, s.aoa, s.altitude <= 5);

        // 駕駛艙視角同步
        camera.rotation.set(
            THREE.MathUtils.degToRad(s.pitch),
            THREE.MathUtils.degToRad(-s.heading),
            THREE.MathUtils.degToRad(-s.roll),
            'YZX'
        );
        camera.position.set(s.x * 0.1, s.altitude * 0.3048 + 1.6, s.y * 0.1);
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
