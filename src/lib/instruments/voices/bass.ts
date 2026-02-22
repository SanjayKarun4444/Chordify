import { ensureAudioGraph, getBassBus } from "../../audio-engine";

/**
 * Electric Bass — enhanced bass with more harmonics, slight overdrive
 */
export function voiceElectricBass(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const bf = freq / 2;
  const amp = ctx.createGain();

  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 600;
  filt.Q.value = 1;

  // Slight overdrive
  const shaper = ctx.createWaveShaper();
  const n = 4096;
  const curve = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = (i * 2) / n - 1;
    curve[i] = Math.tanh(x * 1.5);
  }
  shaper.curve = curve;

  amp.connect(filt);
  filt.connect(shaper);
  shaper.connect(getBassBus()!.input);

  // Sine fundamental
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = bf;
  const g1 = ctx.createGain();
  g1.gain.value = 0.5;
  osc1.connect(g1);
  g1.connect(amp);

  // Triangle octave for presence
  const osc2 = ctx.createOscillator();
  osc2.type = "triangle";
  osc2.frequency.value = bf * 2;
  const g2 = ctx.createGain();
  g2.gain.value = 0.15;
  osc2.connect(g2);
  g2.connect(amp);

  osc1.start(t);
  osc2.start(t);
  osc1.stop(t + dur + 0.1);
  osc2.stop(t + dur + 0.1);

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.65, t + 0.005);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur * 0.6, 1.2));
}

/**
 * Upright Bass — warm sine, noise finger transient, LPF 400Hz, slower attack
 */
export function voiceUprightBass(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const bf = freq / 2;
  const amp = ctx.createGain();

  const filt = ctx.createBiquadFilter();
  filt.type = "lowpass";
  filt.frequency.value = 400;
  filt.Q.value = 0.7;
  amp.connect(filt);
  filt.connect(getBassBus()!.input);

  // Sine fundamental
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.value = bf;
  const og = ctx.createGain();
  og.gain.value = 0.55;
  osc.connect(og);
  og.connect(amp);

  // Finger noise transient
  const nBuf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * 0.008), ctx.sampleRate);
  const nd = nBuf.getChannelData(0);
  for (let i = 0; i < nBuf.length; i++) nd[i] = Math.random() * 2 - 1;
  const ns = ctx.createBufferSource();
  ns.buffer = nBuf;
  const ng = ctx.createGain();
  ng.gain.value = 0.15;
  ns.connect(ng);
  ng.connect(amp);
  ns.start(t);
  ns.stop(t + 0.008);

  osc.start(t);
  osc.stop(t + dur + 0.2);

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.6, t + 0.015);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(dur * 0.55, 1.0));
}
