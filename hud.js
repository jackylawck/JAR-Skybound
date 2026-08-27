// ============================================================
// hud.js - 高度/速度刻度重構、航空 PFD 規範與環境光自適應 v3.6.1
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

        const cx = W / 2, cy = H / 2;
        const radius = Math.min(W, H) * 0.17;

        const tapeW = 56;
        const tapeH = H * 0.44;
        const tapeLeftX = Math.max(30, W * 0.14);
        const tapeRightX = Math.min(W - 86, W * 0.86 - tapeW);

        // 1. 中央姿態儀 (ADI)
        this.drawADI(ctx, cx, cy, radius);

        // 2. 左側速度帶 (Speed Tape: 步進 10kt, 範圍 ±60kt)
        this.drawSpeedTape(ctx, tapeLeftX, H * 0.28, tapeW, tapeH, this.data.speed);

        // 3. 右側高度帶 (Altitude Tape: 步進 100ft, 大刻度 500ft, 範圍 ±600ft, 徹底解決高空堆疊)
        this.drawAltitudeTape(ctx, tapeRightX, H * 0.28, tapeW, tapeH, this.data.altitude);

        // 4. 頂部航向帶 (Heading Tape)
        this.drawHeadingTape(ctx, W * 0.32, 45, W * 0.36, 24, this.data.heading);

        // 5. 速度向量 (Flight Path Marker)
        if (this.data.alpha !== undefined && this.data.beta !== undefined) {
            this.drawFPM(ctx, cx, cy, this.data.alpha, this.data.beta);
        }

        // 6. VNAV 垂直導引稜形
        if (this.data.vnav_active) {
            this.drawVDI(ctx, tapeRightX - 16, H * 0.5, 90, this.filteredVdiDev);
        }

        // 7. 底部數據摘要條
        this.drawStatus(ctx, W / 2, H - 35);
    }

    drawADI(ctx, cx, cy, r) {
        const { pitch, roll } = this.data;
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(-roll * Math.PI / 180);

        // 外環
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, 2 * Math.PI);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.45)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // 俯仰刻度梯
        const maxPitch = 30;
        const yScale = (r / maxPitch) * 0.85;
        for (let deg = -30; deg <= 30; deg += 5) {
            const y = deg * yScale;
            ctx.beginPath();
            if (deg === 0) {
                ctx.moveTo(-r * 0.55, y); ctx.lineTo(r * 0.55, y);
                ctx.strokeStyle = '#00ffaa';
                ctx.lineWidth = 1.8;
            } else {
                const len = (deg % 10 === 0) ? r * 0.22 : r * 0.11;
                ctx.moveTo(-len, y); ctx.lineTo(len, y);
                ctx.strokeStyle = 'rgba(0, 255, 170, 0.7)';
                ctx.lineWidth = 1.0;
            }
            ctx.stroke();

            if (deg % 10 === 0 && deg !== 0) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = '10px Consolas, monospace';
                ctx.textAlign = 'right';
                ctx.fillText(Math.abs(deg) + '', -r * 0.58, y + 3);
                ctx.textAlign = 'left';
                ctx.fillText(Math.abs(deg) + '', r * 0.58, y + 3);
            }
        }

        // 固定機徽 (Aircraft Symbol)
        ctx.rotate(roll * Math.PI / 180);
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 2.0;
        ctx.beginPath();
        ctx.moveTo(-20, 0); ctx.lineTo(-8, 0); ctx.lineTo(-4, 4);
        ctx.moveTo(20, 0); ctx.lineTo(8, 0); ctx.lineTo(4, 4);
        ctx.moveTo(0, -6); ctx.lineTo(0, 0);
        ctx.stroke();

        ctx.fillStyle = '#ffdd00';
        ctx.beginPath();
        ctx.arc(0, 0, 2.5, 0, 2 * Math.PI);
        ctx.fill();

        ctx.restore();
    }

    // 速度刻度帶 (步進 10kt)
    drawSpeedTape(ctx, x, y, w, h, speed) {
        ctx.save();
        
        // 標題與底框
        ctx.fillStyle = 'rgba(5, 12, 20, 0.55)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#00ffaa';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('IAS (kt)', x + w / 2, y - 6);

        // 使用 Canvas Clip 防止數字溢出框外
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        const range = 120; // 顯示當前速度 ±60kt
        const pxPerUnit = h / range;
        const startVal = Math.floor((speed - range / 2) / 10) * 10;
        const endVal = Math.ceil((speed + range / 2) / 10) * 10;

        for (let v = startVal; v <= endVal; v += 10) {
            if (v < 0 || v > 1000) continue;
            const normY = y + h / 2 - (v - speed) * pxPerUnit;
            const major = (v % 20 === 0);
            const len = major ? 10 : 5;

            ctx.beginPath();
            ctx.moveTo(x + w - len, normY);
            ctx.lineTo(x + w, normY);
            ctx.strokeStyle = 'rgba(0, 255, 170, 0.65)';
            ctx.lineWidth = major ? 1.5 : 1.0;
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = '10px monospace';
                ctx.textAlign = 'right';
                ctx.fillText(v.toString(), x + w - 12, normY + 3.5);
            }
        }
        ctx.restore();

        // 當前數值讀數視窗 (置頂不被 clip 遮擋)
        ctx.save();
        ctx.fillStyle = '#050a12';
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x - 3, y + h / 2 - 10, w + 6, 20);
        ctx.strokeRect(x - 3, y + h / 2 - 10, w + 6, 20);

        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(speed).toString(), x + w / 2, y + h / 2 + 4);
        ctx.restore();
    }

    // 高度刻度帶 (航空 PFD 規範：步進 100ft，大標記 500ft，徹底修復堆疊 Bug)
    drawAltitudeTape(ctx, x, y, w, h, alt) {
        ctx.save();

        // 標題與底框
        ctx.fillStyle = 'rgba(5, 12, 20, 0.55)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, w, h);

        ctx.fillStyle = '#00ffaa';
        ctx.font = 'bold 9px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('ALT (ft)', x + w / 2, y - 6);

        // 使用 Canvas Clip 確保刻度絕不溢出
        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        const range = 1000; // 顯示當前高度 ±500ft
        const pxPerUnit = h / range;
        const startVal = Math.floor((alt - range / 2) / 100) * 100;
        const endVal = Math.ceil((alt + range / 2) / 100) * 100;

        for (let v = startVal; v <= endVal; v += 100) {
            if (v < 0 || v > 60000) continue;
            const normY = y + h / 2 - (v - alt) * pxPerUnit;
            const major = (v % 500 === 0);
            const len = major ? 10 : 5;

            ctx.beginPath();
            ctx.moveTo(x, normY);
            ctx.lineTo(x + len, normY);
            ctx.strokeStyle = 'rgba(0, 255, 170, 0.65)';
            ctx.lineWidth = major ? 1.5 : 1.0;
            ctx.stroke();

            if (major || range <= 1000) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = '10px monospace';
                ctx.textAlign = 'left';
                ctx.fillText(v.toString(), x + 12, normY + 3.5);
            }
        }
        ctx.restore();

        // 當前高度讀數框
        ctx.save();
        ctx.fillStyle = '#050a12';
        ctx.strokeStyle = '#ffdd00';
        ctx.lineWidth = 1.5;
        ctx.fillRect(x - 3, y + h / 2 - 10, w + 6, 20);
        ctx.strokeRect(x - 3, y + h / 2 - 10, w + 6, 20);

        ctx.fillStyle = '#ffdd00';
        ctx.font = 'bold 12px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(Math.round(alt).toString(), x + w / 2, y + h / 2 + 4);
        ctx.restore();
    }

    drawHeadingTape(ctx, x, y, w, h, heading) {
        ctx.save();
        ctx.fillStyle = 'rgba(5, 12, 20, 0.45)';
        ctx.fillRect(x, y, w, h);
        ctx.strokeStyle = 'rgba(0, 255, 170, 0.35)';
        ctx.strokeRect(x, y, w, h);

        ctx.beginPath();
        ctx.rect(x, y, w, h);
        ctx.clip();

        const visibleDeg = 50;
        const start = heading - visibleDeg / 2;
        const end = heading + visibleDeg / 2;
        const scale = w / visibleDeg;

        for (let deg = Math.ceil(start / 5) * 5; deg <= end; deg += 5) {
            const degNorm = ((deg % 360) + 360) % 360;
            const posX = x + (deg - start) * scale;

            const major = (degNorm % 10 === 0);
            ctx.beginPath();
            ctx.moveTo(posX, y + h - (major ? 8 : 4));
            ctx.lineTo(posX, y + h);
            ctx.strokeStyle = 'rgba(0, 255, 170, 0.6)';
            ctx.stroke();

            if (major) {
                ctx.fillStyle = '#00ffaa';
                ctx.font = '9px monospace';
                ctx.textAlign = 'center';
                ctx.fillText(degNorm.toString().padStart(3, '0'), posX, y + 10);
            }
        }
        ctx.restore();

        // 頂部航向黃色三角指針
        ctx.save();
        ctx.fillStyle = '#ffdd00';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('▼', x + w / 2, y + h + 10);
        ctx.restore();
    }

    drawFPM(ctx, cx, cy, alpha, beta) {
        const scale = 4.0;
        const dx = -beta * scale;
        const dy = alpha * scale;

        ctx.save();
        ctx.translate(cx, cy);
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(dx, dy, 7, 0, 2 * Math.PI);
        ctx.moveTo(dx - 13, dy); ctx.lineTo(dx - 7, dy);
        ctx.moveTo(dx + 7, dy); ctx.lineTo(dx + 13, dy);
        ctx.moveTo(dx, dy - 13); ctx.lineTo(dx, dy - 7);
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

    drawStatus(ctx, x, y) {
        ctx.save();
        ctx.fillStyle = '#00ffaa';
        ctx.font = '11px Consolas, monospace';
        ctx.textAlign = 'center';
        const info = `SPD ${Math.round(this.data.speed)}kt  ALT ${Math.round(this.data.altitude)}ft  M ${this.data.mach.toFixed(2)}  AOA ${this.data.aoa.toFixed(1)}°  G ${this.data.gForce.toFixed(1)}`;
        ctx.fillText(info, x, y);
        ctx.restore();
    }
}
