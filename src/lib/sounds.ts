"use client";

/* ════════════════════════════════════════════════════════════
   Apple-style sound synth — Web Audio API.
   Sine-heavy, harmonics layered with slight detuning,
   soft attack, exponential decay, musical frequencies.
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

let _master = 0.6;
export function setMasterVolume(v: number) {
  _master = Math.max(0, Math.min(1, v));
}
export function getMasterVolume() {
  return _master;
}

/* ─── Voice helpers ───────────────────────────────────────── */

type Voice = {
  freq: number;
  freqEnd?: number;
  glideTo?: number;          // smooth pitch arrival time (seconds)
  type?: OscillatorType;     // default "sine"
  detune?: number;           // cents
  delay?: number;            // start offset from t0
  attack: number;            // seconds
  decay: number;             // seconds (peak → silence)
  sustain?: number;          // gain at end-of-decay relative to peak (0..1)
  release?: number;          // extra tail length after decay
  peak: number;              // 0..1 (will be scaled by master)
};

function makeVoice(ctx: AudioContext, out: GainNode, t0: number, v: Voice) {
  const start = t0 + (v.delay ?? 0);
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = v.type ?? "sine";
  osc.frequency.setValueAtTime(v.freq, start);
  if (v.detune) osc.detune.setValueAtTime(v.detune, start);
  if (v.freqEnd !== undefined) {
    const glide = v.glideTo ?? v.attack + v.decay;
    osc.frequency.exponentialRampToValueAtTime(
      Math.max(1, v.freqEnd),
      start + glide
    );
  }
  const peak = v.peak;
  const sustain = v.sustain ?? 0;
  const release = v.release ?? 0;
  g.gain.setValueAtTime(0.0001, start);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), start + v.attack);
  if (sustain > 0) {
    g.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak * sustain),
      start + v.attack + v.decay
    );
    g.gain.exponentialRampToValueAtTime(0.0001, start + v.attack + v.decay + release);
  } else {
    g.gain.exponentialRampToValueAtTime(0.0001, start + v.attack + v.decay);
  }
  osc.connect(g).connect(out);
  const stopAt = start + v.attack + v.decay + release + 0.05;
  osc.start(start);
  osc.stop(stopAt);
}

function makeNoise(ctx: AudioContext, durationSec: number) {
  const length = Math.max(1, Math.floor(ctx.sampleRate * durationSec));
  const buf = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function play(voices: Voice[]) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = _master;
  out.connect(ctx.destination);
  for (const v of voices) makeVoice(ctx, out, t, v);
}

function playWithNoise(
  voices: Voice[],
  noise: {
    duration: number;
    filterType: BiquadFilterType;
    freq: number;
    freqEnd?: number;
    q?: number;
    peak: number;
    attack: number;
    decay: number;
    delay?: number;
  } | null
) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = _master;
  out.connect(ctx.destination);
  for (const v of voices) makeVoice(ctx, out, t, v);
  if (noise) {
    const start = t + (noise.delay ?? 0);
    const src = makeNoise(ctx, noise.duration);
    const filter = ctx.createBiquadFilter();
    filter.type = noise.filterType;
    filter.frequency.setValueAtTime(noise.freq, start);
    if (noise.freqEnd !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, noise.freqEnd),
        start + noise.duration
      );
    }
    if (noise.q !== undefined) filter.Q.value = noise.q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(noise.peak, start + noise.attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + noise.attack + noise.decay);
    src.connect(filter).connect(g).connect(out);
    src.start(start);
    src.stop(start + noise.duration);
  }
}

/* ════════════════════════════════════════════════════════════
   Check (task bajarildi) — 10 Apple-style variants
   ════════════════════════════════════════════════════════════ */

export type CheckVariant =
  | "pebble-click" | "plastic-click" | "glass-click" | "wood-click" | "bubble-click"
  | "switch-click" | "key-click" | "lock-click" | "tap-click" | "mute-click";

