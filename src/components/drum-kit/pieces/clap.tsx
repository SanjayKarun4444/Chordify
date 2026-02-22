export default function ClapSVG() {
  return (
    <>
      {/* Abstract clap icon — two hand shapes */}
      <path
        d="M-8,-12 C-8,-18 -2,-20 0,-14 C2,-20 8,-18 8,-12 L8,-2 C8,6 0,12 0,12 C0,12 -8,6 -8,-2 Z"
        fill="rgba(255,209,102,0.15)" stroke="var(--color-gold-dim)" strokeWidth={1} />
      {/* Sound lines */}
      <line x1={12} y1={-8} x2={18} y2={-10}
        stroke="rgba(255,209,102,0.2)" strokeWidth={0.8} />
      <line x1={13} y1={0} x2={19} y2={0}
        stroke="rgba(255,209,102,0.15)" strokeWidth={0.8} />
      <line x1={12} y1={8} x2={18} y2={10}
        stroke="rgba(255,209,102,0.2)" strokeWidth={0.8} />
      <text y={26} textAnchor="middle"
        fill="var(--color-text-dim)" fontSize={13} fontFamily="var(--font-mono)">
        CLAP
      </text>
    </>
  );
}
