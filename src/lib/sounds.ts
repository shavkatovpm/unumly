"use client";

/* ════════════════════════════════════════════════════════════
   Sound synth library — Web Audio API
   Data-driven: each variant is a SoundSpec (voices + optional noise burst).
   ════════════════════════════════════════════════════════════ */

let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (_ctx) return _ctx;
  const Ctor =
    (window as unknown as { AudioContext?: typeof AudioContext }).AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  _ctx = new Ctor();
  return _ctx;
}

let _master = 0.2;
// Per-event gain trim. Some events (like task done / pen-click) sound louder
// than others at the same master volume; trim them down without touching
// the user-visible percentage.
//
// Desktop ovoz dinamiklari mobile'dan ko'ra past chiqargani uchun
// desktop'da default qiymatlar yuqori (master 0.5, complete trim 0.4).
const COMPLETE_GAIN_TRIM_MOBILE  = 0.2;
const COMPLETE_GAIN_TRIM_DESKTOP = 0.5;
const CREATE_GAIN_TRIM           = 0.8;
const DEFAULT_MASTER_MOBILE      = 0.2;
const DEFAULT_MASTER_DESKTOP     = 0.5;

function _isDesktop(): boolean {
  if (typeof window === "undefined") return false;
  try { return window.matchMedia("(min-width: 768px)").matches; }
  catch { return false; }
}
function _defaultMaster(): number {
  return _isDesktop() ? DEFAULT_MASTER_DESKTOP : DEFAULT_MASTER_MOBILE;
}
function _defaultCompleteTrim(): number {
  return _isDesktop() ? COMPLETE_GAIN_TRIM_DESKTOP : COMPLETE_GAIN_TRIM_MOBILE;
}
export function setMasterVolume(v: number) { _master = Math.max(0, Math.min(1, v)); }
export function getMasterVolume() { return _master; }

/* ─── Voice & Noise types ─────────────────────────────────── */

type Voice = {
  freq: number;
  freqEnd?: number;
  glideTo?: number;
  type?: OscillatorType;
  detune?: number;
  delay?: number;
  attack: number;
  decay: number;
  peak: number;
};

type NoiseSpec = {
  duration: number;
  filterType: BiquadFilterType;
  freq: number;
  freqEnd?: number;
  q?: number;
  peak: number;
  attack: number;
  decay: number;
  delay?: number;
};

type SoundSpec = {
  voices?: Voice[];
  noises?: NoiseSpec[];
};

/* ─── Synth core ──────────────────────────────────────────── */

function scheduleVoice(ctx: AudioContext, out: GainNode, t0: number, v: Voice) {
  const start = t0 + (v.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = v.type ?? "sine";
  osc.frequency.setValueAtTime(v.freq, start);
  if (v.detune) osc.detune.setValueAtTime(v.detune, start);
  if (v.freqEnd !== undefined) {
    const glide = v.glideTo ?? v.attack + v.decay;
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, v.freqEnd), start + glide);
  }
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v.peak), start + v.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + v.attack + v.decay);
  osc.connect(g).connect(out);
  osc.start(start);
  osc.stop(start + v.attack + v.decay + 0.05);
}

function scheduleNoise(ctx: AudioContext, out: GainNode, t0: number, n: NoiseSpec) {
  const start = t0 + (n.delay ?? 0);
  const length = Math.max(1, Math.floor(ctx.sampleRate * n.duration));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const filter = ctx.createBiquadFilter();
  filter.type = n.filterType;
  filter.frequency.setValueAtTime(n.freq, start);
  if (n.freqEnd !== undefined) {
    filter.frequency.exponentialRampToValueAtTime(Math.max(20, n.freqEnd), start + n.duration);
  }
  if (n.q !== undefined) filter.Q.value = n.q;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(n.peak, start + n.attack);
  g.gain.exponentialRampToValueAtTime(0.0001, start + n.attack + n.decay);
  src.connect(filter).connect(g).connect(out);
  src.start(start);
  src.stop(start + n.duration);
}

function playSpec(spec: SoundSpec, gainScale = 1) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = _master * gainScale;
  out.connect(ctx.destination);
  for (const v of spec.voices ?? []) scheduleVoice(ctx, out, t, v);
  for (const n of spec.noises ?? []) scheduleNoise(ctx, out, t, n);
}

/* ─── Synth helpers (sound-design building blocks) ────────── */

