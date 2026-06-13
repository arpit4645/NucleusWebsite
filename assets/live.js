/**
 * live.js — public-page content hydrator (no tokens, no GitHub API).
 *
 * Fetches same-origin /content/site-data.json (committed by the admin panel
 * via serverless functions; Vercel redeploys on each content commit), seeds
 * the keys into localStorage, and lets the existing site.js render them.
 * If the content changed since this visitor's cached copy, one silent reload
 * lets site.js repaint with fresh data (sessionStorage guard prevents loops).
 *
 * Also applies the data-live* attribute conventions site.js doesn't handle,
 * plus favicon and WhatsApp-number overrides. Fails silently: with no data
 * file or no JS, pages render their built-in defaults.
 */
(function () {
  'use strict';

  var CACHE_KEY = 'nucleus_live_cache';
  var RELOAD_FLAG = 'nucleus_live_reloaded';

  function seed(data) {
    Object.keys(data).forEach(function (k) {
      if (k.charAt(0) === '_') return;
      var v = data[k];
      if (v === null || v === undefined) return;
      try {
        localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
      } catch (e) {}
    });
  }

  function getSettings() {
    try { return JSON.parse(localStorage.getItem('nucleus_site_settings') || '{}') || {}; }
    catch (e) { return {}; }
  }

  function apply() {
    try {
      // Text + links the markup tags with data-live conventions
      document.querySelectorAll('[data-live]').forEach(function (el) {
        var v = localStorage.getItem(el.getAttribute('data-live'));
        if (v) el.innerHTML = v;
      });
      document.querySelectorAll('[data-live-href]').forEach(function (el) {
        var v = localStorage.getItem(el.getAttribute('data-live-href'));
        if (v) el.setAttribute('href', v);
      });
      document.querySelectorAll('[data-live-bullets]').forEach(function (el) {
        var v = localStorage.getItem(el.getAttribute('data-live-bullets'));
        if (!v) return;
        var items = v.split('\n').map(function (s) { return s.trim(); }).filter(Boolean);
        if (items.length) el.innerHTML = items.map(function (t) { return '<li>' + t + '</li>'; }).join('');
      });

      var settings = getSettings();

      // Favicon override (uploaded via admin → Site Identity)
      var fav = localStorage.getItem('img_favicon_url');
      if (fav) {
        document.querySelectorAll('link[rel*="icon"]').forEach(function (l) { l.href = fav; });
      }

      // WhatsApp number override — rewrite all wa.me links, keep their ?text= payloads
      if (settings.wa) {
        var num = String(settings.wa).replace(/[^0-9]/g, '');
        if (num) {
          document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
            var q = a.href.indexOf('?');
            a.href = 'https://wa.me/' + num + (q >= 0 ? a.href.slice(q) : '');
          });
        }
      }
    } catch (e) {}
  }

  function done() {
    apply();
    try {
      document.dispatchEvent(new Event('nucleus-content-ready'));
      document.dispatchEvent(new Event('nucleus-sync-ready')); // legacy page hooks
    } catch (e) {}
  }

  fetch('/content/site-data.json?t=' + Date.now())
    .then(function (r) { return r.ok ? r.text() : null; })
    .then(function (text) {
      if (!text) { done(); return; }
      var data;
      try { data = JSON.parse(text); } catch (e) { done(); return; }
      if (!data || typeof data !== 'object') { done(); return; }

      var changed = localStorage.getItem(CACHE_KEY) !== text;
      seed(data);
      try { localStorage.setItem(CACHE_KEY, text); } catch (e) {}

      if (changed && !sessionStorage.getItem(RELOAD_FLAG)) {
        // site.js already painted with stale data — one silent repaint with fresh data
        try { sessionStorage.setItem(RELOAD_FLAG, '1'); } catch (e) {}
        location.reload();
        return;
      }
      if (!changed) {
        try { sessionStorage.removeItem(RELOAD_FLAG); } catch (e) {}
      }
      done();
    })
    .catch(function () { done(); });
})();
