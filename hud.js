// ============================================================
// hud.js - J.A.R. Skybound 終極航空級響應式 HUD v3.6.4
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

        // 環境光自適應調光 (夜航與暴風雨自動降低亮度)
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

        const isMobile = W < 600;
        const cx = W / 2, cy = H / 2;
        const radius = isMobile ? Math.min(W, H) * 0.13 : Math.min(W, H) * 0.17;

        const tapeW = isMobile ? 42 : 54;
        const tapeH = isMobile ? H * 0.38 : H * 0.44;
        const tapeLeftX = isMobile ? 8 : Math.max(25, W * 0.14);
        const tapeRightX = isMobile ? (W - tapeW - 8) : Math.min(W - 80, W * 0.86 - tapeW);

        // 1. 中央姿態儀 (ADI)
        this.drawADI(ctx, cx, cy, radius, isMobile);

        // 2. 左側速度帶
        this.drawSpeedTape(ctx, tapeLeftX, H * 0.3, tapeW, tapeH, this.data.speed, isMobile);

        // 3. 右側高度帶
        this.drawAltitudeTape(ctx, tapeRightX, H * 0.3, tapeW, tapeH, this.data.altitude, isMobile);

        // 4. 頂部航向帶
        const hdgW = isMobile ? W * 0.5 : W * 0.36;
        this.drawHeadingTape(ctx, (W - hdgW) / 2, isMobile ? 32 : 45, hdgW, isMobile ? 18 : 22, this.data.heading, isMobile);

        // 5. 速度向量 (Flight Path Marker)
        if (this.data.alpha !== undefined && this.data.beta !== undefined) {
            this.drawFPM(ctx, cx, cy, this.data.alpha, this.data.beta, isMobile);
        }

        // 6. VNAV 垂直導引稜形
        if (this.data.vnav_active) {
            this.drawVDI(ctx, tapeRightX - 16, H * 0.5, 90, this.filteredVdiDev);
        }

        // 7. 底部數據摘要條
        this.drawStatus(ctx, W / 2, H - (isMobile ? 46 : 35), isMobile);

        ctx.restore();
        this.isDirty = false;
    }

    drawADI(ctx, cx, cy, r, isMobile) {
        const { pitch, roll } = this.data;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-roll * Math.PI / 180);

        // 姿態球微漸變填充 (上天藍/下大地棕)
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.clip();

        const maxPitch = 30;
        const yScale = (r / maxPitch) * 0.85;
        const horizonY = pitch * yScale;

        // 天空半球
        ctx.fillStyle = 'rgba(0, 150, 255, 0.08)';
        ctx.fillRect(-r, -r, r * 2, r + horizonY);
        // 大地半球
        ctx.fillStyle = 'rgba(120, 80, 20, 0.08)';
        ctx.fillRect(-r, horizonY, r * 2, r - horizonY + r);

        // 外邊框
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.4)';
        ctx.lineWidth = 1;
        ctx.stroke();

        // 俯仰梯線
        for (let deg = -30; deg <= 30; deg += 5) {
            const y = (deg - pitch) * yScale;
            if (Math.abs(y) > r * 0.95) continue;

            ctx.beginPath();
            if (deg === 0) {
                ctx.moveTo(-r * 0.55, y); ctx.lineTo(r * 0.55, y);
                ctx.strokeStyle = '#00ffaa';
                ctx.lineWidth = 1.6;
            } else {
                const len = (deg % 10 === 0) ? r * 0.22 : r * 0.11;
                ctx.moveTo(-len, y); ctx.lineTo(len, y);
                ctx.strokeStyle = 'rgba(0, 255, 170, 0.65)';
                ctx.lineWidth = 1.0;
            }
            ctx.stroke();

            if (deg % 10 === 0 && deg !== 0 && !isMobile) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = '9px "SF Mono", "Roboto Mono", Consolas, monospace';
                ctx.textAlign = 'right'; ctx.fillText(Math.abs(deg) + '', -r * 0.58, y + 3);
                ctx.textAlign = 'left'; ctx.fillText(Math.abs(deg) + '', r * 0.58, y + 3);
            }
        }

        ctx.restore();

        // 固定機徽 (Aircraft Symbol)
        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1.8;
        ctx.beginPath();
        ctx.moveTo(-16, 0); ctx.lineTo(-6, 0); ctx.lineTo(-3, 3);
        ctx.moveTo(16, 0); ctx.lineTo(6, 0); ctx.lineTo(3, 3);
        ctx.moveTo(0, -5); ctx.lineTo(0, 0);
        ctx.stroke();

        ctx.fillStyle = '#ffdd00';
        ctx.beginPath(); ctx.arc(0, 0, 2, 0, 2 * Math.PI); ctx.fill();
        ctx.restore();
    }

    drawSpeedTape(ctx, x, y, w, h, speed, isMobile) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 12, 20, 0.45)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#00ffaa';
        ctx.font = `bold ${isMobile ? 8 : 9}px "SF Mono", "Roboto Mono", Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('IAS', x + w / 2, y - 4);

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
            const len = major ? 7 : 4;

            ctx.beginPath();
            ctx.moveTo(x + w - len, normY); ctx.lineTo(x + w, normY);
            ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = `${isMobile ? 8.5 : 9.5}px "SF Mono", "Roboto Mono", Consolas, monospace`;
                ctx.textAlign = 'right';
                ctx.fillText(v.toString(), x + w - 9, normY + 3);
            }
        }
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#050a12';
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1.2;
        ctx.fillRect(x - 2, y + h / 2 - 9, w + 4, 18);
        ctx.strokeRect(x - 2, y + h / 2 - 9, w + 4, 18);

        ctx.fillStyle = '#ffdd00';
        ctx.font = `bold ${isMobile ? 10.5 : 12}px "SF Mono", "Roboto Mono", Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(speed).toString(), x + w / 2, y + h / 2 + 3.5);
        ctx.restore();
    }

    drawAltitudeTape(ctx, x, y, w, h, alt, isMobile) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 12, 20, 0.45)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#00ffaa';
        ctx.font = `bold ${isMobile ? 8 : 9}px "SF Mono", "Roboto Mono", Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText('ALT', x + w / 2, y - 4);

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
            const len = major ? 7 : 4;

            ctx.beginPath();
            ctx.moveTo(x, normY); ctx.lineTo(x + len, normY);
            ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
            ctx.stroke();

            if (major || (isMobile && v % 200 === 0)) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = `${isMobile ? 8.5 : 9.5}px "SF Mono", "Roboto Mono", Consolas, monospace`;
                ctx.textAlign = 'left';
                ctx.fillText(v.toString(), x + 9, normY + 3);
            }
        }
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#050a12';
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1.2;
        ctx.fillRect(x - 2, y + h / 2 - 9, w + 4, 18);
        ctx.strokeRect(x - 2, y + h / 2 - 9, w + 4, 18);

        ctx.fillStyle = '#ffdd00';
        ctx.font = `bold ${isMobile ? 10.5 : 12}px "SF Mono", "Roboto Mono", Consolas, monospace`;
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(alt).toString(), x + w / 2, y + h / 2 + 3.5);
        ctx.restore();
    }

    drawHeadingTape(ctx, x, y, w, h, heading, isMobile) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 12, 20, 0.45)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.3)';
        ctx.strokeRect(x, y, w, h);

        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        const visibleDeg = isMobile ? 40 : 50;
        const start = heading - visibleDeg / 2;
        const end = heading + visibleDeg / 2;
        const scale = w / visibleDeg;

        for (let deg = Math.ceil(start / 5) * 5; deg <= end; deg += 5) {
            const degNorm = ((deg % 360) + 360) % 360;
            const posX = x + (deg - start) * scale;
            const major = (degNorm % 10 === 0);

            ctx.beginPath();
            ctx.moveTo(posX, y + h - (major ? 6 : 3));
            ctx.lineTo(posX, y + h);
            ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = `${isMobile ? 8 : 9}px "SF Mono", "Roboto Mono", Consolas, monospace`;
                ctx.textAlign = 'center';
                ctx.fillText(degNorm.toString().padStart(3, '0'), posX, y + 8);
            }
        }
        ctx.restore();

        ctx.save();
        ctx.fillStyle = '#ffdd00';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼', x + w / 2, y + h + 8);
        ctx.restore();
    }

    drawFPM(ctx, cx, cy, alpha, beta, isMobile) {
        const scale = isMobile ? 3.0 : 4.0;
        const dx = -beta * scale;
        const dy = alpha * scale;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.2;

        ctx.beginPath();
        ctx.arc(dx, dy, 5, 0, 2 * Math.PI);
        ctx.moveTo(dx - 10, dy); ctx.lineTo(dx - 5, dy);
        ctx.moveTo(dx + 5, dy); ctx.lineTo(dx + 10, dy);
        ctx.moveTo(dx, dy - 10); ctx.lineTo(dx, dy - 5);
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
            ctx.arc(x, dotY, 2, 0, Math.PI * 2);
            ctx.stroke();
        });

        ctx.fillStyle = '#ff00ff';
        ctx.strokeStyle = '#ff00ff';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(x, diamondY - 5); ctx.lineTo(x + 5, diamondY);
        ctx.lineTo(x, diamondY + 5); ctx.lineTo(x - 5, diamondY);
        ctx.closePath();
        ctx.fill(); ctx.stroke();

        ctx.restore();
    }

    drawStatus(ctx, x, y, isMobile) {
        ctx.save();
        ctx.fillStyle = '#00ffaa';
        ctx.font = `${isMobile ? 8.5 : 10.5}px "SF Mono", "Roboto Mono", Consolas, monospace`;
        ctx.textAlign = 'center';
        const info = `SPD ${Math.round(this.data.speed)}kt  ALT ${Math.round(this.data.altitude)}ft  M ${this.data.mach.toFixed(2)}  AOA ${this.data.aoa.toFixed(1)}°`;
        ctx.fillText(info, x, y);
        ctx.restore();
    }
}
