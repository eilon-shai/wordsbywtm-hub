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

// ---------------------------------------------------------------------------
// Field configs — mirror the TributeWords eulogy intake (labels, placeholders,
// relationship options). Every control renders through the forked FieldRow.
// ---------------------------------------------------------------------------

const CONTRIBUTOR_NAME_FIELD: FormFieldConfig = {
  name: 'contributorName',
  type: 'text',
  label: 'Your name',
  placeholder: 'e.g. Sarah',
  required: true,
  maxLength: 100,
};

const RELATIONSHIP_OPTIONS = [
  { value: 'child', label: 'Son or Daughter' },
  { value: 'parent', label: 'Mother or Father' },
  { value: 'sibling', label: 'Brother or Sister' },
  { value: 'spouse', label: 'Husband, Wife, or Partner' },
  { value: 'friend', label: 'Close Friend' },
  { value: 'colleague', label: 'Colleague or Mentor' },
  { value: 'other', label: 'Other' },
];

const RELATIONSHIP_DESCRIPTION_FIELD: FormFieldConfig = {
  name: 'relationshipDescription',
  type: 'text',
  label: 'Describe your relationship briefly',
  placeholder: 'e.g. her eldest daughter, his best friend of 30 years',
  required: true,
  maxLength: 200,
};

const HONOREE_FIELD: FormFieldConfig = {
  name: 'honoreeName',
  type: 'text',
  label: 'Their name',
  placeholder: 'e.g. Michael, Mike, or Michael James Chen',
  required: true,
  maxLength: 120,
};

const MEMORY_FIELD: FormFieldConfig = {
  name: 'memory',
  type: 'textarea',
  label: '2–3 specific memories or stories',
  placeholder:
    "The smell of her kimchi filling the house every Sunday. The way he'd quietly slip a $20 into your pocket on the way out. A specific moment — even a small one — beats a list of nice words.",
  required: true,
  maxLength: 4000,
};

const QUALITIES_FIELD: FormFieldConfig = {
  name: 'qualities',
  type: 'textarea',
  label: 'What qualities made them who they were?',
  placeholder: 'e.g. endlessly patient, quietly funny, the first to show up when anyone needed help',
  required: true,
  maxLength: 1000,
};

const THINGS_TO_AVOID_FIELD: FormFieldConfig = {
  name: 'thingsToAvoid',
  type: 'textarea',
  label: 'Topics or details to avoid',
  placeholder: "e.g. Please don't mention his illness or the years he was estranged from the family.",
  required: false,
  maxLength: 500,
};

const ADDITIONAL_CONTEXT_FIELD: FormFieldConfig = {
  name: 'additionalContext',
  type: 'textarea',
  label: 'Anything else we should know',
  placeholder:
    'e.g. She was deeply religious — Catholic faith was central to her life; the death was sudden; the service is non-religious.',
  required: false,
  maxLength: 500,
};

const ORGANIZER_EMAIL_FIELD: FormFieldConfig = {
  name: 'organizerEmail',
  type: 'text',
  label: 'Your email',
  placeholder: 'you@example.com',
  required: true,
  maxLength: 254,
};

const CONFIRM_EMAIL_FIELD: FormFieldConfig = {
  name: 'confirmEmail',
  type: 'text',
  label: 'Confirm your email',
  placeholder: 'you@example.com',
  required: true,
  maxLength: 254,
};

