export default function CrashSVG() {
  return (
    <>
      {/* Crash cymbal — larger, gold-tinted */}
      <ellipse cx={0} cy={0} rx={42} ry={14}
        fill="url(#cymbalGoldGrad)" stroke="rgba(255,209,102,0.35)" strokeWidth={1.2} />
      {/* Bell */}
      <ellipse cx={0} cy={0} rx={9} ry={3.5}
        fill="rgba(255,209,102,0.25)" />
      {/* Shimmer lines */}
      {[-18, -6, 6, 18].map((x) => (
        <line key={x} x1={x} y1={-6} x2={x} y2={6}
          stroke="rgba(255,209,102,0.08)" strokeWidth={0.5} />
      ))}
      <text y={28} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={13} fontFamily="var(--font-mono)">
        CRASH
      </text>
    </>
  );
}
