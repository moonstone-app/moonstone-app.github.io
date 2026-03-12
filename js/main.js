/* ============================
   MOONSTONE — Main JS
   ============================ */
(() => {
  'use strict';

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
    links.querySelectorAll('a').forEach(a => a.addEventListener('click', () => links.classList.remove('open')));
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
  reveals.forEach(el => ro.observe(el));

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
  vals.forEach(el => co.observe(el));

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
      document.querySelectorAll('.showcase-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      // Update info panels
      document.querySelectorAll('.showcase-panel').forEach(p => p.classList.remove('active'));
      const panel = document.querySelector(`.showcase-panel[data-panel="${id}"]`);
      if (panel) panel.classList.add('active');
      // Update fake UI
      document.querySelectorAll('.fake-ui').forEach(u => u.classList.remove('active'));
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
      tabs.forEach(t => t.classList.remove('active'));
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
