import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Edge middleware. Two concerns:
//  1. UNDER_CONSTRUCTION gate — when `UNDER_CONSTRUCTION=true`, page routes serve
//     a maintenance screen (503) so the public can't reach the app pre-launch.
//     APIs and static assets are exempt (webhooks/cron/payment must keep working,
//     and the bypassing operator's browser still needs JS/CSS). Bypass with
//     `?preview=<SUPPORT_PASSWORD>` once → sets a cookie → you browse normally
//     (so prod E2E works while the public sees "coming soon").
//  2. HTTP Basic Auth for the internal /support console (fail-closed in prod).
// ---------------------------------------------------------------------------

const PREVIEW_COOKIE = 'wtm-preview';

// Constant-time string compare (edge runtime has no crypto.timingSafeEqual).
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function constructionResponse(): NextResponse {
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>Words That Matter — coming soon</title>
<style>
  body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;
    background:#f5f0e8;color:#2a2118;font-family:Georgia,'Times New Roman',serif;text-align:center;padding:2rem}
  .wrap{max-width:30rem}
  h1{font-size:2rem;font-weight:400;margin:0 0 1rem}
  p{color:#5c4f3d;line-height:1.6;font-size:1rem}
  a{color:#6b5a45}
</style></head>
<body><div class="wrap">
  <p style="letter-spacing:.3em;text-transform:uppercase;font-size:.75rem;color:#6b5a45">Words That Matter</p>
  <h1>We’ll be right back.</h1>
  <p>We’re putting the finishing touches on something meaningful. Please check back soon — or reach us at <a href="mailto:hello@wordsbywtm.com">hello@wordsbywtm.com</a>.</p>
</div></body></html>`;
  return new NextResponse(html, {
    status: 503,
    headers: { 'content-type': 'text/html; charset=utf-8', 'Retry-After': '3600', 'Cache-Control': 'no-store' },
  });
}

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Support", charset="UTF-8"' },
  });
}

export function middleware(req: NextRequest): NextResponse {
  const { pathname } = req.nextUrl;
  const password = process.env.SUPPORT_PASSWORD;

  // 1) UNDER_CONSTRUCTION gate — page routes only (APIs keep serving so Paddle
  //    webhooks, crons, and the bypassing operator's fetches still work).
  if (process.env.UNDER_CONSTRUCTION === 'true' && !pathname.startsWith('/api/')) {
    // Set the bypass cookie when ?preview=<SUPPORT_PASSWORD> is provided, then
    // redirect to the clean URL.
    const preview = req.nextUrl.searchParams.get('preview');
    if (preview && password && safeEqual(preview, password)) {
      const clean = req.nextUrl.clone();
      clean.searchParams.delete('preview');
      const res = NextResponse.redirect(clean);
      res.cookies.set(PREVIEW_COOKIE, password, {
        httpOnly: true, secure: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24,
      });
      return res;
    }
    const cookie = req.cookies.get(PREVIEW_COOKIE)?.value ?? '';
    const bypassed = !!password && safeEqual(cookie, password);
    if (!bypassed) return constructionResponse();
  }

  // 2) Support console Basic Auth — only the support routes.
  const isSupport = pathname === '/support' || pathname.startsWith('/support/') || pathname.startsWith('/api/support/');
  if (isSupport) {
    const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
    if (!password) {
      if (isProd) return new NextResponse('Support console is not configured.', { status: 503 });
      return NextResponse.next();
    }
    const header = req.headers.get('authorization') ?? '';
    if (header.startsWith('Basic ')) {
      try {
        const decoded = atob(header.slice(6));
        const pass = decoded.slice(decoded.indexOf(':') + 1);
        if (safeEqual(pass, password)) return NextResponse.next();
      } catch {
        /* malformed header — fall through to 401 */
      }
    }
    return unauthorized();
  }

  return NextResponse.next();
}

export const config = {
  // Run on everything except Next internals + static assets (so the construction
  // gate covers all pages; APIs are handled inside via the /api skip).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|sitemap.xml|.*\\.(?:png|jpg|jpeg|svg|webp|ico)$).*)'],
};
