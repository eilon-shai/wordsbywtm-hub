'use client';

import * as React from 'react';
import { Button } from '@eilon-shai/venture-core/ui';
import type { Partner } from '@/lib/partners';

// ---------------------------------------------------------------------------
// PartnersAdmin — the /support/partners console. Add a partner (mints an opaque
// token server-side), see everyone already added, copy each partner's referral
// link + printable-card link, and activate/deactivate. All calls go to
// /api/support/partners (behind the middleware Basic-Auth). Fetches on mount so
// the page itself stays a thin server shell.
// ---------------------------------------------------------------------------

function fmt(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? '—'
    : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

/** The occasion a partner's referral link should point at: their first scoped
 *  occasion, or memorial when unrestricted (empty scope). Pointing at an occasion
 *  OUTSIDE the partner's scope would show no endorsement + earn no discount (the
 *  create-time gate rejects it), so the link must land in-scope. */
function linkOccasion(partner: Partner): string {
  return partner.occasions[0] ?? 'memorial';
}
/** Referral link a partner hands a family (occasion-scoped, carries ?ref). */
function refLink(origin: string, partner: Partner): string {
  return `${origin}/${linkOccasion(partner)}?ref=${partner.token}`;
}
/** Printable-card link. The card resolves the partner by ?code= and sets its copy
 *  + baked link to the partner's occasion, so it's valid for every partner. */
function cardLink(origin: string, token: string): string {
  return `${origin}/partners/card?code=${token}`;
}

interface OccasionOption {
  slug: string;
  title: string;
}

export function PartnersAdmin({ occasions }: { occasions: OccasionOption[] }) {
  const [origin, setOrigin] = React.useState('');
  const [partners, setPartners] = React.useState<Partner[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [name, setName] = React.useState('');
  // Occasion scope for the partner being added. Default: memorial only (partners
  // are mostly funeral homes/hospices), so a memorial courtesy can't leak onto a
  // wedding. The founder can widen it per partner.
  const [scope, setScope] = React.useState<Set<string>>(
    () => new Set(occasions.some((o) => o.slug === 'memorial') ? ['memorial'] : []),
  );
  const [adding, setAdding] = React.useState(false);
  const [addError, setAddError] = React.useState<string | null>(null);
  const [busyToken, setBusyToken] = React.useState<string | null>(null);
  const [copied, setCopied] = React.useState<string | null>(null); // `${token}:${which}`
  const [confirmDelete, setConfirmDelete] = React.useState<string | null>(null); // token pending confirm
  const [deletingToken, setDeletingToken] = React.useState<string | null>(null);
  // Inline edit (name + occasions) for one partner at a time.
  const [editToken, setEditToken] = React.useState<string | null>(null);
  const [editName, setEditName] = React.useState('');
  const [editScope, setEditScope] = React.useState<Set<string>>(new Set());
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);

  const titleFor = React.useCallback(
    (slug: string) => occasions.find((o) => o.slug === slug)?.title ?? slug,
    [occasions],
  );

  const toggleScope = React.useCallback((slug: string) => {
    setScope((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  React.useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  const load = React.useCallback(async () => {
    setLoadError(null);
    try {
      const res = await fetch('/api/support/partners');
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json.error ?? 'Could not load partners.');
        return;
      }
      setPartners(json.partners ?? []);
    } catch {
      setLoadError('Could not load partners — please refresh.');
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  const add = React.useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const displayName = name.trim();
      if (!displayName) return;
      setAdding(true);
      setAddError(null);
      try {
        const res = await fetch('/api/support/partners', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ displayName, occasions: [...scope] }),
        });
        const json = await res.json();
        if (!res.ok) {
          setAddError(json.error ?? 'Could not add partner.');
          return;
        }
        setName('');
        // Prepend the new partner (active, newest first).
        setPartners((prev) => [json.partner as Partner, ...(prev ?? [])]);
      } catch {
        setAddError('Could not add partner — please try again.');
      } finally {
        setAdding(false);
      }
    },
    [name, scope],
  );

  const toggleActive = React.useCallback(async (token: string, active: boolean) => {
    setBusyToken(token);
    try {
      const res = await fetch('/api/support/partners', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token, active }),
      });
      const json = await res.json();
      if (res.ok && json.partner) {
        setPartners((prev) =>
          (prev ?? []).map((p) => (p.token === token ? (json.partner as Partner) : p)),
        );
      }
    } catch {
      /* leave the row as-is; the founder can retry */
    } finally {
      setBusyToken(null);
    }
  }, []);

  const remove = React.useCallback(async (token: string) => {
    setDeletingToken(token);
    try {
      const res = await fetch('/api/support/partners', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (res.ok) {
        setPartners((prev) => (prev ?? []).filter((p) => p.token !== token));
        setConfirmDelete(null);
      }
    } catch {
      /* leave the row; the founder can retry */
    } finally {
      setDeletingToken(null);
    }
  }, []);

  const startEdit = React.useCallback((p: Partner) => {
    setEditToken(p.token);
    setEditName(p.displayName);
    setEditScope(new Set(p.occasions));
    setEditError(null);
    setConfirmDelete(null);
  }, []);

  const toggleEditScope = React.useCallback((slug: string) => {
    setEditScope((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }, []);

  const saveEdit = React.useCallback(
    async (token: string) => {
      const displayName = editName.trim();
      if (!displayName) {
        setEditError('A partner name is required.');
        return;
      }
      setSavingEdit(true);
      setEditError(null);
      try {
        const res = await fetch('/api/support/partners', {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token, displayName, occasions: [...editScope] }),
        });
        const json = await res.json();
        if (!res.ok) {
          setEditError(json.error ?? 'Could not save changes.');
          return;
        }
        setPartners((prev) =>
          (prev ?? []).map((p) => (p.token === token ? (json.partner as Partner) : p)),
        );
        setEditToken(null);
      } catch {
        setEditError('Could not save changes — please try again.');
      } finally {
        setSavingEdit(false);
      }
    },
    [editName, editScope],
  );

  const copy = React.useCallback(async (value: string, key: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      setTimeout(() => setCopied((c) => (c === key ? null : c)), 1500);
    } catch {
      /* clipboard blocked — the value is visible for manual copy */
    }
  }, []);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="font-serif text-2xl text-foreground">Partners</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Funeral homes, hospices, and planners you&apos;ve given a referral link. An active
        partner&apos;s families see an endorsement, and — when the Paddle courtesy discount is
        configured — a 10% courtesy at checkout. Adding or deactivating takes effect immediately.
      </p>

      {/* Add a partner */}
      <form
        onSubmit={add}
        className="mt-6 flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card p-4"
      >
        <label className="flex-1 min-w-[16rem]">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Partner name
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Riverside Memorial Home"
            maxLength={120}
            className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
          />
        </label>
        <div className="w-full">
          <span className="text-xs uppercase tracking-widest text-muted-foreground">
            Applies to
          </span>
          <div className="mt-1 flex flex-wrap gap-3">
            {occasions.map((o) => (
              <label key={o.slug} className="flex items-center gap-1.5 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={scope.has(o.slug)}
                  onChange={() => toggleScope(o.slug)}
                  className="h-4 w-4 accent-primary"
                />
                {o.title}
              </label>
            ))}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            The endorsement + discount apply only to the checked occasions.
            {scope.size === 0 ? ' With none checked, it applies to all occasions.' : ''}
          </p>
        </div>
        <Button type="submit" disabled={adding || !name.trim()}>
          {adding ? 'Adding…' : 'Add partner'}
        </Button>
        {addError ? <p className="w-full text-sm text-destructive">{addError}</p> : null}
      </form>

      {/* List */}
      <div className="mt-8">
        {loadError ? (
          <p className="text-sm text-destructive">{loadError}</p>
        ) : partners === null ? (
          <p className="text-sm text-muted-foreground">Loading partners…</p>
        ) : partners.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No partners yet. Add one above to mint a referral link.
          </p>
        ) : (
          <ul className="space-y-3">
            {partners.map((p) => {
              const ref = refLink(origin, p);
              const card = cardLink(origin, p.token);
              return (
                <li
                  key={p.token}
                  className="rounded-xl border border-border bg-card p-4"
                  data-testid="partner-row"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium text-foreground">
                        {p.displayName}{' '}
                        {p.active ? (
                          <span className="ml-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                            Active
                          </span>
                        ) : (
                          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                            Inactive
                          </span>
                        )}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        <span className="font-mono text-foreground/80">{p.token}</span> · added{' '}
                        {fmt(p.createdAt)} ·{' '}
                        <span className="text-foreground/80">
                          {p.occasions.length === 0
                            ? 'all occasions'
                            : p.occasions.map(titleFor).join(', ')}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        onClick={() => (editToken === p.token ? setEditToken(null) : startEdit(p))}
                        disabled={deletingToken === p.token}
                      >
                        {editToken === p.token ? 'Close' : 'Edit'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => toggleActive(p.token, !p.active)}
                        disabled={busyToken === p.token || deletingToken === p.token}
                      >
                        {busyToken === p.token
                          ? 'Saving…'
                          : p.active
                            ? 'Deactivate'
                            : 'Reactivate'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setConfirmDelete(p.token)}
                        disabled={deletingToken === p.token}
                        className="text-destructive"
                      >
                        Delete
                      </Button>
                    </div>
                  </div>

                  {editToken === p.token ? (
                    <div
                      className="mt-3 rounded-lg border border-border bg-background p-3"
                      data-testid="partner-edit"
                    >
                      <label className="block">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          Partner name
                        </span>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          maxLength={120}
                          className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-foreground outline-none focus:border-primary"
                        />
                      </label>
                      <div className="mt-3">
                        <span className="text-xs uppercase tracking-widest text-muted-foreground">
                          Applies to
                        </span>
                        <div className="mt-1 flex flex-wrap gap-3">
                          {occasions.map((o) => (
                            <label
                              key={o.slug}
                              className="flex items-center gap-1.5 text-sm text-foreground"
                            >
                              <input
                                type="checkbox"
                                checked={editScope.has(o.slug)}
                                onChange={() => toggleEditScope(o.slug)}
                                className="h-4 w-4 accent-primary"
                              />
                              {o.title}
                            </label>
                          ))}
                        </div>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {editScope.size === 0 ? 'With none checked, it applies to all occasions.' : ''}
                        </p>
                      </div>
                      <div className="mt-3 flex items-center gap-2">
                        <Button
                          onClick={() => saveEdit(p.token)}
                          disabled={savingEdit || !editName.trim()}
                        >
                          {savingEdit ? 'Saving…' : 'Save changes'}
                        </Button>
                        <Button variant="outline" onClick={() => setEditToken(null)} disabled={savingEdit}>
                          Cancel
                        </Button>
                        {editError ? (
                          <span className="text-sm text-destructive">{editError}</span>
                        ) : null}
                      </div>
                    </div>
                  ) : null}

                  {confirmDelete === p.token ? (
                    <div
                      className="mt-3 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3"
                      data-testid="partner-delete-confirm"
                    >
                      <p className="flex-1 text-sm text-foreground">
                        Permanently delete <span className="font-medium">{p.displayName}</span>? Their
                        referral link stops working. Past attributions are kept; to just pause them,
                        use Deactivate instead.
                      </p>
                      <Button
                        variant="destructive"
                        onClick={() => remove(p.token)}
                        disabled={deletingToken === p.token}
                      >
                        {deletingToken === p.token ? 'Deleting…' : 'Delete permanently'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setConfirmDelete(null)}
                        disabled={deletingToken === p.token}
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : null}

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    <LinkCopy
                      label="Referral link"
                      value={ref}
                      copied={copied === `${p.token}:ref`}
                      onCopy={() => copy(ref, `${p.token}:ref`)}
                    />
                    <LinkCopy
                      label="Printable card"
                      value={card}
                      copied={copied === `${p.token}:card`}
                      onCopy={() => copy(card, `${p.token}:card`)}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}

function LinkCopy({
  label,
  value,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-2">
      <p className="text-xs uppercase tracking-widest text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2">
        <code className="flex-1 truncate text-xs text-foreground/80" title={value}>
          {value}
        </code>
        <button
          type="button"
          onClick={onCopy}
          className="shrink-0 rounded-md border border-border px-2 py-1 text-xs text-foreground hover:border-primary"
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
    </div>
  );
}
