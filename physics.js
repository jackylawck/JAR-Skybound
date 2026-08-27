// ============================================================
// physics.js - 6-DOF 物理計算核心 v3.3
// ============================================================

// 1. NASA CRM 氣動查表模型
class NasaCrmAero {
    constructor() {
        this.name = "NASA CRM Wind-Tunnel Grid";
        this.alphaGrid = [-4, -2, 0, 2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22];
        this.machGrid = [0.20, 0.40, 0.60, 0.70, 0.75, 0.80, 0.83, 0.85, 0.86];
        this.clTable = [
            [-0.12, -0.12, -0.13, -0.14, -0.15, -0.16, -0.17, -0.18, -0.19],
            [ 0.08,  0.08,  0.09,  0.09,  0.10,  0.11,  0.11,  0.12,  0.12],
            [ 0.28,  0.28,  0.29,  0.30,  0.32,  0.34,  0.36,  0.38,  0.39],
            [ 0.48,  0.48,  0.50,  0.52,  0.54,  0.58,  0.61,  0.64,  0.65],
            [ 0.68,  0.69,  0.71,  0.73,  0.77,  0.81,  0.85,  0.89,  0.90],
            [ 0.88,  0.89,  0.91,  0.95,  0.99,  1.04,  1.09,  1.12,  1.13],
            [ 1.07,  1.08,  1.11,  1.15,  1.20,  1.26,  1.30,  1.32,  1.31],
            [ 1.25,  1.26,  1.29,  1.34,  1.39,  1.45,  1.47,  1.45,  1.42],
            [ 1.41,  1.42,  1.45,  1.50,  1.55,  1.59,  1.58,  1.52,  1.48],
            [ 1.54,  1.55,  1.58,  1.62,  1.66,  1.67,  1.62,  1.54,  1.49],
            [ 1.62,  1.63,  1.65,  1.68,  1.69,  1.65,  1.58,  1.48,  1.42],
            [ 1.55,  1.56,  1.57,  1.58,  1.56,  1.48,  1.40,  1.30,  1.25],
            [ 1.38,  1.39,  1.40,  1.38,  1.32,  1.22,  1.15,  1.05,  1.00],
            [ 1.18,  1.19,  1.20,  1.15,  1.08,  0.98,  0.90,  0.82,  0.78]
        ];
        this.cdTable = [
            [0.019, 0.019, 0.020, 0.021, 0.023, 0.028, 0.035, 0.048, 0.062],
            [0.016, 0.016, 0.017, 0.018, 0.020, 0.024, 0.030, 0.042, 0.055],
            [0.017, 0.017, 0.018, 0.019, 0.021, 0.026, 0.033, 0.046, 0.060],
            [0.022, 0.022, 0.023, 0.025, 0.028, 0.034, 0.043, 0.058, 0.075],
            [0.031, 0.031, 0.033, 0.036, 0.040, 0.048, 0.060, 0.078, 0.098],
            [0.044, 0.044, 0.047, 0.051, 0.057, 0.068, 0.082, 0.105, 0.128],
            [0.061, 0.062, 0.065, 0.071, 0.079, 0.093, 0.111, 0.138, 0.165],
            [0.082, 0.083, 0.088, 0.095, 0.106, 0.124, 0.146, 0.178, 0.208],
            [0.108, 0.109, 0.115, 0.125, 0.138, 0.160, 0.188, 0.224, 0.258],
            [0.139, 0.140, 0.148, 0.160, 0.177, 0.203, 0.236, 0.276, 0.315],
            [0.176, 0.177, 0.187, 0.202, 0.222, 0.252, 0.289, 0.334, 0.378],
            [0.220, 0.221, 0.232, 0.249, 0.272, 0.306, 0.348, 0.398, 0.448],
            [0.272, 0.273, 0.285, 0.304, 0.329, 0.366, 0.412, 0.468, 0.524],
            [0.332, 0.333, 0.346, 0.366, 0.393, 0.432, 0.482, 0.544, 0.606]
        ];
        this.cmTable = [
            [ 0.045,  0.044,  0.042,  0.038,  0.032,  0.022,  0.010, -0.008, -0.020],
            [ 0.028,  0.027,  0.025,  0.022,  0.016,  0.007, -0.004, -0.020, -0.032],
            [ 0.010,  0.009,  0.007,  0.004, -0.002, -0.010, -0.020, -0.035, -0.046],
            [-0.008, -0.009, -0.011, -0.014, -0.020, -0.028, -0.038, -0.052, -0.063],
            [-0.026, -0.027, -0.029, -0.033, -0.039, -0.048, -0.058, -0.071, -0.082],
            [-0.044, -0.045, -0.048, -0.052, -0.058, -0.068, -0.079, -0.092, -0.103],
            [-0.062, -0.063, -0.066, -0.071, -0.078, -0.089, -0.101, -0.115, -0.126],
            [-0.080, -0.081, -0.085, -0.091, -0.098, -0.111, -0.124, -0.139, -0.151],
            [-0.098, -0.099, -0.104, -0.111, -0.119, -0.134, -0.148, -0.165, -0.178],
            [-0.116, -0.117, -0.123, -0.131, -0.141, -0.158, -0.174, -0.193, -0.207],
            [-0.134, -0.135, -0.142, -0.152, -0.164, -0.183, -0.202, -0.223, -0.238],
            [-0.150, -0.151, -0.159, -0.171, -0.185, -0.206, -0.228, -0.251, -0.268],
            [-0.162, -0.163, -0.172, -0.186, -0.202, -0.226, -0.250, -0.276, -0.295],
            [-0.170, -0.171, -0.181, -0.197, -0.215, -0.242, -0.268, -0.297, -0.318]
        ];
    }
    getCoefficients(alphaDeg, mach) {
        const a = Math.max(-4.0, Math.min(22.0, alphaDeg));
        const m = Math.max(0.20, Math.min(0.86, mach));
        let ai = 0, mi = 0;
        for (let i = 0; i < this.alphaGrid.length - 1; i++) {
            if (a >= this.alphaGrid[i] && a <= this.alphaGrid[i + 1]) { ai = i; break; }
        }
        for (let j = 0; j < this.machGrid.length - 1; j++) {
            if (m >= this.machGrid[j] && m <= this.machGrid[j + 1]) { mi = j; break; }
        }
        const ta = (a - this.alphaGrid[ai]) / (this.alphaGrid[ai + 1] - this.alphaGrid[ai]);
        const tm = (m - this.machGrid[mi]) / (this.machGrid[mi + 1] - this.machGrid[mi]);
        const interp = (tbl) => {
            const v00 = tbl[ai][mi], v10 = tbl[ai + 1][mi], v01 = tbl[ai][mi + 1], v11 = tbl[ai + 1][mi + 1];
            return (v00 + (v10 - v00) * ta) + ((v01 + (v11 - v01) * ta) - (v00 + (v10 - v00) * ta)) * tm;
        };
        return { CL: interp(this.clTable), CD: interp(this.cdTable), Cm: interp(this.cmTable) };
    }
}

