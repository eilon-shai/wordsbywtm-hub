'use client';

// ---------------------------------------------------------------------------
// ContributorForm (S5) — a public, no-payment form for one contributor to add
// one memory to a collection. Forked TributeWords look (forked/FormPrimitives)
// + the real venture-core memory guard so client and server verdicts match.
// COLLECTION_FLOW_DESIGN.md §4 + §S5.
// ---------------------------------------------------------------------------

import * as React from 'react';
import Link from 'next/link';
import { validateMemoriesField } from '@eilon-shai/venture-core/validation';
import type { FormFieldConfig } from '@eilon-shai/venture-core/types';
import { Button } from '@eilon-shai/venture-core/ui';
import {
  SectionCard,
  FieldRow,
  WordCounter,
  MemoriesBlockedPanel,
  ErrorBanner,
  Spinner,
  wordCount,
  type WordCountBand,
} from '@/components/forked/FormPrimitives';

// Encouraging word bands shown live under the memory textarea. The hard gate is
// validateMemoriesField (≥20 words); these are coaching only.
// The hard gate is validateMemoriesField (needs ≥20 words, ≥2 sentences). Below
// the floor the counter is RED so it's clear more is required before the memory
// can be added; amber→green once it qualifies.
const MEMORY_BANDS: WordCountBand[] = [
  { gte: 0, lt: 20, message: 'a little short — please add a few more sentences', colorClass: 'text-destructive' },
  { gte: 20, lt: 60, message: 'this is good — add a detail if you can', colorClass: 'text-primary' },
  { gte: 60, message: 'wonderful, thank you', colorClass: 'text-emerald-700' },
];

const NAME_FIELD = 'contributorName';
const RELATIONSHIP_FIELD = 'relationship';
const MEMORY_FIELD = 'memory';

type Phase = 'form' | 'submitting' | 'done';

interface SubmitErrorState {
  message: string;
  retryable: boolean;
}

// Respect the user's reduced-motion preference for our programmatic scrolls.
function scrollBehavior(): ScrollBehavior {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ? 'auto'
    : 'smooth';
}

export interface ContributorFormProps {
  shareToken: string;
  occasionTitle: string;
  /** Generic occasion honoree label (e.g. "the person we are honoring"). Fallback. */
  honoreeLabel: string;
  /** Real honoree/couple name, shown to invited contributors. Falls back to honoreeLabel. */
  honoreeName?: string;
  /** Occasion deliverable noun for copy, e.g. "tribute" / "toast". Defaults to "tribute". */
  deliverableNoun?: string;
  /** Name of the organizer who invited them ("{name} is gathering…"). Optional. */
  organizerName?: string;
  /**
   * Verified recipient email from an emailed invite's signed ?inv token. When
   * set, the email field is prefilled and read-only — the contributor can't
   * submit under a different address (the server also derives it from the token).
   */
  lockedEmail?: string;
  /**
   * The raw signed invite token (only passed when it verified). Sent on submit so
   * the contribute handler derives the contributor email from it, ignoring the
   * client field — tamper-proof one-memory-per-person identity.
   */
  inviteToken?: string;
  /** Field definitions from collectionConfig.contributorFormFields. */
  fields: FormFieldConfig[];
  /** Cross-occasion home for the soft cross-sell after submit. */
  homeHref: string;
  /**
   * 'organizer' embeds this as the customer's OWN first-memory step inside the
   * create flow: it advances via onSubmitted instead of showing the public
   * contributor thank-you/cross-sell, and offers a Skip link.
   */
  variant?: 'contributor' | 'organizer';
  onSubmitted?: (honoreeName: string) => void;
  onSkip?: () => void;
  /**
   * Set when the ORGANIZER adds their own memory later via the dashboard
   * "Write a memory" link (public /c page, but the admin token matched). The
   * memory is flagged isOrganizer (pinned/editable), and the thank-you returns
   * here ("Back to your collection") instead of offering cross-sell.
   */
  organizerReturnHref?: string;
}

