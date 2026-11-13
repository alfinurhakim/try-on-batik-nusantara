import type { MusicStyleId } from '../types';

/**
 * Mesin gamelan sintetis berbasis Web Audio.
 * Semua bunyi dibuat dari osilator & noise (tanpa rekaman), jadi bebas lisensi.
 * Strukturnya sengaja sederhana supaya nanti mudah diganti file rekaman asli per provinsi.
 */

export type SfxName = 'gong' | 'kenong' | 'bonang' | 'chime' | 'tick' | 'shutter' | 'stamp' | 'wind' | 'whoosh';

type Lead = 'saron' | 'gambang' | 'suling' | 'saronen' | 'bonang';

interface StyleDef {
  bpm: number;
  /** nada dalam cent relatif terhadap nada dasar */
  scale: number[];
  base: number;
  melody: number[];
  lead: Lead;
  /** lapisan kedua: rebab/tehyan yang menggandakan melodi satu oktaf di atas */
  second?: 'tehyan' | 'suling' | 'bonang';
  gongEvery: number;
  kenongEvery: number;
  /** pola kendang/bedug per langkah: B=dhung, t=tak, k=ket, D=bedug, x=pinggir bedug, c=kecrek, .=diam */
  drum: string;
  leadGain: number;
}

const SLENDRO = [0, 240, 480, 720, 960];
const PELOG = [0, 120, 270, 540, 670, 785, 950];
const DEGUNG = [0, 115, 500, 700, 815];
const PENTATONIK = [0, 200, 400, 700, 900];

const STYLES: Record<MusicStyleId, StyleDef> = {
  ambient: {
    bpm: 46, scale: SLENDRO, base: 261.6, lead: 'saron', leadGain: 0.22,
    melody: [2, -1, 3, -1, 2, -1, 1, -1, 2, -1, 4, -1, 3, -1, 1, -1, 0, -1, 1, -1, 2, -1, 3, -1, 2, -1, 1, -1, 0, -1, -1, -1],
    gongEvery: 32, kenongEvery: 16, drum: '................................',
  },
  'gamelan-jateng': {
    bpm: 62, scale: PELOG, base: 261.6, lead: 'saron', second: 'bonang', leadGain: 0.3,
    melody: [2, 1, 2, 3, 5, 3, 2, 1, 3, 2, 1, 0, 1, 2, 3, 2, 5, 6, 5, 3, 2, 3, 5, 6, 7, 6, 5, 3, 2, 1, 2, 0],
    gongEvery: 32, kenongEvery: 8, drum: 'B...t.B.B...t.k.',
  },
  'gamelan-jogja': {
    bpm: 54, scale: SLENDRO, base: 246.9, lead: 'saron', second: 'bonang', leadGain: 0.32,
    melody: [1, 2, 1, 0, 2, 3, 2, 1, 3, 4, 3, 2, 1, 2, 1, 0, 0, 1, 2, 3, 5, 3, 2, 1, 2, 3, 2, 1, 0, 1, 0, -1],
    gongEvery: 32, kenongEvery: 8, drum: 'B.......t...B.k.',
  },
  degung: {
    bpm: 70, scale: DEGUNG, base: 293.7, lead: 'bonang', second: 'suling', leadGain: 0.26,
    melody: [4, 3, 2, 3, 4, -1, 2, 1, 0, 1, 2, -1, 3, 2, 1, -1, 1, 2, 3, 4, 5, 4, 3, -1, 2, 3, 2, 1, 0, -1, -1, -1],
    gongEvery: 32, kenongEvery: 16, drum: 'B..k.t..B..t.k..',
  },
  'gambang-kromong': {
    bpm: 98, scale: PENTATONIK, base: 293.7, lead: 'gambang', second: 'tehyan', leadGain: 0.3,
    melody: [0, 1, 2, 4, 3, 2, 1, 2, 4, 5, 4, 3, 2, 1, 0, -1, 2, 2, 3, 4, 5, 6, 5, 4, 3, 2, 3, 1, 0, 1, 0, -1],
    gongEvery: 32, kenongEvery: 8, drum: 'B.c.t.c.B.c.tkc.',
  },
  'rampak-bedug': {
    bpm: 108, scale: SLENDRO, base: 220, lead: 'saron', leadGain: 0.18,
    melody: [0, -1, 2, -1, 3, -1, 2, -1, 1, -1, 2, -1, 0, -1, -1, -1, 3, -1, 4, -1, 3, -1, 2, -1, 1, -1, 0, -1, 1, -1, -1, -1],
    gongEvery: 32, kenongEvery: 16, drum: 'D.xDD.x.D.xD.Dx.',
  },
  'gamelan-jatim': {
    bpm: 96, scale: PELOG, base: 277.2, lead: 'saron', second: 'tehyan', leadGain: 0.28,
    melody: [3, 2, 3, 5, 6, 5, 3, 2, 1, 2, 3, 2, 1, 0, 1, 2, 5, 6, 7, 6, 5, 3, 5, 6, 3, 2, 1, 2, 3, 5, 3, 2],
    gongEvery: 16, kenongEvery: 4, drum: 'B.tkB.tkB.tkBtk.',
  },
};

