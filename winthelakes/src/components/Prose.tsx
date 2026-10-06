/** Long-form text pages (legal, help). */
export function Prose({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 pt-12 sm:px-6 [&_a]:text-lake [&_a]:underline [&_a]:underline-offset-2 [&_h2]:display [&_h2]:mt-12 [&_h2]:mb-4 [&_h2]:text-3xl [&_li]:mt-2 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mt-4 [&_p]:leading-relaxed [&_p]:text-fog [&_strong]:text-mist [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-fog [&_ol]:text-fog">
      {children}
    </div>
  );
}
