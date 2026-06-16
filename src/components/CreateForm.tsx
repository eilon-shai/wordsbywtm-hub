'use client';

import * as React from 'react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Progress,
  Button,
} from '@eilon-shai/venture-core/ui';
import type { FormFieldConfig } from '@eilon-shai/venture-core/types';
import { validateMemoriesField } from '@eilon-shai/venture-core/validation';
import { InviteScreen } from './InviteScreen';
import { composeMemory } from './ContributorForm';
import {
  SectionCard,
  FieldRow,
  WordCounter,
  MemoriesBlockedPanel,
  Spinner,
  wordCount,
  type WordCountBand,
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
  /** Contributor field defs — reused for the organizer's own first memory. */
  contributorFields: FormFieldConfig[];
}

interface CreateSuccess {
  shareUrl: string;
  adminUrl: string;
  priceShown: number;
  honoreeName: string;
}

type Phase = 'form' | 'submitting' | 'invite' | 'existing';

// Live coaching bands under the memory textarea. The hard gate is
// validateMemoriesField (≥20 words, ≥2 sentences); these are coaching only.
const MEMORY_BANDS: WordCountBand[] = [
  { gte: 0, lt: 20, message: 'a little short — please add a few more sentences', colorClass: 'text-destructive' },
  { gte: 20, lt: 60, message: 'this is good — add a detail if you can', colorClass: 'text-primary' },
  { gte: 60, message: 'wonderful, thank you', colorClass: 'text-emerald-700' },
];

// Inline field configs so every control renders through the forked FieldRow
// primitive (visual parity with the contributor form).
const HONOREE_FIELD: FormFieldConfig = {
  name: 'honoreeName',
  type: 'text',
  label: 'Who are we honoring?',
  placeholder: 'Their name',
  required: true,
  maxLength: 120,
};
const EMAIL_FIELD: FormFieldConfig = {
  name: 'organizerEmail',
  type: 'text',
  label: 'Your email',
  placeholder: 'you@example.com',
  required: true,
  maxLength: 254,
};
const RELATIONSHIP_FIELD: FormFieldConfig = {
  name: 'relationship',
  type: 'text',
  label: 'How did you know them?',
  placeholder: 'e.g. their daughter; a lifelong friend',
  required: false,
  maxLength: 120,
};
const NAME_FIELD: FormFieldConfig = {
  name: 'contributorName',
  type: 'text',
  label: 'Your name',
  placeholder: 'How you’d like to be credited',
  required: false,
  maxLength: 120,
};
const MEMORY_FIELD: FormFieldConfig = {
  name: 'memory',
  type: 'textarea',
  label: 'Your memory',
  placeholder:
    'What did they do that was so them? A phrase they always said, a small moment that stuck with you, the way they made you feel.',
  required: false,
  maxLength: 4000,
};
const QUALITY_FIELD: FormFieldConfig = {
  name: 'quality',
  type: 'text',
  label: 'A word or two that captured them',
  placeholder: 'e.g. endlessly generous; quietly funny',
  required: false,
  maxLength: 120,
};
const MOMENT_FIELD: FormFieldConfig = {
  name: 'favoriteMoment',
  type: 'textarea',
  label: 'A favorite moment',
  placeholder: 'A specific moment or story — even a small one.',
  required: false,
  maxLength: 600,
};
const DEADLINE_FIELD: FormFieldConfig = {
  name: 'deadline',
  type: 'date',
  label: 'Deadline',
  required: false,
};

