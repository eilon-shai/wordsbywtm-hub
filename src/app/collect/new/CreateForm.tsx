'use client';

import { useState } from 'react';
import type { OccasionMeta } from '@/products/registry';

interface CreatedState {
  shareUrl: string;
  adminUrl: string;
  honoreeName: string;
}

export default function CreateForm({ occasion }: { occasion: OccasionMeta }) {
  const [organizerEmail, setEmail] = useState('');
  const [honoreeName, setHonoree] = useState('');
  const [deadline, setDeadline] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<CreatedState | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/collection/${occasion.slug}/create`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          organizerEmail,
          honoreeName,
          tier: 'full',
          deadline: deadline || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Something went wrong. Please try again.');
        return;
      }
      // Append occasion so shared links resolve without a DB round-trip.
      const withOcc = (u: string) => u + (u.includes('?') ? '&' : '?') + `occasion=${occasion.slug}`;
      setCreated({ shareUrl: withOcc(data.shareUrl), adminUrl: withOcc(data.adminUrl), honoreeName: data.honoreeName });
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (created) {
    return (
      <div className="card" style={{ borderTop: `3px solid ${occasion.accent}` }}>
        <h1 style={{ color: occasion.accent, fontSize: '1.6rem' }}>Your collection is ready</h1>
        <p style={{ color: 'var(--text-secondary)', lineHeight: 1.6, marginTop: '0.5rem' }}>
          We&rsquo;ve emailed you a private link to manage this collection for{' '}
          <strong>{created.honoreeName}</strong>. Share the link below with family and friends so they can add a memory.
        </p>

        <label className="label" style={{ marginTop: '1.5rem' }}>Contributor link — share this</label>
        <CopyRow value={created.shareUrl} accent={occasion.accent} />

        <label className="label" style={{ marginTop: '1.25rem' }}>Your private manage link — keep this</label>
        <CopyRow value={created.adminUrl} accent={occasion.accent} />

        <a href={created.adminUrl} className="btn" style={{ marginTop: '1.75rem', background: occasion.accent }}>
          Go to your collection
        </a>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="card" style={{ borderTop: `3px solid ${occasion.accent}` }}>
      <h1 style={{ color: occasion.accent, fontSize: '1.6rem' }}>{occasion.title}</h1>
      <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem', marginBottom: '1.5rem' }}>
        Start a collection for {occasion.honoreeLabel}. You&rsquo;ll get a private link to manage it and a
        shareable link for contributors.
      </p>

      <label className="label" htmlFor="honoree">Name of {occasion.honoreeLabel}</label>
      <input id="honoree" className="field" required maxLength={100} value={honoreeName} onChange={(e) => setHonoree(e.target.value)} />

      <label className="label" htmlFor="email" style={{ marginTop: '1.1rem' }}>Your email</label>
      <input id="email" className="field" type="email" required value={organizerEmail} onChange={(e) => setEmail(e.target.value)} />
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
        We&rsquo;ll send your private manage link here.
      </p>

      <label className="label" htmlFor="deadline" style={{ marginTop: '1.1rem' }}>Collect until (optional)</label>
      <input id="deadline" className="field" type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

      {error && <p style={{ color: '#b4413c', marginTop: '1rem' }}>{error}</p>}

      <button type="submit" className="btn" disabled={submitting} style={{ marginTop: '1.5rem', background: occasion.accent }}>
        {submitting ? 'Creating…' : 'Create collection'}
      </button>
    </form>
  );
}

function CopyRow({ value, accent }: { value: string; accent: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
      <input className="field" readOnly value={value} onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="btn btn-ghost"
        style={{ color: accent, whiteSpace: 'nowrap' }}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* clipboard unavailable */
          }
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
