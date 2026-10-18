import * as THREE from 'three';

export interface ToneHandle { stop(): void; setGain(g: number): void }

/**
 * Master volume, generated sounds (tones, chimes, murmur), clip playback and speech.
 * The AudioContext starts on the first user click (browsers require a gesture).
 */
export class AudioManager {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  volume = 0.6;
  onCaption: (text: string | null) => void = () => {};

  init(): void {
    if (this.ctx) { void this.ctx.resume(); return; }
    this.ctx = new AudioContext();
    this.master = this.ctx.createGain();
    this.master.gain.value = this.volume;
    this.master.connect(this.ctx.destination);
  }

  setVolume(v: number): void {
    this.volume = v;
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** Continuous sine tone. Gain is hard-capped at 0.15 to protect ears. */
  tone(freq: number, gain = 0.05, wobble = 0): ToneHandle {
    if (!this.ctx || !this.master) return { stop() {}, setGain() {} };
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = 0;
    g.gain.setTargetAtTime(Math.min(gain, 0.15), ctx.currentTime, 0.4);
    let lfo: OscillatorNode | null = null;
    if (wobble > 0) {
      lfo = ctx.createOscillator();
      lfo.frequency.value = 0.3;
      const lg = ctx.createGain();
      lg.gain.value = wobble;
      lfo.connect(lg).connect(osc.frequency);
      lfo.start();
    }
    osc.connect(g).connect(this.master);
    osc.start();
    return {
      stop: () => { g.gain.setTargetAtTime(0, ctx.currentTime, 0.1); osc.stop(ctx.currentTime + 0.5); lfo?.stop(ctx.currentTime + 0.5); },
      setGain: (v) => g.gain.setTargetAtTime(Math.min(v, 0.15), ctx.currentTime, 0.1),
    };
  }

  /** Soft background murmur (filtered noise), e.g. for a café. */
  murmur(gain = 0.08): ToneHandle {
    if (!this.ctx || !this.master) return { stop() {}, setGain() {} };
    const ctx = this.ctx;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 500;
    f.Q.value = 0.8;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(f).connect(g).connect(this.master);
    src.start();
    return { stop: () => src.stop(), setGain: (v) => g.gain.setTargetAtTime(v, ctx.currentTime, 0.1) };
  }

  /**
   * A short breathy whisper (filtered noise shaped into syllables), panned from
   * left (-1) to right (1). Pair it with captioned speech for the words.
   */
  whisper(pan = 0, gain = 0.05, dur = 1.4): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    const rate = 2.5 + Math.random() * 1.5;
    for (let i = 0; i < len; i++) {
      const s = i / ctx.sampleRate;
      const syllable = Math.max(0, Math.sin(s * Math.PI * 2 * rate)) ** 2;
      d[i] = (Math.random() * 2 - 1) * syllable * Math.sin((Math.PI * i) / len);
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.frequency.value = 2400;
    f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.value = Math.min(gain, 0.12);
    const p = ctx.createStereoPanner();
    p.pan.value = Math.max(-1, Math.min(1, pan));
    src.connect(f).connect(g).connect(p).connect(this.master);
    src.start();
  }

  /** A short, soft bell placed in 3D space. */
  chimeAt(pos: THREE.Vector3, gain = 0.25): void {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const panner = ctx.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    panner.refDistance = 1;
    panner.positionX.value = pos.x;
    panner.positionY.value = pos.y;
    panner.positionZ.value = pos.z;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(gain, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
    for (const [f, a] of [[880, 1], [1320, 0.4]] as const) {
      const o = ctx.createOscillator();
      o.frequency.value = f;
      const og = ctx.createGain();
      og.gain.value = a;
      o.connect(og).connect(g);
      o.start(t);
      o.stop(t + 1.3);
    }
    g.connect(panner).connect(this.master);
  }

  /** Keep the Web Audio listener in sync with the camera for 3D sound. */
  updateListener(camera: THREE.Camera): void {
    if (!this.ctx) return;
    const l = this.ctx.listener;
    const p = camera.position;
    const f = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
    if (l.positionX) {
      l.positionX.value = p.x; l.positionY.value = p.y; l.positionZ.value = p.z;
      l.forwardX.value = f.x; l.forwardY.value = f.y; l.forwardZ.value = f.z;
      l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0;
    } else {
      l.setPosition(p.x, p.y, p.z);
      l.setOrientation(f.x, f.y, f.z, 0, 1, 0);
    }
  }

  /** Play a recorded clip from /public/audio. Missing files fail silently. */
  clip(src: string, volume = 1): HTMLAudioElement {
    const a = new Audio(src);
    a.volume = Math.min(1, volume * this.volume);
    a.play().catch(() => {});
    return a;
  }

  /** Speech synthesis with a caption. Used as a fallback for recorded voices. */
  speak(text: string, opts: { pitch?: number; rate?: number; caption?: boolean; volume?: number } = {}): void {
    if (opts.caption !== false) this.onCaption(text);
    if (!('speechSynthesis' in window)) return;
    const u = new SpeechSynthesisUtterance(text);
    u.pitch = opts.pitch ?? 1;
    u.rate = opts.rate ?? 1;
    u.volume = this.volume * Math.min(1, opts.volume ?? 1);
    u.onend = () => this.onCaption(null);
    speechSynthesis.speak(u);
  }

  stopSpeech(): void {
    if ('speechSynthesis' in window) speechSynthesis.cancel();
    this.onCaption(null);
  }
}
