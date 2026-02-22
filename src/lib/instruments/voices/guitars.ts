import { ensureAudioGraph, getInstrumentBus } from "../../audio-engine";
import { createSaturator } from "../../effects";

/**
 * Karplus-Strong helper — noise burst through delay with feedback + LPF
 */
function karplusStrong(
  ctx: AudioContext,
  dest: AudioNode,
  freq: number,
  t: number,
  dur: number,
  opts: { brightness?: number; feedback?: number; gain?: number; bodyFreq?: number } = {},
): void {
  const { brightness = 2500, feedback = 0.980, gain = 0.3, bodyFreq = 2500 } = opts;
  const period = 1 / freq;

  // Noise burst excitation (0.006s for warmer transient)
  const bufLen = Math.ceil(ctx.sampleRate * 0.006);
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;

  // Delay line (string length)
  const delay = ctx.createDelay(1);
  delay.delayTime.value = period;

  // Feedback loop with LPF (string damping)
  const fb = ctx.createGain();
  fb.gain.value = feedback;
  const lpf = ctx.createBiquadFilter();
  lpf.type = "lowpass";
  lpf.frequency.value = brightness;
  lpf.Q.value = 0.5;

  delay.connect(lpf);
  lpf.connect(fb);
  fb.connect(delay);

  // Body/cabinet resonance filter (colors output, outside feedback loop)
  const bodyLPF = ctx.createBiquadFilter();
  bodyLPF.type = "lowpass";
  bodyLPF.frequency.value = bodyFreq;
  bodyLPF.Q.value = 0.7;

  // Output
  const amp = ctx.createGain();
  amp.gain.setValueAtTime(gain, t);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);

  noise.connect(delay);
  delay.connect(bodyLPF);
  bodyLPF.connect(amp);
  amp.connect(dest);

  noise.start(t);
  noise.stop(t + 0.006);
}

/**
 * Electric Clean Guitar — Karplus-Strong synthesis
 */
export function voiceElectricClean(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  karplusStrong(ctx, out, freq, t, dur, { brightness: 2500, feedback: 0.980, gain: 0.32, bodyFreq: 2500 });
}

/**
 * Electric Distorted Guitar — Karplus-Strong + WaveShaper distortion
 */
export function voiceElectricDistorted(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;

  const saturator = createSaturator(ctx, 2.5);
  const postGain = ctx.createGain();
  postGain.gain.value = 0.28;
  saturator.connect(postGain);
  postGain.connect(out);

  karplusStrong(ctx, saturator, freq, t, dur, { brightness: 3000, feedback: 0.985, gain: 0.35, bodyFreq: 2800 });
}

/**
 * Acoustic Strum — 4-6 staggered Karplus-Strong plucks
 */
export function voiceAcousticStrum(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;

  const stringCount = 5;
  const strumDelay = 0.02; // 20ms between strings

  for (let i = 0; i < stringCount; i++) {
    const detune = (Math.random() - 0.5) * 4; // cents
    const f = freq * Math.pow(2, detune / 1200);
    const offset = t + i * strumDelay;
    karplusStrong(ctx, out, f, offset, dur - i * strumDelay, {
      brightness: 2000 + Math.random() * 800,
      feedback: 0.975,
      gain: 0.18,
      bodyFreq: 2200,
    });
  }
}

/**
 * Acoustic Fingerpick — single gentle Karplus-Strong, brighter
 */
export function voiceAcousticFingerpick(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  karplusStrong(ctx, out, freq, t, dur, { brightness: 3000, feedback: 0.978, gain: 0.28, bodyFreq: 2400 });
}
