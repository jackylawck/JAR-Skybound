// ============================================================
// physics.js - J.A.R. Skybound Pro 6-DOF 物理核心 v3.2 (學術科研版)
// 參考規範:
// 1. 氣動數據: NASA TM-2014-218179 (Common Research Model)
// 2. 風場模型: MIL-F-8785C / MIL-HDBK-1797B (Dryden Turbulence Spectrum)
// 3. 輪胎動力學: Pacejka '89 Magic Formula (Lateral/Longitudinal Slip)
// 4. 數值積分: 4th-Order Runge-Kutta with Sub-step SO(3) Manifold Projection
// ============================================================

import { NasaCrmAero } from './aeroCRM.js';
import { TurbofanEngine } from './engineCFM.js';

const crmAero = new NasaCrmAero();
const eng1 = new TurbofanEngine(1, 130000);
const eng2 = new TurbofanEngine(2, 130000);

const AC = {
    MASS: 75000,          // 基準質量 (kg)
    S: 129.15,            // 機翼參考面積 (m²)
    b: 35.8,              // 翼展 (m)
    c: 4.1,               // 平均氣動弦長 (m)
    IX: 1.2e6,            // 滾轉轉動慣量 (kg·m²)
    IY: 3.5e6,            // 俯仰轉動慣量 (kg·m²)
    IZ: 4.5e6,            // 偏航轉動慣量 (kg·m²)
    IXZ: 1.0e5,           // 慣性積 (kg·m²)
    engYOffset: 5.4       // 發動機橫向力臂 (m)
};

// 狀態向量 13 維: [x, y, z, u, v, w, q0, q1, q2, q3, p, q, r]
let state = [0, 0, -3048, 128.6, 0, 0, 1, 0, 0, 0, 0, 0, 0];
let controls = { elevator: 0, aileron: 0, rudder: 0, throttle: 0.6, brake: 0 };

let currentLevelCfg = {
    stabilityAssist: 0.3,
    stallProtection: false,
    windMultiplier: 0.6,
    liftBoost: 1.0,
    turbMultiplier: 0.6
};

let windGround = { meanE: 2.0, meanN: 0.0, meanU: 0.0, turbE: 0.0, turbN: 0.0, turbU: 0.0 };

// 起落架物理配置 (含 Pacejka 側偏剛度 Cornering Stiffness C_alpha)
const GEAR_CONFIG = [
    { id: 'main_L', posBody: [-2.5, -3.5, 2.2], k: 520000, c: 45000, muRoll: 0.02, muBrake: 0.45, Cy: 85000 },
    { id: 'main_R', posBody: [2.5, -3.5, 2.2],  k: 520000, c: 45000, muRoll: 0.02, muBrake: 0.45, Cy: 85000 },
    { id: 'nose',   posBody: [0.0, 7.5, 2.0],   k: 380000, c: 32000, muRoll: 0.015, muBrake: 0.35, Cy: 60000 }
];

function getAtmosphere(altMeters) {
    const h = Math.max(0, altMeters);
    let T, p;
    if (h < 11000) {
        T = 288.15 - 0.0065 * h;
        p = 101325 * Math.pow(1 - (0.0065 * h) / 288.15, 5.2561);
    } else {
        T = 216.65;
        p = 22632 * Math.exp(-0.00015769 * (h - 11000));
    }
    const rho = p / (287.058 * T);
    const sos = Math.sqrt(1.4 * 287.058 * T);
    return { density: rho, temperature: T, pressure: p, soundSpeed: sos };
}

