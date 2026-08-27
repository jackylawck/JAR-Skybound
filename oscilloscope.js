// ============================================================
// oscilloscope.js - 多通道實時飛行參數示波器 (教學與研究專用)
// ============================================================

export class FlightOscilloscope {
    constructor(canvas, maxPoints = 200) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.maxPoints = maxPoints;
        
        // 4 通道歷史緩存
        this.channels = {
            aoa: [],    // 攻角 (deg, 範圍: -5 ~ 25)
            pitch: [],  // 俯仰 (deg, 範圍: -30 ~ 30)
            speed: [],  // 空速 (kt, 範圍: 100 ~ 400)
            gForce: []  // 過載 (G, 範圍: 0 ~ 3.5)
        };
        this.isVisible = true;
    }

    pushData(aoa, pitch, speed, gForce) {
        if (!this.isVisible) return;
        const pushClamped = (arr, val) => {
            arr.push(val);
            if (arr.length > this.maxPoints) arr.shift();
        };

        pushClamped(this.channels.aoa, aoa);
        pushClamped(this.channels.pitch, pitch);
        pushClamped(this.channels.speed, speed);
        pushClamped(this.channels.gForce, gForce);

        this.render();
    }

    render() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        ctx.clearRect(0, 0, W, H);

        // 背景網格
        ctx.fillStyle = 'rgba(5, 15, 25, 0.85)';
        ctx.fillRect(0, 0, W, H);
        ctx.strokeStyle = 'rgba(0, 150, 200, 0.2)';
        ctx.lineWidth = 1;

        for (let x = 0; x < W; x += 30) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += 20) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // 繪製各通道曲線
        this.drawCurve(this.channels.aoa, -5, 25, '#ff5500', 'AoA (deg)');
        this.drawCurve(this.channels.pitch, -30, 30, '#00ffcc', 'Pitch (deg)');
        this.drawCurve(this.channels.speed, 100, 400, '#ffff00', 'IAS (kt)');
        this.drawCurve(this.channels.gForce, 0, 3.5, '#ff00ff', 'G-Load');
    }

    drawCurve(data, minVal, maxVal, color, label) {
        if (data.length < 2) return;
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        const stepX = W / (this.maxPoints - 1);

        ctx.strokeStyle = color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();

        for (let i = 0; i < data.length; i++) {
            const normY = 1.0 - (data[i] - minVal) / (maxVal - minVal);
            const clampedY = Math.max(2, Math.min(H - 2, normY * H));
            const x = i * stepX;
            if (i === 0) ctx.moveTo(x, clampedY);
            else ctx.lineTo(x, clampedY);
        }
        ctx.stroke();

        // 標註最新值
        const lastVal = data[data.length - 1];
        ctx.fillStyle = color;
        ctx.font = '10px monospace';
        ctx.fillText(`${label}: ${lastVal !== undefined ? lastVal.toFixed(1) : '-'}`, W - 110, 12 + ['AoA', 'Pitch', 'IAS', 'G-Load'].indexOf(label.split(' ')[0]) * 12);
    }

    toggle() {
        this.isVisible = !this.isVisible;
        this.canvas.style.display = this.isVisible ? 'block' : 'none';
    }
}
