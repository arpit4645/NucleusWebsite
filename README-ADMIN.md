# Nucleus Admin — Setup (Sign in with GitHub)

The admin panel at `/admin.html` lets you edit every page's content and upload
images. You sign in with your **GitHub account** — no password to manage, and
edits are saved using your own GitHub permissions.

## One-time setup (about 5 minutes)

### 1. Create a GitHub OAuth App
1. Go to <https://github.com/settings/developers> → **OAuth Apps** → **New OAuth App**
2. Fill in:
   - **Application name:** `Nucleus Admin`
   - **Homepage URL:** your live site, e.g. `https://your-site.vercel.app`
   - **Authorization callback URL:** `https://your-site.vercel.app/api/admin/oauth/callback`
     (use your real domain — must match exactly)
3. Click **Register application**
4. Copy the **Client ID**
5. Click **Generate a new client secret** and copy it

### 2. Add two environment variables in Vercel
Vercel → your project → **Settings → Environment Variables**:

| Key | Value |
|-----|-------|
| `GITHUB_OAUTH_CLIENT_ID` | the Client ID from step 1 |
| `GITHUB_OAUTH_CLIENT_SECRET` | the Client Secret from step 1 |

(Optional: `SESSION_SECRET` = any long random string, to make sessions survive
secret rotations. If omitted, one is derived automatically.)

### 3. Redeploy
Vercel → **Deployments** → ⋯ on the latest → **Redeploy**.

## Using it
1. Open `https://your-site.vercel.app/admin.html`
2. Click **Sign in with GitHub** → authorize
3. Edit any page, then **Save & Publish**. Each save commits to this repo and
   Vercel redeploys automatically — live for all visitors in ~1–2 minutes.

## Who can sign in
Only GitHub accounts with **write (push) access** to this repository
(`arpit4645/NucleusWebsite`). To let someone else edit, add them as a
**collaborator** with Write access on GitHub. To revoke, remove them — no
passwords to rotate.

## How it works (security)
- Login uses GitHub OAuth (scope: `repo`). The panel never sees or stores a
  long-lived token in code.
- After login, your access token is sealed (AES-256-GCM) inside an httpOnly,
  Secure cookie — page scripts can't read it.
- The server checks you have push access before granting a session.
- All writes go through `/api/admin/*` serverless functions; the browser never
  talks to the GitHub API directly.
