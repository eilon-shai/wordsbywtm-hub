import type { OccasionMeta } from '@/lib/registry';

// ---------------------------------------------------------------------------
// ProductShowcase — the "what you'll see" section (SES-055 UX panel, unanimous
// #1 finding: the product interface was never shown anywhere, so the offer
// stayed abstract). Rendered mid-flow via venture-core's LandingPage `showcase`
// slot (right after How It Works).
//
// These are in-system mockups, NOT screenshots (no screenshot assets exist) —
// on-brand stationery frames of the three real screens: what a contributor
// sees, the organizer dashboard filling up, and the finished piece with its
// keepsake PDF + spoken audio. Occasion-aware via the registry meta; a static
// server component (no client JS).
// ---------------------------------------------------------------------------

interface ShowcaseCopy {
  /** First contributor's name + memory, shown in the "add a memory" mockup. */
  contributor: { name: string; memory: string };
  /** The honoree label shown atop the organizer dashboard mockup. */
  honoree: string;
  /** A few arrived memories for the dashboard mockup. */
  arrivals: Array<{ name: string; text: string }>;
  /** A short excerpt of the finished woven piece. */
  excerpt: string;
}

const SHOWCASE_COPY: Record<string, ShowcaseCopy> = {
  memorial: {
    contributor: {
      name: 'Sarah',
      memory: 'She kept a recipe box that was never really about recipes — birthdays and the names of people’s dogs tucked between the cards.',
    },
    honoree: 'Eleanor',
    arrivals: [
      { name: 'Marcus', text: 'She put down whatever she was holding the moment you walked in.' },
      { name: 'Claire', text: 'Signed every card with a line of her own.' },
      { name: 'David', text: 'Off-key humming in the garden, every summer.' },
    ],
    excerpt: 'Ask anyone who knew Eleanor and the same word surfaces first: present. Some remember the recipe box; others, the unasked questions she always thought to ask…',
  },
  wedding: {
    contributor: {
      name: 'Dana',
      memory: 'The world’s worst karaoke duet — and neither of them stopped talking for the rest of the night.',
    },
    honoree: 'Sam & Alex',
    arrivals: [
      { name: 'Priya', text: 'They make each other braver.' },
      { name: 'Dana', text: 'Alex is the reason Sam finally booked that one-way ticket.' },
      { name: 'Tom', text: 'A spilled coffee and a borrowed napkin.' },
    ],
    excerpt: 'Ask anyone here — and we asked a lot of you — and the same thing comes up about Sam and Alex: they make each other braver…',
  },
  retirement: {
    contributor: {
      name: 'Miguel',
      memory: 'On my first day he left a note on my monitor: “Ask me anything, even twice.” I asked a lot.',
    },
    honoree: 'Ray',
    arrivals: [
      { name: 'Rebecca', text: 'Ran the Friday stand-up like a talk-show host.' },
      { name: 'Miguel', text: 'Never took the credit; always gave it.' },
      { name: 'Ann', text: 'Thirty years and never once out of coffee.' },
    ],
    excerpt: 'Ask three departments who kept the place running and you get three different answers and the same name…',
  },
  anniversary: {
    contributor: {
      name: 'Leah',
      memory: 'Fifty years and he still opens the car door. She still pretends not to notice.',
    },
    honoree: 'Rosa & Jim',
    arrivals: [
      { name: 'Leah', text: 'Sunday calls to three time zones, every week.' },
      { name: 'David', text: 'They argue about the map, never about anything that matters.' },
      { name: 'Nina', text: 'Two chairs pulled a little closer than the rest.' },
    ],
    excerpt: 'A long marriage touches everyone around it. Ask the family and the same picture forms: two people, a little closer than the rest…',
  },
};

/** A stationery "screen" frame — a card with a faux top bar so it reads as a
 *  view of the product without pretending to be a real browser chrome. */
function ScreenFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="pointer-events-none select-none overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
      <div className="flex items-center gap-1.5 border-b border-border bg-secondary/40 px-4 py-2.5" aria-hidden>
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
        <span className="h-2 w-2 rounded-full bg-border" />
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function StepCaption({ n, children }: { n: string; children: React.ReactNode }) {
  return (
    <p className="mt-4 text-center text-sm text-muted-foreground">
      <span className="font-semibold text-foreground">{n}.</span> {children}
    </p>
  );
}

