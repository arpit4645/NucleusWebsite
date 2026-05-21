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
  let _flushing = false;
  let _flushQueued = false;
  let _failCount = 0;        // consecutive network failures
  let _backoffTimer = null;  // active backoff timer

  function getConfig() {
    let cfg = null;
    if (window.NUCLEUS_GITHUB_REPO) {
      cfg = Object.assign({}, window.NUCLEUS_GITHUB_REPO);
      try {
        const localCfg = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
        cfg = Object.assign(cfg, localCfg);
      } catch (e) {}
    } else {
      try { cfg = JSON.parse(localStorage.getItem(CFG_KEY) || 'null'); } catch (e) {}
    }
    // Fall back to cookie if localStorage lost the token
    if (cfg && !cfg.token) {
      const m = document.cookie.match(/(?:^|;\s*)nucleus_pat=([^;]+)/);
      if (m) cfg.token = decodeURIComponent(m[1]);
    }
    return cfg;
  }

  function setToken(token) {
    const existing = JSON.parse(localStorage.getItem(CFG_KEY) || '{}');
    existing.token = token;
    localStorage.setItem(CFG_KEY, JSON.stringify(existing));
    // Cookie backup — survives localStorage clears, lasts 1 year
    const exp = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toUTCString();
    document.cookie = 'nucleus_pat=' + encodeURIComponent(token) + ';expires=' + exp + ';path=/;SameSite=Strict';
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
  async function _doCommit(cfg, branch, apiBase, pending) {
    const getHeaders = Object.assign({ 'Cache-Control': 'no-cache' }, _ghHeaders(cfg));
    const getRes = await fetch(
      apiBase + '?ref=' + encodeURIComponent(branch) + '&t=' + Date.now(),
      { cache: 'no-store', headers: getHeaders }
    );
    let currentData = {};
    let sha = null;
    if (getRes.ok) {
      const file = await getRes.json();
      sha = file.sha;
      _lastSha = sha;
      try {
        currentData = JSON.parse(decodeURIComponent(escape(atob(file.content.replace(/\s/g, '')))));
      } catch (e) { currentData = {}; }
    } else if (getRes.status !== 404) {
      const err = await getRes.json().catch(() => ({}));
      throw new Error('GitHub read failed: ' + (err.message || getRes.statusText));
    }

    const merged = Object.assign({}, currentData, pending);
    Object.keys(merged).forEach(k => {
      if (merged[k] === '' || SYNC_EXCLUDE.has(k)) delete merged[k];
    });

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
  }

  window.nucleusSyncFlush = async function () {
    if (_flushing) { _flushQueued = true; return; }

    const cfg = getConfig();
    if (!cfg || !cfg.token || !cfg.owner || !cfg.repo) {
      if (window._nucleusIsAdmin && Object.keys(_pendingPushes).length > 0)
        _updateSyncBadge(false, 'No GitHub token configured');
      return;
    }
    if (Object.keys(_pendingPushes).length === 0) return;

    _flushing = true;
    const branch = cfg.branch || 'main';
    const apiBase = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${DATA_FILE_PATH}`;
    const pending = {};
    Object.keys(_pendingPushes).forEach(k => { pending[k] = sanitizeValue(k, _pendingPushes[k]); });
    _pendingPushes = {};

    try {
      const MAX_RETRIES = 4;
      let lastErr = null;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          await _doCommit(cfg, branch, apiBase, pending);
          lastErr = null;
          break;
        } catch (e) {
          lastErr = e;
          if (e.message.includes('does not match') && attempt < MAX_RETRIES - 1) {
            const delay = (attempt + 1) * 1200; // 1.2s, 2.4s, 3.6s
            console.warn(`[NucleusSync] SHA mismatch (attempt ${attempt + 1}), retrying in ${delay}ms...`);
            await new Promise(r => setTimeout(r, delay));
          } else {
            break;
          }
        }
      }
      if (lastErr) throw lastErr;
      _failCount = 0;
      _updateSyncBadge(true);
    } catch (e) {
      console.warn('[NucleusSync] Push error:', e.message);
      Object.assign(_pendingPushes, pending);

      const trulyOffline = !navigator.onLine;
      const fetchBlocked = e.message === 'Failed to fetch' || e.message === 'NetworkError when attempting to fetch resource';

      if (trulyOffline) {
        _updateSyncBadge(false, 'You are offline — changes saved locally, will sync when reconnected');
      } else if (fetchBlocked) {
        // Browser reached the internet (navigator.onLine=true) but couldn't reach api.github.com.
        // Most common causes: browser extension (uBlock, AdBlock, Privacy Badger) or firewall.
        const msg = 'Cannot reach GitHub API — likely blocked by a browser extension or firewall. Disable extensions and retry.';
        _updateSyncBadge(false, msg);
        if (window._nucleusIsAdmin) _showAdminSyncError(msg);
      } else {
        _updateSyncBadge(false, e.message);
        if (window._nucleusIsAdmin) _showAdminSyncError('Cloud push failed: ' + e.message);
      }

      // Exponential backoff — don't hammer GitHub or spam the error banner
      _failCount++;
      const backoffMs = Math.min(60000, 5000 * Math.pow(2, _failCount - 1)); // 5s, 10s, 20s, 40s, 60s cap
      console.warn(`[NucleusSync] Will retry in ${backoffMs / 1000}s (failure #${_failCount})`);
      clearTimeout(_backoffTimer);
      _backoffTimer = setTimeout(() => {
        _backoffTimer = null;
        if (Object.keys(_pendingPushes).length > 0) window.nucleusSyncFlush();
      }, backoffMs);
    } finally {
      _flushing = false;
      if (_flushQueued) {
        _flushQueued = false;
        // Only immediately retry for queued flushes when no backoff is active
        if (!_backoffTimer) setTimeout(window.nucleusSyncFlush, 500);
      }
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
  let _lastSyncError = '';

  function _updateSyncBadge(ok, errMsg) {
    const badge = document.getElementById('nucleus-sync-badge');
    if (!badge) return;
    if (ok) {
      badge.innerHTML = '<span style="color:#4caf50;">&#9679;</span> Connected';
      badge.title = 'GitHub sync is working. Changes will appear for all visitors.';
      badge.style.cursor = 'default';
      badge.onclick = null;
      _lastSyncError = '';
    } else {
      _lastSyncError = errMsg || 'Unknown error';
      // Log clearly so it's visible in browser DevTools
      console.error('[NucleusSync] ❌ Push failed:', _lastSyncError);
      // Show truncated error inline in the badge — no click required to see it
      const shortErr = _lastSyncError.length > 48 ? _lastSyncError.slice(0, 48) + '…' : _lastSyncError;
      badge.innerHTML = '<span style="color:#f44336;">&#9679;</span> Sync failed: <em style="font-style:normal;opacity:.85;">' + shortErr + '</em>';
      badge.title = _lastSyncError + '\n\nClick for fix instructions.';
      badge.style.cursor = 'pointer';
      badge.onclick = _showSyncErrorPanel;
    }
  }

  function _showSyncErrorPanel() {
    const existing = document.getElementById('_nucleusSyncPanel');
    if (existing) { existing.remove(); return; }
    const cfg = getConfig();
    const hasToken = !!(cfg && cfg.token);
    const panel = document.createElement('div');
    panel.id = '_nucleusSyncPanel';
    panel.style.cssText = 'position:fixed;top:52px;right:16px;width:360px;background:#1a1a1a;color:#fff;border-radius:12px;box-shadow:0 8px 40px rgba(0,0,0,0.5);z-index:99999;font-size:13px;font-family:monospace;overflow:hidden;';
    panel.innerHTML = `
      <div style="background:#c62828;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;">
        <strong style="font-size:14px;">&#9888; Sync Failed</strong>
        <button onclick="document.getElementById('_nucleusSyncPanel').remove()" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;line-height:1;">&times;</button>
      </div>
      <div style="padding:16px 18px;">
        <p style="color:#ffb3b3;margin:0 0 12px;line-height:1.5;word-break:break-word;">${_lastSyncError}</p>
        <hr style="border:none;border-top:1px solid #333;margin:12px 0;" />
        <p style="color:#aaa;margin:0 0 8px;font-size:11px;text-transform:uppercase;letter-spacing:.1em;">Common Causes</p>
        <ul style="margin:0 0 16px;padding-left:16px;color:#ccc;line-height:1.8;font-family:sans-serif;font-size:12px;">
          ${_lastSyncError.includes('extension') || _lastSyncError.includes('blocked') || _lastSyncError.includes('Cannot reach') ? `
          <li><strong style="color:#fff;">Disable browser extensions</strong> (uBlock, AdBlock, Privacy Badger) and try again</li>
          <li>If on a VPN, disconnect and retry</li>
          <li>Open <a href="https://api.github.com" target="_blank" style="color:#90caf9;">api.github.com</a> in a new tab — if it loads, GitHub is reachable</li>
          <li>Try a different browser (Chrome / Edge / Firefox)</li>
          ` : `
          <li>Token missing <strong>Contents → Write</strong> permission</li>
          <li>Token has expired — set it to "No expiration"</li>
          <li>Token was revoked — generate a new one</li>
          `}
        </ul>
        ${hasToken
          ? `<button onclick="document.getElementById('_nucleusSyncPanel').remove();showGithubSetup();" style="width:100%;padding:10px;background:var(--green,#2d6a4f);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;margin-bottom:8px;">&#128279; Re-enter GitHub Token</button>`
          : `<button onclick="document.getElementById('_nucleusSyncPanel').remove();showGithubSetup();" style="width:100%;padding:10px;background:var(--green,#2d6a4f);color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;margin-bottom:8px;">&#128279; Setup GitHub Token</button>`
        }
        <button onclick="document.getElementById('_nucleusSyncPanel').remove();window.nucleusSyncFlush&&window.nucleusSyncFlush();" style="width:100%;padding:10px;background:#333;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:13px;">&#8635; Retry Sync Now</button>
      </div>`;
    document.body.appendChild(panel);
  }

  let _adminErrorShown = false;
  function _showAdminSyncError(msg) {
    if (_adminErrorShown) return;
    _adminErrorShown = true;
    setTimeout(() => { _adminErrorShown = false; }, 30000);
    // Remove any previous banner
    const old = document.getElementById('_nucleusSyncBanner');
    if (old) old.remove();
    const div = document.createElement('div');
    div.id = '_nucleusSyncBanner';
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c62828;color:#fff;padding:13px 20px;z-index:99998;font-size:13px;font-family:monospace;line-height:1.5;display:flex;align-items:center;gap:12px;';
    div.innerHTML =
      '<strong style="white-space:nowrap;">&#9888; Sync Error</strong>' +
      '<span style="flex:1;word-break:break-all;">' + msg + '</span>' +
      '<button onclick="showGithubSetup();document.getElementById(\'_nucleusSyncBanner\').remove();" style="white-space:nowrap;background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.5);color:#fff;padding:4px 12px;cursor:pointer;border-radius:4px;font-family:monospace;font-size:12px;">Fix Token</button>' +
      '<button onclick="this.parentNode.remove();window._adminErrorShown=false;" style="background:none;border:none;color:#fff;font-size:18px;cursor:pointer;padding:0 4px;line-height:1;">&times;</button>';
    document.body.prepend(div);
  }

  window.debugNucleusSync = function () {
    console.log('[NucleusSync Debug]', {
      active: window._nucleusSyncActive,
      isAdmin: !!window._nucleusIsAdmin,
      hasConfig: !!getConfig(),
      hasToken: !!(getConfig() && getConfig().token),
      pendingPushes: Object.keys(_pendingPushes).length,
      lastError: _lastSyncError
    });
  };

  // Test write access — call window.testNucleusPush() from browser console
  window.testNucleusPush = async function () {
    const cfg = getConfig();
    if (!cfg || !cfg.token) { console.error('[NucleusSync] No token saved.'); return; }
    console.log('[NucleusSync] Testing write access to GitHub…');
    const apiBase = `https://api.github.com/repos/${cfg.owner}/${cfg.repo}/contents/${DATA_FILE_PATH}`;
    const branch = cfg.branch || 'main';
    try {
      // Read current file
      const getRes = await fetch(apiBase + '?ref=' + branch + '&t=' + Date.now(), {
        headers: Object.assign({ 'Cache-Control': 'no-cache' }, _ghHeaders(cfg))
      });
      console.log('[NucleusSync] GET status:', getRes.status);
      if (!getRes.ok) {
        const e = await getRes.json().catch(() => ({}));
        console.error('[NucleusSync] Read failed:', e.message || getRes.statusText);
        return;
      }
      const file = await getRes.json();
      console.log('[NucleusSync] Read OK. SHA:', file.sha, '— testing write with same content…');
      // Write back same content (no-op commit to test write permission)
      const putRes = await fetch(apiBase, {
        method: 'PUT',
        headers: Object.assign({ 'Content-Type': 'application/json' }, _ghHeaders(cfg)),
        body: JSON.stringify({ message: 'Test write from admin', content: file.content.replace(/\s/g, ''), sha: file.sha, branch })
      });
      console.log('[NucleusSync] PUT status:', putRes.status);
      const putBody = await putRes.json().catch(() => ({}));
      if (!putRes.ok) {
        console.error('[NucleusSync] ❌ Write FAILED:', putBody.message || putRes.statusText, '\n→ This is why sync shows "Local only".');
      } else {
        console.log('[NucleusSync] ✅ Write succeeded! Token has correct permissions.');
      }
    } catch (e) {
      console.error('[NucleusSync] Network error during test:', e.message);
    }
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
    if (window._nucleusIsAdmin) {
      window._nucleusSyncActive = !!cfg.token && pulled;
    } else {
      window._nucleusSyncActive = pulled;
    }
    _updateSyncBadge(window._nucleusSyncActive);
    console.log('[NucleusSync] ✅ GitHub backend ready.', pulled ? 'Content loaded.' : 'No content file yet.');
    document.dispatchEvent(new Event('nucleus-sync-ready'));
  };

  // ── Online / offline detection ─────────────────────────────────────────────
  window.addEventListener('offline', function () {
    _updateSyncBadge(false, 'Offline — changes saved locally, will sync when connected');
  });

  window.addEventListener('online', function () {
    if (Object.keys(_pendingPushes).length > 0) {
      console.log('[NucleusSync] Connection restored — syncing pending changes...');
      _updateSyncBadge(false, 'Reconnected, syncing...');
      clearTimeout(_backoffTimer);
      _backoffTimer = null;
      _failCount = 0;
      window.nucleusSyncFlush();
    } else {
      _updateSyncBadge(true);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initNucleusSync);
  } else {
    window.initNucleusSync();
  }
})();
