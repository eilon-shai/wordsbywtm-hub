import Link from 'next/link';
import type { Metadata } from 'next';
import { PrintButton } from './PrintButton';

// ---------------------------------------------------------------------------
// /partners/card — print-optimized hand-to-family card.
//
// A partner (funeral home, hospice bereavement coordinator, celebrant) prints
// this page and physically hands it to a family at the arrangement meeting.
// Renders 2 identical card panels per sheet, cut in half along the dashed
// line. Reads ?code=<partner-slug> and bakes it into the printed link as
// wordsbywtm.com/memorial?ref=<code>; falls back to the plain /memorial link
// when the code is absent or invalid. Cards are always black-on-white (they
// are a print preview), with solid borders as cutting guides. The on-screen
// explainer and site chrome are hidden in print via Tailwind print: variants.
//
// Tone rule for the card itself: warm, plain, zero sales pressure, no
// urgency, no price — it lands in a grief context.
//
// noindex: this page is operational partner tooling, not marketing surface.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Printable Family Card — Words That Matter Partners',
  description:
    'Print-ready card for partners to hand to families: one link where everyone can add memories of a loved one, free.',
  robots: { index: false },
};

// Partner slug: lowercase alphanumeric + hyphens, 3–40 chars, no leading or
// trailing hyphen. Anything else falls back to the code-less link.
const CODE_RE = /^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/;

function CardPanel({ link }: { link: string }) {
  return (
    <div className="flex flex-col items-center border border-neutral-400 bg-white px-8 py-10 text-center text-neutral-900 print:border-black">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
        Words That Matter
      </p>
      <h2 className="mt-4 max-w-md font-serif text-2xl leading-snug">
        Gather everyone&rsquo;s memories of your loved one — in one place, free
      </h2>
      <ol className="mt-5 space-y-1.5 text-sm leading-relaxed">
        <li>1. Open the link below and start a collection. It&rsquo;s free.</li>
        <li>2. Share your link — everyone adds a memory. No accounts needed.</li>
        <li>3. Keep the memories, or have them woven into one written tribute.</li>
      </ol>
      <p className="mt-6 border-y border-neutral-300 py-3 font-mono text-lg font-semibold tracking-tight print:border-neutral-400">
        {link}
      </p>
      <p className="mt-4 text-xs text-neutral-500">
        Take your time. The memories will be there when you&rsquo;re ready.
      </p>
    </div>
  );
}

export default async function PartnerCardPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const validCode = code && CODE_RE.test(code) ? code : null;
  const link = validCode
    ? `wordsbywtm.com/memorial?ref=${validCode}`
    : 'wordsbywtm.com/memorial';

  return (
    <div className="min-h-screen bg-background print:bg-white">
      {/* On-screen explainer for the partner — hidden when printing */}
      <div className="border-b border-border bg-card px-4 py-10 text-center print:hidden">
        <div className="mx-auto max-w-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-primary">
            Partner tools
          </p>
          <h1 className="font-serif text-3xl text-foreground">Hand-to-family card</h1>
          <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
            This page prints two identical cards on one sheet — cut along the dashed line and keep a
            stack at the arrangement desk. The printed link{' '}
            {validCode ? (
              <>
                includes your partner code (<span className="font-mono text-foreground">{validCode}</span>).
              </>
            ) : (
              <>
                is the general one. If you have a partner code, add{' '}
                <span className="font-mono text-foreground">?code=your-code</span> to this page&rsquo;s
                address to bake it into the cards.
              </>
            )}
          </p>
          <div className="mt-6">
            <PrintButton />
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Best on plain paper or light card stock, black and white is fine.{' '}
            <Link href="/partners" className="underline underline-offset-4 transition-colors hover:text-foreground">
              About the partner program
            </Link>
          </p>
        </div>
      </div>

      {/* The printable sheet: two identical panels, dashed cut line between */}
      <div className="mx-auto flex max-w-2xl flex-col gap-0 px-6 py-10 print:max-w-none print:px-0 print:py-0">
        <CardPanel link={link} />
        <div
          aria-hidden
          className="my-4 border-t border-dashed border-neutral-400 print:my-6 print:border-neutral-500"
        />
        <CardPanel link={link} />
      </div>
    </div>
  );
}
