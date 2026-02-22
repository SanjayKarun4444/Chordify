"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import {
  getAllInstruments,
  getCategories,
  getInstrument,
  type InstrumentDefinition,
} from "@/lib/instruments";
import type { InstrumentScore } from "@/lib/instruments/recommendation/scorer";
import { ensureAudioGraph } from "@/lib/audio-engine";
import { playVoice } from "@/lib/voices";
import InstrumentCard from "./instrument-card";

interface InstrumentBrowserProps {
  open: boolean;
  onClose: () => void;
  currentInstrument: string;
  onSelect: (id: string) => void;
  recommendations?: InstrumentScore[];
}

export default function InstrumentBrowser({
  open,
  onClose,
  currentInstrument,
  onSelect,
  recommendations,
}: InstrumentBrowserProps) {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const categories = useMemo(() => getCategories(), []);
  const allInstruments = useMemo(() => getAllInstruments(), []);

  const filtered = useMemo(() => {
    return allInstruments.filter((inst) => {
      if (search) {
        const q = search.toLowerCase();
        const nameMatch = inst.label.toLowerCase().includes(q);
        const catMatch = inst.category.toLowerCase().includes(q);
        const descMatch = inst.description.toLowerCase().includes(q);
        if (!nameMatch && !catMatch && !descMatch) return false;
      }
      if (categoryFilter && inst.category !== categoryFilter) return false;
      return true;
    });
  }, [allInstruments, search, categoryFilter]);

  const grouped = useMemo(() => {
    const groups: Record<string, InstrumentDefinition[]> = {};
    for (const inst of filtered) {
      if (!groups[inst.category]) groups[inst.category] = [];
      groups[inst.category].push(inst);
    }
    return groups;
  }, [filtered]);

  // Recommendation score lookup
  const scoreMap = useMemo(() => {
    const map = new Map<string, InstrumentScore>();
    if (recommendations) {
      for (const r of recommendations) {
        map.set(r.instrument.id, r);
      }
    }
    return map;
  }, [recommendations]);

  // Hover preview with 300ms delay
  const handleHover = useCallback((id: string | null) => {
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
    if (!id) return;

    hoverTimerRef.current = setTimeout(() => {
      const def = getInstrument(id);
      if (!def) return;
      const ctx = ensureAudioGraph();
      const now = ctx.currentTime;
      // Play a brief C major chord preview
      const notes = [261.63, 329.63, 392.0]; // C4, E4, G4
      notes.forEach((freq) => {
        playVoice(id, freq, now, 0.5);
      });
    }, 300);
  }, []);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    };
  }, []);

  // ESC to close
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  const handleSelect = useCallback((id: string) => {
    onSelect(id);
    onClose();
  }, [onSelect, onClose]);

  if (!open) return null;

  return (
    <div className="panel-slide-up fixed inset-x-0 bottom-0 z-50 flex flex-col" style={{ maxHeight: "60vh" }}>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/40 -z-10" onClick={onClose} />

      {/* Panel */}
      <div
        className="relative mx-auto w-full max-w-[920px] flex flex-col rounded-t-2xl overflow-hidden"
        style={{
          background: "rgba(8,8,12,0.96)",
          border: "1px solid var(--color-border)",
          borderBottom: "none",
        }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3.5" style={{ borderBottom: "1px solid var(--color-border)" }}>
          <h3 className="font-display text-[1.1rem] text-gold tracking-[0.03em] flex-1">
            Instruments
          </h3>
          <span className="font-mono text-[0.52rem] text-text-dim">
            {allInstruments.length} instruments
          </span>
          <button
            onClick={onClose}
            className="px-2 py-1 rounded-md font-mono text-[0.6rem] text-text-dim cursor-pointer transition-colors duration-150 hover:text-text"
            style={{ background: "rgba(255,255,255,0.05)" }}
          >
            ESC
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4" style={{ maxHeight: "calc(60vh - 54px)" }}>
          {/* Recommendations */}
          {recommendations && recommendations.length > 0 && (
            <div className="mb-5">
              <div className="font-mono text-[0.55rem] text-text-dim tracking-[0.15em] uppercase mb-2.5">
                Recommended for your progression
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {recommendations.slice(0, 6).map((rec) => (
                  <InstrumentCard
                    key={rec.instrument.id}
                    instrument={rec.instrument}
                    isActive={currentInstrument === rec.instrument.id}
                    score={rec.totalScore}
                    reason={rec.reasons.join(", ")}
                    onSelect={handleSelect}
                    onHover={handleHover}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Search + category filters */}
          <div className="flex items-center gap-2 flex-wrap mb-4">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search instruments..."
              className="px-3 py-1.5 rounded-lg font-mono text-[0.7rem] text-text outline-none flex-1 min-w-[150px]"
              style={{
                background: "rgba(0,0,0,0.4)",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            />

            <div className="flex gap-1 flex-wrap">
              <button
                onClick={() => setCategoryFilter(null)}
                className="px-2.5 py-1 rounded-full font-mono text-[0.55rem] tracking-[0.06em] uppercase cursor-pointer transition-all duration-150"
                style={{
                  background: !categoryFilter ? "rgba(255,209,102,0.15)" : "transparent",
                  color: !categoryFilter ? "var(--color-gold)" : "var(--color-text-dim)",
                  border: `1px solid ${!categoryFilter ? "rgba(255,209,102,0.3)" : "rgba(255,255,255,0.08)"}`,
                }}
              >
                All
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setCategoryFilter(categoryFilter === cat.id ? null : cat.id)}
                  className="px-2.5 py-1 rounded-full font-mono text-[0.55rem] tracking-[0.06em] uppercase cursor-pointer transition-all duration-150"
                  style={{
                    background: categoryFilter === cat.id ? `${cat.color}20` : "transparent",
                    color: categoryFilter === cat.id ? cat.color : "var(--color-text-dim)",
                    border: `1px solid ${categoryFilter === cat.id ? cat.color + "44" : "rgba(255,255,255,0.08)"}`,
                  }}
                >
                  {cat.icon} {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Grouped instrument grid */}
          {categories.map((cat) => {
            const instruments = grouped[cat.id];
            if (!instruments || instruments.length === 0) return null;

            return (
              <div key={cat.id} className="mb-4">
                <div
                  className="font-mono text-[0.55rem] tracking-[0.15em] uppercase mb-2"
                  style={{ color: cat.color + "AA" }}
                >
                  {cat.icon} {cat.label}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {instruments.map((inst) => {
                    const rec = scoreMap.get(inst.id);
                    return (
                      <InstrumentCard
                        key={inst.id}
                        instrument={inst}
                        isActive={currentInstrument === inst.id}
                        score={rec?.totalScore}
                        reason={rec?.reasons.join(", ")}
                        onSelect={handleSelect}
                        onHover={handleHover}
                      />
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
