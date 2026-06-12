/**
 * nucleus-sync.js  v2.0  (ADMIN ONLY)
 * ─────────────────────────────────────────────────────────
 * Thin compatibility shim over github-sync.js.
 *
 * IMPORTANT: This used to do its own full-file PUT of site-data.json,
 * which OVERWROTE the raw nucleus_* keys that github-sync.js writes —
 * causing edits to silently disappear. That destructive path is gone.
 *
 * Now every save flows through ONE producer: github-sync.js wraps
 * localStorage.setItem, so any nucleus_* / about_ / founder_ / img_
 * write is queued and flushed to site-data.json automatically.
 *
 * window.nucleusSync.patch()/save() are kept for backward-compat with
 * existing admin save functions, but they no longer PUT directly —
 * they persist locally (which triggers the github-sync interceptor)
 * and nudge a flush, then resolve.
 * ─────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  function setStatus(state, msg) {
    var badge = document.getElementById('sb-sync-status');
    var text  = document.getElementById('sb-sync-text');
    var pill  = document.getElementById('topbar-sync-pill');
    if (badge) badge.className = 'sb-sync' + (state ? ' ' + state : '');
    if (text)  text.textContent = msg || 'Synced';
    if (pill)  pill.textContent = msg || '✓ Synced';
  }

  function flush() {
    setStatus('syncing', '↻ Syncing…');
    if (typeof window.nucleusSyncFlush === 'function') {
      return Promise.resolve(window.nucleusSyncFlush())
        .then(function (r) {
          setStatus('', '✓ Synced · just now');
          setTimeout(function () { setStatus('', '● Synced'); }, 2500);
          return r;
        })
        .catch(function (e) {
          setStatus('error', '● Sync failed');
          throw e;
        });
    }
    // github-sync not present — interceptor will still flush on its own timer
    setStatus('', '● Synced');
    return Promise.resolve();
  }

  /* Persist canonical keys locally too (harmless extra data) and flush. */
  function patch(partial) {
    if (partial && typeof partial === 'object') {
      Object.keys(partial).forEach(function (k) {
        var v = partial[k];
        try { localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v)); } catch (e) {}
      });
    }
    return flush();
  }

  function save(dataObj) { return patch(dataObj); }

  function forceSyncNow() { return flush(); }

  window.nucleusSync = {
    patch: patch,
    save: save,
    forceSyncNow: forceSyncNow,
    setStatus: setStatus,
    init: function () {}
  };
  window.forceSyncNow = forceSyncNow;
})();
