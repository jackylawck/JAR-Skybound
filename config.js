// ============================================================
// config.js - 全域設定、三級難度、環境與雙語字典
// ============================================================

export const I18N = {
    zh: {
        title: "J.A.R. 衝上雲霄 Pro",
        subtitle: "科研級 Web 飛行模擬認證平台",
        startBtn: "進入駕駛艙 / 啟動引擎",
        modeLabel: "模擬級別",
        modes: { junior: "學員 / 兒童", advanced: "進階飛手", captain: "機長 / 科研" },
        weatherLabel: "天氣環境",
        weather: { day: "晴空萬里 (日間)", sunset: "黃昏日落", night: "夜間儀表 (夜航)", storm: "暴風雨 / 側風" },
        langBtn: "English",
        throttle: "油門",
        brakes: "剎車",
        flaps: "襟翼",
        gear: "起落架",
        rudderL: "◀ 舵",
        rudderR: "舵 ▶",
        stall: "失速警告",
        flutter: "氣動顫振",
        pullUp: "拉升警告 (PULL UP)"
    },
    en: {
        title: "J.A.R. Skybound Pro",
        subtitle: "Scientific-Grade Web Flight Simulation Platform",
        startBtn: "ENTER COCKPIT / START ENGINES",
        modeLabel: "Flight Level",
        modes: { junior: "Junior / Cadet", advanced: "Advanced", captain: "Captain / Pro" },
        weatherLabel: "Environment",
        weather: { day: "Clear Sky (Day)", sunset: "Sunset Twilight", night: "Night Flight (IFR)", storm: "Storm / Crosswind" },
        langBtn: "繁體中文",
        throttle: "THR",
        brakes: "BRK",
        flaps: "FLAPS",
        gear: "GEAR",
        rudderL: "◀ RUD",
        rudderR: "RUD ▶",
        stall: "STALL WARNING",
        flutter: "FLUTTER RISK",
        pullUp: "PULL UP"
    }
};

export const SIM_CONFIG = {
    currentLang: 'zh',
    currentLevel: 'advanced', // junior | advanced | captain
    currentWeather: 'day',    // day | sunset | night | storm

    LEVELS: {
        junior: {
            name: "Junior",
            stabilityAssist: 0.95,   // 自動姿態扶正
            stallProtection: true,   // 強制防失速
            windMultiplier: 0.0,     // 無側風無湍流
            liftBoost: 1.3           // 額外升力充裕
        },
        advanced: {
            name: "Advanced",
            stabilityAssist: 0.3,
            stallProtection: false,
            windMultiplier: 0.5,
            liftBoost: 1.0
        },
        captain: {
            name: "Captain",
            stabilityAssist: 0.0,    // 全手動純物理
            stallProtection: false,
            windMultiplier: 1.2,     // 強側風與亂流
            liftBoost: 1.0
        }
    },

    AIRCRAFT: {
        MASS: 75000,
        WING_AREA: 129.15,
        WING_SPAN: 35.8,
        CHORD: 4.1,
        MAX_THRUST: 260000,
        STALL_SPEED_IAS: 135,
        VMO_MAX_IAS: 350
    },

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
        MANUAL_DEADZONE: 0.08
    },

    FMS: {
        SPEED_ON_PITCH_GAIN: 0.012,
        DESCENT_ANGLE_DEG: 3.0,
        CAPTURE_ZONE_FT: 500,
        SPD_LIMIT_ALT: 10000,
        SPD_LIMIT_BELOW_10K: 250,
        BASE_IDLE_THROTTLE: 0.05,
        CLIMB_THROTTLE: 0.90
    },

    HUD: {
        VDI_FILTER_ALPHA: 0.15,
        VDI_MAX_DEV_FT: 1000
    }
};
