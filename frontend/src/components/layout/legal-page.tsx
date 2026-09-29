/** Simple prose layout for About / Privacy / Terms. */
export function LegalPage({ title, updated, children }: { title: string; updated?: string; children: React.ReactNode }) {
  return (
    <article className="container-page max-w-3xl py-10">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {updated && <p className="mt-1 text-sm text-muted-foreground">Last updated {updated}</p>}
      <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground [&_h2]:pt-4 [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-foreground [&_li]:ml-5 [&_li]:list-disc">
        {children}
      </div>
    </article>
  );
}
