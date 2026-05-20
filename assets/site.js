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

  /* ── 1. Scroll Reveals ─────────────────────────────────────── */
  const observerOptions = {
    root: null,
    rootMargin: '0px 0px -10% 0px',
    threshold: 0.1
  };

  const observer = new IntersectionObserver((entries) => {
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
        
        observer.unobserve(entry.target);
      }
    });
  }, observerOptions);

  document.querySelectorAll('.reveal, .reveal-left, .reveal-scale, [data-stagger], .stagger-list').forEach(el => {
    observer.observe(el);
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
  const burger = document.querySelector('.nav-burger');
  const navLinks = document.querySelector('.nav-links');
  
  if (burger && navLinks) {
    burger.addEventListener('click', () => {
      navLinks.classList.toggle('open');
      burger.classList.toggle('active');
    });
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
  document.querySelectorAll('[data-set]').forEach(el => {
    const key = el.getAttribute('data-set');
    if (key && !['email', 'phone', 'address', 'insta', 'linkedin', 'twitter'].includes(key)) {
      const val = localStorage.getItem(key);
      if (val !== null) el.innerHTML = val;
    }
  });

  // C1. Render nucleus_services grid on homepage
  try {
    const svcs = JSON.parse(localStorage.getItem('nucleus_services') || '[]');
    const svcGrid = document.getElementById('hp-services-grid');
    if (svcGrid && svcs.length) {
      svcGrid.innerHTML = svcs.map(s =>
        `<a href=”services.html” class=”prog prog-light” style=”min-height:auto;padding:32px;border:1px solid var(--green-pale);”>
          <div style=”font-size:28px;margin-bottom:12px;”>${s.icon || '🔧'}</div>
          <h3 style=”margin:0;font-size:20px;color:var(--green-deep);”>${s.title || ''}</h3>
          ${s.description ? `<p style=”margin:12px 0 0;color:var(--muted);font-size:15px;line-height:1.5;”>${s.description}</p>` : ''}
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
      const xSvg = `<svg width=”20” height=”20” viewBox=”0 0 24 24” fill=”none” stroke=”currentColor” stroke-width=”2” stroke-linecap=”round” stroke-linejoin=”round” style=”margin-top:4px;flex-shrink:0;”><line x1=”18” y1=”6” x2=”6” y2=”18”/><line x1=”6” y1=”6” x2=”18” y2=”18”/></svg>`;
      const chkSvg = `<svg width=”20” height=”20” viewBox=”0 0 24 24” fill=”none” stroke=”currentColor” stroke-width=”2” stroke-linecap=”round” stroke-linejoin=”round” style=”margin-top:4px;flex-shrink:0;”><polyline points=”20 6 9 17 4 12”/></svg>`;
      const beforeItems = (c.before || '').split('\n').filter(Boolean).map(t =>
        `<li style=”display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;”>${xSvg} ${t}</li>`).join('');
      const afterItems = (c.after || '').split('\n').filter(Boolean).map(t =>
        `<li style=”display:flex;gap:12px;align-items:flex-start;margin-bottom:12px;”>${chkSvg} ${t}</li>`).join('');
      csEl.innerHTML = `
        <div class=”card-hover wipe-reveal” style=”background:#FFF0F0;padding:40px;border-radius:20px;border:1px solid #FFD6D6;”>
          <h3 style=”color:#D32F2F;margin-bottom:24px;font-size:24px;”>Before:</h3>
          <ul style=”font-size:18px;line-height:2;list-style-type:none;padding:0;color:#5C1010;”>${beforeItems}</ul>
        </div>
        <div class=”card-hover wipe-reveal” style=”background:#F0FFF4;padding:40px;border-radius:20px;border:1px solid #C6F6D5;”>
          <h3 style=”color:#2F855A;margin-bottom:24px;font-size:24px;”>After:</h3>
          <ul style=”font-size:18px;line-height:2;list-style-type:none;padding:0;color:#1C4532;”>${afterItems}</ul>
          ${c.result ? `<p style=”margin-top:24px;font-weight:600;color:#2F855A;”>Result: ${c.result}</p>` : ''}
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
      if (qEl && t.quote) qEl.textContent = '”' + t.quote + '”';
      if (nEl && t.name) nEl.textContent = t.name;
      if (rEl && (t.role || t.company)) rEl.textContent = [t.role, t.company].filter(Boolean).join(', ');
    }
  } catch(e) {}


  // B2. Render services list on services page
  const servicesList = document.getElementById('services-dynamic-list');
  if (servicesList) {
    const DEFAULT_SERVICES = [
      {icon:'🧠', title:'Leadership & Thinking', description:'Transform how your leaders think and make decisions.'},
      {icon:'🤝', title:'Culture & Accountability', description:'Build a team culture of ownership and accountability.'},
      {icon:'📈', title:'Sales & Growth System', description:'Build predictable sales systems that scale.'},
      {icon:'📣', title:'Marketing & Brand Positioning', description:'Position your brand for premium market visibility.'},
      {icon:'⚙️', title:'Operations & SOP Systems', description:'Build efficient, documented, repeatable processes.'},
      {icon:'👥', title:'HR & People Development', description:'Attract, develop and retain high-performance people.'},
      {icon:'💰', title:'Finance & Business Clarity', description:'Get complete financial visibility and control.'}
    ];
    let services = [];
    try { services = JSON.parse(localStorage.getItem('nucleus_services') || '[]'); } catch(e) {}
    if (!services.length) services = DEFAULT_SERVICES;
    servicesList.innerHTML = services.map((s, i) => {
      const altClass = i % 2 === 1 ? ' alt' : '';
      const outcomesHtml = s.outcomes ? `<ul class="s-outcomes">${s.outcomes.split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('')}</ul>` : '';
      return `<div class="service-block${altClass} reveal">
        <div class="service-text">
          <p class="eyebrow">${s.icon || ''}</p>
          <h2>${s.title || ''}</h2>
          <p>${s.description || ''}</p>
          ${outcomesHtml}
        </div>
      </div>`;
    }).join('');
    // Re-observe newly added reveal elements
    servicesList.querySelectorAll('.reveal').forEach(el => {
      if (typeof observer !== 'undefined') observer.observe(el);
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
    caseStudiesList.innerHTML = caseStudies.map(s => {
      const client = s.client || '';
      const industry = s.industry || '';
      const duration = s.duration || '';
      const location = s.location || '';
      const before = s.before || '';
      const after = s.after || '';
      const result = s.result || '';
      const quote = s.quote || '';
      const quote_author = s.quote_author || '';
      return `<div class="case-card reveal" style="background:#fff;border-radius:20px;padding:40px;box-shadow:0 4px 24px rgba(0,0,0,0.08);margin-bottom:32px;">
        <div style="display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:24px;">
          <span style="background:var(--green-primary);color:#fff;padding:6px 16px;border-radius:20px;font-size:12px;font-family:var(--mono);letter-spacing:.1em;text-transform:uppercase;">${industry || 'Case Study'}</span>
          ${duration ? `<span style="color:var(--muted);font-size:14px;padding-top:6px;">&#9201; ${duration}</span>` : ''}
          ${location ? `<span style="color:var(--muted);font-size:14px;padding-top:6px;">&#128205; ${location}</span>` : ''}
        </div>
        <h3 style="font-size:28px;margin-bottom:32px;color:var(--green-deep);">${client}</h3>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px;">
          <div style="background:#FFF0F0;padding:28px;border-radius:16px;border:1px solid #FFD6D6;">
            <h4 style="color:#D32F2F;margin-bottom:16px;">Before</h4>
            <ul style="list-style:none;padding:0;color:#5C1010;font-size:16px;line-height:1.8;">
              ${before.split('\n').filter(Boolean).map(t=>`<li style="display:flex;gap:10px;margin-bottom:8px;"><span style="color:#D32F2F;flex-shrink:0;">&#x2717;</span>${t}</li>`).join('')}
            </ul>
          </div>
          <div style="background:#F0FFF4;padding:28px;border-radius:16px;border:1px solid #C6F6D5;">
            <h4 style="color:#2F855A;margin-bottom:16px;">After</h4>
            <ul style="list-style:none;padding:0;color:#1C4532;font-size:16px;line-height:1.8;">
              ${after.split('\n').filter(Boolean).map(t=>`<li style="display:flex;gap:10px;margin-bottom:8px;"><span style="color:#2F855A;flex-shrink:0;">&#x2713;</span>${t}</li>`).join('')}
            </ul>
          </div>
        </div>
        ${result ? `<div style="background:var(--gold-pale,#FFF8E7);padding:20px 28px;border-radius:12px;border-left:4px solid var(--gold-primary,#C9A84C);margin-bottom:${quote ? '24' : '0'}px;"><strong>Result:</strong> ${result}</div>` : ''}
        ${quote ? `<blockquote style="font-style:italic;font-size:18px;color:var(--charcoal);padding:20px 28px;border-left:3px solid var(--green-primary);margin:0;">"${quote}"${quote_author ? `<footer style="margin-top:8px;font-size:13px;font-style:normal;color:var(--muted);">&#8212; ${quote_author}</footer>` : ''}</blockquote>` : ''}
      </div>`;
    }).join('');
    // Re-observe newly added reveal elements
    caseStudiesList.querySelectorAll('.reveal').forEach(el => {
      if (typeof observer !== 'undefined') observer.observe(el);
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
    const ytMatch = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([^&\s?]+)/);
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