export function ContributorForm({
  shareToken,
  occasionTitle,
  honoreeLabel,
  honoreeName,
  deliverableNoun,
  organizerName,
  lockedEmail,
  inviteToken,
  fields,
  homeHref,
  variant = 'contributor',
  onSubmitted,
  onSkip,
  organizerReturnHref,
}: ContributorFormProps) {
  // Embedded create-flow step OR the dashboard write-later path: either way this
  // memory belongs to the organizer (flagged isOrganizer server-side).
  const isOrganizer = variant === 'organizer' || !!organizerReturnHref;
  // Personalized pre-submit copy: name the honoree (invited contributors already
  // know who they're honoring), the occasion's deliverable, and — when known —
  // the organizer who invited them.
  const honoreeDisplay = (honoreeName ?? '').trim() || honoreeLabel;
  const deliverable = (deliverableNoun ?? '').trim() || 'tribute';
  const inviter = (organizerName ?? '').trim();
  // Idempotency key generated once at mount, held across retries (§4).
  const idempotencyKeyRef = React.useRef<string>('');
  if (!idempotencyKeyRef.current) {
    idempotencyKeyRef.current =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  const fieldByName = React.useMemo(() => {
    const map: Record<string, FormFieldConfig> = {};
    for (const f of fields) map[f.name] = f;
    return map;
  }, [fields]);

  const nameField = fieldByName[NAME_FIELD];
  const relationshipField = fieldByName[RELATIONSHIP_FIELD];
  const memoryField = fieldByName[MEMORY_FIELD];

  const [values, setValues] = React.useState<Record<string, string>>({
    [NAME_FIELD]: '',
    [RELATIONSHIP_FIELD]: '',
    [MEMORY_FIELD]: '',
  });
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  // Contributor email — required (the identity key for one-memory-per-person).
  // Organizers (write-later) are exempt; they're capped server-side another way.
  // For emailed invites the address is pre-verified and locked (read-only).
  const emailLocked = !!lockedEmail;
  const [email, setEmail] = React.useState(lockedEmail ?? '');
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [consent, setConsent] = React.useState(false);
  const [consentError, setConsentError] = React.useState(false);
  const [blockedReason, setBlockedReason] = React.useState<string | null>(null);
  // Optional content fields, composed into the memory text before submit.
  const [extras, setExtras] = React.useState({ quality: '', favoriteMoment: '', avoid: '' });

  const [phase, setPhase] = React.useState<Phase>('form');
  const [submitError, setSubmitError] = React.useState<SubmitErrorState | null>(null);
  const [resultHonoree, setResultHonoree] = React.useState<string>('');
  // Terminal collection-state screens that replace the whole form.
  const [terminal, setTerminal] = React.useState<null | 'closed' | 'notfound' | 'full'>(null);

  // One-memory-per-person guard (public contributors only). Once this browser
  // has added a memory to this collection we remember it, so the same person
  // can't keep re-submitting the form. Organizers manage from their dashboard.
  const contributedKey = `wtm:contributed:${shareToken}`;
  const [alreadyShared, setAlreadyShared] = React.useState(false);
  React.useEffect(() => {
    if (isOrganizer) return;
    try {
      if (localStorage.getItem(contributedKey)) setAlreadyShared(true);
    } catch {
      /* localStorage unavailable — no guard, the IP rate-limit still applies */
    }
  }, [isOrganizer, contributedKey]);

  const blockedPanelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (blockedReason && blockedPanelRef.current) {
      blockedPanelRef.current.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    }
  }, [blockedReason]);

  // On missing consent, scroll to the checkbox and draw a box around it.
  const consentRef = React.useRef<HTMLLabelElement | null>(null);
  React.useEffect(() => {
    if (consentError && consentRef.current) {
      consentRef.current.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
    }
  }, [consentError]);

  // On a failed submit (missing required field or bad email), scroll the first
  // invalid field into view — otherwise the error can be off-screen and the submit
  // looks like it silently did nothing. Gated on a per-submit nonce (not on the
  // errors object) so it fires once per attempt, never while the user is typing a
  // fix into a different field. The field's own role="alert" error announces it to
  // screen readers, so we scroll rather than steal focus. Scoped to text controls.
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const [errorScrollNonce, setErrorScrollNonce] = React.useState(0);
  React.useEffect(() => {
    if (errorScrollNonce === 0) return;
    const el = formRef.current?.querySelector<HTMLElement>(
      'input[aria-invalid="true"], textarea[aria-invalid="true"]',
    );
    el?.scrollIntoView({ behavior: scrollBehavior(), block: 'center' });
  }, [errorScrollNonce]);

  const setField = React.useCallback((name: string, v: string) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === MEMORY_FIELD) setBlockedReason(null);
  }, []);

  const memoryValue = values[MEMORY_FIELD] ?? '';
  const memoryWc = wordCount(memoryValue);

  const doSubmit = React.useCallback(async (override = false) => {
    setSubmitError(null);

    // Layer 1 — required fields.
    const nextErrors: Record<string, string | undefined> = {};
    if ((values[NAME_FIELD] ?? '').trim() === '') {
      nextErrors[NAME_FIELD] = 'Please add your name';
    }
    if ((memoryValue ?? '').trim() === '') {
      nextErrors[MEMORY_FIELD] = 'Please share a memory';
    }
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setErrorScrollNonce((n) => n + 1); // scroll to the first invalid field
      return;
    }

    // Email required for contributors (one-memory-per-person key); organizers exempt.
    setEmailError(null);
    if (!isOrganizer && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setEmailError('Please enter a valid email address.');
      setErrorScrollNonce((n) => n + 1);
      return;
    }

    // Consent gate (T-COLL-008).
    if (!consent) {
      setConsentError(true);
      return;
    }

    // Layer 2 — the exact server guard, run client-side for live coaching.
    // When the contributor has chosen to proceed anyway (override), skip the
    // client gate and let the server bypass via overrideValidation:true.
    if (!override) {
      const check = validateMemoriesField(memoryValue);
      if (!check.valid) {
        setBlockedReason(check.reason);
        return;
      }
    }
    setBlockedReason(null);

    setPhase('submitting');
    try {
      const res = await fetch('/api/collection/contribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          contributorName: values[NAME_FIELD].trim(),
          ...(email.trim() ? { contributorEmail: email.trim() } : {}),
          // Tamper-proof identity for emailed invites: the server derives the
          // email from this verified token, ignoring contributorEmail above.
          ...(inviteToken ? { inviteToken } : {}),
          relationship: (values[RELATIONSHIP_FIELD] ?? '').trim() || undefined,
          memory: composeMemory(memoryValue, extras, isOrganizer),
          consent: true,
          idempotencyKey: idempotencyKeyRef.current,
          ...(isOrganizer ? { isOrganizer: true } : {}),
          ...(override ? { overrideValidation: true } : {}),
        }),
      });

      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        honoreeName?: string;
        code?: string;
        error?: string;
        retryable?: boolean;
      };

      if (res.ok && data.ok) {
        // Organizer's own first memory: advance the create flow instead of
        // showing the public contributor thank-you/cross-sell.
        if (isOrganizer && onSubmitted) {
          onSubmitted(data.honoreeName ?? '');
          return;
        }
        // Remember this browser has contributed (public, one-per-person guard).
        if (!isOrganizer) {
          try {
            localStorage.setItem(contributedKey, '1');
          } catch {
            /* ignore */
          }
        }
        setResultHonoree(data.honoreeName ?? '');
        setPhase('done');
        return;
      }

      // Map server error codes to states (§S5).
      const code = data.code ?? '';
      if (code === 'COLLECTION_CLOSED') {
        setTerminal('closed');
        return;
      }
      if (code === 'NOT_FOUND') {
        setTerminal('notfound');
        return;
      }
      if (code === 'CONTRIBUTION_LIMIT') {
        setTerminal('full');
        return;
      }
      setPhase('form');
      if (code === 'INVALID_MEMORY') {
        // Surface the server's reason inline in the amber panel.
        setBlockedReason(data.error ?? 'Please add a little more detail.');
        return;
      }
      if (code === 'INVALID_EMAIL') {
        setEmailError(data.error ?? 'Please enter a valid email address.');
        return;
      }
      if (code === 'CONTRIBUTION_EXISTS') {
        // A memory from this person already exists — show the warm terminal
        // screen rather than a tiny inline error (UX-05).
        try {
          localStorage.setItem(contributedKey, '1');
        } catch {
          /* ignore */
        }
        setAlreadyShared(true);
        return;
      }
      if (code === 'CONSENT_REQUIRED') {
        setConsentError(true);
        return;
      }
      const retryable = data.retryable ?? code === 'RATE_LIMIT';
      setSubmitError({
        message:
          code === 'RATE_LIMIT'
            ? 'You are sending these a little quickly — please wait a moment and try again.'
            : data.error ?? 'Your words are safe — something went wrong sending them. Please try again.',
        retryable: !!retryable,
      });
    } catch {
      setPhase('form');
      setSubmitError({
        message: 'Your words are safe. There was a connection problem — please try again.',
        retryable: true,
      });
    }
  }, [consent, memoryValue, shareToken, values, extras, email, inviteToken, isOrganizer, onSubmitted, contributedKey]);

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void doSubmit();
    },
    [doSubmit],
  );

  // ---- already contributed (public, one-per-person) ------------------------
  if (alreadyShared && phase === 'form') {
    return (
      <CenteredCard>
        <div className="text-5xl mb-6" aria-hidden="true">
          🤍
        </div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
          You’ve already shared a memory
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Thank you — your memory of {honoreeLabel} is already with the organizer. There’s nothing
          more you need to do.
        </p>
      </CenteredCard>
    );
  }

  // ---- terminal: closed / not-found / full ---------------------------------
  if (terminal) {
    const icon = terminal === 'closed' ? '🕯️' : terminal === 'full' ? '🤍' : '🔗';
    const heading =
      terminal === 'closed'
        ? 'This collection has closed'
        : terminal === 'full'
          ? 'This collection is full'
          : 'This link isn’t active';
    const body =
      terminal === 'closed'
        ? 'It’s no longer accepting new memories. If you’d still like to share something, reach out to whoever invited you.'
        : terminal === 'full'
          ? `Thank you for wanting to share a memory of ${honoreeLabel}. This collection has reached the number of memories it can take — please let the organizer know if you’d still like yours included.`
          : 'We couldn’t find a collection for this link. Ask whoever invited you for a fresh one.';
    return (
      <CenteredCard>
        <div className="text-5xl mb-6" aria-hidden="true">{icon}</div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">{heading}</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">{body}</p>
      </CenteredCard>
    );
  }

  // ---- success thank-you ---------------------------------------------------
  if (phase === 'done') {
    const who = resultHonoree || 'them';

    // Organizer added their own memory from the dashboard: send them straight
    // back to their collection. No "share another", no cross-sell.
    if (organizerReturnHref) {
      return (
        <CenteredCard>
          <div className="text-5xl mb-6" aria-hidden="true">
            🤍
          </div>
          <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
            Your memory of {who} has been added
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed mb-8">
            It’s pinned to the top of your collection as your own — you can edit it any time, and it’s
            always part of the final tribute.
          </p>
          <Link
            href={organizerReturnHref}
            className="inline-flex items-center justify-center rounded-full px-6 py-3 text-sm font-semibold bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            ← Back to your collection
          </Link>
        </CenteredCard>
      );
    }

    // Regular contributor: a simple thank-you. No "share another memory" — one
    // memory per invite is the model; the soft cross-sell stays.
    return (
      <CenteredCard>
        <div className="text-5xl mb-6" aria-hidden="true">
          🤍
        </div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
          Thank you — your memory of {who} has been added
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-10">
          The person gathering these will read it and may weave it into one combined tribute. That’s
          everything we need from you.
        </p>

        {/* Soft cross-sell — only after submitting (§7). */}
        <div className="border-t border-border pt-8 mt-2">
          <p className="text-sm text-muted-foreground leading-relaxed mb-3">
            Putting together a tribute for someone yourself? You can start your own collection — it’s
            free to create and gather, and you only pay once at the end.
          </p>
          <Link
            href={`${homeHref}?src=contributor`}
            className="inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-medium border border-border text-foreground hover:bg-accent/20 transition-colors"
          >
            Start your own →
          </Link>
        </div>
      </CenteredCard>
    );
  }

  // ---- form ----------------------------------------------------------------
  const submitting = phase === 'submitting';

  return (
    <main className="min-h-screen bg-background py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            {occasionTitle} collection
          </p>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">
            {organizerReturnHref
              ? 'Add your own memory'
              : isOrganizer
                ? 'Start with your own memory'
                : 'Share a memory'}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
            {organizerReturnHref
              ? `Your memory of ${honoreeLabel} is pinned to the top of your collection and is always part of the final tribute.`
              : isOrganizer
                ? `Add your own memory of ${honoreeDisplay} first — it becomes the heart of the ${deliverable}. You’ll invite others to add theirs next.`
                : inviter
                  ? `${inviter} is gathering memories of ${honoreeDisplay} into one ${deliverable} — and you’re invited to add yours. It takes a couple of minutes. No account to create, and you don’t pay anything.`
                  : `You’ve been invited to add a memory of ${honoreeDisplay}, woven together with others into one ${deliverable}. It takes a couple of minutes. No account to create, and you don’t pay anything.`}
          </p>
        </div>

        <form ref={formRef} onSubmit={handleSubmit} noValidate className="space-y-5">
          <SectionCard heading="About you">
            {nameField && (
              <FieldRow
                field={nameField}
                value={values[NAME_FIELD] ?? ''}
                error={errors[NAME_FIELD]}
                onChange={(v) => setField(NAME_FIELD, v)}
              />
            )}
            {relationshipField && (
              <FieldRow
                field={relationshipField}
                value={values[RELATIONSHIP_FIELD] ?? ''}
                error={errors[RELATIONSHIP_FIELD]}
                onChange={(v) => setField(RELATIONSHIP_FIELD, v)}
              />
            )}
            {!isOrganizer && (
              <div>
                <label htmlFor="contributor-email" className="mb-1.5 block text-sm font-medium text-foreground">
                  Your email
                </label>
                <input
                  id="contributor-email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  readOnly={emailLocked}
                  aria-invalid={!!emailError || undefined}
                  aria-describedby={emailError ? 'contributor-email-error' : undefined}
                  className={`w-full rounded-md border px-3 py-2 text-sm ${
                    emailLocked
                      ? 'cursor-not-allowed border-border bg-muted text-muted-foreground'
                      : 'bg-background'
                  } ${emailError ? 'border-destructive bg-background focus-visible:ring-destructive' : 'border-border'}`}
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => {
                    if (emailLocked) return;
                    setEmail(e.target.value);
                    if (emailError) setEmailError(null);
                  }}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {emailLocked
                    ? 'This invite was sent to you here — it keeps your memory tied to your name. We won’t publish it or sign you up for anything.'
                    : 'So we can keep memories tidy — one per person. We won’t publish it or sign you up for anything.'}
                </p>
                {emailError && (
                  <p id="contributor-email-error" className="mt-1 text-xs text-destructive" role="alert">
                    {emailError}
                  </p>
                )}
              </div>
            )}
          </SectionCard>

          <SectionCard heading="Your memory">
            {/* Layer 1 — elicitation scaffolding. */}
            <p className="text-sm text-muted-foreground leading-relaxed -mt-1">
              What did they do that was so <em>them</em>? A phrase they always said, a small moment
              that stuck with you, the way they made you feel. Specific beats general — one real
              story is worth more than a list of nice words.
            </p>
            {memoryField && (
              <FieldRow
                field={memoryField}
                value={memoryValue}
                error={errors[MEMORY_FIELD]}
                rows={8}
                onChange={(v) => setField(MEMORY_FIELD, v)}
              >
                <WordCounter value={memoryValue} bands={MEMORY_BANDS} />
              </FieldRow>
            )}
          </SectionCard>

          <SectionCard heading="A little more (optional)">
            <div>
              <label htmlFor="x-quality" className="mb-1.5 block text-sm font-medium text-foreground">
                A word or two that captured them
              </label>
              <input
                id="x-quality"
                type="text"
                maxLength={120}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="e.g. endlessly generous; quietly funny"
                value={extras.quality}
                onChange={(e) => setExtras((p) => ({ ...p, quality: e.target.value }))}
              />
            </div>
            <div className="mt-4">
              <label htmlFor="x-moment" className="mb-1.5 block text-sm font-medium text-foreground">
                A favorite moment, if one comes to mind
              </label>
              <textarea
                id="x-moment"
                rows={3}
                maxLength={600}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="A specific moment or story — even a small one."
                value={extras.favoriteMoment}
                onChange={(e) => setExtras((p) => ({ ...p, favoriteMoment: e.target.value }))}
              />
            </div>
            {!isOrganizer && (
              <div className="mt-4">
                <label htmlFor="x-avoid" className="mb-1.5 block text-sm font-medium text-foreground">
                  Anything you’d rather wasn’t included?
                </label>
                <textarea
                  id="x-avoid"
                  rows={2}
                  maxLength={400}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  placeholder="Optional — we’ll keep it out of the tribute."
                  value={extras.avoid}
                  onChange={(e) => setExtras((p) => ({ ...p, avoid: e.target.value }))}
                />
              </div>
            )}
          </SectionCard>

          {blockedReason && (
            <div ref={blockedPanelRef}>
              <MemoriesBlockedPanel
                reason={blockedReason}
                onOverride={() => void doSubmit(true)}
                overrideLabel="Generate with what I’ve shared"
              />
            </div>
          )}

          {/* Privacy disclosure + consent (§4). The error ring hugs only the
              checkbox + its label — not the whole card. */}
          <SectionCard>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The person collecting this will read it and may include it in one combined tribute.
              Your memory isn’t published publicly. You don’t pay, and we use your email only to keep
              memories to one per person — see our <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-foreground">Privacy Policy</a>.
              You can ask us to remove your memory any time at{' '}
              <a href="mailto:hello@wordsbywtm.com" className="underline hover:text-foreground">hello@wordsbywtm.com</a>.
              At the organizer’s deadline, your memory may be woven into the tribute; if the collection isn’t finalized, it’s deleted.
            </p>
            <label
              ref={consentRef}
              className={`flex w-fit items-start gap-3 rounded-lg p-2 cursor-pointer group transition-shadow ${
                consentError ? 'ring-2 ring-destructive' : ''
              }`}
            >
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
                I’m okay with my memory being woven into a tribute for {honoreeLabel}, which the
                organizer will receive.
              </span>
            </label>
            {consentError && (
              <p className="text-xs text-destructive" role="alert">
                Please check the box above so we can include your memory.
              </p>
            )}
          </SectionCard>

          {submitError && (
            <ErrorBanner
              message={submitError.message}
              retryable={submitError.retryable}
              onRetry={() => void doSubmit()}
              submitting={submitting}
            />
          )}

          <Button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full py-6 text-sm font-semibold"
          >
            {submitting ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size={16} /> Sending your memory…
              </span>
            ) : isOrganizer ? (
              'Add my memory & continue'
            ) : (
              'Add my memory'
            )}
          </Button>

          {isOrganizer && onSkip && (
            <button
              type="button"
              onClick={onSkip}
              disabled={submitting}
              className="w-full text-center text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Skip for now — I’ll add mine later
            </button>
          )}

          <p className="text-center text-xs text-muted-foreground pb-4">
            {memoryWc > 0 && memoryWc < 20
              ? 'A little more detail and you’re set.'
              : isOrganizer
                ? 'You can add more memories — and invite others — next.'
                : 'Your memory stays private to the organizer.'}
          </p>
        </form>
      </div>
    </main>
  );
}

// Fold the optional fields into the memory text so they enrich synthesis without
// a backend schema change. The main memory still carries the 3-layer guard.
export function composeMemory(
  memory: string,
  extras: { quality: string; favoriteMoment: string; avoid: string },
  isOrganizer: boolean,
): string {
  const parts = [memory.trim()];
  if (extras.quality.trim()) parts.push(`A word that captured them: ${extras.quality.trim()}`);
  if (extras.favoriteMoment.trim()) parts.push(`A favorite moment: ${extras.favoriteMoment.trim()}`);
  // Contributor-level "leave out" note (organizer sets this collection-wide at create).
  if (!isOrganizer && extras.avoid.trim()) parts.push(`Please leave out: ${extras.avoid.trim()}`);
  return parts.join('\n\n');
}

function CenteredCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full text-center">{children}</div>
    </main>
  );
}
