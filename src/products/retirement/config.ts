import type { ProductConfig } from '@eilon-shai/venture-core/types';

// ---------------------------------------------------------------------------
// Retirement occasion — STUB (live: false). Not yet launched. Present only so
// the registry typechecks and the root hub can render a "coming soon" card. No
// collectionConfig => the create/collection flow is not available for this
// occasion. Flesh out (collectionConfig, landing, accent) before going live.
// ---------------------------------------------------------------------------

const FROM_EMAIL = 'Words That Matter <hello@wordsbywtm.com>';

const STUB_AI_CONFIG = {
  modelBasic: 'claude-sonnet-4-6',
  modelFull: 'claude-sonnet-4-6',
  primaryDimension: 'relationship',
  systemPrompts: {},
  toneDescriptions: {},
  lengthTargets: {},
  fullPackageTones: [],
  buildUserPrompt: () => '',
  safetyPreamble: '',
  forceGenerateOverride: '',
  sparseInputStrategy: '',
};

export const retirementConfig: ProductConfig = {
  schemaVersion: 1,
  brand: {
    productName: 'Words That Matter — Retirement',
    productSlug: 'retirement',
    domain: 'https://wordsbywtm.com',
    formPath: '/retirement/start',
    resultPath: '/retirement/result',
    redisKeyPrefix: 'wtm-retirement',
    paddleProductId: process.env.PADDLE_PRODUCT_ID_RETIREMENT ?? '',
  },
  tiers: {
    basic: {
      priceId: '',
      priceIdSandbox: '',
      label: 'Retirement Tribute',
      modelLabel: 'Claude Sonnet',
      displayPrice: 49,
    },
    full: {
      priceId: '',
      priceIdSandbox: '',
      label: 'Retirement Tribute',
      modelLabel: 'Claude Sonnet',
      displayPrice: 49,
      isDefault: true,
    },
  },
  aiConfig: STUB_AI_CONFIG,
  formFields: [],
  primaryDimension: 'relationship',
  toneDimension: 'tone',
  narrativeFieldName: 'memory',
  lockTtlMs: 90000, // >= synthesis maxDuration(60s)+margin so the lock outlives generation (BE-01)
  email: {
    fromEmail: FROM_EMAIL,
    ownerEmail: 'eilon.shai@gmail.com',
    productLabel: 'Words That Matter — Retirement',
    brandColor: '#b3935a',
    brandBackground: '#f5f0e8',
    buildFormLinkEmail: (_txnId, _tier, appUrl, to) => ({
      from: FROM_EMAIL,
      to,
      subject: 'Your retirement tribute',
      html: `<p>Continue at ${appUrl}</p>`,
    }),
    buildContentEmail: (_result, customerEmail) => ({
      from: FROM_EMAIL,
      to: customerEmail,
      subject: 'Your retirement tribute',
      html: `<p>Your tribute is ready.</p>`,
    }),
    ownerEmailSubjectTemplate: (info) => `New retirement collection — ${info.customerEmail}`,
  },
  legal: { termsUrl: '/terms', privacyUrl: '/privacy', refundUrl: '/refund' },
  termsVersion: '2026-06-17',
  // No collectionConfig — occasion not live.
};
