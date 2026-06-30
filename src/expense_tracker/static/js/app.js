// ---------- API client ----------
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
    list:   ()           => API.req('/api/categories'),
    create: (data)       => API.req('/api/categories',   { method: 'POST',  body: JSON.stringify(data) }),
    remove: (id)         => API.req('/api/categories/' + id, { method: 'DELETE' }),
  },
  expenses: {
    list:   (params = {}) => {
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
  },
  budget: {
    get: (month) => API.req('/api/budget' + (month ? '?month=' + month : '')),
    set: (amount, month) =>
      API.req('/api/budget', { method: 'PUT', body: JSON.stringify({ amount, month }) }),
  },
};

// ---------- Toast ----------
function toast(message, type = 'success') {
  const c = document.getElementById('toast-container');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = message;
  c.appendChild(t);
  setTimeout(() => { t.style.opacity = '0'; setTimeout(() => t.remove(), 200); }, 2500);
}

// ---------- Modal ----------
function openModal({ title, body, onSubmit, submitText = 'Save' }) {
  const root = document.getElementById('modal-root');
  root.innerHTML = `
    <div class="modal-overlay">
      <form class="modal">
        <h3>${title}</h3>
        <div class="modal-body">${body}</div>
        <div class="modal-actions">
          <button type="button" class="btn" data-close>Cancel</button>
          <button type="submit" class="btn btn-primary">${submitText}</button>
        </div>
      </form>
    </div>`;
  const overlay = root.querySelector('.modal-overlay');
  const form = root.querySelector('.modal');
  const close = () => (root.innerHTML = '');
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  form.querySelector('[data-close]').addEventListener('click', close);
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await onSubmit(data);
      close();
    } catch (err) {
      toast(err.message, 'error');
    }
  });
}

