// ============================================================
// J.A.R. Skybound Pro Simulator - 6-DOF 物理引擎 Worker v2.6
// 6-DOF 剛體動力學 | RK4 數值積分 | ISA 大氣 | 起落架彈簧阻尼 | Dryden 風場
// ============================================================

// 國際標準大氣 (ISA) 模型
function getAtmosphere(altitudeFeet) {
    const h = Math.max(0, altitudeFeet * 0.3048);
    let T, p, rho;
    if (h < 11000) {
        T = 288.15 - 0.0065 * h;
        p = 101325 * Math.pow((288.15 - 0.0065 * h) / 288.15, 5.2561);
    } else {
        T = 216.65;
        p = 22632 * Math.exp(-0.00015769 * (h - 11000));
    }
    rho = p / (287.05 * T);
    const soundSpeed = Math.sqrt(1.4 * 287.05 * T);
    return { density: rho, soundSpeed, pressure: p, temperature: T };
}

// 飛機幾何與慣性矩
const AC = {
    mass: 75000,
    S: 129.15,
    b: 35.8,
    c: 4.1,
    Ixx: 1200000,
    Iyy: 2500000,
    Izz: 3600000,
    Ixz: 100000,
    maxThrust: 260000
};

// 起落架參數
const LANDING_GEAR = {
    main: { spring_k: 450000, damping_c: 35000, friction_roll: 0.02, friction_brake: 0.45 },
    nose: { spring_k: 300000, damping_c: 25000, friction_roll: 0.015, friction_brake: 0.35 }
};

// Dryden 風場模型
class WindField {
    constructor() {
        this.meanEast = 6.0;  // 6 m/s 側風 (約 11.6 kts)
        this.meanNorth = 2.0; // 2 m/s 逆風
        this.turbE = 0; this.turbN = 0; this.turbU = 0;
    }
    update(dt) {
        const corner = 0.15;
        this.turbE += ((Math.random() - 0.5) * 3 - this.turbE) * corner * dt;
        this.turbN += ((Math.random() - 0.5) * 3 - this.turbN) * corner * dt;
        this.turbU += ((Math.random() - 0.5) * 1.5 - this.turbU) * corner * dt;
    }
    getVector() {
        return [this.meanEast + this.turbE, this.meanNorth + this.turbN, this.turbU];
    }
}
const windField = new WindField();

// 合成 CRM 氣動查表
function buildAeroTable() {
    const table = [];
    for (let a = -5; a <= 20; a++) {
        const row = [];
        for (let m = 0.20; m <= 0.85; m += 0.05) {
            const alphaRad = a * Math.PI / 180;
            let CL = (a < 15) ? (0.28 + 4.8 * alphaRad + 0.8 * Math.pow(alphaRad, 3)) : (1.6 - 0.12 * (a - 15));
            if (m > 0.7) CL *= (1.0 - 0.15 * (m - 0.7));

            const AR = (AC.b * AC.b) / AC.S;
            const CD_ind = (CL * CL) / (Math.PI * AR * 0.8);
            let CD_parasite = 0.018;
            if (m > 0.75) CD_parasite += 2.5 * Math.pow(m - 0.75, 3);
            const CD = CD_parasite + CD_ind;

            const Cm = 0.05 - 0.6 * alphaRad - 0.02 * (m - 0.2);
            row.push({ CL, CD, Cm });
        }
        table.push(row);
    }
    return table;
}
const AERO_TABLE = buildAeroTable();
const ALPHA_VALUES = Array.from({ length: 26 }, (_, i) => i - 5);
const MACH_VALUES = Array.from({ length: 14 }, (_, i) => 0.20 + i * 0.05);

