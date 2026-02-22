import { ensureAudioGraph, getInstrumentBus } from "../../audio-engine";

/** Clamp filter frequency to stay safely below Nyquist */
const safeFreq = (f: number, sr: number) => Math.min(f, sr * 0.45);

/**
 * Synth Lead (mono) — sawtooth + square, resonant LPF with LFO
 */
export function voiceSynthLead(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();

  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.Q.value = 6;
  filt.frequency.setValueAtTime(safeFreq(freq * 2, ctx.sampleRate), t);
  filt.frequency.exponentialRampToValueAtTime(safeFreq(freq * 8, ctx.sampleRate), t + 0.15);
  filt.frequency.exponentialRampToValueAtTime(safeFreq(freq * 3, ctx.sampleRate), t + dur);

  // Filter LFO
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 4.5;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = freq * 0.8;
  lfo.connect(lfoGain);
  lfoGain.connect(filt.frequency);
  lfo.start(t);
  lfo.stop(t + dur + 0.3);

  amp.connect(filt);
  filt.connect(out);

  const saw = ctx.createOscillator();
  saw.type = "sawtooth";
  saw.frequency.value = freq;
  const sq = ctx.createOscillator();
  sq.type = "square";
  sq.frequency.value = freq * 1.002;
  const g1 = ctx.createGain();
  g1.gain.value = 0.25;
  const g2 = ctx.createGain();
  g2.gain.value = 0.15;
  saw.connect(g1);
  sq.connect(g2);
  g1.connect(amp);
  g2.connect(amp);
  saw.start(t);
  sq.start(t);
  saw.stop(t + dur + 0.3);
  sq.stop(t + dur + 0.3);

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.5, t + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.3, t + 0.1);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
}

/**
 * Choir/Vocal Pads — formant synthesis with parallel bandpass filters
 */
export function voiceChoir(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  amp.connect(out);

  const formants = [800, 1200, 2500];
  const formantQs = [10, 8, 12];

  // Two detuned sawtooths as excitation
  [-5, 5].forEach((detune) => {
    const o = ctx.createOscillator();
    o.type = "sawtooth";
    o.frequency.value = freq;
    o.detune.value = detune;

    formants.forEach((fFreq, i) => {
      const bp = ctx.createBiquadFilter();
      bp.type = "bandpass";
      bp.frequency.value = fFreq;
      bp.Q.value = formantQs[i];
      const fg = ctx.createGain();
      fg.gain.value = 0.12;
      o.connect(bp);
      bp.connect(fg);
      fg.connect(amp);
    });

    o.start(t);
    o.stop(t + dur + 2);
  });

  const atk = Math.min(dur * 0.4, 1.0);
  const rel = Math.min(dur * 0.5, 2.0);
  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.4, t + atk);
  amp.gain.linearRampToValueAtTime(0.0001, t + dur + rel);
}
