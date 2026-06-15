import Link from 'next/link';

// Chrome (nav + page frame) for the bespoke, attorney-adapted legal pages.
// The legal PROSE inside `children` is verbatim attorney content (hard rule #10);
// only this wrapper styling is owned by the app. Uses the TributeWords token
// system (globals.css) so it matches the rest of the collection app.
export default function LegalChrome({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="border-b border-border bg-card">
        <div className="mx-auto max-w-3xl flex items-center justify-between px-6 py-4">
          <Link
            href="/"
            className="font-serif text-xl text-foreground hover:opacity-80 transition-opacity"
          >
            Words That Matter
          </Link>
          <Link
            href="/"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Home
          </Link>
        </div>
      </nav>
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 pt-12 pb-16">
        <h1 className="font-serif text-3xl text-foreground mb-1">{title}</h1>
        <p className="text-sm text-muted-foreground mb-10">Last updated: {updated}</p>
        {children}
      </main>
    </div>
  );
}