// Marimba: triangle fundamental + 4th partial sine + brief noise click
function marimba(freq: number, peak = 0.2, decay = 0.18): SoundSpec {
  return {
    voices: [
      { freq, type: "triangle", attack: 0.001, decay, peak },
      { freq: freq * 4, attack: 0.001, decay: decay * 1, peak: peak * 0.25 },
    ],
    noises: [{ duration: 0.008, filterType: "bandpass", freq: 2200, q: 1.2, peak: peak * 1, attack: 0.0005, decay: 0.007 }],
  };
}
// Vibraphone: pure sine + 2x harmonic + slight detune layer + slow tremolo not modeled
function vibe(freq: number, peak = 0.28, decay = 15): SoundSpec {
  return {
    voices: [
      { freq, attack: 0.003, decay, peak },
      { freq, detune: 7, attack: 0.004, decay: decay * 1.05, peak: peak * 0.7 },
      { freq: freq * 2, attack: 0.002, decay: decay * 1, peak: peak * 0.2 },
    ],
  };
}
// Bell: inharmonic partials (1, 2.76, 5.4) typical bell mode ratios
function bell(freq: number, peak = 0.2, decay = 0.7): SoundSpec {
  return {
    voices: [
      { freq, attack: 0.003, decay, peak },
      { freq: freq * 2.76, attack: 0.003, decay: decay * 15, peak: peak * 15 },
      { freq: freq * 5.4, attack: 0.002, decay: decay * 10, peak: peak * 0.20 },
    ],
  };
}
// Pluck: sharp attack, exp decay, octave overtone
function pluck(freq: number, peak = 0.2, decay = 0.20): SoundSpec {
  return {
    voices: [
      { freq, attack: 0.001, decay, peak },
      { freq: freq * 2, attack: 0.001, decay: decay * 15, peak: peak * 1 },
    ],
  };
}

/* ════════════════════════════════════════════════════════════
   Check (task bajarildi) — 20 variants
   ════════════════════════════════════════════════════════════ */

export type CheckVariant =
  | "marimba" | "glock" | "kalimba" | "triangle-bell" | "tongue-drum"
  | "kicklet" | "pluck" | "harp" | "whistle-short" | "bubble"
  | "cork-mini" | "puff" | "ice-tap" | "glass-tick" | "laser-tick"
  | "bonk" | "ping" | "tap-soft" | "twinkle-short" | "mini-drum";

export const CHECK_VARIANTS: { id: CheckVariant; label: string; hint: string }[] = [
  { id: "marimba",        label: "Marimba",        hint: "Pitched wood" },
  { id: "glock",          label: "Glockenspiel",   hint: "Bright metal pitched" },
  { id: "kalimba",        label: "Kalimba",        hint: "Yumshoq metal til" },
  { id: "triangle-bell",  label: "Triangle bell",  hint: "Yengil uchburchak" },
  { id: "tongue-drum",    label: "Tongue drum",    hint: "Chuqur tilli baraban" },
  { id: "kicklet",        label: "Kicklet",        hint: "Mayda kick" },
  { id: "pluck",          label: "Pluck",          hint: "Tor chertilishi" },
  { id: "harp",           label: "Harp",           hint: "Arfa chertilishi" },
  { id: "whistle-short",  label: "Whistle",        hint: "Qisqa hushtak" },
  { id: "bubble",         label: "Bubble",         hint: "Pufakcha" },
  { id: "cork-mini",      label: "Cork",           hint: "Mayda probka" },
  { id: "puff",           label: "Puff",           hint: "Yumshoq uflash" },
  { id: "ice-tap",        label: "Ice tap",        hint: "Muz taq" },
  { id: "glass-tick",     label: "Glass tick",     hint: "Mayda shisha tik" },
  { id: "laser-tick",     label: "Laser",          hint: "Lazer tik" },
  { id: "bonk",           label: "Bonk",           hint: "Past yog'och bonk" },
  { id: "ping",           label: "Ping",           hint: "Metal ping" },
  { id: "tap-soft",       label: "Soft tap",       hint: "Yumshoq tegish" },
  { id: "twinkle-short",  label: "Twinkle",        hint: "Mayda uchqun" },
  { id: "mini-drum",      label: "Mini drum",      hint: "Mayda baraban" },
];

