'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Button,
  Progress,
  buttonVariants,
} from '@eilon-shai/venture-core/ui';
import { MemoryCard, type Contribution } from './MemoryCard';
import { OrganizerMemoryForm } from './OrganizerMemoryForm';
import { InviteBlock } from './InviteBlock';
import { buildShareLink, buildInviteText } from '@/lib/invite';
import { getOccasionMeta } from '@/lib/registry';
import { getIntake } from '@/lib/intake';
import { resolvePrice } from '@/lib/partners';

// ---------------------------------------------------------------------------
// S6 + S7 — Organizer review dashboard + finalize.
//
// GETs /api/collection?t={adminToken} (get-collection-handler), renders every
// memory with an opt-out Include toggle (optimistic, rollback on moderate
// failure), shows the live "woven from N memories" bar, and finalizes via
// /api/collection/checkout. Output is NEVER shown here — synthesis happens only
// after payment on the result page. See COLLECTION_FLOW_DESIGN.md §3, §S6/§S7.
//
// SES-056 redesign: the page reshapes around the single next action of the
// current stage. Exactly one solid-primary Button per state (Copy while
// gathering; Review & create once finalizable). Everything else is one quiet
// line or one <details> expander away. See docs/DASHBOARD_REDESIGN_SES056.md.
// ---------------------------------------------------------------------------

interface CollectionData {
  honoreeName: string;
  occasion: string;
  status: string;
  deadline?: string | null;
  priceShown?: number | null;
  shareToken: string;
  count: number;
  minContributions: number;
  canFinalize: boolean;
  /** Paid in advance (from the invite panel) — finalize is then free. */
  paid?: boolean;
  /** Max invite emails/day (10 if paid, else 3). */
  inviteCap?: number;
  /** Non-organizer contributors used + the link cap (3 free / 10 paid). */
  contributorCount?: number;
  contributorCap?: number;
  contributions: Contribution[];
}

interface ApiError {
  error: string;
  code?: string;
  retryable?: boolean;
}

interface ManageDashboardProps {
  adminToken: string;
  /** brand.resultPath of the resolved occasion config, e.g. '/memorial/result'. */
  resultPath: string;
  /** Occasion slug — stashed in sessionStorage so the result page can theme/resolve. */
  occasion: string;
  /** Organizer's email — prefilled (read-only) into the Paddle checkout. */
  organizerEmail?: string;
  /** True right after creation (?new=1) — show a "ready, invite people" banner. */
  justCreated?: boolean;
  /** True when a known-partner courtesy discount applies (server-resolved from
   *  the collection's referrer). Drives discounted price copy + advance-pay CTA. */
  discountApplies?: boolean;
  /** Referring partner's display name, when this collection was partner-referred. */
  partnerName?: string;
  /** False when the admin token didn't resolve to a collection (deleted / unknown
   *  token) — the occasion is then a guessed default, so terminal screens stay
   *  brand-neutral (🤍 + bronze chrome) instead of showing the wrong occasion's
   *  icon/accent (e.g. a memorial candle on a deleted wedding link). */
  occasionKnown?: boolean;
}

const isIncluded = (c: Contribution) => c.status !== 'removed';

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

function formatDeadline(iso?: string | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
}

function daysUntil(iso?: string | null): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86_400_000);
}

// A STATUS indicator, not an action. Rendered as a leading dot + muted text (no
// border, no pill background) so it can never read as a clickable button — an
// outline Badge here looked tappable and drew dead clicks.
function statusBadge(status: string, noun: string): { label: string; dot: string } {
  switch (status) {
    case 'generated':
      return { label: `${cap(noun)} created`, dot: 'bg-emerald-500' };
    case 'closed':
      return { label: 'Closed', dot: 'bg-muted-foreground/40' };
    default:
      return { label: 'Collecting memories', dot: 'bg-primary' };
  }
}

