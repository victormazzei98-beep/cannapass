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
      { id: 'dashboard', icon: Icons.dashboard, label: 'Dashboard', section: 'Principal' },
      { id: 'cadastro', icon: Icons.cadastro, label: 'Cadastro', section: 'Principal' },
      { id: 'documentos', icon: Icons.documentos, label: 'Documentos', section: 'Principal' },
      { id: 'viagem', icon: Icons.viagem, label: 'Viagem', section: 'QR Code' },
      { id: 'qrcode', icon: Icons.qrcode, label: 'Meu QR Code', section: 'QR Code' },
      { id: 'historico', icon: Icons.historico, label: 'Histórico', section: 'QR Code' },
      { id: 'perfil', icon: Icons.perfil, label: 'Meu Perfil', section: 'Conta' }
    ],
    [ROLES.AGENT]: [
      { id: 'scanner', icon: Icons.scanner, label: 'Scanner', section: 'Verificação' },
      { id: 'busca', icon: Icons.busca, label: 'Busca Manual', section: 'Verificação' },
      { id: 'historico-agent', icon: Icons.historico, label: 'Histórico', section: 'Registros' },
      { id: 'guia', icon: Icons.guia, label: 'Guia', section: 'Suporte' }
    ],
    [ROLES.ADMIN]: [
      { id: 'admin-dashboard', icon: Icons.dashboard, label: 'Dashboard', section: 'Principal' },
      { id: 'cadastros', icon: Icons.cadastro, label: 'Cadastros', section: 'Gestão' },
      { id: 'verificacoes', icon: Icons.verificacoes, label: 'Verificações', section: 'Gestão' },
      { id: 'qr-management', icon: Icons.qrcode, label: 'QR Codes', section: 'Gestão' },
      { id: 'relatorios', icon: Icons.relatorios, label: 'Relatórios', section: 'Sistema' },
      { id: 'usuarios', icon: Icons.usuarios, label: 'Usuários', section: 'Sistema' }
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
    'perfil': 'Meu Perfil',
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
  function init(forceRebuild = false) {
    if (_initialized && !forceRebuild) {
      // Just navigate to current hash
      handleRoute();
      return;
    }

    if (forceRebuild) {
      // Clear hash so default page is loaded for new role
      window.location.hash = '';
    }

    _initialized = true;

    buildSidebar();
    updateUserInfo();
    renderLangToggle();

    window.removeEventListener('hashchange', handleRoute);
    window.addEventListener('hashchange', handleRoute);
    handleRoute();
  }

  // ─── Get the effective role (activeRole for admins, profile.role for others) ───
  function getEffectiveRole() {
    return State.get('activeRole') || State.get('profile')?.role;
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

    // Public verification search page: #/verificar
    if (hash === '#/verificar') {
      showPublicVerificationSearch();
      return;
    }

    const profile = State.get('profile');
    if (!profile) return;

    const role = getEffectiveRole();
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

    const role = getEffectiveRole();
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

    // Add "Switch Portal" button for admins
    if (profile.role === ROLES.ADMIN) {
      const otherPortal = role === ROLES.ADMIN ? 'Paciente' : 'Admin';
      const switchIcon = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/></svg>`;
      html += `
        <div class="sidebar-section-label" style="margin-top: auto;">Portal</div>
        <button class="sidebar-nav-item switch-portal-btn" aria-label="Trocar portal">
          <span class="sidebar-nav-icon">${switchIcon}</span>
          <span class="sidebar-nav-label">Trocar Portal</span>
        </button>
      `;
    }

    nav.innerHTML = html;

    // Click handler for nav items
    const clickHandler = (e) => {
      const item = e.target.closest('.sidebar-nav-item:not(.switch-portal-btn)');
      if (item) {
        navigate(item.dataset.page);
        return;
      }

      // Switch portal button
      const switchBtn = e.target.closest('.switch-portal-btn');
      if (switchBtn) {
        // Reset activeRole and show portal select
        State.set('activeRole', null);
        _initialized = false;
        document.getElementById('app-container')?.classList.add('hidden');
        Auth.showPortalSelect();
      }
    };

    // Replace listener (avoid stacking)
    const newNav = nav.cloneNode(false);
    newNav.innerHTML = html;
    nav.parentNode.replaceChild(newNav, nav);
    newNav.id = 'sidebar-nav';
    newNav.setAttribute('aria-label', 'Menu principal');
    newNav.addEventListener('click', clickHandler);
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

  // ─── Render Language Toggle (Agent portal only) ───
  function renderLangToggle() {
    const role = getEffectiveRole();
    const topbarRight = document.getElementById('topbar-right');
    if (!topbarRight) return;

    // Remove existing toggle
    document.getElementById('lang-toggle-btn')?.remove();

    // Only show for agent portal
    if (role !== ROLES.AGENT || typeof I18n === 'undefined') return;

    const btn = document.createElement('button');
    btn.id = 'lang-toggle-btn';
    btn.className = 'btn btn-sm btn-secondary';
    btn.style.cssText = 'font-weight:700;min-width:36px;padding:6px 10px;font-size:12px;';
    btn.textContent = I18n.lang() === 'pt' ? 'EN' : 'PT';
    btn.setAttribute('aria-label', 'Alternar idioma');
    btn.addEventListener('click', () => I18n.toggle());

    // Insert before notification bell (first child)
    topbarRight.insertBefore(btn, topbarRight.firstChild);
  }

  // ─── Render Page Content ───
  function renderPage(page, role) {
    const container = document.getElementById('main-content');
    if (!container) return;

    // Fade out, swap content, fade in
    container.classList.add('page-exit');
    const swap = () => {
      container.innerHTML = '';
      container.classList.remove('page-exit');
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

      // Focus main content for accessibility
      container.setAttribute('tabindex', '-1');
      container.focus({ preventScroll: true });
    };

    // Quick transition: if content is empty (first load), swap immediately
    if (!container.innerHTML.trim()) {
      swap();
    } else {
      requestAnimationFrame(() => setTimeout(swap, 120));
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

      if (!data || data.error || data.valid === false) {
        renderPublicResult(publicDiv, null);
        return;
      }

      renderPublicResult(publicDiv, data);
    } catch (err) {
      console.error('[Router] Public verification error:', err);
      publicDiv.innerHTML = `
        <div class="public-verification-card card">
          <div class="card-body text-center">
            <div class="empty-state-icon">${Icons.error}</div>
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
            <div class="empty-state-icon">${Icons.error}</div>
            <h3>QR Code Inválido</h3>
            <p class="text-muted mt-sm">Este QR Code não foi encontrado no sistema Cannapass.</p>
          </div>
        </div>
      `;
      return;
    }

    const isExpired = data.expired || !data.is_active || (data.departure_date && !isFutureDate(data.departure_date));
    const statusClass = isExpired ? 'expired' : 'valid';
    const statusIcon = isExpired ? Icons.warning : Icons.success;
    const statusText = isExpired ? 'QR Code Expirado' : 'QR Code Válido';
    const statusDesc = isExpired
      ? 'Este QR Code não é mais válido.'
      : 'Autorização verificada no sistema Cannapass.';

    const viaLabel = data.via === 'pharmacy' ? 'Farmácia / Associação' : data.via === 'hc' ? 'Habeas Corpus' : (data.via || '—');
    const transportLabel = data.transport_type ? getTransportLabel(data.transport_type) : '—';

    container.innerHTML = `
      <div class="public-verification-card card">
        <div class="card-body">
          <!-- Header -->
          <div class="text-center mb-lg">
            <div style="color: var(--green); margin-bottom: 8px;">${Icons.leaf}</div>
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
                <label>CPF</label>
                <span>${sanitizeHTML(data.cpf_masked || '—')}</span>
              </div>
              <div class="verification-field">
                <label>Via de Obtenção</label>
                <span>${sanitizeHTML(viaLabel)}</span>
              </div>
              <div class="verification-field">
                <label>Amparo Legal</label>
                <span>${sanitizeHTML(data.legal_reference || '—')}</span>
              </div>
              <div class="verification-field">
                <label>Produto</label>
                <span>${sanitizeHTML(data.product || '—')}</span>
              </div>
              <div class="verification-field">
                <label>Quantidade</label>
                <span>${sanitizeHTML(data.quantity || '—')}</span>
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
              ${data.transport_type ? `
              <div class="verification-field">
                <label>Transporte</label>
                <span>${transportLabel}</span>
              </div>` : ''}
              ${data.flight_or_bus ? `
              <div class="verification-field">
                <label>Voo / Linha</label>
                <span>${sanitizeHTML(data.flight_or_bus)}</span>
              </div>` : ''}
            </div>
          </div>

          <!-- Download PDF -->
          ${!isExpired ? `
          <button class="btn btn-primary btn-block mt-lg" id="download-pdf-btn">
            ${Icons.documentos} Baixar Comprovante em PDF
          </button>` : ''}

          <!-- Footer -->
          <p class="text-xs text-muted text-center mt-lg">
            Verificado em ${formatDateTime(new Date().toISOString())}<br>
            Sistema Cannapass — ANVISA RDC nº 327/2019
          </p>
        </div>
      </div>
    `;

    // ─── PDF Download Handler ───
    const pdfBtn = document.getElementById('download-pdf-btn');
    if (pdfBtn) {
      pdfBtn.addEventListener('click', () => generateVerificationPDF(data));
    }
  }

  // ─── Generate Verification PDF ───
  function generateVerificationPDF(data) {
    if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
      Toast.error('Erro ao carregar gerador de PDF.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('p', 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    const contentWidth = pageWidth - margin * 2;
    let y = 20;

    // ─── Helper: centered text ───
    const centerText = (text, yPos, size = 12, style = 'normal') => {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.text(text, pageWidth / 2, yPos, { align: 'center' });
    };

    // ─── Helper: labeled field ───
    const addField = (label, value, yPos) => {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(label, margin, yPos);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(String(value || '—'), margin, yPos + 5);
      return yPos + 14;
    };

    // ─── Helper: two-column field ───
    const addFieldRow = (label1, value1, label2, value2, yPos) => {
      const col2X = margin + contentWidth / 2 + 5;
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(label1, margin, yPos);
      doc.text(label2, col2X, yPos);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(30, 30, 30);
      doc.text(String(value1 || '—'), margin, yPos + 5);
      doc.text(String(value2 || '—'), col2X, yPos + 5);
      return yPos + 14;
    };

    // ═══ Header ═══
    doc.setFillColor(34, 197, 94); // green
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    centerText('CANNAPASS', 18, 22, 'bold');
    centerText('Comprovante de Autorização de Transporte', 28, 11, 'normal');
    centerText('Cannabis Medicinal — Verificação Digital', 34, 9, 'normal');

    y = 50;

    // ═══ Status Banner ═══
    const isValid = data.valid && !data.expired && data.is_active;
    if (isValid) {
      doc.setFillColor(220, 252, 231); // green-soft
      doc.setDrawColor(34, 197, 94);
    } else {
      doc.setFillColor(254, 226, 226); // red-soft
      doc.setDrawColor(239, 68, 68);
    }
    doc.roundedRect(margin, y, contentWidth, 14, 3, 3, 'FD');
    doc.setTextColor(isValid ? 22 : 185, isValid ? 101 : 28, isValid ? 52 : 28);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(isValid ? 'AUTORIZAÇÃO VÁLIDA' : 'AUTORIZAÇÃO EXPIRADA', pageWidth / 2, y + 9, { align: 'center' });

    y += 24;

    // ═══ Dados do Paciente ═══
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Dados do Paciente', margin, y);
    y += 2;
    doc.setDrawColor(34, 197, 94);
    doc.setLineWidth(0.5);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    y = addField('Nome Completo', data.patient_name, y);
    const viaLabel = data.via === 'pharmacy' ? 'Farmácia / Associação' : data.via === 'hc' ? 'Habeas Corpus' : (data.via || '—');
    y = addFieldRow('CPF', data.cpf_masked, 'Via de Obtenção', viaLabel, y);
    y = addField('Amparo Legal', data.legal_reference, y);
    y = addFieldRow('Produto', data.product, 'Quantidade', data.quantity, y);

    y += 4;

    // ═══ Dados da Viagem ═══
    if (data.origin || data.destination || data.departure_date) {
      doc.setTextColor(34, 197, 94);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Dados da Viagem', margin, y);
      y += 2;
      doc.setDrawColor(34, 197, 94);
      doc.line(margin, y, margin + contentWidth, y);
      y += 8;

      y = addFieldRow('Origem', data.origin, 'Destino', data.destination, y);
      const transportLabel = data.transport_type ? getTransportLabel(data.transport_type) : '—';
      y = addFieldRow('Data de Partida', formatDate(data.departure_date), 'Transporte', transportLabel, y);
      if (data.flight_or_bus) {
        y = addField('Voo / Linha', data.flight_or_bus, y);
      }

      y += 4;
    }

    // ═══ Validade ═══
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('Validade', margin, y);
    y += 2;
    doc.setDrawColor(34, 197, 94);
    doc.line(margin, y, margin + contentWidth, y);
    y += 8;

    y = addFieldRow('Emitido em', formatDateTime(data.created_at), 'Válido até', formatDateTime(data.expires_at), y);
    if (data.registration_id) {
      y = addField('Nº Registro', data.registration_id, y);
    }

    // ═══ Footer ═══
    y = doc.internal.pageSize.getHeight() - 30;
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.3);
    doc.line(margin, y, margin + contentWidth, y);
    y += 6;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(150, 150, 150);
    centerText('Este documento foi gerado automaticamente pelo sistema Cannapass.', y);
    y += 4;
    centerText('Resolução ANVISA RDC nº 327/2019 — Lei nº 11.343/2006', y);
    y += 4;
    centerText(`Verificação em: ${formatDateTime(new Date().toISOString())}`, y);
    y += 4;
    centerText('cannapass.vercel.app', y);

    // ─── Download ───
    const fileName = `cannapass-${(data.patient_name || 'paciente').replace(/\s+/g, '_').toLowerCase()}-${dayjs().format('YYYY-MM-DD')}.pdf`;
    doc.save(fileName);
  }

  // ─── Public Verification Search Page ───
  function showPublicVerificationSearch() {
    document.getElementById('auth-container')?.classList.add('hidden');
    document.getElementById('app-container')?.classList.add('hidden');
    document.getElementById('loading-screen')?.classList.add('hidden');

    const publicContainer = document.getElementById('public-container');
    const publicDiv = document.getElementById('public-verification');
    if (!publicContainer || !publicDiv) return;

    publicContainer.classList.remove('hidden');

    publicDiv.innerHTML = `
      <div class="public-verification-card card" style="max-width:520px;margin:40px auto;">
        <div class="card-body">
          <!-- Header -->
          <div class="text-center mb-lg">
            <div style="color: var(--green); margin-bottom: 8px;">${Icons.leaf}</div>
            <h3 style="color: var(--green);">Cannapass</h3>
            <p class="text-sm text-muted mt-sm">Verificação Pública de Autorização</p>
          </div>

          <div style="padding:12px 16px;border-radius:8px;background:rgba(34,197,94,0.08);border:1px solid rgba(34,197,94,0.2);margin-bottom:20px;">
            <p class="text-sm" style="margin:0;">
              ${Icons.shield} Esta página permite que qualquer autoridade verifique a validade de uma autorização de transporte de cannabis medicinal.
            </p>
          </div>

          <div class="form-group">
            <label class="form-label" for="public-token-input">Token do QR Code</label>
            <input class="form-input" type="text" id="public-token-input"
              placeholder="Cole ou digite o token do QR Code aqui"
              style="font-size:15px;padding:12px 14px;"
              autocomplete="off" spellcheck="false">
            <span class="form-hint">O token está impresso abaixo do QR Code ou na URL do link.</span>
          </div>

          <button class="btn btn-primary btn-block mt-md" id="public-verify-btn">
            ${Icons.verificar || Icons.shield} Verificar Autorização
          </button>

          <div id="public-search-result" class="mt-lg"></div>

          <div class="text-center mt-lg">
            <p class="text-xs text-muted">
              Sistema Cannapass — ANVISA RDC nº 327/2019<br>
              Verificação segura e em tempo real
            </p>
            <a href="#" class="text-xs" style="color:var(--green);" onclick="window.location.hash='';window.location.reload();">Ir para o login</a>
          </div>
        </div>
      </div>
    `;

    // Bind events
    const input = document.getElementById('public-token-input');
    const btn = document.getElementById('public-verify-btn');

    btn?.addEventListener('click', () => {
      const token = extractPublicToken(input?.value?.trim());
      if (!token) {
        Toast.warning('Informe o token do QR Code.');
        return;
      }
      performPublicSearch(token);
    });

    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') btn?.click();
    });

    // Auto-focus
    input?.focus();
  }

  function extractPublicToken(input) {
    if (!input) return null;
    // Handle full URL: https://cannapass.vercel.app/#/v/TOKEN
    const hashMatch = input.match(/#\/v\/(.+)/);
    if (hashMatch) return hashMatch[1];
    // Handle path: /v/TOKEN
    const pathMatch = input.match(/\/v\/(.+)/);
    if (pathMatch) return pathMatch[1];
    // Otherwise treat as raw token
    return input;
  }

  let _lastPublicSearch = 0;
  const PUBLIC_SEARCH_COOLDOWN = 3000; // 3 seconds between searches

  async function performPublicSearch(token) {
    const resultArea = document.getElementById('public-search-result');
    if (!resultArea) return;

    const now = Date.now();
    if (now - _lastPublicSearch < PUBLIC_SEARCH_COOLDOWN) {
      const secs = Math.ceil((PUBLIC_SEARCH_COOLDOWN - (now - _lastPublicSearch)) / 1000);
      Toast.warning(`Aguarde ${secs}s antes de verificar novamente.`);
      return;
    }
    _lastPublicSearch = now;

    resultArea.innerHTML = `
      <div class="text-center">
        <div class="spinner" style="margin:0 auto 12px;"></div>
        <p class="text-muted">Verificando...</p>
      </div>
    `;

    try {
      const { data, error } = await sb.rpc('verify_qr_token', { lookup_token: token });

      if (error) throw error;

      if (!data || data.error || data.valid === false) {
        renderPublicResult(resultArea, null);
        return;
      }

      renderPublicResult(resultArea, data);
    } catch (err) {
      console.error('[Router] Public search error:', err);
      resultArea.innerHTML = `
        <div class="verification-result" style="margin-top:16px;">
          <div class="verification-status">
            <span class="verification-status-icon">${Icons.error}</span>
            <div class="verification-status-text">
              <h4>Erro na Verificação</h4>
              <p class="text-sm text-muted">Não foi possível verificar. Verifique sua conexão e tente novamente.</p>
            </div>
          </div>
        </div>
      `;
    }
  }

  return { init, navigate, showPublicVerification, showPublicVerificationSearch };
})();
