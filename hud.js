// ============================================================
// hud.js - 極限貼邊、大視野無阻礙 HUD v3.6.5
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
        this.isDirty = true;
        this.globalDim = 1.0;
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
        this.isDirty = true;
    }

    update(data) {
        Object.assign(this.data, data);
        if (data.vdi_deviation !== undefined) {
            const alpha = SIM_CONFIG.HUD?.VDI_FILTER_ALPHA ?? 0.15;
            this.filteredVdiDev += alpha * (data.vdi_deviation - this.filteredVdiDev);
        } else {
            this.filteredVdiDev = 0;
        }

        const weather = SIM_CONFIG.currentWeather;
        if (weather === 'night') this.globalDim = 0.65;
        else if (weather === 'storm') this.globalDim = 0.85;
        else if (weather === 'sunset') this.globalDim = 0.92;
        else this.globalDim = 1.0;

        this.isDirty = true;
        this.draw();
    }

    draw() {
        if (!this.isDirty) return;
        const ctx = this.ctx;
        const W = this.width || window.innerWidth;
        const H = this.height || window.innerHeight;
        ctx.clearRect(0, 0, W, H);

        ctx.save();
        ctx.globalAlpha = this.globalDim;

        const isMobile = W < 768;
        const isPortrait = H > W;
        const cx = W / 2, cy = H * (isPortrait ? 0.45 : 0.5);

        // 中央姿態儀半徑
        const radius = isMobile ? Math.min(W, H) * 0.12 : Math.min(W, H) * 0.16;

        // 刻度帶寬度與極限貼邊位置 (左右只留 4px)
        const tapeW = isMobile ? 38 : 50;
        const tapeH = isPortrait ? H * 0.32 : H * 0.42;
        const tapeLeftX = 4;
        const tapeRightX = W - tapeW - 4;
        const tapeY = isPortrait ? H * 0.28 : H * 0.25;

        // 1. 中央姿態儀
        this.drawADI(ctx, cx, cy, radius, isMobile);

        // 2. 左側極致貼邊速度帶
        this.drawSpeedTape(ctx, tapeLeftX, tapeY, tapeW, tapeH, this.data.speed, isMobile);

        // 3. 右側極致貼邊高度帶
        this.drawAltitudeTape(ctx, tapeRightX, tapeY, tapeW, tapeH, this.data.altitude, isMobile);

        // 4. 頂部極限貼頂航向帶 (向下 22px，避開頂部狀態條)
        const hdgW = isMobile ? Math.min(W * 0.55, 200) : W * 0.35;
        this.drawHeadingTape(ctx, (W - hdgW) / 2, isMobile ? 24 : 32, hdgW, isMobile ? 16 : 20, this.data.heading, isMobile);

        // 5. 速度向量 (Flight Path Marker)
        if (this.data.alpha !== undefined && this.data.beta !== undefined) {
            this.drawFPM(ctx, cx, cy, this.data.alpha, this.data.beta, isMobile);
        }

        // 6. 垂直導引稜形
        if (this.data.vnav_active) {
            this.drawVDI(ctx, tapeRightX - 10, cy, 80, this.filteredVdiDev);
        }

        // 7. 底部數據摘要 (移至 MCP 上方)
        this.drawStatus(ctx, W / 2, H - (isMobile ? 55 : 45), isMobile);

        ctx.restore();
        this.isDirty = false;
    }

    drawADI(ctx, cx, cy, r, isMobile) {
        const { pitch, roll } = this.data;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-roll * Math.PI / 180);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.clip();

        const maxPitch = 30;
        const yScale = (r / maxPitch) * 0.85;
        const horizonY = pitch * yScale;

        ctx.fillStyle = 'rgba(0, 150, 255, 0.08)';
        ctx.fillRect(-r, -r, r * 2, r + horizonY);
        ctx.fillStyle = 'rgba(120, 80, 20, 0.08)';
        ctx.fillRect(-r, horizonY, r * 2, r - horizonY + r);

        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        for (let deg = -30; deg <= 30; deg += 5) {
            const y = (deg - pitch) * yScale;
            if (Math.abs(y) > r * 0.95) continue;

            ctx.beginPath();
            if (deg === 0) {
                ctx.moveTo(-r * 0.55, y); ctx.lineTo(r * 0.55, y);
                ctx.strokeStyle = '#00ffaa';
                ctx.lineWidth = 1.5;
            } else {
                const len = (deg % 10 === 0) ? r * 0.2 : r * 0.1;
                ctx.moveTo(-len, y); ctx.lineTo(len, y);
                ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
                ctx.lineWidth = 1.0;
            }
            ctx.stroke();

            if (deg % 10 === 0 && deg !== 0 && !isMobile) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = '9px monospace';
                ctx.textAlign = 'right'; ctx.fillText(Math.abs(deg) + '', -r * 0.58, y + 3);
                ctx.textAlign = 'left'; ctx.fillText(Math.abs(deg) + '', r * 0.58, y + 3);
            }
        }
        ctx.restore();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-14, 0); ctx.lineTo(-5, 0); ctx.lineTo(-2, 3);
        ctx.moveTo(14, 0); ctx.lineTo(5, 0); ctx.lineTo(2, 3);
        ctx.moveTo(0, -4); ctx.lineTo(0, 0);
        ctx.stroke();
        ctx.fillStyle = '#ffdd00';
        ctx.beginPath(); ctx.arc(0, 0, 1.8, 0, 2 * Math.PI); ctx.fill();
        ctx.restore();
    }

    drawSpeedTape(ctx, x, y, w, h, speed, isMobile) {
        ctx.save();
        // 浮動半透明極簡底色
        ctx.fillStyle = 'rgba(5, 12, 20, 0.35)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.25)';
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#00ffaa';
        ctx.font = `bold ${isMobile ? 8 : 9}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('IAS', x + w / 2, y - 3);

        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        const range = 120;
        const pxPerUnit = h / range;
        const startVal = Math.floor((speed - range / 2) / 10) * 10;
        const endVal = Math.ceil((speed + range / 2) / 10) * 10;

        for (let v = startVal; v <= endVal; v += 10) {
            if (v < 0 || v > 1000) continue;
            const normY = y + h / 2 - (v - speed) * pxPerUnit;
            const major = (v % 20 === 0);
            const len = major ? 6 : 3;

            ctx.beginPath();
            ctx.moveTo(x + w - len, normY); ctx.lineTo(x + w, normY);
            ctx.strokeStyle = 'rgba(0, 255, 170, 0.55)';
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = `${isMobile ? 8 : 9}px monospace`;
                ctx.textAlign = 'right';
                ctx.fillText(v.toString(), x + w - 8, normY + 3);
            }
        }
        ctx.restore();

        // 讀數框 (極致精巧)
        ctx.save();
        ctx.fillStyle = '#050a12';
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1.2;
        ctx.fillRect(x, y + h / 2 - 8, w + 2, 16);
        ctx.strokeRect(x, y + h / 2 - 8, w + 2, 16);

        ctx.fillStyle = '#ffdd00';
        ctx.font = `bold ${isMobile ? 10 : 11}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(speed).toString(), x + w / 2, y + h / 2 + 3.5);
        ctx.restore();
    }

    drawAltitudeTape(ctx, x, y, w, h, alt, isMobile) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 12, 20, 0.35)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.25)';
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#00ffaa';
        ctx.font = `bold ${isMobile ? 8 : 9}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('ALT', x + w / 2, y - 3);

        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        const range = 1000;
        const pxPerUnit = h / range;
        const startVal = Math.floor((alt - range / 2) / 100) * 100;
        const endVal = Math.ceil((alt + range / 2) / 100) * 100;

        for (let v = startVal; v <= endVal; v += 100) {
            if (v < 0 || v > 60000) continue;
            const normY = y + h / 2 - (v - alt) * pxPerUnit;
            const major = (v % 500 === 0);
            const len = major ? 6 : 3;

            ctx.beginPath();
            ctx.moveTo(x, normY); ctx.lineTo(x + len, normY);
            ctx.strokeStyle = 'rgba(0, 255, 170, 0.55)';
            ctx.stroke();

            if (major || (isMobile && v % 200 === 0)) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = `${isMobile ? 8 : 9}px monospace`;
                ctx.textAlign = 'left';
                ctx.fillText(v.toString(), x + 8, normY + 3);
            }
        }
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#050a12';
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1.2;
        ctx.fillRect(x - 2, y + h / 2 - 8, w + 2, 16);
        ctx.strokeRect(x - 2, y + h / 2 - 8, w + 2, 16);

        ctx.fillStyle = '#ffdd00';
        ctx.font = `bold ${isMobile ? 10 : 11}px monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(alt).toString(), x + w / 2, y + h / 2 + 3.5);
        ctx.restore();
    }

    drawHeadingTape(ctx, x, y, w, h, heading, isMobile) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 12, 20, 0.35)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.25)';
        ctx.strokeRect(x, y, w, h);

        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        const visibleDeg = isMobile ? 35 : 45;
        const start = heading - visibleDeg / 2;
        const end = heading + visibleDeg / 2;
        const scale = w / visibleDeg;

        for (let deg = Math.ceil(start / 5) * 5; deg <= end; deg += 5) {
            const degNorm = ((deg % 360) + 360) % 360;
            const posX = x + (deg - start) * scale;
            const major = (degNorm % 10 === 0);

            ctx.beginPath();
            ctx.moveTo(posX, y + h - (major ? 5 : 2));
            ctx.lineTo(posX, y + h);
            ctx.strokeStyle = 'rgba(0, 255, 170, 0.55)';
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = `${isMobile ? 7.5 : 8.5}px monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(degNorm.toString().padStart(3, '0'), posX, y + 7);
            }
        }
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#ffdd00';
        ctx.font = '9px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼', x + w / 2, y + h + 7);
        ctx.restore();
    }

    drawFPM(ctx, cx, cy, alpha, beta, isMobile) {
        const scale = isMobile ? 2.5 : 3.5;
        const dx = -beta * scale;
        const dy = alpha * scale;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.0;
        ctx.beginPath();
        ctx.arc(dx, dy, 4, 0, 2 * Math.PI);
        ctx.moveTo(dx - 8, dy); ctx.lineTo(dx - 4, dy);
        ctx.moveTo(dx + 4, dy); ctx.lineTo(dx + 8, dy);
        ctx.moveTo(dx, dy - 8); ctx.lineTo(dx, dy - 4);
        ctx.stroke();
        ctx.restore();
    }

    drawVDI(ctx, x, y, h, deviationFt) {
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.fillStyle = '#ffffff';
        ctx.lineWidth = 1;

        const maxDev = 1000;
        const scale = (h / 2) / maxDev;
        const clampedDev = Math.max(-maxDev, Math.min(maxDev, deviationFt));
        const diamondY = y - (clampedDev * scale);

        [-500, 0, 500].forEach(dev => {
            const dotY = y - (dev * scale);
            ctx.beginPath();
            ctx.arc(x, dotY, 1.5, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.fillStyle = '#ff00ff';
        ctx.beginPath();
        ctx.moveTo(x, diamondY - 4); ctx.lineTo(x + 4, diamondY);
        ctx.lineTo(x, diamondY + 4); ctx.lineTo(x - 4, diamondY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    drawStatus(ctx, x, y, isMobile) {
        ctx.save();
        ctx.fillStyle = '#00ffaa';
        ctx.font = `${isMobile ? 8 : 10}px monospace`;
        ctx.textAlign = 'center';
        const info = `SPD ${Math.round(this.data.speed)}kt | ALT ${Math.round(this.data.altitude)}ft | M ${this.data.mach.toFixed(2)}`;
        ctx.fillText(info, x, y);
        ctx.restore();
    }
}
