export class AudioEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.musicGain = null;
    this.sfxGain = null;
    this.musicNodes = [];
    this.started = false;
  }

  async ensure() {
    if (this.ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AC();
    this.musicGain = this.ctx.createGain();
    this.sfxGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.18;
    this.sfxGain.gain.value = 0.35;
    this.musicGain.connect(this.ctx.destination);
    this.sfxGain.connect(this.ctx.destination);
  }

  async unlock() {
    await this.ensure();
    if (this.ctx.state === "suspended") await this.ctx.resume();
  }

  tone(freq, dur = 0.08, type = "square", gain = 0.2, dest = null) {
    if (!this.enabled || !this.ctx) return;
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g);
    g.connect(dest || this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  jump() {
    this.tone(520, 0.07, "square", 0.18);
    this.tone(780, 0.05, "triangle", 0.1);
  }

  death() {
    this.tone(180, 0.2, "sawtooth", 0.25);
    this.tone(90, 0.35, "square", 0.2);
  }

  orb() {
    this.tone(660, 0.06, "sine", 0.15);
    this.tone(990, 0.08, "triangle", 0.12);
  }

  portal() {
    this.tone(220, 0.12, "sawtooth", 0.12);
    this.tone(440, 0.18, "triangle", 0.1);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => {
      setTimeout(() => this.tone(f, 0.15, "square", 0.16), i * 90);
    });
  }

  click() {
    this.tone(400, 0.04, "triangle", 0.1);
  }

  startMusic(bpm = 140) {
    if (!this.ctx || this.started) return;
    this.started = true;
    const beat = 60 / bpm;
    let step = 0;
    const scale = [0, 3, 5, 7, 10, 12, 15, 17];
    const base = 110;

    const tick = () => {
      if (!this.started || !this.enabled) return;
      const t = this.ctx.currentTime;
      const note = base * Math.pow(2, scale[step % scale.length] / 12);
      const bass = base * Math.pow(2, scale[(step + 4) % scale.length] / 12) / 2;

      this.pulse(note, beat * 0.7, 0.05);
      if (step % 2 === 0) this.pulse(bass, beat * 0.9, 0.07, "sawtooth");
      if (step % 4 === 0) this.kick(t);
      if (step % 4 === 2) this.hat(t);

      step++;
      this._timer = setTimeout(tick, beat * 1000);
    };
    tick();
  }

  pulse(freq, dur, gain, type = "square") {
    const t = this.ctx.currentTime;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const f = this.ctx.createBiquadFilter();
    o.type = type;
    o.frequency.value = freq;
    f.type = "lowpass";
    f.frequency.value = 1800;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(f);
    f.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  kick(t) {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.15);
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g);
    g.connect(this.musicGain);
    o.start(t);
    o.stop(t + 0.2);
  }

  hat(t) {
    const bufferSize = 2 * this.ctx.sampleRate;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const f = this.ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.value = 6000;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.05, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    noise.connect(f);
    f.connect(g);
    g.connect(this.musicGain);
    noise.start(t);
    noise.stop(t + 0.06);
  }

  stopMusic() {
    this.started = false;
    clearTimeout(this._timer);
  }
}
