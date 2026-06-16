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
import { FeedbackWidget } from '@eilon-shai/venture-core/components';
import { SectionCard, FieldRow, Spinner } from '@/components/forked/FormPrimitives';
import { EditPackCard } from './EditPackCard';

// Download the tribute as a Word-openable .doc (HTML payload — no dependency).
function downloadWord(honoree: string, content: string) {
  const safe = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const paragraphs = content
    .split(/\n{2,}/)
    .map((p) => `<p style="margin:0 0 14pt 0">${safe(p).replace(/\n/g, '<br/>')}</p>`)
    .join('');
  const html =
    `<!DOCTYPE html><html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">` +
    `<head><meta charset="utf-8"><title>A tribute for ${safe(honoree)}</title></head>` +
    `<body style="font-family:Georgia,serif;font-size:13pt;line-height:1.6;color:#1a1a1a">` +
    `<h1 style="font-size:18pt;text-align:center;margin:0 0 18pt 0">A tribute for ${safe(honoree)}</h1>${paragraphs}</body></html>`;
  const blob = new Blob(['﻿', html], { type: 'application/msword' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Tribute for ${honoree || 'them'}.doc`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
}

type Phase = 'prefs' | 'generating' | 'done' | 'error';

function ResultFlowInner(props: ResultFlowProps) {
  const params = useSearchParams();
  const txnId = params.get('txn') ?? params.get('txnId') ?? '';

  const [phase, setPhase] = React.useState<Phase>(txnId ? 'prefs' : 'error');
  const [tone, setTone] = React.useState('balanced');
  const [length, setLength] = React.useState('medium');
  const [thingsToAvoid, setThingsToAvoid] = React.useState('');
  const [additionalContext, setAdditionalContext] = React.useState('');
  const [content, setContent] = React.useState('');
  const [honoree, setHonoree] = React.useState('');
  const [count, setCount] = React.useState(0);
  const [error, setError] = React.useState<string | null>(
    txnId ? null : 'We couldn’t find your tribute session. Please reopen the link from your collection.',
  );
  const [copied, setCopied] = React.useState(false);
  // The feedback prompt eases in a few seconds after the tribute appears, so it
  // never competes with the first read (matches TributeWords).
  const [showFeedback, setShowFeedback] = React.useState(false);
  React.useEffect(() => {
    if (phase !== 'done') return;
    const t = setTimeout(() => setShowFeedback(true), 6000);
    return () => clearTimeout(t);
  }, [phase]);

  const generate = React.useCallback(async () => {
    setPhase('generating');
    setError(null);
    const synthesisPrefs = {
      tone,
      length,
      ...(thingsToAvoid.trim() ? { thingsToAvoid: thingsToAvoid.trim() } : {}),
      ...(additionalContext.trim() ? { additionalContext: additionalContext.trim() } : {}),
    };
    // Generation can take a moment; retry on 202 (payment still settling).
    for (let attempt = 0; attempt < 8; attempt++) {
      try {
        const res = await fetch('/api/collection/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ transactionId: txnId, synthesisPrefs }),
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
  }, [txnId, tone, length, thingsToAvoid, additionalContext]);

  // ---- prefs ----
  if (phase === 'prefs') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-12">
        <header className="mb-8 text-center">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">{props.occasionTitle} tribute</p>
          <h1 className="font-serif text-3xl md:text-4xl text-foreground mb-3">How should the tribute read?</h1>
          <p className="mx-auto max-w-md text-sm leading-relaxed text-muted-foreground">
            Your payment is complete. Choose how you’d like the memories woven together, then we’ll create your tribute.
          </p>
        </header>
        <form
          onSubmit={(e) => { e.preventDefault(); void generate(); }}
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
          <Button type="submit" size="lg" className="w-full rounded-full py-6 text-sm font-semibold">
            Create my tribute
          </Button>
        </form>
      </main>
    );
  }

  // ---- generating ----
  if (phase === 'generating') {
    return (
      <main className="mx-auto w-full max-w-2xl px-4 py-20 text-center">
        <div className="mb-6 flex justify-center"><Spinner size={28} /></div>
        <h1 className="font-serif text-2xl text-foreground">Weaving the memories together…</h1>
        <p className="mt-3 text-sm text-muted-foreground">This takes a moment. Please keep this page open.</p>
      </main>
    );
  }

  // ---- error ----
  if (phase === 'error') {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-20 text-center">
        <h1 className="font-serif text-2xl text-foreground">We hit a snag</h1>
        <p className="mt-3 text-sm text-muted-foreground">{error}</p>
        <p className="mt-6 text-sm text-muted-foreground">
          Need help? <a href={`mailto:${props.supportEmail}`} className="text-primary underline">{props.supportEmail}</a>
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
          onClick={() => downloadWord(honoree, content)}
        >
          Download as Word
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

      <p className="mt-4 text-center text-xs text-muted-foreground">
        We’ve also emailed this tribute to you, ready to read aloud.
      </p>

      {props.editPackPriceId ? (
        <EditPackCard priceId={props.editPackPriceId} resultPath={props.resultPath} />
      ) : null}

      {/* Feedback — eases in a few seconds after the tribute is shown. */}
      {showFeedback && txnId ? (
        <div className="mt-12">
          <FeedbackWidget
            transactionId={txnId}
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