export function CreateForm({ occasion, honoreeLabel, priceShown, tier, occasionTitle, contributorFields }: CreateFormProps) {
  void contributorFields; // organizer memory now lives inline in this merged form

  const [phase, setPhase] = React.useState<Phase>('form');

  // About the collection
  const [honoreeName, setHonoreeName] = React.useState('');
  const [organizerEmail, setOrganizerEmail] = React.useState('');
  // Your memory
  const [contributorName, setContributorName] = React.useState('');
  const [relationship, setRelationship] = React.useState('');
  const [memory, setMemory] = React.useState('');
  const [quality, setQuality] = React.useState('');
  const [favoriteMoment, setFavoriteMoment] = React.useState('');
  // How the tribute should read
  // When
  const [deadline, setDeadline] = React.useState('');

  // Consent (only required when a memory is being submitted).
  const [consent, setConsent] = React.useState(false);
  const [consentError, setConsentError] = React.useState(false);

  const [fieldError, setFieldError] = React.useState<Record<string, string | undefined>>({});
  const [blockedReason, setBlockedReason] = React.useState<string | null>(null);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CreateSuccess | null>(null);

  // Idempotency key for the contribute POST — held across retries so a partial
  // failure (create OK, contribute fails) never duplicates the memory.
  const idempotencyKeyRef = React.useRef<string>('');
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const price = `$${priceShown}`;
  const memoryEntered = memory.trim() !== '';
  const memoryWc = wordCount(memory);

  const honoreeRef = React.useRef<HTMLDivElement | null>(null);
  const emailRef = React.useRef<HTMLDivElement | null>(null);
  const blockedPanelRef = React.useRef<HTMLDivElement | null>(null);
  const consentRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (blockedReason && blockedPanelRef.current) {
      blockedPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [blockedReason]);
  React.useEffect(() => {
    if (consentError && consentRef.current) {
      consentRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [consentError]);

  // Header progress: required fields + an optional bonus for an entered memory.
  const progress = (() => {
    let done = 0;
    const total = 3; // honoree, email, (memory bonus)
    if (honoreeName.trim()) done += 1;
    if (organizerEmail.trim()) done += 1;
    if (memoryEntered) done += 1;
    return Math.round((done / total) * 100);
  })();

  function validateSetup(): Record<string, string | undefined> {
    const errs: Record<string, string | undefined> = {};
    if (!honoreeName.trim()) errs.honoreeName = 'Please add a name.';
    const email = organizerEmail.trim();
    if (!email) {
      errs.organizerEmail = 'Please enter your email address.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
      errs.organizerEmail = 'That doesn’t look like a valid email — please check it.';
    }
    setFieldError(errs);
    return errs;
  }

  // POST #2 — the organizer's own first memory. Returns true on success (or when
  // intentionally skipped), false on a contribute failure (collection already
  // exists; the user can retry the contribution only).
  async function postContribution(created: CreateSuccess): Promise<boolean> {
    const shareToken = (() => {
      try {
        return new URL(created.shareUrl).pathname.split('/c/')[1] ?? '';
      } catch {
        return '';
      }
    })();
    if (!shareToken) return true; // nothing we can do; proceed to invite

    try {
      const res = await fetch('/api/collection/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          contributorName: contributorName.trim() || 'Organizer',
          relationship: relationship.trim() || undefined,
          memory: composeMemory(memory, { quality, favoriteMoment, avoid: '' }, /* isOrganizer */ true),
          consent: true,
          idempotencyKey: idempotencyKeyRef.current,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        code?: string;
        error?: string;
      };
      if (res.ok && data.ok) return true;

      if (data.code === 'INVALID_MEMORY') {
        setBlockedReason(data.error ?? 'Please add a little more detail.');
        return false;
      }
      if (data.code === 'CONSENT_REQUIRED') {
        setConsentError(true);
        return false;
      }
      setFormError(
        'Your collection is created and your words are safe — but we couldn’t add your memory just now. Please try again.',
      );
      return false;
    } catch {
      setFormError(
        'Your collection is created and your words are safe — but we couldn’t reach the server to add your memory. Please try again.',
      );
      return false;
    }
  }

  // POST #1 — create the collection. Returns the created collection, 'existing'
  // on dedup, or null on failure (formError already set).
  async function postCreate(): Promise<CreateSuccess | 'existing' | null> {
    try {
      const res = await fetch(`/api/${occasion}/collection/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizerEmail: organizerEmail.trim(),
          honoreeName: honoreeName.trim(),
          occasion,
          tier,
          ...(deadline ? { deadline } : {}),
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

  // The single perceived action: create the collection AND add the organizer's
  // own first memory. `skipMemory` follows the quiet "write later" link.
  async function runSubmit(skipMemory: boolean) {
    setFormError(null);
    setBlockedReason(null);

    const errs = validateSetup();
    if (Object.keys(errs).length > 0) {
      const target = errs.honoreeName ? honoreeRef.current : emailRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }

    // If a memory has been entered (and we're not skipping), enforce the gate
    // BEFORE creating the collection, so a blocked memory never strands a half-
    // created collection.
    const submittingMemory = !skipMemory && memoryEntered;
    if (submittingMemory) {
      if (!consent) {
        setConsentError(true);
        consentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      const check = validateMemoriesField(memory);
      if (!check.valid) {
        setBlockedReason(check.reason);
        return;
      }
    }

    setPhase('submitting');

    // If the collection already exists in state (partial-failure retry), reuse
    // it: re-POST only the contribution under the same idempotency key.
    let created = result;
    if (!created) {
      const createResult = await postCreate();
      if (createResult === null) {
        setPhase('form');
        return;
      }
      if (createResult === 'existing') {
        setPhase('existing');
        return;
      }
      // MAJOR-3: store result/shareToken BEFORE attempting contribute, so a
      // contribute retry never re-POSTs create.
      created = createResult;
      setResult(createResult);
    }

    if (submittingMemory) {
      const ok = await postContribution(created);
      if (!ok) {
        setPhase('form'); // collection is in state; retry posts contribute only
        return;
      }
    }

    setPhase('invite');
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void runSubmit(false);
  }

  // ---- existing dedup card -------------------------------------------------
  // (ResendLinkButton defined at module scope below.)
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

  // ---- post-create invite --------------------------------------------------
  if (phase === 'invite' && result) {
    return (
      <InviteScreen
        occasion={occasion}
        shareUrl={result.shareUrl}
        adminUrl={result.adminUrl}
        honoreeName={result.honoreeName}
        deadline={deadline || null}
      />
    );
  }

  // ---- the merged full form ------------------------------------------------
  const submitting = phase === 'submitting';

  return (
    <div className="mx-auto w-full max-w-2xl">
      <header className="mb-8 text-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
          {occasionTitle} collection
        </p>
        <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
          Set up the collection and write your first memory
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
          Free to create — you only pay once at the end, {price}, shown now so there are no surprises.
        </p>
        <div className="mt-5 max-w-xs mx-auto">
          <Progress value={progress} className="h-1.5" />
        </div>
      </header>

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        {/* Section 1 — About the collection */}
        <SectionCard heading="About the collection">
          <div
            ref={honoreeRef}
            className={
              fieldError.honoreeName
                ? 'rounded-xl p-3 -m-3 ring-2 ring-destructive ring-offset-2 ring-offset-background'
                : ''
            }
          >
            <FieldRow
              field={HONOREE_FIELD}
              value={honoreeName}
              error={fieldError.honoreeName}
              onChange={(v) => {
                setHonoreeName(v);
                if (fieldError.honoreeName) setFieldError((p) => ({ ...p, honoreeName: undefined }));
              }}
            >
              <p className="text-xs text-muted-foreground">The name of {honoreeLabel}.</p>
            </FieldRow>
          </div>

          <div
            ref={emailRef}
            className={
              fieldError.organizerEmail
                ? 'rounded-xl p-3 -m-3 ring-2 ring-destructive ring-offset-2 ring-offset-background'
                : ''
            }
          >
            <FieldRow
              field={EMAIL_FIELD}
              value={organizerEmail}
              error={fieldError.organizerEmail}
              onChange={(v) => {
                setOrganizerEmail(v);
                if (fieldError.organizerEmail) setFieldError((p) => ({ ...p, organizerEmail: undefined }));
              }}
            >
              <p className="text-xs text-muted-foreground">
                We email your private manage link here — that’s how you’ll come back to review and finish.
              </p>
            </FieldRow>
          </div>
        </SectionCard>

        {/* Section 2 — Your memory (the centerpiece) */}
        <SectionCard heading="Your memory">
          <p className="text-sm text-muted-foreground leading-relaxed -mt-1">
            What did they do that was so <em>them</em>? Specific beats general — one real story is worth
            more than a list of nice words. Optional, but it becomes the heart of the tribute.
          </p>
          <FieldRow
            field={NAME_FIELD}
            value={contributorName}
            onChange={setContributorName}
          />
          <FieldRow
            field={RELATIONSHIP_FIELD}
            value={relationship}
            onChange={setRelationship}
          />
          <FieldRow
            field={MEMORY_FIELD}
            value={memory}
            rows={8}
            onChange={(v) => {
              setMemory(v);
              setBlockedReason(null);
            }}
          >
            <WordCounter value={memory} bands={MEMORY_BANDS} />
          </FieldRow>
          <FieldRow field={QUALITY_FIELD} value={quality} onChange={setQuality} />
          <FieldRow field={MOMENT_FIELD} value={favoriteMoment} rows={3} onChange={setFavoriteMoment} />
        </SectionCard>

        {/* "How the tribute should read" (tone/length/avoid/context) now lives on
            the result page, chosen right before the tribute is generated. */}

        {/* Section — When */}
        <SectionCard heading="When">
          <FieldRow field={DEADLINE_FIELD} value={deadline} onChange={setDeadline}>
            <p className="text-xs text-muted-foreground">Memories close then. You can share until that date.</p>
          </FieldRow>
        </SectionCard>

        {blockedReason && (
          <div ref={blockedPanelRef}>
            <MemoriesBlockedPanel reason={blockedReason} />
          </div>
        )}

        {/* Consent — only when a memory has been entered (MINOR-2). */}
        {memoryEntered && (
          <div
            ref={consentRef}
            className={
              consentError
                ? 'rounded-2xl ring-2 ring-destructive ring-offset-2 ring-offset-background transition-shadow'
                : 'transition-shadow'
            }
          >
            <SectionCard>
              <label className="flex items-start gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => {
                    setConsent(e.target.checked);
                    if (e.target.checked) setConsentError(false);
                  }}
                  className="mt-0.5 shrink-0 h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
                <span className="text-sm text-foreground leading-relaxed">
                  I’m okay with my memory being woven into the tribute you’ll receive.
                </span>
              </label>
              {consentError && (
                <p className="text-xs text-destructive" role="alert">
                  Please check the box above so we can include your memory.
                </p>
              )}
            </SectionCard>
          </div>
        )}

        {formError && (
          <div
            role="alert"
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {formError}
          </div>
        )}

        <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={submitting}>
          {submitting ? (
            <span className="inline-flex items-center gap-2">
              <Spinner size={16} /> Creating your collection…
            </span>
          ) : (
            'Create collection & add my memory'
          )}
        </Button>

        <button
          type="button"
          onClick={() => void runSubmit(true)}
          disabled={submitting}
          className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
        >
          I’ll write my own memory later
        </button>

        <p className="text-center text-xs text-muted-foreground pb-2">
          {memoryWc > 0 && memoryWc < 20
            ? 'A little more detail and you’re set.'
            : 'Free to create and collect · Pay once when you’re ready · No account needed'}
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
