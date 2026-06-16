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

export interface ContributorFormProps {
  shareToken: string;
  occasionTitle: string;
  /** Generic pre-submit honoree label (no public read exists before submit). */
  honoreeLabel: string;
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
}

export function ContributorForm({
  shareToken,
  occasionTitle,
  honoreeLabel,
  fields,
  homeHref,
  variant = 'contributor',
  onSubmitted,
  onSkip,
}: ContributorFormProps) {
  const isOrganizer = variant === 'organizer';
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
  const [consent, setConsent] = React.useState(false);
  const [consentError, setConsentError] = React.useState(false);
  const [blockedReason, setBlockedReason] = React.useState<string | null>(null);
  // Optional content fields, composed into the memory text before submit.
  const [extras, setExtras] = React.useState({ quality: '', favoriteMoment: '', avoid: '' });

  const [phase, setPhase] = React.useState<Phase>('form');
  const [submitError, setSubmitError] = React.useState<SubmitErrorState | null>(null);
  const [resultHonoree, setResultHonoree] = React.useState<string>('');
  // Terminal collection-state screens that replace the whole form.
  const [terminal, setTerminal] = React.useState<null | 'closed' | 'notfound'>(null);

  const blockedPanelRef = React.useRef<HTMLDivElement | null>(null);
  React.useEffect(() => {
    if (blockedReason && blockedPanelRef.current) {
      blockedPanelRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [blockedReason]);

  const setField = React.useCallback((name: string, v: string) => {
    setValues((prev) => ({ ...prev, [name]: v }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
    if (name === MEMORY_FIELD) setBlockedReason(null);
  }, []);

  const memoryValue = values[MEMORY_FIELD] ?? '';
  const memoryWc = wordCount(memoryValue);

  const doSubmit = React.useCallback(async () => {
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
      return;
    }

    // Consent gate (T-COLL-008).
    if (!consent) {
      setConsentError(true);
      return;
    }

    // Layer 2 — the exact server guard, run client-side for live coaching.
    const check = validateMemoriesField(memoryValue);
    if (!check.valid) {
      setBlockedReason(check.reason);
      return;
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
          relationship: (values[RELATIONSHIP_FIELD] ?? '').trim() || undefined,
          memory: composeMemory(memoryValue, extras, isOrganizer),
          consent: true,
          idempotencyKey: idempotencyKeyRef.current,
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
      setPhase('form');
      if (code === 'INVALID_MEMORY') {
        // Surface the server's reason inline in the amber panel.
        setBlockedReason(data.error ?? 'Please add a little more detail.');
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
  }, [consent, memoryValue, shareToken, values, extras, isOrganizer, onSubmitted]);

  const handleSubmit = React.useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      void doSubmit();
    },
    [doSubmit],
  );

  // ---- terminal: closed / not-found ----------------------------------------
  if (terminal) {
    return (
      <CenteredCard>
        <div className="text-5xl mb-6" aria-hidden="true">
          {terminal === 'closed' ? '🕯️' : '🔗'}
        </div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
          {terminal === 'closed' ? 'This collection has closed' : 'This link isn’t active'}
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {terminal === 'closed'
            ? 'It’s no longer accepting new memories. If you’d still like to share something, reach out to whoever invited you.'
            : 'We couldn’t find a collection for this link. Ask whoever invited you for a fresh one.'}
        </p>
      </CenteredCard>
    );
  }

  // ---- success thank-you ---------------------------------------------------
  if (phase === 'done') {
    const who = resultHonoree || 'them';
    return (
      <CenteredCard>
        <div className="text-5xl mb-6" aria-hidden="true">
          🤍
        </div>
        <h1 className="font-serif text-2xl md:text-3xl text-foreground mb-3">
          Thank you — your memory of {who} has been added
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed mb-8">
          The person gathering these will read it and may weave it into one combined tribute. That’s
          everything we need from you.
        </p>

        <button
          type="button"
          onClick={() => {
            // Allow sharing another memory: fresh key, reset form.
            idempotencyKeyRef.current =
              typeof crypto !== 'undefined' && crypto.randomUUID
                ? crypto.randomUUID()
                : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
            setValues({ [NAME_FIELD]: '', [RELATIONSHIP_FIELD]: '', [MEMORY_FIELD]: '' });
            setExtras({ quality: '', favoriteMoment: '', avoid: '' });
            setConsent(false);
            setResultHonoree('');
            setPhase('form');
          }}
          className="text-sm font-medium text-primary hover:opacity-80 transition-opacity mb-10"
        >
          Share another memory →
        </button>

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
            {isOrganizer ? 'Start with your own memory' : 'Share a memory'}
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
            {isOrganizer
              ? `Add your own memory of ${honoreeLabel} first — it becomes the heart of the tribute. You’ll invite others to add theirs next.`
              : `Someone invited you to add a memory of ${honoreeLabel}. It takes a couple of minutes, and it joins others into one combined tribute. No account, and you don’t pay anything.`}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-5">
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
              <MemoriesBlockedPanel reason={blockedReason} />
            </div>
          )}

          {/* Privacy disclosure + consent (§4). */}
          <SectionCard>
            <p className="text-xs text-muted-foreground leading-relaxed">
              The person collecting this will read it and may include it in one combined tribute.
              Your memory isn’t published publicly. You don’t pay and don’t make an account.
            </p>
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
function composeMemory(
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