// Small info "ⓘ" with a tooltip rendered through a portal to <body>. A portal is
// required because the dashboard cards use overflow-hidden, which would clip any
// normally-positioned tooltip in either direction.
function InfoTooltip({ text, label }: { text: string; label: string }) {
  const ref = useRef<HTMLButtonElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  const show = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    // Anchor above the icon, horizontally centred on it. Fixed coords = viewport.
    setPos({ top: r.top, left: r.left + r.width / 2 });
  }, []);
  const hide = useCallback(() => setPos(null), []);

  useEffect(() => {
    if (!pos) return;
    const onScroll = () => hide();
    window.addEventListener('scroll', onScroll, true);
    window.addEventListener('resize', onScroll);
    return () => {
      window.removeEventListener('scroll', onScroll, true);
      window.removeEventListener('resize', onScroll);
    };
  }, [pos, hide]);

  return (
    <>
      <button
        ref={ref}
        type="button"
        className="inline-flex h-5 w-5 cursor-help items-center justify-center rounded-full align-middle text-muted-foreground transition-colors hover:bg-primary/15 hover:text-primary focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        aria-label={label}
        onMouseEnter={show}
        onMouseLeave={hide}
        onFocus={show}
        onBlur={hide}
      >
        ⓘ
      </button>
      {pos && typeof document !== 'undefined'
        ? createPortal(
            <span
              role="tooltip"
              className="pointer-events-none fixed z-[100] w-64 -translate-x-1/2 -translate-y-full rounded-lg bg-foreground px-3 py-2 text-left text-xs font-normal leading-relaxed text-background shadow-lg"
              style={{ top: pos.top - 8, left: pos.left }}
            >
              {text}
            </span>,
            document.body,
          )
        : null}
    </>
  );
}

