'use client';

// Client boundary for venture-core's ResultPage.
//
// The venture-core 1.6.0 `dist/components` barrel ships WITHOUT a 'use client'
// directive, so Next.js treats every component in it (ResultPage, LandingPage,
// …) as a Server Component. ResultPage calls React.createContext at module
// scope, which throws "createContext is not a function" during RSC page-data
// collection. Re-exporting it from this 'use client' module restores the client
// boundary so Next bundles it for the browser. (Remove once venture-core marks
// its component bundle 'use client'.)
export { ResultPage } from '@eilon-shai/venture-core/components';
