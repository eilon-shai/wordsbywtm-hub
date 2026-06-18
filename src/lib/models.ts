// Synthesis model selection.
//
// The woven-tribute synthesis is the quality-critical, paid step, so the default
// is our strongest writer, Claude Opus 4.8 ($5/$25 per 1M tokens) — a few cents
// per tribute against a $49 sale. Sandbox/preview can override to the cheapest
// model (Haiku 4.5, $1/$5) since output quality isn't the point there.
//
// Set SYNTHESIS_MODEL in the environment to override; leave it unset in
// production. Read server-side only (config is consumed by the venture-core
// synthesis handler at request time).
//   sandbox/preview:  SYNTHESIS_MODEL=claude-haiku-4-5
//   production:       (unset → claude-opus-4-8)
export const SYNTHESIS_MODEL = process.env.SYNTHESIS_MODEL || 'claude-opus-4-8';
