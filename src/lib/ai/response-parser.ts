import { getInstrument } from "../instruments/registry";

interface ParsedResponse {
  message: string;
  suggestedInstrument?: string;
  progression?: {
    chords: string[];
    tempo: number;
    key: string;
    genre: string;
    mood: string;
    bars: number;
    description?: string;
    harmonicFunction: string[];
    swing: number;
    suggestedInstrument?: string;
    drums: {
      patternLengthBeats: number;
      kicks: number[];
      snares: number[];
      hihats: number[];
      claps: number[];
      ohats: number[];
    };
  };
}

export function parseAIResponse(raw: string): ParsedResponse {
  const cleaned = raw
    .replace(/^```(?:json)?\s*/im, "")
    .replace(/\s*```\s*$/m, "")
    .trim();

  const match = cleaned.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON object found in AI response");

  const parsed = JSON.parse(match[0]);

  if (parsed.progression) {
    const { chords, bars } = parsed.progression;

    // Auto-correct bars/chords mismatch
    if (Array.isArray(chords) && bars && chords.length !== bars) {
      parsed.progression.bars = chords.length;
    }

    // Ensure harmonicFunction array length matches chords
    const hf = parsed.progression.harmonicFunction;
    if (!Array.isArray(hf) || hf.length !== (parsed.progression.bars || 4)) {
      parsed.progression.harmonicFunction = Array(
        parsed.progression.bars || 4,
      ).fill("\u2014");
    }

    // Ensure drums object exists with all required arrays
    if (!parsed.progression.drums) {
      parsed.progression.drums = {
        patternLengthBeats: 4,
        kicks: [0, 2],
        snares: [1, 3],
        hihats: [0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5],
        claps: [],
        ohats: [],
      };
    } else {
      parsed.progression.drums.claps = parsed.progression.drums.claps || [];
      parsed.progression.drums.ohats = parsed.progression.drums.ohats || [];
    }

    // Ensure swing field exists
    if (typeof parsed.progression.swing !== "number") {
      parsed.progression.swing = 0;
    }

    // Extract and validate suggestedInstrument
    if (parsed.progression.suggestedInstrument) {
      const instId = parsed.progression.suggestedInstrument;
      if (getInstrument(instId)) {
        parsed.suggestedInstrument = instId;
      }
      // Remove from progression object (it's a top-level response field)
      delete parsed.progression.suggestedInstrument;
    }
  }

  return parsed;
}