export const CHECK_VARIANTS: { id: CheckVariant; label: string; hint: string }[] = [
  { id: "pebble-click",  label: "Pebble click",  hint: "Yumshoq tosh taq" },
  { id: "plastic-click", label: "Plastic click", hint: "Yengil plastik" },
  { id: "glass-click",   label: "Glass click",   hint: "Mayda shisha" },
  { id: "wood-click",    label: "Wood click",    hint: "Yog'och bloki" },
  { id: "bubble-click",  label: "Bubble click",  hint: "Mayda pop" },
  { id: "switch-click",  label: "Switch click",  hint: "Mexanik tugma" },
  { id: "key-click",     label: "Key click",     hint: "iOS keyboard" },
  { id: "lock-click",    label: "Lock click",    hint: "iOS lock" },
  { id: "tap-click",     label: "Tap click",     hint: "Barmoq tegishi" },
  { id: "mute-click",    label: "Mute click",    hint: "Eng yumshoq" },
];

export function playCheck(v: CheckVariant) {
  switch (v) {
    case "pebble-click":
      // Short downward sine + faint high tick
      playWithNoise(
        [
          { freq: 700, freqEnd: 360, glideTo: 0.025, attack: 0.001, decay: 0.045, peak: 0.36 },
          { freq: 1400, attack: 0.001, decay: 0.020, peak: 0.10 },
        ],
        { duration: 0.012, filterType: "highpass", freq: 3500, peak: 0.18, attack: 0.0008, decay: 0.011 }
      );
      break;
    case "plastic-click":
      // Triangle thock + crisp noise transient
      playWithNoise(
        [
          { freq: 820, type: "triangle", attack: 0.001, decay: 0.030, peak: 0.32 },
          { freq: 410, type: "triangle", attack: 0.002, decay: 0.040, peak: 0.18 },
        ],
        { duration: 0.014, filterType: "highpass", freq: 4000, peak: 0.22, attack: 0.0005, decay: 0.013 }
      );
      break;
    case "glass-click":
      // Very brief crystalline tick
      play([
        { freq: 2349, attack: 0.001, decay: 0.080, peak: 0.22 },
        { freq: 2349, detune: 10, attack: 0.001, decay: 0.085, peak: 0.16 },
        { freq: 4698, attack: 0.001, decay: 0.050, peak: 0.08 },
      ]);
      break;
    case "wood-click":
      // Filtered low knock + warm body
      playWithNoise(
        [
          { freq: 240, type: "triangle", attack: 0.001, decay: 0.060, peak: 0.34 },
          { freq: 480, type: "triangle", attack: 0.002, decay: 0.050, peak: 0.16 },
          { freq: 180, attack: 0.003, decay: 0.080, peak: 0.20 },
        ],
        { duration: 0.020, filterType: "bandpass", freq: 1500, q: 1.2, peak: 0.18, attack: 0.0008, decay: 0.019 }
      );
      break;
    case "bubble-click":
      // Quick pitch pop — short and round
      play([
        { freq: 380, freqEnd: 760, glideTo: 0.012, attack: 0.001, decay: 0.030, peak: 0.36 },
        { freq: 760, freqEnd: 520, glideTo: 0.020, attack: 0.002, decay: 0.040, peak: 0.20, delay: 0.012 },
      ]);
      break;
    case "switch-click":
      // Two-stage mechanical: noise click + brief resonant tone
      playWithNoise(
        [
          { freq: 880, attack: 0.001, decay: 0.025, peak: 0.22, delay: 0.008 },
          { freq: 440, attack: 0.002, decay: 0.035, peak: 0.16, delay: 0.008 },
        ],
        { duration: 0.010, filterType: "highpass", freq: 3500, peak: 0.30, attack: 0.0005, decay: 0.009 }
      );
      break;
    case "key-click":
      // iOS keyboard-style: lowpass noise + low resonance
      playWithNoise(
        [{ freq: 320, attack: 0.001, decay: 0.025, peak: 0.20 }],
        { duration: 0.012, filterType: "lowpass", freq: 2200, q: 0.9, peak: 0.34, attack: 0.0005, decay: 0.011 }
      );
      break;
    case "lock-click":
      // Brief crisp mid-high click + subtle low body
      playWithNoise(
        [
          { freq: 1200, attack: 0.001, decay: 0.040, peak: 0.26 },
          { freq: 600,  attack: 0.002, decay: 0.050, peak: 0.16 },
        ],
        { duration: 0.008, filterType: "highpass", freq: 3000, peak: 0.20, attack: 0.0005, decay: 0.007 }
      );
      break;
    case "tap-click":
      // Soft finger-on-glass tap
      playWithNoise(
        [
          { freq: 540, attack: 0.002, decay: 0.045, peak: 0.30 },
          { freq: 1080, attack: 0.001, decay: 0.030, peak: 0.14 },
        ],
        { duration: 0.014, filterType: "bandpass", freq: 1800, q: 1.0, peak: 0.16, attack: 0.0008, decay: 0.013 }
      );
      break;
    case "mute-click":
      // Whisper-quiet click — for low-attention use
      play([
        { freq: 1100, attack: 0.001, decay: 0.020, peak: 0.12 },
        { freq: 550,  attack: 0.002, decay: 0.025, peak: 0.08 },
      ]);
      break;
  }
}

