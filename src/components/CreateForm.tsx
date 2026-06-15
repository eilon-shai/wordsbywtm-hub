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
  const [fieldError, setFieldError] = React.useState<{ honoreeName?: string; organizerEmail?: string }>({});
  const [formError, setFormError] = React.useState<string | null>(null);
  const [result, setResult] = React.useState<CreateSuccess | null>(null);

  const price = `$${priceShown}`;

  function validate(): boolean {
    const errs: { honoreeName?: string; organizerEmail?: string } = {};
    if (!honoreeName.trim()) errs.honoreeName = 'Please add a name.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(organizerEmail.trim())) {
      errs.organizerEmail = 'Please enter a valid email address.';
    }
    setFieldError(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!validate()) return;
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
          <div>
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
              onChange={(e) => setHonoreeName(e.target.value)}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              The name of {honoreeLabel}.
            </p>
            {fieldError.honoreeName && <p className={FIELD_ERR}>{fieldError.honoreeName}</p>}
          </div>

          <div>
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
              onChange={(e) => setOrganizerEmail(e.target.value)}
              disabled={submitting}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              We email your private manage link to this address — that’s how you’ll come back to review and finish.
            </p>
            {fieldError.organizerEmail && <p className={FIELD_ERR}>{fieldError.organizerEmail}</p>}
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
