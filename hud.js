// ============================================================
// hud.js - Canvas 2D Retina 抬頭顯示器 (HUD)
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
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = window.innerWidth;
        const h = window.innerHeight;
        this.canvas.width = w * dpr;
        this.canvas.height = h * dpr;
        this.canvas.style.width = w + 'px';
        this.canvas.style.height = h + 'px';
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.scale(dpr, dpr);
        this.width = w;
        this.height = h;
    }

    update(data) {
        Object.assign(this.data, data);
        if (data.vdi_deviation !== undefined) {
            const alpha = SIM_CONFIG.HUD?.VDI_FILTER_ALPHA ?? 0.15;
            this.filteredVdiDev += alpha * (data.vdi_deviation - this.filteredVdiDev);
        } else {
            this.filteredVdiDev = 0;
        }
        this.draw();
    }

    draw() {
        const ctx = this.ctx;
        const W = this.width || window.innerWidth;
        const H = this.height || window.innerHeight;
        ctx.clearRect(0, 0, W, H);

        const cx = W / 2, cy = H / 2 - 10;
        const radius = Math.min(W, H) * 0.18;

        const tapeW = 55;
        const tapeH = H * 0.48;
        const tapeLeftX = Math.max(20, W * 0.12);
        const tapeRightX = Math.min(W - 75, W * 0.88 - tapeW);

        this.drawADI(ctx, cx, cy, radius);
        this.drawTape(ctx, 'left', tapeLeftX, H * 0.24, tapeW, tapeH, this.data.speed, 0, 1000, 'SPD');
        this.drawTape(ctx, 'right', tapeRightX, H * 0.24, tapeW, tapeH, this.data.altitude, 0, 60000, 'ALT');
        this.drawHeadingTape(ctx, W * 0.3, 15, W * 0.4, 28, this.data.heading);

        if (this.data.alpha !== undefined && this.data.beta !== undefined) {
            this.drawFPM(ctx, cx, cy, this.data.alpha, this.data.beta);
        }

        if (this.data.vnav_active) {
            this.drawVDI(ctx, tapeRightX - 20, H * 0.48, 100, this.filteredVdiDev);
        }

        this.drawStatus(ctx, W / 2, H - 25);
    }

    drawADI(ctx, cx, cy, r) {
        const { pitch, roll } = this.data;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-roll * Math.PI / 180);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        const maxPitch = 30;
        const yScale = (r / maxPitch) * 0.85;
        for (let deg = -30; deg <= 30; deg += 5) {
            const y = deg * yScale;
            ctx.beginPath();
            if (deg === 0) {
                ctx.moveTo(-r * 0.45, y); ctx.lineTo(r * 0.45, y);
                ctx.lineWidth = 2;
            } else {
                const len = (deg % 10 === 0) ? r * 0.20 : r * 0.1;
                ctx.moveTo(-len, y); ctx.lineTo(len, y);
                ctx.lineWidth = 1;
            }
            ctx.strokeStyle = '#00ffcc';
            ctx.stroke();

            if (deg % 10 === 0 && deg !== 0) {
                ctx.fillStyle = '#00ffcc';
                ctx.font = '10px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(Math.abs(deg) + '°', -r * 0.48, y + 3);
                ctx.textAlign = 'left';
                ctx.fillText(Math.abs(deg) + '°', r * 0.48, y + 3);
            }
        }

        ctx.rotate(roll * Math.PI / 180);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -r * 0.2); ctx.lineTo(-r * 0.12, r * 0.12);
        ctx.lineTo(0, r * 0.04); ctx.lineTo(r * 0.12, r * 0.12);
        ctx.closePath();
        ctx.stroke();

        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(0, 0, 3, 0, 2 * Math.PI);
        ctx.fill();

        ctx.restore();
    }

    drawTape(ctx, side, x, y, w, h, value, min, max, label) {
        ctx.save();
        ctx.strokeStyle = '#00ffcc';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#00ffcc';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(label, x + w / 2, y - 6);

        const range = 180;
        const startVal = Math.floor((value - range / 2) / 10) * 10;
        const endVal = startVal + range;

        for (let v = startVal; v <= endVal; v += 10) {
            if (v < min || v > max) continue;
            const normY = y + h * (1 - (v - (value - range / 2)) / range);
            if (normY < y || normY > y + h) continue;

            const major = (v % 50 === 0);
            const len = major ? 10 : 5;
            ctx.beginPath();
            ctx.moveTo(side === 'left' ? x + w - len : x, normY);
            ctx.lineTo(side === 'left' ? x + w : x + len, normY);
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ffcc';
                ctx.textAlign = (side === 'left') ? 'right' : 'left';
                ctx.fillText(v, side === 'left' ? x - 4 : x + w + 4, normY + 3);
            }
        }

        ctx.fillStyle = '#000';
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x - 2, y + h / 2 - 10, w + 4, 20);
        ctx.strokeRect(x - 2, y + h / 2 - 10, w + 4, 20);

        ctx.fillStyle = '#ffff00';
        ctx.font = 'bold 13px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(value), x + w / 2, y + h / 2 + 4);

        ctx.restore();
    }

    drawHeadingTape(ctx, x, y, w, h, heading) {
        ctx.save();
        ctx.strokeStyle = '#00ffcc';
        ctx.strokeRect(x, y, w, h);

        const visibleDeg = 50;
        const start = heading - visibleDeg / 2;
        const end = heading + visibleDeg / 2;
        const scale = w / visibleDeg;

        for (let deg = Math.ceil(start / 5) * 5; deg <= end; deg += 5) {
            const degNorm = ((deg % 360) + 360) % 360;
            const posX = x + (deg - start) * scale;
            if (posX < x || posX > x + w) continue;

            const major = (degNorm % 10 === 0);
            ctx.beginPath();
            ctx.moveTo(posX, y + h - (major ? 10 : 5));
            ctx.lineTo(posX, y + h);
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ffcc';
                ctx.font = '10px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(degNorm.toString().padStart(3, '0'), posX, y + 12);
            }
        }

        ctx.fillStyle = '#ffff00';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼', x + w / 2, y + h + 12);

        ctx.restore();
    }

    drawFPM(ctx, cx, cy, alpha, beta) {
        const scale = 4.5;
        const dx = -beta * scale;
        const dy = alpha * scale;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#ffff00';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(dx, dy, 8, 0, 2 * Math.PI);
        ctx.moveTo(dx - 15, dy); ctx.lineTo(dx - 8, dy);
        ctx.moveTo(dx + 8, dy); ctx.lineTo(dx + 15, dy);
        ctx.moveTo(dx, dy - 15); ctx.lineTo(dx, dy - 8);
        ctx.stroke();

        ctx.restore();
    }

    drawVDI(ctx, x, y, h, deviationFt) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 1;

        const maxDev = 1000;
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
        ctx.moveTo(x, diamondY - 6); ctx.lineTo(x + 6, diamondY);
        ctx.lineTo(x, diamondY + 6); ctx.lineTo(x - 6, diamondY);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        ctx.restore();
    }

    drawStatus(ctx, x, y) {
        ctx.save();
        ctx.fillStyle = '#00ffcc';
        ctx.font = '11px monospace';
        ctx.textAlign = 'center';
        const info = `SPD ${Math.round(this.data.speed)}kt  ALT ${Math.round(this.data.altitude)}ft  M ${this.data.mach.toFixed(2)}  AOA ${this.data.aoa.toFixed(1)}°  G ${this.data.gForce.toFixed(1)}`;
        ctx.fillText(info, x, y);
        ctx.restore();
    }
}