// 2. 雙轉子渦扇發動機模型
class TurbofanEngine {
    constructor(engineId, maxThrustSL = 130000) {
        this.id = engineId;
        this.maxThrustSL = maxThrustSL;
        this.N1 = 20.0;
        this.N2 = 58.0;
        this.EGT = 420.0;
        this.FF = 380.0;
        this.thrust = 0.0;
        this.isFailed = false;
    }
    update(throttleCmd, densityRatio, mach, dt) {
        if (this.isFailed) {
            this.N1 += (5.0 - this.N1) * 0.15 * dt;
            this.N2 += (10.0 - this.N2) * 0.2 * dt;
            this.EGT += (60.0 - this.EGT) * 0.1 * dt;
            this.FF = 0.0;
            this.thrust = -this.maxThrustSL * 0.02 * mach;
            return this.thrust;
        }
        const targetN1 = 20.0 + throttleCmd * 80.0;
        const targetN2 = 58.0 + throttleCmd * 41.5;
        const tauN1 = (targetN1 > this.N1) ? 2.4 : 1.8;
        const tauN2 = (targetN2 > this.N2) ? 1.6 : 1.2;
        this.N1 += (targetN1 - this.N1) * (dt / tauN1);
        this.N2 += (targetN2 - this.N2) * (dt / tauN2);
        const targetEGT = 400.0 + (this.N2 / 100.0) * 450.0 + (targetN1 - this.N1) * 3.5;
        this.EGT += (targetEGT - this.EGT) * (dt / 1.5);
        this.FF = Math.max(220, Math.pow(this.N2 / 100.0, 2.8) * 2800 * Math.sqrt(densityRatio));
        const n1Frac = Math.max(0, (this.N1 - 20.0) / 80.0);
        this.thrust = this.maxThrustSL * Math.pow(n1Frac, 1.85) * Math.pow(densityRatio, 0.82) * (1.0 - 0.25 * mach);
        return this.thrust;
    }
}

