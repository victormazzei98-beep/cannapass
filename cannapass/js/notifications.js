/* ═══════════════════════════════════════════
   CANNAPASS — In-App Notifications
   Bell icon, notification panel, real-time
   ═══════════════════════════════════════════ */

const Notifications = (() => {
  let _unreadCount = 0;
  let _panelOpen = false;
  let _subscription = null;

  // ─── Initialize (call after auth) ───
  function init() {
    renderBell();
    loadUnreadCount();
    subscribeRealtime();
  }

  // ─── Cleanup (call on logout) ───
  function destroy() {
    if (_subscription) {
      sb.removeChannel(_subscription);
      _subscription = null;
    }
    _unreadCount = 0;
    _panelOpen = false;
  }

  // ─── Render Bell Icon in Topbar ───
  function renderBell() {
    const topbarRight = document.getElementById('topbar-right');
    if (!topbarRight) return;

    // Don't duplicate
    if (document.getElementById('notif-bell-btn')) return;

    topbarRight.innerHTML = `
      <button class="notif-bell-btn" id="notif-bell-btn" aria-label="Notificações">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
          <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
        </svg>
        <span class="notif-badge hidden" id="notif-badge">0</span>
      </button>
      <div class="notif-panel hidden" id="notif-panel">
        <div class="notif-panel-header">
          <h4>Notificações</h4>
          <button class="btn btn-sm btn-secondary" id="notif-mark-all">Marcar todas lidas</button>
        </div>
        <div class="notif-panel-body" id="notif-list">
          <div class="flex-center" style="padding:1rem;"><div class="spinner"></div></div>
        </div>
      </div>
    ` + topbarRight.innerHTML;

    // Toggle panel
    document.getElementById('notif-bell-btn').addEventListener('click', (e) => {
      e.stopPropagation();
      togglePanel();
    });

    // Close panel on outside click
    document.addEventListener('click', (e) => {
      if (_panelOpen && !e.target.closest('#notif-panel') && !e.target.closest('#notif-bell-btn')) {
        closePanel();
      }
    });

    // Mark all read
    document.getElementById('notif-mark-all')?.addEventListener('click', markAllRead);
  }

  // ─── Toggle Panel ───
  function togglePanel() {
    _panelOpen = !_panelOpen;
    const panel = document.getElementById('notif-panel');
    if (!panel) return;

    if (_panelOpen) {
      panel.classList.remove('hidden');
      loadNotifications();
    } else {
      panel.classList.add('hidden');
    }
  }

  function closePanel() {
    _panelOpen = false;
    document.getElementById('notif-panel')?.classList.add('hidden');
  }

  // ─── Load Unread Count ───
  async function loadUnreadCount() {
    try {
      const userId = State.get('user')?.id;
      if (!userId) return;

      const { count } = await sb.from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      updateBadge(count ?? 0);
    } catch (err) {
      console.warn('[Notif] Count error:', err);
    }
  }

  // ─── Load Notifications List ───
  async function loadNotifications() {
    const listEl = document.getElementById('notif-list');
    if (!listEl) return;

    try {
      const userId = State.get('user')?.id;
      if (!userId) return;

      const { data: notifs } = await sb.from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!notifs?.length) {
        listEl.innerHTML = `
          <div class="notif-empty">
            <p class="text-muted text-sm">Nenhuma notificação</p>
          </div>
        `;
        return;
      }

      const typeIcons = {
        success: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#22c55e" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>',
        error: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>',
        warning: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#eab308" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
        info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#3b82f6" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>'
      };

      listEl.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'notif-unread'}" data-notif-id="${n.id}" ${n.action_url ? `data-url="${sanitizeHTML(n.action_url)}"` : ''}>
          <div class="notif-icon">${typeIcons[n.type] || typeIcons.info}</div>
          <div class="notif-content">
            <div class="notif-title">${sanitizeHTML(n.title)}</div>
            ${n.body ? `<div class="notif-body">${sanitizeHTML(n.body)}</div>` : ''}
            <div class="notif-time">${formatRelative(n.created_at)}</div>
          </div>
          ${!n.read ? '<div class="notif-dot"></div>' : ''}
        </div>
      `).join('');

      // Click handler — mark as read + navigate
      listEl.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', async () => {
          const notifId = item.dataset.notifId;
          const url = item.dataset.url;

          // Mark as read
          if (item.classList.contains('notif-unread')) {
            item.classList.remove('notif-unread');
            item.querySelector('.notif-dot')?.remove();
            await sb.from('notifications').update({ read: true }).eq('id', notifId);
            _unreadCount = Math.max(0, _unreadCount - 1);
            updateBadge(_unreadCount);
          }

          // Navigate if action URL
          if (url) {
            closePanel();
            window.location.hash = url;
          }
        });
      });

    } catch (err) {
      console.warn('[Notif] Load error:', err);
      listEl.innerHTML = '<p class="text-muted text-sm" style="padding:1rem;">Erro ao carregar.</p>';
    }
  }

  // ─── Mark All Read ───
  async function markAllRead() {
    try {
      const userId = State.get('user')?.id;
      if (!userId) return;

      await sb.from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      updateBadge(0);
      // Refresh list
      document.querySelectorAll('.notif-unread').forEach(el => {
        el.classList.remove('notif-unread');
        el.querySelector('.notif-dot')?.remove();
      });
      Toast.info('Todas as notificações marcadas como lidas.');
    } catch (err) {
      console.warn('[Notif] Mark all error:', err);
    }
  }

  // ─── Update Badge ───
  function updateBadge(count) {
    _unreadCount = count;
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // ─── Subscribe to Real-time Notifications ───
  function subscribeRealtime() {
    const userId = State.get('user')?.id;
    if (!userId) return;

    _subscription = sb
      .channel('notif-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        _unreadCount++;
        updateBadge(_unreadCount);

        // Show toast for new notification
        const n = payload.new;
        if (n?.title) {
          const toastType = n.type === 'error' ? 'error' : n.type === 'warning' ? 'warning' : n.type === 'success' ? 'success' : 'info';
          Toast[toastType](n.title);
        }

        // Refresh list if panel is open
        if (_panelOpen) loadNotifications();
      })
      .subscribe();
  }

  // ─── Create notification (for admin use from JS) ───
  async function create(userId, title, body = '', type = 'info', actionUrl = '') {
    try {
      await sb.from('notifications').insert({
        user_id: userId,
        title,
        body,
        type,
        action_url: actionUrl
      });
    } catch (err) {
      console.warn('[Notif] Create error:', err);
    }
  }

  return { init, destroy, create, loadUnreadCount };
})();
