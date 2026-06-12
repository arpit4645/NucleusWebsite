// FIX: GAP-04 — Vercel serverless function to append leads to leads.json via GitHub Contents API.
// Requires env vars: GITHUB_TOKEN, GITHUB_REPO (e.g. "arpit4645/NucleusWebsite"), GITHUB_BRANCH (default "main").

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'POST only' });

  const token  = process.env.GITHUB_TOKEN;
  const repo   = process.env.GITHUB_REPO || 'arpit4645/NucleusWebsite';
  const branch = process.env.GITHUB_BRANCH || 'main';
  if (!token) return res.status(500).json({ error: 'GITHUB_TOKEN env var not set' });

  let lead;
  try {
    lead = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  } catch (_) { return res.status(400).json({ error: 'Invalid JSON body' }); }
  if (!lead || (!lead.email && !lead.phone))
    return res.status(400).json({ error: 'lead must include email or phone' });

  lead.received_at = new Date().toISOString();
  if (!lead.id) lead.id = 'lead_' + Date.now();

  const path = 'content/leads.json';
  const url  = `https://api.github.com/repos/${repo}/contents/${path}?ref=${branch}`;
  const ghHeaders = {
    'Authorization': `Bearer ${token}`,
    'Accept': 'application/vnd.github+json',
    'Content-Type': 'application/json',
    'User-Agent': 'nucleus-save-lead'
  };

  // Read existing leads (may not exist yet)
  let leads = [];
  let sha;
  try {
    const r = await fetch(url, { headers: ghHeaders });
    if (r.ok) {
      const j = await r.json();
      sha = j.sha;
      try {
        const content = Buffer.from(j.content || '', 'base64').toString('utf8');
        const parsed = JSON.parse(content || '[]');
        if (Array.isArray(parsed)) leads = parsed;
      } catch (_) { leads = []; }
    }
  } catch (e) { /* file doesn't exist yet — that's OK */ }

  leads.push(lead);
  const body = JSON.stringify(leads, null, 2);
  const putBody = {
    message: `lead: ${lead.email || lead.phone || 'anon'} via contact form`,
    content: Buffer.from(body, 'utf8').toString('base64'),
    branch
  };
  if (sha) putBody.sha = sha;

  try {
    const put = await fetch(url.split('?')[0], {
      method: 'PUT',
      headers: ghHeaders,
      body: JSON.stringify(putBody)
    });
    if (!put.ok) {
      const errText = await put.text();
      return res.status(502).json({ error: 'GitHub write failed', detail: errText });
    }
    return res.status(200).json({ ok: true, id: lead.id });
  } catch (e) {
    return res.status(500).json({ error: 'Network error', detail: e.message });
  }
}
