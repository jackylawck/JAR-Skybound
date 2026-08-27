// ============================================================
// config.js - 全域靜態配置、單位制管理與多語言字典 v3.3
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

    // 發動機推進配置 (可選裝/微調)
    ENGINE: {
        MAX_THRUST_SL: 130000, // 單發海平面推力 (N)
        IDLE_N1: 20.0,
        MAX_N1: 100.0,
        IDLE_N2: 58.0,
        MAX_N2: 99.5,
        TAU_ACCEL_N1: 2.4,     // N1 加速時間常數 (s)
        TAU_DECEL_N1: 1.8,     // N1 減速時間常數 (s)
        TAU_ACCEL_N2: 1.6,
        TAU_DECEL_N2: 1.2
    },

    // 飛控與自動駕駛
    AUTOPILOT: {
        MANUAL_DEADZONE: 0.05,
        MAX_BANK_ANGLE: 30,
        MAX_PITCH_ANGLE: 20
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
