// POST { data: { key: stringValue | null, ... } } → merges into content/site-data.json
// and commits via the GitHub Contents API using the server-side GITHUB_TOKEN.
// null deletes a key (public site falls back to its built-in default).
// POST { data: {} } is a harmless no-op merge — used as the login write test.
import { requireAuth, parseBody, ghGetFile, ghPutFile } from './_lib.js';

const DATA_PATH = 'content/site-data.json';
const KEY_RE = /^[a-zA-Z][a-zA-Z0-9_]{0,63}$/;
const MAX_VALUE = 200 * 1024;   // single value cap (lists are JSON strings)
const MAX_FILE = 900 * 1024;    // keep the whole file well under GitHub's 1 MB Contents limit

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  if (!requireAuth(req, res)) return;

  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({
      error: 'GITHUB_TOKEN is not configured. Set it in Vercel → Project → Settings → Environment Variables (fine-grained PAT, Contents: Read and write, this repo only), then redeploy.'
    });
  }

  const body = parseBody(req);
  if (!body || typeof body.data !== 'object' || body.data === null || Array.isArray(body.data)) {
    return res.status(400).json({ error: 'Body must be { data: { key: value } }' });
  }

  // Validate every key/value before touching GitHub
  for (const [k, v] of Object.entries(body.data)) {
    if (!KEY_RE.test(k) || k.startsWith('_')) {
      return res.status(400).json({ error: `Invalid key: ${k}` });
    }
    if (v === null) continue;
    if (typeof v !== 'string') {
      return res.status(400).json({ error: `Value for ${k} must be a string or null` });
    }
    if (v.length > MAX_VALUE) {
      return res.status(400).json({ error: `Value for ${k} is too large` });
    }
    if (v.includes('data:image') || v.includes('data:video')) {
      return res.status(400).json({ error: `Value for ${k} contains an embedded file. Upload media via the image field instead.` });
    }
  }

  // Read-merge-write with one retry on SHA conflict (concurrent commit)
  let lastErr = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const file = await ghGetFile(DATA_PATH);
      let current = {};
      if (file.exists) {
        try { current = JSON.parse(file.text) || {}; } catch (e) { current = {}; }
      }

      for (const [k, v] of Object.entries(body.data)) {
        if (v === null || v === '') delete current[k];
        else current[k] = v;
      }
      current._updated = new Date().toISOString();
      current._version = 2;

      const out = JSON.stringify(current, null, 2);
      if (out.length > MAX_FILE) {
        return res.status(400).json({ error: 'Content file would exceed the size limit. Remove some content or use uploaded images instead of long text.' });
      }

      await ghPutFile(
        DATA_PATH,
        Buffer.from(out, 'utf8').toString('base64'),
        'Update site content via admin panel',
        file.sha
      );
      return res.status(200).json({ ok: true, updated: current._updated });
    } catch (e) {
      lastErr = e;
      if (e.status === 409 || e.status === 422) continue; // sha conflict — re-read and retry
      break;
    }
  }

  const msg = (lastErr && lastErr.message) || 'Unknown error';
  const friendly = /resource not accessible|403/i.test(msg)
    ? 'GitHub token lacks write permission. Edit the token: Contents must be "Read and write" for this repo.'
    : msg;
  return res.status(502).json({ error: friendly });
}
