// GET → returns content/leads.json (contact-form submissions). Authenticated:
// leads contain customer PII and must not be readable without a session.
import { requireAuth, ghGetFile } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'GET only' });
  if (!requireAuth(req, res)) return;

  if (!process.env.GITHUB_TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN is not configured in Vercel environment variables.' });
  }

  try {
    const file = await ghGetFile('content/leads.json');
    if (!file.exists) return res.status(200).json({ ok: true, leads: [] });
    let leads = [];
    try { leads = JSON.parse(file.text) || []; } catch (e) { leads = []; }
    if (!Array.isArray(leads)) leads = [];
    return res.status(200).json({ ok: true, leads });
  } catch (e) {
    return res.status(502).json({ error: e.message || 'Failed to read leads' });
  }
}
