/* ═══════════════════════════════════════════
   CANNAPASS — In-App Notifications
   Bell icon, notification panel, Supabase
   Realtime subscription, mark-as-read
   ═══════════════════════════════════════════ */

const Notifications = (() => {
  let _channel = null;
  let _unreadCount = 0;

  // ─── Initialize ───
  function init() {
    renderBell();
    loadUnreadCount();
    subscribeRealtime();
  }

  // ─── Destroy (on logout) ───
  function destroy() {
    if (_channel) {
      sb.removeChannel(_channel);
      _channel = null;
    }
    _unreadCount = 0;
  }

  // ─── Render Bell Button + Panel ───
  function renderBell() {
    const topbarRight = document.getElementById('topbar-right');
    if (!topbarRight || document.getElementById('notif-bell-btn')) return;

    const bellIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>`;

    const bellBtn = document.createElement('button');
    bellBtn.id = 'notif-bell-btn';
    bellBtn.className = 'notif-bell-btn';
    bellBtn.setAttribute('aria-label', 'Notificações');
    bellBtn.innerHTML = `${bellIcon}<span class="notif-badge hidden" id="notif-badge">0</span>`;

    const panel = document.createElement('div');
    panel.id = 'notif-panel';
    panel.className = 'notif-panel hidden';
    panel.innerHTML = `
      <div class="notif-panel-header">
        <strong>Notificações</strong>
        <button class="btn btn-sm btn-secondary" id="notif-mark-all">Marcar lidas</button>
      </div>
      <div class="notif-panel-body" id="notif-panel-body">
        <div class="flex-center"><div class="spinner"></div></div>
      </div>
    `;

    // Insert bell before theme toggle (first child of topbar-right)
    topbarRight.insertBefore(panel, topbarRight.firstChild);
    topbarRight.insertBefore(bellBtn, topbarRight.firstChild);

    // Toggle panel
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isOpen = !panel.classList.contains('hidden');
      panel.classList.toggle('hidden');
      if (!isOpen) loadNotifications();
    });

    // Close on outside click
    document.addEventListener('click', (e) => {
      if (!panel.contains(e.target) && e.target !== bellBtn && !bellBtn.contains(e.target)) {
        panel.classList.add('hidden');
      }
    });

    // Mark all read
    document.getElementById('notif-mark-all')?.addEventListener('click', markAllRead);
  }

  // ─── Load Unread Count ───
  async function loadUnreadCount() {
    const userId = State.get('user')?.id;
    if (!userId) return;

    try {
      const { count, error } = await sb
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('read', false);

      if (!error) {
        _unreadCount = count || 0;
        updateBadge();
      }
    } catch (e) {
      console.warn('[Notifications] Count error:', e);
    }
  }

  // ─── Update Badge Display ───
  function updateBadge() {
    const badge = document.getElementById('notif-badge');
    if (!badge) return;

    if (_unreadCount > 0) {
      badge.textContent = _unreadCount > 99 ? '99+' : _unreadCount;
      badge.classList.remove('hidden');
    } else {
      badge.classList.add('hidden');
    }
  }

  // ─── Load Notifications List ───
  async function loadNotifications() {
    const body = document.getElementById('notif-panel-body');
    if (!body) return;

    const userId = State.get('user')?.id;
    if (!userId) return;

    try {
      const { data, error } = await sb
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      if (!data || data.length === 0) {
        body.innerHTML = `
          <div class="notif-empty">
            <p class="text-muted text-sm">Nenhuma notificação</p>
          </div>
        `;
        return;
      }

      body.innerHTML = data.map(n => {
        const typeIcons = {
          success: Icons.success,
          error: Icons.error,
          warning: Icons.warning,
          info: Icons.info
        };
        const icon = typeIcons[n.type] || typeIcons.info;
        const timeAgo = dayjs(n.created_at).fromNow ? dayjs(n.created_at).fromNow() : formatDate(n.created_at);

        return `
          <div class="notif-item ${n.read ? '' : 'notif-unread'}" data-id="${n.id}">
            <div class="notif-item-icon notif-type-${n.type || 'info'}">${icon}</div>
            <div class="notif-item-content">
              <div class="notif-item-title">${sanitizeHTML(n.title)}</div>
              <div class="notif-item-body">${sanitizeHTML(n.body)}</div>
              <div class="notif-item-time">${timeAgo}</div>
            </div>
            ${!n.read ? '<div class="notif-dot"></div>' : ''}
          </div>
        `;
      }).join('');

      // Click to navigate if action_url
      body.querySelectorAll('.notif-item').forEach(item => {
        item.addEventListener('click', async () => {
          const notif = data.find(n => n.id === item.dataset.id);
          if (notif && !notif.read) {
            await sb.from('notifications').update({ read: true }).eq('id', notif.id);
            _unreadCount = Math.max(0, _unreadCount - 1);
            updateBadge();
            item.classList.remove('notif-unread');
            item.querySelector('.notif-dot')?.remove();
          }
          if (notif?.action_url) {
            document.getElementById('notif-panel')?.classList.add('hidden');
            window.location.hash = notif.action_url;
          }
        });
      });

    } catch (e) {
      console.error('[Notifications] Load error:', e);
      body.innerHTML = '<p class="text-muted text-sm" style="padding:16px;">Erro ao carregar.</p>';
    }
  }

  // ─── Mark All as Read ───
  async function markAllRead() {
    const userId = State.get('user')?.id;
    if (!userId) return;

    try {
      await sb.from('notifications')
        .update({ read: true })
        .eq('user_id', userId)
        .eq('read', false);

      _unreadCount = 0;
      updateBadge();
      loadNotifications();
    } catch (e) {
      console.warn('[Notifications] Mark read error:', e);
    }
  }

  // ─── Subscribe to Realtime ───
  function subscribeRealtime() {
    const userId = State.get('user')?.id;
    if (!userId) return;

    _channel = sb
      .channel('notifications-' + userId)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        const notif = payload.new;
        _unreadCount++;
        updateBadge();
        Toast.info(notif.title || 'Nova notificação');
      })
      .subscribe();
  }

  // ─── Create Notification (for admin use) ───
  async function create(userId, title, body, type = 'info', actionUrl = null) {
    try {
      await sb.from('notifications').insert({
        user_id: userId,
        title,
        body,
        type,
        action_url: actionUrl,
        read: false
      });
    } catch (e) {
      console.warn('[Notifications] Create error:', e);
    }
  }

  return { init, destroy, create };
})();
