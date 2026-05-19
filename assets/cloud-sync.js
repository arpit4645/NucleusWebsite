/**
 * Nucleus Cloud Sync Engine v2
 * ============================
 * Intercepts localStorage reads/writes and syncs to Firebase Firestore.
 * Works on both the admin panel AND all public pages.
 *
 * SETUP (one time only):
 *   1. Go to https://console.firebase.google.com
 *   2. Create project → Add Web App → copy firebaseConfig
 *   3. Enable Firestore (Test Mode) + Storage (Test Mode)
 *   4. Open assets/firebase-config.js and paste your values
 *   5. Run: git add . && git commit -m "Add Firebase config" && git push
 *   Netlify auto-redeploys and all visitors see admin changes instantly!
 */
(function () {
  'use strict';

  // Keys to sync to the cloud (all nucleus content keys)
  const SYNC_PREFIXES = ['nucleus_', 'about_', 'founder_', 'img_'];
  const FIRESTORE_COL = 'nucleus_sync';
  const FIRESTORE_DOC = 'data';

  function isSyncKey(key) {
    return key && SYNC_PREFIXES.some(p => key.startsWith(p));
  }

  let _db = null;
  let _paused = false;
  let _debounceTimer = null;
  let _pendingPushes = {};

  function getDB() {
    if (_db) return _db;
    if (window.firebase && window.firebase.apps && window.firebase.apps.length > 0) {
      try { _db = firebase.firestore(); } catch(e) {}
    }
    return _db;
  }

  // ── Pull all Firestore data → localStorage ─────────────────────────────────
  window.nucleusSyncPull = async function () {
    const db = getDB();
    if (!db) return false;
    try {
      const snap = await db.collection(FIRESTORE_COL).doc(FIRESTORE_DOC).get();
      if (snap.exists) {
        const data = snap.data();
        _paused = true;
        Object.entries(data).forEach(([k, v]) => {
          if (v !== null && v !== undefined) {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
          }
        });
        _paused = false;
        return true;
      }
      return true; // connected but no data yet — still a success
    } catch (e) {
      console.warn('[NucleusSync] Pull error:', e.message);
      _updateSyncBadge(false, e.message);
    }
    return false;
  };

  // ── Admin sync badge helpers ───────────────────────────────────────────────
  function _updateSyncBadge(ok, errMsg) {
    const badge = document.getElementById('nucleus-sync-badge');
    if (!badge) return;
    if (ok) {
      badge.innerHTML = '<span style="color:#4caf50;">&#9679;</span> Connected';
      badge.title = 'Firebase Firestore is syncing correctly.';
    } else {
      badge.innerHTML = '<span style="color:#f44336;">&#9679;</span> Local only';
      badge.title = errMsg || 'Firebase not connected. Changes will not appear to other visitors.';
    }
  }

  let _adminErrorShown = false;
  function _showAdminSyncError(msg) {
    if (_adminErrorShown) return;
    _adminErrorShown = true;
    const div = document.createElement('div');
    div.style.cssText = 'position:fixed;top:0;left:0;right:0;background:#c62828;color:#fff;padding:14px 20px;z-index:99999;font-size:13px;font-family:monospace;line-height:1.5;';
    div.innerHTML = '<strong>&#9888; Cloud Sync Error</strong> — ' + msg.replace(/\n/g, '<br>') +
      ' <button onclick="this.parentNode.remove()" style="float:right;background:none;border:1px solid rgba(255,255,255,.5);color:#fff;padding:2px 10px;cursor:pointer;border-radius:4px;">Dismiss</button>';
    document.body.prepend(div);
  }

  // ── Push pending key-value pairs to Firestore ──────────────────────────────
  window.nucleusSyncFlush = async function () {
    const db = getDB();
    if (!db || Object.keys(_pendingPushes).length === 0) return;
    try {
      const batch = Object.assign({}, _pendingPushes);
      _pendingPushes = {};
      await db.collection(FIRESTORE_COL).doc(FIRESTORE_DOC).set(batch, { merge: true });
      _updateSyncBadge(true);
    } catch (e) {
      console.warn('[NucleusSync] Push error:', e.message);
      _updateSyncBadge(false, e.message);
      if (window._nucleusIsAdmin) {
        _showAdminSyncError('Cloud push failed: ' + e.message + '\n\nFirestore rules may have expired. See Admin → Sync Status for help.');
      }
    }
  };

  // ── Intercept localStorage.setItem ─────────────────────────────────────────
  const _origSetItem = localStorage.setItem.bind(localStorage);
  localStorage.setItem = function (key, value) {
    _origSetItem(key, value);
    if (!_paused && isSyncKey(key)) {
      _pendingPushes[key] = value || '';
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(window.nucleusSyncFlush, 600);
    }
  };

  const _origRemoveItem = localStorage.removeItem.bind(localStorage);
  localStorage.removeItem = function (key) {
    _origRemoveItem(key);
    if (!_paused && isSyncKey(key)) {
      // Mark as empty in Firestore
      _pendingPushes[key] = '';
      clearTimeout(_debounceTimer);
      _debounceTimer = setTimeout(window.nucleusSyncFlush, 600);
    }
  };

  // ── Initialize Firebase & sync ─────────────────────────────────────────────
  window.initNucleusSync = async function () {
    // Get config: from firebase-config.js or saved in localStorage by setup wizard
    let cfg = null;
    if (window.NUCLEUS_FIREBASE_CONFIG && window.NUCLEUS_FIREBASE_CONFIG.apiKey) {
      cfg = window.NUCLEUS_FIREBASE_CONFIG;
    } else {
      try {
        const saved = localStorage.getItem('nucleus_firebase_cfg');
        if (saved) cfg = JSON.parse(saved);
      } catch (e) {}
    }

    if (!cfg || !cfg.apiKey || !cfg.projectId) {
      console.log('[NucleusSync] No Firebase config. Content is local-only.');
      document.dispatchEvent(new Event('nucleus-sync-ready'));
      return;
    }

    // Wait for Firebase SDK to load
    let tries = 0;
    while (!(window.firebase && window.firebase.firestore) && tries < 30) {
      await new Promise(r => setTimeout(r, 200));
      tries++;
    }

    if (!window.firebase || !window.firebase.firestore) {
      console.warn('[NucleusSync] Firebase SDK not available.');
      document.dispatchEvent(new Event('nucleus-sync-ready'));
      return;
    }

    // Initialize Firebase app
    try {
      if (!firebase.apps || firebase.apps.length === 0) {
        firebase.initializeApp(cfg);
      }
      _db = firebase.firestore();
    } catch (e) {
      console.warn('[NucleusSync] Init error:', e.message);
      document.dispatchEvent(new Event('nucleus-sync-ready'));
      return;
    }

    // Pull data from Firestore into localStorage
    const pulled = await window.nucleusSyncPull();
    console.log('[NucleusSync] ✅ Firebase connected.', pulled ? 'Cloud data loaded!' : 'No cloud data yet.');
    window._nucleusSyncActive = true;
    _updateSyncBadge(true);
    document.dispatchEvent(new Event('nucleus-sync-ready'));
  };

  // Auto-init
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', window.initNucleusSync);
  } else {
    window.initNucleusSync();
  }

})();
