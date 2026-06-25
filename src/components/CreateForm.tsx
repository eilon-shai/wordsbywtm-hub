'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
} from '@eilon-shai/venture-core/ui';
import type { FormFieldConfig } from '@eilon-shai/venture-core/types';
import type { OccasionIntake } from '@/lib/intake';
import { getOccasionMeta } from '@/lib/registry';
import { trackLead } from '@/lib/analytics';
import { InviteScreen } from './InviteScreen';
import {
  SectionCard,
  FieldRow,
  Spinner,
} from '@/components/forked/FormPrimitives';

interface CreateFormProps {
  occasion: string;
  /** Display label for the honoree question, e.g. "the person we are honoring". */
  honoreeLabel: string;
  /** Anchored finalize price (number), shown as reassurance. */
  priceShown: number;
  /** Tier preselected from ?tier= (defaults to 'full'). */
  tier: string;
  /** Occasion display title, e.g. "Memorial". */
  occasionTitle: string;
  /** Contributor field defs — unused now the organizer's memory is deferred to the
   *  dashboard, but kept on the props so /start needs no change. */
  contributorFields: FormFieldConfig[];
  /** Per-occasion intake copy + relationship taxonomy. */
  intake: OccasionIntake;
}

interface CreateSuccess {
  shareUrl: string;
  adminUrl: string;
  priceShown: number;
  honoreeName: string;
}

type Phase = 'form' | 'submitting' | 'invite' | 'existing';

const ORGANIZER_EMAIL_FIELD: FormFieldConfig = {
  name: 'organizerEmail',
  type: 'text',
  label: 'Your email',
  placeholder: 'you@example.com',
  required: true,
  maxLength: 254,
};

