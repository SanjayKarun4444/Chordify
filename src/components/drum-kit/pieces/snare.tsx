export default function SnareSVG() {
  return (
    <>
      {/* Snare drum head */}
      <ellipse cx={0} cy={0} rx={38} ry={28}
        fill="url(#drumHeadGrad)" stroke="var(--color-gold-dim)" strokeWidth={1.5} />
      {/* Snare wires (horizontal lines) */}
      {[-10, -4, 2, 8].map((y) => (
        <line key={y} x1={-24} y1={y} x2={24} y2={y}
          stroke="rgba(255,209,102,0.15)" strokeWidth={0.5} />
      ))}
      {/* Inner rim */}
      <ellipse cx={0} cy={0} rx={30} ry={22}
        fill="none" stroke="rgba(255,209,102,0.18)" strokeWidth={0.6} />
      <text y={42} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={14} fontFamily="var(--font-mono)">
        SNARE
      </text>
    </>
  );
}
