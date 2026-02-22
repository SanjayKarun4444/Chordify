import { ensureAudioGraph, getInstrumentBus, getBassBus } from "./audio-engine";
import { getInstrument } from "./instruments/registry";

/** Clamp filter frequency to stay safely below Nyquist (prevents BiquadFilter NaN state) */
const safeFreq = (f: number, sr: number) => Math.min(f, sr * 0.45);

function voicePiano(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  // Lowpass damping filter: freq*6 → freq*2 over note duration
  const damper = ctx.createBiquadFilter();
  damper.type = "lowpass";
  damper.frequency.setValueAtTime(safeFreq(freq * 6, ctx.sampleRate), t);
  damper.frequency.exponentialRampToValueAtTime(safeFreq(freq * 2, ctx.sampleRate), t + dur);
  damper.Q.value = 0.7;
  amp.connect(damper);
  damper.connect(out);

  // Micro-panning: seeded by freq for consistency
  const pan = ctx.createStereoPanner();
  const seed = (freq * 137.5) % 1;
  pan.pan.value = (seed - 0.5) * 0.3; // ±0.15
  damper.disconnect();
  damper.connect(pan);
  pan.connect(out);

  const o1 = ctx.createOscillator();
  o1.type = "sine";
  o1.frequency.value = freq;
  o1.connect(amp);
  const o2 = ctx.createOscillator();
  o2.type = "triangle";
  o2.frequency.value = freq * 2.001;
  const hg = ctx.createGain();
  hg.gain.value = 0.08;
  o2.connect(hg);
  hg.connect(amp);

  // Hammer transient: short noise burst at onset → bandpass at freq*4
  const noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.005, ctx.sampleRate);
  const nd = noiseBuf.getChannelData(0);
  for (let i = 0; i < noiseBuf.length; i++) nd[i] = Math.random() * 2 - 1;
  const noiseSrc = ctx.createBufferSource();
  noiseSrc.buffer = noiseBuf;
  const noiseBP = ctx.createBiquadFilter();
  noiseBP.type = "bandpass";
  noiseBP.frequency.value = safeFreq(freq * 4, ctx.sampleRate);
  noiseBP.Q.value = 1;
  const noiseGain = ctx.createGain();
  noiseGain.gain.value = 0.12;
  noiseSrc.connect(noiseBP);
  noiseBP.connect(noiseGain);
  noiseGain.connect(amp);
  noiseSrc.start(t);
  noiseSrc.stop(t + 0.005);

  const r = Math.min(dur * 0.4, 1.8);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.45, t + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.14, t + 0.12);
  amp.gain.exponentialRampToValueAtTime(0.08, t + dur - 0.05);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + r);
  o1.start(t);
  o2.start(t);
  o1.stop(t + dur + r + 0.1);
  o2.stop(t + dur + r + 0.1);
}

function voiceSynth(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.Q.value = 3.5;
  filt.frequency.setValueAtTime(200, t);
  filt.frequency.exponentialRampToValueAtTime(safeFreq(freq * 6, ctx.sampleRate), t + 0.4);
  amp.connect(filt);
  filt.connect(out);

  [0, 7, -7, 12].forEach((dt, i) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.detune.value = dt;
    const g = ctx.createGain();
    g.gain.value = 0.15;

    // Alternate ±0.2 per oscillator for stereo width
    const pan = ctx.createStereoPanner();
    pan.pan.value = i % 2 === 0 ? -0.2 : 0.2;
    o.connect(g);
    g.connect(pan);
    pan.connect(amp);

    o.start(t);
    o.stop(t + dur + 0.3);
  });
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.50, t + 0.08);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
}

function voicePad(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = safeFreq(freq * 4, ctx.sampleRate);
  f.Q.value = 0.5;
  amp.connect(f);
  f.connect(out);
  // Pad already wide via 5 detuned oscs — pan 0
  [-14, -7, 0, 7, 14].forEach((dt, i) => {
    const o = ctx.createOscillator();
    o.type = i % 2 === 0 ? "sine" : "triangle";
    o.frequency.value = freq;
    o.detune.value = dt;
    const g = ctx.createGain();
    g.gain.value = 0.14;
    o.connect(g);
    g.connect(amp);
    o.start(t);
    o.stop(t + dur + 2);
  });
  const atk = Math.min(dur * 0.35, 1.2);
  const rel = Math.min(dur * 0.5, 2.0);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.45, t + atk);
  amp.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
}

