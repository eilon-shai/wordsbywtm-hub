'use client';

// ---------------------------------------------------------------------------
// OrganizerMemoryForm — the RICH customer form for the organizer's OWN memory,
// used in two places so it's identical to the create-flow form:
//   • write-later: the dashboard "Add your own memory" link (mode="create")
//   • edit:        the dashboard Edit button (mode="edit"), pre-populated
//
// It captures the same structured fields as CreateForm (relationship select +
// describe, the memories, qualities, a favorite moment) and sends them as
// `fields` so the memory can be re-opened fully populated. The composed `memory`
// string (what synthesis + the cards show) is rebuilt on every save.
// ---------------------------------------------------------------------------

import * as React from 'react';
import type { FormFieldConfig } from '@eilon-shai/venture-core/types';
import { validateMemoriesField } from '@eilon-shai/venture-core/validation';
import { Button } from '@eilon-shai/venture-core/ui';
import {
  SectionCard,
  FieldRow,
  WordCounter,
  MemoriesBlockedPanel,
  wordCount,
  type WordCountBand,
} from '@/components/forked/FormPrimitives';

const NAME_FIELD: FormFieldConfig = { name: 'contributorName', type: 'text', label: 'Your name', placeholder: 'e.g. Sarah', required: true, maxLength: 100 };
const RELATIONSHIP_FIELD: FormFieldConfig = {
  name: 'relationship', type: 'select', label: 'Your relationship', required: true,
  options: [
    { value: 'child', label: 'Son or Daughter' },
    { value: 'parent', label: 'Mother or Father' },
    { value: 'sibling', label: 'Brother or Sister' },
    { value: 'spouse', label: 'Husband, Wife, or Partner' },
    { value: 'friend', label: 'Close Friend' },
    { value: 'colleague', label: 'Colleague or Mentor' },
    { value: 'other', label: 'Other' },
  ],
};
const RELDESC_FIELD: FormFieldConfig = { name: 'relationshipDescription', type: 'text', label: 'Describe your relationship briefly', placeholder: 'e.g. her eldest daughter, his best friend of 30 years', required: true, maxLength: 200 };
const MEMORY_FIELD: FormFieldConfig = { name: 'memory', type: 'textarea', label: '2–3 specific memories or stories', placeholder: 'A specific moment — even a small one — beats a list of nice words.', required: true, maxLength: 4000 };
const QUALITIES_FIELD: FormFieldConfig = { name: 'qualities', type: 'textarea', label: 'What qualities made them who they were?', placeholder: 'e.g. endlessly patient, quietly funny, the first to show up when anyone needed help', required: true, maxLength: 1000 };
const MOMENT_FIELD: FormFieldConfig = { name: 'favoriteMoment', type: 'textarea', label: 'A favorite moment (optional)', placeholder: 'A specific story or moment, if one comes to mind.', required: false, maxLength: 600 };

const MEMORY_BANDS: WordCountBand[] = [
  { gte: 0, lt: 20, message: 'a little short — please add a few more sentences', colorClass: 'text-destructive' },
  { gte: 20, lt: 60, message: 'this is good — add a detail if you can', colorClass: 'text-primary' },
  { gte: 60, message: 'wonderful, thank you', colorClass: 'text-emerald-700' },
];

export interface OrganizerMemoryFields {
  contributorName?: string;
  relationship?: string;
  relationshipDescription?: string;
  qualities?: string;
  favoriteMoment?: string;
  rawMemory?: string;
}

interface OrganizerMemoryFormProps {
  mode: 'create' | 'edit';
  honoreeLabel: string;
  /** create: contributor share token. */
  shareToken?: string;
  /** create: the organizer's email (from the collection) — sent so the memory
   *  carries an identity even though it's the organizer's own. */
  organizerEmail?: string;
  /** edit: admin token + the contribution being edited. */
  adminToken?: string;
  contributionId?: string;
  /** edit: pre-populate from the stored structured fields. */
  initial?: OrganizerMemoryFields;
  /** create: where to go after saving (the manage dashboard). */
  returnHref?: string;
  /** When set, the organizer's name is already known (captured at create) — show
   *  it read-only instead of asking again. */
  lockedName?: string;
  /** edit: called after a successful save. */
  onSaved?: () => void;
  onCancel?: () => void;
}

function compose(f: { memory: string; qualities: string; favoriteMoment: string; relationshipDescription: string }): string {
  return [
    f.memory.trim(),
    f.qualities.trim() ? `What made them who they were: ${f.qualities.trim()}` : '',
    f.favoriteMoment.trim() ? `A favorite moment: ${f.favoriteMoment.trim()}` : '',
    f.relationshipDescription.trim() ? `Relationship: ${f.relationshipDescription.trim()}` : '',
  ].filter(Boolean).join('\n\n');
}