/* ════════════════════════════════════════════════════════════
   Day 100% complete — 10 Apple-style variants
   ════════════════════════════════════════════════════════════ */

export type CompleteVariant =
  | "achievement" | "tritone-up" | "sparkle" | "bloom" | "awakening"
  | "crystal-seq" | "fanfare" | "pulse" | "major-triad" | "calm-chord";

export const COMPLETE_VARIANTS: { id: CompleteVariant; label: string; hint: string }[] = [
  { id: "achievement", label: "Achievement", hint: "Major arpeggio" },
  { id: "tritone-up",  label: "Tritone up",  hint: "Ko'tariluvchi ikki nota" },
  { id: "sparkle",     label: "Sparkle",     hint: "Tez kaskad" },
  { id: "bloom",       label: "Bloom",       hint: "Keng harmonik gullash" },
  { id: "awakening",   label: "Awakening",   hint: "Sekin ko'tariluvchi ton" },
  { id: "crystal-seq", label: "Crystal seq", hint: "4 ta kristall nota" },
  { id: "fanfare",     label: "Soft fanfare", hint: "Karnay akkord" },
  { id: "pulse",       label: "Pulse",       hint: "Yurak urishi" },
  { id: "major-triad", label: "Major triad", hint: "Akkord + uchqun" },
  { id: "calm-chord",  label: "Calm chord",  hint: "Tinch akkord" },
];

