/* ============================================================
   Nucleus Consultant — Premium Animation Engine
   Performance-first · GPU-composited · Luxury Standard
   ============================================================ */

// --- 0. DYNAMICALLY LOAD FIREBASE & CLOUD SYNC ---
// This ensures that all HTML files (frontend + admin) get Firebase loaded
// automatically without needing to edit <head> in 10 different files.
(function loadCloudEngine() {
  const scripts = [
    "assets/sync-config.js",
    "assets/github-sync.js"
  ];

  let loaded = 0;
  function loadNext() {
    if (loaded >= scripts.length) return;
    const s = document.createElement('script');
    s.src = scripts[loaded];
    s.onload = () => { loaded++; loadNext(); };
    document.head.appendChild(s);
  }
  loadNext();
})();

document.addEventListener('DOMContentLoaded', () => {
  document.body.classList.add('page-loaded');
  document.documentElement.classList.add('js'); // FIX: GAP-09

  // FIX: GAP-09 — IntersectionObserver fallback so content stays visible on legacy browsers
  if (!('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal, .reveal-left, .reveal-scale, .hero-line > span').forEach(el => {
      el.style.opacity = '1';
      el.style.transform = 'none';
    });
    // also reveal stat counters with their final values
    document.querySelectorAll('[data-counter]').forEach(el => {
      el.textContent = el.getAttribute('data-counter') + (el.getAttribute('data-suffix') || '');
    });
    return;
  }

  /* ── 1. Scroll Reveals ─────────────────────────────────────── */
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1
  };

  window._revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('in');
        
        // Handle stagger children
        if (entry.target.hasAttribute('data-stagger')) {
          const delay = parseInt(entry.target.getAttribute('data-stagger')) || 100;
          Array.from(entry.target.children).forEach((child, i) => {
            child.style.transitionDelay = `${i * delay}ms`;
            child.classList.add('in');
          });
        }

        // Handle stagger lists
        if (entry.target.classList.contains('stagger-list')) {
          Array.from(entry.target.querySelectorAll('li')).forEach((li, i) => {
            li.style.transitionDelay = `${i * 120}ms`;
            li.classList.add('in');
          });
        }
        
        window._revealObserver.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal, .reveal-left, .reveal-scale, [data-stagger], .stagger-list').forEach(el => {
    window._revealObserver.observe(el);
  });

  /* ── 2. Navigation Blur & Scroll ────────────────────────────── */
  const nav = document.querySelector('.nav');
  if (nav) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 50) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }
    }, { passive: true });
    
    // Initial check
    if (window.scrollY > 50) nav.classList.add('scrolled');
  }

  /* ── 3. Mobile Menu ─────────────────────────────────────────── */
  // FIX: GAP-08 — toggle .nav-open on the <nav> element (used by mobile CSS)
  const burger = document.querySelector('.nav-burger');
  const navLinks = document.querySelector('.nav-links');
  const navEl = document.querySelector('.nav');

  if (burger && navLinks && navEl) {
    burger.addEventListener('click', () => {
      const isOpen = navEl.classList.toggle('nav-open');
      navLinks.classList.toggle('open', isOpen);
      burger.classList.toggle('active', isOpen);
      burger.setAttribute('aria-expanded', String(isOpen));
      document.body.style.overflow = isOpen ? 'hidden' : '';
    });
    // close on link tap (mobile)
    navLinks.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
      navEl.classList.remove('nav-open');
      navLinks.classList.remove('open');
      burger.classList.remove('active');
      document.body.style.overflow = '';
    }));
  }

  /* ── 4. Stats Counter Animation ─────────────────────────────── */
  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseFloat(el.getAttribute('data-counter'));
        const suffix = el.getAttribute('data-suffix') || '';
        const duration = 2000;
        const start = performance.now();

        function updateCounter(currentTime) {
          const elapsed = currentTime - start;
          const progress = Math.min(elapsed / duration, 1);
          
          // Easing out cubic
          const easeOut = 1 - Math.pow(1 - progress, 3);
          const currentVal = (target * easeOut).toFixed(target % 1 === 0 ? 0 : 1);
          
          el.textContent = currentVal + suffix;

          if (progress < 1) {
            requestAnimationFrame(updateCounter);
          } else {
            el.textContent = target + suffix;
          }
        }
        
        requestAnimationFrame(updateCounter);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  document.querySelectorAll('[data-counter]').forEach(counter => {
    counterObserver.observe(counter);
  });

  /* ── 5. Hero Text Animation ─────────────────────────────────── */
  const heroAnim = document.querySelector('.hero-anim');
  if (heroAnim) {
    setTimeout(() => {
      heroAnim.classList.add('in');
      document.querySelectorAll('.hero-line > span').forEach((span, i) => {
        span.style.transform = 'translateY(0)';
      });
    }, 100);
  }

  /* ── 6. Floating WhatsApp Button ────────────────────────────── */
  function initWhatsAppButton() {
    let waBtn = document.querySelector('.wa-float');
    if (!waBtn) {
      waBtn = document.createElement('a');
      waBtn.href = "https://wa.me/918156076680?text=Hi%20Nucleus%2C%20I%20want%20a%20Business%20Diagnosis";
      waBtn.className = "wa-float";
      waBtn.target = "_blank";
      waBtn.setAttribute('aria-label', 'Chat on WhatsApp');
      waBtn.innerHTML = `
        <div class="wa-pulse"></div>
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.888-.788-1.489-1.761-1.663-2.06-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
        </svg>
      `;
      document.body.appendChild(waBtn);
    }
    
    // Show after 3 seconds
    setTimeout(() => {
      waBtn.classList.add('visible');
    }, 3000);
  }

  initWhatsAppButton();
  
  // Call global media and settings loader
  if (typeof loadGlobalMediaAndSettings === 'function') {
    loadGlobalMediaAndSettings();
  }
});

