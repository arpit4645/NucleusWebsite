// Shared helpers for /api/admin/* functions.
// Underscore prefix = Vercel does NOT expose this file as an endpoint.
import crypto from 'crypto';

const COOKIE = 'nucleus_admin';
const SESSION_HOURS = 24;

function secret() {
  // SESSION_SECRET is recommended; fall back to a hash of the other secrets so
  // the panel still works with only ADMIN_PASSWORD + GITHUB_TOKEN configured.
  const s = process.env.SESSION_SECRET
    || crypto.createHash('sha256')
        .update((process.env.ADMIN_PASSWORD || '') + '|' + (process.env.GITHUB_TOKEN || ''))
        .digest('hex');
  return s;
}

function hmac(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('hex');
}

export function makeSessionCookie() {
  const exp = String(Date.now() + SESSION_HOURS * 3600 * 1000);
  const sig = hmac(exp);
  return `${COOKIE}=${exp}.${sig}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function isAuthed(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!m) return false;
  const [exp, sig] = m[1].split('.');
  if (!exp || !sig) return false;
  if (Number(exp) < Date.now()) return false;
  const expected = hmac(exp);
  try {
    return crypto.timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
  } catch (e) {
    return false;
  }
}

export function requireAuth(req, res) {
  if (isAuthed(req)) return true;
  res.status(401).json({ error: 'Not logged in' });
  return false;
}

export function parseBody(req) {
  try {
    return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return null;
  }
}

// ── GitHub Contents API (server-side only; token never reaches the browser) ──
const GH_REPO = () => process.env.GITHUB_REPO || 'arpit4645/NucleusWebsite';
const GH_BRANCH = () => process.env.GITHUB_BRANCH || 'main';

function ghHeaders() {
  return {
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'nucleus-admin'
  };
}

export async function ghGetFile(path) {
  const url = `https://api.github.com/repos/${GH_REPO()}/contents/${path}?ref=${GH_BRANCH()}`;
  const r = await fetch(url, { headers: ghHeaders() });
  if (r.status === 404) return { exists: false, sha: null, text: null };
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(`GitHub read failed (${r.status}): ${e.message || 'unknown'}`);
  }
  const j = await r.json();
  const text = Buffer.from(j.content || '', 'base64').toString('utf8');
  return { exists: true, sha: j.sha, text };
}

export async function ghPutFile(path, base64Content, message, sha) {
  const url = `https://api.github.com/repos/${GH_REPO()}/contents/${path}`;
  const body = { message, content: base64Content, branch: GH_BRANCH() };
  if (sha) body.sha = sha;
  const r = await fetch(url, { method: 'PUT', headers: ghHeaders(), body: JSON.stringify(body) });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const err = new Error(`GitHub write failed (${r.status}): ${e.message || 'unknown'}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}