const DEADLINE_FIELD: FormFieldConfig = {
  name: 'deadline',
  type: 'date',
  label: 'Deadline',
  required: false,
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function CreateForm({ occasion, honoreeLabel, priceShown, tier, occasionTitle, contributorFields }: CreateFormProps) {
  void contributorFields; // organizer memory now lives inline in this merged form

  const [phase, setPhase] = React.useState<Phase>('form');

  // About you
  const [contributorName, setContributorName] = React.useState('');
  const [relationship, setRelationship] = React.useState('');
  const [relationshipDescription, setRelationshipDescription] = React.useState('');
  // About them
  const [honoreeName, setHonoreeName] = React.useState('');
  const [memory, setMemory] = React.useState('');
  const [qualities, setQualities] = React.useState('');
  // Optional
  const [thingsToAvoid, setThingsToAvoid] = React.useState('');
  const [additionalContext, setAdditionalContext] = React.useState('');
  // Your email
  const [organizerEmail, setOrganizerEmail] = React.useState('');
  const [confirmEmail, setConfirmEmail] = React.useState('');
  // When
  const [deadline, setDeadline] = React.useState('');

  // Consent.
  const [consent, setConsent] = React.useState(false);
  const [consentError, setConsentError] = React.useState(false);

  const [fieldError, setFieldError] = React.useState<Record<string, string | undefined>>({});
  const [blockedReason, setBlockedReason] = React.useState<string | null>(null);
  // Once the contributor opts to override the memory gate, skip the client gate
  // AND send overrideValidation:true on the contribute POST.
  const [overridden, setOverridden] = React.useState(false);
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
  const memoryWc = wordCount(memory);

  const refs = {
    contributorName: React.useRef<HTMLDivElement | null>(null),
    relationship: React.useRef<HTMLDivElement | null>(null),
    relationshipDescription: React.useRef<HTMLDivElement | null>(null),
    honoreeName: React.useRef<HTMLDivElement | null>(null),
    memory: React.useRef<HTMLDivElement | null>(null),
    qualities: React.useRef<HTMLDivElement | null>(null),
    organizerEmail: React.useRef<HTMLDivElement | null>(null),
    confirmEmail: React.useRef<HTMLDivElement | null>(null),
  };
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

  // Header progress: the required fields.
  const progress = (() => {
    let done = 0;
    const total = 7;
    if (contributorName.trim()) done += 1;
    if (relationship) done += 1;
    if (relationshipDescription.trim()) done += 1;
    if (honoreeName.trim()) done += 1;
    if (memory.trim()) done += 1;
    if (qualities.trim()) done += 1;
    if (organizerEmail.trim() && confirmEmail.trim()) done += 1;
    return Math.round((done / total) * 100);
  })();

  // Validate every required field except the memory gate (which is handled
  // separately so the override path can bypass it). Returns the error map.
  function validateRequired(): Record<string, string | undefined> {
    const errs: Record<string, string | undefined> = {};
    if (!contributorName.trim()) errs.contributorName = 'Please add your name.';
    if (!relationship) errs.relationship = 'Please choose your relationship.';
    if (!relationshipDescription.trim()) errs.relationshipDescription = 'Please describe your relationship.';
    if (!honoreeName.trim()) errs.honoreeName = 'Please add a name.';
    if (!memory.trim()) errs.memory = 'Please share a memory.';
    if (!qualities.trim()) errs.qualities = 'Please add a few words about them.';

    const email = organizerEmail.trim();
    if (!email) {
      errs.organizerEmail = 'Please enter your email address.';
    } else if (!EMAIL_RE.test(email)) {
      errs.organizerEmail = 'That doesn’t look like a valid email — please check it.';
    }
    const confirm = confirmEmail.trim();
    if (!confirm) {
      errs.confirmEmail = 'Please confirm your email address.';
    } else if (confirm.toLowerCase() !== email.toLowerCase()) {
      errs.confirmEmail = "Emails don't match.";
    }
    return errs;
  }

  const FIELD_ORDER: Array<keyof typeof refs> = [
    'contributorName',
    'relationship',
    'relationshipDescription',
    'honoreeName',
    'memory',
    'qualities',
    'organizerEmail',
    'confirmEmail',
  ];

  function clearError(name: string) {
    setFieldError((p) => (p[name] ? { ...p, [name]: undefined } : p));
  }

  // POST #2 — the organizer's own first memory. Returns true on success,
  // false on a contribute failure (the user can retry the contribution only).
  async function postContribution(created: CreateSuccess): Promise<boolean> {
    const shareToken = (() => {
      try {
        return new URL(created.shareUrl).pathname.split('/c/')[1] ?? '';
      } catch {
        return '';
      }
    })();
    if (!shareToken) return true; // nothing we can do; proceed to invite

    const composed = composeMemory(
      memory +
        '\n\nWhat made them who they were: ' +
        qualities +
        (relationshipDescription ? '\n\nRelationship: ' + relationshipDescription : ''),
      { quality: '', favoriteMoment: '', avoid: '' },
      true,
    );

    try {
      const res = await fetch('/api/collection/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          contributorName: contributorName.trim(),
          relationship,
          memory: composed,
          consent: true,
          idempotencyKey: idempotencyKeyRef.current,
          ...(overridden ? { overrideValidation: true } : {}),
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
    const synthesisPrefs: Record<string, string> = {
      ...(thingsToAvoid.trim() ? { thingsToAvoid: thingsToAvoid.trim() } : {}),
      ...(additionalContext.trim() ? { additionalContext: additionalContext.trim() } : {}),
    };
    try {
      const res = await fetch(`/api/${occasion}/collection/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          honoreeName: honoreeName.trim(),
          organizerEmail: organizerEmail.trim(),
          occasion,
          tier,
          ...(deadline ? { deadline } : {}),
          synthesisPrefs,
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
  // `forceOverride` retries past the client memory gate after the user clicks
  // the override button in MemoriesBlockedPanel.
  async function runSubmit(skipMemory: boolean, forceOverride = false) {
    setFormError(null);
    setBlockedReason(null);

    const errs = validateRequired();
    // When skipping the memory, the memory field itself is not required.
    if (skipMemory) delete errs.memory;
    if (Object.keys(errs).length > 0) {
      setFieldError(errs);
      const first = FIELD_ORDER.find((name) => errs[name]);
      if (first) refs[first].current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setFieldError({});

    const submittingMemory = !skipMemory;
    if (submittingMemory) {
      if (!consent) {
        setConsentError(true);
        consentRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
      }
      // Run the client memory gate UNLESS the user has already chosen to override.
      const useOverride = forceOverride || overridden;
      if (!useOverride) {
        const check = validateMemoriesField(memory);
        if (!check.valid) {
          setBlockedReason(check.reason);
          return;
        }
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
      // Store result/shareToken BEFORE attempting contribute, so a contribute
      // retry never re-POSTs create.
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

  // Override button in the blocked panel — remember the choice and retry.
  function handleOverride() {
    setOverridden(true);
    setBlockedReason(null);
    void runSubmit(false, true);
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
        {/* Section — About you */}
        <SectionCard heading="About you">
          <div ref={refs.contributorName}>
            <FieldRow
              field={CONTRIBUTOR_NAME_FIELD}
              value={contributorName}
              error={fieldError.contributorName}
              onChange={(v) => {
                setContributorName(v);
                clearError('contributorName');
              }}
            />
          </div>

          <div ref={refs.relationship}>
            <FieldRow
              field={{
                ...RELATIONSHIP_FIELD_BASE,
                label: `Your relationship to ${honoreeLabel}`,
                options: RELATIONSHIP_OPTIONS,
              }}
              value={relationship}
              error={fieldError.relationship}
              onChange={(v) => {
                setRelationship(v);
                clearError('relationship');
              }}
            />
          </div>

          <div ref={refs.relationshipDescription}>
            <FieldRow
              field={RELATIONSHIP_DESCRIPTION_FIELD}
              value={relationshipDescription}
              error={fieldError.relationshipDescription}
              onChange={(v) => {
                setRelationshipDescription(v);
                clearError('relationshipDescription');
              }}
            />
          </div>
        </SectionCard>

        {/* Section — About them */}
        <SectionCard heading="About them">
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

          <div ref={refs.memory}>
            <FieldRow
              field={MEMORY_FIELD}
              value={memory}
              error={fieldError.memory}
              rows={8}
              onChange={(v) => {
                setMemory(v);
                setBlockedReason(null);
                clearError('memory');
              }}
            >
              <WordCounter value={memory} bands={MEMORY_BANDS} />
            </FieldRow>
          </div>

          <div ref={refs.qualities}>
            <FieldRow
              field={QUALITIES_FIELD}
              value={qualities}
              error={fieldError.qualities}
              rows={4}
              onChange={(v) => {
                setQualities(v);
                clearError('qualities');
              }}
            />
          </div>
        </SectionCard>

        {/* Section — Optional */}
        <SectionCard heading="Optional">
          <FieldRow field={THINGS_TO_AVOID_FIELD} value={thingsToAvoid} rows={3} onChange={setThingsToAvoid} />
          <FieldRow
            field={ADDITIONAL_CONTEXT_FIELD}
            value={additionalContext}
            rows={3}
            onChange={setAdditionalContext}
          />
        </SectionCard>

        {/* Section — Your email */}
        <SectionCard heading="Your email">
          <div ref={refs.organizerEmail}>
            <FieldRow
              field={ORGANIZER_EMAIL_FIELD}
              value={organizerEmail}
              error={fieldError.organizerEmail}
              onChange={(v) => {
                setOrganizerEmail(v);
                clearError('organizerEmail');
              }}
            />
          </div>
          <div ref={refs.confirmEmail}>
            <FieldRow
              field={CONFIRM_EMAIL_FIELD}
              value={confirmEmail}
              error={fieldError.confirmEmail}
              onChange={(v) => {
                setConfirmEmail(v);
                clearError('confirmEmail');
              }}
            >
              <p className="text-xs text-muted-foreground">
                We email your private manage link here — please double-check it.
              </p>
            </FieldRow>
          </div>
        </SectionCard>

        {/* Section — When */}
        <SectionCard heading="When">
          <FieldRow field={DEADLINE_FIELD} value={deadline} onChange={setDeadline}>
            <p className="text-xs text-muted-foreground">Memories close then. You can share until that date.</p>
          </FieldRow>
        </SectionCard>

        {blockedReason && (
          <div ref={blockedPanelRef}>
            <MemoriesBlockedPanel
              reason={blockedReason}
              onOverride={handleOverride}
              overrideLabel="Generate with what I’ve shared"
            />
          </div>
        )}

        {/* Consent — the error ring wraps ONLY the checkbox + label row. */}
        <SectionCard>
          <div
            ref={consentRef}
            className={
              consentError
                ? 'rounded-xl p-3 -m-3 ring-2 ring-destructive ring-offset-2 ring-offset-background transition-shadow'
                : 'transition-shadow'
            }
          >
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
              <p className="mt-2 text-xs text-destructive" role="alert">
                Please check the box above so we can include your memory.
              </p>
            )}
          </div>
        </SectionCard>

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

// Base for the relationship select — label is filled in per honoreeLabel.
const RELATIONSHIP_FIELD_BASE: FormFieldConfig = {
  name: 'relationship',
  type: 'select',
  label: 'Your relationship',
  placeholder: 'Select your relationship…',
  required: true,
  maxLength: 50,
};

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