const CHECK_SPECS: Record<CheckVariant, SoundSpec> = {
  "marimba":       marimba(880, 0.22, 0.18),
  "glock":         {
    voices: [
      { freq: 2093, attack: 0.001, decay: 10, peak: 0.22 }, // C7
      { freq: 4186, attack: 0.001, decay: 0.22, peak: 0.10 },
    ],
    noises: [{ duration: 0.005, filterType: "highpass", freq: 4500, peak: 0.10, attack: 0.0005, decay: 0.004 }],
  },
  "kalimba":       {
    voices: [
      { freq: 660,  attack: 0.002, decay: 0.20, peak: 0.20 },
      { freq: 1320, attack: 0.002, decay: 0.18, peak: 0.14 },
      { freq: 1980, attack: 0.002, decay: 0.10, peak: 0.06 },
    ],
  },
  "triangle-bell": bell(2640, 0.18, 15),
  "tongue-drum":   {
    voices: [
      { freq: 220, type: "triangle", attack: 0.002, decay: 0.25, peak: 0.24 },
      { freq: 440, attack: 0.002, decay: 0.20, peak: 0.14 },
      { freq: 110, attack: 0.005, decay: 15, peak: 0.18 },
    ],
  },
  "kicklet":       {
    voices: [{ freq: 180, freqEnd: 60, glideTo: 0.05, attack: 0.001, decay: 0.08, peak: 10 }],
    noises: [{ duration: 0.010, filterType: "lowpass", freq: 1000, peak: 0.16, attack: 0.0005, decay: 0.009 }],
  },
  "pluck":         pluck(523.25, 0.22, 0.28),
  "harp":          {
    voices: [
      { freq: 880,  attack: 0.001, decay: 0.25, peak: 0.20 },
      { freq: 1320, attack: 0.001, decay: 0.20, peak: 0.18 },
      { freq: 1760, attack: 0.001, decay: 0.22, peak: 0.10 },
    ],
  },
  "whistle-short": {
    voices: [{ freq: 1600, freqEnd: 2200, glideTo: 0.08, attack: 0.010, decay: 0.10, peak: 0.20 }],
  },
  "bubble":        {
    voices: [
      { freq: 320, freqEnd: 720, glideTo: 0.018, attack: 0.001, decay: 0.05, peak: 0.26 },
      { freq: 720, freqEnd: 500, glideTo: 0.05, attack: 0.002, decay: 0.06, peak: 0.18, delay: 0.018 },
    ],
  },
  "cork-mini":     {
    voices: [{ freq: 160, freqEnd: 90, glideTo: 0.04, attack: 0.001, decay: 0.08, peak: 10 }],
    noises: [{ duration: 0.012, filterType: "bandpass", freq: 600, q: 1.5, peak: 0.20, attack: 0.0005, decay: 0.011 }],
  },
  "puff":          {
    noises: [{ duration: 0.10, filterType: "lowpass", freq: 1400, freqEnd: 600, q: 0.7, peak: 0.22, attack: 0.010, decay: 0.09 }],
  },
  "ice-tap":       {
    voices: [
      { freq: 3520, attack: 0.001, decay: 0.18, peak: 0.16 },
      { freq: 5280, attack: 0.001, decay: 0.10, peak: 0.08 },
      { freq: 1760, attack: 0.002, decay: 0.20, peak: 0.10 },
    ],
  },
  "glass-tick":    {
    voices: [
      { freq: 2349, attack: 0.001, decay: 0.06, peak: 0.24 },
      { freq: 2349, detune: 10, attack: 0.001, decay: 0.07, peak: 0.16 },
    ],
  },
  "laser-tick":    {
    voices: [{ freq: 2400, freqEnd: 600, glideTo: 0.03, attack: 0.001, decay: 0.05, peak: 0.28 }],
  },
  "bonk":          {
    voices: [
      { freq: 140, type: "triangle", attack: 0.001, decay: 0.10, peak: 12 },
      { freq: 280, attack: 0.002, decay: 0.06, peak: 0.12 },
    ],
    noises: [{ duration: 0.010, filterType: "lowpass", freq: 800, peak: 0.18, attack: 0.0005, decay: 0.009 }],
  },
  "ping":          bell(1760, 0.20, 0.20),
  "tap-soft":      {
    voices: [{ freq: 540, attack: 0.001, decay: 0.06, peak: 0.20 }],
    noises: [{ duration: 0.012, filterType: "bandpass", freq: 1500, q: 1.0, peak: 0.16, attack: 0.0005, decay: 0.011 }],
  },
  "twinkle-short": {
    voices: [
      { freq: 2349, attack: 0.001, decay: 0.10, peak: 0.18, delay: 0.00 },
      { freq: 2960, attack: 0.001, decay: 0.10, peak: 0.16, delay: 0.04 },
      { freq: 3520, attack: 0.001, decay: 0.10, peak: 0.14, delay: 0.08 },
    ],
  },
  "mini-drum":     {
    voices: [{ freq: 220, freqEnd: 110, glideTo: 0.04, attack: 0.001, decay: 0.10, peak: 0.26 }],
    noises: [{ duration: 0.015, filterType: "bandpass", freq: 1200, q: 1.0, peak: 0.20, attack: 0.0005, decay: 0.014 }],
  },
};

export function playCheck(v: CheckVariant) { playSpec(CHECK_SPECS[v]); }

/* ════════════════════════════════════════════════════════════
   Day 100% complete — 20 variants
   ════════════════════════════════════════════════════════════ */

export type CompleteVariant =
  | "major-arp" | "bell-tower" | "choir-oh" | "soft-fanfare" | "music-box"
  | "string-chord" | "whistle-melody" | "sparkle-cascade" | "wind-chimes" | "pluck-cascade"
  | "ascending-sweep" | "triumph-stack" | "pad-swell" | "bell-sparkle" | "reverse-chime"
  | "stack-chord" | "marimba-phrase" | "crystal-seq" | "vibe-phrase" | "sus-resolve";

