import type { MetadataRoute } from 'next';
import { OCCASIONS } from '@/lib/registry';
import { GUIDES } from '@/lib/guides';

// Canonical host — www, matching the layout metadataBase/canonical, robots, and
// the live apex→www redirect, so submitted sitemap URLs resolve 200 directly
// instead of redirecting (which GSC flags as "Page with redirect").
const HOST = 'https://www.wordsbywtm.com';

// Public, indexable pages only: the home hub + the live per-occasion landings.
// Token-bearing routes (/c/, /collect/, /support, /api/) are private and excluded
// (see robots.ts).
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const occasionPages = OCCASIONS.filter((o) => o.live).map((o) => ({
    url: `${HOST}/${o.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // SEO content section: the guides index + each guide article (all static).
  const guidePages = GUIDES.map((g) => ({
    url: `${HOST}/guides/${g.slug}`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [
    {
      url: HOST,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    ...occasionPages,
    {
      // Partner program page (indexable; /partners/card is noindex tooling).
      url: `${HOST}/partners`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
    {
      url: `${HOST}/guides`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    ...guidePages,
  ];
}