export const MUSIC_LABELS: Record<MusicStyleId, string> = {
  ambient: 'Gamelan latar',
  'gamelan-jateng': 'Gamelan Jawa Tengah',
  'gamelan-jogja': 'Gamelan Yogyakarta',
  degung: 'Degung Sunda',
  'gambang-kromong': 'Gambang kromong',
  'rampak-bedug': 'Rampak bedug',
  'gamelan-jatim': 'Gamelan Jawa Timuran',
};

class GamelanEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private dry!: GainNode;
  private wet!: GainNode;
  private noiseBuf!: AudioBuffer;
  private styleId: MusicStyleId = 'ambient';
  private style: StyleDef = STYLES.ambient;
  private step = 0;
  private nextTime = 0;
  private timer: number | null = null;
  private muted = false;
  private volume = 0.7;
  private ducked = false;

  get started() {
    return this.ctx !== null;
  }

  /** Harus dipanggil dari aksi pengguna (klik) karena aturan autoplay browser. */
  async start(style: MusicStyleId = this.styleId) {
    if (!this.ctx) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
      this.dry = this.ctx.createGain();
      this.dry.gain.value = 0.85;
      this.wet = this.ctx.createGain();
      this.wet.gain.value = 0.32;
      const verb = this.ctx.createConvolver();
      verb.buffer = this.makeImpulse(2.8);
      this.dry.connect(this.master);
      this.wet.connect(verb);
      verb.connect(this.master);
      this.noiseBuf = this.makeNoise();
    }
    await this.ctx.resume();
    this.setStyle(style, true);
    if (this.timer === null) {
      this.nextTime = this.ctx.currentTime + 0.1;
      this.timer = window.setInterval(() => this.schedule(), 25);
    }
  }

  setStyle(id: MusicStyleId, immediate = false) {
    if (id === this.styleId && !immediate) return;
    this.styleId = id;
    if (!this.ctx) return;
    const swap = () => {
      this.style = STYLES[id];
      this.step = 0;
    };
    if (immediate) {
      swap();
      return;
    }
    // pudar keluar → ganti gaya → pudar masuk
    const g = this.master.gain;
    const now = this.ctx.currentTime;
    const v = this.muted ? 0 : this.volume;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(0.0001, now + 0.5);
    window.setTimeout(() => {
      swap();
      if (!this.ctx) return;
      this.nextTime = Math.max(this.nextTime, this.ctx.currentTime + 0.05);
      const t = this.ctx.currentTime;
      g.cancelScheduledValues(t);
      g.setValueAtTime(0.0001, t);
      g.linearRampToValueAtTime(this.muted ? 0 : v, t + 0.8);
    }, 520);
  }

  setMuted(m: boolean) {
    this.muted = m;
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(m ? 0 : this.volume, now, 0.08);
  }

  isMuted() {
    return this.muted;
  }

  /** Kecilkan musik sementara (mis. saat narasi suara). */
  setDuck(on: boolean) {
    this.ducked = on;
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(on ? this.volume * 0.25 : this.volume, now, 0.15);
  }

  /** Efek suara untuk setiap aksi pengguna. Ikut volume & mute musik. */
  sfx(name: SfxName) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + 0.02;
    const st = this.style;
    switch (name) {
      case 'gong':
        this.gong(t, 0.9);
        break;
      case 'kenong':
        this.kenong(196, t, 0.45);
        this.bonang(392, t + 0.02, 0.12);
        break;
      case 'bonang':
        [0, 2, 4].forEach((n, i) => this.bonang(this.freq(st, n, 1), t + i * 0.08, 0.2));
        break;
      case 'chime':
        [0, 1, 2, 3, 4, 5].forEach((n, i) => this.partials(this.freq(st, n, 2), t + i * 0.07, [[1, 1, 1.2], [2.76, 0.3, 0.4]], 0.1));
        break;
      case 'tick':
        this.partials(this.freq(st, 2, 1), t, [[1, 1, 0.35], [2.76, 0.2, 0.1]], 0.05);
        break;
      case 'shutter':
        this.noise(t, 0.001, 0.035, 'highpass', 2500, 0.55);
        this.noise(t + 0.07, 0.001, 0.05, 'bandpass', 1600, 0.45, 1.5);
        break;
      case 'stamp':
        this.drumTone(t, 130, 48, 0.45, 0.9);
        this.noise(t, 0.001, 0.09, 'lowpass', 900, 0.6);
        break;
      case 'wind':
        this.windSweep(t, 1.5, 0.35);
        break;
      case 'whoosh':
        this.windSweep(t, 0.45, 0.25);
        break;
    }
  }

  private windSweep(t: number, dur: number, gain: number) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 0.9;
    bp.frequency.setValueAtTime(280, t);
    bp.frequency.exponentialRampToValueAtTime(2200, t + dur * 0.55);
    bp.frequency.exponentialRampToValueAtTime(400, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + dur * 0.45);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(bp);
    bp.connect(g);
    this.out(g, 0.4);
    src.start(t);
    src.stop(t + dur + 0.05);
  }

  // ---------- penjadwal ----------

  private schedule() {
    if (!this.ctx) return;
    const st = this.style;
    const stepDur = 60 / st.bpm / 2;
    while (this.nextTime < this.ctx.currentTime + 0.15) {
      this.playStep(this.step, this.nextTime, stepDur, st);
      this.step++;
      this.nextTime += stepDur;
    }
  }

  private freq(st: StyleDef, idx: number, octave = 0) {
    const n = st.scale.length;
    const oct = Math.floor(idx / n) + octave;
    const cents = st.scale[((idx % n) + n) % n] + oct * 1200;
    return st.base * Math.pow(2, cents / 1200);
  }

  private playStep(i: number, t: number, dur: number, st: StyleDef) {
    const note = st.melody[i % st.melody.length];
    if (note >= 0) {
      const f = this.freq(st, note);
      this.playLead(st.lead, f, t, dur, st.leadGain);
      if (st.second === 'tehyan' && i % 2 === 0) this.tehyan(this.freq(st, note, 1), t, dur * 2, 0.06);
      if (st.second === 'suling' && i % 4 === 0) this.suling(this.freq(st, note, 1), t, dur * 3.5, 0.09);
    }
    // bonang: imbal mendahului nada berikutnya di ketukan ganjil
    if (st.second === 'bonang' && i % 2 === 1) {
      const nxt = st.melody[(i + 1) % st.melody.length];
      if (nxt >= 0) this.bonang(this.freq(st, nxt, 1), t, 0.1);
    }
    if ((i + 1) % st.gongEvery === 0) this.gong(t, 0.55);
    else if ((i + 1) % st.kenongEvery === 0) this.kenong(this.freq(st, 0, -1), t, 0.2);
    const d = st.drum[i % st.drum.length];
    switch (d) {
      case 'B': this.kendang(t, 'dhung'); break;
      case 't': this.kendang(t, 'tak'); break;
      case 'k': this.kendang(t, 'ket'); break;
      case 'D': this.bedug(t); break;
      case 'x': this.rim(t); break;
      case 'c': this.kecrek(t); break;
    }
  }

  // ---------- instrumen ----------

  private out(gain: GainNode, wet = 1) {
    gain.connect(this.dry);
    if (wet > 0) gain.connect(this.wet);
  }

  private env(t: number, peak: number, attack: number, decay: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
    return g;
  }

  private partials(f: number, t: number, parts: [number, number, number][], gain: number) {
    const ctx = this.ctx!;
    for (const [ratio, amp, decay] of parts) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = f * ratio;
      const g = this.env(t, gain * amp, 0.004, decay);
      o.connect(g);
      this.out(g);
      o.start(t);
      o.stop(t + decay + 0.1);
    }
  }

  private playLead(kind: Lead, f: number, t: number, dur: number, gain: number) {
    switch (kind) {
      case 'saron':
        this.partials(f, t, [[1, 1, 1.6], [1.004, 0.6, 1.8], [2.76, 0.28, 0.5], [5.4, 0.12, 0.2]], gain);
        break;
      case 'gambang':
        this.partials(f * 2, t, [[1, 1, 0.38], [3.93, 0.2, 0.12], [9.2, 0.06, 0.05]], gain);
        break;
      case 'bonang':
        this.bonang(f, t, gain);
        break;
      case 'suling':
        this.suling(f * 2, t, dur * 0.95, gain * 0.6);
        break;
      case 'saronen':
        this.saronen(f, t, dur, gain * 0.4);
        break;
    }
  }

  private bonang(f: number, t: number, gain: number) {
    this.partials(f, t, [[1, 1, 0.9], [1.006, 0.5, 1.0], [2.42, 0.25, 0.35], [3.86, 0.1, 0.15]], gain);
  }

  private kenong(f: number, t: number, gain: number) {
    this.partials(f, t, [[1, 1, 2.6], [1.003, 0.7, 2.8], [2.0, 0.2, 1.2]], gain);
  }

  private gong(t: number, gain: number) {
    const ctx = this.ctx!;
    for (const [fr, amp, dec] of [[68, 1, 6], [68.9, 0.8, 6.5], [136.5, 0.3, 3.5], [204, 0.12, 2]] as const) {
      const o = ctx.createOscillator();
      o.type = 'sine';
      o.frequency.value = fr;
      const g = this.env(t, gain * amp, 0.03, dec);
      o.connect(g);
      this.out(g, 0.6);
      o.start(t);
      o.stop(t + dec + 0.2);
    }
    this.noise(t, 0.12, 0.3, 'lowpass', 220, gain * 0.5);
  }

  private noise(t: number, attack: number, decay: number, type: BiquadFilterType, freq: number, gain: number, q = 1) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const filt = ctx.createBiquadFilter();
    filt.type = type;
    filt.frequency.value = freq;
    filt.Q.value = q;
    const g = this.env(t, gain, attack, decay);
    src.connect(filt);
    filt.connect(g);
    this.out(g, 0.3);
    src.start(t, Math.random() * 1.5);
    src.stop(t + attack + decay + 0.05);
  }

  private drumTone(t: number, f0: number, f1: number, decay: number, gain: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + decay * 0.6);
    const g = this.env(t, gain, 0.003, decay);
    o.connect(g);
    this.out(g, 0.25);
    o.start(t);
    o.stop(t + decay + 0.05);
  }

  private kendang(t: number, stroke: 'dhung' | 'tak' | 'ket') {
    if (stroke === 'dhung') this.drumTone(t, 150, 78, 0.35, 0.45);
    else if (stroke === 'tak') this.noise(t, 0.002, 0.07, 'bandpass', 2600, 0.35, 1.4);
    else this.noise(t, 0.002, 0.05, 'bandpass', 1100, 0.3, 2);
  }

  private bedug(t: number) {
    this.drumTone(t, 95, 44, 0.8, 0.7);
    this.noise(t, 0.003, 0.18, 'lowpass', 260, 0.4);
  }

  private rim(t: number) {
    this.noise(t, 0.001, 0.05, 'highpass', 3000, 0.22);
  }

  private kecrek(t: number) {
    this.noise(t, 0.001, 0.09, 'highpass', 6000, 0.12);
  }

  private vibrato(target: AudioParam, t: number, rate: number, depth: number, dur: number) {
    const ctx = this.ctx!;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = rate;
    const lg = ctx.createGain();
    lg.gain.value = depth;
    lfo.connect(lg);
    lg.connect(target);
    lfo.start(t);
    lfo.stop(t + dur + 0.3);
  }

  private sustained(t: number, dur: number, gain: number, attack: number) {
    const g = this.ctx!.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + attack);
    g.gain.setValueAtTime(gain, t + Math.max(attack, dur - 0.15));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
    return g;
  }

  private suling(f: number, t: number, dur: number, gain: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sine';
    o.frequency.value = f;
    this.vibrato(o.frequency, t + 0.15, 5.2, f * 0.006, dur);
    const g = this.sustained(t, dur, gain, 0.08);
    o.connect(g);
    this.out(g);
    o.start(t);
    o.stop(t + dur + 0.3);
    this.noise(t, 0.05, dur * 0.6, 'bandpass', f * 2, gain * 0.25, 3);
  }

  private tehyan(f: number, t: number, dur: number, gain: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'sawtooth';
    o.frequency.value = f;
    this.vibrato(o.frequency, t + 0.1, 6, f * 0.008, dur);
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 1800;
    const g = this.sustained(t, dur, gain, 0.06);
    o.connect(lp);
    lp.connect(g);
    this.out(g);
    o.start(t);
    o.stop(t + dur + 0.3);
  }

  private saronen(f: number, t: number, dur: number, gain: number) {
    const ctx = this.ctx!;
    const o = ctx.createOscillator();
    o.type = 'square';
    o.frequency.value = f * 2;
    this.vibrato(o.frequency, t, 6.5, f * 0.012, dur);
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = f * 6;
    bp.Q.value = 1.2;
    const g = this.sustained(t, dur, gain, 0.03);
    o.connect(bp);
    bp.connect(g);
    this.out(g);
    o.start(t);
    o.stop(t + dur + 0.3);
  }

  // ---------- buffer ----------

  private makeNoise() {
    const ctx = this.ctx!;
    const len = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private makeImpulse(seconds: number) {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * seconds);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const d = buf.getChannelData(ch);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3);
    }
    return buf;
  }
}

export const gamelan = new GamelanEngine();
