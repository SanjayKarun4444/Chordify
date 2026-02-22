import type { InstrumentDefinition, InstrumentCategory, InstrumentCategoryMeta } from "./types";
import { INSTRUMENT_DEFINITIONS, INSTRUMENT_CATEGORIES } from "./definitions";

let _registry: Map<string, InstrumentDefinition> | null = null;

function ensureRegistry(): Map<string, InstrumentDefinition> {
  if (!_registry) {
    _registry = new Map();
    for (const def of INSTRUMENT_DEFINITIONS) {
      _registry.set(def.id, def);
    }
  }
  return _registry;
}

export function registerInstrument(def: InstrumentDefinition): void {
  ensureRegistry().set(def.id, def);
}

export function getInstrument(id: string): InstrumentDefinition | undefined {
  return ensureRegistry().get(id);
}

export function getAllInstruments(): InstrumentDefinition[] {
  return Array.from(ensureRegistry().values());
}

export function getInstrumentsByCategory(cat: InstrumentCategory): InstrumentDefinition[] {
  return getAllInstruments().filter((d) => d.category === cat);
}

export function getCategories(): InstrumentCategoryMeta[] {
  return INSTRUMENT_CATEGORIES;
}
