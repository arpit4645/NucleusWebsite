/**
 * nucleus-live.js  v2.0
 * ─────────────────────────────────────────────────────────
 * PUBLIC-PAGE HYDRATOR.  Put on every public page, AFTER site.js.
 *
 * How it works (single, conflict-free path):
 *   1. site-data.json on GitHub is the live database. The admin panel
 *      pushes raw localStorage keys (nucleus_*, about_*, founder_*, img_*)
 *      into it via github-sync.js — every "Save" publishes automatically.
 *   2. This script SEEDS those keys back into the visitor's localStorage
 *      so that site.js (which already renders every section from those
 *      exact keys) paints the live content — text, images, video,
 *      services, programs, case studies, testimonials, careers, etc.
 *   3. A synchronous cache-seed runs before site.js's DOMContentLoaded,
 *      so repeat visitors see live content instantly with no reload.
 *      First-time visitors (or when content changed since last visit)
 *      get one silent reload so site.js can render the fresh data.
 *
 * No field mapping, no schema drift: whatever the admin sees IS what
 * visitors see, because both read identical keys.
 * ─────────────────────────────────────────────────────────
 */
(function () {
  'use strict';

  var GH_USER  = 'arpit4645';
  var GH_REPO  = 'NucleusWebsite';
  var GH_BRANCH = 'main';
  var DATA_FILE = 'content/site-data.json';
  var RAW_URL = 'https://raw.githubusercontent.com/' + GH_USER + '/' + GH_REPO + '/' + GH_BRANCH + '/' + DATA_FILE;

  var CACHE_KEY    = 'nucleus_live_cache';   // last-known site-data.json (raw string)
  var RELOAD_FLAG  = 'nlive_reloaded';       // per-session guard against reload loops

  /* ── Seed localStorage from a site-data object ─────────────── */
  function seed(data) {
    if (!data || typeof data !== 'object') return;
    Object.keys(data).forEach(function (k) {
      if (k.charAt(0) === '_') return; // skip _comment / _version / _updated
      var v = data[k];
      try {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      } catch (e) { /* quota — ignore */ }
    });
  }

  /* ── 1. SYNCHRONOUS cache seed (runs before site.js renders) ─ */
  try {
    var cached = localStorage.getItem(CACHE_KEY);
    if (cached) seed(JSON.parse(cached));
  } catch (e) { /* ignore */ }

  /* ── Direct DOM application for text + media (no reload needed) */
  function applyText(data) {
    // [data-live="key"] → innerHTML
    document.querySelectorAll('[data-live]').forEach(function (el) {
      var key = el.getAttribute('data-live');
      var v = data[key];
      if (v === undefined || v === null || v === '') return;
      el.innerHTML = v;
    });
    // [data-set="key"] → innerHTML, with nucleus_ fallback
    document.querySelectorAll('[data-set]').forEach(function (el) {
      var attr = el.getAttribute('data-set');
      var v = data[attr];
      if (v === undefined) v = data['nucleus_' + attr];
      if (v === undefined) v = data['contact_' + attr];
      if (v === undefined || v === null || v === '') return;
      el.innerHTML = v;
    });
  }

  function applyMedia(data) {
    document.querySelectorAll('[data-media-key]').forEach(function (el) {
      var key = el.getAttribute('data-media-key');
      if (!key) return;
      var url = data[key + '_url'] || data[key] || '';
      if (!url || typeof url !== 'string') return;
      if (url.indexOf('data:') === 0 && url.length > 100000) return; // skip giant base64
      if (el.tagName === 'IMG') {
        if (el.getAttribute('src') !== url) el.src = url;
      } else {
        // background-image carrier (upload zones / hero panels)
        el.style.backgroundImage = "url('" + url + "')";
      }
    });
  }

  /* ── Does this page have dynamic sections site.js must render? ─ */
  function dynamicSectionsNeedRender() {
    var ids = ['hp-services-grid', 'hp-case-study', 'services-dynamic-list',
               'case-studies-list', 'programs-dynamic-list', 'blog-posts-grid',
               'careersBenefitsRender'];
    for (var i = 0; i < ids.length; i++) {
      var el = document.getElementById(ids[i]);
      // empty container = site.js painted with stale/empty data → needs fresh render
      if (el && el.children.length === 0) return true;
    }
    return false;
  }

  /* ── 2. ASYNC fetch fresh, seed, apply, reload-once-if-needed ─ */
  function refresh() {
    fetch(RAW_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.text(); })
      .then(function (txt) {
        var data = JSON.parse(txt);
        var prev = null;
        try { prev = localStorage.getItem(CACHE_KEY); } catch (e) {}

        seed(data);
        try { localStorage.setItem(CACHE_KEY, txt); } catch (e) {}

        // Text + media update live without any reload
        applyText(data);
        applyMedia(data);

        // Dynamic sections (grids built by site.js) need a render pass.
        // Only reload when content actually changed AND a dynamic section
        // is currently empty — and only once per session.
        var changed = prev !== txt;
        if (changed && dynamicSectionsNeedRender() && !sessionStorage.getItem(RELOAD_FLAG)) {
          try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch (e) {}
          location.reload();
        }
      })
      .catch(function (err) {
        // Network/parse failure → page keeps its hardcoded fallback content
        if (window.console) console.warn('[nucleus-live] hydrate skipped:', err && err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', refresh);
  } else {
    refresh();
  }

  /* ── Expose for admin "preview" / manual refresh ───────────── */
  window.nucleusLive = {
    refresh: function () {
      try { sessionStorage.removeItem(RELOAD_FLAG); } catch (e) {}
      refresh();
    },
    rawUrl: function () { return RAW_URL; }
  };
})();
