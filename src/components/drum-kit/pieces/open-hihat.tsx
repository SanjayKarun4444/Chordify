export default function OpenHihatSVG() {
  return (
    <>
      {/* Top cymbal (slightly tilted via separate ellipses) */}
      <ellipse cx={0} cy={-3} rx={32} ry={11}
        fill="url(#cymbalGrad)" stroke="rgba(255,209,102,0.3)" strokeWidth={1} />
      {/* Bottom cymbal peek */}
      <ellipse cx={0} cy={3} rx={30} ry={10}
        fill="url(#cymbalGrad)" stroke="rgba(255,209,102,0.2)" strokeWidth={0.7}
        opacity={0.6} />
      {/* Gap indicator */}
      <line x1={-10} y1={0} x2={10} y2={0}
        stroke="rgba(255,209,102,0.25)" strokeWidth={0.5} strokeDasharray="2 2" />
      <text y={24} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={13} fontFamily="var(--font-mono)">
        OH
      </text>
    </>
  );
}
