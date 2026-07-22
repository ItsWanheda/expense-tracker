// =========================================================================
//  EXPENSE TRACKER — STUNNING UI v3
//  Animated counters · Sparklines · Trends · Insights · Achievements
// =========================================================================

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  //  Global error trap
  // -----------------------------------------------------------------------
  window.addEventListener('error', (e) => {
    console.error('[FATAL]', e.error || e.message);
    showFatal(`JS error: ${e.message}`);
  });
  window.addEventListener('unhandledrejection', (e) => {
    console.error('[UNHANDLED PROMISE]', e.reason);
    showFatal(`Promise error: ${e.reason?.message || e.reason}`);
    e.preventDefault();
  });

  function showFatal(msg) {
    let bar = document.getElementById('fatal-bar');
    if (!bar) {
      bar = document.createElement('div');
      bar.id = 'fatal-bar';
      bar.style.cssText = `
        position:fixed; top:0; left:0; right:0; z-index:9999;
        background:#ef4444; color:white; padding:10px 16px;
        font-family:ui-monospace,monospace; font-size:12px;
        white-space:pre-wrap; max-height:40vh; overflow:auto;
        box-shadow:0 2px 8px rgba(0,0,0,.2);`;
      document.body.appendChild(bar);
    }
    bar.textContent += (bar.textContent ? '\n' : '') + msg;
  }

  // -----------------------------------------------------------------------
  //  Helpers
  // -----------------------------------------------------------------------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const safeOn = (el, ev, fn) => {
    if (!el) { console.warn(`[safeOn] missing element for ${ev}`); return; }
    el.addEventListener(ev, fn);
  };

  function mergeDeep(target, source) {
    const out = JSON.parse(JSON.stringify(target || {}));
    for (const key of Object.keys(source || {})) {
      const sv = source[key];
      if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
        out[key] = mergeDeep(out[key] || {}, sv);
      } else { out[key] = sv; }
    }
    return out;
  }

  // Currency formatting (uses Intl, defaults to USD)
  const fmtMoney = (n, opts = {}) =>
    new Intl.NumberFormat(undefined, {
      style: 'currency', currency: opts.currency || 'USD',
      minimumFractionDigits: 2, maximumFractionDigits: 2,
    }).format(Number(n || 0));
  const fmtNum = (n) => Number(n || 0).toFixed(2);

  // -----------------------------------------------------------------------
  //  Animated number counter
  // -----------------------------------------------------------------------
  function animateCount(el, to, { duration = 900, decimals = 2, prefix = '', suffix = '' } = {}) {
    if (!el) return;
    const start = parseFloat(el.dataset.value || '0');
    const t0 = performance.now();
    const ease = (t) => 1 - Math.pow(1 - t, 3); // cubic ease-out
    el.dataset.value = String(to);
    function step(now) {
      const p = Math.min(1, (now - t0) / duration);
      const v = start + (to - start) * ease(p);
      el.textContent = prefix + v.toFixed(decimals) + suffix;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // -----------------------------------------------------------------------
  //  Skeleton helpers
  // -----------------------------------------------------------------------
  const skeleton = (lines = 4) => Array.from({ length: lines }, (_, i) =>
    `<div class="skeleton line ${i === 0 ? 'medium' : i === lines - 1 ? 'short' : ''}"></div>`
  ).join('');

  // -----------------------------------------------------------------------
  //  API client
  // -----------------------------------------------------------------------
  const API = {
    async req(path, opts = {}) {
      const res = await fetch(path, {
        headers: { 'Content-Type': 'application/json' },
        ...opts,
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      return res.status === 204 ? null : res.json();
    },
    categories: {
      list:   ()       => API.req('/api/categories'),
      create: (data)   => API.req('/api/categories',       { method: 'POST',   body: JSON.stringify(data) }),
      remove: (id)     => API.req('/api/categories/' + id, { method: 'DELETE' }),
    },
    expenses: {
      list: (params = {}) => {
        const q = new URLSearchParams(
          Object.entries(params).filter(([, v]) => v !== '' && v != null)
        ).toString();
        return API.req('/api/expenses' + (q ? '?' + q : ''));
      },
      create: (data) => API.req('/api/expenses',        { method: 'POST', body: JSON.stringify(data) }),
      update: (id, d) => API.req('/api/expenses/' + id, { method: 'PUT',  body: JSON.stringify(d) }),
      remove: (id)    => API.req('/api/expenses/' + id, { method: 'DELETE' }),
      summary: (month) => API.req('/api/reports/summary' + (month ? '?month=' + month : '')),
    },
    reports: {
      summary: (month) => API.req('/api/reports/summary' + (month ? '?month=' + month : '')),
      heatmap: (year)  => API.req('/api/reports/heatmap'  + (year  ? '?year='  + year  : '')),
    },
    budget: {
      get: (month) => API.req('/api/budget' + (month ? '?month=' + month : '')),
      set: (amount, month) =>
        API.req('/api/budget', { method: 'PUT', body: JSON.stringify({ amount, month }) }),
    },
  };

  // -----------------------------------------------------------------------
  //  Date utilities
  // -----------------------------------------------------------------------
  const today    = () => new Date().toISOString().slice(0, 10);
  const curMonth = () => new Date().toISOString().slice(0, 7);
  const curYear  = () => new Date().getFullYear();
  const escHTML  = (s) => String(s ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const todayEl = $('#today-date');
  if (todayEl) {
    todayEl.textContent = new Date().toLocaleDateString(undefined,
      { weekday: 'long', month: 'long', day: 'numeric' });
  }

  // Time-of-day greeting
  (function setGreeting() {
    const g = $('#greeting');
    if (!g) return;
    const h = new Date().getHours();
    const greet = h < 5 ? 'Working late' : h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : h < 21 ? 'Good evening' : 'Working late';
    const msgs = [
      'Track every penny, master every month.',
      'Small savings today, big dreams tomorrow.',
      'Your future self will thank you.',
      'Stay on budget, stay on track.',
    ];
    g.textContent = `${greet} · ${msgs[new Date().getDate() % msgs.length]}`;
  })();

  // -----------------------------------------------------------------------
  //  Chart.js theme integration
  // -----------------------------------------------------------------------
  const chartInstances = {};
  function chartTheme() {
    const cs = getComputedStyle(document.body);
    const pick = (v) => cs.getPropertyValue(v).trim();
    return {
      text: pick('--chart-text'), grid: pick('--chart-grid'),
      tooltipBg: pick('--chart-tooltip-bg'), tooltipFg: pick('--chart-tooltip-text'),
      legend: pick('--chart-legend'),
    };
  }
  function applyChartDefaults() {
    if (typeof Chart === 'undefined') return;
    const t = chartTheme();
    Chart.defaults.color       = t.text;
    Chart.defaults.borderColor = t.grid;
    Chart.defaults.font.family = getComputedStyle(document.body).fontFamily;
    Chart.defaults.font.weight = 500;
  }
  function createChart(canvas, config) {
    if (!canvas || typeof Chart === 'undefined') return null;
    if (chartInstances[canvas.id]) {
      try { chartInstances[canvas.id].destroy(); } catch (_) {}
      delete chartInstances[canvas.id];
    }
    const t = chartTheme();
    const themed = mergeDeep(config, {
      options: {
        animation: { duration: 800, easing: 'easeOutCubic' },
        plugins: {
          legend: { labels: { color: t.legend, font: { weight: 600 } } },
          tooltip: {
            backgroundColor: t.tooltipBg, titleColor: t.tooltipFg,
            bodyColor: t.tooltipFg, borderColor: t.grid, borderWidth: 1,
            padding: 12, cornerRadius: 8, displayColors: true,
            titleFont: { weight: 700 }, bodyFont: { weight: 500 },
          },
        },
        scales: config.options?.scales ? {
          x: { ticks: { color: t.text, font: { weight: 500 } }, grid: { color: t.grid, drawBorder: false } },
          y: { ticks: { color: t.text, font: { weight: 500 } }, grid: { color: t.grid, drawBorder: false } },
        } : undefined,
      },
    });
    const chart = new Chart(canvas, themed);
    chartInstances[canvas.id] = chart;
    return chart;
  }
  function updateChartsTheme() {
    const t = chartTheme();
    for (const chart of Object.values(chartInstances)) {
      if (!chart || !chart.options) continue;
      const o = chart.options;
      if (o.plugins?.legend?.labels) o.plugins.legend.labels.color = t.legend;
      if (o.plugins?.tooltip) {
        o.plugins.tooltip.backgroundColor = t.tooltipBg;
        o.plugins.tooltip.titleColor      = t.tooltipFg;
        o.plugins.tooltip.bodyColor       = t.tooltipFg;
        o.plugins.tooltip.borderColor     = t.grid;
      }
      ['x', 'y'].forEach((k) => {
        if (o.scales?.[k]) {
          if (o.scales[k].ticks) o.scales[k].ticks.color = t.text;
          if (o.scales[k].grid)  o.scales[k].grid.color  = t.grid;
        }
      });
      chart.update('none');
    }
  }

  // -----------------------------------------------------------------------
  //  Mobile menu
  // -----------------------------------------------------------------------
  (function initMobileMenu() {
    const toggle = $('#menu-toggle'), sidebar = $('.sidebar'), overlay = $('#sidebar-overlay');
    if (!toggle || !sidebar) return;
    const open  = () => { sidebar.classList.add('open'); overlay?.classList.add('show'); document.body.style.overflow = 'hidden'; };
    const close = () => { sidebar.classList.remove('open'); overlay?.classList.remove('show'); document.body.style.overflow = ''; };
    safeOn(toggle, 'click', open);
    safeOn(overlay, 'click', close);
    window.__closeSidebar = close;
  })();

  // -----------------------------------------------------------------------
  //  Theme toggle
  // -----------------------------------------------------------------------
  (function initTheme() {
    const btn = $('#theme-toggle');
    if (!btn) return;
    const isDark = document.documentElement.classList.contains('theme-dark');
    document.body.classList.toggle('theme-dark', isDark);
    btn.textContent = isDark ? '☀️' : '🌙';
    btn.addEventListener('click', () => {
      const next = document.body.classList.toggle('theme-dark');
      document.documentElement.classList.toggle('theme-dark', next);
      btn.textContent = next ? '☀️' : '🌙';
      try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch (_) {}
      applyChartDefaults();
      updateChartsTheme();
    });
  })();

  // -----------------------------------------------------------------------
  //  Toast (with type, icon, optional action)
  // -----------------------------------------------------------------------
  const toastIcons = { success: '✓', error: '✕', warning: '⚠', info: 'ℹ' };
  function toast(message, type = 'success', action = null) {
    const c = $('#toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    const icon = toastIcons[type] || toastIcons.success;
    if (action) {
      t.innerHTML = `
        <span class="toast-icon">${icon}</span>
        <span class="toast-body">${escHTML(message)}</span>
        <button class="toast-action">${escHTML(action.label)}</button>`;
      t.querySelector('.toast-action').addEventListener('click', () => {
        Promise.resolve(action.onClick()).catch((err) => toast(err.message, 'error'));
        t.remove();
      });
    } else {
      t.innerHTML = `<span class="toast-icon">${icon}</span><span class="toast-body">${escHTML(message)}</span>`;
    }
    c.appendChild(t);
    setTimeout(() => {
      t.style.opacity = '0';
      t.style.transform = 'translateX(120%)';
      setTimeout(() => t.remove(), 250);
    }, action ? 5500 : 2800);
  }

  // -----------------------------------------------------------------------
  //  Modal
  // -----------------------------------------------------------------------
  function openModal({ title, body, onSubmit, submitText = 'Save' }) {
    const root = $('#modal-root');
    if (!root) return;
    root.innerHTML = `
      <div class="modal-overlay">
        <form class="modal">
          <h3>${escHTML(title)}</h3>
          <div class="modal-body">${body || ''}</div>
          <div class="modal-actions">
            <button type="button" class="btn" data-close>Cancel</button>
            <button type="submit" class="btn btn-primary">${escHTML(submitText)}</button>
          </div>
        </form>
      </div>`;
    const overlay = $('.modal-overlay', root);
    const form = $('.modal', root);
    const close = () => { root.innerHTML = ''; };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    safeOn($('.modal [data-close]', root), 'click', close);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try { await onSubmit(data); close(); }
      catch (err) { toast(err.message || String(err), 'error'); }
    });
    setTimeout(() => {
      const first = form.querySelector('input, select, textarea, button');
      if (first) first.focus();
    }, 50);
  }

  // -----------------------------------------------------------------------
  //  State + router
  // -----------------------------------------------------------------------
  const VIEWS = ['dashboard', 'expenses', 'categories', 'reports', 'budget'];
  const state = {
    categories: [],
    selectedMonth: curMonth(),
    recentCategories: [],   // most-used category ids (for quick add)
    streak: 0,
  };
  let currentView = 'dashboard';

  function navigate(view) {
    if (!VIEWS.includes(view)) view = 'dashboard';
    currentView = view;
    VIEWS.forEach((v) => {
      const sec = $('#view-' + v);
      const lnk = $(`.nav-link[data-view="${v}"]`);
      if (sec) sec.classList.toggle('active', v === view);
      if (lnk) lnk.classList.toggle('active', v === view);
    });
    const titleEl = $('#page-title');
    if (titleEl) titleEl.textContent = view.charAt(0).toUpperCase() + view.slice(1);

    Object.keys(chartInstances).forEach((id) => {
      if (!document.getElementById(id)) {
        try { chartInstances[id].destroy(); } catch (_) {}
        delete chartInstances[id];
      }
    });
    window.__closeSidebar?.();
    const renderer = renderers[view];
    if (renderer) {
      try {
        const result = renderer();
        if (result && typeof result.catch === 'function') {
          result.catch((err) => console.error(`[renderer:${view}]`, err));
        }
      } catch (err) { console.error(`[renderer:${view}] sync error`, err); }
    }
    if (location.hash.slice(1) !== view) history.replaceState(null, '', '#' + view);
  }

  $$('.nav-link').forEach((el) => safeOn(el, 'click', (e) => {
    e.preventDefault(); navigate(el.dataset.view);
  }));
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));

  // -----------------------------------------------------------------------
  //  Shared helpers
  // -----------------------------------------------------------------------
  function renderExpenseTable(expenses, { onEdit, onDelete } = {}) {
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return `<div class="empty">
        <div class="icon">📭</div>
        <h3>No expenses yet</h3>
        <p>Click <kbd>N</kbd> or the + button to add your first one.</p>
      </div>`;
    }
    return `
      <div class="table-wrap">
        <table class="table">
          <thead>
            <tr>
              <th>Date</th><th>Category</th><th>Description</th>
              <th class="numeric">Amount</th><th></th>
            </tr>
          </thead>
          <tbody>
            ${expenses.map((e) => `
              <tr>
                <td>${escHTML(e.date)}</td>
                <td>${e.category_name
                  ? `<span class="category-pill"><span class="category-dot" style="background:${escHTML(e.category_color || 'var(--primary)')}"></span>${escHTML(e.category_name)}</span>`
                  : '<span class="muted">—</span>'}</td>
                <td>${escHTML(e.description)}</td>
                <td class="numeric"><strong>${fmtMoney(e.amount)}</strong></td>
                <td><div class="row-actions">
                  ${onEdit   ? '<button class="btn btn-sm act-edit">Edit</button>' : ''}
                  ${onDelete ? '<button class="btn btn-sm btn-danger act-del">Delete</button>' : ''}
                </div></td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  }

  function bindTableActions(container, expenses, { onEdit, onDelete }) {
    const rows = container.querySelectorAll('tbody tr');
    rows.forEach((tr, idx) => {
      const exp = expenses[idx];
      const editBtn = tr.querySelector('.act-edit');
      const delBtn  = tr.querySelector('.act-del');
      if (editBtn && onEdit)   editBtn.addEventListener('click', () => onEdit(exp));
      if (delBtn  && onDelete) delBtn.addEventListener('click',  () => onDelete(exp));
    });
  }

  function openExpenseModal(expense, onSaved, presetCategoryId = null) {
    const isEdit = !!expense;
    openModal({
      title: isEdit ? `Edit Expense #${expense.id}` : 'New Expense',
      body: `
        <div class="form-row">
          <label>Amount</label>
          <input type="number" name="amount" step="0.01" min="0.01" required value="${expense?.amount ?? ''}" autofocus>
        </div>
        <div class="form-row">
          <label>Description</label>
          <input name="description" required value="${escHTML(expense?.description ?? '')}">
        </div>
        <div class="form-grid">
          <div class="form-row">
            <label>Date</label>
            <input type="date" name="date" required value="${expense?.date || today()}">
          </div>
          <div class="form-row">
            <label>Category</label>
            <select name="category_id">
              <option value="">— None —</option>
              ${(state.categories || []).map((c) =>
                `<option value="${c.id}" ${(expense?.category_id == c.id || (!expense && presetCategoryId == c.id)) ? 'selected' : ''}>${escHTML(c.name)}</option>`
              ).join('')}
            </select>
          </div>
        </div>`,
      onSubmit: async (data) => {
        if (isEdit) { await API.expenses.update(expense.id, data); toast('Expense updated', 'success'); }
        else        { await API.expenses.create(data); toast('Expense added', 'success'); }
        trackRecentCategory(parseInt(data.category_id) || null);
        onSaved?.();
      },
    });
  }

  async function refreshCategories() {
    try { state.categories = await API.categories.list(); }
    catch (err) { console.error('[refreshCategories]', err); state.categories = []; }
  }

  // Track most-used categories for quick add
  function trackRecentCategory(id) {
    if (!id) return;
    state.recentCategories = [id, ...state.recentCategories.filter((x) => x !== id)].slice(0, 6);
    try { localStorage.setItem('recentCats', JSON.stringify(state.recentCategories)); } catch (_) {}
  }
  try { state.recentCategories = JSON.parse(localStorage.getItem('recentCats') || '[]'); } catch (_) {}

  // -----------------------------------------------------------------------
  //  Heatmap builder
  // -----------------------------------------------------------------------
  function buildHeatmap(year, byDay) {
    try {
      const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      const dayLabels = ['', 'Mon', '', 'Wed', '', 'Fri', ''];
      const jan1 = new Date(year, 0, 1);
      const firstMonday = new Date(jan1);
      firstMonday.setDate(firstMonday.getDate() - ((jan1.getDay() + 6) % 7));
      const dec31 = new Date(year, 11, 31);
      const values = Object.values(byDay);
      const maxAmount = values.length ? Math.max(...values) : 0;

      const weeks = [];
      const cursor = new Date(firstMonday);
      let safety = 0;
      while (safety++ < 60) {
        const week = [];
        for (let d = 0; d < 7; d++) { week.push(new Date(cursor)); cursor.setDate(cursor.getDate() + 1); }
        weeks.push(week);
        if (week[week.length - 1] > dec31) break;
      }

      const cellsHTML = weeks.map((w) =>
        w.map((d) => {
          const inYear = d.getFullYear() === year;
          const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const v = inYear ? (byDay[ds] || 0) : 0;
          let lvl = 0;
          if (inYear && v > 0 && maxAmount > 0) {
            const r = v / maxAmount;
            if (r >= 0.75) lvl = 4; else if (r >= 0.50) lvl = 3; else if (r >= 0.25) lvl = 2; else lvl = 1;
          }
          const titleAttr = inYear ? ` title="${ds}: ${fmtMoney(v)}"` : '';
          return `<div class="heat-cell lvl-${lvl}"${titleAttr}></div>`;
        }).join('')
      ).join('');

      const monthHeaderHTML = MONTHS.map((m, i) => {
        let weekIdx = -1;
        for (let w = 0; w < weeks.length; w++) {
          for (let d = 0; d < 7; d++) {
            const dd = weeks[w][d];
            if (dd.getFullYear() === year && dd.getMonth() === i) { weekIdx = w; break; }
          }
          if (weekIdx !== -1) break;
        }
        return weekIdx === -1 ? '' :
          `<span class="heat-month-tick" style="grid-column-start:${weekIdx + 1}">${m}</span>`;
      }).join('');

      const dayLabelsHTML = dayLabels.map((d) => `<div class="heat-day-label">${d}</div>`).join('');

      return `
        <div class="heatmap-wrap">
          <div class="heat-month-row">${monthHeaderHTML}</div>
          <div class="heatmap-body">
            <div class="heat-day-col">${dayLabelsHTML}</div>
            <div class="heatmap-grid">${cellsHTML}</div>
          </div>
          <div class="heat-legend">
            <span>Less</span>
            <div class="heat-cell lvl-0"></div>
            <div class="heat-cell lvl-1"></div>
            <div class="heat-cell lvl-2"></div>
            <div class="heat-cell lvl-3"></div>
            <div class="heat-cell lvl-4"></div>
            <span>More</span>
          </div>
        </div>`;
    } catch (err) {
      return `<div class="empty">Heatmap failed: ${escHTML(err.message)}</div>`;
    }
  }

  // -----------------------------------------------------------------------
  //  View renderers
  // -----------------------------------------------------------------------
  const renderers = {

    // ---------- DASHBOARD ----------
    async dashboard() {
      const root = $('#view-dashboard');
      if (!root) return;
      root.innerHTML = `
        <div class="card" style="margin-bottom:18px">
          <div class="toolbar">
            <label>Month:</label>
            <input type="month" id="dash-month" value="${state.selectedMonth}">
            <div class="spacer"></div>
            <button class="btn btn-sm" id="refresh-dash">↻ Refresh</button>
          </div>
        </div>
        <div id="dash-content"><div class="card">${skeleton(3)}</div></div>`;

      const load = async () => {
        const content = $('#dash-content');
        if (!content) return;
        state.selectedMonth = $('#dash-month')?.value || curMonth();
        content.innerHTML = `
          <div class="stat-grid">
            ${Array(3).fill('<div class="skeleton stat"></div>').join('')}
          </div>
          <div class="card">${skeleton(4)}</div>`;

        try {
          const [summary, recent, prevSummary, heatData, allRecent] = await Promise.all([
            API.reports.summary(state.selectedMonth),
            API.expenses.list({ limit: 8 }),
            API.reports.summary(prevMonth(state.selectedMonth)).catch(() => null),
            API.reports.heatmap(curYear()).catch(() => ({ expenses: [] })),
            API.expenses.list({ limit: 30 }).catch(() => []),
          ]);

          // Trend vs previous month
          const trend = prevSummary ? calcTrend(summary.total, prevSummary.total) : null;

          // Daily totals for sparkline (last 14 days)

          // Streak (consecutive days with at least 1 expense in last 30 days)
          const streak = computeStreak(allRecent);
          state.streak = streak;
          const streakEl = $('#streak-count');
          if (streakEl) animateCount(streakEl, streak, { decimals: 0, duration: 700 });

          // Top category
          const top = Array.isArray(summary.by_category) && summary.by_category;

          // Category spend totals (for recent categories)
          const catTotals = {};
          (summary.by_category || []).forEach((c) => { catTotals[c.category_id] = c.total; });

          const budgetPct = summary.budget ? (summary.total / summary.budget) * 100 : 0;
          const budgetCls = budgetPct > 100 ? 'over' : budgetPct > 80 ? 'warning' : '';
          const dailyAllowance = computeDailyAllowance(summary);

          // Insight banner
          const insight = makeInsight(summary, prevSummary, trend, streak, top);

          content.innerHTML = `
            ${insight}
            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-icon">💸</div>
                <div class="stat-label">Total — ${escHTML(summary.month)}</div>
                <div class="stat-value" data-count="${summary.total}">${fmtMoney(0)}</div>
                ${trend ? `
                  <div class="stat-sub">
                    <span class="trend ${trend.dir}">${trend.arrow} ${Math.abs(trend.pct).toFixed(1)}%</span>
                    <span>vs last month</span>
                  </div>` : '<div class="stat-sub">First month tracked</div>'}
              </div>

              <div class="stat-card ${summary.budget_remaining < 0 ? 'danger' : 'success'}">
                <div class="stat-icon">${summary.budget_remaining < 0 ? '⚠️' : '🎯'}</div>
                <div class="stat-label">Budget remaining</div>
                <div class="stat-value">${summary.budget ? fmtMoney(summary.budget_remaining) : '—'}</div>
                ${summary.budget ? `
                  <div class="progress"><div class="progress-bar ${budgetCls}" style="width:${Math.min(budgetPct, 100)}%"></div></div>
                  <div class="stat-sub">${budgetPct.toFixed(0)}% of ${fmtMoney(summary.budget)} used</div>`
                : '<div class="stat-sub">No budget set · <a href="#budget" onclick="setTimeout(()=>location.hash=\'budget\',10)">Set one →</a></div>'}
              </div>

              <div class="stat-card warning">
                <div class="stat-icon">🏆</div>
                <div class="stat-label">Top category</div>
                <div class="stat-value" style="font-size:20px">${top ? escHTML(top.category) : '—'}</div>
                <div class="stat-sub">${top ? `${fmtMoney(top.total)} · ${summary.total ? ((top.total/summary.total)*100).toFixed(0) : 0}% of total` : 'No spending yet'}</div>
              </div>

              <div class="stat-card info">
                <div class="stat-icon">📅</div>
                <div class="stat-label">Daily allowance</div>
                <div class="stat-value">${dailyAllowance.value}</div>
                <div class="stat-sub">${dailyAllowance.sub}</div>
              </div>
            </div>

            <div class="charts-grid">
              <div class="card">
                <div class="card-title">📊 Category breakdown</div>
                <div class="chart-host"><canvas id="dash-bar"></canvas></div>
              </div>
              <div class="card">
                <div class="card-title">🍩 Distribution</div>
                <div class="chart-host"><canvas id="dash-pie"></canvas></div>
              </div>
            </div>

            <div class="card">
              <div class="card-title">🕒 Recent expenses</div>
              ${renderExpenseTable(recent)}
            </div>

            <div class="card">
              <div class="card-title">🔥 Spending heatmap — ${curYear()}</div>
              ${buildHeatmap(curYear(), (() => {
                const byDay = {};
                (heatData.expenses || []).forEach((e) => { byDay[e.date] = (byDay[e.date] || 0) + e.amount; });
                return byDay;
              })())}
            </div>
          `;

          // Animate counters
          $$('.stat-value[data-count]').forEach((el) => {
            animateCount(el, parseFloat(el.dataset.count), { duration: 900 });
          });

          // Render charts
          if (typeof Chart !== 'undefined' && summary.by_category.length) {
            const palette = makePalette(summary.by_category.length);
            const labels = summary.by_category.map((c) => c.category);
            const values = summary.by_category.map((c) => c.total);
            createChart($('#dash-bar'), {
              type: 'bar',
              data: { labels, datasets: [{ label: 'Amount', data: values, backgroundColor: palette, borderRadius: 6, borderSkipped: false }] },
              options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ' ' + fmtMoney(ctx.parsed.x) } } },
                scales: { x: { ticks: { callback: (v) => '$' + v } } },
              },
            });
            createChart($('#dash-pie'), {
              type: 'doughnut',
              data: { labels, datasets: [{ data: values, backgroundColor: palette, borderWidth: 3, borderColor: getComputedStyle(document.body).getPropertyValue('--card-solid').trim() }] },
              options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { padding: 12, boxWidth: 10 } } },
                cutout: '65%',
              },
            });
          }
        } catch (err) {
          console.error('[dashboard]', err);
          content.innerHTML = `<div class="card"><div class="empty">
            <div class="icon">⚠️</div><h3>Couldn't load dashboard</h3><p>${escHTML(err.message)}</p>
          </div></div>`;
        }
      };

      safeOn($('#dash-month'), 'change', load);
      safeOn($('#refresh-dash'), 'click', () => { toast('Refreshing…', 'info'); load(); });
      load();
    },

    // ---------- EXPENSES ----------
    async expenses() {
      const root = $('#view-expenses');
      if (!root) return;
      root.innerHTML = `
        <div class="card">
          <div class="toolbar">
            <input type="search" id="search-q" placeholder="🔍 Search…" style="min-width:260px">
          </div>
          <div class="quick-filters">
            <button class="chip" data-range="7">Last 7 days</button>
            <button class="chip" data-range="30">Last 30 days</button>
            <button class="chip" data-range="month">This month</button>
            <button class="chip" data-range="last-month">Last month</button>
            <button class="chip active" data-range="all">All time</button>
            <span class="spacer"></span>
            <input type="date" id="filter-from" title="From">
            <input type="date" id="filter-to"   title="To">
            <select id="filter-cat"><option value="">All categories</option></select>
            <button class="btn btn-primary" id="add-expense">+ Add</button>
          </div>

          <!-- Quick category pills -->
          <div id="quick-cats" class="quick-filters" style="margin-top:8px"></div>

          <div id="expense-list">${skeleton(6)}</div>
        </div>`;

      await refreshCategories();
      const filterCat = $('#filter-cat');
      if (filterCat) {
        filterCat.innerHTML = '<option value="">All categories</option>' +
          state.categories.map((c) =>
            `<option value="${c.id}">${escHTML(c.name)}</option>`).join('');
      }
      renderQuickCats();

      const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };

      const load = async () => {
        const list = $('#expense-list');
        if (!list) return;
        const params = {};
        const q   = $('#search-q')?.value.trim();
        const from = $('#filter-from')?.value;
        const to   = $('#filter-to')?.value;
        const cat  = $('#filter-cat')?.value;
        if (q)    params.q = q;
        if (from) params.from = from;
        if (to)   params.to   = to;
        if (cat)  params.category_id = cat;

        list.innerHTML = `<div class="card">${skeleton(6)}</div>`;
        try {
          const expenses = await API.expenses.list(params);
          list.innerHTML = renderExpenseTable(expenses, { onEdit: true, onDelete: true });
          bindTableActions(list, expenses, {
            onEdit: (e) => openExpenseModal(e, load),
            onDelete: async (e) => {
              const snapshot = { ...e };
              try {
                await API.expenses.remove(e.id);
                load();
                toast(`Deleted "${e.description}"`, 'success', {
                  label: 'Undo',
                  onClick: async () => {
                    try {
                      await API.expenses.create({
                        amount: snapshot.amount, description: snapshot.description,
                        date: snapshot.date, category_id: snapshot.category_id,
                      });
                      toast('Restored', 'success');
                      load();
                    } catch (err) { toast(err.message, 'error'); }
                  },
                });
              } catch (err) { toast(err.message, 'error'); }
            },
          });
        } catch (err) {
          list.innerHTML = `<div class="empty"><div class="icon">⚠️</div><h3>${escHTML(err.message)}</h3></div>`;
        }
      };

      $$('.chip').forEach((c) => safeOn(c, 'click', () => {
        $$('.chip').forEach((x) => x.classList.remove('active'));
        c.classList.add('active');
        const fromEl = $('#filter-from'), toEl = $('#filter-to');
        if (!fromEl || !toEl) return;
        const r = c.dataset.range;
        if      (r === '7')   { fromEl.value = daysAgo(7);  toEl.value = today(); }
        else if (r === '30')  { fromEl.value = daysAgo(30); toEl.value = today(); }
        else if (r === 'month') {
          const d = new Date();
          fromEl.value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
          toEl.value   = today();
        }
        else if (r === 'last-month') {
          const d = new Date(); d.setMonth(d.getMonth() - 1);
          const y = d.getFullYear(), m = d.getMonth();
          const lastDay = new Date(y, m+1, 0).getDate();
          fromEl.value = `${y}-${String(m+1).padStart(2,'0')}-01`;
          toEl.value   = `${y}-${String(m+1).padStart(2,'0')}-${lastDay}`;
        }
        else { fromEl.value = ''; toEl.value = ''; }
        load();
      }));

      let searchTimer;
      safeOn($('#search-q'), 'input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(load, 250); });
      safeOn($('#filter-from'), 'change', load);
      safeOn($('#filter-to'),   'change', load);
      safeOn($('#filter-cat'),  'change', load);

      safeOn($('#add-expense'), 'click', async () => {
        if (!state.categories.length) await refreshCategories();
        openExpenseModal(null, () => { load(); renderQuickCats(); });
      });
      load();
    },

    // ---------- CATEGORIES ----------
    async categories() {
      const root = $('#view-categories');
      if (!root) return;
      await refreshCategories();
      root.innerHTML = `
        <div class="card">
          <div class="toolbar">
            <input type="search" id="cat-search" placeholder="🔍 Search categories…" style="min-width:240px">
            <div class="spacer"></div>
            <span class="muted">${state.categories.length} categories</span>
            <button class="btn btn-primary" id="add-cat">+ Add category</button>
          </div>
          <div class="cat-grid" id="cat-grid">${skeleton(6)}</div>
        </div>`;

      const render = async () => {
        const grid = $('#cat-grid');
        if (!grid) return;
        const filter = $('#cat-search')?.value.toLowerCase().trim() || '';
        const filtered = state.categories.filter((c) => c.name.toLowerCase().includes(filter));
        if (!filtered.length) {
          grid.innerHTML = `<div class="empty" style="grid-column:1/-1">
            <div class="icon">🏷️</div><h3>${state.categories.length ? 'No matches' : 'No categories yet'}</h3>
            <p>${state.categories.length ? 'Try a different search term.' : 'Create one to organize your expenses.'}</p>
          </div>`;
          return;
        }
        // Optionally enrich with month spend
        let monthSpend = {};
        try {
          const summary = await API.reports.summary(state.selectedMonth);
          (summary.by_category || []).forEach((c) => { monthSpend[c.category_id] = c.total; });
        } catch (_) {}

        grid.innerHTML = filtered.map((c) => `
          <div class="cat-card" style="--cat-color:${escHTML(c.color)}">
            <div style="min-width:0;flex:1">
              <div class="name">
                <span class="category-dot" style="background:${escHTML(c.color)}"></span>
                ${escHTML(c.name)}
              </div>
              ${monthSpend[c.id] != null ? `<div class="cat-total">${fmtMoney(monthSpend[c.id])} this month</div>` : ''}
            </div>
            <button class="btn btn-sm btn-icon" data-id="${c.id}" data-act="edit" title="Edit">✏️</button>
            <button class="btn btn-sm btn-icon btn-danger" data-id="${c.id}" data-act="del" title="Delete">🗑️</button>
          </div>`).join('');

        $$('[data-id]', grid).forEach((b) => safeOn(b, 'click', async () => {
          const id = b.dataset.id, act = b.dataset.act;
          const cat = state.categories.find((x) => x.id == id);
          if (!cat) return;
          if (act === 'del') {
            if (!confirm(`Delete category "${cat.name}"?`)) return;
            try { await API.categories.remove(id); toast('Category deleted', 'success'); renderers.categories(); }
            catch (err) { toast(err.message, 'error'); }
          } else if (act === 'edit') {
            openModal({
              title: 'Edit category',
              body: `
                <div class="form-row"><label>Name</label><input name="name" required value="${escHTML(cat.name)}"></div>
                <div class="form-row"><label>Color</label><input type="color" name="color" value="${escHTML(cat.color)}" class="color-input"></div>`,
              onSubmit: async (data) => {
                await API.categories.update?.(id, data) ?? API.req('/api/categories/' + id, { method: 'PUT', body: JSON.stringify(data) });
                toast('Category updated', 'success');
                renderers.categories();
              },
            });
          }
        }));
      };

      safeOn($('#cat-search'), 'input', render);
      safeOn($('#add-cat'), 'click', () =>
        openModal({
          title: 'New category',
          body: `
            <div class="form-row"><label>Name</label><input name="name" required autofocus></div>
            <div class="form-row"><label>Color</label>
              <input type="color" name="color" value="#6366f1" class="color-input"></div>
            <div class="muted" style="font-size:11px">Pick a color that represents this category.</div>`,
          onSubmit: async (data) => {
            await API.categories.create(data);
            toast('Category created', 'success');
            renderers.categories();
          },
        })
      );
      render();
    },

    // ---------- REPORTS ----------
    async reports() {
      const root = $('#view-reports');
      if (!root) return;
      root.innerHTML = `
        <div class="card">
          <div class="toolbar">
            <label>Month:</label>
            <input type="month" id="report-month" value="${state.selectedMonth}">
            <button class="btn btn-primary" id="load-report">Load</button>
            <div class="spacer"></div>
            <button class="btn btn-sm" id="export-png">📷 Export chart</button>
          </div>
          <div id="report-content">${skeleton(4)}</div>
        </div>`;

      const load = async () => {
        const content = $('#report-content');
        if (!content) return;
        state.selectedMonth = $('#report-month')?.value || curMonth();
        content.innerHTML = `<div class="card">${skeleton(5)}</div>`;
        try {
          const r = await API.reports.summary(state.selectedMonth);
          if (!r.by_category.length) {
            content.innerHTML = `<div class="empty">
              <div class="icon">📭</div><h3>No expenses this month</h3>
              <p>Start tracking to see beautiful reports.</p>
            </div>`;
            return;
          }

          // Build a "daily spend" mini-line chart
          const dailyRes = await API.expenses.list({ from: state.selectedMonth + '-01', to: today().slice(0,7) === state.selectedMonth ? today() : state.selectedMonth + '-31', limit: 500 }).catch(() => []);
          const byDay = {};
          dailyRes.forEach((e) => { byDay[e.date] = (byDay[e.date] || 0) + e.amount; });
          const days = Object.keys(byDay).sort();
          const dayValues = days.map((d) => byDay[d]);
          const cumulative = [];
          let running = 0;
          dayValues.forEach((v) => { running += v; cumulative.push(running); });

          const palette = makePalette(r.by_category.length);
          const labels = r.by_category.map((c) => c.category);
          const values = r.by_category.map((c) => c.total);

          content.innerHTML = `
            <div class="stat-grid">
              <div class="stat-card">
                <div class="stat-icon">💰</div>
                <div class="stat-label">Total</div>
                <div class="stat-value" data-count="${r.total}">${fmtMoney(0)}</div>
                <div class="stat-sub">${r.count} expenses</div>
              </div>
              <div class="stat-card info">
                <div class="stat-icon">📊</div>
                <div class="stat-label">Avg per expense</div>
                <div class="stat-value">${fmtMoney(r.total / Math.max(r.count, 1))}</div>
              </div>
              <div class="stat-card warning">
                <div class="stat-icon">🗓️</div>
                <div class="stat-label">Daily average</div>
                <div class="stat-value">${fmtMoney(r.total / Math.max(new Date().getDate(), 1))}</div>
              </div>
              <div class="stat-card success">
                <div class="stat-icon">🏷️</div>
                <div class="stat-label">Categories used</div>
                <div class="stat-value">${r.by_category.length}</div>
              </div>
            </div>

            <div class="charts-grid">
              <div class="card">
                <div class="card-title">Spending by category</div>
                <div class="chart-host"><canvas id="bar-chart"></canvas></div>
              </div>
              <div class="card">
                <div class="card-title">Distribution</div>
                <div class="chart-host"><canvas id="pie-chart"></canvas></div>
              </div>
            </div>

            <div class="card" style="margin-top:20px">
              <div class="card-title">📈 Cumulative spending</div>
              <div class="chart-host"><canvas id="line-chart"></canvas></div>
            </div>

            <div class="card" style="margin-top:20px">
              <div class="card-title">📋 Category breakdown</div>
              ${`
                <div class="table-wrap"><table class="table">
                  <thead><tr>
                    <th>Category</th>
                    <th class="numeric">Count</th>
                    <th class="numeric">Total</th>
                    <th>Share</th>
                    <th class="numeric">%</th>
                  </tr></thead>
                  <tbody>${r.by_category.map((c, i) => `
                    <tr>
                      <td><span class="category-pill"><span class="category-dot" style="background:${palette[i]}"></span>${escHTML(c.category)}</span></td>
                      <td class="numeric">${c.count}</td>
                      <td class="numeric"><strong>${fmtMoney(c.total)}</strong></td>
                      <td><div class="progress" style="margin:0"><div class="progress-bar" style="width:${(c.total/r.total*100).toFixed(1)}%;background:${palette[i]}"></div></div></td>
                      <td class="numeric">${((c.total/r.total)*100).toFixed(1)}%</td>
                    </tr>`).join('')}
                  </tbody>
                </table></div>`}
            </div>`;

          // Animate counters
          $$('.stat-value[data-count]').forEach((el) => animateCount(el, parseFloat(el.dataset.count), { duration: 900 }));

          if (typeof Chart !== 'undefined') {
            createChart($('#bar-chart'), {
              type: 'bar',
              data: { labels, datasets: [{ label: 'Amount', data: values, backgroundColor: palette, borderRadius: 6, borderSkipped: false }] },
              options: {
                indexAxis: 'y', responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { callbacks: { label: (ctx) => ' ' + fmtMoney(ctx.parsed.x) } } },
              },
            });
            createChart($('#pie-chart'), {
              type: 'doughnut',
              data: { labels, datasets: [{ data: values, backgroundColor: palette, borderWidth: 3, borderColor: getComputedStyle(document.body).getPropertyValue('--card-solid').trim() }] },
              options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { padding: 12, boxWidth: 10 } } },
                cutout: '60%',
              },
            });
            createChart($('#line-chart'), {
              type: 'line',
              data: {
                labels: days.map((d) => d.slice(8)),   // day-of-month
                datasets: [
                  {
                    label: 'Cumulative', data: cumulative, borderColor: '#6366f1',
                    backgroundColor: 'rgba(99,102,241,.15)', fill: true, tension: .35,
                    pointBackgroundColor: '#6366f1', pointRadius: 3, pointHoverRadius: 6,
                    borderWidth: 2.5,
                  },
                  {
                    label: 'Daily', data: dayValues, borderColor: '#ec4899',
                    backgroundColor: 'rgba(236,72,153,.12)', fill: false, tension: .35,
                    pointBackgroundColor: '#ec4899', pointRadius: 2, borderWidth: 2,
                    yAxisID: 'y1',
                  },
                ],
              },
              options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'top', align: 'end' } },
                scales: { y: { beginAtZero: true }, y1: { position: 'right', beginAtZero: true, grid: { display: false } } },
              },
            });
          }
        } catch (err) {
          content.innerHTML = `<div class="empty"><div class="icon">⚠️</div><h3>${escHTML(err.message)}</h3></div>`;
        }
      };

      safeOn($('#load-report'), 'click', load);
      safeOn($('#export-png'), 'click', () => {
        const c = chartInstances['line-chart'] || chartInstances['bar-chart'] || chartInstances['pie-chart'];
        if (!c) return toast('No chart to export', 'warning');
        const url = c.toBase64Image();
        const a = document.createElement('a'); a.href = url; a.download = 'chart.png'; a.click();
        toast('Chart exported', 'success');
      });
      load();
    },

    // ---------- BUDGET ----------
    async budget() {
      const root = $('#view-budget');
      if (!root) return;
      root.innerHTML = `
        <div class="card">
          <div class="card-title">🎯 Monthly budget</div>
          <div class="form-grid">
            <div class="form-row">
              <label>Month</label>
              <input type="month" id="budget-month" value="${state.selectedMonth}">
            </div>
            <div class="form-row">
              <label>Amount</label>
              <input type="number" id="budget-amount" min="0" step="0.01" placeholder="0.00">
            </div>
            <div class="form-row" style="align-self:flex-end">
              <button class="btn btn-primary" id="save-budget">💾 Save budget</button>
            </div>
          </div>
          <div id="budget-status" style="margin-top:22px">${skeleton(3)}</div>
        </div>`;

      const load = async () => {
        const status = $('#budget-status');
        if (!status) return;
        state.selectedMonth = $('#budget-month')?.value || curMonth();
        try {
          const b = await API.budget.get(state.selectedMonth);
          const summary = await API.reports.summary(state.selectedMonth);
          const amtEl = $('#budget-amount');
          if (amtEl) amtEl.value = b.amount ?? '';

          if (b.amount != null) {
            const pct = (summary.total / b.amount) * 100;
            const cls = pct > 100 ? 'over' : pct > 80 ? 'warning' : '';
            const offset = 314.159 - (314.159 * Math.min(pct, 100)) / 100;
            const remainingDays = daysLeftInMonth();
            const dailyLeft = remainingDays > 0 ? Math.max(0, (b.amount - summary.total) / remainingDays) : 0;
            const status2 = pct > 100 ? 'over' : pct > 80 ? 'warning' : 'success';

            status.innerHTML = `
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-icon">🎯</div>
                  <div class="stat-label">Budget</div>
                  <div class="stat-value" data-count="${b.amount}">${fmtMoney(0)}</div>
                </div>
                <div class="stat-card ${summary.total > b.amount ? 'danger' : ''}">
                  <div class="stat-icon">💸</div>
                  <div class="stat-label">Spent</div>
                  <div class="stat-value" data-count="${summary.total}">${fmtMoney(0)}</div>
                  <div class="progress"><div class="progress-bar ${cls}" style="width:${Math.min(pct, 100)}%"></div></div>
                  <div class="stat-sub">${pct.toFixed(1)}% used</div>
                </div>
                <div class="stat-card ${status2}">
                  <div class="stat-icon">💰</div>
                  <div class="stat-label">Remaining</div>
                  <div class="stat-value" data-count="${summary.budget_remaining}">${fmtMoney(0)}</div>
                  <div class="stat-sub">${remainingDays} day${remainingDays === 1 ? '' : 's'} left in month</div>
                </div>
                <div class="stat-card info">
                  <div class="stat-icon">📅</div>
                  <div class="stat-label">Daily left</div>
                  <div class="stat-value" data-count="${dailyLeft}">${fmtMoney(0)}</div>
                  <div class="stat-sub">to stay on track</div>
                </div>
              </div>
              <div class="card" style="margin-top:8px">
                <div class="card-title">Gauge</div>
                <div class="gauge-wrap">
                  <div class="gauge">
                    <svg viewBox="0 0 120 120">
                      <defs>
                        <linearGradient id="gauge-grad" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stop-color="#6366f1"/>
                          <stop offset="50%" stop-color="#8b5cf6"/>
                          <stop offset="100%" stop-color="#ec4899"/>
                        </linearGradient>
                      </defs>
                      <circle class="gauge-track" cx="60" cy="60" r="50"/>
                      <circle class="gauge-fill" cx="60" cy="60" r="50"
                              stroke-dasharray="314.159" stroke-dashoffset="${offset}"/>
                    </svg>
                    <div class="gauge-text">
                      <div class="gauge-value">${pct.toFixed(0)}%</div>
                      <div class="gauge-label">of budget used</div>
                    </div>
                  </div>
                  <div class="muted" style="text-align:center">
                    ${pct > 100
                      ? `🚨 Over budget by <strong>${fmtMoney(summary.total - b.amount)}</strong>`
                      : `You have <strong>${fmtMoney(summary.budget_remaining)}</strong> left to spend`}
                  </div>
                </div>
              </div>`;
            $$('.stat-value[data-count]').forEach((el) => animateCount(el, parseFloat(el.dataset.count), { duration: 900 }));
          } else {
            status.innerHTML = `<div class="empty">
              <div class="icon">🎯</div>
              <h3>No budget set for this month</h3>
              <p>Set one above to track your spending against a goal.</p>
            </div>`;
          }
        } catch (err) {
          status.innerHTML = `<div class="empty"><div class="icon">⚠️</div><h3>${escHTML(err.message)}</h3></div>`;
        }
      };

      safeOn($('#budget-month'), 'change', load);
      safeOn($('#save-budget'), 'click', async () => {
        const amt = parseFloat($('#budget-amount')?.value);
        if (Number.isNaN(amt) || amt < 0) return toast('Enter a valid amount', 'error');
        try {
          await API.budget.set(amt, state.selectedMonth);
          toast(amt > 0 ? 'Budget saved — let\'s hit it! 💪' : 'Budget cleared', 'success');
          load();
        } catch (err) { toast(err.message, 'error'); }
      });
      load();
    },
  };

  // -----------------------------------------------------------------------
  //  Utility helpers used by renderers
  // -----------------------------------------------------------------------
  function prevMonth(yyyymm) {
    const [y, m] = yyyymm.split('-').map(Number);
    const d = new Date(y, m - 2, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  function calcTrend(curr, prev) {
    if (!prev) return null;
    const diff = curr - prev;
    if (prev === 0) return { dir: 'flat', pct: 0, arrow: '→' };
    const pct = (diff / prev) * 100;
    if (Math.abs(pct) < 1) return { dir: 'flat', pct, arrow: '→' };
    return { dir: diff > 0 ? 'up' : 'down', pct, arrow: diff > 0 ? '↑' : '↓' };
  }
  function computeStreak(expenses) {
    if (!expenses?.length) return 0;
    const dates = new Set(expenses.map((e) => e.date));
    let streak = 0;
    const d = new Date();
    for (let i = 0; i < 60; i++) {
      const ds = d.toISOString().slice(0, 10);
      if (dates.has(ds)) streak++;
      else if (i > 0) break;  // allow today to be missing
      d.setDate(d.getDate() - 1);
    }
    return streak;
  }
  function computeDailyAllowance(summary) {
    if (!summary.budget) return { value: '—', sub: 'No budget set' };
    const remaining = summary.budget_remaining;
    if (remaining < 0) return { value: fmtMoney(0), sub: 'Over budget' };
    const days = Math.max(daysLeftInMonth(), 1);
    return { value: fmtMoney(remaining / days), sub: `${days} day${days === 1 ? '' : 's'} left` };
  }
  function daysLeftInMonth() {
    const now = new Date();
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    return Math.max(last - now.getDate(), 0);
  }
  function makeInsight(summary, prev, trend, streak, top) {
    if (!summary.count) {
      return `<div class="insight-banner">
        <span class="insight-icon">✨</span>
        <div class="insight-content">
          <div class="insight-title">Fresh start for ${escHTML(summary.month)}!</div>
          <div class="insight-sub">Add your first expense to begin tracking.</div>
        </div>
      </div>`;
    }
    if (streak >= 3) {
      return `<div class="insight-banner">
        <span class="insight-icon">🔥</span>
        <div class="insight-content">
          <div class="insight-title">${streak}-day logging streak!</div>
          <div class="insight-sub">Consistency is key. Keep it going.</div>
        </div>
      </div>`;
    }
    if (trend && trend.dir === 'down' && Math.abs(trend.pct) > 10) {
      return `<div class="insight-banner">
        <span class="insight-icon">📉</span>
        <div class="insight-content">
          <div class="insight-title">Spending down ${Math.abs(trend.pct).toFixed(0)}% vs last month</div>
          <div class="insight-sub">Great job staying on track — keep it up!</div>
        </div>
      </div>`;
    }
    if (trend && trend.dir === 'up' && Math.abs(trend.pct) > 20) {
      return `<div class="insight-banner" style="background:linear-gradient(135deg,#f59e0b,#ec4899)">
        <span class="insight-icon">⚡</span>
        <div class="insight-content">
          <div class="insight-title">Spending up ${Math.abs(trend.pct).toFixed(0)}% vs last month</div>
          <div class="insight-sub">${top ? `${escHTML(top.category)} is leading the increase.` : 'Consider reviewing your expenses.'}</div>
        </div>
      </div>`;
    }
    if (summary.budget && summary.budget_remaining < 0) {
      return `<div class="insight-banner" style="background:linear-gradient(135deg,#ef4444,#f87171)">
        <span class="insight-icon">🚨</span>
        <div class="insight-content">
          <div class="insight-title">Over budget by ${fmtMoney(Math.abs(summary.budget_remaining))}</div>
          <div class="insight-sub">Time to slow down for the rest of the month.</div>
        </div>
      </div>`;
    }
    return '';
  }
  function renderQuickCats() {
    const wrap = $('#quick-cats');
    if (!wrap || !state.recentCategories.length) return;
    const cats = state.recentCategories
      .map((id) => state.categories.find((c) => c.id == id))
      .filter(Boolean);
    if (!cats.length) { wrap.innerHTML = ''; return; }
    wrap.innerHTML = `<span class="muted" style="font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px">Quick add:</span>` +
      cats.map((c) => `<button class="chip" data-cat="${c.id}" style="border-color:${escHTML(c.color)}">
        <span class="category-dot" style="background:${escHTML(c.color)}"></span> ${escHTML(c.name)}
      </button>`).join('');
    $$('[data-cat]', wrap).forEach((b) => safeOn(b, 'click', async () => {
      if (!state.categories.length) await refreshCategories();
      openExpenseModal(null, () => renderers.expenses && renderers.expenses(), parseInt(b.dataset.cat));
    }));
  }

  // Sophisticated palette (12 colors) for charts
  function makePalette(n) {
    const base = [
      '#6366f1', '#ec4899', '#10b981', '#f59e0b', '#06b6d4', '#8b5cf6',
      '#ef4444', '#14b8a6', '#f97316', '#a855f7', '#22c55e', '#eab308',
    ];
    if (n <= base.length) return base.slice(0, n);
    return Array.from({ length: n }, (_, i) => base[i % base.length]);
  }

  // -----------------------------------------------------------------------
  //  Command palette
  // -----------------------------------------------------------------------
  function openCommandPalette() {
    const items = [
      { label: 'Dashboard',          icon: '📊', shortcut: 'G D', action: () => navigate('dashboard') },
      { label: 'Expenses',           icon: '📋', shortcut: 'G E', action: () => navigate('expenses') },
      { label: 'Categories',         icon: '🏷️', shortcut: 'G C', action: () => navigate('categories') },
      { label: 'Reports',            icon: '📈', shortcut: 'G R', action: () => navigate('reports') },
      { label: 'Budget',             icon: '🎯', shortcut: 'G B', action: () => navigate('budget') },
      { label: 'New expense',        icon: '➕', shortcut: 'N',   action: () => openExpenseModal(null, () => renderers[currentView]?.()) },
      { label: 'Quick add category', icon: '⚡', shortcut: '',    action: () => { $('#fab-quick')?.click(); } },
      { label: 'Export CSV',         icon: '⬇️', shortcut: '',    action: () => { window.location.href = '/api/export.csv'; } },
      { label: 'Export chart (PNG)', icon: '📷', shortcut: '',    action: () => { $('#export-png')?.click(); } },
      { label: 'Toggle dark mode',   icon: '🌙', shortcut: '',    action: () => $('#theme-toggle')?.click() },
      { label: 'Keyboard shortcuts', icon: '⌨️', shortcut: '?',   action: () => openShortcutHelp() },
    ];

    openModal({
      title: '⚡ Command palette',
      submitText: 'Run',
      body: `
        <div class="form-row">
          <input id="cmd-input" placeholder="Type a command…" autofocus>
        </div>
        <div class="cmd-list" id="cmd-list"></div>`,
      onSubmit: () => {
        const checked = document.querySelector('input[name="cmd-choice"]:checked');
        if (checked) items[+checked.value]?.action();
      },
    });

    let selectedIdx = 0;
    const input = $('#cmd-input'), list = $('#cmd-list');
    const renderList = (filter = '') => {
      const matches = items.map((it, i) => ({ ...it, idx: i }))
        .filter((it) => it.label.toLowerCase().includes(filter.toLowerCase()));
      if (selectedIdx >= matches.length) selectedIdx = Math.max(0, matches.length - 1);
      list.innerHTML = matches.length === 0
        ? '<p class="muted" style="padding:14px">No matches</p>'
        : matches.map((m, i) => `
            <label class="cmd-item ${i === selectedIdx ? 'selected' : ''}" data-idx="${i}">
              <input type="radio" name="cmd-choice" value="${m.idx}" ${i === selectedIdx ? 'checked' : ''}>
              <span class="cmd-icon">${m.icon}</span>
              <span class="cmd-label">${escHTML(m.label)}</span>
              ${m.shortcut ? `<span class="cmd-shortcut">${escHTML(m.shortcut)}</span>` : ''}
            </label>`).join('');
    };
    const updateSelection = (newIdx) => {
      selectedIdx = newIdx;
      $$('.cmd-item').forEach((el, i) => el.classList.toggle('selected', i === selectedIdx));
      const sel = $('.cmd-item.selected input');
      if (sel) sel.checked = true;
    };
    safeOn(input, 'input', (e) => { selectedIdx = 0; renderList(e.target.value); });
    safeOn(input, 'keydown', (e) => {
      const itemsEls = $$('.cmd-item');
      if (e.key === 'ArrowDown') { e.preventDefault(); updateSelection(Math.min(selectedIdx + 1, itemsEls.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); updateSelection(Math.max(selectedIdx - 1, 0)); }
      else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = $('.cmd-item.selected');
        if (sel) sel.closest('form').requestSubmit();
      }
    });
    renderList();
  }

  function openShortcutHelp() {
    openModal({
      title: '⌨️ Keyboard shortcuts',
      submitText: 'Got it',
      onSubmit: () => {},
      body: `
        <div class="table-wrap"><table class="table">
          <tr><td><kbd>Ctrl/⌘ K</kbd></td><td>Open command palette</td></tr>
          <tr><td><kbd>N</kbd></td>        <td>New expense</td></tr>
          <tr><td><kbd>/</kbd></td>        <td>Focus search</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>D</kbd></td><td>Go to Dashboard</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>E</kbd></td><td>Go to Expenses</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>C</kbd></td><td>Go to Categories</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>R</kbd></td><td>Go to Reports</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>B</kbd></td><td>Go to Budget</td></tr>
          <tr><td><kbd>Esc</kbd></td>      <td>Close modal / drawer</td></tr>
          <tr><td><kbd>?</kbd></td>        <td>Show this help</td></tr>
        </table></div>`,
    });
  }

  // -----------------------------------------------------------------------
  //  Global shortcuts
  // -----------------------------------------------------------------------
  (function initShortcuts() {
    let gPressed = false, gTimer;
    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toUpperCase();
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      const hasMod  = e.metaKey || e.ctrlKey || e.altKey;

      if (e.key === 'Escape') {
        const overlay = $('.modal-overlay');
        if (overlay) { overlay.querySelector('[data-close]')?.click(); return; }
      }
      if (hasMod && e.key.toLowerCase() === 'k') { e.preventDefault(); return openCommandPalette(); }
      if (inField) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        return openExpenseModal(null, () => renderers[currentView]?.());
      }
      if (e.key === '/') { e.preventDefault(); return $('#search-q')?.focus(); }
      if (e.key === '?') return openShortcutHelp();

      if (e.key.toLowerCase() === 'g') {
        gPressed = true; clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 800);
        return;
      }
      if (gPressed) {
        gPressed = false; clearTimeout(gTimer);
        const map = { d: 'dashboard', e: 'expenses', c: 'categories', r: 'reports', b: 'budget' };
        const v = map[e.key.toLowerCase()];
        if (v) navigate(v);
      }
    });
  })();

  // -----------------------------------------------------------------------
  //  FAB cluster + quick add
  // -----------------------------------------------------------------------
  (function initFAB() {
    const fab = $('#fab-add');
    const mini = $('#fab-quick');
    let expanded = false;
    const setExpanded = (v) => {
      expanded = v;
      mini?.classList.toggle('show', expanded);
      fab?.classList.toggle('active', expanded);
    };
    safeOn(fab, 'click', async () => {
      if (expanded) {
        setExpanded(false);
        if (!state.categories.length) await refreshCategories();
        openExpenseModal(null, () => {
          const r = renderers[currentView];
          if (r) { try { r(); } catch (err) { console.error('[FAB refresh]', err); } }
        });
      } else {
        setExpanded(true);
      }
    });
    safeOn(mini, 'click', async () => {
      setExpanded(false);
      if (!state.categories.length) await refreshCategories();
      if (!state.recentCategories.length) {
        toast('No recent categories yet. Add some expenses first!', 'info');
        return openExpenseModal(null, () => renderers[currentView]?.());
      }
      // Show quick category picker
      const cats = state.recentCategories
        .map((id) => state.categories.find((c) => c.id == id))
        .filter(Boolean);
      openModal({
        title: '⚡ Quick add',
        body: `
          <div class="form-row">
            <label>Amount</label>
            <input type="number" name="amount" step="0.01" min="0.01" required autofocus>
          </div>
          <div class="form-row">
            <label>Description</label>
            <input name="description" required placeholder="e.g. Coffee">
          </div>
          <div class="form-row">
            <label>Category</label>
            <select name="category_id">
              ${cats.map((c) => `<option value="${c.id}">${escHTML(c.name)}</option>`).join('')}
            </select>
          </div>
          <input type="hidden" name="date" value="${today()}">`,
        submitText: '⚡ Add quickly',
        onSubmit: async (data) => {
          await API.expenses.create(data);
          trackRecentCategory(parseInt(data.category_id) || null);
          toast('⚡ Quick add complete', 'success');
          renderers[currentView]?.();
        },
      });
    });
    // Close mini when clicking outside
    document.addEventListener('click', (e) => {
      if (expanded && !e.target.closest('.fab-cluster')) setExpanded(false);
    });
  })();

  // Topbar shortcut button
  safeOn($('#shortcut-btn'), 'click', openShortcutHelp);

  // -----------------------------------------------------------------------
  //  Boot
  // -----------------------------------------------------------------------
  applyChartDefaults();
  refreshCategories()
    .catch((err) => console.error('[boot] refreshCategories', err))
    .finally(() => {
      try { navigate(location.hash.slice(1) || 'dashboard'); }
      catch (err) { console.error('[boot] navigate', err); showFatal(`Boot error: ${err.message}`); }
    });

  // Expose for debugging
window.__app = {
  state, navigate, renderers, refreshCategories,
  chartInstances, applyChartDefaults, updateChartsTheme,
  animateCount,
};
})();