"use client";

import { Check, Clock, Languages, MapPin, MessageCircle, Minus, Plus, Users } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ExampleChrome, FeatureZone } from "@/components/examples/Features";
import { Gallery } from "@/components/examples/Lightbox";
import { MapEmbed, directionsUrl } from "@/components/examples/MapEmbed";
import { LangToggle } from "@/components/ui/LangToggle";
import { Photo } from "@/components/ui/Photo";
import { tours as d, toursMeta, type Tour, type TourCategory } from "@/content/examples/tours";
import { romeToday } from "@/lib/hours";
import { fill, formatEuro, useL, useLang } from "@/lib/i18n";

/*
 * Sette Colli Tours palette
 * travertine #F4EDE2 · espresso #2B211C · terracotta #B4472A · ochre #E3B04B (fills only)
 */

const display = "font-[family-name:var(--font-sc-display)]";
const CATS: TourCategory[] = ["history", "food", "evening", "family"];
const arch = "rounded-t-[999px] rounded-b-3xl";

export function TourSite() {
  const tr = useL();
  const { lang } = useLang();
  const [tourId, setTourId] = useState(d.items[0].id);

  const chooseTour = (id: string) => {
    setTourId(id);
    document.getElementById("book")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const nav = [
    { href: "#tours", label: tr(d.nav.tours) },
    { href: "#book", label: tr(d.nav.book) },
    { href: "#guides", label: tr(d.nav.guides) },
    { href: "#faq", label: tr(d.nav.faq) },
  ];

  return (
    <ExampleChrome features={toursMeta.features}>
      <div className="min-h-dvh bg-[#F4EDE2] font-[family-name:var(--font-sc-sans)] text-[#2B211C] [--ph-bg:#E6D9C6] [--ph-fg:#2B211C] [&_:focus-visible]:outline-[#B4472A]" lang={lang}>
        <a href="#sc-main" className="sr-only bg-[#2B211C] px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100]">
          {lang === "it" ? "Vai al contenuto" : "Skip to content"}
        </a>

        <header className="sticky top-0 z-40 border-b border-[#2B211C]/10 bg-[#F4EDE2]/95 backdrop-blur">
          <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-5 sm:px-8">
            <a href="#top" className={`${display} text-2xl leading-none whitespace-nowrap`}>
              Sette Colli <span className="italic text-[#B4472A]">Tours</span>
            </a>
            <nav aria-label="Sette Colli Tours" className="hidden md:block">
              <ul className="flex gap-7 text-sm font-semibold">
                {nav.map((n) => (
                  <li key={n.href}>
                    <a href={n.href} className="hover:text-[#B4472A]">
                      {n.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="flex items-center gap-2">
              <FeatureZone id="lang" labelPosition="below-right">
                <LangToggle className="text-[#2B211C]" activeClassName="bg-[#2B211C] text-white" inactiveClassName="hover:bg-[#2B211C]/10" />
              </FeatureZone>
              <a href="#book" className="hidden min-h-10 items-center rounded-full bg-[#B4472A] px-4 text-sm font-bold text-white sm:inline-flex">
                {tr(d.nav.cta)}
              </a>
            </div>
          </div>
        </header>

        <main id="sc-main">
          <FeatureZone id="hero" as="section">
            <div id="top" className="mx-auto grid max-w-7xl items-center gap-10 px-5 pt-10 pb-16 sm:px-8 lg:grid-cols-12 lg:pt-16 lg:pb-24">
              <div className="lg:col-span-7">
                <p className="text-sm font-bold tracking-[0.14em] text-[#B4472A] uppercase">{tr(d.hero.kicker)}</p>
                <h1 className={`${display} mt-4 text-[clamp(3rem,7.5vw,6.5rem)] leading-[0.95]`}>{tr(d.hero.title)}</h1>
                <p className="mt-6 max-w-[46ch] text-lg leading-relaxed text-[#2B211C]/85">{tr(d.hero.body)}</p>
                <a href="#tours" className="mt-8 inline-flex min-h-13 items-center rounded-full bg-[#B4472A] px-7 text-lg font-bold text-white hover:bg-[#9a3c23]">
                  {tr(d.hero.cta)}
                </a>
                <ul className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm font-semibold">
                  {d.hero.points.map((p) => (
                    <li key={p.en} className="flex items-center gap-2">
                      <span className="flex size-6 items-center justify-center rounded-full bg-[#E3B04B]">
                        <Check aria-hidden className="size-3.5" strokeWidth={3} />
                      </span>
                      {tr(p)}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="lg:col-span-5">
                <div className={`relative mx-auto aspect-[4/5] max-w-md overflow-hidden ${arch} bg-[#2B211C]`}>
                  <Photo src={d.hero.image.src} alt={tr(d.hero.image.alt)} sizes="(min-width: 1024px) 40vw, 90vw" priority />
                </div>
              </div>
            </div>
          </FeatureZone>

          <FeatureZone id="tours" as="section" className="bg-white">
            <TourList onChoose={chooseTour} />
          </FeatureZone>

          <FeatureZone id="booking" as="section" className="bg-[#2B211C] text-white">
            <div id="book" className="mx-auto max-w-7xl scroll-mt-16 px-5 py-20 sm:px-8 lg:py-24">
              <Booking tourId={tourId} setTourId={setTourId} />
            </div>
          </FeatureZone>

          <FeatureZone id="included" as="section" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <h2 className={`${display} text-5xl`}>{tr(d.included.title)}</h2>
            <ul className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {d.included.items.map((item) => (
                <li key={item.title.en} className="border-t-2 border-[#B4472A] pt-4">
                  <h3 className="text-lg font-bold">{tr(item.title)}</h3>
                  <p className="mt-1 leading-relaxed text-[#2B211C]/85">{tr(item.body)}</p>
                </li>
              ))}
            </ul>
          </FeatureZone>

          <FeatureZone id="guides" as="section" className="bg-white">
            <div id="guides" className="mx-auto max-w-7xl scroll-mt-16 px-5 py-20 sm:px-8 lg:py-24">
              <h2 className={`${display} text-5xl`}>{tr(d.guides.title)}</h2>
              <ul className="mt-10 grid gap-10 sm:grid-cols-3">
                {d.guides.people.map((p) => (
                  <li key={p.name}>
                    <div className={`relative aspect-[3/4] overflow-hidden ${arch}`}>
                      <Photo src={p.image.src} alt={tr(p.image.alt)} sizes="(min-width: 640px) 30vw, 90vw" />
                    </div>
                    <p className={`${display} mt-5 text-3xl`}>{p.name}</p>
                    <p className="text-[#2B211C]/85">{tr(p.role)}</p>
                  </li>
                ))}
              </ul>
            </div>
          </FeatureZone>

          <FeatureZone id="gallery" as="section" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <h2 className={`${display} text-5xl`}>{tr(d.gallery.title)}</h2>
            <Gallery
              images={d.gallery.images}
              className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4"
              itemClassName={(i) => `rounded-3xl ${i === 0 ? "col-span-2 row-span-2 aspect-square" : "aspect-square"}`}
              sizes="(min-width: 768px) 25vw, 50vw"
            />
          </FeatureZone>

          <FeatureZone id="faq" as="section" className="bg-white">
            <div id="faq" className="mx-auto grid max-w-7xl scroll-mt-16 gap-10 px-5 py-20 sm:px-8 lg:grid-cols-12 lg:py-24">
              <h2 className={`${display} text-5xl lg:col-span-4`}>{tr(d.faq.title)}</h2>
              <div className="border-t border-[#2B211C]/20 lg:col-span-8">
                {d.faq.items.map((item) => (
                  <details key={item.q.en} className="group border-b border-[#2B211C]/20">
                    <summary className="flex min-h-14 items-center justify-between gap-4 py-4">
                      <h3 className="text-lg font-bold">{tr(item.q)}</h3>
                      <Plus aria-hidden className="size-5 shrink-0 transition-transform group-open:rotate-45" />
                    </summary>
                    <p className="pb-5 leading-relaxed text-[#2B211C]/85">{tr(item.a)}</p>
                  </details>
                ))}
              </div>
            </div>
          </FeatureZone>

          <FeatureZone id="map" as="section" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 lg:py-24">
            <div className="grid gap-8 lg:grid-cols-12">
              <div className="lg:col-span-5">
                <h2 className={`${display} text-5xl`}>{tr(d.contact.title)}</h2>
                <p className="mt-4 flex items-start gap-2 text-lg">
                  <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-[#B4472A]" />
                  <span>
                    {d.address}
                    <span className="block text-base text-[#2B211C]/85">{tr(d.contact.body)}</span>
                  </span>
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <a href={directionsUrl(d.mapsQuery)} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-12 items-center rounded-full border-2 border-[#2B211C] px-5 font-bold">
                    {tr(d.contact.directions)}
                  </a>
                </div>
              </div>
              <MapEmbed query={d.mapsQuery} className={`min-h-80 lg:col-span-7 ${arch}`} tone={{ bg: "#E6D9C6", fg: "#2B211C" }} />
            </div>
          </FeatureZone>
        </main>

        <footer className="bg-[#2B211C] px-5 pt-10 pb-32 text-sm text-white/75 sm:px-8 sm:pb-24">
          <div className="mx-auto flex max-w-7xl flex-col gap-2 sm:flex-row sm:justify-between">
            <p>
              <span className={`${display} text-2xl text-white`}>Sette Colli Tours</span> · {d.phone} · {d.email}
            </p>
            <p>{tr(d.footer.fictional)}</p>
          </div>
        </footer>

        <div className="fixed right-3 bottom-3 z-[65] sm:right-5 sm:bottom-5">
          <FeatureZone id="whatsapp" labelPosition="top-right">
          <a
            href={`https://wa.me/${d.whatsapp}`}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={tr(d.contact.whatsapp)}
            className="flex size-13 items-center justify-center rounded-full bg-[#25D366] text-[#0B2E16] shadow-lg"
          >
            <MessageCircle aria-hidden className="size-6" />
          </a>
          </FeatureZone>
        </div>
      </div>
    </ExampleChrome>
  );
}

function TourList({ onChoose }: { onChoose: (id: string) => void }) {
  const tr = useL();
  const { lang } = useLang();
  const [cat, setCat] = useState<TourCategory | "all">("all");
  const l = d.list;
  const shown = d.items.filter((t) => cat === "all" || t.category === cat);

  return (
    <div id="tours" className="mx-auto max-w-7xl scroll-mt-16 px-5 py-20 sm:px-8 lg:py-24">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <h2 className={`${display} text-5xl`}>{tr(l.title)}</h2>
        <div role="group" aria-label={tr(l.title)} className="flex flex-wrap gap-2 text-sm">
          {(["all", ...CATS] as const).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={cat === k}
              onClick={() => setCat(k)}
              className={`min-h-10 cursor-pointer rounded-full border-2 px-4 font-bold ${cat === k ? "border-[#2B211C] bg-[#2B211C] text-white" : "border-[#2B211C]/15 hover:border-[#2B211C]"}`}
            >
              {k === "all" ? tr(l.all) : tr(l.categories[k])}
            </button>
          ))}
        </div>
      </div>

      <ul className="mt-10 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map((t) => (
          <li key={t.id} className="flex flex-col">
            <div className="relative aspect-[4/3] overflow-hidden rounded-3xl">
              <Photo src={t.image.src} alt={tr(t.image.alt)} sizes="(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw" />
              <span className="absolute top-3 left-3 rounded-full bg-[#F4EDE2] px-3 py-1 text-xs font-bold">{tr(l.categories[t.category])}</span>
            </div>
            <h3 className={`${display} mt-5 text-3xl leading-tight`}>{tr(t.name)}</h3>
            <p className="mt-2 leading-relaxed text-[#2B211C]/85">{tr(t.blurb)}</p>
            <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm font-semibold text-[#2B211C]/85">
              <li className="flex items-center gap-1.5">
                <Clock aria-hidden className="size-4" />
                {fill(tr(l.hours), { n: t.hours.toLocaleString(lang) })}
              </li>
              <li className="flex items-center gap-1.5">
                <Users aria-hidden className="size-4" />
                {fill(tr(l.group), { n: t.maxGroup })}
              </li>
              <li className="flex items-center gap-1.5">
                <Languages aria-hidden className="size-4" />
                {t.languages}
              </li>
            </ul>
            <div className="mt-auto flex items-end justify-between gap-3 pt-5">
              <p>
                <span className="text-sm text-[#2B211C]/85">{tr(l.from)} </span>
                <span className="text-2xl font-extrabold">{formatEuro(t.price, lang)}</span>
                <span className="block text-sm text-[#2B211C]/85">{tr(l.perPerson)}</span>
              </p>
              <button type="button" onClick={() => onChoose(t.id)} className="inline-flex min-h-11 cursor-pointer items-center rounded-full bg-[#B4472A] px-5 font-bold text-white hover:bg-[#9a3c23]">
                {tr(l.choose)}
                <span className="sr-only">: {tr(t.name)}</span>
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Small deterministic hash so "places left" look realistic but stay stable. */
const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

function placesLeft(tour: Tour, date: string, time: string) {
  const h = hash(`${tour.id}|${date}|${time}`);
  // About 1 in 7 departures is full; the rest have 3 to maxGroup places left.
  return h % 7 === 0 ? 0 : 3 + (h % (tour.maxGroup - 2));
}

function Booking({ tourId, setTourId }: { tourId: string; setTourId: (id: string) => void }) {
  const tr = useL();
  const { lang } = useLang();
  const b = d.booking;
  const tour = d.items.find((t) => t.id === tourId)!;

  // The next 10 days in Rome, worked out in the browser so it's always current.
  const [dates, setDates] = useState<string[]>([]);
  useEffect(() => {
    const start = new Date(`${romeToday()}T12:00:00Z`);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDates(Array.from({ length: 10 }, (_, i) => new Date(start.getTime() + (i + 1) * 864e5).toISOString().slice(0, 10)));
  }, []);

  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [done, setDone] = useState<string | null>(null);

  // Pick the first date and time with places whenever the tour or dates change.
  useEffect(() => {
    const first = dates.find((dt) => tour.times.some((tm) => placesLeft(tour, dt, tm) > 0)) ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDate(first);
    setTime(first ? (tour.times.find((tm) => placesLeft(tour, first, tm) > 0) ?? null) : null);
  }, [tour, dates]);

  const left = date && time ? placesLeft(tour, date, time) : 0;
  const guests = adults + children;
  const total = adults * tour.price + children * tour.childPrice;
  const tooMany = guests > left;

  const dayLabel = useMemo(() => {
    const locale = lang === "it" ? "it-IT" : "en-GB";
    const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat(locale, { ...o, timeZone: "UTC" });
    const wk = fmt({ weekday: "short" });
    const day = fmt({ day: "numeric" });
    const full = fmt({ weekday: "long", day: "numeric", month: "long" });
    return (iso: string) => {
      const dt = new Date(`${iso}T12:00:00Z`);
      return { wk: wk.format(dt), day: day.format(dt), full: full.format(dt) };
    };
  }, [lang]);

  const pickDate = (dt: string) => {
    setDate(dt);
    setTime(tour.times.find((tm) => placesLeft(tour, dt, tm) > 0) ?? null);
  };

  const chip = (active: boolean, disabled = false) =>
    `flex min-h-12 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 px-3 py-2 text-sm font-bold transition-colors peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#E3B04B] ${
      disabled ? "cursor-not-allowed border-white/10 text-white/60 line-through" : active ? "border-[#E3B04B] bg-[#E3B04B] text-[#2B211C]" : "border-white/25 hover:border-white"
    }`;

  if (done) {
    return (
      <div className="mx-auto max-w-xl text-center" role="status">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-[#E3B04B] text-[#2B211C]">
          <Check aria-hidden className="size-7" strokeWidth={3} />
        </span>
        <h2 className={`${display} mt-6 text-5xl`}>{tr(b.doneTitle)}</h2>
        <p className="mt-4 text-lg text-white/85">{fill(tr(b.doneBody), { ref: done })}</p>
        <p className="mt-2 text-white/85">
          {tr(tour.name)} · {date && dayLabel(date).full} · {time} · {formatEuro(total, lang)}
        </p>
        <button type="button" onClick={() => setDone(null)} className="mt-8 inline-flex min-h-12 cursor-pointer items-center rounded-full border-2 border-white px-6 font-bold">
          {tr(b.again)}
        </button>
        <p className="mt-4 text-sm text-white/70">{tr(b.demoNote)}</p>
      </div>
    );
  }

  return (
    <form
      className="grid gap-10 lg:grid-cols-12"
      onSubmit={(e) => {
        e.preventDefault();
        if (!date || !time || tooMany) return;
        setDone(`SC-${(hash(`${tour.id}${date}${time}${guests}`) % 90000) + 10000}`);
      }}
    >
      <div className="space-y-8 lg:col-span-7">
        <h2 className={`${display} text-5xl`}>{tr(b.title)}</h2>

        <div>
          <label htmlFor="sc-tour" className="block font-bold">
            {tr(b.tour)}
          </label>
          <select id="sc-tour" value={tourId} onChange={(e) => setTourId(e.target.value)} className="mt-2 min-h-12 w-full rounded-2xl border-2 border-white/25 bg-[#2B211C] px-4 font-semibold sm:text-lg">
            {d.items.map((t) => (
              <option key={t.id} value={t.id}>
                {tr(t.name)} · {formatEuro(t.price, lang)}
              </option>
            ))}
          </select>
        </div>

        <fieldset>
          <legend className="font-bold">{tr(b.date)}</legend>
          <div className="mt-2 grid grid-cols-5 gap-2 sm:grid-cols-10 lg:grid-cols-5">
            {dates.map((dt) => {
              const full = tour.times.every((tm) => placesLeft(tour, dt, tm) === 0);
              const { wk, day, full: fullDate } = dayLabel(dt);
              return (
                <label key={dt}>
                  <input type="radio" name="sc-date" value={dt} checked={date === dt} disabled={full} onChange={() => pickDate(dt)} className="peer sr-only" />
                  <span className={chip(date === dt, full)}>
                    <span aria-hidden className="text-xs font-semibold uppercase opacity-80">{wk}</span>
                    <span aria-hidden className="text-lg leading-tight">{day}</span>
                    <span className="sr-only">
                      {fullDate}
                      {full && ` (${tr(b.soldOut)})`}
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <fieldset>
          <legend className="font-bold">{tr(b.time)}</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {tour.times.map((tm) => {
              const n = date ? placesLeft(tour, date, tm) : 0;
              return (
                <label key={tm} className="min-w-32">
                  <input type="radio" name="sc-time" value={tm} checked={time === tm} disabled={n === 0} onChange={() => setTime(tm)} className="peer sr-only" />
                  <span className={chip(time === tm, n === 0)}>
                    <span className="text-lg">{tm}</span>
                    <span className="text-xs font-semibold opacity-80">{n === 0 ? tr(b.soldOut) : fill(tr(b.left), { n })}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <Stepper label={tr(b.adults)} sub={formatEuro(tour.price, lang)} value={adults} min={1} max={12} set={setAdults} fewer={tr(b.fewer)} more={tr(b.more)} />
          <Stepper label={tr(b.children)} sub={formatEuro(tour.childPrice, lang)} value={children} min={0} max={10} set={setChildren} fewer={tr(b.fewer)} more={tr(b.more)} />
        </div>
      </div>

      <aside className="lg:col-span-5">
        <div className="overflow-hidden rounded-3xl bg-[#F4EDE2] text-[#2B211C] lg:sticky lg:top-24">
          <div className="relative aspect-[16/9]">
            <Photo src={tour.image.src} alt="" sizes="(min-width: 1024px) 35vw, 90vw" />
          </div>
          <div className="p-6">
            <p className={`${display} text-3xl leading-tight`}>{tr(tour.name)}</p>
            <p className="mt-2 flex items-start gap-2 text-sm">
              <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-[#B4472A]" />
              <span>
                {tr(b.meet)}: {tour.meetingPoint}
              </span>
            </p>
            <dl className="mt-5 space-y-1 border-t border-[#2B211C]/15 pt-4 text-[15px]">
              <div className="flex justify-between">
                <dt>
                  {tr(b.adults)} × {adults}
                </dt>
                <dd>{formatEuro(adults * tour.price, lang)}</dd>
              </div>
              {children > 0 && (
                <div className="flex justify-between">
                  <dt>
                    {tr(b.children)} × {children}
                  </dt>
                  <dd>{formatEuro(children * tour.childPrice, lang)}</dd>
                </div>
              )}
              <div className="flex justify-between pt-2 text-xl font-extrabold">
                <dt>{tr(b.total)}</dt>
                <dd aria-live="polite">{formatEuro(total, lang)}</dd>
              </div>
            </dl>
            {tooMany && date && time && (
              <p className="mt-3 rounded-xl bg-[#B4472A]/10 px-3 py-2 text-sm font-semibold text-[#8a3219]" role="alert">
                {fill(tr(b.tooMany), { n: left })}
              </p>
            )}
            <button type="submit" disabled={!date || !time || tooMany} className="mt-5 inline-flex min-h-13 w-full cursor-pointer items-center justify-center rounded-full bg-[#B4472A] px-6 text-lg font-bold text-white hover:bg-[#9a3c23] disabled:cursor-not-allowed disabled:opacity-50">
              {tr(b.reserve)}
            </button>
            <p className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold">
              <Check aria-hidden className="size-4 text-[#B4472A]" strokeWidth={3} />
              {tr(b.cancel)}
            </p>
            <p className="mt-1 text-center text-xs text-[#2B211C]/75">{tr(b.demoNote)}</p>
          </div>
        </div>
      </aside>
    </form>
  );
}

function Stepper({ label, sub, value, min, max, set, fewer, more }: { label: string; sub: string; value: number; min: number; max: number; set: (n: number) => void; fewer: string; more: string }) {
  const btn = "flex size-11 cursor-pointer items-center justify-center rounded-full border-2 border-white/30 hover:border-white disabled:cursor-not-allowed disabled:opacity-40";
  return (
    <div role="group" aria-label={label} className="flex items-center justify-between gap-3 rounded-2xl border-2 border-white/15 p-3 pl-4">
      <p>
        <span className="block font-bold">{label}</span>
        <span className="text-sm text-white/75">{sub}</span>
      </p>
      <div className="flex items-center gap-3">
        <button type="button" className={btn} onClick={() => set(Math.max(min, value - 1))} disabled={value <= min} aria-label={`${fewer}: ${label}`}>
          <Minus aria-hidden className="size-4" />
        </button>
        <output className="w-6 text-center text-xl font-extrabold tabular-nums" aria-live="polite">
          {value}
        </output>
        <button type="button" className={btn} onClick={() => set(Math.min(max, value + 1))} disabled={value >= max} aria-label={`${more}: ${label}`}>
          <Plus aria-hidden className="size-4" />
        </button>
      </div>
    </div>
  );
}