export const COMPLETE_VARIANTS: { id: CompleteVariant; label: string; hint: string }[] = [
  { id: "major-arp",        label: "Major arpeggio", hint: "C-E-G-C" },
  { id: "bell-tower",       label: "Bell tower",     hint: "3 ta qatorlangan qo'ng'iroq" },
  { id: "choir-oh",         label: "Choir",          hint: "Yumshoq xor 'oh'" },
  { id: "soft-fanfare",     label: "Soft fanfare",   hint: "Yumshoq karnay" },
  { id: "music-box",        label: "Music box",      hint: "Musiqa qutisi melodiyasi" },
  { id: "string-chord",     label: "String chord",   hint: "Torli akkord" },
  { id: "whistle-melody",   label: "Whistle melody", hint: "Hushtak melodiyasi" },
  { id: "sparkle-cascade",  label: "Sparkle",        hint: "Tez kaskad uchqunlar" },
  { id: "wind-chimes",      label: "Wind chimes",    hint: "Shamol qo'ng'iroqlari" },
  { id: "pluck-cascade",    label: "Pluck cascade",  hint: "Ko'tariluvchi cherta" },
  { id: "ascending-sweep",  label: "Sweep up",       hint: "Ko'tariluvchi sweep" },
  { id: "triumph-stack",    label: "Triumph stack",  hint: "G'olibona akkord stack" },
  { id: "pad-swell",        label: "Pad swell",      hint: "Yumshoq pad" },
  { id: "bell-sparkle",     label: "Bell + sparkle", hint: "Qo'ng'iroq + uchqun" },
  { id: "reverse-chime",    label: "Reverse chime",  hint: "Teskari chime" },
  { id: "stack-chord",      label: "Stacked chord",  hint: "Stack 5 nota" },
  { id: "marimba-phrase",   label: "Marimba phrase", hint: "Marimba 3 nota" },
  { id: "crystal-seq",      label: "Crystal seq",    hint: "Kristall ketma-ket" },
  { id: "vibe-phrase",      label: "Vibe phrase",    hint: "Vibraphone 3 nota" },
  { id: "sus-resolve",      label: "Sus → resolve",  hint: "Sus akkord → asosiy" },
];