const crmAero = new NasaCrmAero();
const eng1 = new TurbofanEngine(1, 130000);
const eng2 = new TurbofanEngine(2, 130000);

const AC = {
    MASS: 75000,
    S: 129.15,
    b: 35.8,
    c: 4.1,
    IX: 1.2e6,
    IY: 3.5e6,
    IZ: 4.5e6,
    IXZ: 1.0e5,
    engYOffset: 5.4
};

let state = [0, 0, -3048, 128.6, 0, 0, 1, 0, 0, 0, 0, 0, 0];
let controls = { elevator: 0, aileron: 0, rudder: 0, throttle: 0.6, brake: 0 };
let currentLevelCfg = { stabilityAssist: 0.3, stallProtection: false, windMultiplier: 0.6, liftBoost: 1.0, turbMultiplier: 0.6 };
let windGround = { meanE: 2.0, meanN: 0.0, meanU: 0.0, turbE: 0.0, turbN: 0.0, turbU: 0.0 };

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
    return { density: p / (287.058 * T), soundSpeed: Math.sqrt(1.4 * 287.058 * T) };
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

function getDerivatives(s, ctrl, dtStep) {
    const [x, y, z, u, v, w, q0, q1, q2, q3, p, q, r] = s;
    const [n0, n1, n2, n3] = normalizeQuat([q0, q1, q2, q3]);
    const R_b2g = quatToRotMat(n0, n1, n2, n3);
    const R_g2b = transpose(R_b2g);

    const altM = -z;
    const atm = getAtmosphere(altM);

    const wE = windGround.meanE + windGround.turbE;
    const wN = windGround.meanN + windGround.turbN;
    const wU = windGround.meanU + windGround.turbU;
    const windBody = matVecMul(R_g2b, [wE, wN, wU]);

    const u_air = u - windBody[0], v_air = v - windBody[1], w_air = w - windBody[2];
    const Vt = Math.max(1.0, Math.sqrt(u_air * u_air + v_air * v_air + w_air * w_air));
    const alphaRad = Math.atan2(w_air, u_air);
    const alphaDeg = alphaRad * (180 / Math.PI);
    const betaRad = Math.asin(Math.max(-1, Math.min(1, v_air / Vt)));
    const mach = Vt / atm.soundSpeed;
    const qbar = 0.5 * atm.density * Vt * Vt;

    const crmCoeffs = crmAero.getCoefficients(alphaDeg, mach);
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

    const densityRatio = atm.density / 1.225;
    const T1 = eng1.update(ctrl.throttle, densityRatio, mach, dtStep);
    const T2 = eng2.update(ctrl.throttle, densityRatio, mach, dtStep);
    const totalThrust = T1 + T2;
    const Mz_thrust = (T1 - T2) * AC.engYOffset;

    const g = 9.80665;
    const G_body = matVecMul(R_g2b, [0, 0, AC.MASS * g]);

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
            const Fz_gear_g = -Math.min(2.5e6, gear.k * compression + gear.c * Math.max(0, v_wheel_g[2]));
            const normalF = Math.abs(Fz_gear_g);
            const mu = gear.muRoll + (ctrl.brake || 0) * (gear.muBrake - gear.muRoll);
            const vH = Math.hypot(v_wheel_g[0], v_wheel_g[1]);
            let Fx_fric_g = 0;
            if (vH > 0.05) Fx_fric_g = -mu * normalF * (v_wheel_g[0] / vH);

            const slipAngle = (v_wheel_body[0] !== 0) ? Math.atan2(v_wheel_body[1], Math.abs(v_wheel_body[0])) : 0;
            const Fy_slip_b = -Math.max(-normalF * 0.7, Math.min(normalF * 0.7, gear.Cy * slipAngle));

            const F_gear_b_trans = matVecMul(R_g2b, [Fx_fric_g, 0, Fz_gear_g]);
            F_gear_b_trans[1] += Fy_slip_b;

            F_gear_body[0] += F_gear_b_trans[0];
            F_gear_body[1] += F_gear_b_trans[1];
            F_gear_body[2] += F_gear_b_trans[2];

            const torque_b = crossProduct(gear.posBody, F_gear_b_trans);
            M_gear_body[0] += torque_b[0];
            M_gear_body[1] += torque_b[1];
            M_gear_body[2] += torque_b[2];
        }
    });

    const du = (Fx_aero + totalThrust + G_body[0] + F_gear_body[0]) / AC.MASS - (q * w - r * v);
    const dv = (Fy_aero + G_body[1] + F_gear_body[1]) / AC.MASS - (r * u - p * w);
    const dw = (Fz_aero + G_body[2] + F_gear_body[2]) / AC.MASS - (p * v - q * u);

    const RHS_p = (Mx_aero + M_gear_body[0]) - (-AC.IXZ * p * q + (AC.IZ - AC.IY) * q * r);
    const RHS_q = (My_aero + M_gear_body[1]) - (AC.IXZ * (p * p - r * r) + (AC.IX - AC.IZ) * p * r);
    const RHS_r = (Mz_aero + Mz_thrust + M_gear_body[2]) - ((AC.IY - AC.IX) * p * q + AC.IXZ * q * r);

    const detI = AC.IX * AC.IZ - AC.IXZ * AC.IXZ;
    const dp = (RHS_p * AC.IZ + AC.IXZ * RHS_r) / detI;
    const dq = RHS_q / AC.IY;
    const dr = (AC.IXZ * RHS_p + AC.IX * RHS_r) / detI;

    const dq0 = 0.5 * (-p * n1 - q * n2 - r * n3);
    const dq1 = 0.5 * ( p * n0 + r * n2 - q * n3);
    const dq2 = 0.5 * ( q * n0 - r * n1 + p * n3);
    const dq3 = 0.5 * ( r * n0 + q * n1 - p * n2);

    const v_ground = matVecMul(R_b2g, [u, v, w]);
    return [v_ground[0] + wE, v_ground[1] + wN, v_ground[2] + wU, du, dv, dw, dq0, dq1, dq2, dq3, dp, dq, dr];
}

