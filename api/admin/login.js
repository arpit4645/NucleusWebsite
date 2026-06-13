// POST { password } → verifies against ADMIN_PASSWORD env var (server-side only),
// sets an HMAC-signed httpOnly session cookie. No password ever lives in client code.
import crypto from 'crypto';
import { makeSessionCookie, parseBody } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) {
    return res.status(500).json({
      error: 'ADMIN_PASSWORD is not configured. Set it in Vercel → Project → Settings → Environment Variables, then redeploy.'
    });
  }

  const body = parseBody(req);
  if (!body) return res.status(400).json({ error: 'Invalid JSON' });
  const given = String(body.password || '');

  // Constant-time comparison on fixed-length digests
  const a = crypto.createHash('sha256').update(given).digest();
  const b = crypto.createHash('sha256').update(expected).digest();
  if (!crypto.timingSafeEqual(a, b)) {
    return res.status(401).json({ error: 'Wrong password' });
  }

  res.setHeader('Set-Cookie', makeSessionCookie());
  return res.status(200).json({
    ok: true,
    github: !!process.env.GITHUB_TOKEN
  });
}
