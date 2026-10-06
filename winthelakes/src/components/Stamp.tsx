/**
 * A rubber stamp: inked capitals in a double border, set at an angle.
 * Capitals are deliberate here; it's how a stamp reads.
 */
export function Stamp({ children, tone = "explorer", angle = -6, className = "" }: { children: React.ReactNode; tone?: "explorer" | "ink" | "white" | "wood"; angle?: number; className?: string }) {
  const tones = {
    explorer: "text-explorer border-explorer",
    ink: "text-ink border-ink",
    white: "text-white border-white",
    wood: "text-wood border-wood",
  };
  return (
    <span
      className={`stamp inline-block rounded-[4px] border-[2.5px] px-2.5 py-1 text-[0.8rem] leading-none font-extrabold tracking-[0.06em] uppercase ${tones[tone]} ${className}`}
      style={{ transform: `rotate(${angle}deg)` }}
    >
      <span className="block rounded-[2px] border border-current px-1.5 py-1">{children}</span>
    </span>
  );
}
