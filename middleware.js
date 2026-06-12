// Vercel Edge Middleware — password-protect /admin.html
// Set ADMIN_PASSWORD in Vercel Dashboard → Project → Settings → Environment Variables.
// Without it the page is openly accessible (safe while you're setting up).

export const config = {
  matcher: ['/admin.html', '/admin']
};

export default function middleware(req) {
  const expected = process.env.ADMIN_PASSWORD;

  // No env var set — pass through so the page loads normally
  if (!expected) return;

  const auth = req.headers.get('authorization') || '';

  if (auth.startsWith('Basic ')) {
    try {
      const decoded = atob(auth.slice(6));
      const idx = decoded.indexOf(':');
      const pwd = idx >= 0 ? decoded.slice(idx + 1) : decoded;
      if (pwd === expected) return; // correct password — allow through
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