export function ManageDashboard({ adminToken, resultPath, occasion, organizerEmail, justCreated = false, discountApplies = false, partnerName, occasionKnown = true }: ManageDashboardProps) {
  // Occasion-specific copy (defaults to memorial wording if the slug is unknown).
  const noun = getOccasionMeta(occasion)?.deliverableNoun ?? 'tribute';
  const readAloud = getOccasionMeta(occasion)?.readAloudContext ?? 'at the service';
  const successIcon = getOccasionMeta(occasion)?.successIcon ?? '🤍';
  // Calm icon for terminal screens (deleted / gone / error) — never the
  // celebratory successIcon, which reads wrong over an "unavailable" message.
  // When the occasion is unknown (deleted/unresolved token, so `occasion` is a
  // guessed default), stay neutral (🤍) rather than show the wrong occasion's icon
  // — e.g. a memorial candle on a deleted wedding manage link.
  const terminalIcon = occasionKnown ? getOccasionMeta(occasion)?.terminalIcon ?? '🤍' : '🤍';
  // Map stored relationship VALUEs ("child") → friendly labels ("Son or Daughter")
  // for display on the memory cards (E2E finding F-3).
  const relationshipLabels = Object.fromEntries(
    getIntake(occasion).relationshipOptions.map((o) => [o.value, o.label]),
  );
  const [data, setData] = useState<CollectionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<ApiError | null>(null);

  // Per-contribution save state for optimistic toggles.
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [toggleErrors, setToggleErrors] = useState<Record<string, string>>({});

  const [finalizing, setFinalizing] = useState(false);

  // Inline edit of the organizer's own memory.
  // The contribution being edited (organizer's own memory) — opens the rich
  // customer form, pre-populated from its stored structured fields.
  const [editing, setEditing] = useState<Contribution | null>(null);
  const openEdit = useCallback((c: Contribution) => setEditing(c), []);

  // a11y (FE-008): focus into the edit-memory modal on open, restore focus to the
  // trigger on close, and trap Tab within the dialog while it's open.
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const editTriggerRef = useRef<HTMLElement | null>(null);
  // The dashboard content behind the modal — made `inert` while the modal is open
  // so it's unreachable by keyboard / assistive tech, not just visually covered.
  const backgroundRef = useRef<HTMLDivElement | null>(null);
  // While the edit-memory modal is open: lock body scroll AND make the background
  // inert (so AT can't reach it and the page behind doesn't scroll). Both restore
  // on close. `inert` is a standard attribute; set imperatively for broad typing.
  useEffect(() => {
    if (!editing) return;
    const bg = backgroundRef.current;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    bg?.setAttribute('inert', '');
    bg?.setAttribute('aria-hidden', 'true');
    return () => {
      document.body.style.overflow = prevOverflow;
      bg?.removeAttribute('inert');
      bg?.removeAttribute('aria-hidden');
    };
  }, [editing]);
  useEffect(() => {
    if (!editing) return;
    editTriggerRef.current = (document.activeElement as HTMLElement) ?? null;
    const focusables = dialogRef.current?.querySelectorAll<HTMLElement>(
      'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
    );
    focusables?.[0]?.focus();
    return () => editTriggerRef.current?.focus?.();
  }, [editing]);
  const trapTab = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditing(null);
      return;
    }
    if (e.key !== 'Tab' || !dialogRef.current) return;
    const f = Array.from(
      dialogRef.current.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])',
      ),
    ).filter((el) => el.offsetParent !== null);
    if (f.length === 0) return;
    const first = f[0];
    const last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  }, []);

  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleDelete = useCallback(async () => {
    setDeleting(true);
    setDeleteError(null);
    try {
      const res = await fetch('/api/collection/delete', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ adminToken }),
      });
      if (!res.ok) throw new Error('delete failed');
      setDeleted(true);
    } catch {
      setDeleteError('Could not delete the collection. Please try again.');
    } finally {
      setDeleting(false);
    }
  }, [adminToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch(`/api/collection?t=${encodeURIComponent(adminToken)}`, {
        method: 'GET',
        cache: 'no-store',
      });
      const json = await res.json();
      if (!res.ok) {
        setLoadError(json as ApiError);
        return;
      }
      setData(json as CollectionData);
    } catch {
      setLoadError({ error: 'Service unavailable', code: 'INVALID_SESSION', retryable: true });
    } finally {
      setLoading(false);
    }
  }, [adminToken]);


  useEffect(() => {
    void load();
  }, [load]);

  // --- Optimistic include/exclude -----------------------------------------
  const handleToggle = useCallback(
    async (id: string, nextIncluded: boolean) => {
      if (!data) return;

      // Optimistic update.
      const nextStatus = nextIncluded ? 'approved' : 'removed';
      setData((prev) =>
        prev
          ? {
              ...prev,
              contributions: prev.contributions.map((c) =>
                c.id === id ? { ...c, status: nextStatus } : c,
              ),
            }
          : prev,
      );
      setToggleErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setSavingIds((prev) => new Set(prev).add(id));

      try {
        const res = await fetch('/api/collection/moderate', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            adminToken,
            contributionId: id,
            action: nextIncluded ? 'restore' : 'remove',
          }),
        });
        if (!res.ok) throw new Error('save failed');
      } catch {
        // Rollback.
        const revertStatus = nextIncluded ? 'removed' : 'approved';
        setData((prev) =>
          prev
            ? {
                ...prev,
                contributions: prev.contributions.map((c) =>
                  c.id === id ? { ...c, status: revertStatus } : c,
                ),
              }
            : prev,
        );
        setToggleErrors((prev) => ({ ...prev, [id]: "Couldn't save — tap to retry." }));
      } finally {
        setSavingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [adminToken, data],
  );

  // --- Finalize -----------------------------------------------------------
  // No payment happens here anymore. Both paid-in-advance and unpaid just
  // navigate to the result page's prefs step (?t={adminToken}); the charge (if
  // any) and the one-way "create the tribute" decision live there, so returning
  // to this dashboard can never re-open Paddle / double-charge.
  const handleFinalize = useCallback(() => {
    if (!data || finalizing) return;
    setFinalizing(true);

    // Stash the occasion so the result page can resolve/theme without a token.
    try {
      sessionStorage.setItem('wtm:occasion', occasion);
    } catch {
      /* sessionStorage may be unavailable; result page falls back to txn resolution */
    }

    window.location.href = `${resultPath}?t=${encodeURIComponent(adminToken)}`;
  }, [adminToken, data, finalizing, occasion, resultPath]);

  // --- Render --------------------------------------------------------------
  // Shared calm terminal layout for the deleted / gone / error screens — centered
  // with the occasion's terminalIcon, matching the contributor share page's
  // ClosedScreen (not a bare top-anchored block).
  const terminalScreen = (title: string, body: string, action: React.ReactNode) => (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-4 py-16 text-center">
      <div className="mb-6 text-5xl" aria-hidden="true">{terminalIcon}</div>
      <h1 className="font-serif text-2xl text-foreground md:text-3xl">{title}</h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{body}</p>
      <div className="mt-8">{action}</div>
    </div>
  );

  if (deleted) {
    return terminalScreen(
      'Collection deleted',
      'Your collection and every memory in it have been permanently removed.',
      <a href="/" className={buttonVariants({ size: 'lg' })}>Back to home</a>,
    );
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16">
        <div className="animate-pulse space-y-4">
          <div className="h-24 rounded-xl bg-muted" />
          <div className="h-40 rounded-xl bg-muted" />
          <div className="h-40 rounded-xl bg-muted" />
        </div>
      </div>
    );
  }

  if (loadError) {
    // NOT_FOUND is permanent (retryable:false) — the collection is genuinely gone
    // (deleted by the organizer, auto-removed after the 30-day keepsake window, or
    // the link is wrong). A "Try again" here can never succeed, and "use the manage
    // link from your email" is confusing when they're already on that link. Offer a
    // way home instead. Transient/service errors keep the retry.
    if (loadError.code === 'NOT_FOUND') {
      return terminalScreen(
        'This collection isn’t available',
        'It may have been deleted, or automatically removed after the 30-day keepsake window closed. If you just created it, open the private manage link from your confirmation email.',
        <a href="/" className={buttonVariants({ size: 'lg' })}>Back to home</a>,
      );
    }
    return terminalScreen(
      'We couldn’t open this collection',
      'Something went wrong on our end. Your collection is safe — please try again in a moment.',
      <Button onClick={() => void load()}>Try again</Button>,
    );
  }

  if (!data) return null;

  const includedCount = data.contributions.filter(isIncluded).length;
  const remaining = Math.max(0, data.minContributions - includedCount);
  const belowMin = includedCount < data.minContributions;
  // An include/exclude toggle failed to save and rolled back — the on-screen list
  // no longer matches the server, so finalizing now would synthesize from the
  // wrong set. Surface it page-level AND block finalize until it's retried.
  const hasToggleError = Object.keys(toggleErrors).length > 0;
  const generated = data.status === 'generated';
  // The organizer's own memory exists once any contribution is flagged isOrganizer.
  const hasOrganizerMemory = data.contributions.some((c) => c.isOrganizer);
  const badge = statusBadge(data.status, noun);
  const deadline = formatDeadline(data.deadline);
  const deadlineDaysLeft = daysUntil(data.deadline);
  // Resolve the price actually charged: base priceShown ($49), or the 10%
  // courtesy when a known partner referred this collection. Single source of
  // truth (resolvePrice) so the dashboard, per-person split, and advance-pay CTA
  // all match what Paddle charges — never show $49 then charge $44.
  const resolved = data.priceShown ? resolvePrice(data.priceShown, discountApplies) : null;
  const price = resolved ? resolved.display : null;
  const priceNum = resolved ? resolved.value : null;
  // Non-organizer contributors used + the link cap (3 free / 10 paid).
  const used = data.contributorCount ?? data.contributions.filter((c) => !c.isOrganizer && c.status !== 'removed').length;
  const capN = data.contributorCap ?? (data.paid ? 10 : 3);
  const linkFull = used >= capN;
  // Completeness scale = everyone who can add a memory: the invite cap (3 free /
  // 10 paid) plus the organizer's own memory. The bar grows with each memory
  // instead of snapping to full at the minimum-of-1 synthesis floor.
  const completenessTarget = capN + 1;
  const progressValue = Math.min(100, Math.round((includedCount / completenessTarget) * 100));

  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const shareLink = buildShareLink(origin, data.shareToken, data.occasion);
  const inviteText = buildInviteText(data.honoreeName, shareLink, noun);
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(inviteText)}`;
  const emailUrl = `mailto:?subject=${encodeURIComponent(
    `Add a memory for ${data.honoreeName}`,
  )}&body=${encodeURIComponent(inviteText)}`;

  const mem = (n: number) => (n === 1 ? 'memory' : 'memories');

  // One composed status sentence — replaces the old count line + "X of Y people"
  // line + progress caption (the count used to render ~5 ways).
  const countSentence =
    data.count === 0
      ? 'No memories yet — share your invite link to gather them.'
      : `${data.count} ${mem(data.count)} from ${used} of ${capN} invite spots${linkFull && !data.paid ? ' — link full' : ''}.`;

  // Deadline, staged by urgency (redesign §3.3): >14d → quiet meta-line, no
  // deletion language; ≤7d → the prominent box returns (honest late motivation);
  // 8–14d → meta-line + tooltip. Deletion consequences live in the tooltip +
  // delete-confirm only. The InfoTooltip text is kept verbatim (the only place
  // the paid-auto-create vs unpaid-delete distinction is explained).
  const deadlineTooltip = (
    <InfoTooltip
      label="What the deadline means"
      text={
        data.paid
          ? `On this date, memories close and we automatically create your ${noun} from the memories gathered so far (you don’t have to do anything). We email a reminder 3 days before.`
          : `On this date, memories close. Finalize before then to create your ${noun} — otherwise the collection and all its memories are permanently deleted. We email a reminder 3 days before.`
      }
    />
  );
  const deadlineNode =
    deadline && !generated ? (
      deadlineDaysLeft != null && deadlineDaysLeft <= 7 && deadlineDaysLeft >= 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-primary/30 bg-primary/5 px-4 py-3">
          <span aria-hidden className="mt-0.5 text-lg">🗓️</span>
          <div className="min-w-0 flex-1">
            <p className="flex flex-wrap items-center gap-x-2 text-sm font-semibold text-foreground">
              <span>Deadline: {deadline}</span>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
                {deadlineDaysLeft === 0 ? 'today' : `${deadlineDaysLeft} day${deadlineDaysLeft === 1 ? '' : 's'} left`}
              </span>
              {deadlineTooltip}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {data.paid
                ? `Memories close then — we’ll create your ${noun} automatically with whatever’s gathered.`
                : 'Finalize before then, or the collection and its memories are deleted.'}{' '}
              We’ll email a reminder 3 days before.
            </p>
          </div>
        </div>
      ) : (
        <p className="text-xs text-muted-foreground">
          Collecting until <span className="text-foreground">{deadline}</span> · we’ll email a reminder{' '}
          {deadlineTooltip}
        </p>
      )
    ) : null;

  // ---- Reusable blocks ----------------------------------------------------

  const bannerNode =
    justCreated && !generated ? (
      <div className="rounded-2xl border border-primary/30 bg-primary/5 p-5">
        <p className="font-serif text-lg text-foreground">Your collection is ready {successIcon}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Share your invite link below to gather memories of {data.honoreeName}. We’ve also emailed you this private link
          — it’s how you’ll come back to review and finalize.
        </p>
      </div>
    ) : null;

  // Tier-1 identity header (slimmed): honoree + status (+ Paid chip) + one
  // composed sentence + capacity bar + staged deadline meta.
  const headerCard = (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="font-serif text-2xl">{data.honoreeName}</CardTitle>
          <span className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap pt-1 text-xs font-medium text-muted-foreground">
            {data.paid && !generated ? (
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">Paid</span>
            ) : null}
            <span className="inline-flex items-center gap-1.5">
              <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">{countSentence}</p>
        {!generated ? (
          <Progress value={progressValue} aria-label={`Memories gathered toward capacity of ${completenessTarget}`} />
        ) : null}
        {deadlineNode}
      </CardContent>
    </Card>
  );

  // Add-your-own-memory — a single quiet row (not a full card) above the feed.
  const addMemoryRow =
    !generated && !hasOrganizerMemory ? (
      <div className="flex flex-col gap-2 rounded-xl bg-muted/30 p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          <span className="font-medium text-foreground">Add your own memory</span> of {data.honoreeName}.
        </p>
        <a
          href={`/c/${data.shareToken}?occasion=${data.occasion}&as=organizer&t=${encodeURIComponent(adminToken)}`}
          className={`${buttonVariants({ variant: 'outline', size: 'sm' })} self-start sm:self-auto`}
        >
          Write a memory
        </a>
      </div>
    ) : null;

  const memoryFeed = (
    <div className="space-y-3">
      {data.contributions.length === 0 ? (
        <Card size="sm">
          <CardContent className="p-8">
            <p className="font-serif text-lg text-foreground">No memories yet</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Share your invite link and memories will appear here as they come in.
            </p>
          </CardContent>
        </Card>
      ) : (
        [...data.contributions]
          .sort((a, b) => Number(b.isOrganizer ?? false) - Number(a.isOrganizer ?? false))
          .map((c) => (
            <MemoryCard
              key={c.id}
              contribution={c}
              included={isIncluded(c)}
              disabled={generated || savingIds.has(c.id)}
              canEdit={!generated}
              onToggle={handleToggle}
              onEdit={openEdit}
              error={toggleErrors[c.id] ?? null}
              deliverableNoun={noun}
              relationshipLabel={c.relationship ? (relationshipLabels[c.relationship] ?? c.relationship) : undefined}
            />
          ))
      )}
    </div>
  );

  const inviteCard = (opts: { copyVariant: 'default' | 'outline'; compact: boolean }) => (
    <Card>
      <CardContent className="p-5">
        <InviteBlock
          surface="dashboard"
          adminToken={adminToken}
          shareLink={shareLink}
          inviteText={inviteText}
          whatsappUrl={whatsappUrl}
          emailUrl={emailUrl}
          honoreeName={data.honoreeName}
          organizerEmail={organizerEmail}
          paid={!!data.paid}
          price={price}
          occasion={occasion}
          priceValue={priceNum ?? undefined}
          deliverableNoun={noun}
          linkCap={capN}
          linkFull={linkFull}
          copyVariant={opts.copyVariant}
          compact={opts.compact}
        />
      </CardContent>
    </Card>
  );

  // Tier-1 finalize hero — the only priced card, left-aligned, one solid CTA.
  const peopleCount = includedCount;
  const perPerson = price && priceNum && peopleCount >= 2 ? Math.round(priceNum / peopleCount) : null;
  const finalizeHero = (
    <div className="rounded-xl border border-border bg-card p-6">
      {includedCount === 0 ? (
        <>
          <p className="font-serif text-lg text-foreground">Your keepsake takes shape as memories come in</p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            As memories arrive, they’re woven into one {noun} — with a keepsake PDF to print and keep, and a spoken
            version to play {readAloud}.
          </p>
        </>
      ) : (
        <>
          <p className="font-serif text-lg text-foreground">
            Your keepsake from <span className="text-primary">{peopleCount}</span> {peopleCount === 1 ? 'person' : 'people'}
          </p>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted-foreground">
            One {noun} woven from {includedCount} {mem(includedCount)}, a keepsake PDF to print and keep, and a spoken
            version to play {readAloud}.
          </p>
        </>
      )}

      {/* Price framing only when payment is still due (pre-paid finalizes free). */}
      {price && !data.paid ? (
        <div className="mt-4 max-w-prose">
          <p className="text-sm text-foreground">
            <span className="font-medium">{price} for the whole group</span>, one time
            {perPerson != null ? <span className="text-muted-foreground"> — about ${perPerson} per person</span> : null}
          </p>
          {discountApplies && data.priceShown ? (
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {noun === 'tribute' ? (
                <>The courtesy {partnerName ?? 'your funeral home'} arranged is already included — {price} instead of ${data.priceShown}.</>
              ) : (
                <>{partnerName ?? 'A partner'} arranged a courtesy for you — {price} instead of ${data.priceShown}, applied automatically.</>
              )}
            </p>
          ) : null}
        </div>
      ) : null}

      <p className="mt-3 text-sm text-muted-foreground">
        {data.paid
          ? `On the next step you’ll choose how it reads — and the voice for the spoken version — then create the ${noun}.`
          : `Finalizing closes the collection. You’ll choose how it reads — and the voice for the spoken version — and pay${price ? ` your one-time ${price}` : ''} on the next step.`}
      </p>

      {hasToggleError ? (
        <p className="mt-3 max-w-prose rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive" role="alert">
          A change to which memories are included didn’t save. Retry it in the list above before finalizing, so your {noun} is woven from the right memories.
        </p>
      ) : null}

      <div className="mt-5">
        <Button
          size="lg"
          className="w-full sm:w-auto"
          disabled={belowMin || finalizing || hasToggleError}
          onClick={() => handleFinalize()}
          title={hasToggleError ? 'Retry the unsaved change above before finalizing' : undefined}
        >
          {finalizing ? 'Opening…' : `Review & create the ${noun}`}
        </Button>
      </div>
    </div>
  );

  // Quiet finalize footer line while still below the minimum (no second card).
  const finalizeGhost = (
    <div className="text-sm text-muted-foreground">
      <p>
        Free to gather — when you’re ready, <span className="text-foreground">review &amp; create the {noun}</span>
        {price && !data.paid ? ` (${price})` : ''}.
      </p>
      <p className="mt-1">
        {remaining} more {mem(remaining)} to finalize.
      </p>
    </div>
  );

  const generatedCard = (
    <Card>
      <CardContent className="space-y-4 p-6">
        <p className="font-serif text-xl text-foreground">Your {noun} has been created</p>
        <p className="text-muted-foreground">
          It was woven from {includedCount} {mem(includedCount)} and emailed to you.
        </p>
        <a href={`${resultPath}?t=${encodeURIComponent(adminToken)}`} className={buttonVariants({ size: 'lg' })}>
          View your {noun}
        </a>
      </CardContent>
    </Card>
  );

  // Footer meta — delete demoted to a quiet destructive text link (confirm kept).
  const dangerZone = (
    <div className="border-t border-border pt-6">
      {data.paid || generated ? (
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          Paid collections can’t be deleted here — contact support if you need to remove it.
        </p>
      ) : !confirmDelete ? (
        <p className="max-w-prose text-xs leading-relaxed text-muted-foreground">
          If you do nothing, this collection is automatically deleted about 30 days after the {noun} is created (or at the deadline if you never finalize).{' '}
          <button
            type="button"
            className="text-destructive underline underline-offset-2 hover:text-destructive/80"
            onClick={() => setConfirmDelete(true)}
          >
            Delete it now
          </button>
          .
        </p>
      ) : (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
          <p className="text-sm font-medium text-foreground">
            Delete this collection and all {data.count} {mem(data.count)}?
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            This permanently removes everything contributors shared. It can’t be undone.
          </p>
          {deleteError ? <p className="mt-2 text-sm text-destructive" role="alert">{deleteError}</p> : null}
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="button" variant="destructive" size="sm" disabled={deleting} onClick={() => void handleDelete()}>
              {deleting ? 'Deleting…' : 'Yes, delete everything'}
            </Button>
            <Button type="button" variant="outline" size="sm" disabled={deleting} onClick={() => setConfirmDelete(false)}>
              Keep collection
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      {/* Edit-your-memory modal — the full customer form, pre-populated. */}
      {editing ? (
        <div
          ref={dialogRef}
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/40 p-4 py-10"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-memory-title"
          onKeyDown={trapTab}
          onClick={(e) => { if (e.target === e.currentTarget) setEditing(null); }}
        >
          <Card className="w-full max-w-lg">
            <CardContent className="p-6">
              <h3 id="edit-memory-title" className="mb-4 font-serif text-xl text-foreground">Edit your memory</h3>
              <OrganizerMemoryForm
                mode="edit"
                adminToken={adminToken}
                contributionId={editing.id}
                honoreeLabel={data.honoreeName}
                initial={{
                  contributorName: editing.contributorName,
                  relationship: editing.relationship ?? editing.fields?.relationship ?? '',
                  relationshipDescription: editing.fields?.relationshipDescription ?? '',
                  qualities: editing.fields?.qualities ?? '',
                  favoriteMoment: editing.fields?.favoriteMoment ?? '',
                  // Older memories have no structured fields — fall back to the
                  // stored (composed) text so nothing is lost.
                  rawMemory: editing.fields?.rawMemory ?? editing.memory,
                }}
                onSaved={() => {
                  setEditing(null);
                  void load();
                }}
                onCancel={() => setEditing(null)}
              />
            </CardContent>
          </Card>
        </div>
      ) : null}

      {/* Dashboard content behind the modal — wrapped so it can be marked inert
          while the edit-memory modal is open. space-y-8 separates the tiers. */}
      <div ref={backgroundRef} className="space-y-8">
        {bannerNode}
        {headerCard}

        {generated ? (
          <>
            {generatedCard}
            {memoryFeed}
          </>
        ) : belowMin ? (
          // Still gathering — the invite is the hero (Copy = the one solid CTA);
          // finalize is a quiet footer line until the minimum is reached.
          <>
            {inviteCard({ copyVariant: 'default', compact: false })}
            {addMemoryRow}
            {memoryFeed}
            {finalizeGhost}
          </>
        ) : (
          // Finalizable — Review & create is the hero; the invite is demoted
          // (outline Copy) below it, its expanders intact.
          <>
            {addMemoryRow}
            {memoryFeed}
            {finalizeHero}
            {inviteCard({ copyVariant: 'outline', compact: true })}
          </>
        )}

        {dangerZone}
      </div>
    </div>
  );
}
