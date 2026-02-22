"use client";

import { INSTRUMENTS, INSTRUMENT_COLORS } from "@/lib/constants";
import type { DrumEngineMode } from "@/lib/audio/drums/types";
import MixMeter from "./mix-meter";

interface TransportBarProps {
  isPlaying: boolean;
  tempo: number;
  instrument: string;
  drumsOn: boolean;
  melodyOn: boolean;
  masterVol: number;
  melodyStyle: string;
  drumEngine: DrumEngineMode;
  // New drum pattern system props
  drumIntensity: number;       // 0-100
  humanizeOn: boolean;
  swing: number;               // 0-100
  randomVariation: boolean;
  melodyPriority: boolean;
  autoMix: boolean;
  hasActivePattern: boolean;
  onPlayToggle: () => void;
  onTempo: (v: number) => void;
  onInstrument: (id: string) => void;
  onDrums: (on: boolean) => void;
  onMelody: (on: boolean) => void;
  onMasterVol: (v: number) => void;
  onMelodyStyle: (style: string) => void;
  onDrumEngine: (mode: DrumEngineMode) => void;
  // New callbacks
  onOpenPatterns: () => void;
  onDrumIntensity: (v: number) => void;
  onHumanize: (on: boolean) => void;
  onSwing: (v: number) => void;
  onRandomVariation: (on: boolean) => void;
  onMelodyPriority: (on: boolean) => void;
  onAutoMix: (on: boolean) => void;
}

function Checkbox({ label, checked, onChange, color }: {
  label: string; checked: boolean; onChange: (v: boolean) => void; color?: string;
}) {
  const c = color || "var(--color-gold)";
  return (
    <label
      className="flex items-center gap-[5px] cursor-pointer px-[8px] py-1 rounded-[6px] transition-all duration-150"
      style={{
        border: `1px solid ${checked ? c + "55" : "rgba(255,255,255,0.06)"}`,
        background: checked ? c + "0D" : "transparent",
      }}
    >
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="hidden" />
      <div
        className="w-3 h-3 rounded-[2px] relative shrink-0 transition-all duration-150"
        style={{
          border: `1.5px solid ${checked ? c : "rgba(255,255,255,0.18)"}`,
          background: checked ? c : "transparent",
        }}
      >
        {checked && (
          <div className="absolute" style={{ left: 2, top: 0, width: 4, height: 7, borderRight: "1.5px solid #000", borderBottom: "1.5px solid #000", transform: "rotate(45deg)" }} />
        )}
      </div>
      <span
        className="font-mono text-[0.55rem] tracking-[0.08em] uppercase transition-colors duration-150"
        style={{ color: checked ? "var(--color-text)" : "var(--color-text-dim)" }}
      >
        {label}
      </span>
    </label>
  );
}

