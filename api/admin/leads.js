// GET → returns content/leads.json (contact-form submissions). Authenticated:
// leads contain customer PII and must not be readable without a session.
import { requireAuth, ghGetFile } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  const session = requireAuth(req, res);
  if (!session) return;

  try {
    const file = await ghGetFile(session.token, 'content/leads.json');
    if (!file.exists) return res.status(200).json({ ok: true, leads: [] });
    let leads = [];
    try { leads = JSON.parse(file.text) || []; } catch (e) { leads = []; }
    if (!Array.isArray(leads)) leads = [];
    return res.status(200).json({ ok: true, leads });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Failed to read leads' });
  }
}