const COMPLETE_SPECS: Record<CompleteVariant, SoundSpec> = {
  "major-arp": {
    voices: [
      { freq: 523.25, attack: 0.005, decay: 15, peak: 0.20, delay: 0.00 },
      { freq: 659.25, attack: 0.005, decay: 15, peak: 0.28, delay: 0.10 },
      { freq: 783.99, attack: 0.005, decay: 10, peak: 0.28, delay: 0.20 },
      { freq: 1046.5, attack: 0.005, decay: 15, peak: 0.20, delay: 0.20 },
    ],
  },
  "bell-tower": {
    voices: [
      ...bell(440, 0.28, 0.80).voices!.map((v) => ({ ...v, delay: 0.00 })),
      ...bell(660, 0.24, 0.70).voices!.map((v) => ({ ...v, delay: 0.18 })),
      ...bell(880, 0.20, 15).voices!.map((v) => ({ ...v, delay: 0.26 })),
    ],
  },
  "choir-oh": {
    voices: [
      { freq: 220, attack: 0.080, decay: 1.10, peak: 0.20 },
      { freq: 277.18, attack: 0.090, decay: 1.10, peak: 0.20 },
      { freq: 329.63, attack: 0.100, decay: 1.10, peak: 0.18 },
      { freq: 440, attack: 0.080, decay: 1.10, peak: 0.16 },
      { freq: 110, attack: 0.070, decay: 1.20, peak: 0.18 },
    ],
  },
  "soft-fanfare": {
    voices: [
      { freq: 392, type: "triangle", attack: 0.015, decay: 15, peak: 0.26 },
      { freq: 523.25, type: "triangle", attack: 0.015, decay: 15, peak: 0.24, delay: 0.06 },
      { freq: 659.25, type: "triangle", attack: 0.015, decay: 10, peak: 0.22, delay: 0.12 },
      { freq: 783.99, type: "triangle", attack: 0.015, decay: 15, peak: 0.20, delay: 0.18 },
    ],
  },
  "music-box": {
    voices: [
      ...pluck(1046.5, 0.22, 0.25).voices!.map((v) => ({ ...v, delay: 0.00 })),
      ...pluck(987.77, 0.20, 0.22).voices!.map((v) => ({ ...v, delay: 0.18 })),
      ...pluck(880,    0.20, 0.22).voices!.map((v) => ({ ...v, delay: 0.26 })),
      ...pluck(523.25, 0.22, 10).voices!.map((v) => ({ ...v, delay: 14 })),
    ],
  },
  "string-chord": {
    voices: [
      { freq: 392,    type: "sawtooth", attack: 0.080, decay: 0.90, peak: 0.10 },
      { freq: 523.25, type: "sawtooth", attack: 0.080, decay: 0.90, peak: 0.10 },
      { freq: 659.25, type: "sawtooth", attack: 0.080, decay: 0.90, peak: 0.09 },
      { freq: 392,    detune: 8, attack: 0.085, decay: 0.92, peak: 0.07 },
      { freq: 523.25, detune: 8, attack: 0.085, decay: 0.92, peak: 0.07 },
    ],
  },
  "whistle-melody": {
    voices: [
      { freq: 1320, freqEnd: 1760, glideTo: 0.10, attack: 0.030, decay: 1, peak: 0.22 },
      { freq: 1760, freqEnd: 2093, glideTo: 0.10, attack: 0.030, decay: 0.20, peak: 0.20, delay: 0.20 },
    ],
  },
  "sparkle-cascade": {
    voices: [
      { freq: 2349, attack: 0.001, decay: 0.18, peak: 0.18, delay: 0.00 },
      { freq: 2637, attack: 0.001, decay: 0.18, peak: 0.16, delay: 0.04 },
      { freq: 3136, attack: 0.001, decay: 0.16, peak: 0.16, delay: 0.08 },
      { freq: 3520, attack: 0.001, decay: 0.15, peak: 0.14, delay: 0.12 },
      { freq: 4186, attack: 0.001, decay: 0.14, peak: 0.12, delay: 0.16 },
      { freq: 4698, attack: 0.001, decay: 0.13, peak: 0.10, delay: 0.20 },
    ],
  },
  "wind-chimes": {
    voices: [
      ...bell(1760, 0.18, 10).voices!.map((v) => ({ ...v, delay: 0.00 })),
      ...bell(2349, 0.16, 15).voices!.map((v) => ({ ...v, delay: 0.07 })),
      ...bell(2093, 0.14, 15).voices!.map((v) => ({ ...v, delay: 0.16 })),
      ...bell(2637, 0.14, 15).voices!.map((v) => ({ ...v, delay: 0.26 })),
    ],
  },
  "pluck-cascade": {
    voices: [
      ...pluck(440,  0.28, 0.20).voices!.map((v) => ({ ...v, delay: 0.00 })),
      ...pluck(587.33, 0.26, 0.20).voices!.map((v) => ({ ...v, delay: 0.08 })),
      ...pluck(659.25, 0.26, 0.20).voices!.map((v) => ({ ...v, delay: 0.16 })),
      ...pluck(880,    0.28, 10).voices!.map((v) => ({ ...v, delay: 0.24 })),
    ],
  },
  "ascending-sweep": {
    voices: [
      { freq: 220, freqEnd: 1320, glideTo: 10, attack: 0.040, decay: 0.20, peak: 0.22 },
      { freq: 110, freqEnd: 660,  glideTo: 10, attack: 0.050, decay: 0.25, peak: 0.18 },
    ],
    noises: [{ duration: 10, filterType: "bandpass", freq: 600, freqEnd: 4000, q: 2.0, peak: 0.10, attack: 0.030, decay: 0.26 }],
  },
  "triumph-stack": {
    voices: [
      { freq: 261.63, type: "triangle", attack: 0.005, decay: 0.90, peak: 0.20 },
      { freq: 329.63, type: "triangle", attack: 0.005, decay: 0.90, peak: 0.20 },
      { freq: 392,    type: "triangle", attack: 0.005, decay: 0.90, peak: 0.20 },
      { freq: 523.25, type: "triangle", attack: 0.005, decay: 0.90, peak: 0.20 },
      { freq: 1046.5, attack: 0.005, decay: 10, peak: 0.14, delay: 0.10 },
      { freq: 1567.98, attack: 0.005, decay: 10, peak: 0.10, delay: 0.18 },
    ],
  },
  "pad-swell": {
    voices: [
      { freq: 261.63, attack: 10, decay: 1.40, peak: 0.18 },
      { freq: 329.63, attack: 0.260, decay: 1.40, peak: 0.16 },
      { freq: 392,    attack: 0.270, decay: 1.40, peak: 0.16 },
      { freq: 523.25, attack: 0.280, decay: 1.40, peak: 0.14 },
      { freq: 130.81, attack: 0.220, decay: 1.50, peak: 0.16 },
    ],
  },
  "bell-sparkle": {
    voices: [
      ...bell(880, 0.20, 0.90).voices!,
      { freq: 3520, attack: 0.001, decay: 0.10, peak: 0.12, delay: 0.05 },
      { freq: 4698, attack: 0.001, decay: 0.10, peak: 0.10, delay: 0.10 },
      { freq: 5274, attack: 0.001, decay: 0.10, peak: 0.08, delay: 0.15 },
    ],
  },
  "reverse-chime": {
    // Simulated reverse: very slow attack, sharp release
    voices: [
      { freq: 1760, attack: 0.250, decay: 0.05, peak: 0.20 },
      { freq: 1320, attack: 0.250, decay: 0.05, peak: 0.22 },
      { freq: 880,  attack: 0.280, decay: 0.05, peak: 0.18 },
    ],
  },
  "stack-chord": {
    // C E G B D (major 9th)
    voices: [
      { freq: 261.63, attack: 0.010, decay: 0.90, peak: 0.20 },
      { freq: 329.63, attack: 0.010, decay: 0.90, peak: 0.18 },
      { freq: 392,    attack: 0.010, decay: 0.90, peak: 0.18 },
      { freq: 493.88, attack: 0.010, decay: 0.90, peak: 0.16 },
      { freq: 587.33, attack: 0.010, decay: 0.90, peak: 0.14 },
    ],
  },
  "marimba-phrase": {
    voices: [
      ...marimba(523.25, 0.20, 0.20).voices!.map((v) => ({ ...v, delay: 0.00 })),
      ...marimba(659.25, 0.20, 0.20).voices!.map((v) => ({ ...v, delay: 0.12 })),
      ...marimba(880,    0.22, 1).voices!.map((v) => ({ ...v, delay: 0.24 })),
    ],
    noises: [
      { duration: 0.006, filterType: "bandpass", freq: 2200, q: 1.2, peak: 0.10, attack: 0.0005, decay: 0.005, delay: 0.00 },
      { duration: 0.006, filterType: "bandpass", freq: 2200, q: 1.2, peak: 0.10, attack: 0.0005, decay: 0.005, delay: 0.12 },
      { duration: 0.006, filterType: "bandpass", freq: 2200, q: 1.2, peak: 0.10, attack: 0.0005, decay: 0.005, delay: 0.24 },
    ],
  },
  "crystal-seq": {
    voices: [
      { freq: 1318.51, attack: 0.001, decay: 10, peak: 0.22, delay: 0.00 },
      { freq: 1567.98, attack: 0.001, decay: 10, peak: 0.20, delay: 0.10 },
      { freq: 1975.53, attack: 0.001, decay: 10, peak: 0.20, delay: 0.20 },
      { freq: 2637.02, attack: 0.001, decay: 15, peak: 0.18, delay: 0.20 },
    ],
  },
  "vibe-phrase": {
    voices: [
      ...vibe(440, 0.26, 10).voices!.map((v) => ({ ...v, delay: 0.00 })),
      ...vibe(554.37, 0.24, 10).voices!.map((v) => ({ ...v, delay: 0.14 })),
      ...vibe(659.25, 0.24, 10).voices!.map((v) => ({ ...v, delay: 0.28 })),
    ],
  },
  "sus-resolve": {
    voices: [
      // Sus4 first (C F G)
      { freq: 261.63, attack: 0.020, decay: 10, peak: 0.20 },
      { freq: 349.23, attack: 0.020, decay: 10, peak: 0.20 },
      { freq: 392,    attack: 0.020, decay: 10, peak: 0.18 },
      // Resolve to major (C E G)
      { freq: 261.63, attack: 0.020, decay: 0.80, peak: 0.20, delay: 0.20 },
      { freq: 329.63, attack: 0.020, decay: 0.80, peak: 0.20, delay: 0.20 },
      { freq: 392,    attack: 0.020, decay: 0.80, peak: 0.18, delay: 0.20 },
    ],
  },
};

