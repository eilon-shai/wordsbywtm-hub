import type { MetadataRoute } from 'next';

// Canonical host — non-www, matching the layout canonical + sitemap.
const HOST = 'https://wordsbywtm.com';

// Allow crawling of the public marketing surface; disallow private, token-bearing,
// and operational paths (contributor share links, the organizer collect flow,
// the support dashboard, and the API).
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/c/', '/collect/', '/support', '/api/'],
    },
    sitemap: `${HOST}/sitemap.xml`,
    host: HOST,
  };
}
