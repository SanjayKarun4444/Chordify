import { ensureAudioGraph, getInstrumentBus } from "../../audio-engine";

/**
 * Celesta — inharmonic metallic partials, fast attack, exponential decay
 */
export function voiceCelesta(freq: number, t: number, dur: number): void {
  const ctx = ensureAudioGraph();
  const out = getInstrumentBus()!.input;
  const amp = ctx.createGain();
  amp.connect(out);

  const ratios = [1, 3.2, 5.4, 8.1];
  const levels = [0.4, 0.2, 0.12, 0.06];

  ratios.forEach((r, i) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = freq * r;
    const g = ctx.createGain();
    g.gain.setValueAtTime(levels[i], t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur * 0.6 + 0.5);
    o.connect(g);
    g.connect(amp);
    o.start(t);
    o.stop(t + dur + 0.6);
  });

  amp.gain.setValueAtTime(0, t);
  amp.gain.linearRampToValueAtTime(0.45, t + 0.003);
  amp.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.5);
}
