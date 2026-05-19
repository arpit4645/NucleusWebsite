/**
 * Nucleus GitHub Sync Engine
 * ===========================
 * Replaces Firebase. Uses GitHub as the backend:
 *   - Data: content/site-data.json in this repo
 *   - Media: content/media/ in this repo
 *   - Admin writes via GitHub Contents API (needs a PAT)
 *   - Public reads via /content/site-data.json (served by Netlify)
 *
 * One-time setup (admin only):
 *   1. Open admin panel → setup wizard prompts for GitHub Personal Access Token
 *   2. Token saved in localStorage; never asked again on this browser
 */
(function () {
  'use strict';

  const SYNC_PREFIXES = ['nucleus_', 'about_', 'founder_', 'img_'];
  // Never commit these to the repo — they contain tokens / session data
  const SYNC_EXCLUDE = new Set([
    'nucleus_github_cfg',   // GitHub PAT — must NEVER leave this browser
    'nucleus_firebase_cfg', // old Firebase config
    'nucleus_auth',         // session auth flag
  ]);
  const DATA_FILE_PATH = 'content/site-data.json';
  const MEDIA_DIR = 'content/media';
  const CFG_KEY = 'nucleus_github_cfg';

  function isSyncKey(key) {
    if (!key) return false;
    if (SYNC_EXCLUDE.has(key)) return false;
    return SYNC_PREFIXES.some(p => key.startsWith(p));
  }

  // Strip admin password before writing nucleus_site_settings to GitHub
  function sanitizeValue(key, value) {
    if (key === 'nucleus_site_settings') {
      try {
        const obj = JSON.parse(value);
        delete obj.adminPwd; // never commit the admin password
        return JSON.stringify(obj);
      } catch (e) { return value; }
    }
    return value;
  }

  let _paused = false;
  let _debounceTimer = null;
  let _pendingPushes = {};
  let _lastSha = null;

  function getConfig() {
    if (window.NUCLEUS_GITHUB_REPO) {
      const base = Object.assign({}, window.NUCLEUS_GITHUB_REPO);
      try {
        const localCfg = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
        return Object.assign(base, localCfg);
      } catch (e) {
        return base;
      }
    }
    try {
      return JSON.parse(localStorage.getItem(CFG_KEY) || 'null');
    } catch (e) {
      return null;
    }
  }

  function setToken(token) {
    const existing = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
    existing.token = token;
    localStorage.setItem(CFG_KEY, JSON.stringify(existing));
  }

  window.nucleusGithubSetToken = setToken;
  window.nucleusGithubGetConfig = getConfig;

  function _ghHeaders(cfg) {
    const h = { 'Accept': 'application/vnd.github+json' };
    if (cfg && cfg.token) h['Authorization'] = 'token ' + cfg.token;
    return h;
  }

  // ── Pull data from GitHub or Netlify-served JSON ───────────────────────────
  window.nucleusSyncPull = async function () {
    const cfg = getConfig();
    if (!cfg || !cfg.owner || !cfg.repo) return false;
    try {
      // Public read: same-domain (Netlify) — fastest, no CORS, no rate limit
      let res = await fetch('/' + DATA_FILE_PATH + '?t=' + Date.now(), { cache: 'no-store' });
      let data = null;
      if (res.ok) {
        data = await res.json();
      } else {
        // Fallback: GitHub raw (in case Netlify hasn't deployed the file yet)
        const branch = cfg.branch || 'main';
        const rawUrl = `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${DATA_FILE_PATH}?t=${Date.now()}`;
        res = await fetch(rawUrl, { cache: 'no-store' });
        if (res.ok) data = await res.json();
      }
      if (!data) return true; // no data yet, but we're "connected"
      _paused = true;
      Object.entries(data).forEach(([k, v]) => {
        if (v !== null && v !== undefined) {
          localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
        }
      });
      _paused = false;
      return true;
    } catch (e) {
      console.warn('[NucleusSync] Pull error:', e.message);
      _updateSyncBadge(false, e.message);
      return false;
    }
  };

  // ── Push all local content to GitHub via Contents API ──────────────────────
  window.nucleusSyncFlush = async function () {
    const cfg = getConfig();
    if (!cfg || !cfg.token || !cfg.owner || !cfg.repo) {
      if (window._nucleusIsAdmin && Object.keys(_pendingPushes).length > 0) {
        console.warn('[NucleusSync] Pending changes but no GitHub token — open admin Setup to fix.');
        _updateSyncBadge(false, 'No GitHub token configured');
      }
      return;
    }
    if (Object.keys(_pendingPushes).length === 0) return;

    const branch = cfg.branch || 'main';
    const apiBase = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${DATA_FILE_PATH}`;
    // Sanitize: strip secrets before they can reach GitHub
    const pending = {};
    Object.keys(_pendingPushes).forEach(k => {
      pending[k] = sanitizeValue(k, _pendingPushes[k]);
    });
    _pendingPushes = {};

    try {
      // Step 1: get current file (for SHA + merge base)
      let currentData = {};
      let sha = _lastSha;
      const getRes = await fetch(apiBase + '?ref=' + encodeURIComponent(branch) + '&t=' + Date.now(), { cache: 'no-store', headers: _ghHeaders(cfg) });
      if (getRes.ok) {
        const file = await getRes.json();
        sha = file.sha;
        _lastSha = sha;
        try {
          const decoded = decodeURIComponent(escape(atob(file.content.replace(/\s/g, ''))));
          currentData = JSON.parse(decoded);
        } catch (e) {
          currentData = {};
        }
      } else if (getRes.status !== 404) {
        const err = await getRes.json().catch(() => ({}));
        throw new Error('GitHub read failed: ' + (err.message || getRes.statusText));
      }

      // Step 2: merge pending into current, strip any secret keys that slipped through
      const merged = Object.assign({}, currentData, pending);
      Object.keys(merged).forEach(k => {
        if (merged[k] === '' || SYNC_EXCLUDE.has(k)) delete merged[k];
      });

      // Step 3: PUT new content
      const body = {
        message: 'Update site content via admin panel',
        content: btoa(unescape(encodeURIComponent(JSON.stringify(merged, null, 2)))),
        branch: branch
      };
      if (sha) body.sha = sha;

      const putRes = await fetch(apiBase, {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, _ghHeaders(cfg)),
        body: JSON.stringify(body)
      });
      if (!putRes.ok) {
        const err = await putRes.json().catch(() => ({}));
        throw new Error('GitHub commit failed: ' + (err.message || putRes.statusText));
      }
      const result = await putRes.json();
      _lastSha = result.content && result.content.sha;
      _updateSyncBadge(true);
    } catch (e) {
      console.warn('[NucleusSync] Push error:', e.message);
      _updateSyncBadge(false, e.message);
      // Restore pending so user can retry
      Object.assign(_pendingPushes, pending);
      if (window._nucleusIsAdmin) _showAdminSyncError('Cloud push failed: ' + e.message);
    }
  };

  // ── Upload media file (image/video) to GitHub repo ─────────────────────────
  window.nucleusUploadMedia = async function (key, file) {
    const cfg = getConfig();
    if (!cfg || !cfg.token || !cfg.owner || !cfg.repo) {
      throw new Error('GitHub not configured. Open admin Setup to add your token.');
    }
    const branch = cfg.branch || 'main';
    const safeKey = key.replace(/[^a-z0-9_-]/gi, '_');
    const safeName = file.name.replace(/[^a-z0-9._-]/gi, '_');
    const filename = `${safeKey}_${Date.now()}_${safeName}`;
    const path = `${MEDIA_DIR}/${filename}`;
    const apiUrl = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${path}`;

    // Convert file to base64
    const base64 = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const comma = result.indexOf(',');
        resolve(comma >= 0 ? result.slice(comma + 1) : result);
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });

    const res = await fetch(apiUrl, {
      method: 'PUT',
      headers: Object.assign({ 'Content-Type': 'application/json' }, _ghHeaders(cfg)),
      body: JSON.stringify({
        message: 'Upload media: ' + filename,
        content: base64,
        branch: branch
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error('Media upload failed: ' + (err.message || res.statusText));
    }
    const result = await res.json();
    // Return raw URL (stable, no expiry)
    return `https://raw.githubusercontent.com/${cfg.owner}/${cfg.repo}/${branch}/${path}`;
  };

  // ── Intercept localStorage writes ──────────────────────────────────────────
  const _origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    _origSetItem(key, value);
    if (!_paused && isSyncKey(key)) {
      _pendingPushes[key] = value || '';
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(window.nucleusSyncFlush, 2000);
    }
  };

  const _origRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = function (key) {
    _origRemoveItem(key);
    if (!_paused && isSyncKey(key)) {
      _pendingPushes[key] = '';
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(window.nucleusSyncFlush, 2000);
    }
  };

  // ── Sync badge / error UI ──────────────────────────────────────────────────
  function _updateSyncBadge(ok, errMsg) {
    const badge = document.getElementById('nucleus-sync-badge');
    if (!badge) return;
    if (ok) {
      badge.innerHTML = '<span style="color:#4caf50;">&#9679;</span> Connected';
      badge.title = 'GitHub sync is working. Changes will appear for all visitors.';
    } else {
      badge.innerHTML = '<span style="color:#f44336;">&#9679;</span> Local only';
      badge.title = errMsg || 'GitHub not connected. Open Setup to add your token.';
    }
  }

  let _adminErrorShown = false;
  function _showAdminSyncError(msg) {
    if (_adminErrorShown) return;
    _adminErrorShown = true;
    setTimeout(() => { _adminErrorShown = false; }, 8000);
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c62828;color:#fff;padding:14px 20px;z-index:99999;font-size:13px;font-family:monospace;line-height:1.5;';
    div.innerHTML = '<strong>&#9888; Sync Error</strong> — ' + msg.replace(/\n/g, '<br>') +
      ' <button onclick="this.parentNode.remove()" style="float:right;background:none;border:1px solid rgba(255,255,255,.5);color:#fff;padding:2px 10px;cursor:pointer;border-radius:4px;">Dismiss</button>';
    document.body.prepend(div);
  }

  window.debugNucleusSync = function () {
    console.log('[NucleusSync Debug]', {
      active: window._nucleusSyncActive,
      isAdmin: !!window._nucleusIsAdmin,
      hasConfig: !!getConfig(),
      hasToken: !!(getConfig() && getConfig().token),
      pendingPushes: Object.keys(_pendingPushes).length
    });
  };

  // ── Initialize on load ─────────────────────────────────────────────────────
  window.initNucleusSync = async function () {
    const cfg = getConfig();
    if (!cfg || !cfg.owner || !cfg.repo) {
      console.log('[NucleusSync] No GitHub config (sync-config.js missing or incomplete).');
      document.dispatchEvent(new Event('nucleus-sync-ready'));
      return;
    }
    const pulled = await window.nucleusSyncPull();
    // "Active" on admin requires a token; on public, any successful pull counts
    if (window._nucleusIsAdmin) {
      window._nucleusSyncActive = !!cfg.token && pulled;
    } else {
      window._nucleusSyncActive = pulled;
    }
    _updateSyncBadge(window._nucleusSyncActive);
    console.log('[NucleusSync] ✅ GitHub backend ready.', pulled ? 'Content loaded.' : 'No content file yet.');
    document.dispatchEvent(new Event('nucleus-sync-ready'));
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initNucleusSync);
  } else {
    window.initNucleusSync();
  }
})();
