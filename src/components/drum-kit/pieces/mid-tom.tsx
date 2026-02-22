export default function MidTomSVG() {
  return (
    <>
      {/* Tom head */}
      <ellipse cx={0} cy={0} rx={33} ry={24}
        fill="url(#drumHeadGrad)" stroke="var(--color-gold-dim)" strokeWidth={1.2} />
      {/* Inner ring */}
      <ellipse cx={0} cy={0} rx={24} ry={17}
        fill="none" stroke="rgba(255,209,102,0.15)" strokeWidth={0.5} />
      <text y={37} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={13} fontFamily="var(--font-mono)">
        MID TOM
      </text>
    </>
  );
}
