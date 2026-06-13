'use client';

import { useEffect, useState, useCallback } from 'react';
import { initSharedPaddle, getSharedPaddle, setActiveTransaction } from '@eilon-shai/venture-core/components';

interface Contribution {
  id: string;
  contributorName: string;
  relationship: string | null;
  memory: string;
  status: string;
  createdAt: string;
}

interface CollectionData {
  honoreeName: string;
  occasion: string;
  status: string;
  priceShown: number;
  shareToken: string;
  count: number;
  minContributions: number;
  canFinalize: boolean;
  contributions: Contribution[];
}

export default function Dashboard({ occasion, adminToken, accent }: { occasion: string; adminToken: string; accent: string }) {
  const [data, setData] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/collection/${occasion}/get?t=${encodeURIComponent(adminToken)}`);
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Could not load this collection.'); return; }
      setData(d);
    } catch {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }, [occasion, adminToken]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    initSharedPaddle('/result').catch(() => { /* token may be unset locally */ });
  }, []);

  async function moderate(contributionId: string, action: 'remove' | 'restore') {
    setBusy(true);
    try {
      await fetch(`/api/collection/${occasion}/moderate`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminToken, contributionId, action }),
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function finalize() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/collection/${occasion}/checkout`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminToken }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error ?? 'Could not start checkout.'); return; }

      sessionStorage.setItem('wtm_occasion', occasion);
      const txnId: string = d.transactionId;

      if (txnId && txnId.startsWith('mock_')) {
        window.location.href = `/result?occasion=${occasion}&txnId=${encodeURIComponent(txnId)}`;
        return;
      }
      setActiveTransaction(txnId, 'full', '/result');
      const paddle = await getSharedPaddle();
      paddle.Checkout.open({ transactionId: txnId });
    } catch {
      setError('Could not start checkout. Please try again.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p style={{ color: 'var(--text-muted)' }}>Loading…</p>;
  if (error && !data) return <p style={{ color: '#b4413c' }}>{error}</p>;
  if (!data) return null;

  const active = data.contributions.filter((c) => c.status !== 'removed');
  const removed = data.contributions.filter((c) => c.status === 'removed');
  const generated = data.status === 'generated';

  return (
    <div>
      <div className="card" style={{ borderTop: `3px solid ${accent}`, marginBottom: '1.5rem' }}>
        <h1 style={{ color: accent, fontSize: '1.6rem' }}>Tribute for {data.honoreeName}</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.4rem' }}>
          {active.length} {active.length === 1 ? 'memory' : 'memories'} collected
          {data.count < data.minContributions && !generated && (
            <> · {data.minContributions - active.length} more needed before you can create the tribute</>
          )}
        </p>

        {!generated && (
          <>
            <p style={{ marginTop: '1rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Contributor link</p>
            <ShareLink occasion={occasion} shareToken={data.shareToken} accent={accent} />
          </>
        )}

        {generated ? (
          <p style={{ marginTop: '1.5rem', color: accent, fontWeight: 600 }}>
            ✓ This tribute has been created. Check your email for the finished piece.
          </p>
        ) : (
          <button
            className="btn"
            disabled={!data.canFinalize || busy}
            onClick={finalize}
            style={{ marginTop: '1.5rem', background: accent }}
          >
            {busy ? 'Working…' : `Create the tribute — $${data.priceShown}`}
          </button>
        )}
        {error && <p style={{ color: '#b4413c', marginTop: '1rem' }}>{error}</p>}
      </div>

      <h2 style={{ fontSize: '1.2rem', margin: '0 0 1rem', color: 'var(--text-secondary)' }}>Memories</h2>
      {active.length === 0 && <p style={{ color: 'var(--text-muted)' }}>No memories yet. Share the link above.</p>}
      {active.map((c) => (
        <ContributionCard key={c.id} c={c} accent={accent} disabled={busy || generated} onAction={moderate} />
      ))}

      {removed.length > 0 && (
        <>
          <h3 style={{ fontSize: '1rem', margin: '1.5rem 0 0.75rem', color: 'var(--text-muted)' }}>Removed</h3>
          {removed.map((c) => (
            <ContributionCard key={c.id} c={c} accent={accent} disabled={busy || generated} onAction={moderate} />
          ))}
        </>
      )}
    </div>
  );
}

function ContributionCard({
  c, accent, disabled, onAction,
}: {
  c: Contribution; accent: string; disabled: boolean; onAction: (id: string, a: 'remove' | 'restore') => void;
}) {
  const isRemoved = c.status === 'removed';
  return (
    <div className="card" style={{ marginBottom: '0.85rem', opacity: isRemoved ? 0.5 : 1, padding: '1.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem' }}>
        <p style={{ fontWeight: 600 }}>
          {c.contributorName}
          {c.relationship && <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}> · {c.relationship}</span>}
        </p>
        <button
          className="btn btn-ghost"
          disabled={disabled}
          style={{ color: isRemoved ? accent : 'var(--text-muted)', padding: '0.3rem 0.75rem', fontSize: '0.8rem' }}
          onClick={() => onAction(c.id, isRemoved ? 'restore' : 'remove')}
        >
          {isRemoved ? 'Restore' : 'Remove'}
        </button>
      </div>
      <p className="tribute-text" style={{ fontSize: '1rem', marginTop: '0.5rem' }}>{c.memory}</p>
    </div>
  );
}

function ShareLink({ occasion, shareToken, accent }: { occasion: string; shareToken: string; accent: string }) {
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState('');
  useEffect(() => {
    setUrl(`${window.location.origin}/c/${shareToken}?occasion=${occasion}`);
  }, [occasion, shareToken]);
  return (
    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.4rem' }}>
      <input className="field" readOnly value={url} onFocus={(e) => e.target.select()} />
      <button
        type="button"
        className="btn btn-ghost"
        style={{ color: accent, whiteSpace: 'nowrap' }}
        onClick={async () => {
          try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* */ }
        }}
      >
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}
