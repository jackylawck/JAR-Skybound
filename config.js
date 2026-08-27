// ============================================================
// config.js - J.A.R. Skybound Pro 全域配置與字典 v3.3
// ============================================================

// 全局標準物理常數與單位轉換器 (Units Normalizer)
export const UNITS = {
    M_TO_FT: 3.28084,
    FT_TO_M: 0.3048,
    MPS_TO_KTS: 1.94384,
    KTS_TO_MPS: 0.514444,
    RAD_TO_DEG: 180 / Math.PI,
    DEG_TO_RAD: Math.PI / 180,
    PA_TO_KPA: 0.001,
    G_ACCEL: 9.80665
};

export const SIM_CONFIG = {
    currentLang: 'zh',
    currentLevel: 'advanced',
    currentWeather: 'day',
    currentAeroModel: 'crm', // 'crm' | 'naca'

    // 飛機基準參數
    AIRCRAFT: {
        MASS: 75000,
        WING_AREA: 129.15,
        WING_SPAN: 35.8,
        CHORD: 4.1,
        MAX_THRUST: 260000,
        STALL_SPEED_IAS: 135,
        VMO_MAX_IAS: 350,
        MMO_MAX_MACH: 0.85
    },

    // 推進發動機配置
    ENGINE: {
        MAX_THRUST_SL: 130000,
        IDLE_N1: 20.0,
        MAX_N1: 100.0,
        IDLE_N2: 58.0,
        MAX_N2: 99.5,
        TAU_ACCEL_N1: 2.4,
        TAU_DECEL_N1: 1.8,
        TAU_ACCEL_N2: 1.6,
        TAU_DECEL_N2: 1.2
    },

    // 飛控與自動駕駛 PID
    AUTOPILOT: {
        BASE_ALT_KP: 0.0035,
        BASE_ALT_KI: 0.00005,
        BASE_ALT_KD: 0.008,
        BASE_HDG_KP: 0.025,
        BASE_HDG_KI: 0.0001,
        BASE_HDG_KD: 0.05,
        BASE_SPD_KP: 0.015,
        BASE_SPD_KI: 0.0008,
        BASE_SPD_KD: 0.005,
        PITCH_LIMIT_MAX: 25,
        PITCH_LIMIT_MIN: -20,
        ROLL_LIMIT: 30,
        MANUAL_DEADZONE: 0.05,
        MAX_BANK_ANGLE: 30,
        MAX_PITCH_ANGLE: 20
    },

    // 飛行管理系統 (FMS & VNAV)
    FMS: {
        SPEED_ON_PITCH_GAIN: 0.012,
        DESCENT_ANGLE_DEG: 3.0,
        CAPTURE_ZONE_FT: 500,
        SPD_LIMIT_ALT: 10000,
        SPD_LIMIT_BELOW_10K: 250,
        BASE_IDLE_THROTTLE: 0.05,
        CLIMB_THROTTLE: 0.90
    },

    // 儀表與 HUD
    HUD: {
        VDI_FILTER_ALPHA: 0.15,
        VDI_MAX_DEV_FT: 1000
    }
};

export const I18N = {
    zh: {
        title: "J.A.R. 衝上雲霄 Pro",
        subtitle: "PWA 飛行模擬器",
        startBtn: "進入駕駛艙 / 啟動引擎",
        langBtn: "English",
        modeLabel: "模擬級別",
        weatherLabel: "天氣環境",
        throttle: "油門",
        rudderL: "◀",
        rudderR: "▶",
        brakes: "BRK",
        modes: { junior: "學員 / 兒童", advanced: "進階飛手", captain: "機長 / 專業" },
        weather: { day: "晴空 (日間)", sunset: "黃昏日落", night: "夜間儀表", storm: "暴風雨" }
    },
    en: {
        title: "J.A.R. Skybound Pro",
        subtitle: "PWA Flight Simulator",
        startBtn: "ENTER COCKPIT / START ENGINE",
        langBtn: "中文",
        modeLabel: "SIM LEVEL",
        weatherLabel: "ENVIRONMENT",
        throttle: "THROTTLE",
        rudderL: "◀",
        rudderR: "▶",
        brakes: "BRK",
        modes: { junior: "Cadet / Easy", advanced: "Advanced", captain: "Captain / Pro" },
        weather: { day: "Day Clear", sunset: "Sunset", night: "Night IFR", storm: "Storm" }
    }
};