export default function TransportBar({
  isPlaying, tempo, instrument, drumsOn, melodyOn, masterVol, melodyStyle, drumEngine,
  drumIntensity, humanizeOn, swing, randomVariation, melodyPriority, autoMix, hasActivePattern,
  onPlayToggle, onTempo, onInstrument, onDrums, onMelody, onMasterVol, onMelodyStyle, onDrumEngine,
  onOpenPatterns, onDrumIntensity, onHumanize, onSwing, onRandomVariation, onMelodyPriority, onAutoMix,
}: TransportBarProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Row 1: Play + Drums/Melody + Tempo */}
      <div
        className="flex items-center gap-2.5 flex-wrap px-4 py-3.5 rounded-xl"
        style={{
          background: "rgba(6,6,10,0.6)",
          border: "1px solid var(--color-border)",
        }}
      >
        {/* Play button */}
        <button
          onClick={onPlayToggle}
          className="px-[22px] py-[9px] rounded-lg font-sans font-bold text-[0.82rem] cursor-pointer min-w-[88px] transition-all duration-200 ease-out"
          style={{
            background: isPlaying ? "rgba(255,209,102,0.15)" : "var(--color-gold)",
            color: isPlaying ? "var(--color-gold)" : "#000",
            border: isPlaying ? "1px solid var(--color-gold)" : "none",
            boxShadow: isPlaying ? "0 0 20px rgba(255,209,102,0.25)" : "none",
          }}
        >
          {isPlaying ? "\u23F9 Stop" : "\u25B6 Play"}
        </button>

        {/* Divider */}
        <div className="w-px h-[26px] bg-white/8" />

        {/* Toggles */}
        {(
          [
            ["Drums", drumsOn, onDrums],
            ["Melody", melodyOn, onMelody],
          ] as [string, boolean, (v: boolean) => void][]
        ).map(([label, on, toggle]) => (
          <label
            key={label}
            className="flex items-center gap-[7px] cursor-pointer px-[11px] py-1.5 rounded-[7px] transition-all duration-150"
            style={{
              border: `1px solid ${on ? "rgba(255,209,102,0.3)" : "rgba(255,255,255,0.08)"}`,
              background: on ? "rgba(255,209,102,0.06)" : "transparent",
            }}
          >
            <input
              type="checkbox"
              checked={on}
              onChange={(e) => toggle(e.target.checked)}
              className="hidden"
            />
            <div
              className="w-3.5 h-3.5 rounded-[3px] relative shrink-0 transition-all duration-150"
              style={{
                border: `1.5px solid ${on ? "var(--color-gold)" : "rgba(255,255,255,0.2)"}`,
                background: on ? "var(--color-gold)" : "transparent",
              }}
            >
              {on && (
                <div
                  className="absolute"
                  style={{
                    left: 3, top: 0,
                    width: 5, height: 9,
                    borderRight: "2px solid #000",
                    borderBottom: "2px solid #000",
                    transform: "rotate(45deg)",
                  }}
                />
              )}
            </div>
            <span
              className="font-mono text-[0.62rem] tracking-[0.1em] uppercase transition-colors duration-150"
              style={{ color: on ? "var(--color-text)" : "var(--color-text-dim)" }}
            >
              {label}
            </span>
          </label>
        ))}

        {/* Drum engine toggle — visible when drums are on */}
        {drumsOn && (
          <div className="flex rounded-full overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.08)" }}>
            {(["synth", "samples"] as DrumEngineMode[]).map((mode) => {
              const active = drumEngine === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onDrumEngine(mode)}
                  className="px-[10px] py-[4px] font-mono text-[0.58rem] tracking-[0.08em] uppercase cursor-pointer transition-all duration-150"
                  style={{
                    background: active ? "rgba(255,209,102,0.15)" : "transparent",
                    color: active ? "var(--color-gold)" : "var(--color-text-dim)",
                    borderRight: mode === "synth" ? "1px solid rgba(255,255,255,0.08)" : "none",
                  }}
                >
                  {mode}
                </button>
              );
            })}
          </div>
        )}

        {/* Divider */}
        <div className="w-px h-[26px] bg-white/8" />

        {/* Tempo */}
        <div className="flex items-center gap-2.5 flex-1 min-w-[180px]">
          <span className="font-mono text-[0.62rem] text-text-dim tracking-[0.1em] whitespace-nowrap">
            BPM
          </span>
          <input
            type="range"
            min={40}
            max={220}
            value={tempo}
            onChange={(e) => onTempo(parseInt(e.target.value))}
            className="flex-1"
            style={{
              background: `linear-gradient(90deg, var(--color-gold) ${((tempo - 40) / 180) * 100}%, rgba(255,209,102,0.18) 0%)`,
            }}
          />
          <span className="font-mono text-[0.82rem] text-gold min-w-[58px] text-right">
            {tempo} BPM
          </span>
        </div>

        {/* Master Vol */}
        <div className="flex items-center gap-2">
          <span className="font-mono text-[0.58rem] text-text-dim tracking-[0.08em]">
            VOL
          </span>
          <input
            type="range"
            min={0}
            max={100}
            value={masterVol}
            onChange={(e) => onMasterVol(parseInt(e.target.value))}
            className="w-[70px]"
            style={{
              background: `linear-gradient(90deg, var(--color-gold) ${masterVol}%, rgba(255,209,102,0.18) 0%)`,
            }}
          />
        </div>
      </div>

      {/* Row 2: Instruments */}
      <div
        className="flex items-center gap-2 flex-wrap px-3.5 py-2.5 rounded-xl"
        style={{
          background: "rgba(6,6,10,0.5)",
          border: "1px solid var(--color-border)",
        }}
      >
        <span className="font-mono text-[0.58rem] text-text-dim tracking-[0.15em] uppercase whitespace-nowrap mr-1">
          Instrument
        </span>
        <div className="flex gap-[5px] flex-wrap flex-1">
          {INSTRUMENTS.map((inst) => {
            const active = instrument === inst.id;
            const col = INSTRUMENT_COLORS[inst.id];
            return (
              <button
                key={inst.id}
                onClick={() => onInstrument(inst.id)}
                className="px-[13px] py-[5px] rounded-full font-sans text-[0.75rem] font-medium cursor-pointer transition-all duration-200 ease-out"
                style={{
                  border: `1px solid ${active ? col : "rgba(255,255,255,0.1)"}`,
                  background: active ? `${col}22` : "transparent",
                  color: active ? col : "var(--color-text-mid)",
                  boxShadow: active ? `0 0 14px ${col}44` : "none",
                }}
              >
                {inst.label}
              </button>
            );
          })}
        </div>

        {/* Melody style */}
        <div className="flex items-center gap-[7px]">
          <span className="font-mono text-[0.58rem] text-text-dim tracking-[0.1em]">
            MELODY
          </span>
          <select
            value={melodyStyle}
            onChange={(e) => onMelodyStyle(e.target.value)}
            className="px-2.5 py-[5px] rounded-[7px] font-sans text-[0.78rem] text-text cursor-pointer outline-none"
            style={{
              background: "rgba(0,0,0,0.5)",
              border: "1px solid rgba(6,214,160,0.25)",
              appearance: "none",
              WebkitAppearance: "none",
              paddingRight: 28,
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2306D6A0' stroke-width='1.5' fill='none' stroke-linecap='round'/%3E%3C/svg%3E")`,
              backgroundRepeat: "no-repeat",
              backgroundPosition: "right 8px center",
            }}
          >
            {["none", "simple", "arpeggio", "lead", "ambient", "rhythmic"].map((s) => (
              <option key={s} value={s} style={{ background: "#0d0d10" }}>
                {s.charAt(0).toUpperCase() + s.slice(1) || "None"}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 3: Drum Patterns + Mix Controls */}
      {drumsOn && (
        <div
          className="flex items-center gap-2 flex-wrap px-3.5 py-2.5 rounded-xl"
          style={{
            background: "rgba(6,6,10,0.45)",
            border: "1px solid var(--color-border)",
          }}
        >
          {/* Patterns button */}
          <button
            onClick={onOpenPatterns}
            className="px-3 py-[5px] rounded-lg font-mono text-[0.6rem] tracking-[0.08em] uppercase cursor-pointer transition-all duration-150"
            style={{
              background: hasActivePattern ? "rgba(239,71,111,0.12)" : "rgba(255,255,255,0.05)",
              color: hasActivePattern ? "var(--color-rose)" : "var(--color-text-dim)",
              border: `1px solid ${hasActivePattern ? "rgba(239,71,111,0.3)" : "rgba(255,255,255,0.08)"}`,
            }}
          >
            Patterns
          </button>

          {/* Divider */}
          <div className="w-px h-[22px] bg-white/8" />

          {/* Drum Intensity slider */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[0.52rem] text-text-dim tracking-[0.06em] uppercase">
              Intensity
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={drumIntensity}
              onChange={(e) => onDrumIntensity(parseInt(e.target.value))}
              className="w-[60px]"
              style={{
                background: `linear-gradient(90deg, var(--color-rose) ${drumIntensity}%, rgba(239,71,111,0.18) 0%)`,
              }}
            />
            <span className="font-mono text-[0.52rem] text-text-dim w-[22px] text-right">
              {drumIntensity}
            </span>
          </div>

          {/* Swing slider */}
          <div className="flex items-center gap-1.5">
            <span className="font-mono text-[0.52rem] text-text-dim tracking-[0.06em] uppercase">
              Swing
            </span>
            <input
              type="range"
              min={0}
              max={100}
              value={swing}
              onChange={(e) => onSwing(parseInt(e.target.value))}
              className="w-[50px]"
              style={{
                background: `linear-gradient(90deg, var(--color-teal) ${swing}%, rgba(6,214,160,0.18) 0%)`,
              }}
            />
            <span className="font-mono text-[0.52rem] text-text-dim w-[22px] text-right">
              {swing}
            </span>
          </div>

          {/* Divider */}
          <div className="w-px h-[22px] bg-white/8" />

          {/* Toggles */}
          <Checkbox label="Humanize" checked={humanizeOn} onChange={onHumanize} color="var(--color-teal)" />
          <Checkbox label="Variation" checked={randomVariation} onChange={onRandomVariation} color="#A855F7" />
          <Checkbox label="Mel. Priority" checked={melodyPriority} onChange={onMelodyPriority} color="var(--color-rose)" />
          <Checkbox label="Auto-Mix" checked={autoMix} onChange={onAutoMix} color="var(--color-teal)" />

          {/* Mix Meter */}
          <div className="ml-auto">
            <MixMeter isPlaying={isPlaying} />
          </div>
        </div>
      )}
    </div>
  );
}
