export default function HihatSVG() {
  return (
    <>
      {/* Cymbal body */}
      <ellipse cx={0} cy={0} rx={32} ry={12}
        fill="url(#cymbalGrad)" stroke="rgba(255,209,102,0.3)" strokeWidth={1} />
      {/* Bell */}
      <ellipse cx={0} cy={0} rx={8} ry={3}
        fill="rgba(255,209,102,0.2)" />
      {/* Edge highlight */}
      <ellipse cx={0} cy={-2} rx={28} ry={8}
        fill="none" stroke="rgba(255,209,102,0.1)" strokeWidth={0.5} />
      <text y={24} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={13} fontFamily="var(--font-mono)">
        HH
      </text>
    </>
  );
}