function voiceOrgan(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  amp.connect(out);

  // Vibrato LFO: 5.5Hz sine modulating all osc frequencies at ~10 cents
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 5.5;
  const lfoGain = ctx.createGain();
  // 0.6% depth ≈ 10 cents: freq * 0.006
  lfoGain.gain.value = freq * 0.006;
  lfo.connect(lfoGain);
  lfo.start(t);
  lfo.stop(t + dur + 0.1);

  [
    { m: 1, v: 0.35 },
    { m: 2, v: 0.25 },
    { m: 3, v: 0.15 },
    { m: 4, v: 0.1 },
    { m: 6, v: 0.06 },
  ].forEach(({ m, v }) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq * m;
    // Connect LFO modulation to frequency
    lfoGain.connect(o.frequency);
    const g = ctx.createGain();
    g.gain.value = v;
    o.connect(g);
    g.connect(amp);
    o.start(t);
    o.stop(t + dur + 0.06);
  });
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.50, t + 0.012);
  amp.gain.linearRampToValueAtTime(0.0001, t + dur + 0.05);
}

function voiceBells(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  amp.connect(out);
  [
    { r: 1, v: 0.5, d: dur + 1.5 },
    { r: 2.76, v: 0.25, d: dur * 0.6 },
    { r: 5.4, v: 0.15, d: dur * 0.4 },
  ].forEach(({ r, v, d }, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq * r;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v * 0.45, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);

    // Random ±0.35 per partial for stereo spread
    const pan = ctx.createStereoPanner();
    const seed = ((freq * r * 97.3) % 1);
    pan.pan.value = (seed - 0.5) * 0.7; // ±0.35
    o.connect(g);
    g.connect(pan);
    pan.connect(amp);

    o.start(t);
    o.stop(t + d + 0.1);
  });
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.50, t + 0.002);
}

function voicePluck(freq: number, t: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  // Lowpass filter: Karplus-Strong-style darkening
  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.setValueAtTime(safeFreq(freq * 12, ctx.sampleRate), t);
  filt.frequency.exponentialRampToValueAtTime(safeFreq(freq * 1.5, ctx.sampleRate), t + 0.4);
  filt.Q.value = 0.7;
  amp.connect(filt);

  // Panned slightly right
  const pan = ctx.createStereoPanner();
  pan.pan.value = 0.1;
  filt.connect(pan);
  pan.connect(out);

  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;
  o.connect(amp);
  o.start(t);
  o.stop(t + 1.0);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.55, t + 0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
}

function voiceBass(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const bf = freq / 2;
  const amp = ctx.createGain();
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = bf;
  osc.connect(amp);
  const f = ctx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = 500;
  amp.connect(f);
  // Route to bass bus (always center)
  f.connect(getBassBus()!.input);
  // Fix bass click: zero-start with 3ms attack ramp
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.7, t + 0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur * 0.5, 1.0));
  osc.start(t);
  osc.stop(t + dur + 0.1);
}

function voiceEPiano(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  // Random ±0.1 panning
  const pan = ctx.createStereoPanner();
  const seed = (freq * 211.7) % 1;
  pan.pan.value = (seed - 0.5) * 0.2; // ±0.1
  amp.connect(pan);
  pan.connect(out);

  const car = ctx.createOscillator();
  car.type = "sine";
  car.frequency.value = freq;
  const mod = ctx.createOscillator();
  const mg = ctx.createGain();
  // Rhodes-like FM: mod ratio 7, reduced mod index
  mod.frequency.value = freq * 7;
  mg.gain.setValueAtTime(freq * 3, t);
  mg.gain.exponentialRampToValueAtTime(freq * 0.3, t + 0.3);
  mod.connect(mg);
  mg.connect(car.frequency);
  car.connect(amp);
  mod.start(t);
  car.start(t);
  mod.stop(t + dur + 0.4);
  car.stop(t + dur + 0.4);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.48, t + 0.007);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.35);
}

// Legacy IDs handled by the switch below — must NOT go through registry
// to avoid infinite recursion (registry wraps back to playVoice for these)
const LEGACY_IDS = new Set(["piano", "synth", "pad", "organ", "bells", "pluck", "bass", "epiano"]);

export function playVoice(inst: string, freq: number, t: number, dur: number): void {
  // Legacy instruments: use direct switch to avoid recursion
  if (LEGACY_IDS.has(inst)) {
    switch (inst) {
      case "piano":  voicePiano(freq, t, dur); break;
      case "synth":  voiceSynth(freq, t, dur); break;
      case "pad":    voicePad(freq, t, dur); break;
      case "organ":  voiceOrgan(freq, t, dur); break;
      case "bells":  voiceBells(freq, t, dur); break;
      case "pluck":  voicePluck(freq, t); break;
      case "bass":   voiceBass(freq, t, dur); break;
      case "epiano": voiceEPiano(freq, t, dur); break;
    }
    return;
  }

  // New instruments: look up in registry
  const def = getInstrument(inst);
  if (def) {
    def.play(freq, t, dur);
    return;
  }

  // Unknown ID: fall back to piano
  voicePiano(freq, t, dur);
}
