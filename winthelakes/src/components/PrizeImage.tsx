/**
 * Prize image. Uses the competition's photo when it has one (public/images/prizes/…).
 * Until then it draws a little Ordnance Survey-style map tile, different for every
 * prize: contour rings round a fell or two, a lake, some woodland and the grid.
 */
export function PrizeImage({ seed, image, alt, className = "" }: { seed: string; image?: string; alt: string; className?: string }) {
  if (image) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={image} alt={alt} className={`absolute inset-0 h-full w-full object-cover ${className}`} />;
  }
  return <MapTile seed={seed} label={alt} className={className} />;
}

function rng(seed: string) {
  let s = [...seed].reduce((n, c) => (n * 31 + c.charCodeAt(0)) >>> 0, 2166136261);
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32);
}

/** A closed, wobbly ring of radius r around (cx, cy). */
function ring(cx: number, cy: number, r: number, wob: number[], squash = 1, rot = 0) {
  const pts: string[] = [];
  const n = 48;
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    const k = 1 + wob[0] * Math.sin(2 * t + wob[1]) + wob[2] * Math.sin(3 * t + wob[3]) + 0.04 * Math.sin(7 * t);
    const x = r * k * Math.cos(t);
    const y = r * k * Math.sin(t) * squash;
    const xr = x * Math.cos(rot) - y * Math.sin(rot);
    const yr = x * Math.sin(rot) + y * Math.cos(rot);
    pts.push(`${(cx + xr).toFixed(1)},${(cy + yr).toFixed(1)}`);
  }
  return `M${pts.join("L")}Z`;
}

function MapTile({ seed, label, className }: { seed: string; label: string; className: string }) {
  const r = rng(seed);
  const W = 400;
  const H = 300;
  const fells = Array.from({ length: 2 }, () => ({
    x: 60 + r() * 280,
    y: 40 + r() * 200,
    wob: [0.1 + r() * 0.15, r() * 6, 0.05 + r() * 0.1, r() * 6],
    rot: r() * Math.PI,
  }));
  const lake = { x: 80 + r() * 240, y: 90 + r() * 120, rot: -0.9 + r() * 1.8, wob: [0.08, r() * 6, 0.08, r() * 6] };
  const woods = Array.from({ length: 3 }, () => ({ x: r() * W, y: r() * H, rr: 18 + r() * 26, wob: [0.2, r() * 6, 0.15, r() * 6] }));
  const easting = 30 + Math.floor(r() * 60);
  const northing = 80 + Math.floor(r() * 20);

  return (
    <svg role="img" aria-label={label} viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="xMidYMid slice" className={`absolute inset-0 h-full w-full ${className}`}>
      <rect width={W} height={H} fill="#f7f5ec" />
      {woods.map((w, i) => (
        <path key={i} d={ring(w.x, w.y, w.rr, w.wob)} fill="#cfe6c4" />
      ))}
      {fells.map((f, i) =>
        Array.from({ length: 9 }, (_, j) => (
          <path key={`${i}-${j}`} d={ring(f.x, f.y, 14 + j * 15, f.wob, 0.75, f.rot)} fill="none" stroke="#c98a5a" strokeOpacity={j % 5 === 4 ? 0.85 : 0.45} strokeWidth={j % 5 === 4 ? 1.2 : 0.7} />
        )),
      )}
      <path d={ring(lake.x, lake.y, 70, lake.wob, 0.22, lake.rot)} fill="#a9d8ee" stroke="#3d7fa6" strokeWidth="0.9" />
      {Array.from({ length: 9 }, (_, i) => (
        <line key={`v${i}`} x1={i * 50} y1={0} x2={i * 50} y2={H} stroke="#3d7fa6" strokeOpacity="0.35" strokeWidth="0.6" />
      ))}
      {Array.from({ length: 7 }, (_, i) => (
        <line key={`h${i}`} x1={0} y1={i * 50} x2={W} y2={i * 50} stroke="#3d7fa6" strokeOpacity="0.35" strokeWidth="0.6" />
      ))}
      {Array.from({ length: 8 }, (_, i) => (
        <text key={`e${i}`} x={i * 50 + 3} y={11} fontSize="8" fill="#3d7fa6" fontFamily="system-ui">
          {easting + i}
        </text>
      ))}
      {Array.from({ length: 5 }, (_, i) => (
        <text key={`n${i}`} x={3} y={(i + 1) * 50 - 3} fontSize="8" fill="#3d7fa6" fontFamily="system-ui">
          {northing - i}
        </text>
      ))}
    </svg>
  );
}
