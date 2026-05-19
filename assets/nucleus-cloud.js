/**
 * Nucleus Cloud Sync Engine
 * =========================
 * Replaces localStorage/IndexedDB with Firebase Firestore + Storage.
 * Works in both admin panel and all frontend pages.
 *
 * COLLECTION STRUCTURE IN FIRESTORE:
 *   nucleus_content / blog_posts      → array of blog posts
 *   nucleus_content / site_settings   → site-wide settings object
 *   nucleus_content / homepage        → homepage text content
 *   nucleus_content / services        → array of services
 *   nucleus_content / casestudies     → array of case studies
 *   nucleus_content / testimonials    → array of testimonials
 *   nucleus_content / careers         → array of job listings
 *   nucleus_content / about           → about page text fields (map)
 *   nucleus_content / media_urls      → map of storageKey → URL
 */

(function () {
  'use strict';

  // ── Dependency guard ───────────────────────────────────────────────────────
  if (!window.NUCLEUS_FIREBASE_CONFIG || !window.FIREBASE_CONFIGURED) {
    console.warn('[NucleusCloud] Firebase not configured. Running in localStorage mode.');
    window.NucleusCloud = createLocalFallback();
    return;
  }

  // ── Firebase SDK (v9 compat mode loaded via CDN in HTML) ──────────────────
  // We expect firebase-app-compat and firebase-firestore-compat to be loaded.
  function waitForFirebase(cb) {
    if (window.firebase && window.firebase.firestore) { cb(); return; }
    let attempts = 0;
    const iv = setInterval(() => {
      attempts++;
      if (window.firebase && window.firebase.firestore) {
        clearInterval(iv); cb();
      } else if (attempts > 40) {
        clearInterval(iv);
        console.error('[NucleusCloud] Firebase SDK failed to load. Falling back to localStorage.');
        window.NucleusCloud = createLocalFallback();
      }
    }, 250);
  }

  waitForFirebase(initCloud);

  function initCloud() {
    // Initialize Firebase app (safe to call multiple times)
    if (!firebase.apps.length) {
      firebase.initializeApp(window.NUCLEUS_FIREBASE_CONFIG);
    }
    const db = firebase.firestore();
    const storage = window.firebase.storage ? firebase.storage() : null;
    const COL = 'nucleus_content';

    // Helper: get/set a document in nucleus_content collection
    async function getDoc(docId) {
      try {
        const snap = await db.collection(COL).doc(docId).get();
        return snap.exists ? snap.data() : null;
      } catch (e) {
        console.error('[NucleusCloud] getDoc error:', docId, e);
        return null;
      }
    }

    async function setDoc(docId, data) {
      try {
        await db.collection(COL).doc(docId).set(data, { merge: true });
      } catch (e) {
        console.error('[NucleusCloud] setDoc error:', docId, e);
        throw e;
      }
    }

    async function setDocFull(docId, data) {
      try {
        await db.collection(COL).doc(docId).set(data);
      } catch (e) {
        console.error('[NucleusCloud] setDocFull error:', docId, e);
        throw e;
      }
    }

    // ── PUBLIC API ─────────────────────────────────────────────────────────
    window.NucleusCloud = {

      isCloud: true,

      // ── Blog Posts ─────────────────────────────────────────────────────
      async getPosts() {
        const d = await getDoc('blog_posts');
        return (d && d.posts) ? d.posts : [];
      },
      async savePosts(posts) {
        await setDocFull('blog_posts', { posts, updatedAt: new Date().toISOString() });
      },

      // ── Site Settings ──────────────────────────────────────────────────
      async getSettings() {
        const d = await getDoc('site_settings');
        return d || {};
      },
      async saveSettings(settings) {
        await setDocFull('site_settings', { ...settings, updatedAt: new Date().toISOString() });
      },
      async mergeSettings(partial) {
        await setDoc('site_settings', { ...partial, updatedAt: new Date().toISOString() });
      },

      // ── Homepage ───────────────────────────────────────────────────────
      async getHomepage() {
        const d = await getDoc('homepage');
        return d || {};
      },
      async saveHomepage(data) {
        await setDocFull('homepage', { ...data, updatedAt: new Date().toISOString() });
      },

      // ── Services ───────────────────────────────────────────────────────
      async getServices() {
        const d = await getDoc('services');
        return (d && d.items) ? d.items : [];
      },
      async saveServices(items) {
        await setDocFull('services', { items, updatedAt: new Date().toISOString() });
      },

      // ── Case Studies ───────────────────────────────────────────────────
      async getCaseStudies() {
        const d = await getDoc('casestudies');
        return (d && d.items) ? d.items : [];
      },
      async saveCaseStudies(items) {
        await setDocFull('casestudies', { items, updatedAt: new Date().toISOString() });
      },

      // ── Testimonials ───────────────────────────────────────────────────
      async getTestimonials() {
        const d = await getDoc('testimonials');
        return (d && d.items) ? d.items : [];
      },
      async saveTestimonials(items) {
        await setDocFull('testimonials', { items, updatedAt: new Date().toISOString() });
      },

      // ── Careers ────────────────────────────────────────────────────────
      async getCareers() {
        const d = await getDoc('careers');
        return (d && d.items) ? d.items : [];
      },
      async saveCareers(items) {
        await setDocFull('careers', { items, updatedAt: new Date().toISOString() });
      },

      // ── About Page ─────────────────────────────────────────────────────
      async getAbout() {
        const d = await getDoc('about');
        return d || {};
      },
      async saveAbout(fields) {
        await setDocFull('about', { ...fields, updatedAt: new Date().toISOString() });
      },

      // ── Leads (form submissions) ───────────────────────────────────────
      async getLeads() {
        const d = await getDoc('leads');
        return (d && d.items) ? d.items : [];
      },
      async saveLeads(items) {
        await setDocFull('leads', { items, updatedAt: new Date().toISOString() });
      },
      async addLead(lead) {
        const leads = await this.getLeads();
        leads.unshift({ ...lead, date: new Date().toISOString() });
        await this.saveLeads(leads);
      },

      // ── Media URLs ─────────────────────────────────────────────────────
      // Stores URL-based media overrides (YouTube, Vimeo, direct image URLs)
      async getMediaUrls() {
        const d = await getDoc('media_urls');
        return d || {};
      },
      async setMediaUrl(key, url, type) {
        const update = {};
        update[key + '_url'] = url || '';
        if (type) update[key + '_type'] = type;
        else delete update[key + '_type'];
        await setDoc('media_urls', update);
      },
      async removeMediaUrl(key) {
        // Use FieldValue.delete() to remove fields
        const updates = {};
        updates[key + '_url'] = firebase.firestore.FieldValue.delete();
        updates[key + '_type'] = firebase.firestore.FieldValue.delete();
        await db.collection(COL).doc('media_urls').update(updates).catch(() => {});
      },
      async getMediaUrl(key) {
        const all = await this.getMediaUrls();
        return { url: all[key + '_url'] || '', type: all[key + '_type'] || '' };
      },

      // ── File Upload to Firebase Storage ───────────────────────────────
      async uploadFile(key, file) {
        if (!storage) throw new Error('Firebase Storage not available.');
        const ext = file.name.split('.').pop();
        const ref = storage.ref(`nucleus_media/${key}.${ext}`);
        const task = ref.put(file);
        return new Promise((resolve, reject) => {
          task.on('state_changed', null, reject, async () => {
            const url = await ref.getDownloadURL();
            const type = file.type.startsWith('video/') ? 'video' : 'image';
            await this.setMediaUrl(key, url, type);
            resolve(url);
          });
        });
      },
      async deleteFile(key) {
        await this.removeMediaUrl(key);
      },

      // ── Realtime listener (optional, for live updates) ─────────────────
      onContentChange(docId, callback) {
        return db.collection(COL).doc(docId).onSnapshot(snap => {
          callback(snap.exists ? snap.data() : null);
        });
      }
    };

    console.log('[NucleusCloud] ✅ Firebase connected to project:', window.NUCLEUS_FIREBASE_CONFIG.projectId);
    document.dispatchEvent(new Event('nucleus-cloud-ready'));
  }

  // ── LocalStorage Fallback (when Firebase not configured) ──────────────────
  function createLocalFallback() {
    const ls = (key, fallback) => {
      try { return JSON.parse(localStorage.getItem(key)); } catch(e) { return fallback; }
    };
    const lsSave = (key, val) => localStorage.setItem(key, JSON.stringify(val));
    const asyncWrap = fn => (...args) => Promise.resolve(fn(...args));

    return {
      isCloud: false,
      getPosts:        asyncWrap(() => ls('nucleus_blog_posts', [])),
      savePosts:       asyncWrap(p => lsSave('nucleus_blog_posts', p)),
      getSettings:     asyncWrap(() => ls('nucleus_site_settings', {})),
      saveSettings:    asyncWrap(s => lsSave('nucleus_site_settings', s)),
      mergeSettings:   asyncWrap(s => {
        const cur = ls('nucleus_site_settings', {});
        lsSave('nucleus_site_settings', { ...cur, ...s });
      }),
      getHomepage:     asyncWrap(() => ls('nucleus_homepage', {})),
      saveHomepage:    asyncWrap(d => lsSave('nucleus_homepage', d)),
      getServices:     asyncWrap(() => ls('nucleus_services', [])),
      saveServices:    asyncWrap(i => lsSave('nucleus_services', i)),
      getCaseStudies:  asyncWrap(() => ls('nucleus_casestudies', [])),
      saveCaseStudies: asyncWrap(i => lsSave('nucleus_casestudies', i)),
      getTestimonials: asyncWrap(() => ls('nucleus_testimonials', [])),
      saveTestimonials:asyncWrap(i => lsSave('nucleus_testimonials', i)),
      getCareers:      asyncWrap(() => ls('nucleus_careers', [])),
      saveCareers:     asyncWrap(i => lsSave('nucleus_careers', i)),
      getAbout:        asyncWrap(() => {
        const keys = [
          'about_hero_eyebrow','about_hero_title','about_hero_subtitle',
          'about_who_eyebrow','about_who_title','about_who_body_1','about_who_body_2',
          'about_vision_title','about_vision_text',
          'about_mission_title','about_mission_text',
          'founder_name','founder_role','founder_bio_1','founder_bio_2','founder_signoff'
        ];
        const obj = {};
        keys.forEach(k => { const v = localStorage.getItem(k); if(v) obj[k] = v; });
        return obj;
      }),
      saveAbout:       asyncWrap(fields => {
        Object.entries(fields).forEach(([k,v]) => { if(k !== 'updatedAt') localStorage.setItem(k, v); });
      }),
      getLeads:        asyncWrap(() => ls('nucleus_leads', [])),
      saveLeads:       asyncWrap(i => lsSave('nucleus_leads', i)),
      addLead:         asyncWrap(lead => {
        const leads = ls('nucleus_leads', []);
        leads.unshift({ ...lead, date: new Date().toISOString() });
        lsSave('nucleus_leads', leads);
      }),
      getMediaUrls:    asyncWrap(() => {
        // Collect all _url keys from localStorage
        const obj = {};
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k.endsWith('_url') || k.endsWith('_type')) {
            obj[k] = localStorage.getItem(k);
          }
        }
        return obj;
      }),
      setMediaUrl:     asyncWrap((key, url, type) => {
        localStorage.setItem(key + '_url', url || '');
        if (type) localStorage.setItem(key + '_type', type);
      }),
      removeMediaUrl:  asyncWrap(key => {
        localStorage.removeItem(key + '_url');
        localStorage.removeItem(key + '_type');
      }),
      getMediaUrl:     asyncWrap(key => ({
        url: localStorage.getItem(key + '_url') || '',
        type: localStorage.getItem(key + '_type') || ''
      })),
      uploadFile:      asyncWrap(() => { throw new Error('File upload requires Firebase config.'); }),
      deleteFile:      asyncWrap(key => {
        localStorage.removeItem(key + '_url');
        localStorage.removeItem(key + '_type');
      }),
      onContentChange: () => () => {} // no-op unsubscribe
    };
  }

})();
