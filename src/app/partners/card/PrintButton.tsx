'use client';

// Print trigger for the partner hand-to-family card. Client-only because it
// calls window.print(); everything else on /partners/card stays server-rendered.
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-full bg-primary px-8 py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
    >
      Print this page
    </button>
  );
}
