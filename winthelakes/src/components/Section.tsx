/** Plain page opener for inner pages. */
export function PageHero({ title, intro }: { title: string; intro?: React.ReactNode }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pt-12 sm:px-6 sm:pt-16">
      <h1 className="display text-6xl sm:text-8xl">{title}</h1>
      {intro && <div className="mt-4 max-w-[60ch] text-lg text-ink-2">{intro}</div>}
    </section>
  );
}
