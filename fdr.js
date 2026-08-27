// ============================================================
// fdr.js - 飛行數據記錄器 (Flight Data Recorder / Black Box)
// 符合 ARINC 717 參數子集標準
// ============================================================

export class FlightDataRecorder {
    constructor(sampleRateHz = 20, maxDurationSec = 1800) {
        this.sampleRate = sampleRateHz;
        this.interval = 1.0 / sampleRateHz;
        this.maxSamples = sampleRateHz * maxDurationSec; // 最長記錄 30 分鐘
        this.records = [];
        this.lastSampleTime = 0;
        this.isRecording = true;
    }

    recordFrame(timeSec, s, ctrl, eng1, eng2, fmsCmd, ap) {
        if (!this.isRecording) return;
        if (timeSec - this.lastSampleTime < this.interval) return;
        this.lastSampleTime = timeSec;

        if (this.records.length >= this.maxSamples) {
            this.records.shift(); // 環形緩衝區丟棄最舊幀
        }

        this.records.push({
            time: timeSec.toFixed(2),
            // 地軸位置
            x: s.x.toFixed(1),
            y: s.y.toFixed(1),
            altFt: s.altitude.toFixed(1),
            // 姿態 (deg)
            pitch: s.pitch.toFixed(2),
            roll: s.roll.toFixed(2),
            heading: s.heading.toFixed(2),
            // 空速與氣動
            iasKt: s.speed.toFixed(1),
            mach: s.mach.toFixed(3),
            aoaDeg: s.aoa.toFixed(2),
            betaDeg: s.beta.toFixed(2),
            gForce: s.gForce.toFixed(2),
            // 角速率 (deg/s)
            pRate: s.pRate.toFixed(2),
            qRate: s.qRate.toFixed(2),
            // 操縱指令
            elev: ctrl.elevator.toFixed(3),
            ail: ctrl.aileron.toFixed(3),
            rud: ctrl.rudder.toFixed(3),
            thr: ctrl.throttle.toFixed(3),
            brk: ctrl.brake.toFixed(2),
            // 發動機遙測
            eng1_N1: eng1.N1.toFixed(1),
            eng1_EGT: eng1.EGT.toFixed(0),
            eng2_N1: eng2.N1.toFixed(1),
            eng2_EGT: eng2.EGT.toFixed(0),
            totalFF: (eng1.FF + eng2.FF).toFixed(0),
            // AP / FMS 狀態
            apMaster: ap.modes.AP_MASTER ? 1 : 0,
            lnav: ap.modes.LNAV ? 1 : 0,
            vnav: ap.modes.VNAV ? 1 : 0,
            vdiDev: fmsCmd ? fmsCmd.vdi_deviation.toFixed(1) : "0.0"
        });
    }

    exportCSV() {
        if (this.records.length === 0) return null;
        const headers = Object.keys(this.records[0]).join(",");
        const rows = this.records.map(r => Object.values(r).join(",")).join("\n");
        const csvContent = "data:text/csv;charset=utf-8," + headers + "\n" + rows;
        const encodedUri = encodeURI(csvContent);
        
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `Skybound_FDR_${new Date().toISOString().replace(/[:.]/g, "-")}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }
}
