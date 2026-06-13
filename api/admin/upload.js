// POST { filename, data } (data = base64, no data: prefix) → commits the file to
// content/media/ in the repo and returns its same-origin URL.
// The admin compresses images to WebP ≤ ~900 KB client-side before calling this.
import { requireAuth, parseBody, ghPutFile } from './_lib.js';

const ALLOWED_EXT = /\.(webp|png|jpe?g|gif|svg|ico)$/i;
const MAX_BASE64 = 1.4 * 1024 * 1024; // ~1 MB binary — GitHub Contents API ceiling

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });
  const session = requireAuth(req, res);
  if (!session) return;

  const body = parseBody(req);
  if (!body || !body.filename || !body.data) {
    return res.status(400).json({ error: 'Body must be { filename, data }' });
  }
  if (!ALLOWED_EXT.test(body.filename)) {
    return res.status(400).json({ error: 'Only image files are allowed (webp/png/jpg/gif/svg/ico). For video, paste a YouTube or Vimeo URL instead.' });
  }
  if (typeof body.data !== 'string' || body.data.length > MAX_BASE64) {
    return res.status(400).json({ error: 'File too large after compression (max ~1 MB). Use a smaller image.' });
  }

  const safe = String(body.filename).replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
  const path = `content/media/${Date.now()}_${safe}`;

  try {
    await ghPutFile(session.token, path, body.data.replace(/\s/g, ''), 'Upload media via admin panel');
    return res.status(200).json({ ok: true, url: '/' + path });
  } catch (e) {
    const msg = e.message || 'Unknown error';
    const friendly = /resource not accessible|403/i.test(msg)
      ? 'Your GitHub account lacks write permission on this repository.'
      : msg;
    return res.status(502).json({ error: friendly });
  }
}
