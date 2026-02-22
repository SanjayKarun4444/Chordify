export default function KickSVG() {
  return (
    <>
      {/* Kick drum body */}
      <ellipse cx={0} cy={0} rx={52} ry={38}
        fill="url(#drumHeadGrad)" stroke="var(--color-gold-dim)" strokeWidth={1.5} />
      {/* Inner ring */}
      <ellipse cx={0} cy={0} rx={36} ry={26}
        fill="none" stroke="rgba(255,209,102,0.2)" strokeWidth={0.8} />
      {/* Center dot */}
      <circle cx={0} cy={0} r={8}
        fill="rgba(255,209,102,0.12)" />
      {/* Label */}
      <text y={55} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={14} fontFamily="var(--font-mono)">
        KICK
      </text>
    </>
  );
}
