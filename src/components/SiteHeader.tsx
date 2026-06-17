// Slim, on-brand site header. Server-safe (no client hooks) — just a wordmark
// that links home, so the result/manage pages have a way back to the main site.
export function SiteHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-5xl items-center px-4 py-4">
        <a
          href="/"
          className="font-serif text-lg text-foreground/80 transition-colors hover:text-foreground"
        >
          Words That Matter
        </a>
      </div>
    </header>
  );
}
