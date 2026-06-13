// Shared helpers for /api/admin/* functions.
// Underscore prefix = Vercel does NOT expose this file as an endpoint.
//
// Auth model: "Sign in with GitHub" (OAuth). The user authorizes with their own
// GitHub account; we keep their short-lived access token inside an ENCRYPTED,
// httpOnly session cookie and use it to read/write the repo. No password and no
// long-lived GITHUB_TOKEN env var are needed — the signed-in user's own repo
// permissions authorize every write.
import crypto from 'crypto';

const COOKIE = 'nucleus_admin';
const STATE_COOKIE = 'nucleus_oauth_state';
const SESSION_HOURS = 12;

export const GH_REPO = () => process.env.GITHUB_REPO || 'arpit4645/NucleusWebsite';
export const GH_BRANCH = () => process.env.GITHUB_BRANCH || 'main';

// ── Crypto: AES-256-GCM session sealing ─────────────────────────────────────
function key() {
  const s = process.env.SESSION_SECRET
    || process.env.GITHUB_OAUTH_CLIENT_SECRET
    || 'nucleus-dev-secret-change-me';
  return crypto.createHash('sha256').update(s).digest(); // 32 bytes
}

function seal(obj) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const pt = Buffer.from(JSON.stringify(obj), 'utf8');
  const ct = Buffer.concat([cipher.update(pt), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, ct]).toString('base64url');
}

function unseal(token) {
  try {
    const buf = Buffer.from(token, 'base64url');
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const ct = buf.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), iv);
    decipher.setAuthTag(tag);
    const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
    return JSON.parse(pt.toString('utf8'));
  } catch (e) {
    return null;
  }
}

// ── Session cookies ─────────────────────────────────────────────────────────
export function makeSessionCookie(session) {
  const payload = { ...session, exp: Date.now() + SESSION_HOURS * 3600 * 1000 };
  const val = seal(payload);
  return `${COOKIE}=${val}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=${SESSION_HOURS * 3600}`;
}

export function clearSessionCookie() {
  return `${COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}

export function getSession(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + COOKIE + '=([^;]+)'));
  if (!m) return null;
  const s = unseal(m[1]);
  if (!s || !s.token || !s.exp || Number(s.exp) < Date.now()) return null;
  return s;
}

export function requireAuth(req, res) {
  const s = getSession(req);
  if (s) return s;
  res.status(401).json({ error: 'Not signed in' });
  return null;
}

// ── OAuth CSRF state cookie ──────────────────────────────────────────────────
export function makeStateCookie(state) {
  return `${STATE_COOKIE}=${state}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=600`;
}
export function clearStateCookie() {
  return `${STATE_COOKIE}=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0`;
}
export function readStateCookie(req) {
  const raw = req.headers.cookie || '';
  const m = raw.match(new RegExp('(?:^|;\\s*)' + STATE_COOKIE + '=([^;]+)'));
  return m ? m[1] : null;
}

export function baseUrl(req) {
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
}

export function parseBody(req) {
  try {
    return typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
  } catch (e) {
    return null;
  }
}

// ── GitHub Contents API (token = the signed-in user's OAuth token) ────────────
function ghHeaders(token) {
  return {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'nucleus-admin'
  };
}

export async function ghGetFile(token, path) {
  const url = `https://api.github.com/repos/${GH_REPO()}/contents/${path}?ref=${GH_BRANCH()}`;
  const r = await fetch(url, { headers: ghHeaders(token) });
  if (r.status === 404) return { exists: false, sha: null, text: null };
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    throw new Error(`GitHub read failed (${r.status}): ${e.message || 'unknown'}`);
  }
  const j = await r.json();
  const text = Buffer.from(j.content || '', 'base64').toString('utf8');
  return { exists: true, sha: j.sha, text };
}

export async function ghPutFile(token, path, base64Content, message, sha) {
  const url = `https://api.github.com/repos/${GH_REPO()}/contents/${path}`;
  const body = { message, content: base64Content, branch: GH_BRANCH() };
  if (sha) body.sha = sha;
  const r = await fetch(url, { method: 'PUT', headers: ghHeaders(token), body: JSON.stringify(body) });
  if (!r.ok) {
    const e = await r.json().catch(() => ({}));
    const err = new Error(`GitHub write failed (${r.status}): ${e.message || 'unknown'}`);
    err.status = r.status;
    throw err;
  }
  return r.json();
}
