// ============================================================
// fms.js - J.A.R. Skybound Pro 飛行管理系統 (FMS & VNAV)
// ============================================================

import { SIM_CONFIG } from './config.js';

class Waypoint {
    constructor(id, x, y, altConstraint = 10000, spdConstraint = 250) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.altConstraint = altConstraint;
        this.spdConstraint = spdConstraint;
    }
}

export class FMS {
    constructor() {
        this.flightPlan = [
            new Waypoint('JAR-ARP', 0, 0, 1500, 160),
            new Waypoint('DEP09', 5000, 20000, 6000, 220),
            new Waypoint('CRZ-CR', 35000, 90000, 28000, 280),
            new Waypoint('TOD-PT', 55000, 120000, 28000, 280),
            new Waypoint('DECEL', 68000, 140000, 10000, 250),
            new Waypoint('ARR12', 85000, 165000, 3000, 180)
        ];

        this.currentLegIndex = -1;
        // 防禦性讀取：若 SIM_CONFIG.FMS 不存在則自動回退為 3.0 度
        const descentAngle = (SIM_CONFIG && SIM_CONFIG.FMS && SIM_CONFIG.FMS.DESCENT_ANGLE_DEG !== undefined) 
            ? SIM_CONFIG.FMS.DESCENT_ANGLE_DEG 
            : 3.0;
        this.DESC_GRAD = Math.tan(descentAngle * Math.PI / 180);
    }

    findNearestWaypointIndex(s) {
        let nearestIdx = 1;
        let minDist = Infinity;
        for (let i = 1; i < this.flightPlan.length; i++) {
            const dx = this.flightPlan[i].x - (s.x || 0);
            const dy = this.flightPlan[i].y - (s.y || 0);
            const dist = Math.hypot(dx, dy);
            if (dist < minDist) {
                minDist = dist;
                nearestIdx = i;
            }
        }
        return nearestIdx;
    }

    toggleLNAV(s) {
        if (this.currentLegIndex === -1) {
            this.currentLegIndex = this.findNearestWaypointIndex(s);
            return true;
        } else {
            this.currentLegIndex = -1;
            return false;
        }
    }

    update(s) {
        if (this.currentLegIndex === -1 || !s || s.x === undefined) return null;

        const currentWpt = this.flightPlan[this.currentLegIndex];
        const dx = currentWpt.x - s.x;
        const dy = currentWpt.y - s.y;
        const distToWpt = Math.hypot(dx, dy);

        // 1. 轉彎提前量 (Lead Turn)
        const speedMps = (s.speed || 250) * 0.514444;
        const dynamicCaptureDist = Math.max(1500, speedMps * 15);

        if (distToWpt < dynamicCaptureDist) {
            if (this.currentLegIndex < this.flightPlan.length - 1) {
                this.currentLegIndex++;
            } else {
                this.currentLegIndex = -1;
                return { mode: 'FMS', done: true };
            }
        }

        // 2. LNAV 航向指令
        const targetRadial = Math.atan2(dx, dy) * 180 / Math.PI;
        const targetHeading = (targetRadial + 360) % 360;

        // 3. VNAV 垂直剖面計算
        const activeWpt = this.flightPlan[this.currentLegIndex];
        const distFt = distToWpt * 3.28084;
        const targetWptAlt = activeWpt.altConstraint;
        const altDelta = targetWptAlt - s.altitude;

        const captureZone = SIM_CONFIG?.FMS?.CAPTURE_ZONE_FT ?? 500;
        const spdLimitAlt = SIM_CONFIG?.FMS?.SPD_LIMIT_ALT ?? 10000;
        const spdLimit10k = SIM_CONFIG?.FMS?.SPD_LIMIT_BELOW_10K ?? 250;

        let verticalPhase = 'CRUISE';
        let vnavAltCmd = s.altitude;
        let vnavSpdCmd = activeWpt.spdConstraint;
        let verticalDeviation = 0;

        if (altDelta > 800) {
            verticalPhase = 'CLIMB';
            vnavAltCmd = targetWptAlt;
            vnavSpdCmd = activeWpt.spdConstraint;
            verticalDeviation = 0;
        } else if (altDelta < -800) {
            verticalPhase = 'DESCENT';
            const idealPathAlt = targetWptAlt + (distFt * this.DESC_GRAD);
            verticalDeviation = s.altitude - idealPathAlt;

            if (s.altitude < idealPathAlt - captureZone) {
                vnavAltCmd = s.altitude;
            } else {
                vnavAltCmd = idealPathAlt;
            }

            if (s.altitude <= spdLimitAlt) {
                vnavSpdCmd = Math.min(spdLimit10k, activeWpt.spdConstraint);
            } else {
                vnavSpdCmd = activeWpt.spdConstraint;
            }
        } else {
            verticalPhase = 'CRUISE';
            vnavAltCmd = targetWptAlt;
            vnavSpdCmd = (s.altitude <= spdLimitAlt) ? Math.min(spdLimit10k, activeWpt.spdConstraint) : activeWpt.spdConstraint;
            verticalDeviation = s.altitude - targetWptAlt;
        }

        return {
            mode: 'FMS',
            heading_cmd: targetHeading,
            distance: distToWpt,
            activeWaypointId: activeWpt.id,
            vnav_alt_cmd: vnavAltCmd,
            vnav_spd_cmd: vnavSpdCmd,
            vertical_phase: verticalPhase,
            vdi_deviation: verticalDeviation
        };
    }
}
