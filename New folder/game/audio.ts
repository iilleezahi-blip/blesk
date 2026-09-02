/** Полностью процедурный WebAudio-движок: без ассетов, всё синтезируется. */
export class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  muted = false;

  // лазерный гул (непрерывный)
  private laserOsc: OscillatorNode | null = null;
  private laserSub: OscillatorNode | null = null;
  private laserGain: GainNode | null = null;
  private laserFilter: BiquadFilterNode | null = null;
  private sizzleGain: GainNode | null = null;
  private sizzleSrc: AudioBufferSourceNode | null = null;

  init() {
    if (this.ctx) {
      if (this.ctx.state === "suspended") this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.55;
      this.master.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 1.2;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.02);
    }
  }

  private env(gain: number, dur: number): GainNode | null {
    if (!this.ctx || !this.master) return null;
    const g = this.ctx.createGain();
    const t = this.ctx.currentTime;
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(this.master);
    return g;
  }

  private tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g);
    g.connect(this.master!);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  private noise(dur: number, gain: number, freq: number, q = 1, type: BiquadFilterType = "bandpass", slideTo?: number) {
    if (!this.ctx || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t0);
    if (slideTo !== undefined) f.frequency.exponentialRampToValueAtTime(Math.max(40, slideTo), t0 + dur);
    f.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f); f.connect(g); g.connect(this.master!);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /* ---------- инструменты ---------- */

  chink(intensity = 1) {
    const i = Math.min(1.4, intensity);
    this.tone(2200 + Math.random() * 700, 0.055, "triangle", 0.16 * i, 900);
    this.tone(3600 + Math.random() * 900, 0.04, "square", 0.05 * i, 1400);
    this.tone(340 + Math.random() * 80, 0.07, "sine", 0.1 * i, 120);
    this.noise(0.05, 0.12 * i, 5200, 2, "highpass");
  }

  /** сочный откол кусочка */
  pop() {
    this.tone(420 + Math.random() * 120, 0.09, "triangle", 0.14, 90);
    this.noise(0.06, 0.09, 3400, 0.5, "highpass");
    this.tone(1500 + Math.random() * 500, 0.05, "sine", 0.07, 2200);
  }

  /** мокрый шлепок */
  splat() {
    this.tone(220, 0.09, "sine", 0.1, 90);
    this.noise(0.12, 0.07, 1800, 0.7, "bandpass", 500);
    for (let i = 0; i < 3; i++) this.tone(500 + Math.random() * 700, 0.04, "sine", 0.04, 1200, 0.02 + i * 0.03);
  }

  thud() {
    this.tone(140, 0.09, "sine", 0.12, 60);
  }

  laserStart() {
    if (!this.ctx || !this.master || this.laserOsc) return;
    const t = this.ctx.currentTime;
    this.laserOsc = this.ctx.createOscillator();
    this.laserOsc.type = "sawtooth";
    this.laserOsc.frequency.value = 52;
    this.laserSub = this.ctx.createOscillator();
    this.laserSub.type = "sine";
    this.laserSub.frequency.value = 104;
    this.laserFilter = this.ctx.createBiquadFilter();
    this.laserFilter.type = "lowpass";
    this.laserFilter.frequency.value = 320;
    this.laserGain = this.ctx.createGain();
    this.laserGain.gain.value = 0;
    this.laserOsc.connect(this.laserFilter);
    this.laserSub.connect(this.laserFilter);
    this.laserFilter.connect(this.laserGain);
    this.laserGain.connect(this.master);
    this.laserOsc.start(t);
    this.laserSub.start(t);
    // шипение искр
    this.sizzleSrc = this.ctx.createBufferSource();
    this.sizzleSrc.buffer = this.noiseBuf;
    this.sizzleSrc.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 3400;
    f.Q.value = 0.8;
    this.sizzleGain = this.ctx.createGain();
    this.sizzleGain.gain.value = 0;
    this.sizzleSrc.connect(f); f.connect(this.sizzleGain); this.sizzleGain.connect(this.master);
    this.sizzleSrc.start(t);
  }

  laserUpdate(speedFrac: number, erasing: boolean, heat: number) {
    if (!this.ctx || !this.laserGain || !this.laserFilter || !this.sizzleGain) return;
    const t = this.ctx.currentTime;
    this.laserGain.gain.setTargetAtTime(0.075 + heat * 0.04, t, 0.05);
    this.laserFilter.frequency.setTargetAtTime(240 + speedFrac * 500 + heat * 300, t, 0.06);
    this.sizzleGain.gain.setTargetAtTime(erasing ? 0.045 + speedFrac * 0.02 : 0.004, t, 0.05);
  }

  laserActive() {
    return !!this.laserOsc;
  }

  laserStop() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    if (this.laserGain) {
      this.laserGain.gain.cancelScheduledValues(t);
      this.laserGain.gain.setTargetAtTime(0, t, 0.03);
    }
    if (this.sizzleGain) {
      this.sizzleGain.gain.cancelScheduledValues(t);
      this.sizzleGain.gain.setTargetAtTime(0, t, 0.02);
    }
    const osc = this.laserOsc, sub = this.laserSub, sizzle = this.sizzleSrc;
    setTimeout(() => {
      try { osc?.stop(); sub?.stop(); sizzle?.stop(); } catch {}
    }, 180);
    // сразу обнуляем ссылки: лазер считается выключенным мгновенно
    this.laserOsc = null; this.laserSub = null; this.sizzleSrc = null;
    this.laserGain = null; this.sizzleGain = null; this.laserFilter = null;
  }

  alarm() {
    this.tone(220, 0.42, "square", 0.09, 130);
    this.tone(165, 0.42, "square", 0.07, 90, 0.02);
    this.noise(0.3, 0.05, 900, 1, "bandpass", 300);
  }

  /** мягкий воздушный «пшик» пены */
  foamStamp() {
    this.noise(0.09, 0.05, 5200 + Math.random() * 1800, 0.8, "highpass");
    this.tone(1200 + Math.random() * 600, 0.05, "sine", 0.02, 1800, 0.01);
  }

  /** лопающийся пузырёк — только вверх, никогда вниз */
  bubble() {
    this.tone(700 + Math.random() * 400, 0.06, "sine", 0.04, 1400 + Math.random() * 500);
    this.noise(0.03, 0.015, 6000, 1, "highpass", undefined);
  }

  /** чистый «шшшх» резины по стеклу: быстрый highpass-шум, без низких частот */
  swish() {
    this.noise(0.16, 0.14, 4800, 0.7, "highpass");
    this.noise(0.1, 0.06, 7000, 0.8, "highpass", undefined);
  }

  /** мягкий «пшик» смыва — чуть длиннее, чем обычный взмах */
  wipe() {
    this.noise(0.22, 0.1, 5000, 0.7, "highpass");
    this.tone(1600 + Math.random() * 400, 0.05, "sine", 0.015, 2200, 0.015);
  }

  snapClean() {
    const notes = [1318, 1760, 2637, 3520];
    notes.forEach((n, i) => this.tone(n, 0.5 - i * 0.07, "sine", 0.12, undefined, i * 0.07));
    this.noise(0.7, 0.05, 7000, 1, "highpass");
    this.tone(659, 0.9, "triangle", 0.1, 660, 0.05);
  }

  tick() {
    this.tone(2100, 0.022, "square", 0.06, 1600);
    this.noise(0.02, 0.04, 4200, 2, "highpass");
  }

  tock() {
    this.tone(1400, 0.03, "square", 0.05, 1000);
  }

  jingle() {
    const seq = [523, 659, 784, 1047, 784, 1047];
    seq.forEach((n, i) => this.tone(n, 0.12, "square", 0.06, undefined, i * 0.09));
  }

  blip(freq = 880) {
    this.tone(freq, 0.07, "square", 0.07, freq * 0.98);
  }

  /** звенящее комбо — тон растёт с серией */
  comboPop(n: number) {
    const f = 520 + Math.min(12, n) * 70;
    this.tone(f, 0.09, "square", 0.09, f * 1.02);
    this.tone(f * 1.5, 0.06, "sine", 0.05, f * 1.5, 0.015);
  }

  /** лёгкий сухой скрежет скребка (при удержании) — только высокие частоты */
  scrape() {
    this.noise(0.06, 0.04, 3000 + Math.random() * 1200, 0.6, "highpass");
    if (Math.random() < 0.3) this.tone(2400 + Math.random() * 800, 0.03, "triangle", 0.015);
  }

  /** сочный «штамп» за готовый слой */
  stampHit() {
    this.tone(190, 0.16, "sine", 0.22, 70);
    this.noise(0.05, 0.14, 2400, 0.8, "lowpass", 900);
    this.tone(660, 0.1, "triangle", 0.09, 880, 0.04);
    this.tone(990, 0.14, "triangle", 0.07, 1320, 0.1);
  }

  /** мягкий дым/пшик */
  poof() {
    this.noise(0.18, 0.06, 900, 0.35, "lowpass", 300);
  }

  /** сухой неприятный «хрусть» — треснула эмаль */
  crack() {
    this.noise(0.09, 0.16, 2800, 1.2, "bandpass", 700);
    this.tone(180, 0.08, "square", 0.09, 70, 0.01);
    this.tone(90, 0.12, "sine", 0.12, 55, 0.02);
  }

  powerDown() {
    this.tone(600, 0.25, "square", 0.06, 120);
  }

  chime() {
    const t = this.ctx?.currentTime ?? 0;
    [1568, 2093, 3136].forEach((n, i) => this.tone(n, 1.1 - i * 0.15, "sine", 0.09, undefined, i * 0.012));
    this.noise(0.9, 0.03, 8200, 1, "highpass");
    void t;
  }

  bassDrop() {
    this.tone(58, 0.6, "sine", 0.5, 40);
    this.tone(116, 0.4, "triangle", 0.2, 70);
    this.noise(0.5, 0.1, 300, 0.6, "lowpass", 80);
  }

  coin() {
    this.tone(1760, 0.09, "square", 0.07);
    this.tone(2350, 0.16, "square", 0.07, undefined, 0.07);
  }

  ui() {
    this.tone(940, 0.045, "triangle", 0.06, 700);
  }

  unlock() {
    this.tone(660, 0.08, "triangle", 0.08);
    this.tone(990, 0.12, "triangle", 0.08, undefined, 0.07);
  }

  windRatchet() {
    this.tone(1800 + Math.random() * 500, 0.02, "square", 0.035, 1200);
  }

  /** зажигалка: чирк кремня + вспыхнувшее пламя */
  flameIgnite() {
    this.noise(0.12, 0.08, 4200, 1, "highpass");
    this.noise(0.5, 0.1, 900, 0.6, "bandpass", 300);
    this.tone(220, 0.35, "sine", 0.07, 90);
  }

  /** лёгкий треск горящего пламени */
  flameCrackle() {
    this.noise(0.04, 0.028, 3200 + Math.random() * 1800, 1, "highpass");
  }

  /** горсть монет */
  coinBurst() {
    for (let i = 0; i < 9; i++)
      this.tone(1900 + Math.random() * 1600, 0.09, "triangle", 0.07, 1200, i * 0.05);
    this.noise(0.3, 0.05, 6000, 1, "highpass");
  }

  /** хрустальный звон с высотой (0..1) */
  chimeNote(k: number) {
    const f = 1150 + k * 900;
    this.tone(f, 0.5, "sine", 0.11, f * 1.01);
    this.tone(f * 2.02, 0.35, "sine", 0.05, f * 2);
    this.tone(f * 0.5, 0.4, "triangle", 0.05, f * 0.5);
  }

  /** скрип открывающейся крышки */
  creak() {
    this.tone(120, 0.3, "sawtooth", 0.05, 220);
    this.tone(90, 0.25, "sine", 0.05, 60, 0.05);
  }

  /** щелчок механизма (универсальный) */
  mechClick(pitch = 1) {
    this.tone(900 * pitch, 0.03, "square", 0.07, 500 * pitch);
    this.noise(0.03, 0.06, 3800, 1, "highpass");
  }

  shutter() {
    this.noise(0.05, 0.12, 2600, 1.4, "bandpass");
    this.tone(300, 0.06, "square", 0.06, 150, 0.03);
  }

  /* ====== новые коллекции ====== */
  quack() {
    this.tone(420, 0.12, "sawtooth", 0.07, 260);
    this.tone(520, 0.09, "sawtooth", 0.05, 320, 0.05);
  }
  cuckoo() {
    this.tone(780, 0.14, "triangle", 0.09, undefined, 0);
    this.tone(620, 0.16, "triangle", 0.09, undefined, 0.16);
  }
  phoneRing() {
    for (let i = 0; i < 2; i++) {
      this.tone(1400, 0.09, "square", 0.05, undefined, i * 0.22);
      this.tone(1760, 0.09, "square", 0.05, undefined, i * 0.22 + 0.02);
    }
  }
  radioStatic() {
    this.noise(0.12, 0.05, 2400, 0.5, "bandpass", 1400);
  }
  tvStatic() {
    this.noise(0.18, 0.08, 3400, 0.6, "bandpass", 2200);
  }
  bell() {
    this.tone(1046, 0.3, "sine", 0.08, undefined, 0);
    this.tone(2093, 0.18, "sine", 0.04, undefined, 0.01);
  }
  horn(freq = 330) {
    this.tone(freq, 0.35, "sawtooth", 0.05, freq * 1.01);
    this.tone(freq * 2, 0.2, "triangle", 0.02, undefined, 0.02);
  }
  splash() {
    this.noise(0.2, 0.1, 1200, 0.6, "lowpass", 400);
    this.tone(300, 0.15, "sine", 0.05, 900, 0.03);
  }
  boing() {
    this.tone(140, 0.3, "sine", 0.1, 420);
    this.tone(210, 0.2, "sine", 0.06, 640, 0.05);
  }
  crank() {
    this.tone(900 + Math.random() * 300, 0.03, "square", 0.04, 600);
  }
  musicNote(i: number) {
    const scale = [523, 587, 659, 698, 784, 880, 988, 1047];
    const f = scale[Math.abs(i) % scale.length];
    this.tone(f, 0.22, "triangle", 0.07, undefined, 0);
    this.tone(f / 2, 0.22, "sine", 0.04, undefined, 0);
  }
}
