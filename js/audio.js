export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicGain = null;
    this.sfxGain = null;
    this.started = false;
    this._noise = null;
    this._timer = null;
  }

  async ensure() {
    if (this.ctx) return;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        this.enabled = false;
        return;
      }
      this.ctx = new AC();
      this.musicGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.14;
      this.sfxGain.gain.value = 0.3;
      this.musicGain.connect(this.ctx.destination);
      this.sfxGain.connect(this.ctx.destination);

      const len = Math.floor(this.ctx.sampleRate * 0.05);
      this._noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const data = this._noise.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    } catch {
      this.enabled = false;
      this.ctx = null;
    }
  }

  async unlock() {
    try {
      await this.ensure();
      if (!this.ctx) return;
      if (this.ctx.state === "suspended") {
        await Promise.race([
          this.ctx.resume(),
          new Promise((r) => setTimeout(r, 400)),
        ]);
      }
    } catch {
      // Nunca trava o toque do usuário no mobile
    }
  }

  tone(freq, dur = 0.08, type = "square", gain = 0.2) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  jump() { this.tone(520, 0.06, "square", 0.14); }
  death() { this.tone(160, 0.22, "sawtooth", 0.2); }
  orb() { this.tone(720, 0.07, "triangle", 0.12); }
  coin() {
    this.tone(880, 0.05, "sine", 0.12);
    this.tone(1320, 0.06, "triangle", 0.08);
  }
  portal() { this.tone(300, 0.1, "triangle", 0.1); }
  click() { this.tone(400, 0.03, "triangle", 0.08); }
  win() {
    [523, 659, 784].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.12, "square", 0.12), i * 90);
    });
  }

  startMusic(bpm = 140) {
    if (!this.ctx || this.started) return;
    this.started = true;
    const beat = 60 / bpm;
    let step = 0;
    const scale = [0, 3, 5, 7, 10, 12];
    const base = 110;

    const tick = () => {
      if (!this.started || !this.enabled) return;
      const t = this.ctx.currentTime;
      const note = base * Math.pow(2, scale[step % scale.length] / 12);

      // Lighter music: fewer layered voices
      this.pulse(note, beat * 0.55, 0.04);
      if (step % 4 === 0) this.kick(t);
      if (step % 8 === 4) this.hat(t);

      step++;
      this._timer = setTimeout(tick, beat * 1000);
    };
    tick();
  }

  pulse(freq, dur, gain) {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "square";
    o.frequency.value = freq;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  kick(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(120, t);
    o.frequency.exponentialRampToValueAtTime(50, t + 0.12);
    g.gain.setValueAtTime(0.28, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.14);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.16);
  }

  hat(t) {
    if (!this._noise) return;
    const noise = this.ctx.createBufferSource();
    noise.buffer = this._noise;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.04, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.connect(g);
    g.connect(this.musicGain);
    noise.start(t);
    noise.stop(t + 0.05);
  }

  stopMusic() {
    this.started = false;
    clearTimeout(this._timer);
  }
}