function interpolateAero(alphaDeg, mach) {
    const a = Math.max(-5, Math.min(20, alphaDeg));
    const m = Math.max(0.20, Math.min(0.85, mach));
    let ai = 0, mi = 0;
    for (let i = 0; i < ALPHA_VALUES.length - 1; i++) {
        if (a >= ALPHA_VALUES[i] && a <= ALPHA_VALUES[i + 1]) { ai = i; break; }
    }
    for (let i = 0; i < MACH_VALUES.length - 1; i++) {
        if (m >= MACH_VALUES[i] && m <= MACH_VALUES[i + 1]) { mi = i; break; }
    }
    if (a >= 20) ai = ALPHA_VALUES.length - 2;
    if (m >= 0.85) mi = MACH_VALUES.length - 2;

    const fa = (a - ALPHA_VALUES[ai]) / (ALPHA_VALUES[ai + 1] - ALPHA_VALUES[ai]);
    const fm = (m - MACH_VALUES[mi]) / (MACH_VALUES[mi + 1] - MACH_VALUES[mi]);
    const lerp = (v, w, t) => v + (w - v) * t;

    const v00 = AERO_TABLE[ai][mi], v10 = AERO_TABLE[ai + 1][mi];
    const v01 = AERO_TABLE[ai][mi + 1], v11 = AERO_TABLE[ai + 1][mi + 1];

    return {
        CL: lerp(lerp(v00.CL, v10.CL, fa), lerp(v01.CL, v11.CL, fa), fm),
        CD: lerp(lerp(v00.CD, v10.CD, fa), lerp(v01.CD, v11.CD, fa), fm),
        Cm: lerp(lerp(v00.Cm, v10.Cm, fa), lerp(v01.Cm, v11.Cm, fa), fm)
    };
}

function normalizeQuat(q) {
    const n = Math.hypot(q[0], q[1], q[2], q[3]);
    return n === 0 ? [1, 0, 0, 0] : [q[0] / n, q[1] / n, q[2] / n, q[3] / n];
}

function quatToRotMat(q0, q1, q2, q3) {
    return [
        [q0 * q0 + q1 * q1 - q2 * q2 - q3 * q3, 2 * (q1 * q2 - q0 * q3), 2 * (q1 * q3 + q0 * q2)],
        [2 * (q1 * q2 + q0 * q3), q0 * q0 - q1 * q1 + q2 * q2 - q3 * q3, 2 * (q2 * q3 - q0 * q1)],
        [2 * (q1 * q3 - q0 * q2), 2 * (q2 * q3 + q0 * q1), q0 * q0 - q1 * q1 - q2 * q2 + q3 * q3]
    ];
}

function matVecMul(m, v) {
    return m.map(row => row.reduce((s, val, j) => s + val * v[j], 0));
}

function transpose(m) {
    return m[0].map((_, i) => m.map(row => row[i]));
}

function crossProduct(a, b) {
    return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}

// 狀態向量 [x, y, z, u, v, w, q0, q1, q2, q3, p, q, r]
let state = [0, 0, -3048, 180, 0, 0, 1, 0, 0, 0, 0, 0, 0];
let controls = { elevator: 0, aileron: 0, rudder: 0, throttle: 0.6, brake: 0 };

