'use client';

import { Card, CardContent } from '@eilon-shai/venture-core/ui';
import { Badge, Button } from '@eilon-shai/venture-core/ui';

export interface Contribution {
  id: string;
  contributorName: string;
  relationship?: string | null;
  memory: string;
  /** 'pending' | 'approved' feed synthesis; 'removed' is excluded. */
  status: string;
  createdAt?: string | null;
  /** The organizer's own memory — pinned, always included, editable. */
  isOrganizer?: boolean;
  /** Structured raw fields (organizer memory) for re-opening the rich edit form. */
  fields?: Record<string, string> | null;
}

interface MemoryCardProps {
  contribution: Contribution;
  /** True when the memory will be woven into the tribute (status !== 'removed'). */
  included: boolean;
  /** Disables the toggle (e.g. collection already generated, or a save is in flight). */
  disabled?: boolean;
  /** Toggle handler — parent applies the change optimistically and rolls back on failure. */
  onToggle: (id: string, nextIncluded: boolean) => void;
  /** Inline error shown under the toggle when the last save failed. */
  error?: string | null;
  /** Edit handler — only used for the organizer's own memory. */
  onEdit?: (c: Contribution) => void;
  /** When false, hides the organizer Edit button entirely (e.g. after generation). */
  canEdit?: boolean;
  /** What the finished piece is called for this occasion ("tribute" | "toast" | …). */
  deliverableNoun?: string;
  /** Friendly relationship label for display (e.g. "Son or Daughter"); the raw
   *  `contribution.relationship` stays the value ("child") for the edit form. */
  relationshipLabel?: string;
}

function formatDate(iso?: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

/**
 * One contributed memory in the organizer dashboard. Opt-out model: included by
 * default; the toggle removes/restores. No "approve" language, no editing of the
 * contributor's words (v1 — moderate-contribution-handler exposes remove/restore only).
 */
export function MemoryCard({ contribution, included, disabled, onToggle, error, onEdit, canEdit = true, deliverableNoun, relationshipLabel }: MemoryCardProps) {
  const { id, contributorName, relationship, memory, createdAt, isOrganizer } = contribution;
  const date = formatDate(createdAt);
  const noun = (deliverableNoun ?? '').trim() || 'tribute';

  return (
    <Card size="sm" className={isOrganizer ? 'border-primary/40 ring-1 ring-primary/20' : included ? '' : 'opacity-60'}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-medium text-foreground">
              {contributorName}
              {isOrganizer ? (
                <Badge variant="secondary" className="ml-2 align-middle">Your memory</Badge>
              ) : null}
            </p>
            {relationship ? (
              <p className="text-sm text-muted-foreground">{relationshipLabel ?? relationship}</p>
            ) : null}
          </div>
          {/* Date + the include control on one right-aligned stack — the toggle
              moved up here (no more full-width border-t footer row). */}
          <div className="flex shrink-0 flex-col items-end gap-2">
            {date ? <span className="text-xs text-muted-foreground">{date}</span> : null}
            {isOrganizer ? (
              canEdit ? (
                <Button type="button" variant="outline" size="sm" disabled={disabled} onClick={() => onEdit?.(contribution)}>
                  Edit
                </Button>
              ) : (
                <span className="text-xs text-muted-foreground">Always in the {noun}</span>
              )
            ) : (
              <label
                className={`flex items-center gap-2 text-xs ${
                  disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                }`}
              >
                <span className="select-none text-muted-foreground">{included ? 'Included' : 'Not included'}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={included}
                  aria-label={`Include in the ${noun}`}
                  disabled={disabled}
                  onClick={() => onToggle(id, !included)}
                  className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed ${
                    included ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform ${
                      included ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </label>
            )}
          </div>
        </div>

        {/* Contributors' words are the emotional core — never truncate. */}
        <p className="speech-text mt-3 whitespace-pre-wrap text-[1.05rem] leading-relaxed text-foreground/90">
          {memory}
        </p>

        {error ? (
          <p className="mt-2 text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
