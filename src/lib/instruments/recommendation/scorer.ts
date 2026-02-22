import type { InstrumentDefinition } from "../types";
import { getAllInstruments } from "../registry";

export interface InstrumentScore {
  instrument: InstrumentDefinition;
  totalScore: number;
  breakdown: {
    genre: number;
    mood: number;
    range: number;
    complexity: number;
    bpm: number;
  };
  reasons: string[];
}

export interface ProgressionContext {
  genre?: string;
  mood?: string;
  tempo?: number;
  key?: string;
  chords?: string[];
  midiNotes?: number[];
}

// Genre affinity — related genres boost score
const GENRE_AFFINITY: Record<string, string[]> = {
  trap: ["drill", "hiphop", "rap"],
  drill: ["trap", "hiphop"],
  hiphop: ["trap", "lofi", "rnb", "soul"],
  lofi: ["hiphop", "jazz", "ambient"],
  jazz: ["soul", "lofi", "gospel", "funk"],
  gospel: ["soul", "jazz", "rnb"],
  soul: ["rnb", "jazz", "gospel", "funk"],
  rnb: ["soul", "hiphop", "gospel"],
  funk: ["soul", "jazz", "hiphop"],
  house: ["dance", "techno"],
  afrobeats: ["dancehall", "amapiano"],
  amapiano: ["afrobeats"],
  ambient: ["lofi"],
  folk: ["soul"],
  reggaeton: ["dancehall", "trap"],
  dancehall: ["reggaeton", "afrobeats"],
};

// Mood affinities
const MOOD_AFFINITY: Record<string, string[]> = {
  dark: ["sad", "aggressive"],
  sad: ["dark", "chill"],
  chill: ["smooth", "dreamy"],
  smooth: ["chill", "warm"],
  dreamy: ["chill", "ethereal"],
  ethereal: ["dreamy", "chill"],
  aggressive: ["dark", "energetic"],
  energetic: ["aggressive", "uplifting"],
  uplifting: ["warm", "energetic"],
  warm: ["smooth", "uplifting"],
};

// Weights (total = 100)
const W_GENRE = 30;
const W_MOOD = 25;
const W_RANGE = 15;
const W_COMPLEXITY = 15;
const W_BPM = 15;

function scoreGenre(inst: InstrumentDefinition, genre: string): number {
  if (!genre) return W_GENRE * 0.5;
  const g = genre.toLowerCase();
  if (inst.genreAffinity.includes(g)) return W_GENRE;
  const related = GENRE_AFFINITY[g] || [];
  if (inst.genreAffinity.some((a) => related.includes(a))) return W_GENRE * 0.6;
  return 0;
}

function scoreMood(inst: InstrumentDefinition, mood: string): number {
  if (!mood) return W_MOOD * 0.5;
  const m = mood.toLowerCase();
  if (inst.moodAffinity.includes(m)) return W_MOOD;
  const related = MOOD_AFFINITY[m] || [];
  if (inst.moodAffinity.some((a) => related.includes(a))) return W_MOOD * 0.5;
  return 0;
}

function scoreRange(inst: InstrumentDefinition, midiNotes?: number[]): number {
  if (!midiNotes || midiNotes.length === 0) return W_RANGE * 0.7;
  const inRange = midiNotes.filter(
    (n) => n >= inst.midiRange[0] && n <= inst.midiRange[1],
  ).length;
  return W_RANGE * (inRange / midiNotes.length);
}

function scoreComplexity(inst: InstrumentDefinition, chords?: string[]): number {
  if (!chords || chords.length === 0) return W_COMPLEXITY * 0.5;
  // Count extended chords (7, 9, 11, 13, dim, aug, sus)
  const extensions = chords.filter((c) => /(?:maj|m|dim|aug|sus|add)?[79]|1[13]|dim|aug/.test(c)).length;
  const complexity = extensions / chords.length; // 0-1

  // Complex chords pair with sophisticated instruments
  if (complexity > 0.5) {
    const sophisticated = ["jazz", "soul", "gospel", "ambient"].some((g) => inst.genreAffinity.includes(g));
    return W_COMPLEXITY * (sophisticated ? 1 : 0.4);
  }
  // Simple chords pair with simpler instruments
  const simple = ["trap", "drill", "house"].some((g) => inst.genreAffinity.includes(g));
  return W_COMPLEXITY * (simple ? 0.8 : 0.6);
}

function scoreBpm(inst: InstrumentDefinition, tempo?: number): number {
  if (!tempo) return W_BPM * 0.5;
  // Fast tempos favor sustained/blown instruments less, plucked/struck more
  if (tempo > 140) {
    const fast = ["plucked", "struck", "strummed"].includes(inst.articulation);
    return W_BPM * (fast ? 0.9 : 0.5);
  }
  if (tempo < 80) {
    const slow = ["sustained", "bowed", "blown"].includes(inst.articulation);
    return W_BPM * (slow ? 0.9 : 0.6);
  }
  return W_BPM * 0.7; // Mid-tempo works for most
}

export function scoreInstruments(ctx: ProgressionContext, topN: number = 6): InstrumentScore[] {
  const all = getAllInstruments();

  const scores: InstrumentScore[] = all.map((inst) => {
    const genre = scoreGenre(inst, ctx.genre || "");
    const mood = scoreMood(inst, ctx.mood || "");
    const range = scoreRange(inst, ctx.midiNotes);
    const complexity = scoreComplexity(inst, ctx.chords);
    const bpm = scoreBpm(inst, ctx.tempo);
    const totalScore = genre + mood + range + complexity + bpm;

    const reasons: string[] = [];
    if (genre > W_GENRE * 0.5) reasons.push(`Fits ${ctx.genre} genre`);
    if (mood > W_MOOD * 0.5) reasons.push(`Matches ${ctx.mood} mood`);
    if (range >= W_RANGE * 0.8) reasons.push("Notes in range");
    if (complexity >= W_COMPLEXITY * 0.7) reasons.push("Complexity match");

    return {
      instrument: inst,
      totalScore,
      breakdown: { genre, mood, range, complexity, bpm },
      reasons,
    };
  });

  return scores.sort((a, b) => b.totalScore - a.totalScore).slice(0, topN);
}
