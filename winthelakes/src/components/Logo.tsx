/** Mark: three fells reflected in a lake, with a ticket-notch moon. */
export function LogoMark({ className = "h-9 w-9" }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden="true">
      <defs>
        <linearGradient id="wtl-fell" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2ee6d0" />
          <stop offset="1" stopColor="#0b8f86" />
        </linearGradient>
      </defs>
      <rect width="40" height="40" rx="11" fill="#0f1d28" />
      <circle cx="29" cy="11" r="3.2" fill="#ffc857" />
      <path d="M4 24 L13 12 L18 18 L23 10 L36 24 Z" fill="url(#wtl-fell)" />
      <path d="M4 26 L36 26 L23 33 L18 29 L13 32 Z" fill="#2ee6d0" opacity="0.28" />
      <path d="M8 29h7M20 31h9" stroke="#2ee6d0" strokeOpacity="0.5" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="display text-[1.15rem] leading-none tracking-tight">
        Win<span className="text-lake">the</span>Lakes
      </span>
    </span>
  );
}