// ---------- Helpers ----------
const fmt      = (n) => Number(n || 0).toFixed(2);
const today    = () => new Date().toISOString().slice(0, 10);
const curMonth = () => new Date().toISOString().slice(0, 7);
const escHTML  = (s) => String(s ?? '').replace(/[&<>"']/g,
  (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

document.getElementById('today-date').textContent =
  new Date().toLocaleDateString(undefined,
    { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

// ---------- State + router ----------
const VIEWS = ['dashboard', 'expenses', 'categories', 'reports', 'budget'];
const state = { categories: [], selectedMonth: curMonth(), cache: {} };

function navigate(view) {
  if (!VIEWS.includes(view)) view = 'dashboard';
  VIEWS.forEach((v) => {
    document.getElementById('view-' + v).classList.toggle('active', v === view);
    document.querySelector(`.nav-link[data-view="${v}"]`).classList.toggle('active', v === view);
  });
  document.getElementById('page-title').textContent =
    view.charAt(0).toUpperCase() + view.slice(1);
  renderers[view]();
  location.hash = view;
}

document.querySelectorAll('.nav-link').forEach((el) =>
  el.addEventListener('click', (e) => { e.preventDefault(); navigate(el.dataset.view); })
);
window.addEventListener('hashchange', () => navigate(location.hash.slice(1)));

// ---------- Shared renderers ----------
function renderExpenseTable(expenses, { onEdit, onDelete } = {}) {
  if (!expenses.length) {
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
    tr.querySelector('.act-edit')?.addEventListener('click', () => onEdit(exp));
    tr.querySelector('.act-del')?.addEventListener('click',  () => onDelete(exp));
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
            ${state.categories.map((c) =>
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
  state.categories = await API.categories.list();
}

// ---------- View renderers ----------
const renderers = {
  async dashboard() {
    const root = document.getElementById('view-dashboard');
    root.innerHTML = '<div class="card">Loading…</div>';
    try {
      const [summary, expenses] = await Promise.all([
        API.reports.summary(state.selectedMonth),
        API.expenses.list({ limit: 8 }),
      ]);
      const budgetPct = summary.budget ? (summary.total / summary.budget) * 100 : 0;
      const budgetCls = budgetPct > 100 ? 'over' : budgetPct > 80 ? 'warning' : '';
      const top = summary.by_category;

      root.innerHTML = `
        <div class="stat-grid">
          <div class="stat-card">
            <div class="stat-label">Total — ${summary.month}</div>
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
        </div>`;
    } catch (err) {
      root.innerHTML = `<div class="card">Error: ${escHTML(err.message)}</div>`;
    }
  },

  async expenses() {
    const root = document.getElementById('view-expenses');
    root.innerHTML = `
      <div class="card">
        <div class="toolbar">
          <input type="date" id="filter-from" placeholder="From">
          <input type="date" id="filter-to"   placeholder="To">
          <select id="filter-cat"><option value="">All categories</option></select>
          <button class="btn"          id="apply-filter">Filter</button>
          <button class="btn"          id="clear-filter">Clear</button>
          <button class="btn btn-primary" id="add-expense" style="margin-left:auto">+ Add expense</button>
        </div>
        <div id="expense-list"></div>
      </div>`;

    await refreshCategories();
    document.getElementById('filter-cat').innerHTML =
      '<option value="">All categories</option>' +
      state.categories.map((c) => `<option value="${c.id}">${escHTML(c.name)}</option>`).join('');

    const load = async () => {
      const params = {};
      const from = document.getElementById('filter-from').value;
      const to   = document.getElementById('filter-to').value;
      const cat  = document.getElementById('filter-cat').value;
      if (from) params.from = from;
      if (to)   params.to   = to;
      if (cat)  params.category_id = cat;

      const list = document.getElementById('expense-list');
      list.innerHTML = '<p class="empty">Loading…</p>';
      try {
        const expenses = await API.expenses.list(params);
        list.innerHTML = renderExpenseTable(expenses, { onEdit: true, onDelete: true });
        bindTableActions(list, expenses, {
          onEdit:   (e) => openExpenseModal(e, load),
          onDelete: async (e) => {
            if (!confirm(`Delete expense #${e.id}?`)) return;
            try { await API.expenses.remove(e.id); toast('Deleted'); load(); }
            catch (err) { toast(err.message, 'error'); }
          },
        });
      } catch (err) {
        list.innerHTML = `<p class="empty">${escHTML(err.message)}</p>`;
      }
    };

    document.getElementById('apply-filter').addEventListener('click', load);
    document.getElementById('clear-filter').addEventListener('click', () => {
      ['filter-from', 'filter-to', 'filter-cat'].forEach((id) => (document.getElementById(id).value = ''));
      load();
    });
    document.getElementById('add-expense').addEventListener('click', async () => {
      if (!state.categories.length) await refreshCategories();
      openExpenseModal(null, load);
    });
    load();
  },

  async categories() {
    const root = document.getElementById('view-categories');
    await refreshCategories();
    root.innerHTML = `
      <div class="card">
        <div class="toolbar">
          <button class="btn btn-primary" id="add-cat">+ Add category</button>
        </div>
        <div class="cat-grid" id="cat-grid"></div>
      </div>`;

    const render = () => {
      const grid = document.getElementById('cat-grid');
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
      grid.querySelectorAll('[data-id]').forEach((b) =>
        b.addEventListener('click', async () => {
          if (!confirm(`Delete category "${b.parentElement.querySelector('.name').textContent.trim()}"?`)) return;
          try {
            await API.categories.remove(b.dataset.id);
            toast('Category deleted');
            renderers.categories();
          } catch (err) { toast(err.message, 'error'); }
        })
      );
    };

    document.getElementById('add-cat').addEventListener('click', () =>
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
    const root = document.getElementById('view-reports');
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
      state.selectedMonth = document.getElementById('report-month').value || curMonth();
      const content = document.getElementById('report-content');
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

        const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b',
                        '#8b5cf6', '#ec4899', '#14b8a6', '#f97316'];
        const labels = r.by_category.map((c) => c.category);
        const values = r.by_category.map((c) => c.total);

        new Chart(document.getElementById('bar-chart'), {
          type: 'bar',
          data: { labels, datasets: [{ label: 'Amount', data: values, backgroundColor: colors }] },
          options: { indexAxis: 'y', responsive: true,
                     plugins: { legend: { display: false } } },
        });
        new Chart(document.getElementById('pie-chart'), {
          type: 'doughnut',
          data: { labels, datasets: [{ data: values, backgroundColor: colors }] },
          options: { responsive: true,
                     plugins: { legend: { position: 'bottom' } } },
        });
      } catch (err) {
        content.innerHTML = `<p class="empty">${escHTML(err.message)}</p>`;
      }
    };

    document.getElementById('load-report').addEventListener('click', load);
    load();
  },

  async budget() {
    const root = document.getElementById('view-budget');
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
      state.selectedMonth = document.getElementById('budget-month').value || curMonth();
      const status = document.getElementById('budget-status');
      try {
        const b = await API.budget.get(state.selectedMonth);
        const summary = await API.reports.summary(state.selectedMonth);
        document.getElementById('budget-amount').value = b.amount ?? '';
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

    document.getElementById('budget-month').addEventListener('change', load);
    document.getElementById('save-budget').addEventListener('click', async () => {
      const amt = parseFloat(document.getElementById('budget-amount').value);
      if (Number.isNaN(amt) || amt < 0) return toast('Invalid amount', 'error');
      try { await API.budget.set(amt, state.selectedMonth); toast('Budget saved'); load(); }
      catch (err) { toast(err.message, 'error'); }
    });
    load();
  },
};

// ---------- Boot ----------
navigate(location.hash.slice(1) || 'dashboard');