const DEADLINE_FIELD: FormFieldConfig = {
  name: 'deadline',
  type: 'date',
  label: 'Close the collection on (optional)',
  required: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

// Date helpers for the deadline bounds (client-side).
function addDays(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}
// Local-day ISO (yyyy-mm-dd) — NOT toISOString(), which is UTC and would make the
// server (UTC) and client (local TZ) disagree on "today", causing a hydration
// mismatch on the deadline field.
function isoDay(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// ---------------------------------------------------------------------------
// CreateForm — the minimal "start a collection" step.
//
// Lightened deliberately: creating a collection asks ONLY for the three things
// we truly need — the organizer's email (their key back in), their name, and
// who's being honored. The organizer's own first memory is NOT collected here;
// it's deferred to the manage dashboard ("Add your own memory"), exactly as the
// product promises ("free, under a minute · you invite people and they show
// up"). Every other field (relationship, qualities, tone/avoid prefs, consent)
// belongs to writing a memory or to finalizing — none of it gates create.
// ---------------------------------------------------------------------------
export function CreateForm({ occasion, honoreeLabel, priceShown, tier, occasionTitle, contributorFields, intake }: CreateFormProps) {
  void contributorFields; // organizer memory now lives on the dashboard, not here

  // Occasion-specific deliverable noun (defaults to memorial wording if unknown).
  const noun = getOccasionMeta(occasion)?.deliverableNoun ?? 'tribute';

  const HONOREE_FIELD: FormFieldConfig = {
    name: 'honoreeName',
    type: 'text',
    label: intake.honoreeLabel,
    placeholder: intake.honoreePlaceholder,
    required: true,
    maxLength: 120,
  };
  const CONTRIBUTOR_NAME_FIELD: FormFieldConfig = {
    name: 'contributorName',
    type: 'text',
    label: 'Your name',
    placeholder: 'e.g. Sarah',
    required: true,
    maxLength: 100,
  };

  const [phase, setPhase] = React.useState<Phase>('form');

  const [contributorName, setContributorName] = React.useState('');
  const [honoreeName, setHonoreeName] = React.useState('');
  const [organizerEmail, setOrganizerEmail] = React.useState('');

  // Deadline defaults to (and maxes out at) one month — optional; the organizer
  // can always finalize early. Computed client-only (in the effect below) so the
  // server's UTC "today" never disagrees with the client's local "today".
  const [deadline, setDeadline] = React.useState('');
  const [deadlineMin, setDeadlineMin] = React.useState('');
  const [deadlineMax, setDeadlineMax] = React.useState('');
  React.useEffect(() => {
    setDeadlineMin(isoDay(addDays(0)));
    setDeadlineMax(isoDay(addDays(30)));
    setDeadline((cur) => (cur ? cur : isoDay(addDays(30))));
  }, []);
  const DEADLINE_MIN = deadlineMin;
  const DEADLINE_MAX = deadlineMax;
  const [dupChecking, setDupChecking] = React.useState(false);

  const [fieldError, setFieldError] = React.useState<Record<string, string | undefined>>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CreateSuccess | null>(null);

  // Idempotency key for the create POST — held across retries.
  const idempotencyKeyRef = React.useRef<string>('');
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const price = `$${priceShown}`;

  const refs = {
    organizerEmail: React.useRef<HTMLDivElement | null>(null),
    contributorName: React.useRef<HTMLDivElement | null>(null),
    honoreeName: React.useRef<HTMLDivElement | null>(null),
  };

  // Required fields for create — the three we actually need.
  function validateRequired(): Record<string, string | undefined> {
    const errs: Record<string, string | undefined> = {};
    const email = organizerEmail.trim();
    if (!email) {
      errs.organizerEmail = 'Please enter your email address.';
    } else if (!EMAIL_RE.test(email)) {
      errs.organizerEmail = 'That doesn’t look like a valid email — please check it.';
    }
    if (!contributorName.trim()) errs.contributorName = 'Please add your name.';
    if (!honoreeName.trim()) errs.honoreeName = 'Please add a name.';
    return errs;
  }

  const FIELD_ORDER: Array<keyof typeof refs> = ['organizerEmail', 'contributorName', 'honoreeName'];

  function clearError(name: string) {
    setFieldError((p) => (p[name] ? { ...p, [name]: undefined } : p));
  }

  // Early dedup: when the email is filled, check if an open collection already
  // exists for this occasion — so the organizer isn't told only AFTER submitting.
  async function checkExisting() {
    const email = organizerEmail.trim();
    if (!EMAIL_RE.test(email)) return;
    if (phase !== 'form') return;
    setDupChecking(true);
    try {
      const res = await fetch('/api/collection/check-existing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, occasion }),
      });
      const d = await res.json().catch(() => ({}));
      if (d.exists && phase === 'form') setPhase('existing');
    } catch {
      /* non-fatal — the create POST still dedups server-side */
    } finally {
      setDupChecking(false);
    }
  }

  // POST — create the collection. Returns the created collection, 'existing'
  // on dedup, or null on failure (formError already set).
  async function postCreate(): Promise<CreateSuccess | 'existing' | null> {
    try {
      const res = await fetch(`/api/${occasion}/collection/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          honoreeName: honoreeName.trim(),
          organizerEmail: organizerEmail.trim(),
          // The organizer's display name, persisted so invited contributors see
          // "{name} is gathering memories…" instead of "Someone".
          organizerName: contributorName.trim(),
          occasion,
          tier,
          ...(deadline ? { deadline } : {}),
          synthesisPrefs: {},
        }),
      });

      if (!res.ok) {
        let code = 'UNKNOWN';
        try {
          const data = await res.json();
          code = data?.code ?? 'UNKNOWN';
        } catch {
          /* ignore parse error */
        }
        if (res.status === 429 || code === 'RATE_LIMIT') {
          setFormError('Too many attempts just now. Give it a moment and try again.');
        } else if (res.status === 503) {
          setFormError('Our service is briefly unavailable — your details are safe. Please try again in a moment.');
        } else if (code === 'INVALID_SESSION') {
          setFormError('Something in the form looked off. Please check your name and email and try again.');
        } else {
          setFormError('We couldn’t create your collection. Please try again.');
        }
        return null;
      }

      const data = (await res.json()) as Partial<CreateSuccess> & { existing?: boolean };
      if (data.existing) return 'existing';
      return data as CreateSuccess;
    } catch {
      setFormError('We couldn’t reach the server — your details are safe. Please try again.');
      return null;
    }
  }

  async function runSubmit() {
    setFormError(null);

    const errs = validateRequired();
    if (Object.keys(errs).length > 0) {
      setFieldError(errs);
      const first = FIELD_ORDER.find((name) => errs[name]);
      if (first) refs[first].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setFieldError({});

    setPhase('submitting');

    const createResult = await postCreate();
    if (createResult === null) {
      setPhase('form');
      return;
    }
    if (createResult === 'existing') {
      setPhase('existing');
      return;
    }
    setResult(createResult);
    // Mid-funnel lead event — fire once, on a genuinely new create.
    trackLead({ occasion });

    // Go straight to the manage dashboard (invite link, review, finalize, and the
    // "add your own memory" card). Relative path stays on this origin; ?new=1 so
    // the dashboard leads with "invite people" + the emailed-link reassurance.
    const adminTok = (() => {
      try {
        return new URL(createResult.adminUrl).searchParams.get('t') ?? '';
      } catch {
        return '';
      }
    })();
    if (adminTok) {
      window.location.href = `/collect/manage?t=${encodeURIComponent(adminTok)}&new=1`;
      return;
    }
    setPhase('invite'); // fallback if the token couldn't be parsed
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSubmit();
  }

  // ---- existing dedup card -------------------------------------------------
  if (phase === 'existing') {
    return (
      <Card className="mx-auto w-full max-w-xl">
        <CardHeader>
          <CardTitle className="font-serif text-2xl">You already have a collection for this</CardTitle>
          <CardDescription>
            There’s already an open {occasionTitle.toLowerCase()} collection under{' '}
            <span className="font-medium text-foreground">{organizerEmail.trim()}</span>.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            To keep things simple we keep one open {occasionTitle.toLowerCase()} collection per person. We’ve
            re-sent your private manage link to that email — open it to keep adding memories and finalize when
            you’re ready.
          </p>
          <ResendLinkButton email={organizerEmail.trim()} occasion={occasion} />
          <p className="text-xs text-muted-foreground">
            Want to start a collection for a different occasion? Head back and pick another from the home page.
          </p>
          <a href="/" className="text-sm font-medium text-primary hover:opacity-80">← Back to home</a>
        </CardContent>
      </Card>
    );
  }

  // ---- post-create invite (fallback if the redirect token couldn't be parsed) --
  if (phase === 'invite' && result) {
    return (
      <InviteScreen
        occasion={occasion}
        shareUrl={result.shareUrl}
        adminUrl={result.adminUrl}
        honoreeName={result.honoreeName}
        deadline={deadline || null}
        organizerName={contributorName.trim() || undefined}
      />
    );
  }

  // ---- the minimal create form ---------------------------------------------
  const submitting = phase === 'submitting';

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
          {occasionTitle} collection
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
          Start your collection
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
          Takes under a minute. Free to create and collect — you only pay once at the end, {price}, and only
          when you’re ready. You’ll add your own memory and invite people on the next screen.
        </p>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Your email — first, so the dedup check runs before the rest. No confirm
            field; instead a clear note that this is the key back in. */}
        <SectionCard heading="Your email">
          <div ref={refs.organizerEmail}>
            <FieldRow
              field={ORGANIZER_EMAIL_FIELD}
              value={organizerEmail}
              error={fieldError.organizerEmail}
              autoComplete="email"
              onChange={(v) => {
                setOrganizerEmail(v);
                clearError('organizerEmail');
              }}
              onBlur={checkExisting}
            >
              <p className="text-xs text-muted-foreground">
                We email your private link here — please make sure it’s right. It’s how you get back to your
                collection (there’s no password).
              </p>
            </FieldRow>
            {dupChecking && <p className="mt-1 text-xs text-muted-foreground">Checking…</p>}
          </div>
        </SectionCard>

        {/* You and the honoree — the only other things we need to create. */}
        <SectionCard heading="The basics">
          <div ref={refs.contributorName}>
            <FieldRow
              field={CONTRIBUTOR_NAME_FIELD}
              value={contributorName}
              error={fieldError.contributorName}
              autoComplete="name"
              onChange={(v) => {
                setContributorName(v);
                clearError('contributorName');
              }}
            >
              <p className="text-xs text-muted-foreground">
                So the people you invite see who’s gathering memories.
              </p>
            </FieldRow>
          </div>

          <div ref={refs.honoreeName}>
            <FieldRow
              field={HONOREE_FIELD}
              value={honoreeName}
              error={fieldError.honoreeName}
              onChange={(v) => {
                setHonoreeName(v);
                clearError('honoreeName');
              }}
            >
              <p className="text-xs text-muted-foreground">The name of {honoreeLabel}.</p>
            </FieldRow>
          </div>
        </SectionCard>

        {/* Deadline — optional, auto-defaults to a month out. */}
        <SectionCard heading="When (optional)">
          <FieldRow
            field={DEADLINE_FIELD}
            value={deadline}
            onChange={(v) => {
              // Native date inputs enforce min/max only in the picker — a typed
              // value can exceed them. Clamp into [MIN, MAX] (ISO day strings
              // compare lexicographically). Empty clears (deadline is optional).
              if (!v) return setDeadline('');
              if (DEADLINE_MAX && v > DEADLINE_MAX) return setDeadline(DEADLINE_MAX);
              if (DEADLINE_MIN && v < DEADLINE_MIN) return setDeadline(DEADLINE_MIN);
              setDeadline(v);
            }}
            dateMin={DEADLINE_MIN}
            dateMax={DEADLINE_MAX}
          >
            <p className="text-xs text-muted-foreground">
              Memories close on this date (up to a month out). If you’ve paid, we’ll create your
              {' '}{noun} then with whatever’s been gathered. If you haven’t, the collection is deleted —
              we’ll email a reminder 3 days before either way. Leave it as-is if you’re not sure.
            </p>
          </FieldRow>
        </SectionCard>

        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <Button type="submit" size="lg" className="h-auto min-h-11 w-full whitespace-normal py-2 text-center text-sm leading-snug sm:text-base" disabled={submitting}>
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size={16} /> Creating your collection…
            </span>
          ) : (
            'Create your collection →'
          )}
        </Button>

        <p className="text-center text-xs text-muted-foreground pb-2">
          Free to create and collect · Pay once when you’re ready · No account needed
        </p>
      </form>
    </div>
  );
}

// Re-sends the private manage link to the organizer's email (the secure way back
// to an existing collection — we never show the admin token on screen).
function ResendLinkButton({ email, occasion }: { email: string; occasion: string }) {
  const [state, setState] = React.useState<'idle' | 'sending' | 'sent'>('idle');
  async function resend() {
    setState('sending');
    try {
      await fetch('/api/collection/resend-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, occasion }),
      });
    } catch {
      /* generic — always report sent */
    }
    setState('sent');
  }
  return (
    <div>
      <Button type="button" variant="outline" size="sm" disabled={state !== 'idle'} onClick={resend}>
        {state === 'sending' ? 'Sending…' : state === 'sent' ? 'Link sent ✓' : 'Resend my manage link'}
      </Button>
      {state === 'sent' && (
        <p className="mt-2 text-xs text-muted-foreground">
          Check {email} for your private manage link.
        </p>
      )}
    </div>
  );
}
