// FIX: GAP-29 — verify admin password without exposing it to the client.
// Frontend POSTs { password } here; this function compares against ADMIN_PASSWORD env var
// and returns { ok: true } or 401. The actual password is never sent to the browser.

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST only' });

  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return res.status(500).json({ error: 'ADMIN_PASSWORD env var not set' });

  let body;
  try { body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body; }
  catch (_) { return res.status(400).json({ error: 'Invalid JSON' }); }

  const given = (body && body.password) || '';
  if (given === expected) return res.status(200).json({ ok: true });
  return res.status(401).json({ ok: false });
}
