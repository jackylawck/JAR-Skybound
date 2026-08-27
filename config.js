// ============================================================
// config.js - 全域配置與 100% 雙語字典 v3.6.9
// ============================================================

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
    currentLevel: 'junior',
    currentWeather: 'day',
    currentAeroModel: 'crm',

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

    ENGINE: {
        MAX_THRUST_SL: 130000,
        IDLE_N1: 20.0,
        MAX_N1: 100.0,
        IDLE_N2: 58.0,
        MAX_N2: 99.5
    },

    AUTOPILOT: {
        BASE_ALT_KP: 0.005,
        BASE_ALT_KI: 0.00008,
        BASE_ALT_KD: 0.012,
        BASE_HDG_KP: 0.03,
        BASE_HDG_KI: 0.0001,
        BASE_HDG_KD: 0.06,
        BASE_SPD_KP: 0.02,
        BASE_SPD_KI: 0.001,
        BASE_SPD_KD: 0.006,
        PITCH_LIMIT_MAX: 20,
        PITCH_LIMIT_MIN: -15,
        ROLL_LIMIT: 25,
        MANUAL_DEADZONE: 0.05
    },

    HUD: {
        VDI_FILTER_ALPHA: 0.15
    }
};

export const I18N = {
    zh: {
        title: "J.A.R. 衝上雲霄",
        subtitle: "PWA 飛行模擬器",
        startBtn: "進入駕駛艙 / 啟動引擎",
        langBtn: "English",
        modeLabel: "模擬級別",
        weatherLabel: "天氣環境",
        throttle: "油門",
        rudderL: "◀",
        rudderR: "▶",
        brakes: "BRK",
        menuBtn: "📊 儀表 / 故障 ▼",
        menuReturn: "選單",
        eicasTitle: "發動機與燃油 (EICAS)",
        eng1Lbl: "左發 1 (L)",
        eng2Lbl: "右發 2 (R)",
        fdrBtn: "📥 導出 FDR 黑匣子 (CSV)",
        fault1: "⚠️ 左發停車 (ENG 1 FAIL)",
        fault2: "⚠️ 右發停車 (ENG 2 FAIL)",
        crashTitle: "⚠️ 飛機墜毀 (CRASH)",
        crashDesc: "客機以過大下沉率或姿態接地損毀。",
        crashSpd: "觸地空速:",
        crashVs: "垂直下沉率:",
        respawnBtn: "🔄 重新起飛 (RESPAWN)",
        modes: { junior: "學員", advanced: "進階", captain: "機長" },
        weather: { day: "晴空", sunset: "黃昏", night: "夜間", storm: "暴風雨" }
    },
    en: {
        title: "J.A.R. Skybound",
        subtitle: "PWA Flight Simulator",
        startBtn: "ENTER COCKPIT / START ENGINES",
        langBtn: "中文",
        modeLabel: "SIM LEVEL",
        weatherLabel: "ENVIRONMENT",
        throttle: "THR",
        rudderL: "◀",
        rudderR: "▶",
        brakes: "BRK",
        menuBtn: "📊 AVIONICS / IOS ▼",
        menuReturn: "MENU",
        eicasTitle: "ENGINE & FUEL (EICAS)",
        eng1Lbl: "ENG 1 (L)",
        eng2Lbl: "ENG 2 (R)",
        fdrBtn: "📥 EXPORT FDR (CSV)",
        fault1: "⚠️ ENG 1 FAIL",
        fault2: "⚠️ ENG 2 FAIL",
        crashTitle: "⚠️ CRASH DETECTED",
        crashDesc: "Aircraft touched down with excessive sink rate or attitude.",
        crashSpd: "Impact Speed:",
        crashVs: "Vertical Speed:",
        respawnBtn: "🔄 RESTART FLIGHT",
        modes: { junior: "Cadet", advanced: "Advanced", captain: "Captain" },
        weather: { day: "Day Clear", sunset: "Sunset", night: "Night IFR", storm: "Storm" }
    }
};
