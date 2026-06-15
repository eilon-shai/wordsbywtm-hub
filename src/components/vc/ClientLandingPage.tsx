'use client';

// Client boundary for venture-core's LandingPage — see ClientResultPage.tsx for
// why this re-export wrapper is needed (1.6.0 component barrel lacks the
// 'use client' directive, so createContext crashes during RSC evaluation).
export { LandingPage, MOCK_TESTIMONIALS } from '@eilon-shai/venture-core/components';
