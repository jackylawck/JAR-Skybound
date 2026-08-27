// ============================================================
// config.js - J.A.R. Skybound Pro 全域性能與調諧參數表
// ============================================================

export const SIM_CONFIG = {
    // 飛機幾何與氣動基準 (SkyLiner-9 / 類 C919 級別)
    AIRCRAFT: {
        MASS: 75000,          // 最大起飛重量 (kg)
        WING_AREA: 129.15,    // 機翼面積 (m²)
        WING_SPAN: 35.8,      // 翼展 (m)
        CHORD: 4.1,           // 平均氣動弦長 (m)
        MAX_THRUST: 260000,   // 雙發總推力 (N)
        STALL_SPEED_IAS: 135, // 失速空速 (kts)
        VMO_MAX_IAS: 350,     // 最大操作空速 (kts)
        MMO_MAX_MACH: 0.85    // 最大操作馬赫數 (Mach)
    },

    // 飛控 (FBW & Autopilot) 增益與保護限制
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
        
        // 姿態保護限制
        PITCH_LIMIT_MAX: 25,  // 最大俯仰角 (deg)
        PITCH_LIMIT_MIN: -20, // 最小俯仰角 (deg)
        ROLL_LIMIT: 30,       // 最大滾轉角 (deg)
        
        // CWS 人工優先死區與延遲
        MANUAL_DEADZONE: 0.1,
        DISCONNECT_DELAY_SEC: 0.15
    },

    // 飛行管理系統 (FMS & VNAV)
    FMS: {
        SPEED_ON_PITCH_GAIN: 0.012, // 俯仰控速增益
        DESCENT_ANGLE_DEG: 3.0,     // 標準下滑角 (deg)
        CAPTURE_ZONE_FT: 500,       // 垂直截獲區間 ±500ft
        SPD_LIMIT_ALT: 10000,       // 10,000 ft
        SPD_LIMIT_BELOW_10K: 250,   // 250 kts 限速
        BASE_IDLE_THROTTLE: 0.05,   // 海平面基準慢車推力
        CLIMB_THROTTLE: 0.90        // 額定爬升推力
    },

    // 儀表與 HUD
    HUD: {
        VDI_FILTER_ALPHA: 0.15,     // 低通濾波指數係數 (0~1)
        VDI_MAX_DEV_FT: 1000        // 最大顯示偏離 ±1000ft
    }
};
