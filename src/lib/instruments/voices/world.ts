import { ensureAudioGraph, getInstrumentBus } from "../../audio-engine";

/**
 * Pan Flute — sine + breath noise, vibrato, slow attack
 */
export function voicePanFlute(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  amp.connect(out);

  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.value = freq;

  // Vibrato
  const vib = ctx.createOscillator();
  vib.type = "sine";
  vib.frequency.value = 5;
  const vibG = ctx.createGain();
  vibG.gain.value = freq * 0.008;
  vib.connect(vibG);
  vibG.connect(o.frequency);
  vib.start(t + 0.2);
  vib.stop(t + dur + 0.5);

  // Breath noise
  const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const nd = nBuf.getChannelData(0);
  for (let i = 0; i < nBuf.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.06;
  const ns = ctx.createBufferSource();
  ns.buffer = nBuf;
  ns.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq * 2;
  bp.Q.value = 2;
  ns.connect(bp);
  bp.connect(amp);
  ns.start(t);
  ns.stop(t + dur + 0.5);

  o.connect(amp);
  o.start(t);
  o.stop(t + dur + 0.5);

  const atk = Math.min(0.15, dur * 0.2);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.4, t + atk);
  amp.gain.linearRampToValueAtTime(0.35, t + dur);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
}

/**
 * Accordion — multi-partial sines with reed detuning, tremolo
 */
export function voiceAccordion(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  // Tremolo LFO
  const trem = ctx.createOscillator();
  trem.type = "sine";
  trem.frequency.value = 5.5;
  const tremG = ctx.createGain();
  tremG.gain.value = 0.08;
  trem.connect(tremG);
  tremG.connect(amp.gain);
  trem.start(t);
  trem.stop(t + dur + 0.2);

  amp.connect(out);

  const partials = [
    { m: 1, v: 0.3, det: 0 },
    { m: 1, v: 0.25, det: 3 },     // reed detuning
    { m: 2, v: 0.15, det: 0 },
    { m: 3, v: 0.1, det: 1 },
    { m: 4, v: 0.05, det: 0 },
  ];

  partials.forEach(({ m, v, det }) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq * m;
    o.detune.value = det;
    const g = ctx.createGain();
    g.gain.value = v;
    o.connect(g);
    g.connect(amp);
    o.start(t);
    o.stop(t + dur + 0.15);
  });

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.45, t + 0.04);
  amp.gain.linearRampToValueAtTime(0.0001, t + dur + 0.1);
}

/**
 * Sitar — Karplus-Strong + sympathetic resonances + waveshaping buzz
 */
export function voiceSitar(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  // Buzz waveshaper
  const shaper = ctx.createWaveShaper();
  const n = 4096;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(x * 2) + 0.1 * Math.sin(x * 8);
  }
  shaper.curve = curve;
  shaper.oversample = "2x";

  amp.connect(shaper);
  shaper.connect(out);

  // Main pluck (oscillator-based for sitar)
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;
  const og = ctx.createGain();
  og.gain.value = 0.3;
  o.connect(og);
  og.connect(amp);
  o.start(t);
  o.stop(t + dur + 1);

  // Sympathetic resonance bandpass
  [freq * 1.5, freq * 2, freq * 3].forEach((rf) => {
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = rf;
    bp.Q.value = 30;
    const rg = ctx.createGain();
    rg.gain.value = 0.04;
    og.connect(bp);
    bp.connect(rg);
    rg.connect(amp);
  });

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.4, t + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.8);
}

/**
 * Harmonica — square+sine blend, breath noise, vibrato
 */
export function voiceHarmonica(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1400;
  bp.Q.value = 1.5;
  amp.connect(bp);
  bp.connect(out);

  const sq = ctx.createOscillator();
  sq.type = "square";
  sq.frequency.value = freq;
  const si = ctx.createOscillator();
  si.type = "sine";
  si.frequency.value = freq;

  // Vibrato
  const vib = ctx.createOscillator();
  vib.type = "sine";
  vib.frequency.value = 5.5;
  const vibG = ctx.createGain();
  vibG.gain.value = freq * 0.01;
  vib.connect(vibG);
  vibG.connect(sq.frequency);
  vibG.connect(si.frequency);
  vib.start(t + 0.1);
  vib.stop(t + dur + 0.3);

  const g1 = ctx.createGain();
  g1.gain.value = 0.2;
  const g2 = ctx.createGain();
  g2.gain.value = 0.25;
  sq.connect(g1);
  si.connect(g2);
  g1.connect(amp);
  g2.connect(amp);

  sq.start(t);
  si.start(t);
  sq.stop(t + dur + 0.3);
  si.stop(t + dur + 0.3);

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.4, t + 0.05);
  amp.gain.linearRampToValueAtTime(0.0001, t + dur + 0.2);
}

/**
 * Oboe — narrow pulse wave, formant resonances
 */