export function playComplete(v: CompleteVariant) { playSpec(COMPLETE_SPECS[v]); }

/* ════════════════════════════════════════════════════════════
   New task created — 20 variants
   ════════════════════════════════════════════════════════════ */

export type CreateVariant =
  | "plus-rise" | "subtle-whoosh" | "pencil" | "paper-flip" | "page-turn"
  | "pen-click" | "magnet-snap" | "drawer" | "air-puff" | "spray"
  | "bounce" | "snap" | "slide" | "light-bell" | "bubble-small"
  | "twinkle-small" | "slip" | "card-swipe" | "light-tick" | "touch-ding";

export const CREATE_VARIANTS: { id: CreateVariant; label: string; hint: string }[] = [
  { id: "plus-rise",     label: "Plus rise",     hint: "Tez ko'tariluvchi" },
  { id: "subtle-whoosh", label: "Subtle whoosh", hint: "Sokin shovqin" },
  { id: "pencil",        label: "Pencil",        hint: "Qalam tirnashi" },
  { id: "paper-flip",    label: "Paper flip",    hint: "Qog'oz aylanishi" },
  { id: "page-turn",     label: "Page turn",     hint: "Sahifa burilishi" },
  { id: "pen-click",     label: "Pen click",     hint: "Ruchka klik" },
  { id: "magnet-snap",   label: "Magnet snap",   hint: "Magnit yopishish" },
  { id: "drawer",        label: "Drawer",        hint: "Tortma" },
  { id: "air-puff",      label: "Air puff",      hint: "Havo uflanishi" },
  { id: "spray",         label: "Spray",         hint: "Sepish" },
  { id: "bounce",        label: "Bounce",        hint: "Sakrash" },
  { id: "snap",          label: "Snap",          hint: "Barmoq chartlatish" },
  { id: "slide",         label: "Slide",         hint: "Yumshoq slayd" },
  { id: "light-bell",    label: "Light bell",    hint: "Yengil qo'ng'iroq" },
  { id: "bubble-small",  label: "Small bubble",  hint: "Mayda pufakcha" },
  { id: "twinkle-small", label: "Small twinkle", hint: "Mayda uchqun" },
  { id: "slip",          label: "Slip",          hint: "Sirpanish" },
  { id: "card-swipe",    label: "Card swipe",    hint: "Karta urilishi" },
  { id: "light-tick",    label: "Light tick",    hint: "Yengil tik" },
  { id: "touch-ding",    label: "Touch ding",    hint: "Tegish ding" },
];

