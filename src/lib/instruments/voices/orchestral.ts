import { ensureAudioGraph, getInstrumentBus } from "../../audio-engine";

/**
 * Orchestral Strings — 4-6 detuned sawtooths (ensemble), slow attack, LPF, chorus LFO
 */
export function voiceOrchestraStrings(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = freq * 3;
  lpf.Q.value = 0.5;
  amp.connect(lpf);
  lpf.connect(out);

  // Chorus LFO modulating filter
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.4;
  const lfoG = ctx.createGain();
  lfoG.gain.value = freq * 0.5;
  lfo.connect(lfoG);
  lfoG.connect(lpf.frequency);
  lfo.start(t);
  lfo.stop(t + dur + 2);

  const detunes = [-15, -8, -3, 3, 8, 15];
  detunes.forEach((dt) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.detune.value = dt;
    const g = ctx.createGain();
    g.gain.value = 0.1;
    o.connect(g);
    g.connect(amp);
    o.start(t);
    o.stop(t + dur + 1.5);
  });

  const atk = Math.min(0.4, dur * 0.3);
  const rel = Math.min(dur * 0.4, 1.5);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.4, t + atk);
  amp.gain.linearRampToValueAtTime(0.35, t + dur);
  amp.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
}

/**
 * Brass Section — square+sawtooth blend, formant at 1500Hz, medium attack with bloom
 */
export function voiceBrass(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  const formant = ctx.createBiquadFilter();
  formant.type = "peaking";
  formant.frequency.value = 1500;
  formant.Q.value = 3;
  formant.gain.value = 6;
  amp.connect(formant);
  formant.connect(out);

  // Square
  const sq = ctx.createOscillator();
  sq.type = "square";
  sq.frequency.value = freq;
  const g1 = ctx.createGain();
  g1.gain.value = 0.18;
  sq.connect(g1);
  g1.connect(amp);

  // Sawtooth
  const saw = ctx.createOscillator();
  saw.type = "sawtooth";
  saw.frequency.value = freq * 1.001;
  const g2 = ctx.createGain();
  g2.gain.value = 0.15;
  saw.connect(g2);
  g2.connect(amp);

  sq.start(t);
  saw.start(t);
  sq.stop(t + dur + 0.3);
  saw.stop(t + dur + 0.3);

  // Bloom envelope — attack with slight overshoot
  const atk = Math.min(0.12, dur * 0.15);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.5, t + atk);
  amp.gain.linearRampToValueAtTime(0.38, t + atk + 0.1);
  amp.gain.linearRampToValueAtTime(0.35, t + dur);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.25);
}

/**
 * Trombone Solo — sawtooth, dual formants, vibrato, slightly slower attack
 */
export function voiceTrombone(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  const f1 = ctx.createBiquadFilter();
  f1.type = "peaking";
  f1.frequency.value = 500;
  f1.Q.value = 3;
  f1.gain.value = 5;
  const f2 = ctx.createBiquadFilter();
  f2.type = "peaking";
  f2.frequency.value = 1500;
  f2.Q.value = 4;
  f2.gain.value = 4;
  amp.connect(f1);
  f1.connect(f2);
  f2.connect(out);

  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.value = freq;

  // Vibrato (delayed)
  const vib = ctx.createOscillator();
  vib.type = "sine";
  vib.frequency.value = 5;
  const vibG = ctx.createGain();
  vibG.gain.value = freq * 0.01;
  vib.connect(vibG);
  vibG.connect(o.frequency);
  vib.start(t + 0.3);
  vib.stop(t + dur + 0.4);

  const g = ctx.createGain();
  g.gain.value = 0.28;
  o.connect(g);
  g.connect(amp);
  o.start(t);
  o.stop(t + dur + 0.4);

  const atk = Math.min(0.08, dur * 0.1);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.42, t + atk);
  amp.gain.linearRampToValueAtTime(0.35, t + dur);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
}

/**
 * Flute/Woodwinds — sine + filtered breath noise, vibrato
 */
export function voiceFlute(freq: number, t: number, dur: number): void {
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
  vib.start(t + 0.15);
  vib.stop(t + dur + 0.4);

  const g = ctx.createGain();
  g.gain.value = 0.35;
  o.connect(g);
  g.connect(amp);
  o.start(t);
  o.stop(t + dur + 0.4);

  // Breath noise
  const nBuf = ctx.createBuffer(1, ctx.sampleRate * 0.1, ctx.sampleRate);
  const nd = nBuf.getChannelData(0);
  for (let i = 0; i < nBuf.length; i++) nd[i] = (Math.random() * 2 - 1) * 0.04;
  const ns = ctx.createBufferSource();
  ns.buffer = nBuf;
  ns.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = freq;
  bp.Q.value = 3;
  ns.connect(bp);
  bp.connect(amp);
  ns.start(t);
  ns.stop(t + dur + 0.4);

  const atk = Math.min(0.08, dur * 0.12);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.38, t + atk);
  amp.gain.linearRampToValueAtTime(0.33, t + dur);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.3);
}
