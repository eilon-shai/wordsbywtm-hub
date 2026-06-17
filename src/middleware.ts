import { NextRequest, NextResponse } from 'next/server';

// ---------------------------------------------------------------------------
// Edge middleware — HTTP Basic Auth for the internal support console ONLY.
// Gates /support and /api/support/* so the rest of the (public) site is
// untouched. Password comes from SUPPORT_PASSWORD; any username is accepted.
//
// Fail-closed in production: if SUPPORT_PASSWORD is unset, the support routes
// return 503 (never silently public). In dev/preview without the var, access is
// allowed so local work isn't blocked.
// ---------------------------------------------------------------------------

// Constant-time string compare. The edge runtime has no crypto.timingSafeEqual,
// so compare every char (length-padded) and OR the diffs — avoids leaking the
// password length / prefix via response timing.
function safeEqual(a: string, b: string): boolean {
  const len = Math.max(a.length, b.length);
  let diff = a.length ^ b.length;
  for (let i = 0; i < len; i++) {
    diff |= (a.charCodeAt(i) || 0) ^ (b.charCodeAt(i) || 0);
  }
  return diff === 0;
}

function unauthorized(): NextResponse {
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Support", charset="UTF-8"' },
  });
}

export function middleware(req: NextRequest): NextResponse {
  const password = process.env.SUPPORT_PASSWORD;
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';

  if (!password) {
    // No password configured: refuse in production, allow in dev/preview.
    if (isProd) {
      return new NextResponse('Support console is not configured.', { status: 503 });
    }
    return NextResponse.next();
  }

  const header = req.headers.get('authorization') ?? '';
  if (header.startsWith('Basic ')) {
    try {
      // "Basic base64(user:pass)" — accept any username, check the password.
      const decoded = atob(header.slice(6));
      const pass = decoded.slice(decoded.indexOf(':') + 1);
      if (safeEqual(pass, password)) return NextResponse.next();
    } catch {
      /* malformed header — fall through to 401 */
    }
  }
  return unauthorized();
}

export const config = {
  matcher: ['/support', '/support/:path*', '/api/support/:path*'],
};
