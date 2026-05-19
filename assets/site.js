/* ============================================================
   Nucleus Consultant — Premium Animation Engine
   Performance-first · GPU-composited · Luxury Standard
   ============================================================ */

// --- 0. DYNAMICALLY LOAD FIREBASE & CLOUD SYNC ---
// This ensures that all HTML files (frontend + admin) get Firebase loaded
// automatically without needing to edit <head> in 10 different files.
(function loadCloudEngine() {
  const scripts = [
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js",
    "https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore-compat.js",
    "assets/firebase-config.js",
    "assets/cloud-sync.js"
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

