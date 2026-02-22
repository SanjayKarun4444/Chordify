"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { buildPianoKeys, normalizeToDisplayRange } from "@/lib/chord-utils";

interface RippleData {
  id: string;
  cx: number;
  cy: number;
  delay: number;
  size: number;
  color: string;
}

interface PianoRippleProps {
  activeNotes?: number[];
  onKeyClick?: (midi: number) => void;
}

export default function PianoRipple({ activeNotes = [], onKeyClick }: PianoRippleProps) {
  const pianoKeys = useMemo(() => buildPianoKeys(), []);
  const containerRef = useRef<HTMLDivElement>(null);
  const waveCanvasRef = useRef<HTMLCanvasElement>(null);
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const waveAnimRef = useRef<number | null>(null);

  const whiteKeys = useMemo(() => pianoKeys.filter((k) => k.type === "white"), [pianoKeys]);
  const blackKeys = useMemo(() => pianoKeys.filter((k) => k.type === "black"), [pianoKeys]);

  const activateWave = useCallback(() => {
    if (!waveCanvasRef.current) return;
    let wt = 0;
    let fadeOut = 0;
    const canvas = waveCanvasRef.current;
    const ctx = canvas.getContext("2d")!;

    if (waveAnimRef.current) cancelAnimationFrame(waveAnimRef.current);

    const W = canvas.width;
    const H = canvas.height;
    const fadeDelay = 28;

    function draw() {
      ctx.clearRect(0, 0, W, H);
      wt += 0.12;
      fadeOut++;
      const alpha = Math.max(0, 1 - Math.max(0, fadeOut - fadeDelay) / 22);
      if (alpha <= 0) return;

      ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const y =
          H / 2 +
          Math.sin(x * 0.045 + wt) * 7 * Math.sin(wt * 0.4) +
          Math.sin(x * 0.022 + wt * 1.4) * 4;
        x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      const grd = ctx.createLinearGradient(0, 0, W, 0);
      grd.addColorStop(0, `rgba(255,209,102,0)`);
      grd.addColorStop(0.2, `rgba(255,209,102,${0.55 * alpha})`);
      grd.addColorStop(0.5, `rgba(6,214,160,${0.35 * alpha})`);
      grd.addColorStop(0.8, `rgba(255,209,102,${0.45 * alpha})`);
      grd.addColorStop(1, `rgba(255,209,102,0)`);
      ctx.strokeStyle = grd;
      ctx.lineWidth = 1.5;
      ctx.stroke();

      waveAnimRef.current = requestAnimationFrame(draw);
    }
    waveAnimRef.current = requestAnimationFrame(draw);
  }, []);

  // Trigger ripples when activeNotes changes
  useEffect(() => {
    if (!activeNotes.length || !containerRef.current) return;
    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    const totalWhite = whiteKeys.length;
    const keyW = containerRect.width / totalWhite;

    const newRipples: RippleData[] = [];
    activeNotes.forEach((midi) => {
      const key = pianoKeys.find((k) => k.midi === midi);
      if (!key) return;
      let cx: number, cy: number;
      if (key.type === "white") {
        cx = (key.whiteIdx! + 0.5) * keyW;
        cy = containerRect.height * 0.6;
      } else {
        cx = (key.afterWhite! + 0.75) * keyW;
        cy = containerRect.height * 0.3;
      }
      for (let i = 0; i < 3; i++) {
        newRipples.push({
          id: `${Date.now()}-${midi}-${i}`,
          cx,
          cy,
          delay: i * 80,
          size: 24 + i * 8,
          color:
            i === 0
              ? "rgba(255,209,102,0.7)"
              : i === 1
                ? "rgba(255,209,102,0.4)"
                : "rgba(6,214,160,0.25)",
        });
      }
    });

    setRipples((prev) => [...prev, ...newRipples]);
    activateWave();

    const cleanup = setTimeout(() => {
      setRipples((prev) =>
        prev.filter((r) => !newRipples.find((nr) => nr.id === r.id)),
      );
    }, 1400);
    return () => clearTimeout(cleanup);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNotes]);

  const normalizedActive = useMemo(
    () => normalizeToDisplayRange(activeNotes),
    [activeNotes],
  );

  return (
    <div
      ref={containerRef}
      className="relative w-full select-none"
      style={{ height: 90, willChange: "transform" }}
    >
      {/* Wave canvas — behind keys */}
      <canvas
        ref={waveCanvasRef}
        width={800}
        height={90}
        className="absolute inset-0 w-full h-full pointer-events-none z-[1] opacity-60"
      />

      {/* White keys */}
      <div className="absolute inset-0 flex z-[2]">
        {whiteKeys.map((key) => {
          const isActive = normalizedActive.includes(key.midi);
          return (
            <div
              key={key.note}
              className={`piano-key-white${isActive ? " active" : ""}`}
              onClick={() => onKeyClick && onKeyClick(key.midi)}
              style={{
                flex: 1,
                height: "100%",
                background: isActive ? "rgba(255,209,102,0.28)" : "rgba(240,235,220,0.92)",
                border: "1px solid rgba(0,0,0,0.35)",
                borderTop: "none",
                borderRadius: "0 0 5px 5px",
                cursor: "pointer",
                position: "relative",
                transition: "background 0.15s ease",
                boxShadow: isActive
                  ? "0 0 22px rgba(255,209,102,0.8), inset 0 0 10px rgba(255,209,102,0.3)"
                  : "inset 0 -3px 6px rgba(0,0,0,0.15)",
              }}
            >
              {(
                <span
                  style={{
                    position: "absolute",
                    bottom: 4,
                    left: 0,
                    right: 0,
                    textAlign: "center",
                    fontSize: 9,
                    color: "rgba(0,0,0,0.4)",
                    pointerEvents: "none",
                    userSelect: "none",
                  }}
                >
                  {key.note.replace(/\d+$/, "")}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Black keys */}
      <div className="absolute inset-0 pointer-events-none z-[3]">
        {blackKeys.map((key) => {
          const isActive = normalizedActive.includes(key.midi);
          const totalWhite = whiteKeys.length;
          const leftPct = ((key.afterWhite! + 0.72) / totalWhite) * 100;
          const widthPct = (0.55 / totalWhite) * 100;
          return (
            <div
              key={key.note}
              className={`piano-key-black${isActive ? " active" : ""}`}
              onClick={(e) => {
                e.stopPropagation();
                onKeyClick && onKeyClick(key.midi);
              }}
              style={{
                position: "absolute",
                left: `${leftPct}%`,
                width: `${widthPct}%`,
                height: "58%",
                background: isActive
                  ? "rgba(255,209,102,0.5)"
                  : "linear-gradient(180deg, #1a1814 0%, #0e0d0b 100%)",
                borderRadius: "0 0 4px 4px",
                cursor: "pointer",
                pointerEvents: "all",
                zIndex: 10,
                boxShadow: isActive
                  ? "0 0 18px rgba(255,209,102,0.75), 0 2px 6px rgba(0,0,0,0.8)"
                  : "0 3px 10px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.08)",
                transition: "box-shadow 0.1s ease",
              }}
            />
          );
        })}
      </div>

      {/* Ripple overlay */}
      <div className="absolute inset-0 z-20 pointer-events-none overflow-hidden">
        {ripples.map((r) => (
          <div
            key={r.id}
            className="ripple-circle"
            style={{
              left: `${(r.cx / (containerRef.current?.offsetWidth || 800)) * 100}%`,
              top: r.cy,
              width: r.size,
              height: r.size,
              borderColor: r.color,
              animationDelay: `${r.delay}ms`,
            }}
          />
        ))}
      </div>

      {/* Subtle gradient overlay top — depth */}
      <div
        className="absolute top-0 left-0 right-0 h-3 pointer-events-none z-[25]"
        style={{ background: "linear-gradient(180deg, rgba(6,6,8,0.6) 0%, transparent 100%)" }}
      />
    </div>
  );
}
