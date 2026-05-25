/**
 * nucleus-live.js  v1.0
 * ─────────────────────────────────────────────────────────
 * DROP THIS SCRIPT INTO EVERY HTML PAGE (just before </body>)
 *
 * What it does:
 *   1. Fetches content/site-data.json from GitHub raw URL
 *   2. Applies every key to matching [data-live="key"] elements
 *   3. Handles special keys: posts (blog), case_studies,
 *      testimonials, programs, services, stats, nav, footer
 *   4. Falls back to hardcoded HTML if fetch fails
 *   5. Caches in sessionStorage for instant repeat loads
 *
 * How to add a new editable field to any page:
 *   Add  data-live="your_key"  to any element.
 *   Admin saves "your_key" → this script fills it in.
 * ─────────────────────────────────────────────────────────
 */

(function () {
  'use strict';

  /* ── CONFIG ─────────────────────────────────────────── */
  var GITHUB_USER  = 'arpit4645';
  var GITHUB_REPO  = 'NucleusWebsite';
  var GITHUB_BRANCH = 'main';
  var DATA_FILE    = 'content/site-data.json';
  var CACHE_KEY    = 'nucleus_live_data';
  var CACHE_TTL    = 60000; // 60s — fresh enough for live updates

  var RAW_URL = 'https://raw.githubusercontent.com/' +
    GITHUB_USER + '/' + GITHUB_REPO + '/' + GITHUB_BRANCH + '/' + DATA_FILE;

  /* ── FETCH WITH CACHE ────────────────────────────────── */
  function loadData() {
    try {
      var cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        var obj = JSON.parse(cached);
        if (Date.now() - obj._ts < CACHE_TTL) {
          applyAll(obj.data);
          return;
        }
      }
    } catch (e) {}

    fetch(RAW_URL + '?t=' + Date.now(), { cache: 'no-store' })
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (data) {
        try {
          sessionStorage.setItem(CACHE_KEY, JSON.stringify({ _ts: Date.now(), data: data }));
        } catch (e) {}
        applyAll(data);
      })
      .catch(function (err) {
        console.warn('[nucleus-live] Could not load site-data.json:', err.message);
      });
  }

  /* ── APPLY ALL DATA TO PAGE ──────────────────────────── */
  function applyAll(data) {
    if (!data) return;

    applyTextFields(data);
    applyStats(data);
    applyNavCTA(data);
    applyBlogSection(data);
    applyTestimonials(data);
    applyCaseStudies(data);
    applyServices(data);
    applyPrograms(data);
    applyContactInfo(data);
    applyFooter(data);
    applyPainBullets(data);
  }

  /* ── SIMPLE TEXT / HTML FIELDS ───────────────────────── */
  /* Any element with data-live="key" gets innerHTML replaced */
  function applyTextFields(data) {
    document.querySelectorAll('[data-live]').forEach(function (el) {
      var key = el.getAttribute('data-live');
      if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
        el.innerHTML = data[key];
      }
    });
    /* Legacy support for data-set used in old index.html */
    document.querySelectorAll('[data-set]').forEach(function (el) {
      var key = 'nucleus_' + el.getAttribute('data-set');
      var shortKey = el.getAttribute('data-set');
      var val = data[key] || data[shortKey];
      if (val) el.innerHTML = val;
    });
  }

  /* ── STATS COUNTERS ──────────────────────────────────── */
  function applyStats(data) {
    var map = {
      'stats_lives':     '[data-counter-key="lives"]',
      'stats_biz':       '[data-counter-key="biz"]',
      'stats_years':     '[data-counter-key="years"]',
      'stats_retention': '[data-counter-key="lift"]'
    };
    Object.keys(map).forEach(function (key) {
      if (!data[key]) return;
      document.querySelectorAll(map[key]).forEach(function (el) {
        el.textContent = data[key];
      });
    });
  }

  /* ── NAV CTA ─────────────────────────────────────────── */
  function applyNavCTA(data) {
    if (!data.nav_cta_label) return;
    document.querySelectorAll('.nav-cta, [data-live="nav_cta_label"]').forEach(function (el) {
      if (el.tagName === 'A') el.textContent = data.nav_cta_label;
    });
  }

  /* ── PAIN MIRROR BULLETS ─────────────────────────────── */
  function applyPainBullets(data) {
    if (!data.hp_pain_bullets) return;
    var lists = document.querySelectorAll('[data-live-bullets="hp_pain_bullets"], .stagger-list[data-pain-list]');
    lists.forEach(function (ul) {
      var lines = data.hp_pain_bullets.split('\n').filter(function (l) { return l.trim(); });
      ul.innerHTML = lines.map(function (l) {
        return '<li>' + l.trim() + '</li>';
      }).join('');
    });
  }

  /* ── BLOG SECTION ────────────────────────────────────── */
  function applyBlogSection(data) {
    if (!data.posts || !data.posts.length) return;
    var published = data.posts.filter(function (p) { return p.status === 'published'; });
    if (!published.length) return;

    /* Homepage featured post or latest 3 */
    var homeGrid = document.getElementById('blog-home-grid');
    if (homeGrid) {
      var featured = published.filter(function (p) { return p.featured === 'true'; }).slice(0, 1);
      var rest = published.slice(0, 3);
      var items = featured.length ? featured.concat(rest.slice(0, 2)) : rest;
      homeGrid.innerHTML = items.map(function (p) {
        return blogCardHTML(p);
      }).join('');
    }

    /* Full blog listing page */
    var blogGrid = document.getElementById('blog-posts-grid');
    if (blogGrid) {
      blogGrid.innerHTML = published.map(function (p) {
        return blogCardHTML(p);
      }).join('');
    }

    /* Single post page */
    var postContainer = document.getElementById('blog-single-post');
    if (postContainer) {
      var slug = new URLSearchParams(window.location.search).get('id');
      var post = data.posts.find(function (p) { return p.id === slug; });
      if (post) renderSinglePost(postContainer, post);
    }
  }

  function blogCardHTML(p) {
    var imgTag = p.image
      ? '<img src="' + p.image + '" alt="' + (p.title || '') + '" loading="lazy" style="width:100%;aspect-ratio:16/9;object-fit:cover;border-radius:12px;margin-bottom:16px" />'
      : '';
    return '<article class="blog-card prog prog-light reveal" style="cursor:pointer" onclick="window.location.href=\'blog.html?id=' + p.id + '\'">' +
      imgTag +
      '<p class="prog-ey">' + (p.category || 'Insights') + ' &nbsp;·&nbsp; ' + (p.readTime || '5 MIN') + '</p>' +
      '<h3 style="font-size:clamp(18px,2vw,24px);margin:12px 0 10px">' + (p.title || '') + '</h3>' +
      '<p style="font-size:14px;opacity:.75;line-height:1.6">' + (p.excerpt || '') + '</p>' +
      '<div class="prog-foot"><a class="link" style="font-size:13px;font-weight:500">Read article →</a></div>' +
    '</article>';
  }

  function renderSinglePost(container, p) {
    var md = p.content || '';
    var html = md
      .replace(/^### (.+)$/gm, '<h3>$1</h3>')
      .replace(/^## (.+)$/gm, '<h2>$1</h2>')
      .replace(/^> (.+)$/gm, '<blockquote>$1</blockquote>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>[\s\S]*?<\/li>)/g, '<ul>$1</ul>')
      .replace(/^---$/gm, '<hr>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/^(?!<[hbulp])(.+)$/gm, '<p>$1</p>');
    container.innerHTML =
      '<div style="max-width:720px;margin:0 auto">' +
        (p.image ? '<img src="' + p.image + '" alt="' + p.title + '" style="width:100%;border-radius:16px;margin-bottom:40px;aspect-ratio:16/9;object-fit:cover" />' : '') +
        '<p style="font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:16px">' + (p.category || '') + ' &nbsp;·&nbsp; ' + (p.readTime || '') + ' &nbsp;·&nbsp; ' + (p.date || '') + '</p>' +
        '<h1 style="font-family:var(--serif);font-size:clamp(32px,5vw,52px);font-weight:700;line-height:1.1;margin-bottom:24px">' + p.title + '</h1>' +
        '<div class="post-body" style="font-size:18px;line-height:1.8;color:var(--ink-2)">' + html + '</div>' +
        '<div style="margin-top:48px;padding-top:32px;border-top:1px solid var(--line);font-family:var(--mono);font-size:12px;color:var(--muted)">Written by ' + (p.author || 'Nucleus Team') + '</div>' +
      '</div>';
  }

  /* ── TESTIMONIALS ────────────────────────────────────── */
  function applyTestimonials(data) {
    if (!data.testimonials || !data.testimonials.length) return;
    document.querySelectorAll('[data-live-testimonials]').forEach(function (container) {
      container.innerHTML = data.testimonials.map(function (t) {
        return '<div class="testi-item" style="background:var(--ink);border-radius:16px;padding:32px;margin-bottom:16px">' +
          '<blockquote style="font-family:var(--serif);font-size:clamp(18px,2vw,26px);color:var(--cream);line-height:1.3;margin-bottom:20px">"' + (t.quote || '') + '"</blockquote>' +
          '<p style="font-family:var(--mono);font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:rgba(247,244,237,.5)"><strong style="color:var(--cream)">' + (t.name || '') + '</strong> — ' + (t.role || '') + '</p>' +
        '</div>';
      }).join('');
    });

    /* Single homepage testimonial slot */
    var single = document.querySelector('[data-live-testimonial-single]');
    if (single && data.testimonials[0]) {
      var t = data.testimonials[0];
      var bq = single.querySelector('blockquote');
      var attr = single.querySelector('.attr');
      if (bq) bq.innerHTML = '"' + t.quote + '"';
      if (attr) attr.innerHTML = '<strong>' + t.name + '</strong> — ' + t.role;
    }
  }

  /* ── CASE STUDIES ────────────────────────────────────── */
  function applyCaseStudies(data) {
    if (!data.case_studies || !data.case_studies.length) return;
    document.querySelectorAll('[data-live-casestudies]').forEach(function (container) {
      container.innerHTML = data.case_studies.map(function (cs) {
        return '<div class="case-card" style="background:var(--white);border:1px solid var(--line);border-radius:16px;padding:32px;margin-bottom:16px">' +
          '<p style="font-family:var(--mono);font-size:10px;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin-bottom:12px">' + (cs.industry || '') + '</p>' +
          '<h3 style="font-family:var(--serif);font-size:24px;margin-bottom:16px">' + (cs.company || '') + '</h3>' +
          '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">' +
            '<div><p style="font-size:12px;font-weight:600;color:var(--muted);margin-bottom:6px">BEFORE</p><p>' + (cs.challenge || '') + '</p></div>' +
            '<div><p style="font-size:12px;font-weight:600;color:var(--green);margin-bottom:6px">AFTER</p><p>' + (cs.result || '') + '</p></div>' +
          '</div>' +
          (cs.quote ? '<blockquote style="border-left:3px solid var(--gold);padding-left:16px;font-style:italic;color:var(--muted)">"' + cs.quote + '"<br><strong>' + (cs.clientName || '') + '</strong></blockquote>' : '') +
        '</div>';
      }).join('');
    });
  }

  /* ── SERVICES LIST ───────────────────────────────────── */
  function applyServices(data) {
    if (!data.services || !data.services.length) return;
    document.querySelectorAll('[data-live-services]').forEach(function (container) {
      container.innerHTML = data.services.map(function (s) {
        return '<a href="services.html" class="prog prog-light reveal" style="text-decoration:none">' +
          '<p class="prog-ey">' + (s.icon || '') + ' &nbsp; Services</p>' +
          '<h3>' + (s.title || '') + '</h3>' +
          '<p>' + (s.desc || '') + '</p>' +
          '<div class="prog-foot"><span class="link">Learn more →</span></div>' +
        '</a>';
      }).join('');
    });
  }

  /* ── PROGRAMS ────────────────────────────────────────── */
  function applyPrograms(data) {
    if (!data.programs || !data.programs.length) return;
    document.querySelectorAll('[data-live-programs]').forEach(function (container) {
      container.innerHTML = data.programs.map(function (p) {
        return '<div class="prog prog-light reveal">' +
          '<p class="prog-ey">' + (p.type || 'Program') + '</p>' +
          '<h3>' + (p.name || '') + '</h3>' +
          '<p>' + (p.desc || '') + '</p>' +
          '<div class="prog-foot">' +
            (p.duration ? '<span style="font-family:var(--mono);font-size:11px;color:var(--muted)">' + p.duration + '</span>' : '') +
            (p.price ? '<span style="font-family:var(--mono);font-size:11px;color:var(--green);margin-left:12px">' + p.price + '</span>' : '') +
          '</div>' +
        '</div>';
      }).join('');
    });
  }

  /* ── CONTACT INFO ────────────────────────────────────── */
  function applyContactInfo(data) {
    var map = {
      contact_phone: '[data-live="contact_phone"], [data-set="phone"]',
      contact_email: '[data-live="contact_email"], [data-set="email"]',
      contact_address: '[data-live="contact_address"], [data-set="address"]'
    };
    Object.keys(map).forEach(function (key) {
      if (!data[key]) return;
      document.querySelectorAll(map[key]).forEach(function (el) {
        el.innerHTML = data[key];
      });
    });
    /* Phone href */
    if (data.contact_phone) {
      document.querySelectorAll('a[href^="tel:"]').forEach(function (a) {
        a.href = 'tel:' + data.contact_phone.replace(/\s/g, '');
        if (a.textContent.includes('+91') || a.textContent.includes('815')) {
          a.textContent = data.contact_phone;
        }
      });
    }
    /* Email href */
    if (data.contact_email) {
      document.querySelectorAll('a[href^="mailto:"]').forEach(function (a) {
        a.href = 'mailto:' + data.contact_email;
        if (a.textContent.includes('@')) a.textContent = data.contact_email;
      });
    }
    /* WhatsApp */
    if (data.contact_wa) {
      document.querySelectorAll('a[href*="wa.me"]').forEach(function (a) {
        a.href = 'https://wa.me/' + data.contact_wa + '?text=Hi%2C+I+want+to+book+a+consultation';
      });
      var floatWa = document.querySelector('.wa-float');
      if (floatWa) floatWa.href = 'https://wa.me/' + data.contact_wa + '?text=Hi%2C+I+want+to+book+a+consultation';
    }
  }

  /* ── FOOTER ─────────────────────────────────────────── */
  function applyFooter(data) {
    if (data.footer_tagline) {
      document.querySelectorAll('.footer-tagline, [data-live="footer_tagline"]').forEach(function (el) {
        el.innerHTML = data.footer_tagline;
      });
    }
    if (data.social_instagram) {
      document.querySelectorAll('[data-live="social_instagram"], a.social-instagram').forEach(function (el) {
        el.href = data.social_instagram;
      });
    }
    if (data.social_linkedin) {
      document.querySelectorAll('[data-live="social_linkedin"], a.social-linkedin').forEach(function (el) {
        el.href = data.social_linkedin;
      });
    }
  }

  /* ── EXPOSE FOR ADMIN USE ────────────────────────────── */
  window.nucleusLive = {
    reload: function () {
      sessionStorage.removeItem(CACHE_KEY);
      loadData();
    },
    getRawUrl: function () { return RAW_URL; }
  };

  /* ── RUN ─────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadData);
  } else {
    loadData();
  }
})();
