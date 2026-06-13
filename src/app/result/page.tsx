'use client';

import { Suspense, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';

function ResultInner() {
  const params = useSearchParams();
  const [content, setContent] = useState<string | null>(null);
  const [honoree, setHonoree] = useState<string>('');
  const [count, setCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    const txnId = params.get('txnId') ?? params.get('txn');
    const occasion = params.get('occasion') ?? (typeof window !== 'undefined' ? sessionStorage.getItem('wtm_occasion') : null);

    if (!txnId || !occasion) {
      setError('We couldn’t find your tribute session. Please return to your collection and try again.');
      return;
    }

    let cancelled = false;
    async function run() {
      // Payment may take a moment to settle server-side; retry on 202.
      for (let attempt = 0; attempt < 8 && !cancelled; attempt++) {
        try {
          const res = await fetch(`/api/collection/${occasion}/generate`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ transactionId: txnId }),
          });
          if (res.status === 202) {
            await new Promise((r) => setTimeout(r, 2500));
            continue;
          }
          const d = await res.json();
          if (!res.ok) { setError(d.error ?? 'Something went wrong creating your tribute.'); return; }
          setContent(d.content);
          setHonoree(d.honoreeName ?? '');
          setCount(d.contributorCount ?? 0);
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 2500));
        }
      }
      if (!cancelled) setError('Creating your tribute is taking longer than expected. Please check your email shortly.');
    }
    run();
    return () => { cancelled = true; };
  }, [params]);

  if (error) {
    return (
      <main className="wrap" style={{ maxWidth: 680, paddingTop: '4rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem' }}>We hit a snag</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>{error}</p>
      </main>
    );
  }

  if (!content) {
    return (
      <main className="wrap" style={{ maxWidth: 680, paddingTop: '5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.5rem' }}>Weaving the memories together…</h1>
        <p style={{ color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
          This takes a moment. Please keep this page open.
        </p>
      </main>
    );
  }

  return (
    <main className="wrap" style={{ maxWidth: 720, paddingTop: '3rem', paddingBottom: '4rem' }}>
      <div className="card">
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
          A tribute for {honoree}
        </p>
        {count > 0 && (
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.35rem' }}>
            Woven from {count} {count === 1 ? 'memory' : 'memories'}.
          </p>
        )}
        <div className="tribute-text" style={{ marginTop: '1.5rem' }}>{content}</div>
      </div>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1.25rem', textAlign: 'center' }}>
        We’ve also emailed this tribute to you.
      </p>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense fallback={<main className="wrap" style={{ paddingTop: '5rem', textAlign: 'center' }}>Loading…</main>}>
      <ResultInner />
    </Suspense>
  );
}
