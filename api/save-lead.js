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
  if (!lead || typeof lead !== 'object' || Array.isArray(lead))
    return res.status(400).json({ error: 'lead must be a JSON object' });
  if (!lead.email && !lead.phone)
    return res.status(400).json({ error: 'lead must include email or phone' });
  // Reject oversized submissions so a bot cannot bloat leads.json.
  if (JSON.stringify(lead).length > 20 * 1024)
    return res.status(413).json({ error: 'Submission too large' });

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

  // Read-append-write with retries on SHA conflict so simultaneous submissions
  // don't overwrite each other (each attempt re-reads the latest leads.json).
  let lastDetail = 'unknown';
  for (let attempt = 0; attempt < 3; attempt++) {
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
      if (put.ok) return res.status(200).json({ ok: true, id: lead.id });
      lastDetail = await put.text();
      // 409/422 = SHA conflict from a concurrent write → re-read and retry.
      if (put.status === 409 || put.status === 422) continue;
      return res.status(502).json({ error: 'GitHub write failed', detail: lastDetail });
    } catch (e) {
      lastDetail = e.message;
    }
  }
  return res.status(502).json({ error: 'GitHub write failed after retries', detail: lastDetail });
}
