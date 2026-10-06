/** Long-form text pages (legal, help). */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
      <div className="max-w-[68ch] text-[1.05rem] leading-relaxed [&_a]:underline [&_a]:decoration-[1.5px] [&_a]:underline-offset-[3px] [&_a:hover]:text-explorer [&_h2]:display [&_h2]:mt-12 [&_h2]:mb-3 [&_h2]:text-4xl [&_li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-6">
        {children}
      </div>
    </div>
  );
}