function rk4Step(dt) {
    const k1 = getDerivatives(state, controls, dt);
    let s2 = state.map((v, i) => v + k1[i] * dt * 0.5);
    let qN = normalizeQuat([s2[6], s2[7], s2[8], s2[9]]);
    s2[6] = qN[0]; s2[7] = qN[1]; s2[8] = qN[2]; s2[9] = qN[3];
    const k2 = getDerivatives(s2, controls, dt);

    let s3 = state.map((v, i) => v + k2[i] * dt * 0.5);
    qN = normalizeQuat([s3[6], s3[7], s3[8], s3[9]]);
    s3[6] = qN[0]; s3[7] = qN[1]; s3[8] = qN[2]; s3[9] = qN[3];
    const k3 = getDerivatives(s3, controls, dt);

    let s4 = state.map((v, i) => v + k3[i] * dt);
    qN = normalizeQuat([s4[6], s4[7], s4[8], s4[9]]);
    s4[6] = qN[0]; s4[7] = qN[1]; s4[8] = qN[2]; s4[9] = qN[3];
    const k4 = getDerivatives(s4, controls, dt);

    for (let i = 0; i < state.length; i++) {
        state[i] += (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]) * (dt / 6);
    }

    const finalQ = normalizeQuat([state[6], state[7], state[8], state[9]]);
    state[6] = finalQ[0]; state[7] = finalQ[1]; state[8] = finalQ[2]; state[9] = finalQ[3];

    if (state[2] > 0) { state[2] = 0; if (state[5] > 0) state[5] = 0; }
    for (let i = 0; i < state.length; i++) {
        if (isNaN(state[i]) || !isFinite(state[i])) {
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

const FIXED_DT = 1 / 120;
let accumulator = 0;
let lastLoopTime = performance.now();

function physicsLoop() {
    const now = performance.now();
    let frameTime = (now - lastLoopTime) / 1000;
    if (frameTime > 0.1) frameTime = 0.1;
    lastLoopTime = now;
    accumulator += frameTime;

    while (accumulator >= FIXED_DT) {
        updateTurbulence(FIXED_DT);
        rk4Step(FIXED_DT);
        accumulator -= FIXED_DT;
    }

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
        x: x, y: y,
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
        dz: state[2],
        density: atm.density,
        engineData: {
            eng1_N1: eng1.N1, eng1_EGT: eng1.EGT, eng1_FF: eng1.FF,
            eng2_N1: eng2.N1, eng2_EGT: eng2.EGT, eng2_FF: eng2.FF
        }
    });

    setTimeout(physicsLoop, 7);
}

physicsLoop();

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
        if (d.target === 'eng1') eng1.isFailed = d.active;
        if (d.target === 'eng2') eng2.isFailed = d.active;
    }
};
