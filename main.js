// ============================================================
// main.js - J.A.R. Skybound Pro v3.2 (科研教學版中樞)
// ============================================================

import { SIM_CONFIG, I18N } from './config.js';
import { SoundEngine } from './audio.js';
import { HUD } from './hud.js';
import { Autopilot } from './autopilot.js';
import { FMS } from './fms.js';
import { FlightDataRecorder } from './fdr.js';
import { FlightOscilloscope } from './oscilloscope.js';

const sound = new SoundEngine();
const ap = new Autopilot();
const fms = new FMS();
const fdr = new FlightDataRecorder(20);

let lastFrameTime = performance.now();
let s_buffer = { altitude: 10000, speed: 250, heading: 0, pitch: 0, roll: 0, x: 0, y: 0 };
let physicsWorker = null;

const keyStateControls = {
    elevator: 0,
    aileron: 0,
    rudder: 0,
    throttle: 0.6,
    brake: 0,
    isManualThrottleInput: false
};

// 1. 初始化 3D 空間航跡帶 (Flight Path Ribbon)
const MAX_TRAIL_POINTS = 600;
const trailPositions = new Float32Array(MAX_TRAIL_POINTS * 3);
const trailGeo = new THREE.BufferGeometry();
trailGeo.setAttribute('position', new THREE.BufferAttribute(trailPositions, 3));
const trailMat = new THREE.LineBasicMaterial({ color: 0x00ffff, transparent: true, opacity: 0.75, linewidth: 2 });
const flightTrailLine = new THREE.Line(trailGeo, trailMat);

// ... (Three.js 場景、燈光、InstancedMesh 跑道燈初始化代碼維持不變) ...
scene.add(flightTrailLine);

let trailIndex = 0;
function appendTrailPoint(x, y, z) {
    if (trailIndex < MAX_TRAIL_POINTS) {
        trailPositions[trailIndex * 3] = x;
        trailPositions[trailIndex * 3 + 1] = y;
        trailPositions[trailIndex * 3 + 2] = z;
        trailIndex++;
    } else {
        // 環形位移
        for (let i = 0; i < (MAX_TRAIL_POINTS - 1) * 3; i++) {
            trailPositions[i] = trailPositions[i + 3];
        }
        trailPositions[(MAX_TRAIL_POINTS - 1) * 3] = x;
        trailPositions[(MAX_TRAIL_POINTS - 1) * 3 + 1] = y;
        trailPositions[(MAX_TRAIL_POINTS - 1) * 3 + 2] = z;
    }
    trailGeo.attributes.position.needsUpdate = true;
}

// 2. 示波器實例化
const oscCanvas = document.getElementById('oscilloscope-canvas');
oscCanvas.width = 240;
oscCanvas.height = 120;
const oscilloscope = new FlightOscilloscope(oscCanvas);

document.getElementById('btn-toggle-scope').addEventListener('click', () => {
    oscilloscope.toggle();
});

// 3. FDR 導出與教官故障事件綁定
document.getElementById('btn-fdr-export').addEventListener('click', () => fdr.exportCSV());

let eng1Fault = false, eng2Fault = false;
document.getElementById('btn-fault-eng1').addEventListener('click', (e) => {
    eng1Fault = !eng1Fault;
    e.target.classList.toggle('active_fault', eng1Fault);
    if (physicsWorker) physicsWorker.postMessage({ type: 'fault', target: 'eng1', active: eng1Fault });
    if (eng1Fault) sound.speak("ENGINE 1 FLAMEOUT");
});

document.getElementById('btn-fault-eng2').addEventListener('click', (e) => {
    eng2Fault = !eng2Fault;
    e.target.classList.toggle('active_fault', eng2Fault);
    if (physicsWorker) physicsWorker.postMessage({ type: 'fault', target: 'eng2', active: eng2Fault });
    if (eng2Fault) sound.speak("ENGINE 2 FLAMEOUT");
});

// 4. 啟動與 Worker 數據流
document.getElementById('start-btn').addEventListener('click', async () => {
    sound.init();
    document.getElementById('start-screen').style.display = 'none';

    physicsWorker = new Worker('physics.js', { type: 'module' });
    physicsWorker.postMessage({
        type: 'config',
        level: SIM_CONFIG.currentLevel,
        weather: SIM_CONFIG.currentWeather
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
            if (Math.abs(keyStateControls.elevator) < apCfg.MANUAL_DEADZONE) finalControls.elevator = apCmds.elevator;
            if (Math.abs(keyStateControls.aileron) < apCfg.MANUAL_DEADZONE) finalControls.aileron = apCmds.aileron;
            
            if (keyStateControls.isManualThrottleInput) {
                ap.modes.SPD_HOLD = false; ap.modes.VNAV = false;
                keyStateControls.isManualThrottleInput = false;
            } else {
                finalControls.throttle = apCmds.throttle;
                document.getElementById('touch-throttle').value = Math.round(finalControls.throttle * 100);
                document.getElementById('thr-val-text').innerText = `${Math.round(finalControls.throttle * 100)}%`;
            }
        }

        physicsWorker.postMessage({ type: 'controls', ...finalControls });

        // 實時推入示波器與黑匣子
        oscilloscope.pushData(s.aoa, s.pitch, s.speed, s.gForce);
        fdr.recordFrame(now / 1000, s, finalControls, { N1: s.engineData ? s.engineData.eng1_N1 : 0, FF: s.engineData ? s.engineData.eng1_FF : 0 }, { N1: s.engineData ? s.engineData.eng2_N1 : 0, FF: s.engineData ? s.engineData.eng2_FF : 0 }, fmsCmd, ap);

        // 3D 空間航跡更新
        const planeAltitudeM = s.altMeters !== undefined ? s.altMeters : s.altitude * 0.3048;
        appendTrailPoint(s.x, planeAltitudeM + 2.0, s.y);

        // HUD 與 EICAS 數據刷新
        hud.update({
            speed: s.speed, altitude: s.altitude, mach: s.mach, aoa: s.aoa, gForce: s.gForce,
            pitch: s.pitch, roll: s.roll, heading: s.heading, alpha: s.aoa, beta: s.beta,
            vnav_active: ap.modes.VNAV, vdi_deviation: fmsCmd ? fmsCmd.vdi_deviation : 0,
            activeWaypoint: fmsCmd ? fmsCmd.activeWaypointId : null,
            waypointDistance: fmsCmd ? fmsCmd.distance : 0, vnav_phase: fmsCmd ? fmsCmd.vertical_phase : null
        });

        if (s.engineData) {
            document.getElementById('eicas-n1-1').innerText = s.engineData.eng1_N1.toFixed(1);
            document.getElementById('eicas-egt-1').innerText = Math.round(s.engineData.eng1_EGT);
            document.getElementById('eicas-ff-1').innerText = Math.round(s.engineData.eng1_FF);
            document.getElementById('eicas-n1-2').innerText = s.engineData.eng2_N1.toFixed(1);
            document.getElementById('eicas-egt-2').innerText = Math.round(s.engineData.eng2_EGT);
            document.getElementById('eicas-ff-2').innerText = Math.round(s.engineData.eng2_FF);
        }

        // 相機座標與角度同步
        camera.position.set(s.x, Math.max(2.4, planeAltitudeM + 2.4), s.y);
        camera.rotation.order = 'YXZ';
        camera.rotation.y = THREE.MathUtils.degToRad(-s.heading);
        camera.rotation.x = THREE.MathUtils.degToRad(s.pitch);
        camera.rotation.z = THREE.MathUtils.degToRad(-s.roll);
    };

    animate();
});

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}
