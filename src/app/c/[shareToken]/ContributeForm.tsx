'use client';

import { useState } from 'react';
import type { FormFieldConfig } from '@eilon-shai/venture-core/types';

interface Props {
  occasion: string;
  shareToken: string;
  honoreeName: string;
  accent: string;
  fields: FormFieldConfig[];
  consentVersion: string;
  closed: boolean;
}

// Stable-ish idempotency key per mounted form (avoids Math.random at module load).
function makeKey() {
  return `c_${Date.now().toString(36)}_${Math.floor(performance.now()).toString(36)}`;
}

export default function ContributeForm({ occasion, shareToken, honoreeName, accent, fields, consentVersion, closed }: Props) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  if (closed) {
    return (
      <div className="card" style={{ borderTop: `3px solid ${accent}`, textAlign: 'center' }}>
        <h1 style={{ color: accent, fontSize: '1.4rem' }}>This collection is closed</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
          Thank you — the tribute for {honoreeName} is no longer accepting new memories.
        </p>
      </div>
    );
  }

  if (done) {
    return (
      <div className="card" style={{ borderTop: `3px solid ${accent}`, textAlign: 'center' }}>
        <h1 style={{ color: accent, fontSize: '1.5rem' }}>Thank you</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.6rem', lineHeight: 1.6 }}>
          Your memory of {honoreeName} has been added. It will join the others in one tribute.
        </p>
        <button className="btn btn-ghost" style={{ color: accent, marginTop: '1.5rem' }} onClick={() => { setValues({}); setConsent(false); setDone(false); }}>
          Add another memory
        </button>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!consent) { setError('Please confirm consent to continue.'); return; }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/collection/${occasion}/contribute`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          shareToken,
          contributorName: values.contributorName ?? '',
          relationship: values.relationship ?? null,
          memory: values.memory ?? '',
          consent: true,
          idempotencyKey: makeKey(),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error ?? 'Something went wrong.'); return; }
      setDone(true);
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ borderTop: `3px solid ${accent}` }}>
      <h1 style={{ color: accent, fontSize: '1.5rem' }}>Share a memory of {honoreeName}</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', marginBottom: '1.5rem', lineHeight: 1.55 }}>
        Whatever you write will be woven together with memories from others into one tribute. A moment, a
        quality, a story — anything you remember.
      </p>

      {fields.map((f) => (
        <div key={f.name} style={{ marginBottom: '1.1rem' }}>
          <label className="label" htmlFor={f.name}>
            {f.label}{!f.required && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> (optional)</span>}
          </label>
          {f.type === 'textarea' ? (
            <textarea
              id={f.name}
              className="field"
              rows={6}
              required={f.required}
              maxLength={f.maxLength}
              placeholder={f.placeholder}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          ) : (
            <input
              id={f.name}
              className="field"
              type="text"
              required={f.required}
              maxLength={f.maxLength}
              placeholder={f.placeholder}
              value={values[f.name] ?? ''}
              onChange={(e) => setValues((v) => ({ ...v, [f.name]: e.target.value }))}
            />
          )}
        </div>
      ))}

      <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start', fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
        <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} style={{ marginTop: '0.2rem' }} />
        <span>
          I&rsquo;m sharing this memory so it can be included in a tribute for {honoreeName}, and I understand
          the organizer will be able to read and include it.
        </span>
      </label>

      {error && <p style={{ color: '#b4413c', marginTop: '1rem' }}>{error}</p>}

      <button type="submit" className="btn" disabled={submitting} style={{ marginTop: '1.5rem', background: accent }}>
        {submitting ? 'Sending…' : 'Add my memory'}
      </button>
    </form>
  );
}