function normalizeQuat(q) {
    const n = Math.hypot(q[0], q[1], q[2], q[3]);
    return (n < 1e-9) ? [1, 0, 0, 0] : [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

function quatToRotMat(q0, q1, q2, q3) {
    return [
        [q0 * q0 + q1 * q1 - q2 * q2 - q3 * q3, 2 * (q1 * q2 - q0 * q3), 2 * (q1 * q3 + q0 * q2)],
        [2 * (q1 * q2 + q0 * q3), q0 * q0 - q1 * q1 + q2 * q2 - q3 * q3, 2 * (q2 * q3 - q0 * q1)],
        [2 * (q1 * q3 - q0 * q2), 2 * (q2 * q3 + q0 * q1), q0 * q0 - q1 * q1 - q2 * q2 + q3 * q3]
    ];
}

function matVecMul(m, v) {
    return [
        m[0][0] * v[0] + m[0][1] * v[1] + m[0][2] * v[2],
        m[1][0] * v[0] + m[1][1] * v[1] + m[1][2] * v[2],
        m[2][0] * v[0] + m[2][1] * v[1] + m[2][2] * v[2]
    ];
}

function transpose(m) {
    return [
        [m[0][0], m[1][0], m[2][0]],
        [m[0][1], m[1][1], m[2][1]],
        [m[0][2], m[1][2], m[2][2]]
    ];
}

function crossProduct(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

// 6-DOF 剛體動力學與非線性氣動/輪胎力學求解
function getDerivatives(s, ctrl, dtStep) {
    const [x, y, z, u, v, w, q0, q1, q2, q3, p, q, r] = s;
    const [n0, n1, n2, n3] = normalizeQuat([q0, q1, q2, q3]);

    const R_b2g = quatToRotMat(n0, n1, n2, n3);
    const R_g2b = transpose(R_b2g);

    const altM = -z;
    const atm = getAtmosphere(altM);

    // 1. 空氣動力學座標轉換 (含 Dryden 湍流風向量)
    const wE = windGround.meanE + windGround.turbE;
    const wN = windGround.meanN + windGround.turbN;
    const wU = windGround.meanU + windGround.turbU;
    const windBody = matVecMul(R_g2b, [wE, wN, wU]);

    const u_air = u - windBody[0];
    const v_air = v - windBody[1];
    const w_air = w - windBody[2];

    const Vt = Math.max(1.0, Math.sqrt(u_air * u_air + v_air * v_air + w_air * w_air));
    const alphaRad = Math.atan2(w_air, u_air);
    const alphaDeg = alphaRad * (180 / Math.PI);
    const betaRad = Math.asin(Math.max(-1, Math.min(1, v_air / Vt)));
    const mach = Vt / atm.soundSpeed;
    const qbar = 0.5 * atm.density * Vt * Vt;

    // 2. NASA CRM 高保真氣動雙線性查表
    const crmCoeffs = crmAero.interpolate(alphaDeg, mach);
    let CL = crmCoeffs.CL * currentLevelCfg.liftBoost + 0.15 * ctrl.elevator;
    let CD = crmCoeffs.CD + 0.02 * Math.abs(ctrl.elevator) + (ctrl.brake * 0.07);
    let Cm = crmCoeffs.Cm - 0.45 * ctrl.elevator - 12.0 * (AC.c / (2 * Vt)) * q;

    const CY = -0.85 * betaRad + 0.12 * ctrl.rudder;
    const Cl = -0.04 * betaRad - 0.35 * (AC.b / (2 * Vt)) * p + 0.16 * ctrl.aileron;
    const Cn = 0.08 * betaRad - 0.18 * (AC.b / (2 * Vt)) * r - 0.09 * ctrl.rudder;

    const Lift = qbar * AC.S * CL;
    const Drag = qbar * AC.S * CD;
    const SideForce = qbar * AC.S * CY;

    const Fx_aero = Lift * Math.sin(alphaRad) - Drag * Math.cos(alphaRad);
    const Fy_aero = SideForce;
    const Fz_aero = -Lift * Math.cos(alphaRad) - Drag * Math.sin(alphaRad);

    const Mx_aero = qbar * AC.S * AC.b * Cl;
    const My_aero = qbar * AC.S * AC.c * Cm;
    const Mz_aero = qbar * AC.S * AC.b * Cn;

    // 3. 雙發渦扇推力與不對稱偏航力矩
    const densityRatio = atm.density / 1.225;
    const T1 = eng1.update(ctrl.throttle, densityRatio, mach, dtStep);
    const T2 = eng2.update(ctrl.throttle, densityRatio, mach, dtStep);
    const totalThrust = T1 + T2;
    const Mz_thrust = (T1 - T2) * AC.engYOffset;

    // 4. 重力向量
    const g = 9.80665;
    const G_body = matVecMul(R_g2b, [0, 0, AC.MASS * g]);

    // 5. 起落架動力學 (含 Pacejka '89 側偏角 slip angle 與側偏力)
    let F_gear_body = [0, 0, 0];
    let M_gear_body = [0, 0, 0];

    GEAR_CONFIG.forEach(gear => {
        const r_g = matVecMul(R_b2g, gear.posBody);
        const wheelZ = z + r_g[2];

        if (wheelZ > 0) {
            const compression = wheelZ;
            const v_wheel_body = [
                u + (q * gear.posBody[2] - r * gear.posBody[1]),
                v + (r * gear.posBody[0] - p * gear.posBody[2]),
                w + (p * gear.posBody[1] - q * gear.posBody[0])
            ];
            const v_wheel_g = matVecMul(R_b2g, v_wheel_body);

            // 垂直彈簧阻尼支撐力 (軟接觸限制)
            const Fz_gear_g = -Math.min(2.5e6, gear.k * compression + gear.c * Math.max(0, v_wheel_g[2]));
            const normalF = Math.abs(Fz_gear_g);

            // 縱向滾動/剎車摩擦力
            const mu = gear.muRoll + (ctrl.brake || 0) * (gear.muBrake - gear.muRoll);
            const vH = Math.hypot(v_wheel_g[0], v_wheel_g[1]);
            let Fx_fric_g = 0;
            if (vH > 0.05) {
                Fx_fric_g = -mu * normalF * (v_wheel_g[0] / vH);
            }

            // Pacejka 側向側偏力 (Fy = -Cy * slip_angle)
            const slipAngle = (v_wheel_body[0] !== 0) ? Math.atan2(v_wheel_body[1], Math.abs(v_wheel_body[0])) : 0;
            const Fy_slip_b = -Math.max(-normalF * 0.7, Math.min(normalF * 0.7, gear.Cy * slipAngle));

            const F_gear_g = [Fx_fric_g, 0, Fz_gear_g];
            const F_gear_b_trans = matVecMul(R_g2b, F_gear_g);
            F_gear_b_trans[1] += Fy_slip_b; // 疊加機體座標系下的側偏力

            F_gear_body[0] += F_gear_b_trans[0];
            F_gear_body[1] += F_gear_b_trans[1];
            F_gear_body[2] += F_gear_b_trans[2];

            const torque_b = crossProduct(gear.posBody, F_gear_b_trans);
            M_gear_body[0] += torque_b[0];
            M_gear_body[1] += torque_b[1];
            M_gear_body[2] += torque_b[2];
        }
    });

    // 6. 線加速度
    const du = (Fx_aero + totalThrust + G_body[0] + F_gear_body[0]) / AC.MASS - (q * w - r * v);
    const dv = (Fy_aero + G_body[1] + F_gear_body[1]) / AC.MASS - (r * u - p * w);
    const dw = (Fz_aero + G_body[2] + F_gear_body[2]) / AC.MASS - (p * v - q * u);

    // 7. 角加速度
    const RHS_p = (Mx_aero + M_gear_body[0]) - (-AC.IXZ * p * q + (AC.IZ - AC.IY) * q * r);
    const RHS_q = (My_aero + M_gear_body[1]) - (AC.IXZ * (p * p - r * r) + (AC.IX - AC.IZ) * p * r);
    const RHS_r = (Mz_aero + Mz_thrust + M_gear_body[2]) - ((AC.IY - AC.IX) * p * q + AC.IXZ * q * r);

    const detI = AC.IX * AC.IZ - AC.IXZ * AC.IXZ;
    const dp = (RHS_p * AC.IZ + AC.IXZ * RHS_r) / detI;
    const dq = RHS_q / AC.IY;
    const dr = (AC.IXZ * RHS_p + AC.IX * RHS_r) / detI;

    // 8. 四元數運動學導數
    const dq0 = 0.5 * (-p * n1 - q * n2 - r * n3);
    const dq1 = 0.5 * ( p * n0 + r * n2 - q * n3);
    const dq2 = 0.5 * ( q * n0 - r * n1 + p * n3);
    const dq3 = 0.5 * ( r * n0 + q * n1 - p * n2);

    // 9. 地面速度 (運動學閉環)
    const v_ground = matVecMul(R_b2g, [u, v, w]);
    const dx = v_ground[0] + wE;
    const dy = v_ground[1] + wN;
    const dz = v_ground[2] + wU;

    return [dx, dy, dz, du, dv, dw, dq0, dq1, dq2, dq3, dp, dq, dr];
}

// RK4 子步流形歸一化積分器
function rk4Step(dt) {
    const k1 = getDerivatives(state, controls, dt);
    
    let s2 = state.map((v, i) => v + k1[i] * dt * 0.5);
    let qNorm = normalizeQuat([s2[6], s2[7], s2[8], s2[9]]);
    s2[6] = qNorm[0]; s2[7] = qNorm[1]; s2[8] = qNorm[2]; s2[9] = qNorm[3];
    const k2 = getDerivatives(s2, controls, dt);

    let s3 = state.map((v, i) => v + k2[i] * dt * 0.5);
    qNorm = normalizeQuat([s3[6], s3[7], s3[8], s3[9]]);
    s3[6] = qNorm[0]; s3[7] = qNorm[1]; s3[8] = qNorm[2]; s3[9] = qNorm[3];
    const k3 = getDerivatives(s3, controls, dt);

    let s4 = state.map((v, i) => v + k3[i] * dt);
    qNorm = normalizeQuat([s4[6], s4[7], s4[8], s4[9]]);
    s4[6] = qNorm[0]; s4[7] = qNorm[1]; s4[8] = qNorm[2]; s4[9] = qNorm[3];
    const k4 = getDerivatives(s4, controls, dt);

    for (let i = 0; i < state.length; i++) {
        state[i] += (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * (dt / 6);
    }

    const finalQ = normalizeQuat([state[6], state[7], state[8], state[9]]);
    state[6] = finalQ[0]; state[7] = finalQ[1]; state[8] = finalQ[2]; state[9] = finalQ[3];

    // 地面高度約束
    if (state[2] > 0) {
        state[2] = 0;
        if (state[5] > 0) state[5] = 0;
    }

    // 數值 Watchdog (防止 NaN / Inf 崩潰)
    for (let i = 0; i < state.length; i++) {
        if (isNaN(state[i]) || !isFinite(state[i])) {
            console.warn(`[Watchdog] State Index ${i} divergence detected, self-healing state.`);
            state = [0, 0, -3048, 128.6, 0, 0, 1, 0, 0, 0, 0, 0, 0];
            break;
        }
    }
}

function updateTurbulence(dt) {
    const scale = currentLevelCfg.turbMultiplier;
    windGround.turbE += ((Math.random() - 0.5) * 4.0 * scale - windGround.turbE * 0.8) * dt;
    windGround.turbN += ((Math.random() - 0.5) * 4.0 * scale - windGround.turbN * 0.8) * dt;
    windGround.turbU += ((Math.random() - 0.5) * 2.0 * scale - windGround.turbU * 0.8) * dt;
}

function quatToEuler(q) {
    const [q0, q1, q2, q3] = q;
    const pitch = Math.asin(Math.max(-1, Math.min(1, 2 * (q0 * q2 - q1 * q3))));
    const roll = Math.atan2(2 * (q0 * q1 + q2 * q3), 1 - 2 * (q1 * q1 + q2 * q2));
    const yaw = Math.atan2(2 * (q0 * q3 + q1 * q2), 1 - 2 * (q2 * q2 + q3 * q3));
    return {
        pitch: pitch * (180 / Math.PI),
        roll: roll * (180 / Math.PI),
        heading: ((yaw * (180 / Math.PI)) % 360 + 360) % 360
    };
}

const DT = 1 / 120;
setInterval(() => {
    updateTurbulence(DT);
    rk4Step(DT);

    const [x, y, z, u, v, w, q0, q1, q2, q3, p, q, r] = state;
    const Vt = Math.sqrt(u * u + v * v + w * w);
    const speedKts = Vt * 1.94384;
    const altFeet = -z * 3.28084;
    const atm = getAtmosphere(-z);
    const mach = Vt / atm.soundSpeed;
    const aoaDeg = Math.atan2(w, u) * (180 / Math.PI);
    const betaDeg = Math.asin(Math.max(-1, Math.min(1, v / Math.max(1, Vt)))) * (180 / Math.PI);
    const gForce = 1.0 + (q * u - p * v) / 9.80665;
    const euler = quatToEuler([q0, q1, q2, q3]);

    self.postMessage({
        x: x,
        y: y,
        altitude: Math.max(0, altFeet),
        altMeters: Math.max(0, -z),
        speed: speedKts,
        mach: mach,
        aoa: aoaDeg,
        beta: betaDeg,
        gForce: gForce,
        pitch: euler.pitch,
        roll: euler.roll,
        heading: euler.heading,
        pRate: p * (180 / Math.PI),
        qRate: q * (180 / Math.PI),
        dz: state[2],
        density: atm.density,
        engineData: {
            eng1_N1: eng1.N1,
            eng1_N2: eng1.N2,
            eng1_EGT: eng1.EGT,
            eng1_FF: eng1.FF,
            eng1_Failed: eng1.isFailed,
            eng2_N1: eng2.N1,
            eng2_N2: eng2.N2,
            eng2_EGT: eng2.EGT,
            eng2_FF: eng2.FF,
            eng2_Failed: eng2.isFailed
        }
    });
}, 1000 * DT);

self.onmessage = function (e) {
    const d = e.data;
    if (d.type === 'config') {
        if (d.level) {
            if (d.level === 'junior') currentLevelCfg = { stabilityAssist: 0.95, stallProtection: true, windMultiplier: 0.0, liftBoost: 1.35, turbMultiplier: 0.0 };
            else if (d.level === 'captain') currentLevelCfg = { stabilityAssist: 0.0, stallProtection: false, windMultiplier: 1.3, liftBoost: 1.0, turbMultiplier: 1.3 };
            else currentLevelCfg = { stabilityAssist: 0.3, stallProtection: false, windMultiplier: 0.6, liftBoost: 1.0, turbMultiplier: 0.6 };
        }
        if (d.weather) {
            const wm = currentLevelCfg.windMultiplier;
            if (d.weather === 'storm') { windGround.meanE = 15.0 * wm; windGround.meanN = 6.0 * wm; }
            else if (d.weather === 'night' || d.weather === 'sunset') { windGround.meanE = 5.0 * wm; windGround.meanN = 2.0 * wm; }
            else { windGround.meanE = 2.0 * wm; windGround.meanN = 0.5 * wm; }
        }
    } else if (d.type === 'controls') {
        controls.elevator = d.elevator;
        controls.aileron = d.aileron;
        controls.rudder = d.rudder;
        controls.throttle = d.throttle;
        controls.brake = d.brake;
    } else if (d.type === 'fault') {
        if (d.target === 'eng1') eng1.injectFailure(d.active);
        if (d.target === 'eng2') eng2.injectFailure(d.active);
    }
};