export function playComplete(v: CompleteVariant) {
  switch (v) {
    case "achievement":
      // C5 E5 G5 C6 arpeggio
      play([
        { freq: 523.25, attack: 0.005, decay: 0.50, peak: 0.30 },
        { freq: 659.25, attack: 0.005, decay: 0.50, peak: 0.28, delay: 0.10 },
        { freq: 783.99, attack: 0.005, decay: 0.55, peak: 0.28, delay: 0.20 },
        { freq: 1046.5, attack: 0.005, decay: 0.70, peak: 0.30, delay: 0.30 },
        { freq: 1046.5, detune: 8, attack: 0.006, decay: 0.70, peak: 0.20, delay: 0.30 },
      ]);
      break;
    case "tritone-up":
      // Ascending perfect fourth
      play([
        { freq: 987.77,                attack: 0.005, decay: 0.35, peak: 0.30 }, // B5
        { freq: 987.77, detune: 6,     attack: 0.006, decay: 0.36, peak: 0.20 },
        { freq: 1318.51, delay: 0.12,  attack: 0.005, decay: 0.45, peak: 0.32 }, // E6
        { freq: 1318.51, detune: 6, delay: 0.12, attack: 0.006, decay: 0.46, peak: 0.20 },
      ]);
      break;
    case "sparkle":
      play([
        { freq: 2093,  attack: 0.003, decay: 0.30, peak: 0.22, delay: 0.00 },
        { freq: 2637,  attack: 0.003, decay: 0.28, peak: 0.20, delay: 0.05 },
        { freq: 3136,  attack: 0.003, decay: 0.26, peak: 0.18, delay: 0.10 },
        { freq: 3520,  attack: 0.003, decay: 0.24, peak: 0.16, delay: 0.15 },
        { freq: 4186,  attack: 0.003, decay: 0.22, peak: 0.14, delay: 0.20 },
        { freq: 1046.5,                attack: 0.008, decay: 0.55, peak: 0.18, delay: 0.00 },
      ]);
      break;
    case "bloom":
      play([
        { freq: 440,                   attack: 0.040, decay: 0.90, peak: 0.30 }, // A4
        { freq: 554.37,                attack: 0.060, decay: 0.95, peak: 0.22 }, // C#5
        { freq: 659.25,                attack: 0.080, decay: 1.00, peak: 0.22 }, // E5
        { freq: 880,                   attack: 0.100, decay: 1.05, peak: 0.18 }, // A5
        { freq: 220,                   attack: 0.050, decay: 1.10, peak: 0.20 }, // A3
      ]);
      break;
    case "awakening":
      play([
        { freq: 220, freqEnd: 660, glideTo: 0.40, attack: 0.080, decay: 0.80, peak: 0.28 },
        { freq: 110, freqEnd: 330, glideTo: 0.40, attack: 0.090, decay: 0.85, peak: 0.22 },
        { freq: 660, attack: 0.200, decay: 0.50, peak: 0.14, delay: 0.30 },
      ]);
      break;
    case "crystal-seq":
      play([
        { freq: 1318.51, attack: 0.003, decay: 0.45, peak: 0.24, delay: 0.00 },
        { freq: 1567.98, attack: 0.003, decay: 0.45, peak: 0.22, delay: 0.10 },
        { freq: 1975.53, attack: 0.003, decay: 0.45, peak: 0.20, delay: 0.20 },
        { freq: 2637.02, attack: 0.003, decay: 0.50, peak: 0.20, delay: 0.30 },
      ]);
      break;
    case "fanfare":
      play([
        { freq: 392, type: "triangle", attack: 0.015, decay: 0.55, peak: 0.26 }, // G4
        { freq: 523.25, type: "triangle", attack: 0.015, decay: 0.55, peak: 0.24, delay: 0.06 }, // C5
        { freq: 659.25, type: "triangle", attack: 0.015, decay: 0.60, peak: 0.22, delay: 0.12 }, // E5
        { freq: 783.99, type: "triangle", attack: 0.015, decay: 0.65, peak: 0.20, delay: 0.18 }, // G5
      ]);
      break;
    case "pulse":
      play([
        { freq: 440, attack: 0.010, decay: 0.40, peak: 0.30 },
        { freq: 220, attack: 0.012, decay: 0.45, peak: 0.20 },
        { freq: 440, attack: 0.010, decay: 0.50, peak: 0.32, delay: 0.18 },
        { freq: 880, attack: 0.012, decay: 0.50, peak: 0.18, delay: 0.18 },
      ]);
      break;
    case "major-triad":
      // C-E-G simultaneously + high sparkle
      play([
        { freq: 523.25, attack: 0.008, decay: 0.80, peak: 0.26 },
        { freq: 659.25, attack: 0.008, decay: 0.80, peak: 0.22 },
        { freq: 783.99, attack: 0.008, decay: 0.80, peak: 0.20 },
        { freq: 1046.5, attack: 0.005, decay: 0.40, peak: 0.14, delay: 0.05 },
        { freq: 1567.98, attack: 0.005, decay: 0.35, peak: 0.10, delay: 0.10 },
      ]);
      break;
    case "calm-chord":
      // Sustained C-E-G with very gentle attack
      play([
        { freq: 392,    attack: 0.060, decay: 1.20, peak: 0.22 }, // G4
        { freq: 523.25, attack: 0.080, decay: 1.20, peak: 0.22 }, // C5
        { freq: 659.25, attack: 0.100, decay: 1.20, peak: 0.20 }, // E5
        { freq: 261.63, attack: 0.060, decay: 1.30, peak: 0.18 }, // C4
      ]);
      break;
  }
}

/* ════════════════════════════════════════════════════════════
   New task created — 10 Apple-style variants
   ════════════════════════════════════════════════════════════ */

export type CreateVariant =
  | "brush" | "sigh" | "drop-in" | "wisp" | "bubble"
  | "pat" | "touch" | "snap" | "card" | "ping";

