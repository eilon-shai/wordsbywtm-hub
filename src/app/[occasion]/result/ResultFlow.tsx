'use client';

// ---------------------------------------------------------------------------
// S8 — Result flow. After payment the organizer chooses HOW the tribute should
// read (tone/length/avoid/context), then we generate with those prefs and show
// the result. The "how should it read" controls live here (not on create) so
// the style is decided at the moment the final tribute is produced.
//
// Generation is still pay-before-generate + one-time-use (server-enforced); the
// prefs are passed in the generate POST and merged server-side (venture-core
// collection-generate-handler) into buildSynthesisPrompt.
// ---------------------------------------------------------------------------

import * as React from 'react';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import type { FormFieldConfig } from '@eilon-shai/venture-core/types';
import { Button } from '@eilon-shai/venture-core/ui';
import {
  FeedbackWidget,
  initSharedPaddle,
  getSharedPaddle,
  setActiveTransaction,
} from '@eilon-shai/venture-core/components';
import { SectionCard, FieldRow, Spinner } from '@/components/forked/FormPrimitives';

// sessionStorage key for the chosen synthesis prefs — persisted right before we
// open Paddle on the unpaid path so they survive the redirect back with ?txn=.
const PREFS_KEY = 'wtm:collection-prefs';

// Download the tribute as a real PDF. jsPDF is dynamically imported so it only
// loads when the organizer actually clicks download (keeps the page bundle lean).
async function downloadPdf(honoree: string, content: string) {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const margin = 72; // 1 inch
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const maxWidth = pageWidth - margin * 2;
  const lineHeight = 18;
  let y = margin;

  // Title (serif — jsPDF ships Times built-in).
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  const titleLines = doc.splitTextToSize(`A tribute for ${honoree}`, maxWidth) as string[];
  doc.text(titleLines, pageWidth / 2, y, { align: 'center' });
  y += titleLines.length * 22 + 18;

  // Body.
  doc.setFont('times', 'normal');
  doc.setFontSize(12);
  for (const para of content.split(/\n{2,}/)) {
    const lines = doc.splitTextToSize(para.replace(/\n/g, ' '), maxWidth) as string[];
    for (const line of lines) {
      if (y > pageHeight - margin) {
        doc.addPage();
        y = margin;
      }
      doc.text(line, margin, y);
      y += lineHeight;
    }
    y += lineHeight * 0.6; // paragraph gap
  }

  const safeName = (honoree || 'them').replace(/[\\/:*?"<>|]+/g, '').trim().slice(0, 80) || 'them';
  doc.save(`Tribute for ${safeName}.pdf`);
}

const TONE_FIELD: FormFieldConfig = {
  name: 'tone', type: 'select', label: 'Tone', required: false,
  options: [
    { value: 'solemn', label: 'Solemn & reverent' },
    { value: 'balanced', label: 'Balanced' },
    { value: 'warm', label: 'Warm & celebratory' },
  ],
};
const LENGTH_FIELD: FormFieldConfig = {
  name: 'length', type: 'select', label: 'Length', required: false,
  options: [
    { value: 'short', label: 'Short (~3 min)' },
    { value: 'medium', label: 'Medium (~5 min)' },
    { value: 'long', label: 'Long (~8 min)' },
  ],
};
const AVOID_FIELD: FormFieldConfig = {
  name: 'thingsToAvoid', type: 'textarea', label: 'Anything to leave out?',
  placeholder: 'Topics, details, or names you’d rather the tribute not mention.', required: false, maxLength: 1000,
};
const CONTEXT_FIELD: FormFieldConfig = {
  name: 'additionalContext', type: 'textarea', label: 'Anything else we should know?',
  placeholder: 'Faith, circumstances, or context to weave in sensitively.', required: false, maxLength: 1000,
};

interface ResultFlowProps {
  occasion: string;
  occasionTitle: string;
  accent: string;
  supportEmail: string;
  homeHref: string;
  resultPath: string;
  editPackPriceId?: string;
  /** Organizer's email — prefilled (read-only) into the Paddle checkout. */
  organizerEmail?: string;
  /** True when the organizer paid in advance — no Terms, no charge at finalize. */
  paidInAdvance?: boolean;
  /** Paddle txn that paid for the collection — feedback id for the paid-in-advance path. */
  paidTxnId?: string;
}

type Phase = 'checking' | 'prefs' | 'generating' | 'done' | 'error';

function ResultFlowInner(props: ResultFlowProps) {
  const params = useSearchParams();
  const txnId = params.get('txn') ?? params.get('txnId') ?? '';
  // The dashboard sends ?t={adminToken} (no txn) to the prefs step. Both the
  // pay-at-finalize and paid-in-advance flows now decide HOW to read here, then:
  //   - paid-in-advance → /api/collection/finalize-paid (no charge)
  //   - unpaid          → /api/collection/checkout → Paddle → return with ?txn=
  //                       → /api/collection/generate (server verifies the txn).
  const urlToken = params.get('t') ?? '';
  // Admin token, made durable: known from the URL or props, and mirrored to
  // localStorage so a payer returning in a fresh session/tab can still get back
  // to /collect/manage to retry finalize.
  const ADMIN_KEY = 'wtm:collection-admin';
  const adminToken =
    urlToken ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem(ADMIN_KEY) || localStorage.getItem(ADMIN_KEY) || ''
      : '') ||
    '';
  React.useEffect(() => {
    if (!urlToken || typeof window === 'undefined') return;
    try {
      sessionStorage.setItem(ADMIN_KEY, urlToken);
    } catch {
      /* sessionStorage unavailable */
    }
    try {
      localStorage.setItem(ADMIN_KEY, urlToken);
    } catch {
      /* localStorage unavailable */
    }
  }, [urlToken]);
  const hasToken = !!adminToken;
  const canStart = !!txnId || hasToken;

  // Initial phase:
  //   - txn present  → auto-generate (we just returned from Paddle).
  //   - token only   → check for an existing tribute first (re-view), else prefs.
  //   - neither      → error.
  const [phase, setPhase] = React.useState<Phase>(txnId ? 'generating' : hasToken ? 'checking' : 'error');
  const [tone, setTone] = React.useState('balanced');
  const [length, setLength] = React.useState('medium');
  const [thingsToAvoid, setThingsToAvoid] = React.useState('');
  const [additionalContext, setAdditionalContext] = React.useState('');
  const [content, setContent] = React.useState('');
  const [honoree, setHonoree] = React.useState('');
  const [count, setCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(
    canStart ? null : 'We couldn’t find your tribute session. Please reopen the link from your collection.',
  );
  const [copied, setCopied] = React.useState(false);
  // Prefs-screen submit state.
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = React.useState(false);
  const [termsError, setTermsError] = React.useState(false);
  const termsRef = React.useRef<HTMLLabelElement | null>(null);
  // Paid-in-advance one-way confirmation.
  const [confirmingPaid, setConfirmingPaid] = React.useState(false);
  // The feedback prompt eases in a few seconds after the tribute appears, so it
  // never competes with the first read. But if it was ALREADY submitted (the
  // widget stores the rating under `${slug}_feedback_${txn}` in localStorage),
  // show it immediately — there's no first-read to protect, it's just the
  // "thanks" state.
  const [showFeedback, setShowFeedback] = React.useState(false);
  React.useEffect(() => {
    if (phase !== 'done') return;
    const feedbackId = txnId || props.paidTxnId || '';
    let alreadyGiven = false;
    try {
      alreadyGiven = !!(feedbackId && localStorage.getItem(`${props.occasion}_feedback_${feedbackId}`));
    } catch {
      /* localStorage unavailable — treat as not given */
    }
    if (alreadyGiven) {
      setShowFeedback(true);
      return;
    }
    const t = setTimeout(() => setShowFeedback(true), 2500);
    return () => clearTimeout(t);
  }, [phase, txnId, props.paidTxnId, props.occasion]);

  // Remember the last generate attempt (mode + prefs) so the error phase can
  // offer a safe retry — the generate endpoint re-verifies the Paddle txn fresh
  // on every call (no one-time consume), so re-invoking is replayable.
  type GeneratePrefs = { tone: string; length: string; thingsToAvoid?: string; additionalContext?: string };
  const lastAttempt = React.useRef<{ mode: 'txn' | 'paid'; prefs: GeneratePrefs } | null>(null);

  // generate(): runs the actual synthesis POST + 202-retry loop and shows the
  // result. `prefs` is supplied explicitly so the two entry points can pass
  // either the live prefs-form state or the sessionStorage-restored prefs.
  const generate = React.useCallback(
    async (
      mode: 'txn' | 'paid',
      prefs: GeneratePrefs,
    ) => {
      lastAttempt.current = { mode, prefs };
      setPhase('generating');
      setError(null);
      const synthesisPrefs = {
        tone: prefs.tone,
        length: prefs.length,
        ...(prefs.thingsToAvoid?.trim() ? { thingsToAvoid: prefs.thingsToAvoid.trim() } : {}),
        ...(prefs.additionalContext?.trim() ? { additionalContext: prefs.additionalContext.trim() } : {}),
      };
      // Two finalize paths: pay-at-finalize verifies the txn; paid-in-advance uses
      // the admin token (server requires paid_at — still pay-before-generate).
      const endpoint = mode === 'paid' ? '/api/collection/finalize-paid' : '/api/collection/generate';
      const payload = mode === 'paid'
        ? { adminToken, synthesisPrefs }
        : { transactionId: txnId, synthesisPrefs };
      // Generation can take a moment; retry on 202 (payment still settling).
      for (let attempt = 0; attempt < 8; attempt++) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
          });
          if (res.status === 202) {
            await new Promise((r) => setTimeout(r, 2500));
            continue;
          }
          const d = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(d.error ?? 'Something went wrong creating your tribute.');
            setPhase('error');
            return;
          }
          setContent(d.content ?? '');
          setHonoree(d.honoreeName ?? '');
          setCount(d.contributorCount ?? 0);
          setPhase('done');
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
      setError('Creating your tribute is taking longer than expected. Please check your email shortly.');
      setPhase('error');
    },
    [txnId, adminToken],
  );

  // retryGenerate(): re-run the last attempt after a failure. Falls back to the
  // current prefs-form state, then sessionStorage-saved prefs, if no attempt was
  // remembered. The mode is inferred (paid-in-advance vs txn) the same way the
  // auto-generate path does.
  const retryGenerate = React.useCallback(() => {
    const last = lastAttempt.current;
    if (last) {
      void generate(last.mode, last.prefs);
      return;
    }
    let prefs: GeneratePrefs = { tone, length, thingsToAvoid, additionalContext };
    try {
      const raw = sessionStorage.getItem(PREFS_KEY);
      if (raw) prefs = { ...prefs, ...JSON.parse(raw) };
    } catch {
      /* sessionStorage unavailable / bad JSON — use current form state */
    }
    void generate(props.paidInAdvance ? 'paid' : 'txn', prefs);
  }, [generate, tone, length, thingsToAvoid, additionalContext, props.paidInAdvance]);

  // ---- AUTO-GENERATE after returning from Paddle (?txn=) ----
  // We just paid; read the prefs stashed before checkout and generate. The server
  // verifies the txn — pay-before-generate stays enforced.
  React.useEffect(() => {
    if (!txnId) return;
    let saved: { tone: string; length: string; thingsToAvoid?: string; additionalContext?: string } = {
      tone: 'balanced',
      length: 'medium',
    };
    try {
      const raw = sessionStorage.getItem(PREFS_KEY);
      if (raw) saved = { ...saved, ...JSON.parse(raw) };
    } catch {
      /* sessionStorage unavailable / bad JSON — fall back to defaults */
    }
    void generate('txn', saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Re-view: token-only open. If a tribute already exists show it read-only;
  // otherwise fall through to the prefs flow (FE-001). ----
  React.useEffect(() => {
    if (txnId || !hasToken) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/collection/tribute', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ adminToken }),
        });
        if (cancelled) return;
        if (res.ok) {
          const d = await res.json().catch(() => ({}));
          setContent(d.content ?? '');
          setHonoree(d.honoreeName ?? '');
          setPhase('done');
          return;
        }
        setPhase('prefs'); // not generated yet → let them choose prefs + finalize
      } catch {
        if (!cancelled) setPhase('prefs');
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Prefs-screen submit ----
  const onPrefsSubmit = React.useCallback(async () => {
    if (submitting) return;
    const prefs = { tone, length, thingsToAvoid, additionalContext };

    // Persist the admin token so the post-payment (txn) done view can link back
    // to the organizer's collection even after the Paddle redirect drops ?t=.
    if (adminToken) {
      try {
        sessionStorage.setItem(ADMIN_KEY, adminToken);
      } catch {
        /* sessionStorage unavailable — back link just won't render */
      }
      try {
        localStorage.setItem(ADMIN_KEY, adminToken);
      } catch {
        /* localStorage unavailable */
      }
    }

    // Paid-in-advance: no charge — show a one-way confirm, then finalize-paid.
    if (props.paidInAdvance) {
      setConfirmingPaid(true);
      return;
    }

    // Unpaid: require Terms, persist prefs, then start checkout.
    if (!termsAccepted) {
      setTermsError(true);
      termsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      sessionStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch {
      /* sessionStorage unavailable — defaults will be used after redirect */
    }
    try {
      const res = await fetch('/api/collection/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminToken }),
      });
      const json = (await res.json().catch(() => ({}))) as {
        transactionId?: string;
        redirectUrl?: string;
        error?: string;
        code?: string;
      };

      if (!res.ok) {
        if (json.code === 'ALREADY_USED') {
          // Already finalized elsewhere — re-check for the tribute and show it.
          setSubmitting(false);
          setPhase('checking');
          try {
            const t = await fetch('/api/collection/tribute', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ adminToken }),
            });
            if (t.ok) {
              const d = await t.json().catch(() => ({}));
              setContent(d.content ?? '');
              setHonoree(d.honoreeName ?? '');
              setPhase('done');
              return;
            }
          } catch {
            /* fall through to prefs */
          }
          setPhase('prefs');
          return;
        }
        if (json.code === 'NOT_ENOUGH_CONTRIBUTIONS') {
          setSubmitError('You need a few more memories before you can finalize.');
        } else {
          setSubmitError("Payment couldn't start — please try again. You haven't been charged.");
        }
        setSubmitting(false);
        return;
      }

      const { transactionId, redirectUrl } = json;
      if (!transactionId) {
        setSubmitError("Payment couldn't start — please try again. You haven't been charged.");
        setSubmitting(false);
        return;
      }

      // Mock mode: synthetic txn + redirectUrl — just navigate to the return URL.
      if (transactionId.startsWith('mock_')) {
        window.location.href =
          redirectUrl ?? `${props.resultPath}?txn=${encodeURIComponent(transactionId)}`;
        return;
      }

      // Real mode: open the Paddle overlay with the organizer's email prefilled +
      // locked. The shared callback redirects to `${resultPath}?txnId=...`.
      await initSharedPaddle(props.resultPath);
      setActiveTransaction(transactionId, 'basic', props.resultPath);
      const paddle = await getSharedPaddle();
      paddle.Checkout.open({
        transactionId,
        ...(props.organizerEmail
          ? { customer: { email: props.organizerEmail }, settings: { allowLogout: false } }
          : {}),
      });
      // Overlay is open; clear the spinner so the page stays interactive behind it.
      setSubmitting(false);
    } catch {
      setSubmitError("Payment couldn't start — please try again. You haven't been charged.");
      setSubmitting(false);
    }
  }, [
    submitting,
    tone,
    length,
    thingsToAvoid,
    additionalContext,
    termsAccepted,
    adminToken,
    props.paidInAdvance,
    props.organizerEmail,
    props.resultPath,
  ]);

  // The admin token to link back to the organizer's collection. Computed at
  // component scope so BOTH the error and done phases can offer "Back to your
  // collection". After a Paddle redirect ?t= is gone, so fall back to the
  // durable sessionStorage/localStorage copies.
  const backToken =
    adminToken ||
    (typeof window !== 'undefined'
      ? sessionStorage.getItem(ADMIN_KEY) || localStorage.getItem(ADMIN_KEY) || ''
      : '') ||
    '';

  // ---- checking for an existing tribute (re-view) ----
  if (phase === 'checking') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
        <div className="mb-6 flex justify-center"><Spinner size={28} /></div>
        <p className="text-sm text-muted-foreground">Opening your tribute…</p>
      </main>
    );
  }

  // ---- prefs ----
  if (phase === 'prefs') {
    const paid = !!props.paidInAdvance;
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">{props.occasionTitle} tribute</p>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">How should the tribute read?</h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            {paid
              ? 'Choose how you’d like the memories woven together, then we’ll create your tribute.'
              : 'Choose how you’d like the memories woven together. You’ll complete your one-time payment next, then we’ll create your tribute.'}
          </p>
        </header>
        <form
          onSubmit={(e) => { e.preventDefault(); void onPrefsSubmit(); }}
          className="space-y-5"
        >
          <SectionCard heading="How the tribute should read">
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FieldRow field={TONE_FIELD} value={tone} onChange={setTone} />
              <FieldRow field={LENGTH_FIELD} value={length} onChange={setLength} />
            </div>
            <FieldRow field={AVOID_FIELD} value={thingsToAvoid} rows={2} onChange={setThingsToAvoid} />
            <FieldRow field={CONTEXT_FIELD} value={additionalContext} rows={2} onChange={setAdditionalContext} />
          </SectionCard>

          {/* Unpaid path: pay-time consent waiver (matches the dashboard). Required
              before checkout. Paid-in-advance accepted terms at advance-pay. */}
          {!paid ? (
            <label
              ref={termsRef}
              className={`flex w-fit max-w-full items-start gap-2 rounded-lg p-2 cursor-pointer text-sm text-muted-foreground ${
                termsError ? 'ring-2 ring-destructive ring-offset-2 ring-offset-background' : ''
              }`}
            >
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  if (e.target.checked) setTermsError(false);
                }}
                disabled={submitting}
                className="mt-0.5 h-4 w-4 rounded border-border"
                aria-label="Agree to terms and start delivery"
              />
              <span>
                I agree to the{' '}
                <a href="/terms" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
                  Terms of Service
                </a>{' '}
                and{' '}
                <a href="/privacy" className="underline hover:text-foreground" target="_blank" rel="noopener noreferrer">
                  Privacy Policy
                </a>
                . By paying, I agree to start delivery immediately and understand this waives my EU 14-day withdrawal right.
              </span>
            </label>
          ) : null}

          {/* Paid-in-advance: inline one-way confirmation (no charge). */}
          {confirmingPaid ? (
            <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm" role="alertdialog" aria-label="Confirm creating the tribute">
              <p className="text-foreground">
                Create the tribute now? This weaves all included memories into the final tribute and closes the collection. This can’t be undone.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  disabled={submitting}
                  onClick={() => void generate('paid', { tone, length, thingsToAvoid, additionalContext })}
                >
                  Yes, create it
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={submitting}
                  onClick={() => setConfirmingPaid(false)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <Button
              type="submit"
              size="lg"
              disabled={submitting}
              className="w-full rounded-full py-6 text-sm font-semibold"
            >
              {submitting ? 'Starting…' : 'Create my tribute'}
            </Button>
          )}

          {submitError ? (
            <p className="text-center text-sm text-destructive" role="alert">{submitError}</p>
          ) : null}
        </form>
      </main>
    );
  }

  // ---- generating ----
  if (phase === 'generating') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-20 text-center" role="status" aria-live="polite">
        <div className="mb-6 flex justify-center"><Spinner size={28} /></div>
        <h1 className="font-serif text-2xl text-foreground">Weaving the memories together…</h1>
        <p className="mt-3 text-sm text-muted-foreground">This takes a moment. Please keep this page open.</p>
      </main>
    );
  }

  // ---- error ----
  if (phase === 'error') {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-20 text-center" role="alert">
        <h1 className="font-serif text-2xl text-foreground">We hit a snag</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        {/* Retry is safe: the generate endpoint re-verifies the Paddle txn fresh
            on every call (no one-time consume), so the payment is replayable. */}
        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            size="lg"
            className="rounded-full px-6"
            onClick={() => retryGenerate()}
          >
            Try again
          </Button>
        </div>
        {backToken ? (
          <div className="mt-5">
            <a
              href={`/collect/manage?t=${encodeURIComponent(backToken)}`}
              className="text-sm text-primary underline hover:text-foreground"
            >
              ← Back to your collection
            </a>
          </div>
        ) : null}
        <p className="mt-6 text-sm text-muted-foreground">
          Still stuck? <a href={`mailto:${props.supportEmail}`} className="text-primary underline">{props.supportEmail}</a>
        </p>
      </main>
    );
  }

  // ---- done ----
  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-12 sm:py-16">
      <header className="mb-10 text-center">
        <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
          A tribute for {honoree}
        </p>
        {count > 0 && (
          <p className="text-sm text-muted-foreground">
            Woven from {count} {count === 1 ? 'memory' : 'memories'}.
          </p>
        )}
      </header>

      {/* The tribute itself — generous serif typography, like a printed page. */}
      <article className="rounded-2xl border border-border bg-card px-6 py-10 shadow-sm sm:px-12 sm:py-14">
        <div className="speech-text mx-auto max-w-prose whitespace-pre-wrap font-serif text-[1.15rem] leading-[1.85] text-foreground/90">
          {content}
        </div>
      </article>

      {/* Actions */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button
          type="button"
          size="lg"
          className="rounded-full px-6"
          onClick={() => void downloadPdf(honoree, content)}
        >
          Download as PDF
        </Button>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="rounded-full px-6"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(content);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            } catch {
              /* clipboard blocked — the Word download still works */
            }
          }}
        >
          {copied ? 'Copied ✓' : 'Copy text'}
        </Button>
      </div>

      {backToken ? (
        <div className="mt-6 text-center">
          <a
            href={`/collect/manage?t=${encodeURIComponent(backToken)}`}
            className="text-sm text-primary underline hover:text-foreground"
          >
            ← Back to your collection
          </a>
        </div>
      ) : null}

      <p className="mt-4 text-center text-xs text-muted-foreground">
        We’ve also emailed this tribute to you, ready to read aloud.
      </p>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        Your collection and this tribute are automatically deleted about 30 days after creation, so please download or copy the text to keep a permanent copy.
      </p>

      {/* Edit & Refine pack intentionally NOT rendered: the regeneration backend
          isn't built yet, so charging for it would be a paid no-op (FE-002/UX-02/
          MKT-006). Re-enable EditPackCard once regen ships. */}

      {/* Feedback — eases in a few seconds after the tribute is shown. The feedback
          handler only accepts a Paddle/mock txn id, so use the finalize txn when we
          have it, else the collection's paid txn (paid-in-advance). The admin token
          would be rejected (400), so never send it as the id. */}
      {showFeedback && (txnId || props.paidTxnId) ? (
        <div className="mt-12">
          <FeedbackWidget
            transactionId={txnId || props.paidTxnId || ''}
            productSlug={props.occasion}
            feedbackEndpoint={`/api/${props.occasion}/feedback`}
          />
        </div>
      ) : null}
    </main>
  );
}

export function ResultFlow(props: ResultFlowProps) {
  return (
    <Suspense fallback={<main className="px-4 py-20 text-center text-muted-foreground">Loading…</main>}>
      <ResultFlowInner {...props} />
    </Suspense>
  );
}
