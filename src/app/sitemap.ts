import type { MetadataRoute } from 'next';
import { OCCASIONS } from '@/lib/registry';

// Canonical host — non-www, matching the layout's alternates.canonical. (The
// metadataBase is www, but every canonical points here; SEO should follow the
// canonical host.)
const HOST = 'https://wordsbywtm.com';

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

  return [
    {
      url: HOST,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 1,
    },
    ...occasionPages,
  ];
}
