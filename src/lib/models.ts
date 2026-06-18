// Synthesis model selection.
//
// The woven-tribute synthesis is the quality-critical, paid step, so production
// runs Claude Sonnet 4.6 ($3/$15 per 1M tokens). Sandbox/preview can override to
// the cheapest model (Haiku 4.5, $1/$5 — ~3x cheaper) since output quality isn't
// the point there.
//
// Set SYNTHESIS_MODEL in the environment to override; leave it unset in
// production. Read server-side only (config is consumed by the venture-core
// synthesis handler at request time).
//   sandbox/preview:  SYNTHESIS_MODEL=claude-haiku-4-5
//   production:       (unset → claude-sonnet-4-6)
export const SYNTHESIS_MODEL = process.env.SYNTHESIS_MODEL || 'claude-sonnet-4-6';
