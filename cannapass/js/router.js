/* ═══════════════════════════════════════════
   CANNAPASS — Router
   Hash-based routing, sidebar generation,
   role-based page access
   ═══════════════════════════════════════════ */

const Router = (() => {
  let _initialized = false;

  // ─── Route Definitions by Role ───
  const ROUTES = {
    [ROLES.PATIENT]: [
      { id: 'dashboard', icon: '📊', label: 'Dashboard', section: 'Principal' },
      { id: 'cadastro', icon: '📋', label: 'Cadastro', section: 'Principal' },
      { id: 'documentos', icon: '📄', label: 'Documentos', section: 'Principal' },
      { id: 'viagem', icon: '✈️', label: 'Viagem', section: 'QR Code' },
      { id: 'qrcode', icon: '📱', label: 'Meu QR Code', section: 'QR Code' },
      { id: 'historico', icon: '🕐', label: 'Histórico', section: 'QR Code' }
    ],
    [ROLES.AGENT]: [
      { id: 'scanner', icon: '📷', label: 'Scanner', section: 'Verificação' },
      { id: 'busca', icon: '🔍', label: 'Busca Manual', section: 'Verificação' },
      { id: 'historico-agent', icon: '🕐', label: 'Histórico', section: 'Registros' },
      { id: 'guia', icon: '📖', label: 'Guia', section: 'Suporte' }
    ],
    [ROLES.ADMIN]: [
      { id: 'admin-dashboard', icon: '📊', label: 'Dashboard', section: 'Principal' },
      { id: 'cadastros', icon: '📋', label: 'Cadastros', section: 'Gestão' },
      { id: 'verificacoes', icon: '✅', label: 'Verificações', section: 'Gestão' },
      { id: 'qr-management', icon: '📱', label: 'QR Codes', section: 'Gestão' },
      { id: 'relatorios', icon: '📈', label: 'Relatórios', section: 'Sistema' },
      { id: 'usuarios', icon: '👥', label: 'Usuários', section: 'Sistema' }
    ]
  };

  // ─── Page Titles ───
  const PAGE_TITLES = {
    'dashboard': 'Dashboard',
    'cadastro': 'Cadastro',
    'documentos': 'Documentos',
    'viagem': 'Registrar Viagem',
    'qrcode': 'Meu QR Code',
    'historico': 'Histórico',
    'scanner': 'Scanner QR',
    'busca': 'Busca Manual',
    'historico-agent': 'Histórico de Verificações',
    'guia': 'Guia de Fiscalização',
    'admin-dashboard': 'Dashboard Admin',
    'cadastros': 'Gestão de Cadastros',
    'verificacoes': 'Log de Verificações',
    'qr-management': 'Gerenciar QR Codes',
    'relatorios': 'Relatórios',
    'usuarios': 'Usuários'
  };

  // ─── Portal Badges ───
  const PORTAL_BADGES = {
    [ROLES.PATIENT]: 'Portal do Paciente',
    [ROLES.AGENT]: 'Portal do Agente',
    [ROLES.ADMIN]: 'Painel Administrativo'
  };

  // ─── Initialize Router ───
  function init() {
    if (_initialized) {
      // Just navigate to current hash
      handleRoute();
      return;
    }
    _initialized = true;

    buildSidebar();
    updateUserInfo();

    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  // ─── Handle Route Change ───
  function handleRoute() {
    const hash = window.location.hash || '';

    // Public verification route: #/v/{token}
    if (hash.startsWith(PUBLIC_VERIFY_HASH)) {
      const token = hash.slice(PUBLIC_VERIFY_HASH.length);
      showPublicVerification(token);
      return;
    }

    const profile = State.get('profile');
    if (!profile) return;

    const role = profile.role;
    const routes = ROUTES[role];
    if (!routes) return;

    // Parse page from hash: #page or default to first route
    const page = hash.slice(1) || routes[0].id;

    // Verify access
    const hasAccess = routes.some(r => r.id === page);
    if (!hasAccess) {
      navigate(routes[0].id);
      return;
    }

    // Update state and UI
    State.set('currentPage', page);
    updateActiveNav(page);
    updateTopbar(page);
    renderPage(page, role);

    // Close mobile sidebar
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('sidebar-overlay')?.classList.remove('open');
  }

  // ─── Navigate to a page ───
  function navigate(pageId) {
    window.location.hash = pageId;
  }

  // ─── Build Sidebar Navigation ───
  function buildSidebar() {
    const profile = State.get('profile');
    if (!profile) return;

    const role = profile.role;
    const routes = ROUTES[role];
    const nav = document.getElementById('sidebar-nav');
    const badge = document.getElementById('sidebar-portal-badge');

    if (!nav || !routes) return;

    // Set portal badge
    if (badge) badge.textContent = PORTAL_BADGES[role] || '';

    // Group routes by section
    const sections = {};
    routes.forEach(route => {
      if (!sections[route.section]) sections[route.section] = [];
      sections[route.section].push(route);
    });

    let html = '';
    for (const [section, items] of Object.entries(sections)) {
      html += `<div class="sidebar-section-label">${sanitizeHTML(section)}</div>`;
      items.forEach(item => {
        html += `
          <button class="sidebar-nav-item" data-page="${item.id}" aria-label="${sanitizeHTML(item.label)}">
            <span class="sidebar-nav-icon">${item.icon}</span>
            <span class="sidebar-nav-label">${sanitizeHTML(item.label)}</span>
          </button>
        `;
      });
    }

    nav.innerHTML = html;

    // Click handlers
    nav.addEventListener('click', (e) => {
      const item = e.target.closest('.sidebar-nav-item');
      if (!item) return;
      navigate(item.dataset.page);
    });
  }

  // ─── Update Active Nav Item ───
  function updateActiveNav(page) {
    document.querySelectorAll('.sidebar-nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.page === page);
    });
  }

  // ─── Update Topbar ───
  function updateTopbar(page) {
    const title = document.getElementById('topbar-title');
    if (title) title.textContent = PAGE_TITLES[page] || '';
  }

  // ─── Update Sidebar User Info ───
  function updateUserInfo() {
    const profile = State.get('profile');
    if (!profile) return;

    const avatar = document.getElementById('sidebar-avatar');
    const name = document.getElementById('sidebar-user-name');
    const role = document.getElementById('sidebar-user-role');

    if (avatar) avatar.textContent = getInitials(profile.full_name);
    if (name) name.textContent = profile.full_name || 'Usuário';
    if (role) role.textContent = getRoleLabel(profile.role);
  }

  // ─── Render Page Content ───
  function renderPage(page, role) {
    const container = document.getElementById('main-content');
    if (!container) return;

    container.innerHTML = '';
    container.className = 'main-content animate-in';

    switch (role) {
      case ROLES.PATIENT:
        if (typeof Patient !== 'undefined') Patient.render(page, container);
        break;
      case ROLES.AGENT:
        if (typeof Agent !== 'undefined') Agent.render(page, container);
        break;
      case ROLES.ADMIN:
        if (typeof Admin !== 'undefined') Admin.render(page, container);
        break;
    }
  }

  // ─── Public Verification Page ───
  async function showPublicVerification(token) {
    document.getElementById('auth-container')?.classList.add('hidden');
    document.getElementById('app-container')?.classList.add('hidden');
    document.getElementById('loading-screen')?.classList.add('hidden');

    const publicContainer = document.getElementById('public-container');
    const publicDiv = document.getElementById('public-verification');
    if (!publicContainer || !publicDiv) return;

    publicContainer.classList.remove('hidden');

    publicDiv.innerHTML = `
      <div class="public-verification-card card">
        <div class="card-body text-center">
          <div class="spinner" style="margin: 0 auto 16px;"></div>
          <p class="text-muted">Verificando QR Code...</p>
        </div>
      </div>
    `;

    try {
      const { data, error } = await sb.rpc('verify_qr_token', {
        lookup_token: token
      });

      if (error) throw error;

      if (!data || data.length === 0) {
        renderPublicResult(publicDiv, null);
        return;
      }

      renderPublicResult(publicDiv, data[0]);
    } catch (err) {
      console.error('[Router] Public verification error:', err);
      publicDiv.innerHTML = `
        <div class="public-verification-card card">
          <div class="card-body text-center">
            <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
            <h3>Erro na Verificação</h3>
            <p class="text-muted mt-sm">Não foi possível verificar este QR Code. Tente novamente.</p>
          </div>
        </div>
      `;
    }
  }

  // ─── Render Public Verification Result ───
  function renderPublicResult(container, data) {
    if (!data) {
      container.innerHTML = `
        <div class="public-verification-card card">
          <div class="card-body text-center">
            <div style="font-size: 48px; margin-bottom: 16px;">❌</div>
            <h3>QR Code Inválido</h3>
            <p class="text-muted mt-sm">Este QR Code não foi encontrado no sistema Cannapass.</p>
          </div>
        </div>
      `;
      return;
    }

    const isExpired = data.qr_status !== 'active' || (data.departure_date && !isFutureDate(data.departure_date));
    const statusClass = isExpired ? 'expired' : 'valid';
    const statusIcon = isExpired ? '⚠️' : '✅';
    const statusText = isExpired ? 'QR Code Expirado' : 'QR Code Válido';
    const statusDesc = isExpired
      ? 'Este QR Code não é mais válido.'
      : 'Autorização verificada no sistema Cannapass.';

    container.innerHTML = `
      <div class="public-verification-card card">
        <div class="card-body">
          <!-- Header -->
          <div class="text-center mb-lg">
            <div style="font-size: 20px; margin-bottom: 8px;">🌿</div>
            <h4 style="color: var(--green);">Cannapass</h4>
            <p class="text-xs text-muted">Verificação Pública</p>
          </div>

          <!-- Status -->
          <div class="verification-result ${statusClass}">
            <div class="verification-status">
              <span class="verification-status-icon">${statusIcon}</span>
              <div class="verification-status-text">
                <h3>${statusText}</h3>
                <p>${statusDesc}</p>
              </div>
            </div>

            <div class="verification-data">
              <div class="verification-field">
                <label>Paciente</label>
                <span>${sanitizeHTML(data.patient_name || '—')}</span>
              </div>
              <div class="verification-field">
                <label>Status</label>
                <span>${getStatusLabel(data.registration_status)}</span>
              </div>
              <div class="verification-field">
                <label>Produto</label>
                <span>${sanitizeHTML(data.product_name || '—')}</span>
              </div>
              <div class="verification-field">
                <label>Quantidade Transporte</label>
                <span>${sanitizeHTML(data.transport_quantity || '—')}</span>
              </div>
              ${data.origin ? `
              <div class="verification-field">
                <label>Origem</label>
                <span>${sanitizeHTML(data.origin)}</span>
              </div>` : ''}
              ${data.destination ? `
              <div class="verification-field">
                <label>Destino</label>
                <span>${sanitizeHTML(data.destination)}</span>
              </div>` : ''}
              ${data.departure_date ? `
              <div class="verification-field">
                <label>Data da Viagem</label>
                <span>${formatDate(data.departure_date)}</span>
              </div>` : ''}
            </div>
          </div>

          <!-- Footer -->
          <p class="text-xs text-muted text-center mt-lg">
            Verificado em ${formatDateTime(new Date().toISOString())}<br>
            Sistema Cannapass — ANVISA RDC nº 327/2019
          </p>
        </div>
      </div>
    `;
  }

  return { init, navigate };
})();
