import type { Progression } from "../../types";
import { chordToMidi } from "../../chord-utils";
import { scoreInstruments, type InstrumentScore, type ProgressionContext } from "./scorer";

export type { InstrumentScore, ProgressionContext } from "./scorer";

export interface InstrumentRecommendationResult {
  scores: InstrumentScore[];
}

export function recommendInstruments(
  progression: Progression,
  topN: number = 6,
): InstrumentRecommendationResult {
  // Build MIDI note set from chords
  const midiNotes: number[] = [];
  for (const chord of progression.chords) {
    const notes = chordToMidi(chord);
    midiNotes.push(...notes);
  }

  const ctx: ProgressionContext = {
    genre: progression.genre,
    mood: progression.mood,
    tempo: progression.tempo,
    key: progression.key,
    chords: progression.chords,
    midiNotes,
  };

  return {
    scores: scoreInstruments(ctx, topN),
  };
}
