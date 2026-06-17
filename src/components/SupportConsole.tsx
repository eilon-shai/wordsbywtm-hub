'use client';

import * as React from 'react';
import { Button } from '@eilon-shai/venture-core/ui';

interface Product {
  slug: string;
  title: string;
}

interface CollectionRow {
  id: string;
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

export function SupportConsole({ products }: { products: Product[] }) {
  const [occasion, setOccasion] = React.useState(products[0]?.slug ?? '');
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
      const res = await fetch('/api/support/lookup', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ occasion, email }),
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
  }, [occasion, email]);

  const resend = React.useCallback(
    async (row: CollectionRow, kind: 'collection' | 'tribute') => {
      setBusy(`${row.id}:${kind}`);
      setMsg((m) => ({ ...m, [row.id]: '' }));
      try {
        const res = await fetch('/api/support/resend', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ occasion, adminToken: row.adminToken, kind }),
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
    },
    [occasion],
  );

  const doDelete = React.useCallback(
    async (row: CollectionRow) => {
      setBusy(`${row.id}:delete`);
      try {
        const res = await fetch('/api/support/delete', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ occasion, adminToken: row.adminToken }),
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
    },
    [occasion],
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="font-serif text-2xl text-foreground">Support console</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Look up a customer&apos;s collections, restore their links, or delete a collection.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void lookup();
        }}
        className="mt-6 flex flex-wrap items-end gap-3"
      >
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-foreground">Product</span>
          <select
            value={occasion}
            onChange={(e) => setOccasion(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm"
          >
            {products.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
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
        <p className="mt-8 text-sm text-muted-foreground">No collections found for that email in this product.</p>
      ) : null}

      {rows && rows.length > 0 ? (
        <ul className="mt-8 space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-serif text-lg text-foreground">{row.honoreeName}</p>
                  <p className="text-xs text-muted-foreground">
                    {row.status}
                    {row.paid ? ' · paid' : ' · unpaid'} · created {fmt(row.createdAt)} · deadline {fmt(row.deadline)}
                    {row.generated ? (row.hasTribute ? ' · tribute available' : ' · tribute unavailable (expired/empty)') : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {/* Collection (manage) link only matters while the collection is
                    still open; once generated, the tribute link is the relevant one. */}
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
                {/* Tribute link only for generated collections whose content is
                    still stored (removed at the retention purge). */}
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
      ) : null}
    </main>
  );
}
