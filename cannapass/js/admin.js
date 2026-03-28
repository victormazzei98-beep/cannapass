/* ═══════════════════════════════════════════
   CANNAPASS — Admin Portal
   Dashboard, patient management, verifications,
   QR management, reports, users
   ═══════════════════════════════════════════ */

const Admin = (() => {
  // ─── Local State ───
  let chartRegistrations = null;
  let chartStatus = null;
  let cadastrosPage = 0;
  let cadastrosFilters = { status: '', via: '', search: '' };
  let verificacoesPage = 0;
  let qrPage = 0;
  let usuariosPage = 0;

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

  // ═══════════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════════
  function renderDashboard(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Dashboard Administrativo</h2>
        <p>Visão geral da plataforma Cannapass</p>
      </div>

      <div class="stats-grid" id="admin-stats">
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-patients']}</div>
          <div class="stat-info">
            <div class="stat-value" id="stat-patients">—</div>
            <div class="stat-label">Pacientes Cadastrados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-pending']}</div>
          <div class="stat-info">
            <div class="stat-value" id="stat-pending">—</div>
            <div class="stat-label">Aguardando Aprovação</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-verified']}</div>
          <div class="stat-info">
            <div class="stat-value" id="stat-verified">—</div>
            <div class="stat-label">Verificações Hoje</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-qr']}</div>
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
    loadCharts();
  }

  async function loadAdminStats() {
    try {
      const [patientsRes, pendingRes, qrRes, verificationsRes] = await Promise.all([
        sb.from('patients').select('id', { count: 'exact', head: true }),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('qr_codes').select('id', { count: 'exact', head: true }).eq('is_active', true),
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

  async function loadCharts() {
    try {
      // Destroy previous instances
      if (chartRegistrations) { chartRegistrations.destroy(); chartRegistrations = null; }
      if (chartStatus) { chartStatus.destroy(); chartStatus = null; }

      // ─── Registrations by month (last 6 months) ───
      const months = [];
      for (let i = 5; i >= 0; i--) {
        months.push(dayjs().subtract(i, 'month'));
      }

      const monthLabels = months.map(m => m.format('MMM/YY'));
      const monthCounts = [];

      for (const m of months) {
        const start = m.startOf('month').toISOString();
        const end = m.endOf('month').toISOString();
        const { count } = await sb.from('patients')
          .select('id', { count: 'exact', head: true })
          .gte('created_at', start)
          .lte('created_at', end);
        monthCounts.push(count ?? 0);
      }

      const regCanvas = document.getElementById('chart-registrations');
      if (regCanvas) {
        chartRegistrations = new Chart(regCanvas, {
          type: 'bar',
          data: {
            labels: monthLabels,
            datasets: [{
              label: 'Cadastros',
              data: monthCounts,
              backgroundColor: '#22c55e88',
              borderColor: '#22c55e',
              borderWidth: 1,
              borderRadius: 6
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
              y: {
                beginAtZero: true,
                ticks: { stepSize: 1, color: '#9ca3af' },
                grid: { color: '#ffffff10' }
              },
              x: {
                ticks: { color: '#9ca3af' },
                grid: { display: false }
              }
            }
          }
        });
      }

      // ─── Status distribution ───
      const [approvedRes, pendingRes, rejectedRes, expiredRes] = await Promise.all([
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'expired')
      ]);

      const statusCanvas = document.getElementById('chart-status');
      if (statusCanvas) {
        chartStatus = new Chart(statusCanvas, {
          type: 'doughnut',
          data: {
            labels: ['Aprovado', 'Pendente', 'Rejeitado', 'Expirado'],
            datasets: [{
              data: [
                approvedRes.count ?? 0,
                pendingRes.count ?? 0,
                rejectedRes.count ?? 0,
                expiredRes.count ?? 0
              ],
              backgroundColor: ['#22c55e', '#eab308', '#ef4444', '#6b7280'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
              legend: {
                position: 'bottom',
                labels: { color: '#9ca3af', padding: 16 }
              }
            }
          }
        });
      }
    } catch (err) {
      console.error('[Admin] Charts error:', err);
    }
  }

  // ═══════════════════════════════════════════
  //  CADASTROS (Patient Management)
  // ═══════════════════════════════════════════
  function renderCadastros(container) {
    cadastrosPage = 0;
    container.innerHTML = `
      <div class="page-header">
        <h2>Gestão de Cadastros</h2>
        <p>Revise e aprove cadastros de pacientes</p>
      </div>

      <div class="card">
        <div class="card-header">
          <div class="filters-bar">
            <select id="filter-status" class="form-select">
              <option value="">Todos os Status</option>
              <option value="pending">Pendente</option>
              <option value="approved">Aprovado</option>
              <option value="rejected">Rejeitado</option>
              <option value="expired">Expirado</option>
            </select>
            <select id="filter-via" class="form-select">
              <option value="">Todas as Vias</option>
              <option value="pharmacy">Farmácia</option>
              <option value="hc">Habeas Corpus</option>
            </select>
            <input type="text" id="filter-search" class="form-input" placeholder="Buscar por nome ou CPF..." style="max-width:260px;">
          </div>
        </div>
        <div class="card-body" id="cadastros-content">
          <div class="flex-center"><div class="spinner"></div></div>
        </div>
        <div class="card-footer" id="cadastros-pagination"></div>
      </div>

      <div id="cadastro-detail-area"></div>
    `;

    // Bind filters
    const applyFilters = debounce(() => {
      cadastrosFilters.status = document.getElementById('filter-status').value;
      cadastrosFilters.via = document.getElementById('filter-via').value;
      cadastrosFilters.search = document.getElementById('filter-search').value.trim();
      cadastrosPage = 0;
      loadCadastros();
    }, 300);

    document.getElementById('filter-status').addEventListener('change', applyFilters);
    document.getElementById('filter-via').addEventListener('change', applyFilters);
    document.getElementById('filter-search').addEventListener('input', applyFilters);

    loadCadastros();
  }

  async function loadCadastros() {
    const content = document.getElementById('cadastros-content');
    if (!content) return;

    content.innerHTML = '<div class="flex-center"><div class="spinner"></div></div>';

    try {
      const from = cadastrosPage * PAGINATION.PAGE_SIZE;
      const to = from + PAGINATION.PAGE_SIZE - 1;

      let query = sb.from('patients').select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (cadastrosFilters.status) query = query.eq('status', cadastrosFilters.status);
      if (cadastrosFilters.via) query = query.eq('via', cadastrosFilters.via);
      if (cadastrosFilters.search) {
        const s = cadastrosFilters.search;
        // Search by name or CPF
        const digits = s.replace(/\D/g, '');
        if (digits.length >= 3) {
          query = query.or(`cpf.ilike.%${digits}%,full_name.ilike.%${s}%`);
        } else {
          query = query.ilike('full_name', `%${s}%`);
        }
      }

      const { data: patients, error, count } = await query;

      if (error) throw error;

      if (!patients?.length) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${Icons['empty-clipboard']}</div>
            <h4>Nenhum cadastro encontrado</h4>
            <p>Nenhum paciente corresponde aos filtros selecionados.</p>
          </div>
        `;
        updatePagination('cadastros-pagination', 0);
        return;
      }

      function maskCPFPartial(cpf) {
        const d = cpf?.replace(/\D/g, '') || '';
        if (d.length < 11) return cpf || '—';
        return `***.***. ${d.slice(6, 9)}-${d.slice(9)}`;
      }

      content.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>CPF</th>
              <th>Via</th>
              <th>Status</th>
              <th>Data</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${patients.map(p => `
              <tr>
                <td>${sanitizeHTML(p.full_name)}</td>
                <td><code>${maskCPFPartial(p.cpf)}</code></td>
                <td>${getViaLabel(p.via) || '—'}</td>
                <td><span class="badge badge-${getStatusBadgeType(p.status)}">${getStatusLabel(p.status)}</span></td>
                <td>${formatDate(p.created_at)}</td>
                <td>
                  <button class="btn btn-sm btn-secondary cadastro-view-btn" data-id="${p.id}">Ver</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // Bind view buttons
      content.querySelectorAll('.cadastro-view-btn').forEach(btn => {
        btn.addEventListener('click', () => showCadastroDetail(btn.dataset.id));
      });

      updatePagination('cadastros-pagination', count || 0);

    } catch (err) {
      console.error('[Admin] Cadastros error:', err);
      content.innerHTML = '<p class="text-muted text-center">Erro ao carregar cadastros.</p>';
    }
  }

  async function showCadastroDetail(patientId) {
    const area = document.getElementById('cadastro-detail-area');
    if (!area) return;

    area.innerHTML = `
      <div class="card mt-md">
        <div class="card-body text-center">
          <div class="spinner"></div>
          <p class="mt-sm text-muted">Carregando detalhes...</p>
        </div>
      </div>
    `;

    try {
      const [patientRes, docsRes] = await Promise.all([
        sb.from('patients').select('*').eq('id', patientId).single(),
        sb.from('documents').select('*').eq('patient_id', patientId).order('created_at')
      ]);

      if (patientRes.error) throw patientRes.error;
      const p = patientRes.data;
      const docs = docsRes.data || [];

      // Get signed URLs for documents
      const docsWithUrls = await Promise.all(docs.map(async (doc) => {
        try {
          const { data } = await sb.storage.from(STORAGE_BUCKET).createSignedUrl(doc.file_path, SIGNED_URL_EXPIRY);
          return { ...doc, signedUrl: data?.signedUrl };
        } catch {
          return { ...doc, signedUrl: null };
        }
      }));

      const docTypeLabels = {
        'identity': 'Documento de Identidade',
        'prescription': 'Prescrição Médica',
        'judicial_decision': 'Decisão Judicial',
        'medical_report': 'Relatório Médico',
        'other': 'Outro'
      };

      area.innerHTML = `
        <div class="card mt-md">
          <div class="card-header">
            <h3 class="card-title">Detalhes — ${sanitizeHTML(p.full_name)}</h3>
            <button class="btn btn-sm btn-secondary" id="close-detail-btn">Fechar</button>
          </div>
          <div class="card-body">
            <!-- Status -->
            <div class="mb-md">
              <span class="badge badge-${getStatusBadgeType(p.status)}" style="font-size: 14px; padding: 6px 16px;">
                ${getStatusLabel(p.status)}
              </span>
              ${p.rejection_reason ? `<p class="text-sm text-muted mt-sm"><strong>Motivo da rejeição:</strong> ${sanitizeHTML(p.rejection_reason)}</p>` : ''}
            </div>

            <!-- Dados Pessoais -->
            <h4 class="mb-sm">Dados Pessoais</h4>
            <div class="detail-grid">
              <div class="detail-item"><label>Nome Completo</label><span>${sanitizeHTML(p.full_name)}</span></div>
              <div class="detail-item"><label>CPF</label><span>${maskCPF(p.cpf || '')}</span></div>
              <div class="detail-item"><label>Data de Nascimento</label><span>${formatDate(p.date_of_birth)}</span></div>
              <div class="detail-item"><label>Email</label><span>${sanitizeHTML(p.email || '—')}</span></div>
              <div class="detail-item"><label>Telefone</label><span>${sanitizeHTML(p.phone || '—')}</span></div>
              <div class="detail-item"><label>Via</label><span>${getViaLabel(p.via) || '—'}</span></div>
            </div>

            <div class="divider"></div>

            <!-- Via-specific data -->
            ${p.via === 'pharmacy' ? `
              <h4 class="mb-sm">Dados da Prescrição</h4>
              <div class="detail-grid">
                <div class="detail-item"><label>Médico</label><span>${sanitizeHTML(p.doctor_name || '—')}</span></div>
                <div class="detail-item"><label>CRM</label><span>${sanitizeHTML(p.doctor_crm || '—')}</span></div>
                <div class="detail-item"><label>Validade</label><span>${formatDate(p.prescription_validity)}</span></div>
              </div>
            ` : p.via === 'hc' ? `
              <h4 class="mb-sm">Dados do Habeas Corpus</h4>
              <div class="detail-grid">
                <div class="detail-item"><label>Nº Processo</label><span>${sanitizeHTML(p.process_number || '—')}</span></div>
                <div class="detail-item"><label>Vara/Tribunal</label><span>${sanitizeHTML(p.court || '—')}</span></div>
                <div class="detail-item"><label>Validade HC</label><span>${formatDate(p.hc_validity)}</span></div>
              </div>
            ` : ''}

            <div class="divider"></div>

            <!-- Produto -->
            <h4 class="mb-sm">Produto</h4>
            <div class="detail-grid">
              <div class="detail-item"><label>Tipo</label><span>${sanitizeHTML(p.product_type || '—')}</span></div>
              <div class="detail-item"><label>Nome</label><span>${sanitizeHTML(p.product_name || '—')}</span></div>
              <div class="detail-item"><label>Dosagem</label><span>${sanitizeHTML(p.dosage || '—')}</span></div>
              <div class="detail-item"><label>Quantidade Total</label><span>${sanitizeHTML(p.total_quantity || '—')}</span></div>
              <div class="detail-item"><label>Qtd. Transporte</label><span>${sanitizeHTML(p.transport_quantity || '—')}</span></div>
            </div>

            <div class="divider"></div>

            <!-- Documentos -->
            <h4 class="mb-sm">Documentos (${docsWithUrls.length})</h4>
            ${docsWithUrls.length === 0 ? '<p class="text-muted">Nenhum documento enviado.</p>' : `
              <div class="docs-grid">
                ${docsWithUrls.map(doc => `
                  <div class="doc-card">
                    <div class="doc-card-icon">${Icons.documentos}</div>
                    <div class="doc-card-info">
                      <strong>${docTypeLabels[doc.doc_type] || doc.doc_type}</strong>
                      <span class="text-sm text-muted">${sanitizeHTML(doc.file_name)} — ${formatFileSize(doc.file_size || 0)}</span>
                    </div>
                    ${doc.signedUrl ? `<a href="${doc.signedUrl}" target="_blank" class="btn btn-sm btn-secondary">Visualizar</a>` : '<span class="text-muted text-sm">Indisponível</span>'}
                  </div>
                `).join('')}
              </div>
            `}

            <!-- Actions -->
            ${p.status === 'pending' ? `
              <div class="divider"></div>
              <div class="detail-actions">
                <button class="btn btn-success" id="approve-btn" data-id="${p.id}">Aprovar Cadastro</button>
                <button class="btn btn-danger" id="reject-btn" data-id="${p.id}">Rejeitar Cadastro</button>
              </div>
            ` : ''}
          </div>
        </div>
      `;

      // Bind events
      document.getElementById('close-detail-btn')?.addEventListener('click', () => {
        area.innerHTML = '';
      });

      document.getElementById('approve-btn')?.addEventListener('click', () => approvePatient(patientId));
      document.getElementById('reject-btn')?.addEventListener('click', () => rejectPatient(patientId));

      // Scroll to detail
      area.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('[Admin] Detail error:', err);
      area.innerHTML = '<div class="card mt-md"><div class="card-body"><p class="text-muted">Erro ao carregar detalhes.</p></div></div>';
    }
  }

  async function approvePatient(patientId) {
    const confirmed = await Modal.open({
      title: 'Aprovar Cadastro',
      body: 'Confirma a aprovação deste cadastro? O paciente poderá gerar QR Codes.',
      confirmText: 'Aprovar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      const adminId = State.get('user')?.id;
      const { error } = await sb.from('patients').update({
        status: 'approved',
        validated_at: new Date().toISOString(),
        validated_by: adminId
      }).eq('id', patientId);

      if (error) throw error;

      Toast.success('Cadastro aprovado com sucesso!');
      document.getElementById('cadastro-detail-area').innerHTML = '';
      loadCadastros();
    } catch (err) {
      console.error('[Admin] Approve error:', err);
      Toast.error('Erro ao aprovar cadastro.');
    }
  }

  async function rejectPatient(patientId) {
    const area = document.getElementById('cadastro-detail-area');
    // Show rejection modal with textarea
    const confirmed = await Modal.open({
      title: 'Rejeitar Cadastro',
      body: `
        <p>Informe o motivo da rejeição:</p>
        <textarea id="rejection-reason-input" class="form-input" rows="4"
          placeholder="Descreva o motivo da rejeição..." style="margin-top:8px;width:100%;resize:vertical;"></textarea>
      `,
      confirmText: 'Rejeitar',
      cancelText: 'Cancelar',
      danger: true
    });

    if (!confirmed) return;

    const reason = document.getElementById('rejection-reason-input')?.value?.trim();
    if (!reason) {
      Toast.warning('O motivo da rejeição é obrigatório.');
      return;
    }

    try {
      const adminId = State.get('user')?.id;
      const { error } = await sb.from('patients').update({
        status: 'rejected',
        validated_at: new Date().toISOString(),
        validated_by: adminId,
        rejection_reason: reason
      }).eq('id', patientId);

      if (error) throw error;

      Toast.success('Cadastro rejeitado.');
      if (area) area.innerHTML = '';
      loadCadastros();
    } catch (err) {
      console.error('[Admin] Reject error:', err);
      Toast.error('Erro ao rejeitar cadastro.');
    }
  }

  // ═══════════════════════════════════════════
  //  VERIFICAÇÕES LOG
  // ═══════════════════════════════════════════
  function renderVerificacoes(container) {
    verificacoesPage = 0;
    container.innerHTML = `
      <div class="page-header">
        <h2>Log de Verificações</h2>
        <p>Todas as verificações realizadas por agentes</p>
      </div>
      <div class="card">
        <div class="card-body" id="verificacoes-content">
          <div class="flex-center"><div class="spinner"></div></div>
        </div>
        <div class="card-footer" id="verificacoes-pagination"></div>
      </div>
    `;

    loadVerificacoes();
  }

  async function loadVerificacoes() {
    const content = document.getElementById('verificacoes-content');
    if (!content) return;

    content.innerHTML = '<div class="flex-center"><div class="spinner"></div></div>';

    try {
      const from = verificacoesPage * PAGINATION.PAGE_SIZE;
      const to = from + PAGINATION.PAGE_SIZE - 1;

      const { data, error, count } = await sb.from('verifications')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!data?.length) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${Icons['empty-check']}</div>
            <h4>Nenhuma verificação registrada</h4>
            <p>O log de verificações aparecerá aqui.</p>
          </div>
        `;
        updatePagination('verificacoes-pagination', 0);
        return;
      }

      const resultBadge = (r) => {
        const map = {
          valid: { type: 'success', label: 'Válido' },
          invalid: { type: 'danger', label: 'Inválido' },
          expired: { type: 'warning', label: 'Expirado' },
          suspicious: { type: 'danger', label: 'Suspeito' }
        };
        const info = map[r] || { type: 'neutral', label: r };
        return `<span class="badge badge-${info.type}">${info.label}</span>`;
      };

      content.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Data/Hora</th>
              <th>Agente</th>
              <th>Paciente</th>
              <th>Resultado</th>
              <th>Local</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(v => `
              <tr>
                <td>${formatDateTime(v.created_at)}</td>
                <td>${sanitizeHTML(v.agent_name)}</td>
                <td>${sanitizeHTML(v.patient_name || '—')}</td>
                <td>${resultBadge(v.result)}</td>
                <td>${sanitizeHTML(v.agent_location || '—')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      updatePagination('verificacoes-pagination', count || 0);

    } catch (err) {
      console.error('[Admin] Verificações error:', err);
      content.innerHTML = '<p class="text-muted text-center">Erro ao carregar verificações.</p>';
    }
  }

  // ═══════════════════════════════════════════
  //  QR MANAGEMENT
  // ═══════════════════════════════════════════
  function renderQRManagement(container) {
    qrPage = 0;
    container.innerHTML = `
      <div class="page-header">
        <h2>Gerenciar QR Codes</h2>
        <p>Ative ou desative QR Codes</p>
      </div>
      <div class="card">
        <div class="card-body" id="qr-content">
          <div class="flex-center"><div class="spinner"></div></div>
        </div>
        <div class="card-footer" id="qr-pagination"></div>
      </div>
    `;

    loadQRCodes();
  }

  async function loadQRCodes() {
    const content = document.getElementById('qr-content');
    if (!content) return;

    content.innerHTML = '<div class="flex-center"><div class="spinner"></div></div>';

    try {
      const from = qrPage * PAGINATION.PAGE_SIZE;
      const to = from + PAGINATION.PAGE_SIZE - 1;

      const { data, error, count } = await sb.from('qr_codes')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!data?.length) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${Icons['empty-qr']}</div>
            <h4>Nenhum QR Code</h4>
            <p>QR Codes gerados aparecerão aqui.</p>
          </div>
        `;
        updatePagination('qr-pagination', 0);
        return;
      }

      function qrStatus(qr) {
        const now = new Date();
        if (!qr.is_active) return { label: 'Inativo', type: 'neutral' };
        if (qr.expires_at && new Date(qr.expires_at) < now) return { label: 'Expirado', type: 'warning' };
        return { label: 'Ativo', type: 'success' };
      }

      content.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Paciente</th>
              <th>Token</th>
              <th>Via</th>
              <th>Produto</th>
              <th>Status</th>
              <th>Criado em</th>
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(qr => {
              const st = qrStatus(qr);
              return `
                <tr>
                  <td>${sanitizeHTML(qr.patient_name)}</td>
                  <td><code title="${sanitizeHTML(qr.token)}">${sanitizeHTML(qr.token.slice(0, 12))}…</code></td>
                  <td>${getViaLabel(qr.via) || '—'}</td>
                  <td>${sanitizeHTML(qr.product || '—')}</td>
                  <td><span class="badge badge-${st.type}">${st.label}</span></td>
                  <td>${formatDate(qr.created_at)}</td>
                  <td>
                    <button class="btn btn-sm ${qr.is_active ? 'btn-danger' : 'btn-success'} qr-toggle-btn"
                      data-id="${qr.id}" data-active="${qr.is_active}">
                      ${qr.is_active ? 'Desativar' : 'Ativar'}
                    </button>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      `;

      // Bind toggle buttons
      content.querySelectorAll('.qr-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => toggleQR(btn.dataset.id, btn.dataset.active === 'true'));
      });

      updatePagination('qr-pagination', count || 0);

    } catch (err) {
      console.error('[Admin] QR error:', err);
      content.innerHTML = '<p class="text-muted text-center">Erro ao carregar QR Codes.</p>';
    }
  }

  async function toggleQR(qrId, currentlyActive) {
    const action = currentlyActive ? 'desativar' : 'ativar';
    const confirmed = await Modal.open({
      title: `${currentlyActive ? 'Desativar' : 'Ativar'} QR Code`,
      body: `Confirma que deseja ${action} este QR Code?`,
      confirmText: currentlyActive ? 'Desativar' : 'Ativar',
      danger: currentlyActive
    });

    if (!confirmed) return;

    try {
      const { error } = await sb.from('qr_codes').update({ is_active: !currentlyActive }).eq('id', qrId);
      if (error) throw error;
      Toast.success(`QR Code ${currentlyActive ? 'desativado' : 'ativado'} com sucesso.`);
      loadQRCodes();
    } catch (err) {
      console.error('[Admin] Toggle QR error:', err);
      Toast.error('Erro ao alterar status do QR Code.');
    }
  }

  // ═══════════════════════════════════════════
  //  RELATÓRIOS
  // ═══════════════════════════════════════════
  function renderRelatorios(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Relatórios</h2>
        <p>Exporte dados em CSV ou PDF</p>
      </div>

      <div class="stats-grid" id="report-stats">
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-patients']}</div>
          <div class="stat-info">
            <div class="stat-value" id="report-total">—</div>
            <div class="stat-label">Total de Cadastros</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-verified']}</div>
          <div class="stat-info">
            <div class="stat-value" id="report-approved">—</div>
            <div class="stat-label">Aprovados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-pending']}</div>
          <div class="stat-info">
            <div class="stat-value" id="report-pending">—</div>
            <div class="stat-label">Pendentes</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons.error}</div>
          <div class="stat-info">
            <div class="stat-value" id="report-rejected">—</div>
            <div class="stat-label">Rejeitados</div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Exportar Dados</h3>
        </div>
        <div class="card-body">
          <p class="text-muted mb-md">Exporte os dados de cadastros de pacientes nos formatos disponíveis.</p>
          <div class="btn-group">
            <button class="btn btn-primary" id="export-csv-btn">${Icons.relatorios} Exportar CSV</button>
            <button class="btn btn-secondary" id="export-pdf-btn">${Icons.documentos} Exportar PDF</button>
          </div>
        </div>
      </div>
    `;

    loadReportStats();

    document.getElementById('export-csv-btn').addEventListener('click', exportCSV);
    document.getElementById('export-pdf-btn').addEventListener('click', exportPDF);
  }

  async function loadReportStats() {
    try {
      const [totalRes, approvedRes, pendingRes, rejectedRes] = await Promise.all([
        sb.from('patients').select('id', { count: 'exact', head: true }),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'rejected')
      ]);

      const el = (id) => document.getElementById(id);
      if (el('report-total')) el('report-total').textContent = totalRes.count ?? 0;
      if (el('report-approved')) el('report-approved').textContent = approvedRes.count ?? 0;
      if (el('report-pending')) el('report-pending').textContent = pendingRes.count ?? 0;
      if (el('report-rejected')) el('report-rejected').textContent = rejectedRes.count ?? 0;
    } catch (err) {
      console.error('[Admin] Report stats error:', err);
    }
  }

  async function exportCSV() {
    try {
      Toast.info('Gerando CSV...');
      const { data, error } = await sb.from('patients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (!data?.length) { Toast.warning('Nenhum dado para exportar.'); return; }

      const headers = ['Nome', 'CPF', 'Email', 'Telefone', 'Via', 'Produto', 'Quantidade Transporte', 'Status', 'Data Cadastro'];
      const rows = data.map(p => [
        p.full_name || '',
        p.cpf || '',
        p.email || '',
        p.phone || '',
        getViaLabel(p.via) || '',
        p.product_name || '',
        p.transport_quantity || '',
        getStatusLabel(p.status),
        formatDate(p.created_at)
      ]);

      const escapeCSV = (val) => {
        const str = String(val);
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const csv = [
        headers.map(escapeCSV).join(','),
        ...rows.map(row => row.map(escapeCSV).join(','))
      ].join('\n');

      const BOM = '\uFEFF';
      const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cannapass-cadastros-${dayjs().format('YYYY-MM-DD')}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      Toast.success('CSV exportado com sucesso!');
    } catch (err) {
      console.error('[Admin] CSV export error:', err);
      Toast.error('Erro ao exportar CSV.');
    }
  }

  async function exportPDF() {
    try {
      Toast.info('Gerando PDF...');
      const { data, error } = await sb.from('patients').select('*').order('created_at', { ascending: false });
      if (error) throw error;
      if (!data?.length) { Toast.warning('Nenhum dado para exportar.'); return; }

      const doc = new jspdf.jsPDF();

      // Header
      doc.setFontSize(18);
      doc.setTextColor(34, 197, 94);
      doc.text('Cannapass', 14, 20);
      doc.setFontSize(12);
      doc.setTextColor(100);
      doc.text('Relatório de Cadastros', 14, 28);
      doc.setFontSize(9);
      doc.text(`Gerado em: ${formatDateTime(new Date().toISOString())}`, 14, 34);

      // Table
      const tableData = data.map(p => [
        p.full_name || '',
        (p.cpf || '').replace(/\D/g, '').replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4'),
        getViaLabel(p.via) || '',
        p.product_name || '',
        p.transport_quantity || '',
        getStatusLabel(p.status),
        formatDate(p.created_at)
      ]);

      doc.autoTable({
        startY: 40,
        head: [['Nome', 'CPF', 'Via', 'Produto', 'Qtd.', 'Status', 'Data']],
        body: tableData,
        styles: { fontSize: 8, cellPadding: 3 },
        headStyles: { fillColor: [34, 197, 94], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        didDrawPage: function (data) {
          // Footer with page number
          doc.setFontSize(8);
          doc.setTextColor(150);
          doc.text(
            `Cannapass — Página ${doc.internal.getCurrentPageInfo().pageNumber}`,
            doc.internal.pageSize.getWidth() / 2,
            doc.internal.pageSize.getHeight() - 10,
            { align: 'center' }
          );
        }
      });

      doc.save(`cannapass-relatorio-${dayjs().format('YYYY-MM-DD')}.pdf`);
      Toast.success('PDF exportado com sucesso!');
    } catch (err) {
      console.error('[Admin] PDF export error:', err);
      Toast.error('Erro ao exportar PDF.');
    }
  }

  // ═══════════════════════════════════════════
  //  USUÁRIOS
  // ═══════════════════════════════════════════
  function renderUsuarios(container) {
    usuariosPage = 0;
    container.innerHTML = `
      <div class="page-header">
        <h2>Usuários</h2>
        <p>Gerencie perfis e roles</p>
      </div>
      <div class="card">
        <div class="card-body" id="usuarios-content">
          <div class="flex-center"><div class="spinner"></div></div>
        </div>
        <div class="card-footer" id="usuarios-pagination"></div>
      </div>
    `;

    loadUsuarios();
  }

  async function loadUsuarios() {
    const content = document.getElementById('usuarios-content');
    if (!content) return;

    content.innerHTML = '<div class="flex-center"><div class="spinner"></div></div>';

    try {
      const from = usuariosPage * PAGINATION.PAGE_SIZE;
      const to = from + PAGINATION.PAGE_SIZE - 1;

      const { data, error, count } = await sb.from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!data?.length) {
        content.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${Icons['empty-users']}</div>
            <h4>Nenhum usuário</h4>
            <p>Usuários aparecerão aqui quando se cadastrarem.</p>
          </div>
        `;
        updatePagination('usuarios-pagination', 0);
        return;
      }

      const roleBadgeType = (role) => {
        const map = { patient: 'neutral', agent: 'warning', admin: 'danger' };
        return map[role] || 'neutral';
      };

      content.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Nome</th>
              <th>Email</th>
              <th>Role</th>
              <th>Organização</th>
              <th>Criado em</th>
              <th>Alterar Role</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(u => `
              <tr>
                <td>${sanitizeHTML(u.full_name || '—')}</td>
                <td>${sanitizeHTML(u.email || '—')}</td>
                <td><span class="badge badge-${roleBadgeType(u.role)}">${getRoleLabel(u.role)}</span></td>
                <td>${sanitizeHTML(u.organization || '—')}</td>
                <td>${formatDate(u.created_at)}</td>
                <td>
                  <select class="form-select form-select-sm role-select" data-user-id="${u.id}" data-current="${u.role}">
                    <option value="patient" ${u.role === 'patient' ? 'selected' : ''}>Paciente</option>
                    <option value="agent" ${u.role === 'agent' ? 'selected' : ''}>Agente</option>
                    <option value="admin" ${u.role === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;

      // Bind role change
      content.querySelectorAll('.role-select').forEach(select => {
        select.addEventListener('change', async (e) => {
          const userId = e.target.dataset.userId;
          const currentRole = e.target.dataset.current;
          const newRole = e.target.value;

          if (newRole === currentRole) return;

          const confirmed = await Modal.open({
            title: 'Alterar Role',
            body: `Alterar role para <strong>${getRoleLabel(newRole)}</strong>?`,
            confirmText: 'Confirmar',
            danger: newRole === 'admin'
          });

          if (!confirmed) {
            e.target.value = currentRole;
            return;
          }

          try {
            const { error } = await sb.from('profiles').update({ role: newRole }).eq('id', userId);
            if (error) throw error;
            Toast.success('Role atualizada com sucesso!');
            e.target.dataset.current = newRole;
          } catch (err) {
            console.error('[Admin] Role change error:', err);
            Toast.error('Erro ao alterar role.');
            e.target.value = currentRole;
          }
        });
      });

      updatePagination('usuarios-pagination', count || 0);

    } catch (err) {
      console.error('[Admin] Usuarios error:', err);
      content.innerHTML = '<p class="text-muted text-center">Erro ao carregar usuários.</p>';
    }
  }

  // ═══════════════════════════════════════════
  //  PAGINATION HELPER
  // ═══════════════════════════════════════════
  function updatePagination(containerId, totalCount) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const totalPages = Math.ceil(totalCount / PAGINATION.PAGE_SIZE);
    let currentPage = 0;

    // Determine which page var to use
    if (containerId === 'cadastros-pagination') currentPage = cadastrosPage;
    else if (containerId === 'verificacoes-pagination') currentPage = verificacoesPage;
    else if (containerId === 'qr-pagination') currentPage = qrPage;
    else if (containerId === 'usuarios-pagination') currentPage = usuariosPage;

    if (totalPages <= 1) {
      container.innerHTML = totalCount > 0 ? `<span class="text-sm text-muted">${totalCount} registro(s)</span>` : '';
      return;
    }

    container.innerHTML = `
      <div class="pagination">
        <button class="btn btn-sm btn-secondary pagination-prev" ${currentPage === 0 ? 'disabled' : ''}>Anterior</button>
        <span class="text-sm text-muted">Página ${currentPage + 1} de ${totalPages} (${totalCount} registros)</span>
        <button class="btn btn-sm btn-secondary pagination-next" ${currentPage >= totalPages - 1 ? 'disabled' : ''}>Próxima</button>
      </div>
    `;

    const reload = () => {
      if (containerId === 'cadastros-pagination') loadCadastros();
      else if (containerId === 'verificacoes-pagination') loadVerificacoes();
      else if (containerId === 'qr-pagination') loadQRCodes();
      else if (containerId === 'usuarios-pagination') loadUsuarios();
    };

    container.querySelector('.pagination-prev')?.addEventListener('click', () => {
      if (containerId === 'cadastros-pagination') cadastrosPage--;
      else if (containerId === 'verificacoes-pagination') verificacoesPage--;
      else if (containerId === 'qr-pagination') qrPage--;
      else if (containerId === 'usuarios-pagination') usuariosPage--;
      reload();
    });

    container.querySelector('.pagination-next')?.addEventListener('click', () => {
      if (containerId === 'cadastros-pagination') cadastrosPage++;
      else if (containerId === 'verificacoes-pagination') verificacoesPage++;
      else if (containerId === 'qr-pagination') qrPage++;
      else if (containerId === 'usuarios-pagination') usuariosPage++;
      reload();
    });
  }

  // ─── Public API ───
  return { render };
})();
