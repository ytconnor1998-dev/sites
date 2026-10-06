export function SectionHeading({ eyebrow, title, children, id }: { eyebrow: string; title: React.ReactNode; children?: React.ReactNode; id?: string }) {
  return (
    <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
      <div>
        <p className="eyebrow text-lake">{eyebrow}</p>
        <h2 id={id} className="display mt-2 text-4xl sm:text-5xl">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

export function PageHero({ eyebrow, title, intro }: { eyebrow: string; title: string; intro?: React.ReactNode }) {
  return (
    <section className="water border-b border-line">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="eyebrow text-lake">{eyebrow}</p>
        <h1 className="display mt-3 text-5xl sm:text-7xl">{title}</h1>
        {intro && <div className="mt-5 max-w-2xl text-lg text-fog">{intro}</div>}
      </div>
    </section>
  );
}