export function ProductShowcase({ meta }: { meta: OccasionMeta }) {
  const noun = meta.deliverableNoun; // "tribute" | "toast" | "send-off"
  const copy = SHOWCASE_COPY[meta.slug] ?? SHOWCASE_COPY.memorial!;

  return (
    <section id="showcase" className="border-y border-border bg-background px-4 py-20">
      <div className="mx-auto max-w-5xl">
        <p className="mb-4 text-center text-xs font-semibold uppercase tracking-widest text-primary">
          What you’ll see
        </p>
        <h2 className="mb-3 text-center font-serif text-3xl text-foreground md:text-4xl">
          From one shared link to one {noun}
        </h2>
        <p className="mx-auto mb-14 max-w-xl text-center text-sm leading-relaxed text-muted-foreground">
          No account, no software to learn. Here’s the whole thing — what the people you invite
          see, what you see as memories arrive, and the finished {noun} you’ll {' '}
          {meta.readAloudContext ? `read ${meta.readAloudContext}` : 'read aloud'}.
        </p>

        <div className="grid gap-8 md:grid-cols-3">
          {/* 1 — What a contributor sees */}
          <div>
            <ScreenFrame>
              <p className="mb-3 font-serif text-lg text-foreground">Add a memory</p>
              <div className="mb-3">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Your name
                </span>
                <div className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground">
                  {copy.contributor.name}
                </div>
              </div>
              <div className="mb-4">
                <span className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  A memory of {copy.honoree}
                </span>
                <div className="min-h-[5.5rem] rounded-lg border border-border bg-background px-3 py-2 text-sm leading-relaxed text-foreground">
                  {copy.contributor.memory}
                </div>
              </div>
              <div className="flex justify-center">
                <span className="rounded-full border border-primary px-5 py-1.5 text-sm font-semibold text-primary">
                  Share this memory
                </span>
              </div>
            </ScreenFrame>
            <StepCaption n="1">No account, no payment — about two minutes.</StepCaption>
          </div>

          {/* 2 — What the organizer sees as it fills up */}
          <div>
            <ScreenFrame>
              <div className="mb-3 flex items-baseline justify-between">
                <p className="font-serif text-lg text-foreground">For {copy.honoree}</p>
                <span className="text-xs font-medium text-muted-foreground">
                  {copy.arrivals.length} memories
                </span>
              </div>
              <ul className="mb-4 flex flex-col gap-2.5">
                {copy.arrivals.map((a) => (
                  <li key={a.name} className="rounded-lg border border-border bg-background px-3 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-foreground">{a.name}</span>
                      <span className="text-[11px] font-medium text-primary" aria-hidden>
                        ✓ included
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{a.text}</p>
                  </li>
                ))}
              </ul>
              <div className="flex justify-center">
                <span className="rounded-full border border-primary px-5 py-1.5 text-sm font-semibold text-primary">
                  Weave into one {noun}
                </span>
              </div>
            </ScreenFrame>
            <StepCaption n="2">Read every memory as it arrives. Leave out anything that doesn’t belong.</StepCaption>
          </div>

          {/* 3 — The finished piece */}
          <div>
            <ScreenFrame>
              <p className="mb-3 font-serif text-lg text-foreground">Your {noun}</p>
              <div className="mb-4 rounded-lg border border-border bg-background p-4">
                <span className="mb-1 block font-serif text-4xl leading-none text-border select-none" aria-hidden>
                  &ldquo;
                </span>
                <p className="text-sm italic leading-relaxed text-foreground">{copy.excerpt}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary">
                  <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.6">
                    <path d="M8 2v8m0 0 3-3m-3 3L5 7M3 12.5h10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Keepsake PDF
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary">
                  <svg aria-hidden viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="currentColor">
                    <path d="M5 3.5v9l7-4.5z" />
                  </svg>
                  Play audio
                </span>
              </div>
            </ScreenFrame>
            <StepCaption n="3">
              Yours to {meta.readAloudContext ? `read ${meta.readAloudContext}` : 'read aloud'}, print, and play aloud.
            </StepCaption>
          </div>
        </div>
      </div>
    </section>
  );
}
