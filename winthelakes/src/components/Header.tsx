"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site } from "@/config/site";
import { useBasket } from "@/lib/basket";
import { Logo } from "./Logo";

export function Header() {
  const items = useBasket();
  const count = items.reduce((n, i) => n + i.qty, 0);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Close the mobile menu after navigating.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50 border-b border-rule bg-map/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
        <Link href="/" aria-label={`${site.name} home`}>
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden flex-1 items-center gap-6 lg:flex">
          {nav.map((n) => {
            const active = pathname.startsWith(n.href);
            return (
              <Link
                key={n.href}
                href={n.href}
                aria-current={active ? "page" : undefined}
                className={`py-1 text-[0.95rem] ${active ? "font-semibold underline decoration-explorer decoration-2 underline-offset-[6px]" : "text-ink-2 hover:text-ink"}`}
              >
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="ml-auto flex items-center gap-4">
          <Link href="/account" className="hidden text-[0.95rem] text-ink-2 hover:text-ink sm:block">
            My tickets
          </Link>
          <Link href="/basket" className="ticket ticket-h paper-lemon flex h-10 items-stretch text-sm font-semibold" style={{ "--stub": "2.6rem", "--notch": "5px" } as React.CSSProperties}>
            <span className="flex items-center px-3">Basket</span>
            <span className="stub-h tabular flex items-center justify-center" aria-label={`${count} tickets`}>
              {count}
            </span>
          </Link>
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-md lg:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((o) => !o)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && (
        <nav id="mobile-nav" aria-label="Mobile" className="border-t border-rule px-4 pb-4 lg:hidden">
          {[...nav, { href: "/account", label: "My tickets" }].map((n) => (
            <Link key={n.href} href={n.href} className="display block border-b border-rule py-3.5 text-3xl last:border-0">
              {n.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
