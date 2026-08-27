// ============================================================
// engineCFM.js - 現代大涵道比雙發渦扇發動機動態模型 (LEAP-1C / CFM56 級別)
// ============================================================

export class TurbofanEngine {
    constructor(engineId, maxThrustSL = 130000) {
        this.id = engineId; // 1: 左發, 2: 右發
        this.maxThrustSL = maxThrustSL; // 海平面最大額定推力 (N)
        
        // 即時狀態
        this.N1 = 20.0;     // 風扇轉速 (% RPM, 慢車約 20%)
        this.N2 = 58.0;     // 核心轉速 (% RPM, 慢車約 58%)
        this.EGT = 420.0;   // 排氣溫度 (°C)
        this.FF = 380.0;    // 燃油流量 (kg/h)
        this.thrust = 0.0;  // 即時淨推力 (N)
        
        this.isFailed = false; // 故障標誌
    }

    update(throttleCmd, densityRatio, mach, dt) {
        if (this.isFailed) {
            // 發動機停車 (風車旋轉 Windmilling)
            this.N1 += (5.0 - this.N1) * 0.15 * dt;
            this.N2 += (10.0 - this.N2) * 0.2 * dt;
            this.EGT += (60.0 - this.EGT) * 0.1 * dt;
            this.FF = 0.0;
            this.thrust = -this.maxThrustSL * 0.02 * mach; // 風車阻力
            return this.thrust;
        }

        // 目標 N1 / N2 (受油門推桿控制)
        const targetN1 = 20.0 + throttleCmd * 80.0; // 20% ~ 100%
        const targetN2 = 58.0 + throttleCmd * 41.5; // 58% ~ 99.5%

        // 高低壓轉子慣性響應 (一階滯後)
        // 加速時間常數約 2.5s (慢車到滿推力約 5s，符合 FAR 25.119 標準)
        const tauN1 = (targetN1 > this.N1) ? 2.4 : 1.8;
        const tauN2 = (targetN2 > this.N2) ? 1.6 : 1.2;

        this.N1 += (targetN1 - this.N1) * (dt / tauN1);
        this.N2 += (targetN2 - this.N2) * (dt / tauN2);

        // 排氣溫度 EGT 動態 (加減速熱慣性)
        const targetEGT = 400.0 + (this.N2 / 100.0) * 450.0 + (targetN1 - this.N1) * 3.5;
        this.EGT += (targetEGT - this.EGT) * (dt / 1.5);

        // 燃油流量 (kg/h)
        this.FF = Math.max(220, (this.N2 / 100.0) ** 2.8 * 2800 * Math.sqrt(densityRatio));

        // 推力計算 (隨空氣密度衰減與馬赫數效應)
        const n1Frac = Math.max(0, (this.N1 - 20.0) / 80.0);
        const thrustFrac = n1Frac ** 1.85; // 轉速-推力非線性冪次關係
        this.thrust = this.maxThrustSL * thrustFrac * (densityRatio ** 0.82) * (1.0 - 0.25 * mach);

        return this.thrust;
    }

    injectFailure(failed = true) {
        this.isFailed = failed;
    }
}