const CREATE_SPECS: Record<CreateVariant, SoundSpec> = {
  "plus-rise": {
    voices: [
      { freq: 440, freqEnd: 880, glideTo: 0.08, attack: 0.005, decay: 0.10, peak: 0.26 },
      { freq: 880, freqEnd: 1760, glideTo: 0.08, attack: 0.005, decay: 0.08, peak: 0.14 },
    ],
  },
  "subtle-whoosh": {
    noises: [{ duration: 0.20, filterType: "bandpass", freq: 400, freqEnd: 2200, q: 1.2, peak: 0.28, attack: 0.020, decay: 0.18 }],
  },
  "pencil": {
    noises: [{ duration: 0.12, filterType: "bandpass", freq: 1500, freqEnd: 3000, q: 2.0, peak: 0.20, attack: 0.005, decay: 0.11 }],
  },
  "paper-flip": {
    noises: [
      { duration: 0.04, filterType: "highpass", freq: 2000, peak: 0.20, attack: 0.005, decay: 0.035, delay: 0.00 },
      { duration: 0.04, filterType: "highpass", freq: 2000, peak: 0.16, attack: 0.005, decay: 0.035, delay: 0.05 },
    ],
  },
  "page-turn": {
    noises: [{ duration: 0.18, filterType: "bandpass", freq: 1200, freqEnd: 600, q: 1.0, peak: 0.26, attack: 0.010, decay: 0.16 }],
  },
  "pen-click": {
    voices: [
      { freq: 1800, attack: 0.001, decay: 0.018, peak: 0.18, delay: 0.00 },
      { freq: 1600, attack: 0.001, decay: 0.018, peak: 0.18, delay: 0.06 },
    ],
    noises: [
      { duration: 0.010, filterType: "highpass", freq: 4000, peak: 0.22, attack: 0.0005, decay: 0.009, delay: 0.00 },
      { duration: 0.010, filterType: "highpass", freq: 4000, peak: 0.20, attack: 0.0005, decay: 0.009, delay: 0.06 },
    ],
  },
  "magnet-snap": {
    voices: [{ freq: 660, freqEnd: 220, glideTo: 0.025, attack: 0.001, decay: 0.07, peak: 0.20 }],
    noises: [{ duration: 0.010, filterType: "highpass", freq: 3500, peak: 0.24, attack: 0.0005, decay: 0.009 }],
  },
  "drawer": {
    noises: [{ duration: 0.16, filterType: "lowpass", freq: 1200, freqEnd: 500, q: 0.8, peak: 0.22, attack: 0.020, decay: 0.14 }],
  },
  "air-puff": {
    noises: [{ duration: 0.09, filterType: "lowpass", freq: 1200, freqEnd: 400, q: 0.7, peak: 0.20, attack: 0.010, decay: 0.08 }],
  },
  "spray": {
    noises: [{ duration: 0.12, filterType: "highpass", freq: 2500, freqEnd: 5000, q: 0.8, peak: 0.22, attack: 0.010, decay: 0.11 }],
  },
  "bounce": {
    voices: [
      { freq: 440, freqEnd: 880, glideTo: 0.05, attack: 0.001, decay: 0.06, peak: 0.20 },
      { freq: 880, freqEnd: 440, glideTo: 0.05, attack: 0.001, decay: 0.06, peak: 0.20, delay: 0.06 },
      { freq: 440, freqEnd: 660, glideTo: 0.04, attack: 0.001, decay: 0.05, peak: 0.14, delay: 0.14 },
    ],
  },
  "snap": {
    voices: [{ freq: 200, attack: 0.001, decay: 0.04, peak: 0.20 }],
    noises: [{ duration: 0.020, filterType: "highpass", freq: 3000, peak: 0.20, attack: 0.0005, decay: 0.018 }],
  },
  "slide": {
    noises: [{ duration: 0.14, filterType: "bandpass", freq: 800, freqEnd: 1800, q: 1.0, peak: 0.26, attack: 0.015, decay: 0.12 }],
  },
  "light-bell": bell(2349, 0.18, 0.25),
  "bubble-small": {
    voices: [
      { freq: 360, freqEnd: 640, glideTo: 0.012, attack: 0.001, decay: 0.04, peak: 0.28 },
    ],
  },
  "twinkle-small": {
    voices: [
      { freq: 2640, attack: 0.001, decay: 0.10, peak: 0.16, delay: 0.00 },
      { freq: 3520, attack: 0.001, decay: 0.10, peak: 0.14, delay: 0.05 },
    ],
  },
  "slip": {
    noises: [{ duration: 0.12, filterType: "bandpass", freq: 600, freqEnd: 1600, q: 1.5, peak: 0.20, attack: 0.010, decay: 0.11 }],
  },
  "card-swipe": {
    noises: [{ duration: 0.10, filterType: "bandpass", freq: 1200, freqEnd: 400, q: 0.8, peak: 0.20, attack: 0.005, decay: 0.09 }],
  },
  "light-tick": {
    voices: [{ freq: 1320, attack: 0.001, decay: 0.025, peak: 0.20 }],
  },
  "touch-ding": {
    voices: [
      { freq: 1760, attack: 0.002, decay: 0.18, peak: 0.20 },
      { freq: 1760, detune: 8, attack: 0.003, decay: 0.20, peak: 0.14 },
    ],
  },
};