export function voiceOboe(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  amp.connect(out);

  // Dual sawtooths subtracted = narrow pulse
  const saw1 = ctx.createOscillator();
  saw1.type = "sawtooth";
  saw1.frequency.value = freq;
  const saw2 = ctx.createOscillator();
  saw2.type = "sawtooth";
  saw2.frequency.value = freq;
  saw2.detune.value = 1200 * 0.1; // Offset for pulse width

  const g1 = ctx.createGain();
  g1.gain.value = 0.3;
  const g2 = ctx.createGain();
  g2.gain.value = -0.28; // Subtract
  saw1.connect(g1);
  saw2.connect(g2);

  // Formant resonances
  const f1 = ctx.createBiquadFilter();
  f1.type = "peaking";
  f1.frequency.value = 1400;
  f1.Q.value = 5;
  f1.gain.value = 8;
  const f2 = ctx.createBiquadFilter();
  f2.type = "peaking";
  f2.frequency.value = 2800;
  f2.Q.value = 6;
  f2.gain.value = 5;

  g1.connect(f1);
  g2.connect(f1);
  f1.connect(f2);
  f2.connect(amp);

  saw1.start(t);
  saw2.start(t);
  saw1.stop(t + dur + 0.2);
  saw2.stop(t + dur + 0.2);

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.35, t + 0.06);
  amp.gain.linearRampToValueAtTime(0.3, t + dur);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.15);
}

/**
 * Electric Violin — sawtooth + vibrato, bandpass body resonance, slow bowed attack
 */
export function voiceElectricViolin(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  // Body resonance
  const body = ctx.createBiquadFilter();
  body.type = "peaking";
  body.frequency.value = 800;
  body.Q.value = 3;
  body.gain.value = 4;
  amp.connect(body);
  body.connect(out);

  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;

  // Vibrato
  const vib = ctx.createOscillator();
  vib.type = "sine";
  vib.frequency.value = 5.5;
  const vibG = ctx.createGain();
  vibG.gain.value = freq * 0.012;
  vib.connect(vibG);
  vibG.connect(o.frequency);
  vib.start(t + 0.3);
  vib.stop(t + dur + 0.5);

  const g = ctx.createGain();
  g.gain.value = 0.25;
  o.connect(g);
  g.connect(amp);
  o.start(t);
  o.stop(t + dur + 0.5);

  const atk = Math.min(0.2, dur * 0.25);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.4, t + atk);
  amp.gain.linearRampToValueAtTime(0.35, t + dur);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.4);
}

/**
 * Harp — bright Karplus-Strong pluck with long release
 */
export function voiceHarp(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  amp.connect(out);

  // Pluck excitation with triangle + sine
  const o1 = ctx.createOscillator();
  o1.type = "triangle";
  o1.frequency.value = freq;
  const o2 = ctx.createOscillator();
  o2.type = "sine";
  o2.frequency.value = freq * 2;
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0.35, t);
  g1.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.1, t);
  g2.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.5);

  o1.connect(g1);
  o2.connect(g2);
  g1.connect(amp);
  g2.connect(amp);

  o1.start(t);
  o2.start(t);
  o1.stop(t + dur + 1.3);
  o2.stop(t + dur + 1.3);

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.45, t + 0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
}

/**
 * Marimba/Xylophone — sine+triangle, tuned bar partials, fast attack, short decay
 */
export function voiceMarimba(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  amp.connect(out);

  const partials = [
    { r: 1, v: 0.4, type: "sine" as OscillatorType },
    { r: 4, v: 0.15, type: "triangle" as OscillatorType },
    { r: 9.2, v: 0.06, type: "sine" as OscillatorType },
  ];

  partials.forEach(({ r, v, type }) => {
    const o = ctx.createOscillator();
    o.type = type;
    o.frequency.value = freq * r;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    const decayTime = r === 1 ? dur * 0.8 : dur * 0.3;
    g.gain.exponentialRampToValueAtTime(0.0001, t + decayTime + 0.1);
    o.connect(g);
    g.connect(amp);
    o.start(t);
    o.stop(t + decayTime + 0.2);
  });

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.5, t + 0.002);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.8 + 0.2);
}

/**
 * Vibraphone — sine + partials, tremolo LFO (motor vibrato), long sustain
 */
export function voiceVibraphone(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  // Motor tremolo
  const trem = ctx.createOscillator();
  trem.type = "sine";
  trem.frequency.value = 5.8;
  const tremG = ctx.createGain();
  tremG.gain.value = 0.12;
  trem.connect(tremG);
  tremG.connect(amp.gain);
  trem.start(t);
  trem.stop(t + dur + 1.5);

  amp.connect(out);

  const partials = [
    { r: 1, v: 0.35 },
    { r: 4, v: 0.12 },
    { r: 10, v: 0.05 },
  ];

  partials.forEach(({ r, v }) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq * r;
    const g = ctx.createGain();
    g.gain.setValueAtTime(v, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
    o.connect(g);
    g.connect(amp);
    o.start(t);
    o.stop(t + dur + 1.3);
  });

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.45, t + 0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 1.2);
}
