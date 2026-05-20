"use client";

/* ════════════════════════════════════════════════════════════
   Sound synth library — Web Audio API.
   No audio files, every sound is generated in code.
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

/** Master gain — applied to every sound. 0..1 */
let _master = 0.6;
export function setMasterVolume(v: number) {
  _master = Math.max(0, Math.min(1, v));
}
export function getMasterVolume() {
  return _master;
}

function makeNoise(ctx: AudioContext, durationSec: number): AudioBufferSourceNode {
  const sampleRate = ctx.sampleRate;
  const length = Math.max(1, Math.floor(sampleRate * durationSec));
  const buf = ctx.createBuffer(1, length, sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

function envelopeGain(
  ctx: AudioContext,
  start: number,
  peak: number,
  attack: number,
  decay: number,
  sustain: number,
  release: number,
  totalDuration: number
): GainNode {
  const g = ctx.createGain();
  const t = start;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(
    Math.max(0.0001, peak * sustain),
    t + attack + decay
  );
  g.gain.exponentialRampToValueAtTime(0.0001, t + totalDuration - release < t + attack + decay ? t + totalDuration : t + totalDuration - release);
  g.gain.exponentialRampToValueAtTime(0.0001, t + totalDuration);
  return g;
}

/* ─── Check (task bajarildi) variants ─────────────────────── */

export type CheckVariant = "tick" | "pop" | "bell" | "wood" | "chime";

export const CHECK_VARIANTS: { id: CheckVariant; label: string; hint: string }[] = [
  { id: "tick",  label: "Tick",  hint: "Qisqa va aniq" },
  { id: "pop",   label: "Pop",   hint: "Yumshoq pufakcha" },
  { id: "bell",  label: "Bell",  hint: "Yengil qo'ng'iroq" },
  { id: "wood",  label: "Wood",  hint: "Yog'och taqillaq" },
  { id: "chime", label: "Chime", hint: "Ikki notali akkord" },
];

export function playCheck(variant: CheckVariant) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = _master;
  out.connect(ctx.destination);

  switch (variant) {
    case "tick": {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.exponentialRampToValueAtTime(800, t + 0.06);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.1);
      break;
    }
    case "pop": {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(720, t + 0.04);
      osc.frequency.exponentialRampToValueAtTime(420, t + 0.12);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.45, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.16);
      break;
    }
    case "bell": {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g = ctx.createGain();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.value = 1320;
      osc2.frequency.value = 1980;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.32, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc1.connect(g);
      osc2.connect(g);
      g.connect(out);
      osc1.start(t); osc2.start(t);
      osc1.stop(t + 0.55); osc2.stop(t + 0.55);
      break;
    }
    case "wood": {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(140, t + 0.08);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.45, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
      osc.connect(g).connect(out);
      // tiny noise burst at start for "knock" texture
      const n = makeNoise(ctx, 0.02);
      const nf = ctx.createBiquadFilter();
      nf.type = "lowpass";
      nf.frequency.value = 800;
      const ng = ctx.createGain();
      ng.gain.setValueAtTime(0.15, t);
      ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.03);
      n.connect(nf).connect(ng).connect(out);
      osc.start(t); n.start(t);
      osc.stop(t + 0.15); n.stop(t + 0.04);
      break;
    }
    case "chime": {
      const freqs = [880, 1320];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        const start = t + i * 0.02;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.28, start + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.35);
        osc.connect(g).connect(out);
        osc.start(start);
        osc.stop(start + 0.4);
      });
      break;
    }
  }
}

/* ─── Day 100% complete variants ──────────────────────────── */

export type CompleteVariant = "triumph" | "ascend" | "glow" | "resonance" | "glass";

export const COMPLETE_VARIANTS: { id: CompleteVariant; label: string; hint: string }[] = [
  { id: "triumph",   label: "Triumph",   hint: "Major akkord ko'tariladi" },
  { id: "ascend",    label: "Ascend",    hint: "3 ta ko'tariluvchi qo'ng'iroq" },
  { id: "glow",      label: "Glow",      hint: "Uzun yumshoq nur" },
  { id: "resonance", label: "Resonance", hint: "Yog'och va harmonika" },
  { id: "glass",     label: "Glass",     hint: "Shisha jaranglashi" },
];

