// GET → reports whether the caller has a valid session and, if so, who they are.
// Used by admin.html to skip the sign-in screen and show the signed-in user.
import { getSession } from './_lib.js';

export default async function handler(req, res) {
  const s = getSession(req);
  if (!s) return res.status(200).json({ ok: false });
  return res.status(200).json({
    ok: true,
    login: s.login,
    name: s.name || s.login,
    avatar: s.avatar || null
  });
}