function getDerivatives(s, dtStep = 0.00833) {
    const [x, y, z, u, v, w, q0, q1, q2, q3, p, q, r] = s;
    const [n0, n1, n2, n3] = normalizeQuat([q0, q1, q2, q3]);
    const R = quatToRotMat(n0, n1, n2, n3);
    const R_T = transpose(R);

    const altFeet = -z / 0.3048;
    const atmos = getAtmosphere(altFeet);

    // 風場疊加
    windField.update(dtStep);
    const windGround = windField.getVector();
    const windBody = matVecMul(R_T, windGround);

    const u_rel = u - windBody[0];
    const v_rel = v - windBody[1];
    const w_rel = w - windBody[2];

    const VT = Math.sqrt(u_rel * u_rel + v_rel * v_rel + w_rel * w_rel);
    const qbar = 0.5 * atmos.density * VT * VT;
    const mach = VT / atmos.soundSpeed;
    const alphaDeg = (VT === 0) ? 0 : Math.atan2(w_rel, u_rel) * 180 / Math.PI;
    const beta = (VT === 0) ? 0 : Math.asin(Math.max(-1, Math.min(1, v_rel / VT)));

    const aero = interpolateAero(alphaDeg, mach);
    const CL = aero.CL + 0.15 * controls.elevator;
    const CD = aero.CD + 0.02 * Math.abs(controls.elevator);
    const Cm = aero.Cm - 0.3 * controls.elevator;
    const CY = -0.08 * beta + 0.12 * controls.rudder;
    const Cl = -0.02 * beta + 0.18 * controls.aileron;
    const Cn = 0.02 * beta - 0.1 * controls.rudder;

    const alphaRad = alphaDeg * Math.PI / 180;
    const FX_aero = qbar * AC.S * (-CD * Math.cos(alphaRad) + CL * Math.sin(alphaRad));
    const FY_aero = qbar * AC.S * CY;
    const FZ_aero = qbar * AC.S * (-CD * Math.sin(alphaRad) - CL * Math.cos(alphaRad));

    const L_aero = qbar * AC.S * AC.b * Cl;
    const M_aero = qbar * AC.S * AC.c * Cm;
    const N_aero = qbar * AC.S * AC.b * Cn;

    const thrust = controls.throttle * AC.maxThrust * Math.pow(atmos.density / 1.225, 0.75) * (1 - 0.2 * Math.pow(mach, 2));

    // 地面起落架力學
    let F_ground_body = [0, 0, 0];
    let M_ground_body = [0, 0, 0];

    if (-z < 3.0) {
        const gearPoints = [
            { pos: [-2.5, -4.0, -1.8], cfg: LANDING_GEAR.main },
            { pos: [2.5, -4.0, -1.8], cfg: LANDING_GEAR.main },
            { pos: [0.0, 8.0, -1.6], cfg: LANDING_GEAR.nose }
        ];

        gearPoints.forEach(gear => {
            const gPos = matVecMul(R, gear.pos);
            const wheel_z = z + gPos[2];
            const compression = Math.max(0, -wheel_z);

            if (compression > 0) {
                const Fz_spring = gear.cfg.spring_k * compression + gear.cfg.damping_c * Math.max(0, w);
                const Fz_ground = Math.min(2000000, Fz_spring);

                const fricCoeff = gear.cfg.friction_roll + (controls.brake || 0) * (gear.cfg.friction_brake - gear.cfg.friction_roll);
                const F_fric_body = [-fricCoeff * Fz_ground * Math.sign(u), 0, -Fz_ground];

                F_ground_body[0] += F_fric_body[0];
                F_ground_body[1] += F_fric_body[1];
                F_ground_body[2] += F_fric_body[2];

                const torque = crossProduct(gear.pos, F_fric_body);
                M_ground_body[0] += torque[0];
                M_ground_body[1] += torque[1];
                M_ground_body[2] += torque[2];
            }
        });
    }

    const g = 9.80665;
    const Gx = g * 2 * (n1 * n3 - n0 * n2);
    const Gy = g * 2 * (n2 * n3 + n0 * n1);
    const Gz = g * (n0 * n0 - n1 * n1 - n2 * n2 + n3 * n3);

    const du = (FX_aero + thrust + F_ground_body[0]) / AC.mass - Gx - (q * w - r * v);
    const dv = (FY_aero + F_ground_body[1]) / AC.mass - Gy - (r * u - p * w);
    const dw = (FZ_aero + F_ground_body[2]) / AC.mass - Gz - (p * v - q * u);

    const RHS_p = (L_aero + M_ground_body[0]) - (-AC.Ixz * p * q + (AC.Izz - AC.Iyy) * q * r);
    const RHS_q = (M_aero + M_ground_body[1]) - (AC.Ixz * (p * p - r * r) + (AC.Ixx - AC.Izz) * p * r);
    const RHS_r = (N_aero + M_ground_body[2]) - ((AC.Iyy - AC.Ixx) * p * q + AC.Ixz * q * r);

    const det = AC.Ixx * AC.Izz - AC.Ixz * AC.Ixz;
    const dp = (RHS_p * AC.Izz + AC.Ixz * RHS_r) / det;
    const dq = RHS_q / AC.Iyy;
    const dr = (AC.Ixz * RHS_p + AC.Ixx * RHS_r) / det;

    const dq0 = 0.5 * (-p * n1 - q * n2 - r * n3);
    const dq1 = 0.5 * (p * n0 + r * n2 - q * n3);
    const dq2 = 0.5 * (q * n0 - r * n1 + p * n3);
    const dq3 = 0.5 * (r * n0 + q * n1 - p * n2);

    const dx = R[0][0] * u + R[0][1] * v + R[0][2] * w;
    const dy = R[1][0] * u + R[1][1] * v + R[1][2] * w;
    const dz = R[2][0] * u + R[2][1] * v + R[2][2] * w;

    return [dx, dy, dz, du, dv, dw, dq0, dq1, dq2, dq3, dp, dq, dr];
}

function rk4Step(s, dt) {
    const k1 = getDerivatives(s, dt);
    const s2 = s.map((val, i) => val + k1[i] * dt * 0.5);
    const k2 = getDerivatives(s2, dt);
    const s3 = s.map((val, i) => val + k2[i] * dt * 0.5);
    const k3 = getDerivatives(s3, dt);
    const s4 = s.map((val, i) => val + k3[i] * dt);
    const k4 = getDerivatives(s4, dt);
    return s.map((val, i) => val + (dt / 6) * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]));
}

