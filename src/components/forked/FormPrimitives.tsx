'use client';

// ---------------------------------------------------------------------------
// Forked from venture-core IntakeForm.tsx (un-exported helpers). These give the
// ContributorForm pixel-identical TributeWords styling without depending on
// IntakeForm itself (which is a payment terminal — see COLLECTION_FLOW_DESIGN §4).
// Retyped to FormFieldConfig (the collection field shape) instead of FieldDef.
// ---------------------------------------------------------------------------

import * as React from 'react';
import {
  Card,
  CardContent,
  Input,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@eilon-shai/venture-core/ui';
import type { FormFieldConfig } from '@eilon-shai/venture-core/types';

// ---- pure helpers ----------------------------------------------------------

export function wordCount(text: string | undefined): number {
  if (!text) return 0;
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

export interface WordCountBand {
  gte: number;
  lt?: number;
  message: string;
  colorClass: string;
}

// ---- atoms -----------------------------------------------------------------

export function Spinner({ size = 20 }: { size?: number }) {
  return (
    <svg
      className="animate-spin text-primary"
      style={{ width: size, height: size }}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 mb-5">
      <span className="text-xs font-semibold uppercase tracking-widest text-primary whitespace-nowrap">
        {children}
      </span>
      <div className="flex-1 h-px bg-border" />
    </div>
  );
}

export function FieldError({ fieldId, message }: { fieldId?: string; message?: string }) {
  if (!message) return null;
  return (
    <p
      id={fieldId ? `${fieldId}-error` : undefined}
      role="alert"
      className="mt-1 text-xs text-destructive"
    >
      {message}
    </p>
  );
}

export function CharCounter({
  value,
  maxLength,
  warnThreshold = 80,
}: {
  value: string;
  maxLength: number;
  warnThreshold?: number;
}) {
  const remaining = maxLength - value.length;
  const cls = remaining < warnThreshold ? 'text-destructive' : 'text-muted-foreground';
  return <p className={`text-xs tabular-nums mt-1 ${cls}`}>{remaining} characters remaining</p>;
}

export function WordCounter({ value, bands }: { value: string; bands: WordCountBand[] }) {
  const wc = wordCount(value);
  let band: WordCountBand | undefined;
  for (const b of bands) {
    const inLower = wc >= b.gte;
    const inUpper = b.lt === undefined ? true : wc < b.lt;
    if (inLower && inUpper) {
      band = b;
      break;
    }
  }
  const colorClass = band?.colorClass ?? 'text-muted-foreground';
  const message = band?.message ?? '';
  return (
    <p className={`text-xs ${colorClass}`} data-testid="word-counter">
      {wc} words{message ? ` — ${message}` : ''}
    </p>
  );
}

// ---- amber soft-block / coaching panel -------------------------------------
// Forked from venture-core MemoriesBlockedPanel. Amber coaching panel with an
// optional override action: when onOverride is provided, render the amber button
// (matching IntakeForm styling) that lets the contributor proceed with what
// they've written, bypassing the memory gate (POST overrideValidation:true).

export function MemoriesBlockedPanel({
  reason,
  onOverride,
  overrideLabel,
}: {
  reason: string | null;
  onOverride?: () => void;
  overrideLabel?: string;
}) {
  return (
    <div role="alert" aria-live="polite" className="bg-amber-50 border border-amber-200 rounded-xl p-6 space-y-3">
      <h3 className="text-sm font-semibold text-amber-800">A little more would help</h3>
      {reason && <p className="text-sm text-amber-700 leading-relaxed">{reason}</p>}
      <p className="text-xs text-amber-700/80 leading-relaxed">
        One specific moment is enough — something they said, a habit, a time they showed up for you.
      </p>
      {onOverride && (
        <button
          type="button"
          onClick={onOverride}
          className="w-full rounded-full py-2.5 text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700 transition-colors"
        >
          {overrideLabel ?? "Add what I've written"}
        </button>
      )}
    </div>
  );
}

// ---- generic error banner --------------------------------------------------

export function ErrorBanner({
  message,
  retryable,
  onRetry,
  submitting,
}: {
  message: string;
  retryable: boolean;
  onRetry: () => void;
  submitting: boolean;
}) {
  return (
    <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-destructive" role="alert">
      <div className="flex items-start gap-3">
        <span aria-hidden="true">⚠</span>
        <span>{message}</span>
      </div>
      {retryable && (
        <button
          type="button"
          disabled={submitting}
          onClick={onRetry}
          className="mt-3 w-full rounded-full py-2.5 text-sm font-semibold border border-destructive/30 hover:bg-destructive/10 disabled:opacity-50 transition-colors"
        >
          {submitting ? 'Retrying…' : 'Try again →'}
        </button>
      )}
    </div>
  );
}

// ---- field renderers (retyped to FormFieldConfig) --------------------------

export function TextFieldRenderer({
  field,
  value,
  error,
  onChange,
  onBlur,
  min,
  max,
  autoComplete,
  inputType: inputTypeOverride,
}: {
  field: FormFieldConfig;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  /** For date fields: min/max ISO date strings. */
  min?: string;
  max?: string;
  /** Autofill hint. Use 'new-password' (not 'off' — Chrome ignores it on email
   *  inputs) to block autofill on a confirm-email field. */
  autoComplete?: string;
  /** Override the native input type (e.g. 'email' for the confirm-email field). */
  inputType?: 'text' | 'email';
}) {
  // Honor the date type so the deadline gets a native date picker; otherwise allow
  // an explicit override (e.g. 'email'), defaulting to a plain text input.
  const inputType = field.type === 'date' ? 'date' : inputTypeOverride ?? 'text';
  return (
    <Input
      id={field.name}
      type={inputType}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onBlur}
      placeholder={field.placeholder}
      maxLength={field.maxLength}
      min={inputType === 'date' ? min : undefined}
      max={inputType === 'date' ? max : undefined}
      autoComplete={autoComplete}
      aria-required={field.required || undefined}
      aria-invalid={!!error || undefined}
      aria-describedby={error ? `${field.name}-error` : undefined}
      className={error ? 'border-destructive focus-visible:ring-destructive' : ''}
    />
  );
}

export function TextareaFieldRenderer({
  field,
  value,
  error,
  rows = 7,
  onChange,
}: {
  field: FormFieldConfig;
  value: string;
  error?: string;
  rows?: number;
  onChange: (v: string) => void;
}) {
  return (
    <Textarea
      id={field.name}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={field.placeholder}
      rows={rows}
      maxLength={field.maxLength}
      aria-required={field.required || undefined}
      aria-invalid={!!error || undefined}
      aria-describedby={error ? `${field.name}-error` : undefined}
      className={`resize-none${error ? ' border-destructive focus-visible:ring-destructive' : ''}`}
    />
  );
}

export function SelectFieldRenderer({
  field,
  value,
  error,
  onChange,
}: {
  field: FormFieldConfig;
  value: string;
  error?: string;
  onChange: (v: string) => void;
}) {
  // Base UI's <Select> renders the raw VALUE in the trigger (and SelectValue)
  // unless it's given an `items` value→label map — without it the trigger showed
  // e.g. "child" instead of "Son or Daughter" (E2E finding F-3).
  const items = Object.fromEntries((field.options ?? []).map((o) => [o.value, o.label]));
  return (
    <Select items={items} value={value || undefined} onValueChange={(v) => onChange(v ?? '')}>
      <SelectTrigger
        id={field.name}
        className="w-full"
        aria-required={field.required || undefined}
        aria-invalid={!!error || undefined}
        aria-describedby={error ? `${field.name}-error` : undefined}
      >
        <SelectValue placeholder={field.placeholder ?? 'Select an option'} />
      </SelectTrigger>
      <SelectContent>
        {(field.options ?? []).map((opt) => (
          <SelectItem key={opt.value} value={opt.value} data-value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ---- field row + section card ----------------------------------------------

export function FieldRow({
  field,
  value,
  error,
  onChange,
  onBlur,
  rows,
  children,
  dateMin,
  dateMax,
  autoComplete,
  inputType,
}: {
  field: FormFieldConfig;
  value: string;
  error?: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  rows?: number;
  /** Extra content rendered below the control (e.g. a word counter). */
  children?: React.ReactNode;
  /** Date field bounds (ISO yyyy-mm-dd). */
  dateMin?: string;
  dateMax?: string;
  /** e.g. 'off' to block autofill (confirm-email). */
  autoComplete?: string;
  /** Override the text input type (e.g. 'email' for the confirm-email field). */
  inputType?: 'text' | 'email';
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={field.name} className="text-sm font-medium text-foreground">
        {field.label}
        {field.required ? (
          // Decorative asterisk only — "required" is announced to screen readers
          // via aria-required on the control itself, so we DON'T add label text
          // (that would change the field's accessible name, e.g. break exact-name
          // queries and read "Your email required" to AT redundantly).
          <span className="text-destructive ml-1" aria-hidden="true">
            *
          </span>
        ) : (
          <span className="ml-2 text-xs font-normal text-muted-foreground">(optional)</span>
        )}
      </label>
      {field.type === 'textarea' ? (
        <TextareaFieldRenderer field={field} value={value} error={error} rows={rows} onChange={onChange} />
      ) : field.type === 'select' ? (
        <SelectFieldRenderer field={field} value={value} error={error} onChange={onChange} />
      ) : (
        <TextFieldRenderer
          field={field}
          value={value}
          error={error}
          onChange={onChange}
          onBlur={onBlur}
          min={dateMin}
          max={dateMax}
          autoComplete={autoComplete}
          inputType={inputType}
        />
      )}
      {children}
      <FieldError fieldId={field.name} message={error} />
    </div>
  );
}

export function SectionCard({
  heading,
  children,
}: {
  heading?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="border border-border shadow-sm">
      <CardContent className="p-6 md:p-8 space-y-5">
        {heading && <SectionHeading>{heading}</SectionHeading>}
        {children}
      </CardContent>
    </Card>
  );
}
