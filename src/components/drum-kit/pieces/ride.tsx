export default function RideSVG() {
  return (
    <>
      {/* Ride cymbal — larger, metallic */}
      <ellipse cx={0} cy={0} rx={44} ry={15}
        fill="url(#cymbalGrad)" stroke="rgba(255,209,102,0.25)" strokeWidth={1} />
      {/* Bell (prominent) */}
      <ellipse cx={0} cy={0} rx={10} ry={4}
        fill="rgba(255,209,102,0.2)" stroke="rgba(255,209,102,0.25)" strokeWidth={0.5} />
      {/* Radial groove hints */}
      <ellipse cx={0} cy={0} rx={28} ry={9.5}
        fill="none" stroke="rgba(255,209,102,0.06)" strokeWidth={0.5} />
      <text y={28} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={13} fontFamily="var(--font-mono)">
        RIDE
      </text>
    </>
  );
}
