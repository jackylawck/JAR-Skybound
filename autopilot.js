// ============================================================
// autopilot.js - J.A.R. Skybound Pro 飛控系統 v2.6
// PID 控制器 | Gain Scheduling | Speed-on-Pitch | 密度補償慢車 | FBW 保護
// ============================================================

import { SIM_CONFIG } from './config.js';

class PIDController {
    constructor(kp, ki, kd, minOut, maxOut) {
        this.baseKp = kp; this.kp = kp;
        this.baseKi = ki; this.ki = ki;
        this.baseKd = kd; this.kd = kd;
        this.minOut = minOut; this.maxOut = maxOut;
        this.integral = 0; this.prevError = 0;
    }

    update(target, current, dt) {
        if (dt <= 0) return 0;
        const error = target - current;
        this.integral += error * dt;
        const derivative = (error - this.prevError) / dt;
        this.prevError = error;

        let output = (this.kp * error) + (this.ki * this.integral) + (this.kd * derivative);
        if (output > this.maxOut) {
            output = this.maxOut;
            this.integral -= error * dt;
        } else if (output < this.minOut) {
            output = this.minOut;
            this.integral -= error * dt;
        }
        return output;
    }

    reset() { this.integral = 0; this.prevError = 0; }
}

export class Autopilot {
    constructor() {
        this.modes = {
            AP_MASTER: false,
            ALT_HOLD: false,
            HDG_HOLD: false,
            SPD_HOLD: false,
            LNAV: false,
            VNAV: false
        };
        this.targets = { altitude: 10000, heading: 360, speed: 250 };

        const apCfg = SIM_CONFIG.AUTOPILOT;
        this.pidAlt = new PIDController(apCfg.BASE_ALT_KP, apCfg.BASE_ALT_KI, apCfg.BASE_ALT_KD, -0.4, 0.4);
        this.pidHdg = new PIDController(apCfg.BASE_HDG_KP, apCfg.BASE_HDG_KI, apCfg.BASE_HDG_KD, -0.4, 0.4);
        this.pidSpd = new PIDController(apCfg.BASE_SPD_KP, apCfg.BASE_SPD_KI, apCfg.BASE_SPD_KD, 0.0, 1.0);

        this.speakGPWS = null;
    }

    setVoiceCallback(callback) { this.speakGPWS = callback; }

    setTarget(type, value) {
        if (type === 'HDG') {
            this.targets.heading = ((value % 360) + 360) % 360;
            if (this.modes.LNAV) {
                this.modes.LNAV = false;
                this.modes.HDG_HOLD = true;
                if (this.speakGPWS) this.speakGPWS("LNAV DISCONNECT");
            }
        }
        if (type === 'ALT') {
            this.targets.altitude = Math.max(0, Math.min(45000, value));
            if (this.modes.VNAV) {
                this.modes.VNAV = false;
                this.modes.ALT_HOLD = true;
                if (this.speakGPWS) this.speakGPWS("VNAV DISCONNECT");
            }
        }
        if (type === 'SPD') {
            this.targets.speed = Math.max(100, Math.min(350, value));
            if (this.modes.VNAV) {
                this.modes.VNAV = false;
                this.modes.SPD_HOLD = true;
                if (this.speakGPWS) this.speakGPWS("VNAV DISCONNECT");
            }
        }
    }

    toggleMode(mode, s) {
        if (mode === 'AP_MASTER') {
            this.modes.AP_MASTER = !this.modes.AP_MASTER;
            if (this.modes.AP_MASTER) {
                this.resetAll();
                this.modes.ALT_HOLD = true;
                this.modes.HDG_HOLD = true;
                this.modes.SPD_HOLD = true;
                this.modes.LNAV = false;
                this.modes.VNAV = false;
                if (s && s.altitude && this.pidAlt.ki > 0.000001) {
                    this.pidAlt.integral = (this.targets.altitude - s.altitude) / this.pidAlt.ki;
                }
                if (this.speakGPWS) this.speakGPWS("A P ENGAGED");
            } else {
                this.resetAll();
                if (this.speakGPWS) this.speakGPWS("A P DISCONNECT");
            }
        } else if (mode === 'LNAV') {
            this.modes.LNAV = !this.modes.LNAV;
            if (this.modes.LNAV) {
                this.modes.HDG_HOLD = false;
                if (this.speakGPWS) this.speakGPWS("LNAV ARMED");
            } else {
                this.modes.HDG_HOLD = true;
            }
        } else if (mode === 'VNAV') {
            this.modes.VNAV = !this.modes.VNAV;
            if (this.modes.VNAV) {
                this.modes.ALT_HOLD = false;
                this.modes.SPD_HOLD = false;
                if (this.speakGPWS) this.speakGPWS("VNAV ARMED");
            } else {
                this.modes.ALT_HOLD = true;
                this.modes.SPD_HOLD = true;
                this.targets.altitude = s ? s.altitude : this.targets.altitude;
                this.targets.speed = s ? s.speed : this.targets.speed;
                if (this.speakGPWS) this.speakGPWS("VNAV OFF");
            }
        } else if (mode === 'HDG_HOLD') {
            this.modes.HDG_HOLD = !this.modes.HDG_HOLD;
            if (this.modes.HDG_HOLD) this.modes.LNAV = false;
        } else if (mode === 'ALT_HOLD') {
            this.modes.ALT_HOLD = !this.modes.ALT_HOLD;
            if (this.modes.ALT_HOLD) this.modes.VNAV = false;
        } else if (mode === 'SPD_HOLD') {
            this.modes.SPD_HOLD = !this.modes.SPD_HOLD;
            if (this.modes.SPD_HOLD) this.modes.VNAV = false;
        }
    }

