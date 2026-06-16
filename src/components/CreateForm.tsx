'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@eilon-shai/venture-core/ui';
import { Input } from '@eilon-shai/venture-core/ui';
import { Button } from '@eilon-shai/venture-core/ui';
import type { FormFieldConfig } from '@eilon-shai/venture-core/types';
import { InviteScreen } from './InviteScreen';
import { ContributorForm } from './ContributorForm';

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

type Phase = 'form' | 'submitting' | 'ownMemory' | 'invite';

const FIELD_ERR = 'text-destructive text-sm mt-1';

export function CreateForm({ occasion, honoreeLabel, priceShown, tier, occasionTitle, contributorFields }: CreateFormProps) {
  const [phase, setPhase] = React.useState<Phase>('form');
  const [honoreeName, setHonoreeName] = React.useState('');
  const [organizerEmail, setOrganizerEmail] = React.useState('');
  const [deadline, setDeadline] = React.useState('');
  // Organizer "full form" synthesis controls → stored as collection synthesisPrefs.
  const [tone, setTone] = React.useState('balanced');
  const [length, setLength] = React.useState('medium');
  const [thingsToAvoid, setThingsToAvoid] = React.useState('');
  const [additionalContext, setAdditionalContext] = React.useState('');
  const [fieldError, setFieldError] = React.useState<{ honoreeName?: string; organizerEmail?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CreateSuccess | null>(null);

  const price = `$${priceShown}`;

  const honoreeRef = React.useRef<HTMLDivElement | null>(null);
  const emailRef = React.useRef<HTMLDivElement | null>(null);

  function validate(): { honoreeName?: string; organizerEmail?: string } {
    const errs: { honoreeName?: string; organizerEmail?: string } = {};
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      const target = errs.honoreeName ? honoreeRef.current : emailRef.current;
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPhase('submitting');

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
          synthesisPrefs: {
            tone,
            length,
            ...(thingsToAvoid.trim() ? { thingsToAvoid: thingsToAvoid.trim() } : {}),
            ...(additionalContext.trim() ? { additionalContext: additionalContext.trim() } : {}),
          },
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
        setPhase('form');
        if (res.status === 429 || code === 'RATE_LIMIT') {
          setFormError('Too many attempts just now. Give it a moment and try again.');
        } else if (res.status === 503) {
          setFormError('Our service is briefly unavailable — your details are safe. Please try again in a moment.');
        } else if (code === 'INVALID_SESSION') {
          setFormError('Something in the form looked off. Please check your name and email and try again.');
        } else {
          setFormError('We couldn’t create your collection. Please try again.');
        }
        return;
      }

      const data: CreateSuccess = await res.json();
      setResult(data);
      setPhase('ownMemory');
    } catch {
      setPhase('form');
      setFormError('We couldn’t reach the server — your details are safe. Please try again.');
    }
  }

  // After create: the organizer adds their OWN first memory (the "main customer
  // form") via the same guarded ContributorForm, using the new collection's
  // shareToken, then continues to the invite screen.
  if (phase === 'ownMemory' && result) {
    const shareToken = (() => {
      try {
        return new URL(result.shareUrl).pathname.split('/c/')[1] ?? '';
      } catch {
        return '';
      }
    })();
    return (
      <ContributorForm
        variant="organizer"
        shareToken={shareToken}
        occasionTitle={occasionTitle}
        honoreeLabel={result.honoreeName || honoreeLabel}
        fields={contributorFields}
        homeHref={`/${occasion}`}
        onSubmitted={() => setPhase('invite')}
        onSkip={() => setPhase('invite')}
      />
    );
  }

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

  const submitting = phase === 'submitting';

  return (
    <Card className="mx-auto w-full max-w-xl">
      <CardHeader>
        <CardTitle className="font-serif text-2xl">Start your collection</CardTitle>
        <CardDescription>
          Free to create — you only pay once at the end, {price}, shown now so there are no surprises.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          <div
            ref={honoreeRef}
            className={
              fieldError.honoreeName
                ? 'rounded-xl p-3 -m-3 ring-2 ring-destructive ring-offset-2 ring-offset-background'
                : ''
            }
          >
            <label htmlFor="honoreeName" className="mb-1.5 block text-sm font-medium">
              Who are we honoring?
            </label>
            <Input
              id="honoreeName"
              name="honoreeName"
              autoFocus
              value={honoreeName}
              placeholder="Their name"
              aria-invalid={fieldError.honoreeName ? true : undefined}
              onChange={(e) => {
                setHonoreeName(e.target.value);
                if (fieldError.honoreeName) setFieldError((p) => ({ ...p, honoreeName: undefined }));
              }}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The name of {honoreeLabel}.
            </p>
            {fieldError.honoreeName && <p className={FIELD_ERR}>{fieldError.honoreeName}</p>}
          </div>

          <div
            ref={emailRef}
            className={
              fieldError.organizerEmail
                ? 'rounded-xl p-3 -m-3 ring-2 ring-destructive ring-offset-2 ring-offset-background'
                : ''
            }
          >
            <label htmlFor="organizerEmail" className="mb-1.5 block text-sm font-medium">
              Your email
            </label>
            <Input
              id="organizerEmail"
              name="organizerEmail"
              type="email"
              inputMode="email"
              value={organizerEmail}
              placeholder="you@example.com"
              aria-invalid={fieldError.organizerEmail ? true : undefined}
              onChange={(e) => {
                setOrganizerEmail(e.target.value);
                if (fieldError.organizerEmail) setFieldError((p) => ({ ...p, organizerEmail: undefined }));
              }}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              We email your private manage link to this address — that’s how you’ll come back to review and finish.
            </p>
            {fieldError.organizerEmail && <p className={FIELD_ERR}>{fieldError.organizerEmail}</p>}
          </div>

          <div className="rounded-lg border border-border bg-card/50 p-4">
            <p className="mb-3 text-sm font-semibold text-foreground">How should the tribute read?</p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="tone" className="mb-1.5 block text-sm font-medium">Tone</label>
                <select
                  id="tone"
                  className="field w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  disabled={submitting}
                >
                  <option value="solemn">Solemn &amp; reverent</option>
                  <option value="balanced">Balanced</option>
                  <option value="warm">Warm &amp; celebratory</option>
                </select>
              </div>
              <div>
                <label htmlFor="length" className="mb-1.5 block text-sm font-medium">Length</label>
                <select
                  id="length"
                  className="field w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  disabled={submitting}
                >
                  <option value="short">Short (~3 min)</option>
                  <option value="medium">Medium (~5 min)</option>
                  <option value="long">Long (~8 min)</option>
                </select>
              </div>
            </div>

            <div className="mt-4">
              <label htmlFor="thingsToAvoid" className="mb-1.5 block text-sm font-medium">
                Anything to leave out? <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="thingsToAvoid"
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Topics, details, or names you'd rather the tribute not mention."
                value={thingsToAvoid}
                onChange={(e) => setThingsToAvoid(e.target.value)}
                disabled={submitting}
                maxLength={1000}
              />
            </div>

            <div className="mt-4">
              <label htmlFor="additionalContext" className="mb-1.5 block text-sm font-medium">
                Anything else we should know? <span className="font-normal text-muted-foreground">(optional)</span>
              </label>
              <textarea
                id="additionalContext"
                rows={2}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm"
                placeholder="Faith, circumstances, or context to weave in sensitively."
                value={additionalContext}
                onChange={(e) => setAdditionalContext(e.target.value)}
                disabled={submitting}
                maxLength={1000}
              />
            </div>
          </div>

          <div>
            <label htmlFor="deadline" className="mb-1.5 block text-sm font-medium">
              Deadline <span className="font-normal text-muted-foreground">(optional)</span>
            </label>
            <Input
              id="deadline"
              name="deadline"
              type="date"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              When memories should close. You can share until then.
            </p>
          </div>

          {formError && (
            <div
              role="alert"
              className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {formError}
            </div>
          )}

          <Button type="submit" size="lg" className="h-11 w-full text-base" disabled={submitting}>
            {submitting ? 'Creating your collection…' : 'Create collection'}
          </Button>

          <p className="text-center text-xs text-muted-foreground">
            Free to create and collect · Pay once when you’re ready · No account needed
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
