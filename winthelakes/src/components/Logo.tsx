/** Mark: an Explorer-orange map cover with two fells and the water below. */
export function LogoMark({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden="true">
      <rect width="32" height="32" rx="4" fill="#c94a0c" />
      <path d="M3 21 L11 11 L15.5 16 L20 9 L29 21 Z" fill="#fff" />
      <path d="M5 25.5h9M17 25.5h10" stroke="#a9d8ee" strokeWidth="2.2" strokeLinecap="round" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark />
      <span className="display text-[1.45rem] leading-none whitespace-nowrap sm:text-[1.6rem]">Win the Lakes</span>
    </span>
  );
}
