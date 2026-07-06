// =========================================================================
//  EXPENSE TRACKER — Hardened Frontend
//  - All errors caught and surfaced in UI + console
//  - Renderers never crash the page
// =========================================================================

(function () {
  'use strict';

  // -----------------------------------------------------------------------
  //  Global error trap — NEVER let a JS error freeze the page silently
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
  //  Safe element helpers
  // -----------------------------------------------------------------------
  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function safeOn(el, ev, fn) {
    if (!el) { console.warn(`[safeOn] element not found`); return; }
    el.addEventListener(ev, fn);
  }

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
      create: (data)   => API.req('/api/categories',     { method: 'POST',  body: JSON.stringify(data) }),
      remove: (id)     => API.req('/api/categories/' + id, { method: 'DELETE' }),
    },
    expenses: {
      list: (params = {}) => {
        const q = new URLSearchParams(
          Object.entries(params).filter(([, v]) => v !== '' && v != null)
        ).toString();
        return API.req('/api/expenses' + (q ? '?' + q : ''));
      },
      create: (data) => API.req('/api/expenses',         { method: 'POST',  body: JSON.stringify(data) }),
      update: (id, d) => API.req('/api/expenses/' + id,  { method: 'PUT',   body: JSON.stringify(d) }),
      remove: (id)    => API.req('/api/expenses/' + id,  { method: 'DELETE' }),
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
  //  Helpers
  // -----------------------------------------------------------------------
  const fmt      = (n) => Number(n || 0).toFixed(2);
  const today    = () => new Date().toISOString().slice(0, 10);
  const curMonth = () => new Date().toISOString().slice(0, 7);
  const curYear  = () => new Date().getFullYear();
  const escHTML  = (s) => String(s ?? '').replace(/[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const todayEl = $('#today-date');
  if (todayEl) {
    todayEl.textContent = new Date().toLocaleDateString(undefined,
      { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  }

  // -----------------------------------------------------------------------
  //  Theme (dark mode)
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
    });
  })();

  // -----------------------------------------------------------------------
  //  Toast (with optional action button — for Undo)
  // -----------------------------------------------------------------------
  function toast(message, type = 'success', action = null) {
    const c = $('#toast-container');
    if (!c) return;
    const t = document.createElement('div');
    t.className = 'toast ' + type;
    if (action) {
      t.innerHTML = `<span>${escHTML(message)}</span>
        <button class="toast-action">${escHTML(action.label)}</button>`;
      t.querySelector('.toast-action').addEventListener('click', () => {
        Promise.resolve(action.onClick()).catch((err) => toast(err.message, 'error'));
        t.remove();
      });
    } else {
      t.textContent = message;
    }
    c.appendChild(t);
    setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); },
               action ? 5000 : 2500);
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
          <div class="modal-body">${body}</div>
          <div class="modal-actions">
            <button type="button" class="btn" data-close>Cancel</button>
            <button type="submit" class="btn btn-primary">${escHTML(submitText)}</button>
          </div>
        </form>
      </div>`;
    const overlay = $('.modal-overlay', root);
    const form    = $('.modal', root);
    const close = () => (root.innerHTML = '');
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
    $('.modal [data-close]', root).addEventListener('click', close);
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        await onSubmit(data);
        close();
      } catch (err) {
        toast(err.message || String(err), 'error');
      }
    });
  }

  // -----------------------------------------------------------------------
  //  State + router
  // -----------------------------------------------------------------------
  const VIEWS = ['dashboard', 'expenses', 'categories', 'reports', 'budget'];
  const state = { categories: [], selectedMonth: curMonth() };

  let currentView = 'dashboard';

  function navigate(view) {
    if (!VIEWS.includes(view)) view = 'dashboard';
    if (view === currentView && view === location.hash.slice(1)) {
      // Already there, still re-render to refresh data
    }
    currentView = view;

    VIEWS.forEach((v) => {
      const sec = $('#view-' + v);
      const lnk = $(`.nav-link[data-view="${v}"]`);
      if (sec) sec.classList.toggle('active', v === view);
      if (lnk) lnk.classList.toggle('active', v === view);
    });

    const titleEl = $('#page-title');
    if (titleEl) titleEl.textContent = view.charAt(0).toUpperCase() + view.slice(1);

    // Run renderer safely
    const renderer = renderers[view];
    if (renderer) {
      try {
        const result = renderer();
        if (result && typeof result.catch === 'function') {
          result.catch((err) => console.error(`[renderer:${view}]`, err));
        }
      } catch (err) {
        console.error(`[renderer:${view}] sync error`, err);
      }
    }

    // Only update hash if different (avoids hashchange loop)
    if (location.hash.slice(1) !== view) {
      history.replaceState(null, '', '#' + view);
    }
  }

  $$('.nav-link').forEach((el) =>
    safeOn(el, 'click', (e) => {
      e.preventDefault();
      navigate(el.dataset.view);
    })
  );
  window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));

  // -----------------------------------------------------------------------
  //  Shared renderers
  // -----------------------------------------------------------------------
  function renderExpenseTable(expenses, { onEdit, onDelete } = {}) {
    if (!Array.isArray(expenses) || expenses.length === 0) {
      return `<div class="empty"><div class="icon">📭</div>No expenses yet.</div>`;
    }
    return `
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
                ? `<span class="category-pill">${escHTML(e.category_name)}</span>`
                : '<span class="muted">—</span>'}</td>
              <td>${escHTML(e.description)}</td>
              <td class="numeric"><strong>${fmt(e.amount)}</strong></td>
              <td><div class="row-actions">
                ${onEdit   ? '<button class="btn btn-sm act-edit">Edit</button>' : ''}
                ${onDelete ? '<button class="btn btn-sm btn-danger act-del">Delete</button>' : ''}
              </div></td>
            </tr>`).join('')}
        </tbody>
      </table>`;
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

  function openExpenseModal(expense, onSaved) {
    const isEdit = !!expense;
    openModal({
      title: isEdit ? `Edit Expense #${expense.id}` : 'New Expense',
      body: `
        <div class="form-row">
          <label>Amount</label>
          <input type="number" name="amount" step="0.01" min="0.01" required value="${expense?.amount ?? ''}">
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
                `<option value="${c.id}" ${expense?.category_id == c.id ? 'selected' : ''}>${escHTML(c.name)}</option>`
              ).join('')}
            </select>
          </div>
        </div>`,
      onSubmit: async (data) => {
        if (isEdit) {
          await API.expenses.update(expense.id, data);
          toast('Expense updated');
        } else {
          await API.expenses.create(data);
          toast('Expense added');
        }
        onSaved?.();
      },
    });
  }

  async function refreshCategories() {
    try {
      state.categories = await API.categories.list();
    } catch (err) {
      console.error('[refreshCategories]', err);
      state.categories = [];
    }
  }

  // -----------------------------------------------------------------------
  //  Heatmap builder (with bounded loops)
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
      while (safety++ < 60) {  // hard cap: 60 weeks max
        const week = [];
        for (let d = 0; d < 7; d++) {
          week.push(new Date(cursor));
          cursor.setDate(cursor.getDate() + 1);
        }
        weeks.push(week);
        if (week > dec31) break;
      }

      const cellsHTML = weeks.map((w) =>
        w.map((d) => {
          const inYear = d.getFullYear() === year;
          const ds = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
          const v = inYear ? (byDay[ds] || 0) : 0;
          let lvl = 0;
          if (inYear && v > 0 && maxAmount > 0) {
            const ratio = v / maxAmount;
            if (ratio >= 0.75) lvl = 4;
            else if (ratio >= 0.50) lvl = 3;
            else if (ratio >= 0.25) lvl = 2;
            else lvl = 1;
          }
          const titleAttr = inYear ? ` title="${ds}: ${fmt(v)}"` : '';
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
      console.error('[buildHeatmap]', err);
      return `<div class="empty">Heatmap failed: ${escHTML(err.message)}</div>`;
    }
  }

  // -----------------------------------------------------------------------
  //  View renderers
  // -----------------------------------------------------------------------
  const renderers = {
    async dashboard() {
      const root = $('#view-dashboard');
      if (!root) return;
      root.innerHTML = '<div class="card">Loading…</div>';
      try {
        const [summary, expenses, heatData] = await Promise.all([
          API.reports.summary(state.selectedMonth),
          API.expenses.list({ limit: 8 }),
          API.reports.heatmap(curYear()).catch(() => ({ expenses: [] })),  // don't fail dashboard on heatmap error
        ]);

        const budgetPct = summary.budget ? (summary.total / summary.budget) * 100 : 0;
        const budgetCls = budgetPct > 100 ? 'over' : budgetPct > 80 ? 'warning' : '';
        const top = summary.by_category && summary.by_category;

        const byDay = {};
        (heatData.expenses || []).forEach((e) => {
          byDay[e.date] = (byDay[e.date] || 0) + e.amount;
        });

        root.innerHTML = `
          <div class="stat-grid">
            <div class="stat-card">
              <div class="stat-label">Total — ${escHTML(summary.month)}</div>
              <div class="stat-value">${fmt(summary.total)}</div>
              <div class="stat-sub">${summary.count} expenses</div>
            </div>
            <div class="stat-card ${summary.budget_remaining < 0 ? 'danger' : 'success'}">
              <div class="stat-label">Budget remaining</div>
              <div class="stat-value">${summary.budget ? fmt(summary.budget_remaining) : '—'}</div>
              ${summary.budget
                ? `<div class="progress"><div class="progress-bar ${budgetCls}" style="width:${Math.min(budgetPct, 100)}%"></div></div>
                   <div class="stat-sub">${budgetPct.toFixed(0)}% of ${fmt(summary.budget)} used</div>`
                : '<div class="stat-sub">No budget set</div>'}
            </div>
            <div class="stat-card warning">
              <div class="stat-label">Top category</div>
              <div class="stat-value" style="font-size:18px">${top ? escHTML(top.category) : '—'}</div>
              <div class="stat-sub">${top ? fmt(top.total) : 'No spending yet'}</div>
            </div>
          </div>
          <div class="card">
            <div class="card-title">Recent expenses</div>
            ${renderExpenseTable(expenses)}
          </div>
          <div class="card">
            <div class="card-title">Spending heatmap — ${curYear()}</div>
            ${buildHeatmap(curYear(), byDay)}
          </div>`;
      } catch (err) {
        console.error('[dashboard]', err);
        root.innerHTML = `<div class="card">Dashboard error: ${escHTML(err.message)}</div>`;
      }
    },

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
          <div id="expense-list"></div>
        </div>`;

      await refreshCategories();
      const filterCat = $('#filter-cat');
      if (filterCat) {
        filterCat.innerHTML = '<option value="">All categories</option>' +
          state.categories.map((c) =>
            `<option value="${c.id}">${escHTML(c.name)}</option>`).join('');
      }

      const daysAgo = (n) => {
        const d = new Date(); d.setDate(d.getDate() - n);
        return d.toISOString().slice(0, 10);
      };

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

        list.innerHTML = '<p class="empty">Loading…</p>';
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
                        amount: snapshot.amount,
                        description: snapshot.description,
                        date: snapshot.date,
                        category_id: snapshot.category_id,
                      });
                      toast('Restored', 'success');
                      load();
                    } catch (err) {
                      toast(err.message, 'error');
                    }
                  },
                });
              } catch (err) {
                toast(err.message, 'error');
              }
            },
          });
        } catch (err) {
          list.innerHTML = `<p class="empty">${escHTML(err.message)}</p>`;
        }
      };

      $$('.chip').forEach((c) =>
        safeOn(c, 'click', () => {
          $$('.chip').forEach((x) => x.classList.remove('active'));
          c.classList.add('active');
          const fromEl = $('#filter-from');
          const toEl   = $('#filter-to');
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
        })
      );

      let searchTimer;
      safeOn($('#search-q'), 'input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(load, 250);
      });
      safeOn($('#filter-from'), 'change', load);
      safeOn($('#filter-to'),   'change', load);
      safeOn($('#filter-cat'),  'change', load);

      safeOn($('#add-expense'), 'click', async () => {
        if (!state.categories.length) await refreshCategories();
        openExpenseModal(null, load);
      });
      load();
    },

    async categories() {
      const root = $('#view-categories');
      if (!root) return;
      await refreshCategories();
      root.innerHTML = `
        <div class="card">
          <div class="toolbar">
            <button class="btn btn-primary" id="add-cat">+ Add category</button>
          </div>
          <div class="cat-grid" id="cat-grid"></div>
        </div>`;

      const render = () => {
        const grid = $('#cat-grid');
        if (!grid) return;
        if (!state.categories.length) {
          grid.innerHTML = '<p class="empty">No categories yet.</p>';
          return;
        }
        grid.innerHTML = state.categories.map((c) => `
          <div class="cat-card">
            <div class="name">
              <span class="category-dot" style="background:${escHTML(c.color)}"></span>
              ${escHTML(c.name)}
            </div>
            <button class="btn btn-sm btn-danger" data-id="${c.id}">Delete</button>
          </div>`).join('');
        $$('[data-id]', grid).forEach((b) =>
          safeOn(b, 'click', async () => {
            const name = b.parentElement.querySelector('.name')?.textContent.trim() || '';
            if (!confirm(`Delete category "${name}"?`)) return;
            try {
              await API.categories.remove(b.dataset.id);
              toast('Category deleted');
              renderers.categories();
            } catch (err) {
              toast(err.message, 'error');
            }
          })
        );
      };

      safeOn($('#add-cat'), 'click', () =>
        openModal({
          title: 'New category',
          body: `
            <div class="form-row">
              <label>Name</label>
              <input name="name" required>
            </div>
            <div class="form-row">
              <label>Color</label>
              <input type="color" name="color" value="#3498db" class="color-input">
            </div>`,
          onSubmit: async (data) => {
            await API.categories.create(data);
            toast('Category created');
            renderers.categories();
          },
        })
      );
      render();
    },

    async reports() {
      const root = $('#view-reports');
      if (!root) return;
      root.innerHTML = `
        <div class="card">
          <div class="toolbar">
            <label>Month:</label>
            <input type="month" id="report-month" value="${state.selectedMonth}">
            <button class="btn btn-primary" id="load-report">Load</button>
          </div>
          <div id="report-content"></div>
        </div>`;

      const load = async () => {
        const content = $('#report-content');
        if (!content) return;
        state.selectedMonth = $('#report-month')?.value || curMonth();
        content.innerHTML = '<p class="empty">Loading…</p>';
        try {
          const r = await API.reports.summary(state.selectedMonth);
          if (!r.by_category.length) {
            content.innerHTML = '<p class="empty">No expenses this month.</p>';
            return;
          }
          content.innerHTML = `
            <div class="charts-grid">
              <div class="card">
                <div class="card-title">Spending by category</div>
                <canvas id="bar-chart"></canvas>
              </div>
              <div class="card">
                <div class="card-title">Distribution</div>
                <canvas id="pie-chart"></canvas>
              </div>
            </div>
            <div class="card" style="margin-top:20px">
              <div class="card-title">Category breakdown</div>
              <table class="table">
                <thead><tr>
                  <th>Category</th>
                  <th class="numeric">Count</th>
                  <th class="numeric">Total</th>
                  <th class="numeric">%</th>
                </tr></thead>
                <tbody>${r.by_category.map((c) => `
                  <tr>
                    <td>${escHTML(c.category)}</td>
                    <td class="numeric">${c.count}</td>
                    <td class="numeric">${fmt(c.total)}</td>
                    <td class="numeric">${r.total ? ((c.total / r.total) * 100).toFixed(1) : '0.0'}%</td>
                  </tr>`).join('')}
                </tbody>
              </table>
            </div>`;

          if (typeof Chart !== 'undefined') {
            const colors = ['#3b82f6','#ef4444','#10b981','#f59e0b','#8b5cf6','#ec4899','#14b8a6','#f97316'];
            const labels = r.by_category.map((c) => c.category);
            const values = r.by_category.map((c) => c.total);
            new Chart($('#bar-chart'), {
              type: 'bar',
              data: { labels, datasets: [{ label: 'Amount', data: values, backgroundColor: colors }] },
              options: { indexAxis: 'y', responsive: true, plugins: { legend: { display: false } } },
            });
            new Chart($('#pie-chart'), {
              type: 'doughnut',
              data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
              options: { responsive: true, plugins: { legend: { position: 'bottom' } } },
            });
          } else {
            console.warn('Chart.js not loaded');
          }
        } catch (err) {
          content.innerHTML = `<p class="empty">${escHTML(err.message)}</p>`;
        }
      };

      safeOn($('#load-report'), 'click', load);
      load();
    },

    async budget() {
      const root = $('#view-budget');
      if (!root) return;
      root.innerHTML = `
        <div class="card">
          <div class="card-title">Monthly budget</div>
          <div class="form-grid">
            <div class="form-row">
              <label>Month</label>
              <input type="month" id="budget-month" value="${state.selectedMonth}">
            </div>
            <div class="form-row">
              <label>Amount</label>
              <input type="number" id="budget-amount" min="0" step="0.01">
            </div>
            <div class="form-row" style="align-self:flex-end">
              <button class="btn btn-primary" id="save-budget">Save budget</button>
            </div>
          </div>
          <div id="budget-status" style="margin-top:18px"></div>
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
            status.innerHTML = `
              <div class="stat-grid">
                <div class="stat-card">
                  <div class="stat-label">Budget</div>
                  <div class="stat-value">${fmt(b.amount)}</div>
                </div>
                <div class="stat-card ${summary.total > b.amount ? 'danger' : ''}">
                  <div class="stat-label">Spent</div>
                  <div class="stat-value">${fmt(summary.total)}</div>
                  <div class="progress"><div class="progress-bar ${cls}" style="width:${Math.min(pct, 100)}%"></div></div>
                  <div class="stat-sub">${pct.toFixed(1)}% used</div>
                </div>
                <div class="stat-card ${summary.budget_remaining < 0 ? 'danger' : 'success'}">
                  <div class="stat-label">Remaining</div>
                  <div class="stat-value">${fmt(summary.budget_remaining)}</div>
                </div>
              </div>`;
          } else {
            status.innerHTML = '<p class="empty">No budget set for this month.</p>';
          }
        } catch (err) {
          status.innerHTML = `<p class="empty">${escHTML(err.message)}</p>`;
        }
      };

      safeOn($('#budget-month'), 'change', load);
      safeOn($('#save-budget'), 'click', async () => {
        const amt = parseFloat($('#budget-amount')?.value);
        if (Number.isNaN(amt) || amt < 0) return toast('Invalid amount', 'error');
        try {
          await API.budget.set(amt, state.selectedMonth);
          toast('Budget saved');
          load();
        } catch (err) { toast(err.message, 'error'); }
      });
      load();
    },
  };

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
      { label: 'New expense',        icon: '➕', shortcut: 'N',   action: () => openExpenseModal(null, () => renderers[currentView] && renderers[currentView]()) },
      { label: 'Export CSV',         icon: '⬇️', shortcut: '',    action: () => { window.location.href = '/api/export.csv'; } },
      { label: 'Toggle dark mode',   icon: '🌙', shortcut: '',    action: () => $('#theme-toggle')?.click() },
      { label: 'Keyboard shortcuts', icon: '⌨️', shortcut: '?',   action: () => openShortcutHelp() },
    ];

    openModal({
      title: 'Command palette',
      submitText: 'Run',
      body: `
        <div class="form-row">
          <input id="cmd-input" placeholder="Type a command…" autofocus>
        </div>
        <div class="cmd-list" id="cmd-list"></div>`,
      onSubmit: () => {
        const checked = document.querySelector('input[name="cmd-choice"]:checked');
        if (checked) {
          const it = items[+checked.value];
          if (it) it.action();
        }
      },
    });

    let selectedIdx = 0;
    const input = $('#cmd-input');
    const list  = $('#cmd-list');

    const renderList = (filter = '') => {
      const matches = items
        .map((it, i) => ({ ...it, idx: i }))
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
      $$('.cmd-item').forEach((el, i) => {
        el.classList.toggle('selected', i === selectedIdx);
      });
      const sel = $('.cmd-item.selected input');
      if (sel) sel.checked = true;
    };

    safeOn(input, 'input', (e) => { selectedIdx = 0; renderList(e.target.value); });
    safeOn(input, 'keydown', (e) => {
      const items = $$('.cmd-item');
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateSelection(Math.min(selectedIdx + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateSelection(Math.max(selectedIdx - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const sel = $('.cmd-item.selected');
        if (sel) sel.closest('form').requestSubmit();
      }
    });

    renderList();
  }

  function openShortcutHelp() {
    openModal({
      title: 'Keyboard shortcuts',
      submitText: 'Got it',
      onSubmit: () => {},
      body: `
        <table class="table">
          <tr><td><kbd>Ctrl/⌘ K</kbd></td><td>Open command palette</td></tr>
          <tr><td><kbd>N</kbd></td>        <td>New expense</td></tr>
          <tr><td><kbd>/</kbd></td>        <td>Focus search</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>D</kbd></td><td>Go to Dashboard</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>E</kbd></td><td>Go to Expenses</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>C</kbd></td><td>Go to Categories</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>R</kbd></td><td>Go to Reports</td></tr>
          <tr><td><kbd>G</kbd> then <kbd>B</kbd></td><td>Go to Budget</td></tr>
          <tr><td><kbd>Esc</kbd></td>      <td>Close modal</td></tr>
          <tr><td><kbd>?</kbd></td>        <td>Show this help</td></tr>
        </table>`,
    });
  }

  // -----------------------------------------------------------------------
  //  Global keyboard shortcuts
  // -----------------------------------------------------------------------
  (function initShortcuts() {
    let gPressed = false;
    let gTimer;

    document.addEventListener('keydown', (e) => {
      const tag = (e.target.tagName || '').toUpperCase();
      const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || e.target.isContentEditable;
      const hasMod  = e.metaKey || e.ctrlKey || e.altKey;

      if (e.key === 'Escape') {
        const overlay = $('.modal-overlay');
        if (overlay) { overlay.querySelector('[data-close]')?.click(); return; }
      }
      if (hasMod && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        return openCommandPalette();
      }
      if (inField) return;

      if (e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        return openExpenseModal(null, () => renderers[currentView] && renderers[currentView]());
      }
      if (e.key === '/') {
        e.preventDefault();
        return $('#search-q')?.focus();
      }
      if (e.key === '?') {
        return openShortcutHelp();
      }

      if (e.key.toLowerCase() === 'g') {
        gPressed = true;
        clearTimeout(gTimer);
        gTimer = setTimeout(() => { gPressed = false; }, 800);
        return;
      }
      if (gPressed) {
        gPressed = false;
        clearTimeout(gTimer);
        const map = { d: 'dashboard', e: 'expenses', c: 'categories', r: 'reports', b: 'budget' };
        const v = map[e.key.toLowerCase()];
        if (v) navigate(v);
      }
    });
  })();

  // -----------------------------------------------------------------------
  //  FAB
  // -----------------------------------------------------------------------
  safeOn($('#fab-add'), 'click', async () => {
    if (!state.categories.length) await refreshCategories();
    openExpenseModal(null, () => {
      const r = renderers[currentView];
      if (r) { try { r(); } catch (err) { console.error('[FAB refresh]', err); } }
    });
  });

  // -----------------------------------------------------------------------
  //  Boot
  // -----------------------------------------------------------------------
  refreshCategories()
    .catch((err) => console.error('[boot] refreshCategories', err))
    .finally(() => {
      try {
        navigate(location.hash.slice(1) || 'dashboard');
      } catch (err) {
        console.error('[boot] navigate', err);
        showFatal(`Boot error: ${err.message}`);
      }
    });

  // Expose for debugging in console
  window.__app = { state, navigate, renderers, refreshCategories };
})();