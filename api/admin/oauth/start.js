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
