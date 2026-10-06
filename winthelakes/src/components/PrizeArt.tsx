import { Bike, CarFront, Gift, Home, PoundSterling, Sailboat, Smartphone, Tent } from "lucide-react";
import type { ArtIcon, Competition } from "@/config/competitions";

const icons: Record<ArtIcon, typeof Home> = {
  lodge: Home,
  cash: PoundSterling,
  car: CarFront,
  bike: Bike,
  tech: Smartphone,
  boat: Sailboat,
  gift: Gift,
  camper: Tent,
};

/**
 * Prize image. Uses the competition's photo if it has one (public/images/prizes/…),
 * otherwise draws artwork: a fellside silhouette over water with the prize icon.
 */
export function PrizeArt({ comp, className = "", iconSize = 64 }: { comp: Pick<Competition, "art" | "image" | "title">; className?: string; iconSize?: number }) {
  if (comp.image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={comp.image} alt={comp.title} className={`absolute inset-0 h-full w-full object-cover ${className}`} />;
  }
  const Icon = icons[comp.art.icon];
  return (
    <div
      role="img"
      aria-label={comp.title}
      className={`absolute inset-0 overflow-hidden ${className}`}
      style={{ background: `linear-gradient(160deg, ${comp.art.from}, ${comp.art.to})` }}
    >
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" className="absolute inset-0 h-full w-full" aria-hidden="true">
        <circle cx="320" cy="70" r="26" fill="#ffc857" opacity="0.18" />
        <path d="M0 190 L70 120 L120 160 L190 80 L260 150 L310 110 L400 180 L400 300 L0 300 Z" fill="#000" opacity="0.22" />
        <path d="M0 215 L60 170 L130 205 L210 150 L290 200 L350 170 L400 200 L400 300 L0 300 Z" fill="#000" opacity="0.3" />
        <rect y="225" width="400" height="75" fill="#000" opacity="0.28" />
        <path d="M40 245h60M150 260h90M280 248h70M90 280h50" stroke="#fff" strokeOpacity="0.12" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid place-items-center rounded-full bg-white/10 p-6 ring-1 ring-white/15 backdrop-blur-sm">
          <Icon size={iconSize} strokeWidth={1.4} className="text-white/90" />
        </span>
      </div>
    </div>
  );
}