export function playComplete(variant: CompleteVariant) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = _master;
  out.connect(ctx.destination);

  switch (variant) {
    case "triumph": {
      // C major chord (C5, E5, G5) ascending
      const chord = [523.25, 659.25, 783.99];
      chord.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "triangle";
        osc.frequency.value = f;
        const start = t + i * 0.05;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.22, start + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.7);
        osc.connect(g).connect(out);
        osc.start(start);
        osc.stop(start + 0.75);
      });
      break;
    }
    case "ascend": {
      const notes = [880, 1108.73, 1318.51]; // A5 C#6 E6
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        const start = t + i * 0.12;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.3, start + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.4);
        osc.connect(g).connect(out);
        osc.start(start);
        osc.stop(start + 0.45);
      });
      break;
    }
    case "glow": {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g = ctx.createGain();
      osc1.type = "sine";
      osc2.type = "sine";
      osc1.frequency.value = 523.25; // C5
      osc2.frequency.value = 783.99; // G5
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.3, t + 0.2);
      g.gain.setValueAtTime(0.3, t + 0.55);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
      osc1.connect(g);
      osc2.connect(g);
      g.connect(out);
      osc1.start(t); osc2.start(t);
      osc1.stop(t + 1.3); osc2.stop(t + 1.3);
      break;
    }
    case "resonance": {
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const g1 = ctx.createGain();
      const g2 = ctx.createGain();
      osc1.type = "triangle";
      osc2.type = "sine";
      osc1.frequency.value = 220;
      osc2.frequency.value = 660;
      g1.gain.setValueAtTime(0.0001, t);
      g1.gain.exponentialRampToValueAtTime(0.45, t + 0.01);
      g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);
      g2.gain.setValueAtTime(0.0001, t);
      g2.gain.exponentialRampToValueAtTime(0.2, t + 0.02);
      g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      osc1.connect(g1).connect(out);
      osc2.connect(g2).connect(out);
      osc1.start(t); osc2.start(t);
      osc1.stop(t + 0.75); osc2.stop(t + 0.55);
      break;
    }
    case "glass": {
      const freqs = [1760, 2640];
      freqs.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = f;
        const start = t + i * 0.03;
        g.gain.setValueAtTime(0.0001, start);
        g.gain.exponentialRampToValueAtTime(0.2, start + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
        osc.connect(g).connect(out);
        osc.start(start);
        osc.stop(start + 0.5);
      });
      break;
    }
  }
}

/* ─── New task created variants ───────────────────────────── */

export type CreateVariant = "whoosh" | "softpop" | "click" | "air" | "lowtick";

export const CREATE_VARIANTS: { id: CreateVariant; label: string; hint: string }[] = [
  { id: "whoosh",  label: "Whoosh",  hint: "Filtrli shovqin" },
  { id: "softpop", label: "Soft pop", hint: "Past sine pufakcha" },
  { id: "click",   label: "Click",   hint: "Toza raqamli klik" },
  { id: "air",     label: "Air",     hint: "Qisqa nafas" },
  { id: "lowtick", label: "Low tick", hint: "Past tonli tick" },
];

export function playCreate(variant: CreateVariant) {
  const ctx = getCtx();
  if (!ctx) return;
  const t = ctx.currentTime;
  const out = ctx.createGain();
  out.gain.value = _master;
  out.connect(ctx.destination);

  switch (variant) {
    case "whoosh": {
      const n = makeNoise(ctx, 0.2);
      const f = ctx.createBiquadFilter();
      f.type = "bandpass";
      f.Q.value = 1.2;
      f.frequency.setValueAtTime(400, t);
      f.frequency.exponentialRampToValueAtTime(1800, t + 0.15);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.45, t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
      n.connect(f).connect(g).connect(out);
      n.start(t);
      n.stop(t + 0.2);
      break;
    }
    case "softpop": {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(280, t);
      osc.frequency.exponentialRampToValueAtTime(520, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.35, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.12);
      break;
    }
    case "click": {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "square";
      osc.frequency.value = 2200;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.001);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.025);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.03);
      break;
    }
    case "air": {
      const n = makeNoise(ctx, 0.14);
      const f = ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = 1200;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.28, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
      n.connect(f).connect(g).connect(out);
      n.start(t);
      n.stop(t + 0.14);
      break;
    }
    case "lowtick": {
      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(440, t);
      osc.frequency.exponentialRampToValueAtTime(220, t + 0.05);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.4, t + 0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      osc.connect(g).connect(out);
      osc.start(t);
      osc.stop(t + 0.08);
      break;
    }
  }
}

/* ─── Persisted selections ────────────────────────────────── */

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
      const v = parseFloat(window.localStorage.getItem(KEYS.volume) ?? "0.6");
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
