/* ═══════════════════════════════════════════
   CANNAPASS — Admin Portal
   Dashboard, patient management, verifications,
   QR management, reports, users
   ═══════════════════════════════════════════ */

const Admin = (() => {
  function render(page, container) {
    switch (page) {
      case 'admin-dashboard': renderDashboard(container); break;
      case 'cadastros': renderCadastros(container); break;
      case 'verificacoes': renderVerificacoes(container); break;
      case 'qr-management': renderQRManagement(container); break;
      case 'relatorios': renderRelatorios(container); break;
      case 'usuarios': renderUsuarios(container); break;
      default: renderDashboard(container);
    }
  }

  // ─── Dashboard ───
  function renderDashboard(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Dashboard Administrativo</h2>
        <p>Visão geral da plataforma Cannapass</p>
      </div>

      <div class="stats-grid" id="admin-stats">
        <div class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <div class="stat-value" id="stat-patients">—</div>
            <div class="stat-label">Pacientes Cadastrados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">⏳</div>
          <div class="stat-info">
            <div class="stat-value" id="stat-pending">—</div>
            <div class="stat-label">Aguardando Aprovação</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">✅</div>
          <div class="stat-info">
            <div class="stat-value" id="stat-verified">—</div>
            <div class="stat-label">Verificações Hoje</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">📱</div>
          <div class="stat-info">
            <div class="stat-value" id="stat-qr-active">—</div>
            <div class="stat-label">QR Codes Ativos</div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Cadastros por Mês</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-registrations"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">Distribuição por Status</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-status"></canvas>
            </div>
          </div>
        </div>
      </div>
    `;

    loadAdminStats();
  }

  async function loadAdminStats() {
    try {
      const [patientsRes, pendingRes, qrRes, verificationsRes] = await Promise.all([
        sb.from('patients').select('id', { count: 'exact', head: true }),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('qr_codes').select('id', { count: 'exact', head: true }).eq('status', 'active'),
        sb.from('verifications').select('id', { count: 'exact', head: true })
          .gte('created_at', dayjs().startOf('day').toISOString())
      ]);

      const el = (id) => document.getElementById(id);
      if (el('stat-patients')) el('stat-patients').textContent = patientsRes.count ?? 0;
      if (el('stat-pending')) el('stat-pending').textContent = pendingRes.count ?? 0;
      if (el('stat-qr-active')) el('stat-qr-active').textContent = qrRes.count ?? 0;
      if (el('stat-verified')) el('stat-verified').textContent = verificationsRes.count ?? 0;
    } catch (err) {
      console.error('[Admin] Stats load error:', err);
    }
  }

  // ─── Cadastros ───
  function renderCadastros(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Gestão de Cadastros</h2>
        <p>Revise e aprove cadastros de pacientes</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">📋</div>
            <h4>Nenhum cadastro pendente</h4>
            <p>Cadastros de pacientes aparecerão aqui quando houver novos registros.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Verificações ───
  function renderVerificacoes(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Log de Verificações</h2>
        <p>Todas as verificações realizadas por agentes</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">✅</div>
            <h4>Nenhuma verificação registrada</h4>
            <p>O log de verificações aparecerá aqui.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── QR Management ───
  function renderQRManagement(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Gerenciar QR Codes</h2>
        <p>Ative ou desative QR Codes</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">📱</div>
            <h4>Nenhum QR Code</h4>
            <p>QR Codes gerados aparecerão aqui.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Relatórios ───
  function renderRelatorios(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Relatórios</h2>
        <p>Exporte dados em CSV ou PDF</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">📈</div>
            <h4>Em construção</h4>
            <p>Export CSV e PDF será implementado na Fase 4.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Usuários ───
  function renderUsuarios(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Usuários</h2>
        <p>Gerencie perfis e roles</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">👥</div>
            <h4>Em construção</h4>
            <p>A gestão de usuários será implementada na Fase 4.</p>
          </div>
        </div>
      </div>
    `;
  }

  return { render };
})();
