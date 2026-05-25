// FIX: GAP-01 — Vercel Edge Middleware to password-protect /admin.html
// Requires env var ADMIN_PASSWORD set in Vercel Dashboard → Project → Settings → Environment Variables.
// Once set, visitors to /admin.html will see a browser Basic Auth prompt.

export const config = {
  matcher: ['/admin.html', '/admin']
};

export default function middleware(req) {
  const auth = req.headers.get('authorization') || '';
  const expected = process.env.ADMIN_PASSWORD;

  if (!expected) {
    // If env var isn't set, fall back to allow (so site doesn't break on first deploy).
    // Set ADMIN_PASSWORD in Vercel and the middleware will activate.
    return new Response(null, { status: 200 });
  }

  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const idx = decoded.indexOf(':');
      const pwd = idx >= 0 ? decoded.slice(idx + 1) : decoded;
      if (pwd === expected) {
        return; // allow through
      }
    } catch (_) { /* fall through to 401 */ }
  }

  return new Response('Authentication required.', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Nucleus Admin", charset="UTF-8"',
      'Content-Type': 'text/plain'
    }
  });
}