export const CREATE_VARIANTS: { id: CreateVariant; label: string; hint: string }[] = [
  { id: "brush",   label: "Brush",   hint: "Yengil cho'tka" },
  { id: "sigh",    label: "Sigh",    hint: "Yumshoq nafas" },
  { id: "drop-in", label: "Drop in", hint: "Yumshoq tushish" },
  { id: "wisp",    label: "Wisp",    hint: "Yengil havo" },
  { id: "bubble",  label: "Bubble",  hint: "Yumshoq pufakcha" },
  { id: "pat",     label: "Pat",     hint: "Yumshoq taq" },
  { id: "touch",   label: "Touch",   hint: "Tegish" },
  { id: "snap",    label: "Snap",    hint: "Yengil chart" },
  { id: "card",    label: "Card",    hint: "Qog'oz harakat" },
  { id: "ping",    label: "Ping",    hint: "Qisqa kristall" },
];

export function playCreate(v: CreateVariant) {
  switch (v) {
    case "brush":
      playWithNoise(
        [],
        { duration: 0.18, filterType: "bandpass", freq: 600, freqEnd: 2400, q: 1.5, peak: 0.32, attack: 0.020, decay: 0.16 }
      );
      break;
    case "sigh":
      playWithNoise(
        [{ freq: 880, freqEnd: 660, attack: 0.020, decay: 0.18, peak: 0.10 }],
        { duration: 0.22, filterType: "lowpass", freq: 1800, freqEnd: 600, q: 0.8, peak: 0.22, attack: 0.030, decay: 0.20 }
      );
      break;
    case "drop-in":
      play([
        { freq: 660, freqEnd: 330, attack: 0.005, decay: 0.20, peak: 0.30 },
        { freq: 330, freqEnd: 165, attack: 0.008, decay: 0.30, peak: 0.18 },
        { freq: 1320, attack: 0.003, decay: 0.10, peak: 0.10 },
      ]);
      break;
    case "wisp":
      playWithNoise(
        [],
        { duration: 0.16, filterType: "highpass", freq: 2400, freqEnd: 5000, q: 0.7, peak: 0.20, attack: 0.020, decay: 0.14 }
      );
      break;
    case "bubble":
      play([
        { freq: 300, freqEnd: 600, glideTo: 0.05, attack: 0.005, decay: 0.10, peak: 0.32 },
        { freq: 600, freqEnd: 400, glideTo: 0.06, attack: 0.008, decay: 0.12, peak: 0.18, delay: 0.05 },
      ]);
      break;
    case "pat":
      playWithNoise(
        [{ freq: 180, attack: 0.003, decay: 0.06, peak: 0.20 }],
        { duration: 0.04, filterType: "lowpass", freq: 600, peak: 0.30, attack: 0.001, decay: 0.038 }
      );
      break;
    case "touch":
      play([
        { freq: 1760, attack: 0.002, decay: 0.06, peak: 0.16 },
        { freq: 880,  attack: 0.003, decay: 0.08, peak: 0.10 },
      ]);
      break;
    case "snap":
      playWithNoise(
        [{ freq: 220, attack: 0.002, decay: 0.05, peak: 0.18 }],
        { duration: 0.03, filterType: "highpass", freq: 3000, peak: 0.24, attack: 0.001, decay: 0.028 }
      );
      break;
    case "card":
      playWithNoise(
        [],
        { duration: 0.12, filterType: "bandpass", freq: 800, freqEnd: 200, q: 1.0, peak: 0.30, attack: 0.005, decay: 0.11 }
      );
      break;
    case "ping":
      play([
        { freq: 2349, attack: 0.002, decay: 0.20, peak: 0.18 },
        { freq: 4698, attack: 0.002, decay: 0.15, peak: 0.08 },
      ]);
      break;
  }
}

/* ════════════════════════════════════════════════════════════
   Persistence (localStorage)
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
    return { check: null, complete: null, create: null, enabled: true, volume: 0.6 };
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
      const v = raw == null ? 0.6 : parseFloat(raw);
      return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.6;
    } catch { return 0.6; }
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
