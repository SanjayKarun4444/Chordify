"use client";

import type { InstrumentDefinition } from "@/lib/instruments";

interface InstrumentCardProps {
  instrument: InstrumentDefinition;
  isActive: boolean;
  score?: number;
  reason?: string;
  onSelect: (id: string) => void;
  onHover?: (id: string | null) => void;
}

export default function InstrumentCard({
  instrument,
  isActive,
  score,
  reason,
  onSelect,
  onHover,
}: InstrumentCardProps) {
  const col = instrument.color;

  return (
    <button
      onClick={() => onSelect(instrument.id)}
      onMouseEnter={() => onHover?.(instrument.id)}
      onMouseLeave={() => onHover?.(null)}
      className="relative flex items-center gap-2.5 p-2.5 rounded-lg cursor-pointer transition-all duration-200 text-left w-full"
      style={{
        background: isActive ? `${col}18` : "rgba(6,6,10,0.5)",
        border: `1px solid ${isActive ? col + "55" : "rgba(255,255,255,0.06)"}`,
        boxShadow: isActive ? `0 0 18px ${col}33` : "none",
      }}
    >
      {/* Icon */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center text-sm shrink-0"
        style={{
          background: `${col}15`,
          color: col,
          border: `1px solid ${col}33`,
        }}
      >
        {instrument.icon}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div
          className="font-sans text-[0.75rem] font-medium truncate transition-colors duration-150"
          style={{ color: isActive ? col : "var(--color-text)" }}
        >
          {instrument.label}
        </div>
        <div className="font-mono text-[0.48rem] text-text-dim truncate">
          {instrument.description}
        </div>
      </div>

      {/* Score badge */}
      {score !== undefined && (
        <div
          className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 rounded-full font-mono text-[0.5rem] font-bold"
          style={{
            background: col,
            color: "#000",
          }}
          title={reason}
        >
          {Math.round(score)}%
        </div>
      )}
    </button>
  );
}
