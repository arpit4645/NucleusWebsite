// GET ?code=&state= → GitHub redirects here after the user authorizes.
// 1. verify CSRF state, 2. exchange code → access token, 3. confirm the user has
// WRITE (push) access to this repo (so only owners/collaborators can edit),
// 4. seal the token into an httpOnly session cookie, 5. bounce to /admin.html.
import crypto from 'crypto';
import {
  makeSessionCookie, makeStateCookie, clearStateCookie, readStateCookie,
  baseUrl, GH_REPO
} from '../_lib.js';

function fail(res, msg) {
  res.setHeader('Content-Type', 'text/html');
  res.status(403).send(
    '<!doctype html><meta charset="utf-8"><title>Sign-in failed</title>' +
    '<div style="font:16px/1.6 -apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:80px auto;padding:0 20px;color:#1F2937">' +
    '<h2 style="color:#0D2B0D">Sign-in failed</h2><p>' + msg + '</p>' +
    '<p><a href="/admin.html" style="color:#1A4A1A">← Back to admin</a></p></div>'
  );
}

export default async function handler(req, res) {
  const { code, state, error, error_description } = req.query || {};
  if (error) return fail(res, 'GitHub said: ' + (error_description || error));
  if (!code || !state) return fail(res, 'Missing authorization code.');

  const saved = readStateCookie(req);
  res.setHeader('Set-Cookie', clearStateCookie());
  if (!saved || saved !== state) {
    return fail(res, 'Security check failed (state mismatch). Please try signing in again.');
  }

  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return fail(res, 'GitHub OAuth credentials are not configured in Vercel.');
  }

  try {
    // Exchange the code for an access token
    const tokRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: `${baseUrl(req)}/api/admin/oauth/callback`
      })
    });
    const tok = await tokRes.json();
    const token = tok.access_token;
    if (!token) return fail(res, 'GitHub did not return an access token: ' + (tok.error_description || tok.error || 'unknown'));

    // Identify the user
    const ghHeaders = {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'User-Agent': 'nucleus-admin'
    };
    const meRes = await fetch('https://api.github.com/user', { headers: ghHeaders });
    const me = await meRes.json();
    if (!me || !me.login) return fail(res, 'Could not read your GitHub profile.');

    // Authorize: the account must have push (write) access to THIS repo.
    const repoRes = await fetch(`https://api.github.com/repos/${GH_REPO()}`, { headers: ghHeaders });
    if (!repoRes.ok) {
      return fail(res, 'Your GitHub account does not have access to <b>' + GH_REPO() + '</b>. Only the site owner or repo collaborators can sign in.');
    }
    const repo = await repoRes.json();
    const canPush = repo && repo.permissions && repo.permissions.push;
    if (!canPush) {
      return fail(res, 'Your GitHub account <b>' + me.login + '</b> does not have write access to <b>' + GH_REPO() + '</b>, so it cannot edit the site.');
    }

    // Seal token + identity into the session cookie, then enter the panel.
    const session = makeSessionCookie({ token, login: me.login, name: me.name || me.login, avatar: me.avatar_url });
    res.setHeader('Set-Cookie', [clearStateCookie(), session]);
    res.writeHead(302, { Location: '/admin.html' });
    res.end();
  } catch (e) {
    return fail(res, 'Unexpected error during sign-in: ' + (e.message || e));
  }
}
