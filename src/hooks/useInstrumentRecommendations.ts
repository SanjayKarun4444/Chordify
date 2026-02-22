"use client";

import { useMemo } from "react";
import type { Progression } from "@/lib/types";
import {
  recommendInstruments,
  type InstrumentRecommendationResult,
} from "@/lib/instruments/recommendation";

export function useInstrumentRecommendations(
  progression: Progression | null,
  topN: number = 6,
): InstrumentRecommendationResult | null {
  return useMemo(() => {
    if (!progression) return null;
    return recommendInstruments(progression, topN);
  }, [
    progression?.genre,
    progression?.mood,
    progression?.tempo,
    progression?.key,
    progression?.chords?.join(","),
    topN,
  ]);
}
