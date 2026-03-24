/* ============================
   MOONSTONE — Main JS
   ============================ */
(() => {
  'use strict';

  // Hero A/B testing for static hosting. Variants are assigned client-side,
  // persisted in localStorage, and can be tracked by any analytics provider
  // already present on the page (Plausible, Umami, or gtag).
  const HERO_STORAGE_KEY = 'moonstone-hero-variant';
  const HERO_STATS_KEY = 'moonstone-hero-stats';
  const ATTRIBUTION_STORAGE_KEY = 'moonstone-launch-attribution';
  const pendingAnalyticsEvents = [];
  const HERO_VARIANTS = {
    a: {
      eyebrow: 'Notes-as-an-API',
      headline: 'Turn your notes vault<br><span class="shimmer-text">into a local API.</span>',
      sub: 'Point Moonstone at your existing Obsidian, Logseq, Zim, or plain markdown vault. Keep your files, keep your workflow, and get one programmable backend for APIs, applets, and automations.'
    },
    b: {
      eyebrow: 'Built for Obsidian Power Users',
      headline: 'Your vault deserves<br><span class="shimmer-text">a real API.</span>',
      sub: 'Moonstone adds a local backend to the vault you already use, so you can query it, automate it, and build tools on top without plugin gymnastics or moving your data elsewhere.'
    },
    c: {
      eyebrow: 'Local-First Notes, Programmable',
      headline: 'Keep your notes.<br><span class="shimmer-text">Query them like a backend.</span>',
      sub: 'Moonstone gives your vault one local API layer for scripts, mini-apps, and background services - without replacing your editor or locking your notes into someone else\'s system.'
    }
  };

  function getHeroVariantOverride() {
    const params = new URLSearchParams(window.location.search);
    const variant = params.get('hero');
    return HERO_VARIANTS[variant] ? variant : null;
  }

  function getStoredItem(key) {
    try {
      return window.localStorage.getItem(key);
    } catch (e) {
      return null;
    }
  }

  function setStoredItem(key, value) {
    try {
      window.localStorage.setItem(key, value);
    } catch (e) {
      // Ignore storage failures and fall back to per-page behavior.
    }
  }

  function readStoredJson(key, fallback) {
    const raw = getStoredItem(key);
    if (!raw) return fallback;

    try {
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  }

  function readAttributionParams() {
    const params = new URLSearchParams(window.location.search);
    const utmSource = params.get('utm_source');
    const utmMedium = params.get('utm_medium');
    const utmCampaign = params.get('utm_campaign');
    const utmContent = params.get('utm_content');
    const utmTerm = params.get('utm_term');

    if (!utmSource && !utmMedium && !utmCampaign && !utmContent && !utmTerm) {
      return null;
    }

    return {
      utm_source: utmSource || undefined,
      utm_medium: utmMedium || undefined,
      utm_campaign: utmCampaign || undefined,
      utm_content: utmContent || undefined,
      utm_term: utmTerm || undefined
    };
  }

  function getLaunchAttribution() {
    const current = readAttributionParams();
    if (current) {
      setStoredItem(ATTRIBUTION_STORAGE_KEY, JSON.stringify(current));
      return current;
    }

    return readStoredJson(ATTRIBUTION_STORAGE_KEY, {});
  }

  function getActiveHeroVariant() {
    return window.moonstoneHeroVariant || getStoredItem(HERO_STORAGE_KEY) || 'unknown';
  }

  function assignHeroVariant() {
    const override = getHeroVariantOverride();
    if (override) {
      setStoredItem(HERO_STORAGE_KEY, override);
      return override;
    }

    const existing = getStoredItem(HERO_STORAGE_KEY);
    if (HERO_VARIANTS[existing]) return existing;

    const variants = Object.keys(HERO_VARIANTS);
    const chosen = variants[Math.floor(Math.random() * variants.length)];
    setStoredItem(HERO_STORAGE_KEY, chosen);
    return chosen;
  }

  function bumpLocalHeroStat(eventName, variantId, meta) {
    const stats = readStoredJson(HERO_STATS_KEY, {});
    const variantStats = stats[variantId] || { hero_view: 0, hero_primary_click: 0, hero_secondary_click: 0 };
    variantStats[eventName] = (variantStats[eventName] || 0) + 1;
    variantStats.last_event = eventName;
    variantStats.last_path = window.location.pathname;
    if (meta && meta.target) variantStats.last_target = meta.target;
    stats[variantId] = variantStats;
    setStoredItem(HERO_STATS_KEY, JSON.stringify(stats));
  }

  function trackHeroEvent(eventName, variantId, meta) {
    bumpLocalHeroStat(eventName, variantId, meta);

    const payload = Object.assign({ variant: variantId }, launchAttribution, meta || {});
    if (!sendAnalyticsEvent(eventName, payload)) {
      pendingAnalyticsEvents.push({ eventName, payload });
    }
  }

  function trackSiteCta(eventName, meta) {
    const variantId = getActiveHeroVariant();
    const payload = Object.assign({ variant: variantId }, launchAttribution, meta || {});
    if (!sendAnalyticsEvent(eventName, payload)) {
      pendingAnalyticsEvents.push({ eventName, payload });
    }
  }

  function sendAnalyticsEvent(eventName, payload) {
    let sent = false;

    if (typeof window.plausible === 'function') {
      window.plausible(eventName, { props: payload });
      sent = true;
    }

    if (window.umami && typeof window.umami.track === 'function') {
      window.umami.track(eventName, payload);
      sent = true;
    }

    if (typeof window.gtag === 'function') {
      window.gtag('event', eventName, Object.assign({ hero_variant: payload.variant }, payload));
      sent = true;
    }

    return sent;
  }

  function flushPendingAnalytics() {
    if (!pendingAnalyticsEvents.length) return;

    const stillPending = [];
    pendingAnalyticsEvents.forEach(entry => {
      if (!sendAnalyticsEvent(entry.eventName, entry.payload)) {
        stillPending.push(entry);
      }
    });

    pendingAnalyticsEvents.length = 0;
    stillPending.forEach(entry => {
      pendingAnalyticsEvents.push(entry);
    });
  }

  function applyHeroVariant(variantId) {
    const variant = HERO_VARIANTS[variantId];
    if (!variant) return;

    const eyebrow = document.getElementById('hero-eyebrow');
    const headline = document.getElementById('hero-headline');
    const sub = document.getElementById('hero-sub');

    if (eyebrow) eyebrow.textContent = variant.eyebrow;
    if (headline) headline.innerHTML = variant.headline;
    if (sub) sub.textContent = variant.sub;

    document.documentElement.setAttribute('data-hero-variant', variantId);
    window.moonstoneHeroVariant = variantId;
    window.moonstoneHeroStats = () => readStoredJson(HERO_STATS_KEY, {});
  }

  const launchAttribution = getLaunchAttribution();
  const hasHeroExperiment = Boolean(document.getElementById('hero-headline') && document.getElementById('hero-sub') && document.getElementById('hero-eyebrow'));

  if (hasHeroExperiment) {
    const heroVariant = assignHeroVariant();
    applyHeroVariant(heroVariant);
    trackHeroEvent('hero_view', heroVariant);
  }

  window.addEventListener('load', flushPendingAnalytics, { once: true });
  window.setTimeout(flushPendingAnalytics, 1200);

  document.querySelectorAll('[data-hero-click]').forEach(link => {
    link.addEventListener('click', () => {
      const target = link.getAttribute('data-hero-click');
      const eventName = target === 'secondary' ? 'hero_secondary_click' : 'hero_primary_click';
      trackHeroEvent(eventName, getActiveHeroVariant(), { target });
    });
  });

  document.querySelectorAll('[data-site-cta]').forEach(link => {
    link.addEventListener('click', () => {
      const ctaType = link.getAttribute('data-site-cta');
      const location = link.getAttribute('data-cta-location') || 'unknown';
      const href = link.getAttribute('href') || '';
      const eventName = ctaType === 'github' ? 'cta_github_click' : 'cta_try_vault_click';
      trackSiteCta(eventName, { location, href });
    });
  });

  // Nav scroll effect
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('scrolled', window.scrollY > 40);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // Mobile menu
  const toggle = document.getElementById('nav-toggle');
  const links = document.getElementById('nav-links');
  if (toggle && links) {
    toggle.addEventListener('click', () => links.classList.toggle('open'));
    links.querySelectorAll('a').forEach(a => {
      a.addEventListener('click', () => links.classList.remove('open'));
    });
  }

  // Smooth scroll
  document.querySelectorAll('a[href^="#"]').forEach(a => {
    a.addEventListener('click', e => {
      const t = document.querySelector(a.getAttribute('href'));
      if (t) { e.preventDefault(); t.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  // Scroll reveal
  const reveals = document.querySelectorAll('.reveal, .reveal-stagger');
  const ro = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); ro.unobserve(e.target); } });
  }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
  reveals.forEach(el => {
    ro.observe(el);
  });

  // Moonstone parallax
  const stone = document.getElementById('moonstone');
  if (stone) {
    const hero = document.querySelector('.hero');
    hero.addEventListener('mousemove', e => {
      const r = hero.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - .5;
      const y = (e.clientY - r.top) / r.height - .5;
      stone.style.translate = `${x * 20}px ${y * 20}px`;
    });
    hero.addEventListener('mouseleave', () => {
      stone.style.translate = '0px 0px';
      stone.style.transition = 'translate .5s cubic-bezier(.4,0,.2,1)';
      setTimeout(() => stone.style.transition = '', 500);
    });
  }

  // Counter animation
  const vals = document.querySelectorAll('.ribbon-val');
  const co = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const el = e.target; co.unobserve(el);
      const final = el.textContent.trim();
      const num = parseInt(final);
      if (isNaN(num) || final === '∞') return;
      const dur = 1200, start = performance.now();
      const anim = now => {
        const p = Math.min((now - start) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = final.includes('+') ? Math.round(num * eased) + '+' : String(Math.round(num * eased));
        if (p < 1) requestAnimationFrame(anim);
      };
      el.textContent = '0';
      requestAnimationFrame(anim);
    });
  }, { threshold: 0.5 });
  vals.forEach(el => {
    co.observe(el);
  });

  // FAQ accordion
  document.querySelectorAll('.faq-q').forEach(btn => {
    btn.addEventListener('click', () => {
      const item = btn.closest('.faq-item');
      const wasOpen = item.classList.contains('open');
      // Close all
      document.querySelectorAll('.faq-item.open').forEach(i => {
        i.classList.remove('open');
        i.querySelector('.faq-q').setAttribute('aria-expanded', 'false');
      });
      // Toggle clicked
      if (!wasOpen) {
        item.classList.add('open');
        btn.setAttribute('aria-expanded', 'true');
      }
    });
  });

  // Showcase tabs (Apps & Services — browser mockup)
  const showcaseUrls = {
    visualize: 'localhost:8090/apps/graph',
    organize: 'localhost:8090/apps/kanban',
    collaborate: 'localhost:8090/apps/collab-editor',
    automate: 'localhost:8090/services/telegram',
    workspace: 'localhost:8090/workspace'
  };
  document.querySelectorAll('.showcase-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const id = tab.dataset.tab;
      // Update tabs
      document.querySelectorAll('.showcase-tab').forEach(t => {
        t.classList.remove('active');
      });
      tab.classList.add('active');
      // Update info panels
      document.querySelectorAll('.showcase-panel').forEach(p => {
        p.classList.remove('active');
      });
      const panel = document.querySelector(`.showcase-panel[data-panel="${id}"]`);
      if (panel) panel.classList.add('active');
      // Update fake UI
      document.querySelectorAll('.fake-ui').forEach(u => {
        u.classList.remove('active');
      });
      const ui = document.querySelector(`.fake-ui[data-ui="${id}"]`);
      if (ui) ui.classList.add('active');
      // Update browser URL
      const urlEl = document.getElementById('browser-url');
      if (urlEl && showcaseUrls[id]) urlEl.textContent = showcaseUrls[id];
    });
  });

  // Copy-to-clipboard for code snippets
  document.querySelectorAll('[data-copy]').forEach(card => {
    const btn = card.querySelector('.code-copy');
    const code = card.querySelector('pre code');
    if (!btn || !code) return;

    btn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(code.textContent);
        btn.classList.add('copied');
        const prev = btn.textContent;
        btn.textContent = 'Copied';
        setTimeout(() => {
          btn.textContent = prev;
          btn.classList.remove('copied');
        }, 1200);
      } catch (e) {
        console.warn('Clipboard copy failed', e);
      }
    });
  });
})();

