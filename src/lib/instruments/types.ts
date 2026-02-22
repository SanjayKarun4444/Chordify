export type InstrumentCategory = "keys" | "synths" | "guitars" | "world" | "bass" | "orchestral";

export type BusTarget = "instrument" | "bass";

export type ArticulationType = "sustained" | "plucked" | "bowed" | "blown" | "struck" | "strummed";

export interface ADSREnvelope {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface InstrumentDefinition {
  id: string;
  label: string;
  icon: string;
  category: InstrumentCategory;
  color: string;
  polyphonic: boolean;
  busTarget: BusTarget;
  midiRange: [number, number];
  defaultADSR: ADSREnvelope;
  articulation: ArticulationType;
  genreAffinity: string[];
  moodAffinity: string[];
  description: string;
  play: (freq: number, t: number, dur: number) => void;
}

export interface InstrumentCategoryMeta {
  id: InstrumentCategory;
  label: string;
  color: string;
  icon: string;
}
