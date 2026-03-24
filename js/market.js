/* ============================
   MOONSTONE MARKET — Logic
   ============================ */
(() => {
  'use strict';

  // Config
  const DATA_URL = 'data/market-directory.json';
  const PER_PAGE = 12;

  // State
  let allItems = [];
  let filtered = [];
  let currentType = 'applet';
  let currentCat = 'all';
  let currentSearch = '';
  let currentSort = 'stars';
  let currentPage = 1;

  // Elements
  const grid = document.getElementById('mkt-grid');
  const empty = document.getElementById('mkt-empty');
  const filtersEl = document.getElementById('mkt-filters');
  const typeTabsEl = document.getElementById('mkt-type-tabs');
  const searchEl = document.getElementById('mkt-search');
  const sortEl = document.getElementById('mkt-sort');
  const countEl = document.getElementById('mkt-count');
  const paginationEl = document.getElementById('mkt-pagination');

  if (!grid) return;

  if (filtersEl) {
    filtersEl.addEventListener('click', handleCatClick);
  }

  // ---- Load Data ----
  async function loadData() {
    renderLoading();

    try {
      const resp = await fetch(DATA_URL);
      if (!resp.ok) throw new Error('Failed to load data');
      const data = await resp.json();

      allItems = data.map(obj => {
        obj.stars = parseInt(obj.stars, 10) || 0;
        obj.type = obj.type || 'applet';
        obj._tags = (obj.tags || '').split(',').map(t => t.trim()).filter(Boolean);
        obj._search = [obj.name, obj.description, obj.author, obj.tags, obj.category].join(' ').toLowerCase();
        return obj;
      });

      buildCategoryFilters();
      applyFilters();
    } catch (e) {
      grid.innerHTML = '<p style="color:var(--text-dim);text-align:center;padding:60px 0;">Failed to load items. Please try again later.</p>';
      console.error(e);
    }
  }

  function renderLoading() {
    empty.style.display = 'none';
    grid.style.display = '';
    grid.innerHTML = Array.from({ length: 6 }, () => `
      <article class="mkt-card mkt-card-loading" aria-hidden="true">
        <div class="mkt-card-head">
          <span class="mkt-card-icon">○</span>
          <div class="mkt-card-meta">
            <div class="mkt-skeleton mkt-skeleton-title"></div>
            <div class="mkt-skeleton mkt-skeleton-meta"></div>
          </div>
        </div>
        <div class="mkt-skeleton mkt-skeleton-line"></div>
        <div class="mkt-skeleton mkt-skeleton-line short"></div>
        <div class="mkt-card-tags">
          <span class="mkt-skeleton mkt-skeleton-tag"></span>
          <span class="mkt-skeleton mkt-skeleton-tag"></span>
        </div>
      </article>
    `).join('');
  }

  // ---- Type tabs ----
  if (typeTabsEl) {
    typeTabsEl.addEventListener('click', e => {
      const btn = e.target.closest('.mkt-type-tab');
      if (!btn) return;
      typeTabsEl.querySelectorAll('.mkt-type-tab').forEach(b => {
        b.classList.remove('active');
      });
      btn.classList.add('active');
      currentType = btn.dataset.type;
      currentCat = 'all';
      currentPage = 1;
      buildCategoryFilters();
      applyFilters();
      // Update search placeholder
      searchEl.placeholder = currentType === 'service' ? 'Search services...' : 'Search applets...';
    });
  }

  // ---- Category filters ----
  function buildCategoryFilters() {
    // Clear existing (except we rebuild fully)
    filtersEl.innerHTML = '';

    // "All" button
    const allBtn = document.createElement('button');
    allBtn.className = 'mkt-filter active';
    allBtn.dataset.cat = 'all';
    allBtn.textContent = 'All';
    filtersEl.appendChild(allBtn);

    // Get categories for current type
    const cats = [...new Set(
      allItems.filter(a => a.type === currentType).map(a => a.category)
    )].sort();

    cats.forEach(cat => {
      const btn = document.createElement('button');
      btn.className = 'mkt-filter';
      btn.dataset.cat = cat;
      btn.textContent = cat;
      filtersEl.appendChild(btn);
    });
  }

  function handleCatClick(e) {
    const btn = e.target.closest('.mkt-filter');
    if (!btn) return;
    filtersEl.querySelectorAll('.mkt-filter').forEach(b => {
      b.classList.remove('active');
    });
    btn.classList.add('active');
    currentCat = btn.dataset.cat;
    currentPage = 1;
    applyFilters();
  }

  // ---- Search ----
  let searchTimer;
  searchEl.addEventListener('input', () => {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      currentSearch = searchEl.value.trim().toLowerCase();
      currentPage = 1;
      applyFilters();
    }, 200);
  });

  // ---- Sort ----
  sortEl.addEventListener('change', () => {
    currentSort = sortEl.value;
    currentPage = 1;
    applyFilters();
  });

  // ---- Filter + Sort + Render ----
  function applyFilters() {
    filtered = allItems.filter(a => {
      if (a.type !== currentType) return false;
      if (currentCat !== 'all' && a.category !== currentCat) return false;
      if (currentSearch && !a._search.includes(currentSearch)) return false;
      return true;
    });

    filtered.sort((a, b) => {
      if (currentSort === 'stars') return b.stars - a.stars;
      if (currentSort === 'name') return a.name.localeCompare(b.name);
      if (currentSort === 'name-desc') return b.name.localeCompare(a.name);
      return 0;
    });

    const typeLabel = currentType === 'service' ? 'service' : 'applet';
    countEl.textContent = filtered.length + ' ' + typeLabel + (filtered.length !== 1 ? 's' : '');

    renderGrid();
    renderPagination();
  }

  // ---- Render grid ----
  function renderGrid() {
    const start = (currentPage - 1) * PER_PAGE;
    const pageItems = filtered.slice(start, start + PER_PAGE);

    if (pageItems.length === 0) {
      grid.innerHTML = '';
      grid.style.display = 'none';
      empty.style.display = 'flex';
      const emptyTitle = empty.querySelector('h3');
      if (emptyTitle) {
        emptyTitle.textContent = currentType === 'service' ? 'No services found' : 'No applets found';
      }
      return;
    }

    grid.style.display = '';
    empty.style.display = 'none';

    grid.innerHTML = pageItems.map(a => {
      const typeBadge = a.type === 'service'
        ? '<span class="mkt-type-badge mkt-badge-service">⚡ Service</span>'
        : '<span class="mkt-type-badge mkt-badge-applet">📊 Applet</span>';
      return `
      <article class="mkt-card">
        <div class="mkt-card-head">
          <span class="mkt-card-icon">${a.icon || '📦'}</span>
          <div class="mkt-card-meta">
            <h3 class="mkt-card-name">${esc(a.name)}</h3>
            <span class="mkt-card-author">by ${esc(a.author)}</span>
          </div>
          <span class="mkt-card-stars" title="${a.stars} stars">⭐ ${a.stars}</span>
        </div>
        <p class="mkt-card-desc">${esc(a.description)}</p>
        <div class="mkt-card-tags">${a._tags.map(t => `<span class="mkt-tag">${esc(t)}</span>`).join('')}</div>
        <div class="mkt-card-footer">
          <span class="mkt-card-cat">${esc(a.category)} ${typeBadge}</span>
          <a href="${esc(a.url)}" target="_blank" rel="noopener" class="mkt-card-link">
            View on GitHub
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M4 12L12 4M12 4H6M12 4v6" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </a>
        </div>
      </article>
    `}).join('');
  }

  // ---- Pagination ----
  function renderPagination() {
    const totalPages = Math.ceil(filtered.length / PER_PAGE);
    if (totalPages <= 1) { paginationEl.innerHTML = ''; return; }

    let html = '';
    html += `<button class="mkt-page-btn${currentPage === 1 ? ' disabled' : ''}" data-page="${currentPage - 1}" ${currentPage === 1 ? 'disabled' : ''}>← Prev</button>`;

    for (let i = 1; i <= totalPages; i++) {
      if (totalPages > 7) {
        if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
          html += `<button class="mkt-page-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
        } else if (i === currentPage - 2 || i === currentPage + 2) {
          html += `<span class="mkt-page-dots">…</span>`;
        }
      } else {
        html += `<button class="mkt-page-btn${i === currentPage ? ' active' : ''}" data-page="${i}">${i}</button>`;
      }
    }

    html += `<button class="mkt-page-btn${currentPage === totalPages ? ' disabled' : ''}" data-page="${currentPage + 1}" ${currentPage === totalPages ? 'disabled' : ''}>Next →</button>`;

    paginationEl.innerHTML = html;

    paginationEl.querySelectorAll('.mkt-page-btn:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', () => {
        currentPage = parseInt(btn.dataset.page);
        applyFilters();
        window.scrollTo({ top: grid.offsetTop - 100, behavior: 'smooth' });
      });
    });
  }

  // ---- Helpers ----
  function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
  }

  // ---- Init ----
  loadData();
})();
