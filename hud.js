// ============================================================
// hud.js - J.A.R. Skybound Pro Canvas 2D HUD v2.6
// ADI 姿態球 | 速度帶 | 高度帶 | 航向帶 | FPM 向量 | VDI 垂直偏離尺
// ============================================================

import { SIM_CONFIG } from './config.js';

export class HUD {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        window.addEventListener('resize', () => this.resize());

        this.data = {
            speed: 0, altitude: 0, mach: 0, aoa: 0, gForce: 1,
            pitch: 0, roll: 0, heading: 0, alpha: 0, beta: 0
        };

        this.filteredVdiDev = 0;
    }

    resize() {
        const rect = this.canvas.parentElement.getBoundingClientRect();
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        this.ctx.scale(dpr, dpr);
        this.width = rect.width;
        this.height = rect.height;
    }

    update(data) {
        Object.assign(this.data, data);

        if (data.vdi_deviation !== undefined) {
            const alpha = SIM_CONFIG.HUD.VDI_FILTER_ALPHA;
            this.filteredVdiDev += alpha * (data.vdi_deviation - this.filteredVdiDev);
        } else {
            this.filteredVdiDev = 0;
        }

        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const W = this.width, H = this.height;
        ctx.clearRect(0, 0, W, H);

        const cx = W / 2, cy = H / 2 - 20;
        const radius = Math.min(W, H) * 0.2;

        this.drawADI(ctx, cx, cy, radius);
        this.drawTape(ctx, 'left', 50, H * 0.2, 60, H * 0.6, this.data.speed, 0, 1000, 'SPD', 'kt');
        this.drawTape(ctx, 'right', W - 110, H * 0.2, 60, H * 0.6, this.data.altitude, 0, 60000, 'ALT', 'ft');
        this.drawHeadingTape(ctx, W * 0.25, 40, W * 0.5, 40, this.data.heading);

        if (this.data.alpha !== undefined && this.data.beta !== undefined) {
            this.drawFPM(ctx, cx, cy, this.data.alpha, this.data.beta);
        }

        if (this.data.vnav_active) {
            this.drawVDI(ctx, W - 145, H * 0.5, 120, this.filteredVdiDev);
        }

        this.drawFmsNavData(ctx, W * 0.5, 100);
        this.drawStatus(ctx, W / 2, H - 30);

        if (this.data.aoa > 17) this.drawWarning(ctx, W / 2, H * 0.12, 'STALL', '#ff3333');
        if (this.data.mach > 0.85) this.drawWarning(ctx, W / 2, H * 0.18, 'FLUTTER', '#ff3333');
    }

    drawADI(ctx, cx, cy, r) {
        const { pitch, roll } = this.data;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-roll * Math.PI / 180);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 2;
        ctx.stroke();

        const maxPitch = 30;
        const yScale = r / maxPitch * 0.8;
        for (let deg = -30; deg <= 30; deg += 5) {
            const y = deg * yScale;
            ctx.beginPath();
            if (deg === 0) {
                ctx.moveTo(-r * 0.4, y);
                ctx.lineTo(r * 0.4, y);
                ctx.lineWidth = 2;
            } else {
                const len = (deg % 10 === 0) ? r * 0.2 : r * 0.1;
                ctx.moveTo(-len, y);
                ctx.lineTo(len, y);
                ctx.lineWidth = 1;
            }
            ctx.strokeStyle = '#00ff00';
            ctx.stroke();

            if (deg % 10 === 0 && deg !== 0) {
                ctx.fillStyle = '#00ff00';
                ctx.font = '11px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(Math.abs(deg) + '°', -r * 0.45, y + 4);
                ctx.textAlign = 'left';
                ctx.fillText(Math.abs(deg) + '°', r * 0.45, y + 4);
            }
        }

        ctx.rotate(roll * Math.PI / 180);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.25);
        ctx.lineTo(-r * 0.15, r * 0.15);
        ctx.lineTo(0, r * 0.05);
        ctx.lineTo(r * 0.15, r * 0.15);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(0, 0, 4, 0, 2 * Math.PI);
        ctx.fill();

        ctx.restore();
    }

    drawTape(ctx, side, x, y, w, h, value, min, max, label, unit) {
        ctx.save();
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#00ff00';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y - 10);

        const range = 200;
        const startVal = Math.floor((value - range / 2) / 10) * 10;
        const endVal = startVal + range;

        for (let v = startVal; v <= endVal; v += 10) {
            if (v < min || v > max) continue;
            const normY = y + h * (1 - (v - (value - range / 2)) / range);
            if (normY < y || normY > y + h) continue;

            const major = (v % 50 === 0);
            const len = major ? 12 : 6;
            ctx.beginPath();
            ctx.moveTo(side === 'left' ? x + w - len : x, normY);
            ctx.lineTo(side === 'left' ? x + w : x + len, normY);
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ff00';
                ctx.textAlign = (side === 'left') ? 'right' : 'left';
                ctx.fillText(v + (unit ? '' : ''), side === 'left' ? x - 6 : x + w + 6, normY + 4);
            }
        }

        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;
        ctx.fillRect(x - 2, y + h / 2 - 12, w + 4, 24);
        ctx.strokeRect(x - 2, y + h / 2 - 12, w + 4, 24);

        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 15px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(value), x + w / 2, y + h / 2 + 5);

        ctx.restore();
    }

    drawHeadingTape(ctx, x, y, w, h, heading) {
        ctx.save();
        ctx.strokeStyle = '#00ff00';
        ctx.strokeRect(x, y, w, h);

        const visibleDeg = 60;
        const start = heading - visibleDeg / 2;
        const end = heading + visibleDeg / 2;
        const scale = w / visibleDeg;

        for (let deg = Math.ceil(start / 5) * 5; deg <= end; deg += 5) {
            const degNorm = ((deg % 360) + 360) % 360;
            const posX = x + (deg - start) * scale;
            if (posX < x || posX > x + w) continue;

            const major = (degNorm % 10 === 0);
            ctx.beginPath();
            ctx.moveTo(posX, y + h - (major ? 12 : 6));
            ctx.lineTo(posX, y + h);
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ff00';
                ctx.font = '11px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(degNorm.toString().padStart(3, '0'), posX, y + 14);
            }
        }

        ctx.fillStyle = '#ffff00';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼', x + w / 2, y + h + 14);

        ctx.restore();
    }

    drawFPM(ctx, cx, cy, alpha, beta) {
        const scale = 5;
        const dx = -beta * scale;
        const dy = alpha * scale;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.arc(dx, dy, 10, 0, 2 * Math.PI);
        ctx.moveTo(dx - 18, dy); ctx.lineTo(dx - 10, dy);
        ctx.moveTo(dx + 10, dy); ctx.lineTo(dx + 18, dy);
        ctx.moveTo(dx, dy - 18); ctx.lineTo(dx, dy - 10);
        ctx.stroke();

        ctx.restore();
    }

    drawVDI(ctx, x, y, h, deviationFt) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 1;

        const maxDev = SIM_CONFIG.HUD.VDI_MAX_DEV_FT;
        const scale = (h / 2) / maxDev;
        const clampedDev = Math.max(-maxDev, Math.min(maxDev, deviationFt));
        const diamondY = y - (clampedDev * scale);

        [-500, 0, 500].forEach(dev => {
            const dotY = y - (dev * scale);
            ctx.beginPath();
            ctx.arc(x, dotY, 2, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.fillStyle = '#ff00ff';
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(x, diamondY - 7);
        ctx.lineTo(x + 7, diamondY);
        ctx.lineTo(x, diamondY + 7);
        ctx.lineTo(x - 7, diamondY);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.font = '10px monospace';
        ctx.textAlign = 'right';
        ctx.fillStyle = '#ff00ff';
        ctx.fillText('VDI (FT)', x - 12, y + 3);

        ctx.restore();
    }

    drawFmsNavData(ctx, x, y) {
        if (!this.data.activeWaypoint) return;
        ctx.save();
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';

        const distNm = ((this.data.waypointDistance || 0) * 0.000539957).toFixed(1);
        const text = `WPT: ${this.data.activeWaypoint} | DIST: ${distNm} NM | VNAV: ${this.data.vnav_phase || 'OFF'}`;
        ctx.fillText(text, x, y);
        ctx.restore();
    }

    drawStatus(ctx, x, y) {
        ctx.save();
        ctx.fillStyle = '#00ff00';
        ctx.font = '12px monospace';
        ctx.textAlign = 'center';
        const info = `SPD ${Math.round(this.data.speed)}kt  ALT ${Math.round(this.data.altitude)}ft  M ${this.data.mach.toFixed(2)}  AOA ${this.data.aoa.toFixed(1)}°  G ${this.data.gForce.toFixed(1)}`;
        ctx.fillText(info, x, y);
        ctx.restore();
    }

    drawWarning(ctx, x, y, text, color) {
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 15;
        ctx.fillStyle = color;
        ctx.font = 'bold 22px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(text, x, y);
        ctx.restore();
    }
}