export function playCreate(v: CreateVariant) { playSpec(CREATE_SPECS[v]); }

/* ════════════════════════════════════════════════════════════
   Persistence
   ════════════════════════════════════════════════════════════ */

const KEYS = {
  check:    "unumly:sound:check",
  complete: "unumly:sound:complete",
  create:   "unumly:sound:create",
  enabled:  "unumly:sound:enabled",
  volume:   "unumly:sound:volume",
} as const;

export type SoundSelection = {
  check: CheckVariant | null;
  complete: CompleteVariant | null;
  create: CreateVariant | null;
  enabled: boolean;
  volume: number;
};

export function loadSelection(): SoundSelection {
  if (typeof window === "undefined") {
    return { check: null, complete: null, create: null, enabled: true, volume: 1 };
  }
  function read<T extends string>(key: string): T | null {
    try {
      const v = window.localStorage.getItem(key);
      return (v as T) || null;
    } catch {
      return null;
    }
  }
  const enabled = (() => {
    try { return window.localStorage.getItem(KEYS.enabled) !== "0"; }
    catch { return true; }
  })();
  const volume = (() => {
    try {
      const raw = window.localStorage.getItem(KEYS.volume);
      const fallback = _defaultMaster();
      const v = raw == null ? fallback : parseFloat(raw);
      return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : fallback;
    } catch { return _defaultMaster(); }
  })();
  return {
    check: read<CheckVariant>(KEYS.check),
    complete: read<CompleteVariant>(KEYS.complete),
    create: read<CreateVariant>(KEYS.create),
    enabled,
    volume,
  };
}

export function saveCheck(v: CheckVariant) { try { window.localStorage.setItem(KEYS.check, v); } catch { /**/ } }
export function saveComplete(v: CompleteVariant) { try { window.localStorage.setItem(KEYS.complete, v); } catch { /**/ } }
export function saveCreate(v: CreateVariant) { try { window.localStorage.setItem(KEYS.create, v); } catch { /**/ } }
export function saveEnabled(v: boolean) { try { window.localStorage.setItem(KEYS.enabled, v ? "1" : "0"); } catch { /**/ } }
export function saveVolume(v: number) { try { window.localStorage.setItem(KEYS.volume, String(v)); } catch { /**/ } }

/* ════════════════════════════════════════════════════════════
   App-level playback (called from real UI components).
   Sounds are wired to user's picked variants — see chosen IDs below.
   Disabled if user toggled sounds off (KEYS.enabled === "0").
   ════════════════════════════════════════════════════════════ */

// Hardcoded user picks. Note: the IDs are unique across categories,
// so we can cross-reference between CHECK_SPECS and CREATE_SPECS.
const PICK_ON_COMPLETE: CreateVariant = "pen-click";
const PICK_ON_CREATE:   CheckVariant  = "tap-soft";

function _isEnabled() {
  if (typeof window === "undefined") return false;
  try { return window.localStorage.getItem(KEYS.enabled) !== "0"; }
  catch { return true; }
}

function _refreshMaster() {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEYS.volume);
    const v = raw == null ? _defaultMaster() : parseFloat(raw);
    if (Number.isFinite(v)) _master = Math.max(0, Math.min(1, v));
  } catch { /**/ }
}

/** Returns the user-saved complete trim, or the device-specific default. */
function _completeTrim(): number {
  const fallback = _defaultCompleteTrim();
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem("unumly:sound:complete-trim");
    if (!raw) return fallback;
    const v = parseFloat(raw);
    if (Number.isFinite(v)) return Math.max(0, Math.min(1, v));
  } catch { /**/ }
  return fallback;
}

/** Save the complete trim from the test page. */
export function saveCompleteTrim(v: number) {
  try { window.localStorage.setItem("unumly:sound:complete-trim", String(v)); }
  catch { /**/ }
}
export function loadCompleteTrim(): number {
  return _completeTrim();
}

/** Play the "task done" sound. Call at the moment the user taps the checkbox. */
export function playOnComplete() {
  if (!_isEnabled()) return;
  _refreshMaster();
  playSpec(CREATE_SPECS[PICK_ON_COMPLETE], _completeTrim());
}

/** Play pen-click at an arbitrary trim — test page only. */
export function playPenClickTrimmed(trim: number) {
  if (!_isEnabled()) return;
  _refreshMaster();
  playSpec(CREATE_SPECS["pen-click"], Math.max(0, Math.min(1, trim)));
}

/** Play soft-tap at an arbitrary trim — test page only. */
export function playSoftTapTrimmed(trim: number) {
  if (!_isEnabled()) return;
  _refreshMaster();
  playSpec(CHECK_SPECS["tap-soft"], Math.max(0, Math.min(1, trim)));
}

/** Play the "new task created" sound. Call right when the user submits a new task. */
export function playOnCreate() {
  if (!_isEnabled()) return;
  _refreshMaster();
  playSpec(CHECK_SPECS[PICK_ON_CREATE], CREATE_GAIN_TRIM);
}
