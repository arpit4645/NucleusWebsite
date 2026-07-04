// GET → redirect the browser to GitHub's authorize screen.
// Requests the `repo` scope so the signed-in user's own permissions can commit
// content back to the repository. A signed `state` value (kept in a short-lived
// httpOnly cookie) protects against CSRF on the callback.
import crypto from 'crypto';
import { makeStateCookie, baseUrl } from '../_lib.js';

export default async function handler(req, res) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  if (!clientId) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(500).send(
      '<h2>GitHub login is not configured yet</h2>' +
      '<p>Set <code>GITHUB_OAUTH_CLIENT_ID</code> and <code>GITHUB_OAUTH_CLIENT_SECRET</code> ' +
      'in Vercel → Project → Settings → Environment Variables, then redeploy.</p>'
    );
  }

  const state = crypto.randomBytes(16).toString('hex');
  const redirectUri = `${baseUrl(req)}/api/admin/oauth/callback`;

  // ?debug=1 → don't redirect; show the EXACT callback URL to paste into the
  // GitHub OAuth App's "Authorization callback URL" field. Fixes redirect_uri
  // mismatch errors with zero guesswork.
  if ((req.query || {}).debug) {
    res.setHeader('Content-Type', 'text/html');
    return res.status(200).send(
      '<!doctype html><meta charset="utf-8"><title>OAuth callback URL</title>' +
      '<div style="font:16px/1.7 -apple-system,Segoe UI,Roboto,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;color:#1F2937">' +
      '<h2 style="color:#0D2B0D">Paste this exact URL into GitHub</h2>' +
      '<p>Copy the box below into your GitHub OAuth App → <b>Authorization callback URL</b> → <b>Update application</b>:</p>' +
      '<input readonly onclick="this.select()" value="' + redirectUri + '" ' +
      'style="width:100%;padding:14px;font:14px monospace;border:2px solid #1A4A1A;border-radius:8px;background:#F7F8FA" />' +
      '<p style="color:#6B7280;font-size:13.5px;margin-top:14px">Client ID in use: <code>' + clientId + '</code><br>' +
      'It must match character-for-character — no trailing slash, no <code>/admin.html</code>.</p>' +
      '<p><a href="/admin.html" style="color:#1A4A1A">← Back to admin</a></p></div>'
    );
  }

  const url = 'https://github.com/login/oauth/authorize'
    + '?client_id=' + encodeURIComponent(clientId)
    + '&redirect_uri=' + encodeURIComponent(redirectUri)
    + '&scope=' + encodeURIComponent('repo')
    + '&state=' + encodeURIComponent(state)
    + '&allow_signup=false';

  res.setHeader('Set-Cookie', makeStateCookie(state));
  res.writeHead(302, { Location: url });
  res.end();
}