export function OrganizerMemoryForm({
  mode, honoreeLabel, shareToken, organizerEmail, adminToken, contributionId, initial, returnHref, lockedName, onSaved, onCancel,
}: OrganizerMemoryFormProps) {
  const [name, setName] = React.useState(initial?.contributorName ?? lockedName ?? '');
  const [relationship, setRelationship] = React.useState(initial?.relationship ?? '');
  const [relDesc, setRelDesc] = React.useState(initial?.relationshipDescription ?? '');
  const [memory, setMemory] = React.useState(initial?.rawMemory ?? '');
  const [qualities, setQualities] = React.useState(initial?.qualities ?? '');
  const [moment, setMoment] = React.useState(initial?.favoriteMoment ?? '');

  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [blockedReason, setBlockedReason] = React.useState<string | null>(null);
  const [overridden, setOverridden] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const idem = React.useRef<string>('');
  if (!idem.current) {
    idem.current = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `ck-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }

  async function submit(forceOverride = false) {
    setFormError(null);
    const errs: Record<string, string | undefined> = {};
    if (!name.trim()) errs.contributorName = 'Please add your name.';
    if (!relationship) errs.relationship = 'Please choose your relationship.';
    if (!relDesc.trim()) errs.relationshipDescription = 'Please describe your relationship.';
    if (!memory.trim()) errs.memory = 'Please share a memory.';
    if (!qualities.trim()) errs.qualities = 'Please add a few words about them.';
    if (Object.keys(errs).length) { setErrors(errs); return; }
    setErrors({});

    if (!forceOverride && !overridden) {
      const check = validateMemoriesField(memory);
      if (!check.valid) { setBlockedReason(check.reason); return; }
    }
    setBlockedReason(null);

    const composed = compose({ memory, qualities, favoriteMoment: moment, relationshipDescription: relDesc });
    const fields = {
      rawMemory: memory.trim(),
      relationshipDescription: relDesc.trim(),
      qualities: qualities.trim(),
      ...(moment.trim() ? { favoriteMoment: moment.trim() } : {}),
    };

    setSaving(true);
    try {
      const useOverride = forceOverride || overridden;
      const res = mode === 'create'
        ? await fetch('/api/collection/contribute', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ shareToken, contributorName: name.trim(), ...(organizerEmail ? { contributorEmail: organizerEmail } : {}), relationship, memory: composed, consent: true, idempotencyKey: idem.current, isOrganizer: true, ...(adminToken ? { adminToken } : {}), fields, ...(useOverride ? { overrideValidation: true } : {}) }),
          })
        : await fetch('/api/collection/edit', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ adminToken, contributionId, memory: composed, fields, overrideValidation: true }),
          });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; code?: string; error?: string };
      if (res.ok && data.ok) {
        if (mode === 'create' && returnHref) { window.location.href = returnHref; return; }
        onSaved?.();
        return;
      }
      if (data.code === 'INVALID_MEMORY') { setBlockedReason(data.error ?? 'Please add a little more detail.'); setSaving(false); return; }
      if (data.code === 'CONTRIBUTION_EXISTS') { setFormError(data.error ?? 'You’ve already added your own memory.'); setSaving(false); return; }
      setFormError(data.error ?? 'Something went wrong saving your memory. Please try again.');
      setSaving(false);
    } catch {
      setFormError('Network problem — your words are safe. Please try again.');
      setSaving(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); void submit(); }} noValidate className="space-y-5">
      <SectionCard heading="About you">
        {lockedName ? (
          // Name was captured when the collection was created — show it, don't re-ask.
          <p className="text-sm text-muted-foreground">
            Adding your memory as <span className="font-medium text-foreground">{lockedName}</span>.
          </p>
        ) : (
          <FieldRow field={NAME_FIELD} value={name} error={errors.contributorName} onChange={setName} />
        )}
        <FieldRow field={RELATIONSHIP_FIELD} value={relationship} error={errors.relationship} onChange={setRelationship} />
        <FieldRow field={RELDESC_FIELD} value={relDesc} error={errors.relationshipDescription} onChange={setRelDesc} />
      </SectionCard>

      <SectionCard heading="Your memory">
        <FieldRow field={MEMORY_FIELD} value={memory} error={errors.memory} rows={8} onChange={(v) => { setMemory(v); setBlockedReason(null); }}>
          <WordCounter value={memory} bands={MEMORY_BANDS} />
        </FieldRow>
        <FieldRow field={QUALITIES_FIELD} value={qualities} error={errors.qualities} rows={3} onChange={setQualities} />
        <FieldRow field={MOMENT_FIELD} value={moment} rows={3} onChange={setMoment} />
      </SectionCard>

      {blockedReason && (
        <MemoriesBlockedPanel
          reason={blockedReason}
          onOverride={() => { setOverridden(true); setBlockedReason(null); void submit(true); }}
          overrideLabel="Use what I’ve written"
        />
      )}

      {formError && (
        <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </div>
      )}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" size="lg" disabled={saving} className="sm:flex-1">
          {saving ? 'Saving…' : mode === 'edit' ? 'Save changes' : 'Add my memory'}
        </Button>
        {onCancel && (
          <Button type="button" variant="outline" size="lg" disabled={saving} onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
      {/* word count hint for very short memories */}
      {wordCount(memory) > 0 && wordCount(memory) < 20 && (
        <p className="text-center text-xs text-muted-foreground">A little more detail and you’re set.</p>
      )}
    </form>
  );
}
