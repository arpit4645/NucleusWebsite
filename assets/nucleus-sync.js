/**
 * nucleus-sync.js  v1.0
 * ─────────────────────────────────────────────────────────
 * ADMIN PANEL ONLY — do NOT include on public pages.
 *
 * Writes content/site-data.json to GitHub via API.
 * Public pages then fetch that file via nucleus-live.js.
 *
 * Required: GitHub Personal Access Token stored in
 * localStorage key: nucleus_gh_token
 *
 * Usage in admin:
 *   nucleusSync.save(dataObject)   → writes full JSON to GitHub
 *   nucleusSync.load()             → returns current JSON from GitHub
 *   nucleusSync.setStatus(state)   → updates sync pill UI
 * ─────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  var GITHUB_USER   = 'arpit4645';
  var GITHUB_REPO   = 'NucleusWebsite';
  var GITHUB_BRANCH = 'main';
  var DATA_FILE     = 'content/site-data.json';
  var API_BASE      = 'https://api.github.com/repos/' + GITHUB_USER + '/' + GITHUB_REPO + '/contents/' + DATA_FILE;
  var TOKEN_KEY     = 'nucleus_gh_token';

  /* ── STATUS UI ───────────────────────────────────────── */
  function setStatus(state, msg) {
    /* state: '' = synced, 'syncing' = in progress, 'error' = failed */
    var badge = document.getElementById('sb-sync-status');
    var text  = document.getElementById('sb-sync-text');
    var pill  = document.getElementById('topbar-sync-pill');
    if (badge) { badge.className = 'sb-sync' + (state ? ' ' + state : ''); }
    if (text)  { text.textContent = msg || 'Synced'; }
    if (pill)  { pill.textContent = msg || '✓ Synced'; }
  }

  /* ── GET TOKEN ───────────────────────────────────────── */
  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || '';
  }

  /* ── LOAD CURRENT FILE (get SHA) ─────────────────────── */
  function loadFile() {
    var token = getToken();
    var headers = { 'Accept': 'application/vnd.github+json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    return fetch(API_BASE + '?ref=' + GITHUB_BRANCH + '&t=' + Date.now(), { headers: headers })
      .then(function (r) { return r.json(); });
  }

  /* ── SAVE FULL DATA OBJECT TO GITHUB ─────────────────── */
  function save(dataObj) {
    var token = getToken();
    if (!token) {
      setStatus('error', '● No token');
      console.warn('[nucleus-sync] No GitHub token set. Data saved to localStorage only.');
      /* Still save locally so admin UI works */
      localStorage.setItem('nucleus_site_data', JSON.stringify(dataObj));
      return Promise.resolve({ local: true });
    }

    setStatus('syncing', '↻ Syncing…');
    dataObj._updated = new Date().toISOString();

    return loadFile()
      .then(function (fileInfo) {
        var sha = fileInfo.sha;
        var content = btoa(unescape(encodeURIComponent(JSON.stringify(dataObj, null, 2))));
        var body = {
          message: 'admin: update site-data.json [' + new Date().toLocaleTimeString() + ']',
          content: content,
          branch: GITHUB_BRANCH
        };
        if (sha) body.sha = sha;

        var headers = {
          'Authorization': 'Bearer ' + token,
          'Accept': 'application/vnd.github+json',
          'Content-Type': 'application/json'
        };
        return fetch(API_BASE, {
          method: 'PUT',
          headers: headers,
          body: JSON.stringify(body)
        });
      })
      .then(function (r) {
        if (!r.ok) throw new Error('GitHub API ' + r.status);
        return r.json();
      })
      .then(function (result) {
        /* Also update localStorage so admin reads back consistently */
        localStorage.setItem('nucleus_site_data', JSON.stringify(dataObj));
        /* Clear the live data cache so pages reload fresh */
        sessionStorage.removeItem('nucleus_live_data');
        setStatus('', '✓ Synced · just now');
        setTimeout(function () { setStatus('', '● Synced'); }, 3000);
        return result;
      })
      .catch(function (err) {
        setStatus('error', '● Sync failed');
        console.error('[nucleus-sync] Save failed:', err);
        /* Still persist locally */
        localStorage.setItem('nucleus_site_data', JSON.stringify(dataObj));
        throw err;
      });
  }

  /* ── LOAD CURRENT DATA FROM GITHUB ───────────────────── */
  function load() {
    return loadFile()
      .then(function (fileInfo) {
        if (!fileInfo.content) throw new Error('No content');
        var json = decodeURIComponent(escape(atob(fileInfo.content.replace(/\n/g, ''))));
        var data = JSON.parse(json);
        localStorage.setItem('nucleus_site_data', JSON.stringify(data));
        return data;
      })
      .catch(function (err) {
        /* Fall back to localStorage */
        console.warn('[nucleus-sync] GitHub load failed, using localStorage:', err.message);
        var local = localStorage.getItem('nucleus_site_data');
        return local ? JSON.parse(local) : {};
      });
  }

  /* ── MERGE PARTIAL UPDATE ────────────────────────────── */
  /* Use this to update just a few keys without overwriting everything */
  function patch(partialObj) {
    var current = {};
    try { current = JSON.parse(localStorage.getItem('nucleus_site_data') || '{}'); } catch (e) {}
    var merged = Object.assign({}, current, partialObj);
    return save(merged);
  }

  /* ── FORCE SYNC NOW ──────────────────────────────────── */
  function forceSyncNow() {
    var current = {};
    try { current = JSON.parse(localStorage.getItem('nucleus_site_data') || '{}'); } catch (e) {}
    if (!Object.keys(current).length) {
      load().then(function (data) {
        window.nucleusSync._lastData = data;
        setStatus('', '● Synced · loaded from GitHub');
      });
    } else {
      save(current).then(function () {
        setStatus('', '● Synced · pushed to GitHub');
      });
    }
  }

  /* ── INIT ────────────────────────────────────────────── */
  function init() {
    var token = getToken();
    if (!token) {
      setStatus('error', '● No GitHub token');
      return;
    }
    /* Load current data from GitHub into localStorage on admin startup */
    setStatus('syncing', '↻ Loading…');
    load().then(function (data) {
      window.nucleusSync._lastData = data;
      setStatus('', '● Synced');
      /* Fire custom event so admin panel can populate fields */
      document.dispatchEvent(new CustomEvent('nucleusDataLoaded', { detail: data }));
    }).catch(function () {
      setStatus('error', '● Load failed');
    });
  }

  /* ── EXPOSE ──────────────────────────────────────────── */
  window.nucleusSync = { save: save, load: load, patch: patch, forceSyncNow: forceSyncNow, setStatus: setStatus, init: init };
  window.syncToGitHub = function () { forceSyncNow(); };
  window.forceSyncNow = forceSyncNow;

  /* Auto-init when DOM is ready */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 100);
  }
})();
