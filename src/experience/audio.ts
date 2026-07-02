"use client";

/**
 * Procedural audio engine — no audio files, everything is synthesized
 * with WebAudio so the bundle stays light and nothing needs licensing.
 *
 * All entry points are safe to call before init(); they just no-op.
 * init() must be called from a user gesture (we call it on power-on).
 */

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private humGain: GainNode | null = null;
  private musicNodes: { stop: () => void } | null = null;
  private enabled = true;

  init() {
    if (this.ctx) return;
    try {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.6;
      this.master.connect(this.ctx.destination);
    } catch {
      this.ctx = null;
    }
  }

  setEnabled(on: boolean) {
    this.enabled = on;
    if (this.master && this.ctx) {
      this.master.gain.linearRampToValueAtTime(
        on ? 0.6 : 0,
        this.ctx.currentTime + 0.2,
      );
    }
  }

  /** Low electric hum + air — the venue's noise floor. */
  startHum() {
    if (!this.ctx || !this.master || this.humGain) return;
    const ctx = this.ctx;
    this.humGain = ctx.createGain();
    this.humGain.gain.value = 0;
    this.humGain.connect(this.master);

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    osc.frequency.value = 50;
    const oscFilter = ctx.createBiquadFilter();
    oscFilter.type = "lowpass";
    oscFilter.frequency.value = 120;
    const oscGain = ctx.createGain();
    oscGain.gain.value = 0.05;
    osc.connect(oscFilter).connect(oscGain).connect(this.humGain);
    osc.start();

    // filtered noise = air handling / crowd murmur
    const noise = this.noiseSource();
    const nFilter = ctx.createBiquadFilter();
    nFilter.type = "bandpass";
    nFilter.frequency.value = 400;
    nFilter.Q.value = 0.4;
    const nGain = ctx.createGain();
    nGain.gain.value = 0.02;
    noise.connect(nFilter).connect(nGain).connect(this.humGain);
    noise.start();

    this.humGain.gain.linearRampToValueAtTime(1, ctx.currentTime + 2.5);
  }

  /** Big cinematic power-on: sub thump, rising sweep, relay clicks. */
  powerOn() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;

    // sub thump
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.setValueAtTime(120, t);
    sub.frequency.exponentialRampToValueAtTime(30, t + 0.9);
    const subG = ctx.createGain();
    subG.gain.setValueAtTime(0.9, t);
    subG.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    sub.connect(subG).connect(this.master);
    sub.start(t);
    sub.stop(t + 1.3);

    // rising sweep = capacitors charging
    const sweep = ctx.createOscillator();
    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(60, t + 0.15);
    sweep.frequency.exponentialRampToValueAtTime(880, t + 2.2);
    const swFilter = ctx.createBiquadFilter();
    swFilter.type = "lowpass";
    swFilter.frequency.setValueAtTime(200, t);
    swFilter.frequency.exponentialRampToValueAtTime(4000, t + 2.2);
    const swG = ctx.createGain();
    swG.gain.setValueAtTime(0.0001, t + 0.15);
    swG.gain.exponentialRampToValueAtTime(0.12, t + 1.2);
    swG.gain.exponentialRampToValueAtTime(0.001, t + 2.6);
    sweep.connect(swFilter).connect(swG).connect(this.master);
    sweep.start(t + 0.15);
    sweep.stop(t + 2.7);

    // relay clicks as banks come online
    for (let i = 0; i < 6; i++) this.click(t + 0.4 + i * 0.28, 0.5 + i * 0.1);
  }

  /** Short mechanical click (relays, UI, hydraulic latches). */
  click(when?: number, pitch = 1) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = when ?? ctx.currentTime;
    const noise = this.noiseSource(0.06);
    const f = ctx.createBiquadFilter();
    f.type = "bandpass";
    f.frequency.value = 1800 * pitch;
    f.Q.value = 6;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.35, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.07);
    noise.connect(f).connect(g).connect(this.master);
    noise.start(t);
  }

  /** Soft UI blip for hovers/toggles. */
  blip(pitch = 1) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(700 * pitch, t);
    o.frequency.exponentialRampToValueAtTime(1100 * pitch, t + 0.07);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + 0.15);
  }

  /** Hydraulic hiss + metal groan for the vault. */
  hydraulics() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const noise = this.noiseSource(1.6);
    const f = ctx.createBiquadFilter();
    f.type = "highpass";
    f.frequency.setValueAtTime(3000, t);
    f.frequency.exponentialRampToValueAtTime(800, t + 1.4);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.18, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    noise.connect(f).connect(g).connect(this.master);
    noise.start(t);

    const groan = ctx.createOscillator();
    groan.type = "sawtooth";
    groan.frequency.setValueAtTime(90, t);
    groan.frequency.linearRampToValueAtTime(55, t + 1.2);
    const gf = ctx.createBiquadFilter();
    gf.type = "lowpass";
    gf.frequency.value = 300;
    const gg = ctx.createGain();
    gg.gain.setValueAtTime(0.12, t);
    gg.gain.exponentialRampToValueAtTime(0.001, t + 1.3);
    groan.connect(gf).connect(gg).connect(this.master);
    groan.start(t);
    groan.stop(t + 1.4);
  }

  /** Firework: launch whistle + crackle burst. */
  firework() {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const whistle = ctx.createOscillator();
    whistle.type = "sine";
    whistle.frequency.setValueAtTime(400, t);
    whistle.frequency.exponentialRampToValueAtTime(1400, t + 0.5);
    const wg = ctx.createGain();
    wg.gain.setValueAtTime(0.05, t);
    wg.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
    whistle.connect(wg).connect(this.master);
    whistle.start(t);
    whistle.stop(t + 0.6);

    const burst = this.noiseSource(0.7);
    const bf = ctx.createBiquadFilter();
    bf.type = "lowpass";
    bf.frequency.setValueAtTime(6000, t + 0.55);
    bf.frequency.exponentialRampToValueAtTime(400, t + 1.2);
    const bg = ctx.createGain();
    bg.gain.setValueAtTime(0.0001, t);
    bg.gain.setValueAtTime(0.5, t + 0.55);
    bg.gain.exponentialRampToValueAtTime(0.001, t + 1.25);
    burst.connect(bf).connect(bg).connect(this.master);
    burst.start(t);
  }

  /** Calm generative pad loop (M key). */
  setMusic(on: boolean) {
    if (!this.ctx || !this.master) return;
    if (!on) {
      this.musicNodes?.stop();
      this.musicNodes = null;
      return;
    }
    if (this.musicNodes) return;
    const ctx = this.ctx;
    const bus = ctx.createGain();
    bus.gain.value = 0;
    const f = ctx.createBiquadFilter();
    f.type = "lowpass";
    f.frequency.value = 900;
    bus.connect(f).connect(this.master);
    bus.gain.linearRampToValueAtTime(0.16, ctx.currentTime + 3);

    // slow minor-ish pad: root, fifth, ninth — detuned pairs
    const freqs = [110, 164.81, 246.94, 220];
    const oscs: OscillatorNode[] = [];
    freqs.forEach((fr, i) => {
      for (const det of [-4, 4]) {
        const o = ctx.createOscillator();
        o.type = "triangle";
        o.frequency.value = fr;
        o.detune.value = det + i;
        const g = ctx.createGain();
        g.gain.value = 0.22;
        // slow independent swells so the pad breathes
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.05 + i * 0.023;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 0.12;
        lfo.connect(lfoG).connect(g.gain);
        lfo.start();
        o.connect(g).connect(bus);
        o.start();
        oscs.push(o, lfo as unknown as OscillatorNode);
      }
    });
    this.musicNodes = {
      stop: () => {
        bus.gain.linearRampToValueAtTime(0, ctx.currentTime + 1.2);
        setTimeout(() => oscs.forEach((o) => o.stop()), 1400);
      },
    };
  }

  private noiseSource(duration = 2): AudioBufferSourceNode {
    const ctx = this.ctx!;
    const buffer = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    return src;
  }
}

export const audio = new AudioEngine();
