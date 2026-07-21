/* YOPPI — dashboard behaviour: tab scrolling (UI only), logout, and real-data rendering */
(function () {
  var tabs = document.querySelectorAll('.dash-tab[data-tab]');
  tabs.forEach(function (tab) {
    tab.addEventListener('click', function (e) {
      e.preventDefault();
      tabs.forEach(function (t) { t.classList.remove('active'); });
      tab.classList.add('active');
      var target = document.getElementById('tab-' + tab.dataset.tab);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    });
  });
})();

(function () {
  var logoutBtn = document.getElementById('logout-btn');
  if (!logoutBtn) return;

  logoutBtn.addEventListener('click', function () {
    logoutBtn.disabled = true;
    window.Yoppi.logout().finally(function () {
      window.location.href = 'index.html';
    });
  });
})();

(function () {
  if (!window.Yoppi) return;

  var CATEGORY_LABELS = {
    racquet: 'Racquet sports',
    gym_fitness: 'Gym & fitness',
    team_sports: 'Team sports',
    consumables: 'Consumables'
  };
  var CATEGORY_ORDER = ['racquet', 'gym_fitness', 'team_sports', 'consumables'];
  var CATEGORY_COLORS = ['var(--accent)', 'var(--blue-300)', 'var(--navy-700)', 'var(--slate-200)'];

  var STATUS_LABELS = {
    being_fixed: ['Being Fixed', 'status-progress'],
    waiting_on_vendor: ['Waiting on Vendor', 'status-pending'],
    scheduled: ['Scheduled', 'status-scheduled'],
    fixed: ['Fixed', 'status-resolved']
  };

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str == null ? '' : String(str);
    return div.innerHTML;
  }

  function orgInitials(name) {
    if (!name) return '--';
    var words = name.trim().split(/\s+/).slice(0, 2);
    return words.map(function (w) { return w[0].toUpperCase(); }).join('');
  }

  function formatShortDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-IN', { month: 'short', day: '2-digit' });
  }

  function daysAgo(dateStr) {
    var days = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
    if (days <= 0) return 'Today';
    if (days === 1) return '1 day ago';
    return days + ' days ago';
  }

  function renderHeader(profile, organization) {
    var avatar = document.getElementById('org-avatar');
    var name = document.getElementById('org-chip-name');
    var role = document.getElementById('org-chip-role');
    var welcome = document.getElementById('dash-welcome');

    if (avatar) avatar.textContent = orgInitials(organization.name);
    if (name) name.textContent = organization.name;
    if (role) role.textContent = profile.designation || profile.role;
    if (welcome) welcome.textContent = 'Welcome back, ' + organization.name;
  }

  function renderSubscription(organization) {
    var el = document.getElementById('sub-panel-info');
    if (!el) return;
    var planName = organization.plans ? organization.plans.name : null;
    var text = organization.name + (planName ? ' (' + planName + ' Plan)' : ' — no plan selected yet');
    if (organization.subscription_renewal_date) {
      text += ' · Renews ' + new Date(organization.subscription_renewal_date).toLocaleDateString('en-IN', {
        year: 'numeric', month: 'short', day: 'numeric'
      });
    }
    el.textContent = text;
  }

  function renderKpis(kpis, equipment, tickets) {
    var sportsEl = document.getElementById('kpi-sports-value');
    var equipEl = document.getElementById('kpi-equipment-value');
    var maintainedEl = document.getElementById('kpi-maintained-value');
    var maintainedTrendEl = document.getElementById('kpi-maintained-trend');
    var attentionEl = document.getElementById('kpi-attention-value');
    var attentionTrendEl = document.getElementById('kpi-attention-trend');
    var badge = document.getElementById('maintenance-badge');

    if (sportsEl) sportsEl.textContent = kpis.sports_covered_count;
    if (equipEl) equipEl.textContent = kpis.equipment_count;

    var maintained = equipment.filter(function (e) { return e.last_maintained_at; });
    if (maintained.length) {
      maintained.sort(function (a, b) { return new Date(b.last_maintained_at) - new Date(a.last_maintained_at); });
      if (maintainedEl) maintainedEl.textContent = daysAgo(maintained[0].last_maintained_at);
      if (maintainedTrendEl) maintainedTrendEl.textContent = maintained[0].name + ' serviced';
    } else {
      if (maintainedEl) maintainedEl.textContent = 'No data yet';
      if (maintainedTrendEl) maintainedTrendEl.textContent = '';
    }

    if (attentionEl) attentionEl.textContent = kpis.needs_attention_count;
    if (attentionTrendEl) {
      if (kpis.needs_attention_count === 0) {
        attentionTrendEl.textContent = 'All caught up';
      } else {
        var waiting = tickets.filter(function (t) { return t.status === 'waiting_on_vendor'; }).length;
        attentionTrendEl.textContent = waiting + (waiting === 1 ? ' waiting on a vendor' : ' waiting on a vendor');
      }
    }

    if (badge) {
      if (kpis.needs_attention_count > 0) {
        badge.textContent = kpis.needs_attention_count;
        badge.style.display = '';
      } else {
        badge.style.display = 'none';
      }
    }
  }

  function renderDonut(equipment) {
    var chart = document.getElementById('donut-chart');
    var legend = document.getElementById('donut-legend');
    var caption = document.getElementById('donut-caption');
    if (!chart) return;

    if (!equipment.length) {
      if (caption) caption.textContent = 'No equipment tracked yet';
      chart.style.background = 'var(--slate-200)';
      legend.innerHTML = '';
      return;
    }

    if (caption) caption.textContent = equipment.length + (equipment.length === 1 ? ' item, all tracked' : ' items, all tracked');

    var counts = {};
    CATEGORY_ORDER.forEach(function (c) { counts[c] = 0; });
    equipment.forEach(function (item) {
      if (counts.hasOwnProperty(item.category)) counts[item.category] += 1;
    });

    var total = equipment.length;
    var cumulative = 0;
    var gradientStops = [];
    var legendHtml = '';
    CATEGORY_ORDER.forEach(function (cat, i) {
      var pct = Math.round((counts[cat] / total) * 100);
      var start = cumulative;
      cumulative += pct;
      gradientStops.push(CATEGORY_COLORS[i] + ' ' + start + '% ' + cumulative + '%');
      legendHtml += '<li><span class="dot dot-' + (i + 1) + '"></span>' + CATEGORY_LABELS[cat] + ' <em>' + pct + '%</em></li>';
    });
    if (cumulative !== 100 && gradientStops.length) {
      gradientStops[gradientStops.length - 1] = gradientStops[gradientStops.length - 1].replace(/\d+%$/, '100%');
    }

    chart.style.background = 'conic-gradient(' + gradientStops.join(', ') + ')';
    legend.innerHTML = legendHtml;
  }

  function renderTickets(tickets) {
    var tbody = document.getElementById('tickets-tbody');
    if (!tbody) return;
    if (!tickets.length) {
      tbody.innerHTML = '<tr><td colspan="4">No open maintenance issues.</td></tr>';
      return;
    }
    tbody.innerHTML = tickets.map(function (t) {
      var statusInfo = STATUS_LABELS[t.status] || [t.status, ''];
      var equipmentName = (t.equipment && t.equipment.name) || '—';
      return '<tr>' +
        '<td>' + escapeHtml(equipmentName) + '</td>' +
        '<td>' + escapeHtml(t.location || '—') + '</td>' +
        '<td>' + escapeHtml(t.description) + '</td>' +
        '<td><span class="status ' + statusInfo[1] + '">' + escapeHtml(statusInfo[0]) + '</span></td>' +
        '</tr>';
    }).join('');
  }

  function renderSchedule(schedule) {
    var list = document.getElementById('schedule-list');
    if (!list) return;
    if (!schedule.length) {
      list.innerHTML = '<li>Nothing scheduled yet.</li>';
      return;
    }
    var sorted = schedule.slice().sort(function (a, b) {
      return new Date(a.scheduled_date) - new Date(b.scheduled_date);
    });
    list.innerHTML = sorted.map(function (s) {
      return '<li><span class="tl-date">' + formatShortDate(s.scheduled_date) + '</span>' +
        '<div><strong>' + escapeHtml(s.title) + '</strong><p>' + escapeHtml(s.description || '') + '</p></div></li>';
    }).join('');
  }

  function renderNotifications(notifications) {
    var bell = document.getElementById('notif-bell');
    var dot = document.getElementById('notif-dot');
    if (!bell) return;

    var unread = notifications.filter(function (n) { return !n.read; });
    if (dot) dot.style.display = unread.length ? '' : 'none';

    var panel = document.createElement('div');
    panel.className = 'notif-panel';
    panel.hidden = true;
    panel.innerHTML = notifications.length
      ? notifications.map(function (n) {
          return '<button type="button" class="notif-item' + (n.read ? '' : ' notif-item--unread') + '" data-notif-id="' + n.id + '">' +
            escapeHtml(n.message) + '</button>';
        }).join('')
      : '<p class="notif-empty">No notifications yet.</p>';

    bell.parentElement.style.position = 'relative';
    bell.insertAdjacentElement('afterend', panel);

    bell.addEventListener('click', function (e) {
      e.stopPropagation();
      panel.hidden = !panel.hidden;
    });
    document.addEventListener('click', function () {
      panel.hidden = true;
    });
    panel.addEventListener('click', function (e) {
      e.stopPropagation();
      var item = e.target.closest('[data-notif-id]');
      if (!item) return;
      window.Yoppi.markNotificationRead(item.dataset.notifId).then(function () {
        item.classList.remove('notif-item--unread');
        if (dot) dot.style.display = panel.querySelectorAll('.notif-item--unread').length ? '' : 'none';
      }).catch(function (err) {
        console.error('markNotificationRead failed', err);
      });
    });
  }

  window.Yoppi.getDashboardData().then(function (data) {
    renderHeader(data.profile, data.organization);
    renderSubscription(data.organization);
    renderKpis(data.kpis, data.equipment, data.maintenanceTickets);
    renderDonut(data.equipment);
    renderTickets(data.maintenanceTickets);
    renderSchedule(data.maintenanceSchedule);
    renderNotifications(data.notifications);
  }).catch(function (err) {
    console.error('Failed to load dashboard data', err);
    var welcome = document.getElementById('dash-welcome');
    if (welcome) welcome.textContent = 'We could not load your dashboard';
    var sub = document.querySelector('.dash-heading p');
    if (sub) {
      sub.textContent = (err && err.message) ||
        'Something went wrong. Try refreshing, or log out and back in. If this keeps happening, contact founder@yoppi.in.';
    }
  });
})();
