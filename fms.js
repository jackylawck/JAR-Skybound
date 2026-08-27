// ============================================================
// fms.js - J.A.R. Skybound Pro FMS v1.3 (LNAV & VNAV 剖面計算)
// ============================================================

import { SIM_CONFIG } from './config.js';

class Waypoint {
    constructor(id, x, y, altConstraint = 10000, spdConstraint = 250) {
        this.id = id;
        this.x = x; // 地軸米 (East)
        this.y = y; // 地軸米 (North)
        this.altConstraint = altConstraint; // 目標高度 (ft)
        this.spdConstraint = spdConstraint; // 目標空速 (kts)
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
        this.DESC_GRAD = Math.tan(SIM_CONFIG.FMS.DESCENT_ANGLE_DEG * Math.PI / 180);
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

        // 1. 動態航點切換與轉彎提前量 (Lead Turn)
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

        // 2. LNAV 航向計算
        const targetRadial = Math.atan2(dx, dy) * 180 / Math.PI;
        const targetHeading = (targetRadial + 360) % 360;

        // 3. VNAV 垂直剖面計算
        const activeWpt = this.flightPlan[this.currentLegIndex];
        const distFt = distToWpt * 3.28084;
        const targetWptAlt = activeWpt.altConstraint;
        const altDelta = targetWptAlt - s.altitude;

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

            if (s.altitude < idealPathAlt - SIM_CONFIG.FMS.CAPTURE_ZONE_FT) {
                vnavAltCmd = s.altitude; // 平飛等待截獲
            } else {
                vnavAltCmd = idealPathAlt; // 沿 3° 剖面下降
            }

            if (s.altitude <= SIM_CONFIG.FMS.SPD_LIMIT_ALT) {
                vnavSpdCmd = Math.min(SIM_CONFIG.FMS.SPD_LIMIT_BELOW_10K, activeWpt.spdConstraint);
            } else {
                vnavSpdCmd = activeWpt.spdConstraint;
            }
        } else {
            verticalPhase = 'CRUISE';
            vnavAltCmd = targetWptAlt;
            vnavSpdCmd = (s.altitude <= SIM_CONFIG.FMS.SPD_LIMIT_ALT) ?
                Math.min(SIM_CONFIG.FMS.SPD_LIMIT_BELOW_10K, activeWpt.spdConstraint) : activeWpt.spdConstraint;
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
