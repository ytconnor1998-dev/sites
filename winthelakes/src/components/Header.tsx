"use client";

import { Menu, ShoppingBasket, Ticket, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { nav, site } from "@/config/site";
import { useBasket } from "@/lib/basket";
import { Logo } from "./Logo";

export function Header() {
  const items = useBasket();
  const count = items.length;
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Close the mobile menu after navigating.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <header className="sticky top-0 z-50">
      <div className="bg-lake px-4 py-1.5 text-center text-[0.72rem] font-bold tracking-wide text-night">
        {site.minAge}+ · {site.territory} · Free postal entry on every competition ·{" "}
        <Link href="/free-entry" className="underline underline-offset-2">
          How
        </Link>
      </div>
      <div className="border-b border-line bg-night/85 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-6 px-4 sm:px-6">
          <Link href="/" aria-label={`${site.name} home`}>
            <Logo />
          </Link>
          <nav aria-label="Main" className="hidden flex-1 items-center gap-1 lg:flex">
            {nav.map((n) => {
              const active = pathname.startsWith(n.href);
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`eyebrow rounded-full px-3.5 py-2 transition-colors hover:text-lake ${active ? "text-lake" : "text-fog"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/account" className="btn btn-ghost hidden !px-4 !py-2.5 sm:inline-flex">
              <Ticket size={16} /> My tickets
            </Link>
            <Link
              href="/basket"
              className="relative grid h-11 w-11 place-items-center rounded-full border border-line-2 transition-colors hover:border-lake hover:text-lake"
              aria-label={`Basket, ${count} ${count === 1 ? "competition" : "competitions"}`}
            >
              <ShoppingBasket size={19} />
              {count > 0 && (
                <span className="absolute -top-1 -right-1 grid h-5 min-w-5 place-items-center rounded-full bg-lantern px-1 text-[0.68rem] font-extrabold text-night">
                  {count}
                </span>
              )}
            </Link>
            <button
              type="button"
              className="grid h-11 w-11 place-items-center rounded-full border border-line-2 lg:hidden"
              aria-expanded={open}
              aria-controls="mobile-nav"
              aria-label={open ? "Close menu" : "Open menu"}
              onClick={() => setOpen((o) => !o)}
            >
              {open ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {open && (
          <nav id="mobile-nav" aria-label="Mobile" className="border-t border-line px-4 pt-2 pb-5 lg:hidden">
            {[...nav, { href: "/account", label: "My tickets" }].map((n) => (
              <Link key={n.href} href={n.href} className="display block border-b border-line py-4 text-2xl last:border-0">
                {n.label}
              </Link>
            ))}
          </nav>
        )}
      </div>
    </header>
  );
}
