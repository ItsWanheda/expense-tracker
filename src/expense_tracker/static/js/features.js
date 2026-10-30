(function () {
  'use strict';

  const app = window.__app;
  if (!app) return;

  const { API, state, renderers, createChart, refreshTags } = app;
  const $ = (selector, root = document) => root.querySelector(selector);
  const t = (key) => window.ExpenseI18n?.t(key) || key;
  const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
  const money = (value, currency) => new Intl.NumberFormat(
    window.ExpenseI18n?.locale() || undefined,
    { style: 'currency', currency: currency || 'USD', maximumFractionDigits: 2 }
  ).format(Number(value || 0));

  function showTagEditor(tag) {
    const host = $('#modal-root');
    if (!host) return;
    const existing = Boolean(tag);
    host.innerHTML =
      '<div class="modal-overlay">' +
        '<form class="modal" id="tag-editor-form">' +
          '<h3>' + (existing ? t('edit') + ' tag' : t('add_tag')) + '</h3>' +
          '<div class="modal-body">' +
            '<div class="form-row"><label>' + t('tag_name') + '</label>' +
              '<input name="name" maxlength="40" required value="' + escapeHtml(tag?.name || '') + '"></div>' +
            '<div class="form-row"><label>' + t('color') + '</label>' +
              '<input name="color" type="color" value="' + escapeHtml(tag?.color || '#64748b') + '"></div>' +
          '</div>' +
          '<div class="modal-actions">' +
            '<button type="button" class="btn" data-tag-cancel>' + t('cancel') + '</button>' +
            '<button type="submit" class="btn btn-primary">' + t('save') + '</button>' +
          '</div>' +
        '</form>' +
      '</div>';

    const form = $('#tag-editor-form', host);
    const close = () => { host.innerHTML = ''; };
    $('.modal-overlay', host).addEventListener('click', (event) => {
      if (event.target.classList.contains('modal-overlay')) close();
    });
    $('[data-tag-cancel]', host).addEventListener('click', close);
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const data = Object.fromEntries(new FormData(form).entries());
      try {
        if (existing) await API.tags.update(tag.id, data);
        else await API.tags.create(data);
        close();
        await refreshTags();
        renderers.tags();
      } catch (error) {
        window.alert(error.message || String(error));
      }
    });
    form.querySelector('input[name="name"]')?.focus();
  }

  renderers.tags = async function tagsView() {
    const root = $('#view-tags');
    if (!root) return;
    await refreshTags();

    root.innerHTML =
      '<div class="card">' +
        '<div class="toolbar">' +
          '<div><div class="card-title">🏷️ ' + t('tags') + '</div>' +
          '<div class="muted">Create reusable labels and attach multiple tags to each expense.</div></div>' +
          '<div class="spacer"></div>' +
          '<button class="btn btn-primary" id="tag-add-button">+ ' + t('add_tag') + '</button>' +
        '</div>' +
        '<div id="tag-admin-list" class="tag-admin-list"></div>' +
      '</div>';

    const list = $('#tag-admin-list', root);
    const renderRows = () => {
      if (!state.tags.length) {
        list.innerHTML = '<div class="empty"><div class="icon">🏷️</div><h3>' +
          t('no_tags') + '</h3></div>';
        return;
      }
      list.innerHTML = state.tags.map((tag) =>
        '<div class="tag-admin-row">' +
          '<span class="tag-chip" style="--tag-color:' + escapeHtml(tag.color) + '">' +
            escapeHtml(tag.name) + '</span>' +
          '<div class="row-actions">' +
            '<button class="btn btn-sm tag-edit" data-id="' + tag.id + '">' + t('edit') + '</button>' +
            '<button class="btn btn-sm btn-danger tag-delete" data-id="' + tag.id + '">' + t('delete') + '</button>' +
          '</div>' +
        '</div>'
      ).join('');

      list.querySelectorAll('.tag-edit').forEach((button) => {
        button.addEventListener('click', () => {
          const selected = state.tags.find((item) => item.id === Number(button.dataset.id));
          if (selected) showTagEditor(selected);
        });
      });
      list.querySelectorAll('.tag-delete').forEach((button) => {
        button.addEventListener('click', async () => {
          const selected = state.tags.find((item) => item.id === Number(button.dataset.id));
          if (!selected || !window.confirm('Delete tag "' + selected.name + '"?')) return;
          try {
            await API.tags.remove(selected.id);
            await refreshTags();
            renderRows();
          } catch (error) {
            window.alert(error.message || String(error));
          }
        });
      });
    };

    $('#tag-add-button', root).addEventListener('click', () => showTagEditor(null));
    renderRows();
  };

  renderers.analytics = async function analyticsView() {
    const root = $('#view-analytics');
    if (!root) return;
    const walletOptions = (state.wallets || []).map((wallet) =>
      '<option value="' + wallet.id + '">' + escapeHtml(wallet.name) + '</option>'
    ).join('');

    root.innerHTML =
      '<div class="card" style="margin-bottom:18px">' +
        '<div class="toolbar">' +
          '<div><div class="card-title">📉 ' + t('analytics') + '</div>' +
          '<div class="muted">Transaction distribution, projections and spending concentration.</div></div>' +
          '<div class="spacer"></div>' +
          '<label for="analytics-month">' + t('month') + '</label>' +
          '<input type="month" id="analytics-month" value="' + escapeHtml(state.selectedMonth) + '">' +
          '<select id="analytics-wallet"><option value="">All wallets</option>' + walletOptions + '</select>' +
          '<input id="analytics-currency" aria-label="Currency" maxlength="3" style="width:76px;text-transform:uppercase" value="' +
            escapeHtml(state.selectedCurrency || 'USD') + '">' +
          '<button class="btn btn-sm" id="analytics-refresh">↻ ' + t('refresh') + '</button>' +
        '</div>' +
      '</div>' +
      '<div id="analytics-content"><div class="card">' + t('loading') + '</div></div>';

    const content = $('#analytics-content', root);
    const load = async () => {
      const month = $('#analytics-month', root).value;
      const walletValue = $('#analytics-wallet', root).value;
      const currency = ($('#analytics-currency', root).value || 'USD').trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(currency)) {
        content.textContent = 'Enter a valid three-letter currency code.';
        return;
      }
      state.selectedMonth = month;
      state.selectedCurrency = currency;
      content.textContent = t('loading');

      try {
        const result = await API.reports.advancedAnalytics(
          month,
          currency,
          walletValue ? Number(walletValue) : null
        );
        const largest = result.largest_expense
          ? escapeHtml(result.largest_expense.description) + ' · ' + money(result.largest_expense.amount, currency)
          : '—';
        const utilization = result.budget_utilization == null
          ? '—'
          : Number(result.budget_utilization).toFixed(1) + '%';

        content.innerHTML =
          '<div class="stat-grid">' +
            '<div class="stat-card"><div class="stat-label">' + t('average_transaction') +
              '</div><div class="stat-value">' + money(result.average_transaction, currency) + '</div>' +
              '<div class="stat-sub">' + result.transaction_count + ' transactions</div></div>' +
            '<div class="stat-card"><div class="stat-label">' + t('median_transaction') +
              '</div><div class="stat-value">' + money(result.median_transaction, currency) + '</div></div>' +
            '<div class="stat-card info"><div class="stat-label">' + t('projected_month_total') +
              '</div><div class="stat-value">' + money(result.projected_month_total, currency) + '</div>' +
              '<div class="stat-sub">' + result.elapsed_days + ' / ' + result.days_in_month + ' days elapsed</div></div>' +
            '<div class="stat-card ' + (result.budget_utilization > 100 ? 'danger' : 'success') + '">' +
              '<div class="stat-label">' + t('budget_utilization') + '</div>' +
              '<div class="stat-value">' + utilization + '</div>' +
              '<div class="stat-sub">' + (result.budget_remaining == null ? 'No monthly budget set' :
                money(result.budget_remaining, currency) + ' remaining') + '</div></div>' +
          '</div>' +
          '<div class="stat-grid" style="margin-top:16px">' +
            '<div class="stat-card"><div class="stat-label">' + t('largest_expense') +
              '</div><div class="stat-value" style="font-size:17px">' + largest + '</div></div>' +
            '<div class="stat-card"><div class="stat-label">Top-three category share</div>' +
              '<div class="stat-value">' + Number(result.top_three_category_share || 0).toFixed(1) + '%</div></div>' +
          '</div>' +
          '<div class="charts-grid" style="margin-top:18px">' +
            '<div class="card"><div class="card-title">Daily spending</div><div class="chart-host"><canvas id="analytics-daily"></canvas></div></div>' +
            '<div class="card"><div class="card-title">' + t('spending_by_category') + '</div><div class="chart-host"><canvas id="analytics-category"></canvas></div></div>' +
            '<div class="card"><div class="card-title">' + t('spending_by_weekday') + '</div><div class="chart-host"><canvas id="analytics-weekday"></canvas></div></div>' +
          '</div>' +
          '<div class="charts-grid" style="margin-top:18px">' +
            '<div class="card"><div class="card-title">' + t('spending_by_tag') + '</div><div id="analytics-tags"></div></div>' +
            '<div class="card"><div class="card-title">' + t('spending_by_wallet') + '</div><div id="analytics-wallets"></div></div>' +
          '</div>';

        const daily = result.daily_spending || [];
        const categories = result.category_breakdown || [];
        const weekdays = result.weekday_spending || [];
        createChart($('#analytics-daily', content), {
          type: 'line',
          data: {
            labels: daily.map((item) => item.date.slice(5)),
            datasets: [{
              label: currency,
              data: daily.map((item) => item.total),
              borderColor: '#6366f1',
              backgroundColor: 'rgba(99,102,241,.14)',
              fill: true,
              tension: 0.3
            }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
        createChart($('#analytics-category', content), {
          type: 'doughnut',
          data: {
            labels: categories.map((item) => item.name),
            datasets: [{ data: categories.map((item) => item.total) }]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
        createChart($('#analytics-weekday', content), {
          type: 'bar',
          data: {
            labels: weekdays.map((item) => item.weekday),
            datasets: [{ label: currency, data: weekdays.map((item) => item.total) }]
          },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });

        const renderBreakdown = (selector, rows, key) => {
          const target = $(selector, content);
          if (!rows.length) {
            target.innerHTML = '<p class="muted">No data for this period.</p>';
            return;
          }
          target.innerHTML = '<div class="table-wrap"><table class="table"><thead><tr><th>Name</th><th class="numeric">Total</th></tr></thead><tbody>' +
            rows.map((item) => '<tr><td>' + escapeHtml(item.name) + '</td><td class="numeric">' +
              money(item.total, currency) + '</td></tr>').join('') +
            '</tbody></table></div>';
        };
        renderBreakdown('#analytics-tags', result.tag_breakdown || [], 'name');
        renderBreakdown('#analytics-wallets', result.wallet_breakdown || [], 'name');
      } catch (error) {
        content.innerHTML = '<div class="empty"><div class="icon">⚠️</div><h3>' +
          escapeHtml(error.message || String(error)) + '</h3></div>';
      }
    };

    $('#analytics-refresh', root).addEventListener('click', load);
    $('#analytics-month', root).addEventListener('change', load);
    $('#analytics-wallet', root).addEventListener('change', load);
    $('#analytics-currency', root).addEventListener('change', load);
    load();
  };
})();