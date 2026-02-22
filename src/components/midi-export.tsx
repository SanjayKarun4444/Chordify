"use client";

import { useState } from "react";
import { buildChordsMidi, buildBassMidi, buildDrumsMidi, downloadBlob } from "@/lib/midi-export";
import type { Progression, MidiTrack } from "@/lib/types";

interface MidiExportProps {
  progression: Progression;
}

export default function MidiExport({ progression }: MidiExportProps) {
  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState(0);

  const tracks: MidiTrack[] = [
    {
      id: "chords",
      icon: "\u2B1C",
      label: "Chords",
      detail: `${progression.chords.length} bars \u00B7 Ch 1`,
      generate: () => buildChordsMidi(progression),
    },
    {
      id: "bass",
      icon: "\u25C9",
      label: "Bass Line",
      detail: "Root notes \u00B7 Ch 2",
      generate: () => buildBassMidi(progression),
    },
    {
      id: "drums",
      icon: "\u25C8",
      label: "Drums (Full)",
      detail: "All voices \u00B7 Ch 10",
      generate: () => buildDrumsMidi(progression),
    },
  ];

  const downloadTrack = (track: MidiTrack) => {
    const slug = `${(progression.genre || "track").replace(/\s+/g, "_")}_${progression.tempo}bpm`;
    downloadBlob(track.generate(), `${slug}_${track.id}.mid`);
  };

  const downloadZip = async () => {
    setBuilding(true);
    setProgress(0);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const slug = `${(progression.genre || "track").replace(/\s+/g, "_")}_${(progression.mood || "midi").replace(/\s+/g, "_")}_${progression.tempo}bpm`;
      const folder = zip.folder(slug)!;
      for (let i = 0; i < tracks.length; i++) {
        await new Promise((r) => setTimeout(r, 40));
        setProgress(Math.round(((i + 1) / tracks.length) * 85));
        folder.file(
          `${String(i + 1).padStart(2, "0")}_${tracks[i].id}.mid`,
          tracks[i].generate(),
        );
      }
      setProgress(95);
      const blob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
      setProgress(100);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${slug}_midi_pack.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("ZIP build failed:", err);
    }
    setTimeout(() => {
      setBuilding(false);
      setProgress(0);
    }, 1200);
  };

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-5 mt-[18px]"
      style={{
        background: "linear-gradient(135deg, rgba(255,209,102,0.03) 0%, rgba(6,214,160,0.03) 100%)",
        border: "1px solid var(--color-border)",
      }}
    >
      {/* Top shimmer */}
      <div className="shimmer-line absolute top-0 left-0 right-0 h-px" />

      <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2.5">
        <div className="flex items-center gap-2.5">
          <span className="font-display text-[1.05rem] text-gold">MIDI Pack Export</span>
          <span className="font-mono text-[0.55rem] tracking-[0.15em] text-teal uppercase px-[9px] py-[3px] rounded-[20px]"
            style={{
              background: "rgba(6,214,160,0.1)",
              border: "1px solid rgba(6,214,160,0.3)",
            }}
          >
            {tracks.length} Tracks
          </span>
        </div>
        <button
          onClick={downloadZip}
          disabled={building}
          className="px-5 py-2.5 rounded-[10px] font-sans font-extrabold text-[0.82rem] cursor-pointer flex items-center gap-[7px] transition-all duration-200 ease-out disabled:cursor-not-allowed"
          style={{
            background: building
              ? "rgba(255,209,102,0.15)"
              : "linear-gradient(135deg, var(--color-gold) 0%, #ffaa00 100%)",
            color: building ? "var(--color-gold)" : "#000",
            border: building ? "1px solid var(--color-gold)" : "none",
            boxShadow: building ? "none" : "0 4px 18px rgba(255,209,102,0.28)",
          }}
        >
          {building ? (
            <>
              <span
                className="spin inline-block w-3 h-3 rounded-full"
                style={{
                  border: "2px solid rgba(255,209,102,0.3)",
                  borderTopColor: "var(--color-gold)",
                }}
              />
              {" "}Building\u2026
            </>
          ) : (
            "\u2B07 Download ZIP"
          )}
        </button>
      </div>

      {/* Progress bar */}
      {building && (
        <div className="mb-3.5 h-[3px] bg-white/7 rounded-sm overflow-hidden">
          <div
            className="h-full rounded-sm transition-[width] duration-300 ease-out"
            style={{
              width: `${progress}%`,
              background: "linear-gradient(90deg, var(--color-gold), var(--color-teal))",
            }}
          />
        </div>
      )}

      {/* Track list */}
      <div className="grid gap-[7px]" style={{ gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))" }}>
        {tracks.map((t) => (
          <div
            key={t.id}
            className="flex items-center gap-2 px-3 py-[9px] rounded-[9px] transition-all duration-200 ease-out hover:border-border-hi hover:-translate-y-px"
            style={{
              background: "rgba(0,0,0,0.4)",
              border: "1px solid var(--color-border)",
            }}
          >
            <span className="text-[0.95rem] shrink-0">{t.icon}</span>
            <div className="flex-1 min-w-0">
              <div className="font-mono text-[0.62rem] text-text tracking-[0.04em] truncate">
                {t.label}
              </div>
              <div className="text-[0.57rem] text-text-dim mt-0.5">{t.detail}</div>
            </div>
            <button
              onClick={() => downloadTrack(t)}
              className="px-2 py-[3px] rounded-[5px] font-mono text-[0.58rem] text-gold cursor-pointer transition-all duration-150 bg-transparent border border-[rgba(255,209,102,0.28)] hover:bg-gold hover:text-black"
            >
              {"\u2193"}
            </button>
          </div>
        ))}
      </div>

      {/* FL Studio hint */}
      <div
        className="mt-3.5 px-[13px] py-2.5 rounded-[9px] flex gap-[9px] items-start"
        style={{
          background: "rgba(0,0,0,0.3)",
          border: "1px solid rgba(6,214,160,0.12)",
        }}
      >
        <span className="text-[0.9rem] shrink-0">&#127899;&#65039;</span>
        <p className="text-[0.72rem] text-text-dim leading-[1.55]">
          <strong className="text-teal">FL Studio:</strong> Drag each{" "}
          <code className="text-gold text-[0.68rem]">.mid</code> into the Channel Rack. Assign Serum/Nexus/FPC to each channel. Set project to{" "}
          <strong className="text-text">{progression.tempo} BPM</strong>.
        </p>
      </div>
    </div>
  );
}