/* ============================
   FORMAT SWITCHER (WEDGE 1)
   ============================ */
document.addEventListener('DOMContentLoaded', () => {
  const tabs = document.querySelectorAll('.switcher-tab');
  const codeDisk = document.getElementById('code-disk');
  
  if (!tabs.length || !codeDisk) return;

  const formats = {
    moonstone: `title: Welcome
tags: pkm, api
alias: moon

# Welcome
Check [[Setup Guide]] or #help.`,

    obsidian: `---
tags: [pkm, api]
aliases: [moon]
---
# Welcome
Check [[Setup Guide]] or #help.`,
    
    logseq: `tags:: pkm, api
alias:: moon
- # Welcome
	- Check [[Setup Guide]] or #help.`,

    zim: `====== Welcome ======
@pkm @api
Check [[Setup Guide]] or @help.`
  };

  // Set initial text
  codeDisk.innerHTML = `<code>${formats['moonstone'].replace(/</g, '<').replace(/>/g, '>')}</code>`;

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class
      tabs.forEach(t => {
        t.classList.remove('active');
      });
      // Add active class
      tab.classList.add('active');
      
      // Update text
      const format = tab.dataset.format;
      if (formats[format]) {
        codeDisk.innerHTML = `<code>${formats[format].replace(/</g, '<').replace(/>/g, '>')}</code>`;
      }
    });
  });
});
