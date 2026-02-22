export default function HighTomSVG() {
  return (
    <>
      {/* Tom head */}
      <ellipse cx={0} cy={0} rx={30} ry={22}
        fill="url(#drumHeadGrad)" stroke="var(--color-gold-dim)" strokeWidth={1.2} />
      {/* Inner ring */}
      <ellipse cx={0} cy={0} rx={22} ry={16}
        fill="none" stroke="rgba(255,209,102,0.15)" strokeWidth={0.5} />
      <text y={34} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={13} fontFamily="var(--font-mono)">
        HI TOM
      </text>
    </>
  );
}