    update(s, fms_cmd, dt) {
        if (!this.modes.AP_MASTER || !s.altitude || isNaN(s.speed)) return null;

        const cmds = {};
        const apCfg = SIM_CONFIG.AUTOPILOT;
        const fmsCfg = SIM_CONFIG.FMS;

        // 1. 動壓增益調諧 (Gain Scheduling)
        const currentVT = s.speed / 1.94384;
        const density = s.density || 1.225;
        const qbar = 0.5 * density * currentVT * currentVT;
        const qbarRef = 0.5 * 1.225 * Math.pow(250 / 1.94384, 2);
        const gainScale = Math.min(2.0, Math.max(0.5, qbarRef / qbar));

        this.pidAlt.kp = apCfg.BASE_ALT_KP * gainScale;
        this.pidAlt.kd = apCfg.BASE_ALT_KD * gainScale;
        this.pidHdg.kp = apCfg.BASE_HDG_KP * gainScale * 0.9;
        this.pidHdg.kd = apCfg.BASE_HDG_KD * gainScale * 0.9;

        // 2. 橫向導航 (LNAV / HDG)
        if (this.modes.HDG_HOLD || this.modes.LNAV) {
            let targetHdg = (this.modes.LNAV && fms_cmd) ? fms_cmd.heading_cmd : this.targets.heading;
            let hdgDiff = targetHdg - s.heading;
            if (hdgDiff > 180) hdgDiff -= 360;
            if (hdgDiff < -180) hdgDiff += 360;
            cmds.aileron = this.pidHdg.update(0, -hdgDiff, dt);
        }

        // 3. 垂直導航與能量管理 (VNAV)
        if (this.modes.VNAV && fms_cmd) {
            const targetAlt = fms_cmd.vnav_alt_cmd;
            const targetSpd = fms_cmd.vnav_spd_cmd;

            if (fms_cmd.vertical_phase === 'DESCENT') {
                // 密度補償慢車推力
                const altitudeComp = Math.max(0.04, fmsCfg.BASE_IDLE_THROTTLE * (1.225 / density) * 0.85);
                cmds.throttle = Math.min(0.12, altitudeComp);

                let pitchCmd = this.pidAlt.update(targetAlt, s.altitude, dt);
                const spdErr = targetSpd - s.speed;
                cmds.elevator = pitchCmd + (spdErr * fmsCfg.SPEED_ON_PITCH_GAIN);

                // 失速底線保護
                if (s.speed < SIM_CONFIG.AIRCRAFT.STALL_SPEED_IAS + 5) {
                    cmds.throttle = 0.85;
                    cmds.elevator = Math.min(cmds.elevator, -0.05);
                }
            } else if (fms_cmd.vertical_phase === 'CLIMB') {
                cmds.throttle = fmsCfg.CLIMB_THROTTLE;
                cmds.elevator = this.pidAlt.update(targetAlt, s.altitude, dt);
            } else {
                cmds.throttle = this.pidSpd.update(targetSpd, s.speed, dt);
                cmds.elevator = this.pidAlt.update(targetAlt, s.altitude, dt);
            }
        } else {
            if (this.modes.ALT_HOLD) cmds.elevator = this.pidAlt.update(this.targets.altitude, s.altitude, dt);
            if (this.modes.SPD_HOLD) cmds.throttle = this.pidSpd.update(this.targets.speed, s.speed, dt);
        }

        // 4. FBW 姿態限制硬保護
        if (s.pitch > apCfg.PITCH_LIMIT_MAX) cmds.elevator = Math.min(cmds.elevator, -0.05);
        if (s.pitch < apCfg.PITCH_LIMIT_MIN) cmds.elevator = Math.max(cmds.elevator, 0.05);
        if (Math.abs(s.roll) > apCfg.ROLL_LIMIT) cmds.aileron = 0;

        cmds.elevator += -0.08 * (s.qRate || 0);
        cmds.aileron += -0.04 * (s.pRate || 0);

        return cmds;
    }

    resetAll() {
        this.pidAlt.reset();
        this.pidHdg.reset();
        this.pidSpd.reset();
        this.modes.LNAV = false;
        this.modes.VNAV = false;
    }
}