function quatToEuler(q) {
    const [q0, q1, q2, q3] = q;
    const pitch = Math.asin(Math.max(-1, Math.min(1, 2 * (q0 * q2 - q1 * q3))));
    const roll = Math.atan2(2 * (q0 * q1 + q2 * q3), 1 - 2 * (q1 * q1 + q2 * q2));
    const yaw = Math.atan2(2 * (q0 * q3 + q1 * q2), 1 - 2 * (q2 * q2 + q3 * q3));
    return { pitch: pitch * 180 / Math.PI, roll: roll * 180 / Math.PI, heading: (yaw * 180 / Math.PI + 360) % 360 };
}

self.onmessage = function (e) {
    if (e.data.type === 'input') {
        controls.elevator += (e.data.gamma * 0.03 - controls.elevator) * 0.1;
        controls.aileron += (e.data.beta * 0.02 - controls.aileron) * 0.1;
    }
    if (e.data.type === 'controls') {
        if (e.data.elevator !== undefined) controls.elevator = e.data.elevator;
        if (e.data.aileron !== undefined) controls.aileron = e.data.aileron;
        if (e.data.rudder !== undefined) controls.rudder = e.data.rudder;
        if (e.data.throttle !== undefined) controls.throttle = Math.max(0, Math.min(1, e.data.throttle));
        if (e.data.brake !== undefined) controls.brake = Math.max(0, Math.min(1, e.data.brake));
    }
};

const fixedDt = 1 / 120;
setInterval(() => {
    state = rk4Step(state, fixedDt);

    if (state[2] > 0) { state[2] = 0; state[5] = 0; }
    const norm = normalizeQuat([state[6], state[7], state[8], state[9]]);
    state[6] = norm[0]; state[7] = norm[1]; state[8] = norm[2]; state[9] = norm[3];

    const VT = Math.hypot(state[3], state[4], state[5]);
    const alt = -state[2] / 0.3048;
    const atmos = getAtmosphere(alt);
    const euler = quatToEuler(norm);
    const AoA = Math.atan2(state[5], state[3]) * 180 / Math.PI;
    const Beta = (VT === 0) ? 0 : Math.asin(Math.max(-1, Math.min(1, state[4] / VT))) * 180 / Math.PI;

    self.postMessage({
        x: state[0],
        y: state[1],
        z: state[2],
        u: state[3],
        v: state[4],
        w: state[5],
        pitch: euler.pitch,
        roll: euler.roll,
        heading: euler.heading,
        pRate: state[10] * 180 / Math.PI,
        qRate: state[11] * 180 / Math.PI,
        speed: VT * 1.94384,
        altitude: alt,
        mach: VT / atmos.soundSpeed,
        aoa: AoA,
        beta: Beta,
        gForce: (state[3] * state[3] + state[5] * state[5]) / (9.80665 * 100),
        density: atmos.density,
        dz: state[5]
    });
}, 1000 * fixedDt);

// 在 physics.js 中增加接收主執行緒的難度配置
let currentLevel = 'advanced';
let currentLevelCfg = { stabilityAssist: 0.3, stallProtection: false, windMultiplier: 0.5, liftBoost: 1.0 };

self.onmessage = function (e) {
    if (e.data.type === 'config') {
        currentLevel = e.data.level || 'advanced';
        if (currentLevel === 'junior') {
            currentLevelCfg = { stabilityAssist: 0.95, stallProtection: true, windMultiplier: 0.0, liftBoost: 1.3 };
        } else if (currentLevel === 'captain') {
            currentLevelCfg = { stabilityAssist: 0.0, stallProtection: false, windMultiplier: 1.3, liftBoost: 1.0 };
        } else {
            currentLevelCfg = { stabilityAssist: 0.3, stallProtection: false, windMultiplier: 0.6, liftBoost: 1.0 };
        }

        // 天氣側風強度
        if (e.data.weather === 'storm') {
            windField.meanEast = 14.0 * currentLevelCfg.windMultiplier; // 強側風約 27 kts
            windField.meanNorth = 6.0 * currentLevelCfg.windMultiplier;
        } else if (e.data.weather === 'night' || e.data.weather === 'sunset') {
            windField.meanEast = 4.0 * currentLevelCfg.windMultiplier;
        } else {
            windField.meanEast = 2.0 * currentLevelCfg.windMultiplier;
        }
    }
    // ... 其餘 input 與 controls 邏輯保持不變 ...
};
