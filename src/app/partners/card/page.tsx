import Link from 'next/link';
import type { Metadata } from 'next';
import { PrintButton } from './PrintButton';
import { REF_SLUG_RE } from '@/lib/ref';
import { getPartner } from '@/lib/partners-store';
import { CARD_STEP1, cardCopyFor, pickCardOccasion, type CardCopy } from '@/lib/partner-card';

// ---------------------------------------------------------------------------
// /partners/card — print-optimized hand-to-family card.
//
// A partner (funeral home, hospice bereavement coordinator, celebrant, wedding
// planner, officiant, DJ/MC, venue) prints this page and physically hands it to
// a family / couple / organizer. Renders 2 identical card panels per sheet, cut
// in half along the dashed line.
//
// Occasion-aware: reads ?code=<partner-token>, looks the partner up, and sets
// the card up for the partner's scoped occasion — copy AND the baked link
// (wordsbywtm.com/<occasion>?ref=<code>). This matters for correctness, not just
// tone: the create-time discount gate is occasion-scoped, so a wedding partner's
// link MUST land on /wedding or the token is rejected (no endorsement, no
// courtesy). Unknown / absent / inactive codes fall back to the memorial card
// and the plain /memorial link, so every card printed before this change keeps
// working.
//
// Tone rule for the card itself: warm, plain, zero sales pressure, no urgency,
// no price. Per-occasion copy lives in src/lib/partner-card.ts.
//
// noindex: this page is operational partner tooling, not marketing surface.
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  title: 'Printable Family Card — Words That Matter Partners',
  description:
    'Print-ready card for partners to hand to families: one link where everyone can add memories, free.',
  robots: { index: false },
};

function CardPanel({ link, copy }: { link: string; copy: CardCopy }) {
  return (
    <div className="flex flex-col items-center border border-neutral-400 bg-white px-8 py-10 text-center text-neutral-900 print:border-black">
      <p className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
        Words That Matter
      </p>
      <h2 className="mt-4 max-w-md font-serif text-2xl leading-snug">{copy.headline}</h2>
      <ol className="mt-5 space-y-1.5 text-sm leading-relaxed">
        <li>1. {CARD_STEP1}</li>
        <li>2. {copy.step2}</li>
        <li>3. {copy.step3}</li>
      </ol>
      <a
        href={`https://${link}`}
        className="mt-6 block break-all border-y border-neutral-300 py-3 font-mono text-lg font-semibold tracking-tight text-neutral-900 underline-offset-4 hover:underline print:border-neutral-400 print:no-underline"
      >
        {link}
      </a>
      <p className="mt-4 text-xs text-neutral-500">{copy.reassurance}</p>
    </div>
  );
}

export default async function PartnerCardPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  // Partner token: lowercase alphanumeric + hyphens, 3–40 chars, no edge hyphen
  // (shared REF_SLUG_RE). Anything else falls back to the code-less link.
  const validCode = code && REF_SLUG_RE.test(code) ? code : null;

  // Resolve the partner's occasion so the card copy + baked link match their
  // scope. getPartner is fail-closed (invalid token / missing DB / query error
  // all return null), and pickCardOccasion maps null → memorial, so this never
  // throws into the render and always degrades to the memorial card.
  const partner = validCode ? await getPartner(validCode) : null;
  const occasion = pickCardOccasion(partner?.occasions);
  const copy = cardCopyFor(occasion);

  const path = `wordsbywtm.com/${occasion}`;
  const link = validCode ? `${path}?ref=${validCode}` : path;

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
            stack on hand. The printed link{' '}
            {validCode ? (
              <>
                includes your partner code (<span className="font-mono text-foreground">{validCode}</span>){' '}
                and is set up for <span className="text-foreground">{copy.title}</span> collections.
              </>
            ) : (
              <>
                is the general one. If you have a partner code, add{' '}
                <span className="font-mono text-foreground">?code=your-code</span> to this page&rsquo;s
                address to bake it in and match your occasion.
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
        <CardPanel link={link} copy={copy} />
        <div
          aria-hidden
          className="my-4 border-t border-dashed border-neutral-400 print:my-6 print:border-neutral-500"
        />
        <CardPanel link={link} copy={copy} />
      </div>
    </div>
  );
}