document.addEventListener('nucleus-sync-ready', () => {
  if (typeof loadGlobalMediaAndSettings === 'function') {
    loadGlobalMediaAndSettings();
  }
});

/* ============================================================
   Nucleus — Dynamic CMS Media & Settings Sync Engine
   ============================================================ */

// 1. Centralized IndexedDB Helpers
(function() {
  const DB = 'nucleus_media', ST = 'files';
  function _openDB() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB, 1);
      r.onupgradeneeded = e => e.target.result.createObjectStore(ST);
      r.onsuccess = e => res(e.target.result);
      r.onerror = () => rej(r.error);
    });
  }
  window.mdbLoad = async (key) => {
    try {
      const db = await _openDB();
      return new Promise((res, rej) => {
        const tx = db.transaction(ST, 'readonly');
        const r = tx.objectStore(ST).get(key);
        r.onsuccess = () => res(r.result ? URL.createObjectURL(r.result) : null);
        r.onerror = () => rej(r.error);
      });
    } catch(e) {
      console.error('Error loading media from IndexedDB:', e);
      return null;
    }
  };
  window.mdbMarked = (key) => !!localStorage.getItem('__idb:' + key);
})();

// 2. Dynamic Settings & Media Loader
async function loadGlobalMediaAndSettings() {
  // Inject CSS style for mute button if needed
  if (!document.getElementById('universal-mute-styles')) {
    const style = document.createElement('style');
    style.id = 'universal-mute-styles';
    style.innerHTML = `
      .universal-mute-btn {
        position: absolute;
        bottom: 16px;
        right: 16px;
        background: rgba(0, 0, 0, 0.6) !important;
        color: white !important;
        border: 1px solid rgba(255, 255, 255, 0.25) !important;
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border-radius: 50% !important;
        width: 44px;
        height: 44px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99;
        transition: all 0.3s ease;
        padding: 0 !important;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }
      .universal-mute-btn:hover {
        background: rgba(0, 0, 0, 0.8) !important;
        transform: scale(1.05);
      }
    `;
    document.head.appendChild(style);
  }

  // A. Load global site settings (email, phone, address, social links, stats)
  try {
    const settings = JSON.parse(localStorage.getItem('nucleus_site_settings')) || {};
    
    if (settings.email) {
      document.querySelectorAll('[data-set="email"]').forEach(el => {
        el.innerHTML = settings.email;
        if (el.tagName === 'A') el.href = 'mailto:' + settings.email;
      });
    }
    if (settings.phone) {
      document.querySelectorAll('[data-set="phone"]').forEach(el => {
        el.innerHTML = settings.phone;
        if (el.tagName === 'A') el.href = 'tel:' + settings.phone.replace(/\s+/g, '');
      });
    }
    if (settings.address) {
      document.querySelectorAll('[data-set="address"]').forEach(el => {
        el.innerHTML = settings.address;
      });
    }
    if (settings.insta) {
      document.querySelectorAll('[data-set="insta"]').forEach(el => {
        if (el.tagName === 'A') el.href = settings.insta;
      });
    }
    if (settings.linkedin) {
      document.querySelectorAll('[data-set="linkedin"]').forEach(el => {
        if (el.tagName === 'A') el.href = settings.linkedin;
      });
    }
    if (settings.twitter) {
      document.querySelectorAll('[data-set="twitter"]').forEach(el => {
        if (el.tagName === 'A') el.href = settings.twitter;
      });
    }
    
    // Update stats counters
    const statsMap = {
      'lives': settings.lives,
      'biz': settings.biz,
      'years': settings.years,
      'lift': settings.lift
    };
    for (const [key, val] of Object.entries(statsMap)) {
      if (val) {
        document.querySelectorAll(`[data-counter-key="${key}"]`).forEach(el => {
          el.setAttribute('data-counter', val);
          el.textContent = val + (el.getAttribute('data-suffix') || '');
        });
      }
    }
  } catch(e) {
    console.error('Error loading global site settings:', e);
  }

  // B. Load dynamic text elements (with data-set attribute, ignoring global contact keys)
  // FIX: GAP-19 — only override the element's HTML if the stored value is non-empty;
  // empty / null / undefined values preserve the default HTML written into the markup.
  document.querySelectorAll('[data-set]').forEach(el => {
    const key = el.getAttribute('data-set');
    if (key && !['email', 'phone', 'address', 'insta', 'linkedin', 'twitter'].includes(key)) {
      const val = localStorage.getItem(key);
      if (val !== undefined && val !== null && val !== '') el.innerHTML = val;
    }
  });

  // FIX: GAP-31/32 — Render dynamic services grid, case study, and testimonial on homepage.
  // Earlier version used Unicode curly quotes inside HTML strings which broke the markup.
  // C1. Render nucleus_services grid on homepage
  try {
    const svcs = JSON.parse(localStorage.getItem('nucleus_services') || '[]');
    const svcGrid = document.getElementById('hp-services-grid');
    if (svcGrid && svcs.length) {
      svcGrid.innerHTML = svcs.map(s =>
        `<a href="services.html" class="prog prog-light" style="min-height:auto;padding:32px;border:1px solid var(--green-pale);">
          <div style="font-size:28px;margin-bottom:12px;">${s.icon || '🔧'}</div>
          <h3 style="margin:0;font-size:20px;color:var(--green-deep);">${s.title || ''}</h3>
          ${s.description ? `<p style="margin:12px 0 0;color:var(--muted);font-size:15px;line-height:1.5;">${s.description}</p>` : ''}
        </a>`
      ).join('');
    }
  } catch(e) {}

  // C2. Render first case study snippet on homepage
  try {
    const cases = JSON.parse(localStorage.getItem('nucleus_casestudies') || '[]');
    const csEl = document.getElementById('hp-case-study');
    if (csEl && cases.length) {
      const c = cases[0];
      const xSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top:4px;flex-shrink:0;"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
      const chkSvg = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-top:4px;flex-shrink:0;"><polyline points="20 6 9 17 4 12"/></svg>`;
      const beforeItems = (c.before || '').split('\n').filter(Boolean).map(t =>
        `<li style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;">${xSvg} ${t}</li>`).join('');
      const afterItems = (c.after || '').split('\n').filter(Boolean).map(t =>
        `<li style="display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;">${chkSvg} ${t}</li>`).join('');
      csEl.innerHTML = `
        <div class="card-hover wipe-reveal" style="background:#FFF0F0;padding:40px;border-radius:20px;border:1px solid #FFD6D6;">
          <h3 style="color:#D32F2F;margin-bottom:24px;font-size:24px;">Before:</h3>
          <ul style="font-size:18px;line-height:2;list-style-type:none;padding:0;color:#5C1010;">${beforeItems}</ul>
        </div>
        <div class="card-hover wipe-reveal" style="background:#F0FFF4;padding:40px;border-radius:20px;border:1px solid #C6F6D5;">
          <h3 style="color:#2F855A;margin-bottom:24px;font-size:24px;">After:</h3>
          <ul style="font-size:18px;line-height:2;list-style-type:none;padding:0;color:#1C4532;">${afterItems}</ul>
          ${c.result ? `<p style="margin-top:24px;font-weight:600;color:#2F855A;">Result: ${c.result}</p>` : ''}
        </div>`;
    }
  } catch(e) {}

  // C3. Render first testimonial on homepage
  try {
    const tms = JSON.parse(localStorage.getItem('nucleus_testimonials') || '[]');
    if (tms.length) {
      const t = tms[0];
      const qEl = document.getElementById('hp-testimonial-quote');
      const nEl = document.getElementById('hp-testimonial-name');
      const rEl = document.getElementById('hp-testimonial-role');
      if (qEl && t.quote) qEl.textContent = '"' + t.quote + '"';
      if (nEl && t.name) nEl.textContent = t.name;
      if (rEl && (t.role || t.company)) rEl.textContent = [t.role, t.company].filter(Boolean).join(', ');
    }
  } catch(e) {}

  // FIX: GAP-17 — auto-inject footer social icons (Instagram / LinkedIn / Twitter)
  // reading hrefs from nucleus_site_settings (insta/linkedin/twitter). Skips if already added.
  try {
    const settings = JSON.parse(localStorage.getItem('nucleus_site_settings') || '{}');
    document.querySelectorAll('.footer').forEach(footer => {
      if (footer.querySelector('.footer-social')) return;
      const social = document.createElement('div');
      social.className = 'footer-social';
      const ig = settings.insta    || '';
      const li = settings.linkedin || '';
      const tw = settings.twitter  || '';
      const yt = settings.youtube  || '';
      const fb = settings.facebook || '';
      social.innerHTML = `
        ${ig ? `<a data-set="insta" href="${ig}" target="_blank" rel="noopener" aria-label="Instagram">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
        </a>` : ''}
        ${li ? `<a data-set="linkedin" href="${li}" target="_blank" rel="noopener" aria-label="LinkedIn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-4 0v7h-4v-7a6 6 0 0 1 6-6z"/><rect x="2" y="9" width="4" height="12"/><circle cx="4" cy="4" r="2"/></svg>
        </a>` : ''}
        ${tw ? `<a data-set="twitter" href="${tw}" target="_blank" rel="noopener" aria-label="Twitter / X">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
        </a>` : ''}
        ${yt ? `<a data-set="youtube" href="${yt}" target="_blank" rel="noopener" aria-label="YouTube">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33A2.78 2.78 0 0 0 3.4 19c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.25 29 29 0 0 0-.46-5.33z"/><polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02"/></svg>
        </a>` : ''}
        ${fb ? `<a data-set="facebook" href="${fb}" target="_blank" rel="noopener" aria-label="Facebook">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        </a>` : ''}
      `.trim();
      if (!social.innerHTML) return; // nothing to inject if no socials configured
      // try to attach inside the existing footer-bottom row, else inside .wrap
      const target = footer.querySelector('.footer-bottom') || footer.querySelector('.wrap') || footer;
      target.appendChild(social);
    });
  } catch (e) { /* non-fatal */ }


  // B2. Render services page (hero, list, steps, pricing)
  const servicesList = document.getElementById('services-dynamic-list');
  if (servicesList) {
    // Hero text
    const svcHero = JSON.parse(localStorage.getItem('nucleus_services_hero') || '{}');
    const heroTitle = document.getElementById('svc-hero-title');
    const heroSub   = document.getElementById('svc-hero-sub');
    if (heroTitle && svcHero.title) heroTitle.innerHTML = svcHero.title;
    if (heroSub   && svcHero.sub)   heroSub.textContent  = svcHero.sub;

    // Pricing note
    const svcPricing = JSON.parse(localStorage.getItem('nucleus_services_pricing') || '{}');
    const priceQ = document.getElementById('svc-pricing-quote');
    const priceCta = document.getElementById('svc-pricing-cta');
    if (priceQ && svcPricing.quote) priceQ.textContent = svcPricing.quote;
    if (priceCta && svcPricing.cta) priceCta.textContent = svcPricing.cta + ' →';

    // How We Work steps
    const DEFAULT_STEPS = [
      {icon:'🔍', title:'Diagnose', desc:'2-hour deep-dive into your business to identify the real bottlenecks. Completely free.'},
      {icon:'⭐', title:'Design',   desc:'Custom transformation roadmap built specifically for your context and team size.'},
      {icon:'⚡', title:'Deploy',   desc:'Hands-on implementation with your team over a 6 to 12-month partnership.'}
    ];
    const svcSteps = JSON.parse(localStorage.getItem('nucleus_services_steps') || 'null') || DEFAULT_STEPS;
    const stepsEl = document.getElementById('svc-steps-render');
    if (stepsEl) {
      stepsEl.innerHTML = svcSteps.map((s, i) => `
        <div class="step-card reveal">
          <div class="icon"><span style="font-size:28px;">${s.icon || ''}</span></div>
          <h3>${i+1}. ${s.title || ''}</h3>
          <p>${s.desc || ''}</p>
        </div>`).join('');
      stepsEl.querySelectorAll('.reveal').forEach(el => {
        if (typeof window._revealObserver !== 'undefined') window._revealObserver.observe(el);
      });
    }

    // Services list
    const DEFAULT_SERVICES = [
      {icon:'🧠', title:'Leadership & Thinking',      description:'Transform how your leaders think and make decisions.',    outcomes:'Clearer decision-making\nReduced founder dependency\nLeadership accountability'},
      {icon:'🤝', title:'Culture & Accountability',   description:'Build a team culture of ownership and accountability.',  outcomes:'Team ownership mindset\nAccountability systems\nCulture code documented'},
      {icon:'📈', title:'Sales & Growth System',      description:'Build predictable sales systems that scale.',            outcomes:'Consistent monthly leads\nOutbound sales process\nRevenue forecasting'},
      {icon:'📣', title:'Marketing & Brand Positioning', description:'Position your brand for premium market visibility.',  outcomes:'Clear brand positioning\nDigital presence\nPremium market entry'},
      {icon:'⚙️', title:'Operations & SOP Systems',  description:'Build efficient, documented, repeatable processes.',     outcomes:'SOPs for every function\nReduced operational chaos\nScalable workflows'},
      {icon:'👥', title:'HR & People Development',   description:'Attract, develop and retain high-performance people.',   outcomes:'Hiring framework\nOnboarding process\nPerformance reviews'},
      {icon:'💰', title:'Finance & Business Clarity', description:'Get complete financial visibility and control.',         outcomes:'Cash flow clarity\nP&L understanding\nInvestment decisions'}
    ];
    let services = [];
    try { services = JSON.parse(localStorage.getItem('nucleus_services') || '[]'); } catch(e) {}
    if (!services.length) services = DEFAULT_SERVICES;
    servicesList.innerHTML = services.map((s, i) => {
      const altClass = i % 2 === 1 ? ' alt' : '';
      const outcomesHtml = s.outcomes
        ? `<ul class="s-outcomes">${s.outcomes.split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('')}</ul>`
        : '';
      const whoHtml = s.who
        ? `<div class="s-who"><strong>Who It's For</strong><p>${s.who}</p></div>`
        : '';
      const tagHtml = s.tag
        ? `<span style="display:inline-block;background:var(--gold-primary);color:var(--green-deep);font-family:var(--mono);font-size:10px;text-transform:uppercase;letter-spacing:.1em;padding:3px 10px;border-radius:20px;margin-bottom:16px;">${s.tag}</span><br>`
        : '';
      const num = String(i + 1).padStart(2, '0');
      const ctaLabel = s.cta || 'Book a Consult';
      return `<div class="service-block${altClass} reveal">
        <div class="content-side">
          ${tagHtml}
          <div class="s-icon"><span style="font-size:22px;">${s.icon || '🔧'}</span></div>
          <h2>${s.title || ''}</h2>
          <p style="color:var(--stone);font-size:18px;line-height:1.8;margin-top:16px;">${s.description || ''}</p>
          ${whoHtml}
          <a href="contact.html" class="btn btn-primary" style="display:inline-flex;margin-top:32px;">${ctaLabel} &nbsp;&rarr;</a>
        </div>
        <div class="visual-side" style="background:var(--warm-white);border-radius:var(--radius-xl);padding:40px;position:relative;overflow:hidden;min-height:260px;display:flex;flex-direction:column;justify-content:center;">
          <div style="font-family:var(--serif);font-size:clamp(80px,10vw,130px);color:var(--green-primary);opacity:0.06;position:absolute;top:-10px;right:16px;line-height:1;user-select:none;font-weight:900;pointer-events:none;">${num}</div>
          <p style="font-family:var(--mono);font-size:11px;text-transform:uppercase;letter-spacing:.12em;color:var(--green-primary);margin:0 0 20px;position:relative;z-index:1;">What You'll Achieve</p>
          ${outcomesHtml || `<p style="color:var(--muted);font-size:15px;line-height:1.7;position:relative;z-index:1;">Tailored to your business context — book a free diagnosis to see the measurable difference.</p>`}
        </div>
      </div>`;
    }).join('');
    servicesList.querySelectorAll('.reveal').forEach(el => {
      if (typeof window._revealObserver !== 'undefined') window._revealObserver.observe(el);
    });
  }

  // B3. Render case studies list on case-studies page
  const caseStudiesList = document.getElementById('case-studies-list');
  if (caseStudiesList) {
    const DEFAULT_CASE_STUDIES = [
      {
        client: 'Manufacturing Enterprise',
        industry: 'Manufacturing',
        duration: '18 months',
        location: 'Surat, Gujarat',
        before: 'Stagnant growth despite demand\nFounder bottleneck for all decisions\nNo SOP',
        after: 'Leadership accountability framework\nStandardized SOPs\nCulture code',
        result: '40% production efficiency increase, 80% reduction in founder dependency, predictable revenue over 18 months',
        quote: 'We finally have a team that doesn\'t need me for every small decision.',
        quote_author: 'Founder, Manufacturing Enterprise'
      },
      {
        client: 'B2B Tech Agency',
        industry: 'Tech',
        duration: '12 months',
        location: 'Ahmedabad, Gujarat',
        before: 'High employee turnover\nSales pipeline only via referrals\nNo onboarding',
        after: 'Culture redefinition\nOutbound sales system\nPerformance review process',
        result: 'Employee retention +60%, consistent monthly leads, team grew 8 → 22 in 12 months',
        quote: 'Our culture is now our biggest competitive advantage in hiring.',
        quote_author: 'Founder, B2B Tech Agency'
      },
      {
        client: 'Retail Chain (6 stores)',
        industry: 'Retail',
        duration: '9 months',
        location: 'Surat, Gujarat',
        before: 'No standardized operations\nEach store run differently\nQuality inconsistent',
        after: 'SOP documentation\nStore manager accountability system\nCustomer experience standards',
        result: '35% revenue increase across all stores; founder free from daily ops; 2 new locations opened',
        quote: 'I went from running 6 stores to owning a business that runs itself.',
        quote_author: 'Founder, Retail Chain'
      },
      {
        client: 'Professional Services Firm',
        industry: 'Professional Services',
        duration: '6 months',
        location: 'India',
        before: 'Founder doing 80% of client work\nUnable to delegate\nTeam under-skilled',
        after: 'Service delivery playbook\nTeam skills development\nClient communication standards',
        result: 'Founder reclaimed 20 hrs/week; team handles 70% of delivery; satisfaction scores up',
        quote: 'I now work ON my business, not just IN it.',
        quote_author: 'Founder, Professional Services Firm'
      }
    ];
    let caseStudies = [];
    try { caseStudies = JSON.parse(localStorage.getItem('nucleus_casestudies') || '[]'); } catch(e) {}
    if (!caseStudies.length) caseStudies = DEFAULT_CASE_STUDIES;
    caseStudiesList.innerHTML = caseStudies.map((s, idx) => {
      const client = s.client || '';
      const industry = s.industry || '';
      const duration = s.duration || '';
      const location = s.location || '';
      const image = s.image || '';
      const before = s.before || '';
      const after = s.after || '';
      const result = s.result || '';
      const quote = s.quote || '';
      const quote_author = s.quote_author || '';

      const isYT = image && (image.includes('youtube.com') || image.includes('youtu.be'));
      const isVimeo = image && image.includes('vimeo.com');
      const isVideo = image && !isYT && !isVimeo && (image.startsWith('data:video') || /\.(mp4|webm|mov)(\?|$)/i.test(image));

      let mediaContent = '';
      if (isYT) {
        const ytMatch = image.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\s?]+)/);
        if (ytMatch) {
          mediaContent = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=1&rel=0&enablejsapi=1" style="width:100%;height:100%;border:none;display:block;" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>`;
        }
      } else if (isVimeo) {
        const vmMatch = image.match(/vimeo\.com\/(\d+)/);
        if (vmMatch) {
          mediaContent = `<iframe src="https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1&muted=1&loop=1&background=1&api=1" style="width:100%;height:100%;border:none;display:block;" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>`;
        }
      } else if (isVideo) {
        mediaContent = `<video src="${image}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
      } else if (image) {
        mediaContent = `<img loading="lazy" src="${image}" alt="${client}" style="width:100%;height:100%;object-fit:cover;display:block;" />`;
      }

      const mediaHtml = mediaContent
        ? `<div style="width:100%;aspect-ratio:16/9;border-radius:16px 16px 0 0;overflow:hidden;background:#111;position:relative;margin:-40px -40px 32px -40px;width:calc(100% + 80px);">
            ${mediaContent}
            <div style="position:absolute;inset:0;background:linear-gradient(to bottom,transparent 50%,rgba(0,0,0,0.45));"></div>
            <div style="position:absolute;bottom:20px;left:28px;display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
              <span style="background:var(--gold-primary);color:var(--green-deep);padding:5px 14px;border-radius:20px;font-size:11px;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;font-weight:600;">${industry || 'Case Study'}</span>
              ${duration ? `<span style="color:rgba(255,255,255,0.9);font-size:13px;">&#9201; ${duration}</span>` : ''}
              ${location ? `<span style="color:rgba(255,255,255,0.9);font-size:13px;">&#128205; ${location}</span>` : ''}
            </div>
          </div>`
        : `<div style="display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:20px;">
            <span style="background:var(--green-primary);color:#fff;padding:5px 14px;border-radius:20px;font-size:11px;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;">${industry || 'Case Study'}</span>
            ${duration ? `<span style="color:var(--muted);font-size:14px;padding-top:4px;">&#9201; ${duration}</span>` : ''}
            ${location ? `<span style="color:var(--muted);font-size:14px;padding-top:4px;">&#128205; ${location}</span>` : ''}
          </div>`;
      return `<div class="case-card reveal" style="background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 32px rgba(0,0,0,0.09);margin-bottom:32px;overflow:hidden;">
        ${mediaHtml}
        <h3 style="font-size:clamp(22px,2.5vw,30px);margin-bottom:28px;color:var(--green-deep);">${client}</h3>
        <div class="ba-grid">
          <div style="background:#FFF0F0;padding:24px 28px;border-radius:14px;border:1px solid #FFD6D6;">
            <h4 style="color:#D32F2F;margin-bottom:14px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;font-family:var(--mono);">Before</h4>
            <ul style="list-style:none;padding:0;color:#5C1010;font-size:15px;line-height:1.75;">
              ${before.split('\n').filter(Boolean).map(t=>`<li style="display:flex;gap:10px;margin-bottom:8px;"><span style="color:#D32F2F;flex-shrink:0;font-weight:700;">✕</span>${t}</li>`).join('')}
            </ul>
          </div>
          <div style="background:#F0FFF4;padding:24px 28px;border-radius:14px;border:1px solid #C6F6D5;">
            <h4 style="color:#2F855A;margin-bottom:14px;font-size:15px;text-transform:uppercase;letter-spacing:.06em;font-family:var(--mono);">After</h4>
            <ul style="list-style:none;padding:0;color:#1C4532;font-size:15px;line-height:1.75;">
              ${after.split('\n').filter(Boolean).map(t=>`<li style="display:flex;gap:10px;margin-bottom:8px;"><span style="color:#2F855A;flex-shrink:0;font-weight:700;">✓</span>${t}</li>`).join('')}
            </ul>
          </div>
        </div>
        ${result ? `<div style="background:#FFF8E7;padding:18px 24px;border-radius:12px;border-left:4px solid var(--gold-primary,#C9A84C);margin-bottom:${quote ? '20' : '0'}px;font-size:15px;"><strong style="color:var(--green-deep);">Result:</strong> ${result}</div>` : ''}
        ${quote ? `<blockquote style="font-style:italic;font-size:17px;line-height:1.65;color:var(--charcoal);padding:18px 24px;border-left:3px solid var(--green-primary);margin:0;background:var(--warm-white);border-radius:0 10px 10px 0;">"${quote}"${quote_author ? `<footer style="margin-top:10px;font-size:13px;font-style:normal;color:var(--muted);font-family:var(--mono);letter-spacing:.06em;">— ${quote_author}</footer>` : ''}</blockquote>` : ''}
      </div>`;
    }).join('');
    // Re-observe newly added reveal elements
    caseStudiesList.querySelectorAll('.reveal').forEach(el => {
      if (typeof window._revealObserver !== 'undefined') window._revealObserver.observe(el);
    });
  }

  // B4. Render careers benefits list on careers page
  const careersBenefitsList = document.getElementById('careers-benefits-list');
  if (careersBenefitsList) {
    const DEFAULT_BENEFITS = [
      {icon:'🚀', title:'Real Responsibility', description:'You won\'t be fetching coffee. From day one, you own real projects that affect real people.'},
      {icon:'🧠', title:'Constant Growth', description:'Weekly learning sessions, mentorship, and exposure to business problems that challenge your mind.'},
      {icon:'🤝', title:'Culture of Ownership', description:'We don\'t manage. We trust. You\'ll be held to high standards and given the autonomy to meet them.'}
    ];
    let benefits = [];
    try { benefits = JSON.parse(localStorage.getItem('nucleus_careers_benefits') || '[]'); } catch(e) {}
    if (!benefits.length) benefits = DEFAULT_BENEFITS;
    careersBenefitsList.innerHTML = benefits.map(b =>
      `<div class="benefit-item reveal">
        <div class="icon-box"><span style="font-size:22px;">${b.icon}</span></div>
        <div>
          <h3>${b.title}</h3>
          <p>${b.description}</p>
        </div>
      </div>`
    ).join('');
    careersBenefitsList.querySelectorAll('.reveal').forEach(el => {
      if (typeof window._revealObserver !== 'undefined') window._revealObserver.observe(el);
    });
  }

  // B5. Render programs dynamic list on programs page
  const programsDynamicList = document.getElementById('programs-dynamic-list');
  if (programsDynamicList) {
    const DEFAULT_PROGRAMS = [
      {icon:'⭐', title:'Be Extraordinary', audience:'Business Owners & Entrepreneurs', duration:'2 Days', description:'A transformational workshop that rewires how you see yourself, your business, and your potential.', outcomes:'Clarity on life purpose\nEliminating limiting beliefs\nDesigning your extraordinary life'},
      {icon:'📊', title:'Business Excellence Program', audience:'SME Founders & CEOs', duration:'3 Months', description:'A deep-dive transformation program for businesses ready to scale with systems and culture.', outcomes:'Complete business diagnosis\nSystems & SOP creation\nCulture & accountability framework'},
      {icon:'📈', title:'Sales Mastery', audience:'Sales Teams & Founders', duration:'1 Day Workshop', description:'Build a reliable sales system that converts prospects to clients predictably.', outcomes:'Sales process design\nObjection handling mastery\nPipeline management'},
      {icon:'📣', title:'Outbound Mastery', audience:'B2B Founders & Sales Heads', duration:'1 Day Workshop', description:'Build and run a consistent outbound sales machine that generates qualified leads.', outcomes:'Cold outreach systems\nProspect identification\nFollow-up sequences'}
    ];
    let programs = [];
    try { programs = JSON.parse(localStorage.getItem('nucleus_programs') || '[]'); } catch(e) {}
    if (!programs.length) programs = DEFAULT_PROGRAMS;
    const _progThemes = ['c-dark', 'c-white', 'c-gold', 'c-cream'];
    programsDynamicList.innerHTML = programs.map((p, i) =>
      `<div class="prog-card ${_progThemes[i % _progThemes.length]} reveal">
        <div class="prog-content">
          <p style="font-size:40px;margin:0 0 16px;line-height:1;">${p.icon}</p>
          <h2 style="font-size:clamp(20px,2.5vw,26px);margin:0 0 16px;">${p.title}</h2>
          <div class="prog-meta">
            <div><span>${p.audience}</span></div>
            <div><span>&#9201; ${p.duration}</span></div>
          </div>
          <p>${p.description}</p>
          ${p.outcomes ? `<ul class="prog-outcomes">${p.outcomes.split('\n').filter(Boolean).map(o => `<li>${o}</li>`).join('')}</ul>` : ''}
          <div style="margin-top:auto;padding-top:20px;border-top:1px solid rgba(0,0,0,0.08);">
            <a href="contact.html" class="btn btn-primary" style="font-size:13px;padding:10px 24px;">Apply Now</a>
          </div>
        </div>
      </div>`
    ).join('');
    programsDynamicList.querySelectorAll('.reveal').forEach(el => {
      if (typeof window._revealObserver !== 'undefined') window._revealObserver.observe(el);
    });
  }

  // C. Load all dynamic media assets (Logo, Hero backgrounds, section cards)
  const mediaElements = document.querySelectorAll('[data-media-key]');
  for (const el of mediaElements) {
    const key = el.getAttribute('data-media-key');
    if (!key) continue;
    
    // Attempt key loading: URL first, then IndexedDB if marked, then local storage legacy base64
    let src = localStorage.getItem(key + '_url') || '';
    if (!src && window.mdbMarked && mdbMarked(key)) {
      src = await mdbLoad(key).catch(() => null);
    }
    if (!src) {
      src = localStorage.getItem(key) || '';
    }

    if (src) {
      const savedType = localStorage.getItem(key + '_type');
      const isVideo = src.startsWith('data:video/') || src.match(/\.(mp4|webm|mov)(\?.*)?$/i) || savedType === 'video';
      const isYT = src.includes('youtube.com') || src.includes('youtu.be');
      const isVimeo = src.includes('vimeo.com');

      if (el.tagName === 'IMG') {
        if (isVideo || isYT || isVimeo) {
          // If video but element is IMG, replace with a styled block container to inject iframe/video
          const container = document.createElement('div');
          container.className = el.className;
          container.style.cssText = el.style.cssText;
          container.style.position = 'relative';
          container.style.overflow = 'hidden';
          
          el.parentNode.replaceChild(container, el);
          injectVideoOrIframe(container, src, isVideo, isYT, isVimeo);
        } else {
          el.src = src;
        }
      } else if (el.tagName === 'VIDEO') {
        el.src = src;
      } else {
        // Container element (div, section, header, etc.)
        el.style.background = 'none';
        el.style.overflow = 'hidden';
        el.style.position = 'relative';
        
        if (isVideo || isYT || isVimeo) {
          injectVideoOrIframe(el, src, isVideo, isYT, isVimeo);
        } else {
          el.innerHTML = `<img src="${src}" style="width:100%;height:100%;object-fit:cover;display:block;" />`;
        }
      }
    }
  }
}

function injectVideoOrIframe(container, src, isVideo, isYT, isVimeo) {
  const svgMuted = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`;
  const svgUnmuted = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;
  const btnHtml = `<button class="universal-mute-btn" aria-label="Toggle mute" style="position:absolute;bottom:16px;right:16px;z-index:99;">${svgMuted}</button>`;

  if (isYT) {
    const ytMatch = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([^&\s?]+)/);
    if (ytMatch) {
      container.innerHTML = `<iframe src="https://www.youtube.com/embed/${ytMatch[1]}?autoplay=1&mute=1&loop=1&playlist=${ytMatch[1]}&controls=0&rel=0&enablejsapi=1" style="width:100%;height:100%;min-height:inherit;border:none;display:block;object-fit:cover;" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>` + btnHtml;
      const iframe = container.querySelector('iframe');
      const btn = container.querySelector('.universal-mute-btn');
      let isMuted = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        isMuted = !isMuted;
        iframe.contentWindow.postMessage('{"event":"command","func":"' + (isMuted ? 'mute' : 'unMute') + '","args":""}', '*');
        btn.innerHTML = isMuted ? svgMuted : svgUnmuted;
      });
    }
  } else if (isVimeo) {
    const vmMatch = src.match(/vimeo\.com\/(\d+)/);
    if (vmMatch) {
      container.innerHTML = `<iframe src="https://player.vimeo.com/video/${vmMatch[1]}?autoplay=1&muted=1&loop=1&background=1&api=1" style="width:100%;height:100%;min-height:inherit;border:none;display:block;object-fit:cover;" allow="autoplay; fullscreen" allowfullscreen loading="lazy"></iframe>` + btnHtml;
      const iframe = container.querySelector('iframe');
      const btn = container.querySelector('.universal-mute-btn');
      let isMuted = true;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        isMuted = !isMuted;
        iframe.contentWindow.postMessage('{"method":"setVolume","value":' + (isMuted ? 0 : 1) + '}', '*');
        btn.innerHTML = isMuted ? svgMuted : svgUnmuted;
      });
    }
  } else if (isVideo) {
    container.innerHTML = `<video autoplay loop muted playsinline style="width:100%;height:100%;object-fit:cover;min-height:inherit;display:block;"><source src="${src}" />Your browser does not support HTML5 video.</video>` + btnHtml;
    const video = container.querySelector('video');
    const btn = container.querySelector('.universal-mute-btn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      video.muted = !video.muted;
      btn.innerHTML = video.muted ? svgMuted : svgUnmuted;
    });
  }
}



/* ════════════════════════════════════════════════════════════
   MODERN UI COMPONENTS  ·  scroll progress + back-to-top
   Injected on every page (site.js loads sitewide).
   Respects prefers-reduced-motion for smoothness only.
   ════════════════════════════════════════════════════════════ */
(function modernUI() {
  function init() {
    // Avoid double-injection
    if (document.querySelector('.scroll-progress')) return;

    /* Scroll progress bar */
    var bar = document.createElement('div');
    bar.className = 'scroll-progress';
    bar.setAttribute('aria-hidden', 'true');
    document.body.appendChild(bar);

    /* Back-to-top button */
    var top = document.createElement('button');
    top.className = 'to-top';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 19V5M5 12l7-7 7 7"/></svg>';
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
    document.body.appendChild(top);

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var h = document.documentElement;
        var scrolled = h.scrollTop;
        var max = h.scrollHeight - h.clientHeight;
        var pct = max > 0 ? (scrolled / max) * 100 : 0;
        bar.style.width = pct + '%';
        if (scrolled > 600) top.classList.add('show');
        else top.classList.remove('show');
        ticking = false;
      });
    }
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
