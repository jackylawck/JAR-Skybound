// ============================================================
// audio.js - J.A.R. Skybound Pro 音頻引擎與 GPWS v2.6
// ============================================================

export class SoundEngine {
    constructor() {
        this.ctx = null;
        this.isInitialized = false;
        this.lastWarningTime = 0;
        this.wasOnGround = false;
    }

    init() {
        if (this.isInitialized) return;
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioContext();

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
        this.masterGain.connect(this.ctx.destination);

        this.engineGain = this.ctx.createGain();
        this.engineGain.gain.setValueAtTime(0.05, this.ctx.currentTime);
        this.engineGain.connect(this.masterGain);

        this.oscLow = this.ctx.createOscillator();
        this.oscLow.type = 'sawtooth';
        this.oscLow.frequency.setValueAtTime(65, this.ctx.currentTime);

        this.oscHigh = this.ctx.createOscillator();
        this.oscHigh.type = 'square';
        this.oscHigh.frequency.setValueAtTime(130, this.ctx.currentTime);

        this.noiseNode = this.createNoiseNode();
        this.noiseFilter = this.ctx.createBiquadFilter();
        this.noiseFilter.type = 'bandpass';
        this.noiseFilter.frequency.setValueAtTime(400, this.ctx.currentTime);
        this.noiseFilter.Q.setValueAtTime(1.5, this.ctx.currentTime);

        this.oscLow.connect(this.engineGain);
        this.oscHigh.connect(this.engineGain);
        this.noiseNode.connect(this.noiseFilter);
        this.noiseFilter.connect(this.engineGain);

        this.oscLow.start();
        this.oscHigh.start();
        this.noiseNode.start();

        this.isInitialized = true;
    }

    createNoiseNode() {
        const bufferSize = this.ctx.sampleRate * 2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.3;
        const source = this.ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;
        return source;
    }

    update(throttle, airspeed, altitudeFt, vspeedFpm, aoa, isGrounded) {
        if (!this.isInitialized || this.ctx.state === 'suspended') return;

        const now = this.ctx.currentTime;
        const targetFreqLow = 60 + throttle * 180;
        const targetFreqHigh = 120 + throttle * 320;
        this.oscLow.frequency.setTargetAtTime(targetFreqLow, now, 0.1);
        this.oscHigh.frequency.setTargetAtTime(targetFreqHigh, now, 0.1);

        const filterFreq = 300 + airspeed * 4 + throttle * 600;
        this.noiseFilter.frequency.setTargetAtTime(filterFreq, now, 0.1);

        const gainVal = 0.05 + throttle * 0.25 + (airspeed / 500) * 0.1;
        this.engineGain.gain.setTargetAtTime(gainVal, now, 0.1);

        if (isGrounded && !this.wasOnGround && airspeed > 50) {
            this.playTouchdownSound();
        }
        this.wasOnGround = isGrounded;

        this.checkGPWS(altitudeFt, vspeedFpm, aoa);
    }

    playTouchdownSound() {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(80, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.3);

        gain.gain.setValueAtTime(0.6, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.3);

        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start();
        osc.stop(this.ctx.currentTime + 0.35);
    }

    checkGPWS(alt, vspeed, aoa) {
        const now = Date.now();
        if (now - this.lastWarningTime < 3000) return;

        if (aoa > 17) {
            this.speak("STALL");
            this.lastWarningTime = now;
        } else if (alt < 1000 && vspeed < -2500) {
            this.speak("PULL UP");
            this.lastWarningTime = now;
        } else if (alt < 500 && vspeed < -1200) {
            this.speak("SINK RATE");
            this.lastWarningTime = now;
        }
    }

    speak(text) {
        if (!window.speechSynthesis) return;
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'en-US';
        u.rate = 1.1;
        u.pitch = 0.8;
        window.speechSynthesis.speak(u);
    }
}
