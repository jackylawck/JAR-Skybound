// ============================================================
// main.js - 主線程中樞 v3.3
// ============================================================

import { SIM_CONFIG, I18N, UNITS } from './config.js';
import { SoundEngine } from './audio.js';
import { HUD } from './hud.js';
import { Autopilot } from './autopilot.js';
import { FMS } from './fms.js';

// 內建 ARINC-717 黑匣子 (FDR)
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
        const headers = Object.keys(this.records[0]).join(",");
        const rows = this.records.map(r => Object.values(r).join(",")).join("\n");
        const blob = new Blob([headers + "\n" + rows], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Skybound_ARINC717_FDR_${Date.now()}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    }
}

// 內建可配置通道示波器
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

// 3. Three.js 場景管線
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 80000);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById('canvas-container')?.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); scene.add(ambientLight);
const sunLight = new THREE.DirectionalLight(0xffffff, 1.2); sunLight.position.set(2000, 3000, 2000); scene.add(sunLight);

const ground = new THREE.Mesh(new THREE.PlaneGeometry(100000, 100000), new THREE.MeshLambertMaterial({ color: 0x2d4a22 }));
ground.rotation.x = -Math.PI / 2;
scene.add(ground);

const runway = new THREE.Mesh(new THREE.PlaneGeometry(90, 6000), new THREE.MeshLambertMaterial({ color: 0x1a1a1a }));
runway.rotation.x = -Math.PI / 2;
runway.position.set(0, 0.1, 3000);
scene.add(runway);

const instancedLights = new THREE.InstancedMesh(new THREE.BoxGeometry(0.8, 0.8, 0.8), new THREE.MeshBasicMaterial({ color: 0xffffff }), 122);
const dummy = new THREE.Object3D();
let instIdx = 0;
for (let z = 0; z <= 6000; z += 100) {
    dummy.position.set(-45, 0.5, z); dummy.updateMatrix(); instancedLights.setMatrixAt(instIdx++, dummy.matrix);
    dummy.position.set(45, 0.5, z); dummy.updateMatrix(); instancedLights.setMatrixAt(instIdx++, dummy.matrix);
}
instancedLights.instanceMatrix.needsUpdate = true;
scene.add(instancedLights);

function applyWeather(mode) {
    const envSpan = document.getElementById('tel-env');
    if (mode === 'day') {
        scene.background = new THREE.Color(0x7ec0ee); scene.fog = new THREE.FogExp2(0xcfdbe0, 0.00005);
        ambientLight.intensity = 0.8; sunLight.intensity = 1.2;
        if (envSpan) envSpan.innerText = 'ENV: DAY CLEAR';
    } else if (mode === 'sunset') {
        scene.background = new THREE.Color(0xcc5522); scene.fog = new THREE.FogExp2(0xdd6633, 0.00008);
        ambientLight.intensity = 0.5; sunLight.intensity = 0.9;
        if (envSpan) envSpan.innerText = 'ENV: SUNSET';
    } else if (mode === 'night') {
        scene.background = new THREE.Color(0x02040a); scene.fog = new THREE.FogExp2(0x030611, 0.0001);
        ambientLight.intensity = 0.15; sunLight.intensity = 0.2;
        if (envSpan) envSpan.innerText = 'ENV: NIGHT IFR';
    } else if (mode === 'storm') {
        scene.background = new THREE.Color(0x1c2833); scene.fog = new THREE.FogExp2(0x212f3d, 0.0003);
        ambientLight.intensity = 0.35; sunLight.intensity = 0.4;
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
let stickTouchId = null;
let stickCenter = { x: 0, y: 0 };

function resetStick() {
    stickTouchId = null;
    if (stickKnob) stickKnob.style.transform = `translate(-50%, -50%)`;
    keyStateControls.aileron = 0;
    keyStateControls.elevator = 0;
}

stickZone?.addEventListener('touchstart', (e) => {
    e.preventDefault();
    if (ap.modes.AP_MASTER) { ap.toggleMode('AP_MASTER', s_buffer); updateMcpButtonsUI(); }
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
            if (dist < 2.5) { resetStick(); return; }
            const clampedDist = Math.min(dist, maxR);
            const angle = Math.atan2(dy, dx);
            const knobX = Math.cos(angle) * clampedDist;
            const knobY = Math.sin(angle) * clampedDist;
            if (stickKnob) stickKnob.style.transform = `translate(calc(-50% + ${knobX}px), calc(-50% + ${knobY}px))`;
            keyStateControls.aileron = (knobX / maxR);
            keyStateControls.elevator = (knobY / maxR);
        }
    }
});
window.addEventListener('touchend', (e) => {
    for (let i = 0; i < e.changedTouches.length; i++) {
        if (e.changedTouches[i].identifier === stickTouchId) resetStick();
    }
});
window.addEventListener('touchcancel', resetStick);

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

// 6. MCP 面板
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

// 7. 啟動模擬器與主渲染迴圈
document.getElementById('start-btn')?.addEventListener('click', async () => {
    sound.init();

    if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {
        try { await DeviceOrientationEvent.requestPermission(); } catch (e) { console.error(e); }
    }

    const startScreen = document.getElementById('start-screen');
    if (startScreen) startScreen.style.display = 'none';

    physicsWorker = new Worker('physics.js');
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

        const planeAltitudeM = s.altMeters !== undefined ? s.altMeters : s.altitude * UNITS.FT_TO_M;
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
    oscilloscope.render();
    renderer.render(scene, camera);
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});
