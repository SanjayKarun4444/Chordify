export default function FloorTomSVG() {
  return (
    <>
      {/* Tom head — largest */}
      <ellipse cx={0} cy={0} rx={38} ry={28}
        fill="url(#drumHeadGrad)" stroke="var(--color-gold-dim)" strokeWidth={1.5} />
      {/* Inner ring */}
      <ellipse cx={0} cy={0} rx={28} ry={20}
        fill="none" stroke="rgba(255,209,102,0.15)" strokeWidth={0.5} />
      <text y={42} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={13} fontFamily="var(--font-mono)">
        FLOOR
      </text>
    </>
  );
}
