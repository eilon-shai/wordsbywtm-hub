'use client';

import * as React from 'react';
import { Button } from '@eilon-shai/venture-core/ui';

interface CollectionRow {
  id: string;
  occasion: string;
  occasionTitle: string;
  honoreeName: string;
  status: string;
  paid: boolean;
  createdAt: string | null;
  deadline: string | null;
  generated: boolean;
  hasTribute: boolean;
  adminToken: string;
  manageUrl: string;
  tributeUrl: string;
  shareUrl: string;
}

function fmt(iso: string | null): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

export function SupportConsole() {
  const [email, setEmail] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [rows, setRows] = React.useState<CollectionRow[] | null>(null);
  // Per-row transient status messages, keyed by collection id.
  const [msg, setMsg] = React.useState<Record<string, string>>({});
  const [busy, setBusy] = React.useState<string | null>(null); // `${id}:${action}`
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null);

  const lookup = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    setRows(null);
    setMsg({});
    try {
      // No occasion → search across all live occasions; results carry their own.
      const res = await fetch('/api/support/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error ?? 'Lookup failed');
        return;
      }
      setRows(json.collections ?? []);
    } catch {
      setError('Lookup failed — please try again.');
    } finally {
      setLoading(false);
    }
  }, [email]);

  const resend = React.useCallback(async (row: CollectionRow, kind: 'collection' | 'tribute') => {
    setBusy(`${row.id}:${kind}`);
    setMsg((m) => ({ ...m, [row.id]: '' }));
    try {
      const res = await fetch('/api/support/resend', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ occasion: row.occasion, adminToken: row.adminToken, kind }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg((m) => ({ ...m, [row.id]: json.error ?? 'Could not send.' }));
        return;
      }
      const label = kind === 'collection' ? 'Collection' : 'Tribute';
      setMsg((m) => ({
        ...m,
        [row.id]: json.emailed
          ? `${label} link emailed to ${json.to}. URL: ${json.url}`
          : `Email is off — copy this ${label.toLowerCase()} URL: ${json.url}`,
      }));
    } catch {
      setMsg((m) => ({ ...m, [row.id]: 'Could not send — try again.' }));
    } finally {
      setBusy(null);
    }
  }, []);

  const doDelete = React.useCallback(async (row: CollectionRow) => {
    setBusy(`${row.id}:delete`);
    try {
      const res = await fetch('/api/support/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ occasion: row.occasion, adminToken: row.adminToken }),
      });
      const json = await res.json();
      if (!res.ok) {
        setMsg((m) => ({ ...m, [row.id]: json.error ?? 'Delete failed.' }));
        return;
      }
      setRows((prev) => (prev ? prev.filter((r) => r.id !== row.id) : prev));
      setConfirmDelete(null);
    } catch {
      setMsg((m) => ({ ...m, [row.id]: 'Delete failed — try again.' }));
    } finally {
      setBusy(null);
    }
  }, []);

  // Group results by occasion (preserve the lookup's newest-first order within each).
  const groups = React.useMemo(() => {
    if (!rows) return [];
    const map = new Map<string, { title: string; items: CollectionRow[] }>();
    for (const r of rows) {
      const g = map.get(r.occasion) ?? { title: r.occasionTitle, items: [] };
      g.items.push(r);
      map.set(r.occasion, g);
    }
    return [...map.values()];
  }, [rows]);

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-serif text-2xl text-foreground">Support console</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Look up a customer&apos;s collections across all occasions, restore their links, or delete a collection.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-1 flex-col gap-1 text-sm" style={{ minWidth: 220 }}>
          <span className="font-medium text-foreground">Customer email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="customer@example.com"
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <Button type="submit" disabled={loading || !email.trim()} className="rounded-lg">
          {loading ? 'Looking up…' : 'Look up'}
        </Button>
      </form>

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      {rows && rows.length === 0 ? (
        <p className="mt-8 text-sm text-muted-foreground">No collections found for that email.</p>
      ) : null}

      {groups.map((group) => (
        <section key={group.title} className="mt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            {group.title} <span className="text-muted-foreground/60">({group.items.length})</span>
          </h2>
          <ul className="space-y-4">
            {group.items.map((row) => (
              <li key={row.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-serif text-lg text-foreground">{row.honoreeName}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.status}
                      {/* A generated collection was necessarily paid (pay-before-generate),
                          even if paid_at wasn't recorded on the pay-at-finalize path. */}
                      {row.paid || row.generated ? ' · paid' : ' · unpaid'} · created {fmt(row.createdAt)} · deadline {fmt(row.deadline)}
                      {row.generated ? (row.hasTribute ? ' · tribute available' : ' · tribute unavailable (expired/empty)') : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {row.status === 'open' ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy === `${row.id}:collection`}
                      onClick={() => void resend(row, 'collection')}
                    >
                      {busy === `${row.id}:collection` ? 'Sending…' : 'Restore collection link'}
                    </Button>
                  ) : null}
                  {row.hasTribute ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy === `${row.id}:tribute`}
                      onClick={() => void resend(row, 'tribute')}
                    >
                      {busy === `${row.id}:tribute` ? 'Sending…' : 'Restore tribute link'}
                    </Button>
                  ) : null}
                  {confirmDelete === row.id ? (
                    <span className="inline-flex items-center gap-2">
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        disabled={busy === `${row.id}:delete`}
                        onClick={() => void doDelete(row)}
                      >
                        {busy === `${row.id}:delete` ? 'Deleting…' : 'Confirm delete'}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => setConfirmDelete(null)}>
                        Cancel
                      </Button>
                    </span>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="text-destructive"
                      onClick={() => setConfirmDelete(row.id)}
                    >
                      Delete collection
                    </Button>
                  )}
                </div>

                {msg[row.id] ? (
                  <p className="mt-3 break-all rounded-lg bg-muted px-3 py-2 text-xs text-foreground">{msg[row.id]}</p>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </main>
  );
}
