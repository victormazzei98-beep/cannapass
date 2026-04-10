/* ═══════════════════════════════════════════
   CANNAPASS — Patient Portal
   Dashboard, 5-step registration, documents,
   travel, QR code, history
   ═══════════════════════════════════════════ */

const Patient = (() => {
  // ─── Wizard State ───
  let wizardStep = 1;
  let wizardData = {
    full_name: '', cpf: '', birth_date: '', email: '', phone: '',
    via_type: '',
    // Pharmacy fields
    doctor_name: '', doctor_crm: '', prescription_validity: '',
    // HC fields
    hc_number: '', salvo_conduto: '', court: '',
    documents: {}
  };
  let uploadedFiles = {};
  let isRenewalMode = false;
  let _dashboardRefreshTimer = null;

  function render(page, container) {
    switch (page) {
      case 'dashboard': renderDashboard(container); break;
      case 'cadastro': renderCadastro(container); break;
      case 'documentos': renderDocumentos(container); break;
      case 'viagem': renderViagem(container); break;
      case 'qrcode': renderQRCode(container); break;
      case 'historico': renderHistorico(container); break;
      case 'perfil': renderPerfil(container); break;
      default: renderDashboard(container);
    }
  }

  // ═══════════════════════════════════════
  //  DASHBOARD
  // ═══════════════════════════════════════
  function renderDashboard(container) {
    const patient = State.get('patient');
    const profile = State.get('profile');
    const status = patient?.status || 'none';

    container.innerHTML = `
      <div class="page-header">
        <h2>Bem-vindo, ${sanitizeHTML(profile?.full_name?.split(' ')[0] || 'Paciente')}</h2>
        <p>Acompanhe seu cadastro e gerencie seus QR Codes</p>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-status']}</div>
          <div class="stat-info">
            <div class="stat-value">${status === 'none' ? 'Não iniciado' : getStatusLabel(status)}</div>
            <div class="stat-label">Status do Cadastro</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-docs']}</div>
          <div class="stat-info">
            <div class="stat-value" id="doc-count"><span class="skeleton-text">--</span></div>
            <div class="stat-label">Documentos Enviados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-qr']}</div>
          <div class="stat-info">
            <div class="stat-value" id="qr-count"><span class="skeleton-text">--</span></div>
            <div class="stat-label">QR Codes Ativos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-travel']}</div>
          <div class="stat-info">
            <div class="stat-value" id="trip-count"><span class="skeleton-text">--</span></div>
            <div class="stat-label">Viagens Registradas</div>
          </div>
        </div>
      </div>

      <div class="cards-grid">
        <div class="card">
          <div class="card-header"><h3 class="card-title">Próximos Passos</h3></div>
          <div class="card-body">
            ${status === 'none' || !patient ? `
              <div class="empty-state">
                <div class="empty-state-icon">${Icons['empty-clipboard']}</div>
                <h4>Comece seu cadastro</h4>
                <p>Preencha seus dados para obter seu QR Code de transporte.</p>
                <button class="btn btn-primary mt-md" onclick="Router.navigate('cadastro')">Iniciar Cadastro</button>
              </div>
            ` : status === STATUS.DRAFT ? `
              <div class="empty-state">
                <div class="empty-state-icon">${Icons['empty-clipboard']}</div>
                <h4>Continue seu cadastro</h4>
                <p>Seu cadastro está incompleto. Continue de onde parou.</p>
                <button class="btn btn-primary mt-md" onclick="Router.navigate('cadastro')">Continuar Cadastro</button>
              </div>
            ` : status === STATUS.PENDING ? `
              <div class="empty-state">
                <div class="empty-state-icon">${Icons['empty-clock']}</div>
                <h4>Cadastro em Análise</h4>
                <p>Seu cadastro está sendo analisado pela equipe Cannapass. Você será notificado quando for aprovado.</p>
              </div>
            ` : status === STATUS.RENEWAL_PENDING ? `
              <div class="empty-state">
                <div class="empty-state-icon">${Icons['empty-clock']}</div>
                <h4>Renovacao em Analise</h4>
                <p>Sua renovacao esta sendo analisada pela equipe Cannapass. Voce sera notificado quando for aprovada.</p>
              </div>
            ` : status === STATUS.APPROVED ? `
              <div class="empty-state">
                <div class="empty-state-icon">${Icons['empty-check']}</div>
                <h4>Cadastro Aprovado!</h4>
                ${(() => {
                  const validity = patient?.via === 'pharmacy' ? patient?.prescription_validity : null;
                  if (validity && isExpired(validity)) {
                    return `
                      <div style="margin:12px 0;padding:12px 16px;border-radius:8px;background:rgba(224,85,85,0.12);border:1px solid rgba(224,85,85,0.3);">
                        <strong style="color:var(--red);">Prescricao expirada em ${formatDate(validity)}</strong>
                        <p style="margin-top:4px;font-size:13px;">Renove seu cadastro para manter seu QR Code ativo.</p>
                      </div>
                      <button class="btn btn-primary mt-md" onclick="Patient._startRenewal()">Renovar Cadastro</button>
                    `;
                  } else if (validity && isExpiringSoon(validity)) {
                    return `
                      <div style="margin:12px 0;padding:12px 16px;border-radius:8px;background:rgba(240,192,96,0.12);border:1px solid rgba(240,192,96,0.3);">
                        <strong style="color:var(--yellow);">Prescricao expira em ${formatDate(validity)}</strong>
                        <p style="margin-top:4px;font-size:13px;">Renove seu cadastro antes do vencimento.</p>
                      </div>
                      <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
                        <button class="btn btn-primary" onclick="Patient._startRenewal()">Renovar Cadastro</button>
                        <button class="btn btn-secondary" onclick="Router.navigate('viagem')">Registrar Viagem</button>
                      </div>
                    `;
                  } else {
                    return `
                      <p>Registre uma viagem para gerar seu QR Code.</p>
                      <button class="btn btn-primary mt-md" onclick="Router.navigate('viagem')">Registrar Viagem</button>
                      ${patient?.renewal_count > 0 ? '' : ''}
                      <button class="btn btn-secondary mt-sm" onclick="Patient._startRenewal()" style="margin-left:8px;">Renovar Cadastro</button>
                    `;
                  }
                })()}
              </div>
            ` : `
              <div class="empty-state">
                <div class="empty-state-icon">${Icons.error}</div>
                <h4>Cadastro Rejeitado</h4>
                <p>Motivo: ${sanitizeHTML(patient?.rejection_reason || 'Não informado')}. Corrija e reenvie.</p>
                <button class="btn btn-primary mt-md" onclick="Router.navigate('cadastro')">Corrigir Cadastro</button>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
    loadDashboardStats();

    // Auto-refresh stats every 60s while on dashboard
    clearInterval(_dashboardRefreshTimer);
    _dashboardRefreshTimer = setInterval(() => {
      if (State.get('currentPage') === 'dashboard') loadDashboardStats();
      else clearInterval(_dashboardRefreshTimer);
    }, 60000);

    // Pull-to-refresh (mobile touch)
    let _pullStartY = 0;
    let _pulling = false;
    const mainArea = document.querySelector('.main-area');
    if (mainArea) {
      mainArea.addEventListener('touchstart', (e) => {
        if (mainArea.scrollTop === 0) {
          _pullStartY = e.touches[0].clientY;
          _pulling = true;
        }
      }, { passive: true });
      mainArea.addEventListener('touchend', (e) => {
        if (!_pulling) return;
        _pulling = false;
        const dy = e.changedTouches[0].clientY - _pullStartY;
        if (dy > 80 && State.get('currentPage') === 'dashboard') {
          Toast.info('Atualizando...');
          loadDashboardStats();
        }
      }, { passive: true });
    }
  }

  async function loadDashboardStats() {
    const userId = State.get('user')?.id;
    if (!userId) return;
    const [docsRes, qrRes, tripsRes] = await Promise.all([
      sb.from('documents').select('id', { count: 'exact', head: true }).eq('user_id', userId),
      sb.from('qr_codes').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
      sb.from('travel_data').select('id', { count: 'exact', head: true }).eq('user_id', userId)
    ]);
    const el = (id) => document.getElementById(id);
    if (el('doc-count')) el('doc-count').textContent = docsRes.count ?? 0;
    if (el('qr-count')) el('qr-count').textContent = qrRes.count ?? 0;
    if (el('trip-count')) el('trip-count').textContent = tripsRes.count ?? 0;
  }

  // ═══════════════════════════════════════
  //  CADASTRO — 5-STEP WIZARD
  // ═══════════════════════════════════════
  function renderCadastro(container) {
    const patient = State.get('patient');

    // Block access for approved patients who aren't in renewal mode
    if (patient && patient.status === STATUS.APPROVED && !isRenewalMode) {
      container.innerHTML = `
        <div class="page-header">
          <h2>Cadastro</h2>
          <p>Seu cadastro ja esta aprovado.</p>
        </div>
        <div class="card"><div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons['empty-check']}</div>
            <h4>Cadastro Aprovado</h4>
            <p>Para atualizar documentos ou dados, use a opcao de Renovacao no Dashboard.</p>
            <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;justify-content:center;">
              <button class="btn btn-primary" onclick="Patient._startRenewal()">Renovar Cadastro</button>
              <button class="btn btn-secondary" onclick="Router.navigate('dashboard')">Voltar ao Dashboard</button>
            </div>
          </div>
        </div></div>
      `;
      return;
    }

    // Block if renewal already pending
    if (patient && patient.status === STATUS.RENEWAL_PENDING) {
      container.innerHTML = `
        <div class="page-header">
          <h2>Cadastro</h2>
          <p>Renovacao em analise</p>
        </div>
        <div class="card"><div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons['empty-clock']}</div>
            <h4>Renovacao Pendente</h4>
            <p>Voce ja possui uma renovacao em analise. Aguarde a aprovacao antes de enviar outra.</p>
            <button class="btn btn-secondary mt-md" onclick="Router.navigate('dashboard')">Voltar ao Dashboard</button>
          </div>
        </div></div>
      `;
      return;
    }

    // Pre-fill wizard data from existing patient record
    if (patient) {
      wizardData = {
        full_name: patient.full_name || '',
        cpf: patient.cpf || '',
        birth_date: patient.date_of_birth || '',
        email: patient.email || State.get('profile')?.email || '',
        phone: patient.phone || '',
        via_type: patient.via || '',
        // Pharmacy fields
        doctor_name: patient.doctor_name || '',
        doctor_crm: patient.doctor_crm || '',
        prescription_validity: patient.prescription_validity || '',
        // HC fields
        hc_number: patient.hc_number || '',
        salvo_conduto: patient.salvo_conduto || '',
        court: patient.court || '',
        documents: {}
      };
    } else {
      const profile = State.get('profile');
      wizardData.full_name = profile?.full_name || '';
      wizardData.email = profile?.email || '';
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>${isRenewalMode ? 'Renovacao de Cadastro' : 'Cadastro'}</h2>
        <p>${isRenewalMode ? 'Atualize os dados que mudaram. Campos inalterados serao mantidos.' : 'Preencha seus dados para obter seu QR Code'}</p>
      </div>

      <!-- Stepper -->
      <div class="stepper" id="wizard-stepper"></div>

      <!-- Wizard Content -->
      <div class="card mt-md">
        <div class="card-body" id="wizard-content"></div>
        <div class="card-footer flex-between" id="wizard-footer">
          <button class="btn btn-secondary" id="wizard-prev" onclick="Patient._prevStep()">Voltar</button>
          <button class="btn btn-primary" id="wizard-next" onclick="Patient._nextStep()">Próximo</button>
        </div>
      </div>
    `;

    renderWizardStep();
  }

  const WIZARD_STEPS = [
    { label: 'Dados Pessoais', icon: '1' },
    { label: 'Via de Acesso', icon: '2' },
    { label: 'Documentos', icon: '3' },
    { label: 'Revisão', icon: '4' }
  ];

  function renderStepper() {
    const stepper = document.getElementById('wizard-stepper');
    if (!stepper) return;
    stepper.innerHTML = WIZARD_STEPS.map((step, i) => {
      const num = i + 1;
      const cls = num === wizardStep ? 'active' : num < wizardStep ? 'completed' : '';
      return `
        <div class="stepper-step ${cls}">
          <div class="stepper-number">${num < wizardStep ? '✓' : num}</div>
          <div class="stepper-label">${step.label}</div>
        </div>
      `;
    }).join('');
  }

  function renderWizardStep() {
    renderStepper();
    const content = document.getElementById('wizard-content');
    const prevBtn = document.getElementById('wizard-prev');
    const nextBtn = document.getElementById('wizard-next');
    if (!content) return;

    // Button visibility
    if (prevBtn) prevBtn.style.visibility = wizardStep === 1 ? 'hidden' : 'visible';
    if (nextBtn) {
      nextBtn.textContent = wizardStep === 4 ? (isRenewalMode ? 'Enviar Renovacao' : 'Enviar Cadastro') : 'Próximo';
      nextBtn.className = wizardStep === 4 ? 'btn btn-primary btn-lg' : 'btn btn-primary';
    }

    switch (wizardStep) {
      case 1: renderStep1(content); break;
      case 2: renderStep2(content); break;
      case 3: renderStep3(content); break;
      case 4: renderStep5(content); break;
    }
  }

  // ─── Step 1: Personal Data ───
  function renderStep1(container) {
    container.innerHTML = `
      <h3 class="mb-md">Dados Pessoais</h3>
      ${isRenewalMode ? `<div style="padding:10px 14px;border-radius:8px;background:rgba(100,180,255,0.1);border:1px solid rgba(100,180,255,0.25);margin-bottom:16px;font-size:13px;">
        <strong>Renovacao:</strong> Seus dados pessoais estao pre-preenchidos. Altere apenas se necessario.
      </div>` : ''}
      <div class="form-stack">
        <div class="form-group">
          <label class="form-label" for="w-name">Nome completo *</label>
          <input class="form-input" type="text" id="w-name" value="${sanitizeHTML(wizardData.full_name)}" placeholder="Seu nome completo" required>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" for="w-cpf">CPF *</label>
            <input class="form-input" type="text" id="w-cpf" value="${maskCPF(wizardData.cpf)}" placeholder="000.000.000-00" maxlength="14">
            <span class="form-hint" id="cpf-hint"></span>
          </div>
          <div class="form-group">
            <label class="form-label" for="w-birth">Data de Nascimento *</label>
            <input class="form-input" type="date" id="w-birth" value="${wizardData.birth_date}">
          </div>
        </div>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" for="w-email">E-mail *</label>
            <input class="form-input" type="email" id="w-email" value="${sanitizeHTML(wizardData.email)}" placeholder="seu@email.com">
          </div>
          <div class="form-group">
            <label class="form-label" for="w-phone">Telefone *</label>
            <input class="form-input" type="text" id="w-phone" value="${maskPhone(wizardData.phone)}" placeholder="(00) 00000-0000" maxlength="15">
          </div>
        </div>
      </div>
    `;

    // CPF mask
    const cpfInput = document.getElementById('w-cpf');
    cpfInput?.addEventListener('input', (e) => {
      e.target.value = maskCPF(e.target.value);
    });
    // Phone mask
    const phoneInput = document.getElementById('w-phone');
    phoneInput?.addEventListener('input', (e) => {
      e.target.value = maskPhone(e.target.value);
    });
    // Inline validation
    const emailInput = document.getElementById('w-email');
    validateFieldInline(emailInput, validateEmail, 'E-mail inválido');
    validateFieldInline(phoneInput, v => v.replace(/\D/g, '').length >= 10, 'Telefone incompleto');
    validateFieldInline(document.getElementById('w-birth'), v => !isFutureDate(v), 'Data no futuro');
    // CPF validation on blur
    cpfInput?.addEventListener('blur', async () => {
      const val = cpfInput.value;
      const hint = document.getElementById('cpf-hint');
      if (val.replace(/\D/g, '').length === 11) {
        hint.textContent = 'Validando CPF...';
        hint.className = 'form-hint text-muted';
        const result = await validateCPF(val);
        if (result.valid) {
          hint.textContent = result.name ? `✓ ${result.name}` : '✓ CPF válido';
          hint.className = 'form-hint text-green';
        } else {
          hint.textContent = '✕ CPF inválido';
          hint.className = 'form-hint text-red';
        }
      }
    });
  }

  // ─── Step 2: Via Type ───
  function renderStep2(container) {
    container.innerHTML = `
      <h3 class="mb-md">Via de Acesso</h3>
      <p class="text-muted mb-lg">Como você obtém seu produto à base de cannabis?</p>
      <div class="via-cards">
        <div class="via-card ${wizardData.via_type === VIA.PHARMACY ? 'selected' : ''}" data-via="${VIA.PHARMACY}">
          <div class="via-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg></div>
          <h4>Farmácia / Associação</h4>
          <p>Produto adquirido em farmácia autorizada ou associação de pacientes</p>
        </div>
        <div class="via-card ${wizardData.via_type === VIA.HABEAS ? 'selected' : ''}" data-via="${VIA.HABEAS}">
          <div class="via-card-icon"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/><path d="M12 2v2"/><path d="M12 20v2"/></svg></div>
          <h4>Habeas Corpus</h4>
          <p>Autorização judicial para cultivo ou porte de cannabis medicinal</p>
        </div>
      </div>

      <!-- Pharmacy fields -->
      <div id="pharmacy-fields" class="via-extra-fields ${wizardData.via_type === VIA.PHARMACY ? '' : 'hidden'}" style="margin-top:24px;">
        <h4 class="mb-md">Dados da Prescrição</h4>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" for="w-doctor-name">Nome do Médico *</label>
            <input class="form-input" type="text" id="w-doctor-name" placeholder="Dr. João Silva" value="${sanitizeHTML(wizardData.doctor_name || '')}">
          </div>
          <div class="form-group">
            <label class="form-label" for="w-doctor-crm">CRM *</label>
            <input class="form-input" type="text" id="w-doctor-crm" placeholder="CRM/SP 123456" value="${sanitizeHTML(wizardData.doctor_crm || '')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="w-prescription-validity">Validade da Prescrição *</label>
          <input class="form-input" type="date" id="w-prescription-validity" value="${wizardData.prescription_validity || ''}">
        </div>
      </div>

      <!-- Habeas Corpus fields -->
      <div id="hc-fields" class="via-extra-fields ${wizardData.via_type === VIA.HABEAS ? '' : 'hidden'}" style="margin-top:24px;">
        <h4 class="mb-md">Dados do Habeas Corpus</h4>
        <p class="text-muted mb-md" style="font-size:13px;">Todos os campos são obrigatórios. Sem essas informações o cadastro será negado.</p>
        <div class="grid-2">
          <div class="form-group">
            <label class="form-label" for="w-hc-number">Habeas Corpus Número *</label>
            <input class="form-input" type="text" id="w-hc-number" placeholder="Ex: 0000000-00.0000.0.00.0000" value="${sanitizeHTML(wizardData.hc_number || '')}">
          </div>
          <div class="form-group">
            <label class="form-label" for="w-salvo-conduto">Salvo Conduto Número *</label>
            <input class="form-input" type="text" id="w-salvo-conduto" placeholder="Ex: 0000000-00.0000.0.00.0000" value="${sanitizeHTML(wizardData.salvo_conduto || '')}">
          </div>
        </div>
        <div class="form-group">
          <label class="form-label" for="w-court">Vara / Tribunal *</label>
          <input class="form-input" type="text" id="w-court" placeholder="Ex: 1ª Vara Criminal — TJ/SP" value="${sanitizeHTML(wizardData.court || '')}">
        </div>
      </div>
    `;

    // Toggle via-specific fields
    function toggleViaFields(via) {
      const pharmacyFields = document.getElementById('pharmacy-fields');
      const hcFields = document.getElementById('hc-fields');
      if (pharmacyFields) pharmacyFields.classList.toggle('hidden', via !== VIA.PHARMACY);
      if (hcFields) hcFields.classList.toggle('hidden', via !== VIA.HABEAS);
    }

    container.querySelectorAll('.via-card').forEach(card => {
      card.addEventListener('click', () => {
        container.querySelectorAll('.via-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        wizardData.via_type = card.dataset.via;
        toggleViaFields(card.dataset.via);
      });
    });
  }

  // ─── Step 3: Documents Upload ───
  function renderStep3(container) {
    const isPharmacy = wizardData.via_type === VIA.PHARMACY;

    container.innerHTML = `
      <h3 class="mb-md">Documentos</h3>
      ${isRenewalMode ? `
        <p class="text-muted mb-sm">Envie novos documentos apenas se necessario. Documentos anteriores serao mantidos.</p>
        <div style="padding:10px 14px;border-radius:8px;background:rgba(100,180,255,0.1);border:1px solid rgba(100,180,255,0.25);margin-bottom:16px;font-size:13px;">
          <strong>Renovacao:</strong> ${isPharmacy ? 'Recomendamos enviar a nova prescricao medica atualizada.' : 'Envie a nova decisao judicial caso tenha sido atualizada.'}
          Documentos de identidade so precisam ser reenviados se mudaram.
        </div>
      ` : `<p class="text-muted mb-lg">Envie os documentos necessários (PDF, JPG ou PNG, máx. 10MB)</p>`}

      <!-- Identity Document -->
      <div class="form-group mb-lg">
        <label class="form-label">Documento de Identidade (RG ou CNH) *</label>
        <div class="upload-zone" id="upload-identity" data-doc-type="${DOC_TYPES.IDENTITY}">
          <div class="upload-zone-icon">${Icons.upload}</div>
          <div class="upload-zone-text">
            ${uploadedFiles[DOC_TYPES.IDENTITY]
              ? `<strong class="text-green">✓ ${sanitizeHTML(uploadedFiles[DOC_TYPES.IDENTITY].name)}</strong><br><span class="text-xs text-muted">${formatFileSize(uploadedFiles[DOC_TYPES.IDENTITY].size)}</span>`
              : 'Clique ou arraste o arquivo aqui'}
          </div>
          <input type="file" class="upload-zone-input" accept=".pdf,.jpg,.jpeg,.png" data-doc-type="${DOC_TYPES.IDENTITY}">
        </div>
      </div>

      <!-- Prescription or Judicial Decision -->
      <div class="form-group">
        <label class="form-label">${isPharmacy ? 'Prescrição Médica *' : 'Decisão Judicial (Habeas Corpus) *'}</label>
        <div class="upload-zone" id="upload-main" data-doc-type="${isPharmacy ? DOC_TYPES.PRESCRIPTION : DOC_TYPES.JUDICIAL}">
          <div class="upload-zone-icon">${Icons.upload}</div>
          <div class="upload-zone-text">
            ${uploadedFiles[isPharmacy ? DOC_TYPES.PRESCRIPTION : DOC_TYPES.JUDICIAL]
              ? `<strong class="text-green">✓ ${sanitizeHTML(uploadedFiles[isPharmacy ? DOC_TYPES.PRESCRIPTION : DOC_TYPES.JUDICIAL].name)}</strong><br><span class="text-xs text-muted">${formatFileSize(uploadedFiles[isPharmacy ? DOC_TYPES.PRESCRIPTION : DOC_TYPES.JUDICIAL].size)}</span>`
              : 'Clique ou arraste o arquivo aqui'}
          </div>
          <input type="file" class="upload-zone-input" accept=".pdf,.jpg,.jpeg,.png" data-doc-type="${isPharmacy ? DOC_TYPES.PRESCRIPTION : DOC_TYPES.JUDICIAL}">
        </div>
      </div>
    `;

    // Setup upload zones
    container.querySelectorAll('.upload-zone').forEach(zone => {
      const input = zone.querySelector('input[type="file"]');
      const docType = input.dataset.docType;

      // Prevent click on input from bubbling back to zone (infinite loop)
      input.addEventListener('click', (e) => e.stopPropagation());
      zone.addEventListener('click', () => input.click());
      zone.addEventListener('dragover', (e) => { e.preventDefault(); zone.classList.add('drag-over'); });
      zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));
      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        if (e.dataTransfer.files.length) handleFileSelect(e.dataTransfer.files[0], docType, zone);
      });
      input.addEventListener('change', () => {
        if (input.files.length) handleFileSelect(input.files[0], docType, zone);
      });
    });
  }

  async function handleFileSelect(file, docType, zone) {
    const validation = validateFile(file);
    if (!validation.valid) {
      Toast.error(validation.error);
      return;
    }

    const magicValid = await checkMagicBytes(file);
    if (!magicValid) {
      Toast.error('O conteúdo do arquivo não corresponde ao tipo declarado.');
      return;
    }

    uploadedFiles[docType] = file;
    const textEl = zone.querySelector('.upload-zone-text');
    textEl.innerHTML = `<strong class="text-green">✓ ${sanitizeHTML(file.name)}</strong><br><span class="text-xs text-muted">${formatFileSize(file.size)}</span>`;
    Toast.success('Arquivo selecionado com sucesso.');
  }

  // ─── Step 4: Review ───
  function renderStep5(container) {
    container.innerHTML = `
      <h3 class="mb-lg">${isRenewalMode ? 'Revisao da Renovacao' : 'Revisão do Cadastro'}</h3>
      <p class="text-muted mb-lg">${isRenewalMode ? 'Confira os dados atualizados antes de enviar a renovacao.' : 'Confira seus dados antes de enviar. Após o envio, sua documentação será analisada pela equipe Cannapass.'}</p>

      <div class="review-section">
        <h4>Dados Pessoais</h4>
        <div class="review-row"><span class="review-row-label">Nome</span><span class="review-row-value">${sanitizeHTML(wizardData.full_name)}</span></div>
        <div class="review-row"><span class="review-row-label">CPF</span><span class="review-row-value">${maskCPF(wizardData.cpf)}</span></div>
        <div class="review-row"><span class="review-row-label">Nascimento</span><span class="review-row-value">${formatDate(wizardData.birth_date)}</span></div>
        <div class="review-row"><span class="review-row-label">E-mail</span><span class="review-row-value">${sanitizeHTML(wizardData.email)}</span></div>
        <div class="review-row"><span class="review-row-label">Telefone</span><span class="review-row-value">${sanitizeHTML(wizardData.phone)}</span></div>
      </div>

      <div class="review-section">
        <h4>Via de Acesso</h4>
        <div class="review-row"><span class="review-row-label">Tipo</span><span class="review-row-value">${getViaLabel(wizardData.via_type)}</span></div>
        ${wizardData.via_type === VIA.PHARMACY ? `
          <div class="review-row"><span class="review-row-label">Médico</span><span class="review-row-value">${sanitizeHTML(wizardData.doctor_name)} — ${sanitizeHTML(wizardData.doctor_crm)}</span></div>
          <div class="review-row"><span class="review-row-label">Validade Prescrição</span><span class="review-row-value">${formatDate(wizardData.prescription_validity)}</span></div>
        ` : `
          <div class="review-row"><span class="review-row-label">Habeas Corpus Nº</span><span class="review-row-value">${sanitizeHTML(wizardData.hc_number)}</span></div>
          <div class="review-row"><span class="review-row-label">Salvo Conduto Nº</span><span class="review-row-value">${sanitizeHTML(wizardData.salvo_conduto)}</span></div>
          <div class="review-row"><span class="review-row-label">Vara / Tribunal</span><span class="review-row-value">${sanitizeHTML(wizardData.court)}</span></div>
        `}
      </div>

      <div class="review-section">
        <h4>Documentos</h4>
        <div class="review-row">
          <span class="review-row-label">Identidade</span>
          <span class="review-row-value">${uploadedFiles[DOC_TYPES.IDENTITY] ? '✓ ' + sanitizeHTML(uploadedFiles[DOC_TYPES.IDENTITY].name) : (isRenewalMode ? '— Mantendo documento anterior' : '✕ Não enviado')}</span>
        </div>
        <div class="review-row">
          <span class="review-row-label">${wizardData.via_type === VIA.PHARMACY ? 'Prescrição' : 'Decisão Judicial'}</span>
          <span class="review-row-value">${
            uploadedFiles[wizardData.via_type === VIA.PHARMACY ? DOC_TYPES.PRESCRIPTION : DOC_TYPES.JUDICIAL]
              ? '✓ ' + sanitizeHTML(uploadedFiles[wizardData.via_type === VIA.PHARMACY ? DOC_TYPES.PRESCRIPTION : DOC_TYPES.JUDICIAL].name)
              : (isRenewalMode ? '— Mantendo documento anterior' : '✕ Não enviado')
          }</span>
        </div>
      </div>

    `;
  }

  // ─── Collect step data before navigation ───
  function collectStepData() {
    switch (wizardStep) {
      case 1:
        wizardData.full_name = document.getElementById('w-name')?.value.trim() || '';
        wizardData.cpf = document.getElementById('w-cpf')?.value.replace(/\D/g, '') || '';
        wizardData.birth_date = document.getElementById('w-birth')?.value || '';
        wizardData.email = document.getElementById('w-email')?.value.trim() || '';
        wizardData.phone = document.getElementById('w-phone')?.value.replace(/\D/g, '') || '';
        break;
      case 2:
        if (wizardData.via_type === VIA.PHARMACY) {
          wizardData.doctor_name = document.getElementById('w-doctor-name')?.value.trim() || '';
          wizardData.doctor_crm = document.getElementById('w-doctor-crm')?.value.trim() || '';
          wizardData.prescription_validity = document.getElementById('w-prescription-validity')?.value || '';
        } else if (wizardData.via_type === VIA.HABEAS) {
          wizardData.hc_number = document.getElementById('w-hc-number')?.value.trim() || '';
          wizardData.salvo_conduto = document.getElementById('w-salvo-conduto')?.value.trim() || '';
          wizardData.court = document.getElementById('w-court')?.value.trim() || '';
        }
        break;
    }
  }

  // ─── Validate current step ───
  function validateStep() {
    switch (wizardStep) {
      case 1:
        if (!wizardData.full_name) { Toast.error('Informe seu nome completo.'); return false; }
        if (!validateCPFAlgorithm(wizardData.cpf)) { Toast.error('CPF inválido.'); return false; }
        if (!wizardData.birth_date) { Toast.error('Informe sua data de nascimento.'); return false; }
        if (!validateEmail(wizardData.email)) { Toast.error('E-mail inválido.'); return false; }
        if (wizardData.phone.length < 10) { Toast.error('Telefone inválido.'); return false; }
        return true;
      case 2:
        if (!wizardData.via_type) { Toast.error('Selecione a via de acesso.'); return false; }
        if (wizardData.via_type === VIA.PHARMACY) {
          if (!wizardData.doctor_name) { Toast.error('Informe o nome do médico.'); return false; }
          if (!wizardData.doctor_crm) { Toast.error('Informe o CRM do médico.'); return false; }
          if (!wizardData.prescription_validity) { Toast.error('Informe a validade da prescrição.'); return false; }
        }
        if (wizardData.via_type === VIA.HABEAS) {
          if (!wizardData.hc_number) { Toast.error('Informe o número do Habeas Corpus. Este campo é obrigatório.'); return false; }
          if (!wizardData.salvo_conduto) { Toast.error('Informe o número do Salvo Conduto. Este campo é obrigatório.'); return false; }
          if (!wizardData.court) { Toast.error('Informe a Vara/Tribunal. Este campo é obrigatório.'); return false; }
        }
        return true;
      case 3: {
        // In renewal mode, documents are optional (existing ones are kept)
        if (isRenewalMode) return true;
        const mainDocType = wizardData.via_type === VIA.PHARMACY ? DOC_TYPES.PRESCRIPTION : DOC_TYPES.JUDICIAL;
        if (!uploadedFiles[DOC_TYPES.IDENTITY]) { Toast.error('Envie seu documento de identidade.'); return false; }
        if (!uploadedFiles[mainDocType]) {
          Toast.error(wizardData.via_type === VIA.PHARMACY ? 'Envie sua prescrição médica.' : 'Envie sua decisão judicial.');
          return false;
        }
        return true;
      }
      case 4:
        return true;
      default:
        return true;
    }
  }

  // ─── Navigation ───
  function _nextStep() {
    collectStepData();
    if (!validateStep()) return;

    if (wizardStep === 4) {
      submitRegistration();
      return;
    }

    wizardStep++;
    renderWizardStep();
  }

  function _prevStep() {
    collectStepData();
    if (wizardStep > 1) {
      wizardStep--;
      renderWizardStep();
    }
  }

  // ─── Submit Registration ───
  async function submitRegistration() {
    const nextBtn = document.getElementById('wizard-next');
    if (nextBtn) { nextBtn.classList.add('btn-loading'); nextBtn.disabled = true; }

    try {
      const userId = State.get('user')?.id;
      if (!userId) throw new Error('Sessao expirada. Faca login novamente.');

      const oldPatient = State.get('patient');

      // 1. Build patient data
      const patientData = {
        user_id: userId,
        full_name: wizardData.full_name,
        cpf: wizardData.cpf.replace(/\D/g, ''),
        date_of_birth: wizardData.birth_date || null,
        email: wizardData.email,
        phone: wizardData.phone,
        via: wizardData.via_type,
      };

      // Add via-specific fields
      if (wizardData.via_type === VIA.PHARMACY) {
        patientData.doctor_name = wizardData.doctor_name;
        patientData.doctor_crm = wizardData.doctor_crm;
        patientData.prescription_validity = wizardData.prescription_validity;
      } else if (wizardData.via_type === VIA.HABEAS) {
        patientData.hc_number = wizardData.hc_number;
        patientData.salvo_conduto = wizardData.salvo_conduto;
        patientData.court = wizardData.court;
      }

      // 2. Set correct status
      if (isRenewalMode) {
        patientData.status = STATUS.RENEWAL_PENDING;
        patientData.renewal_requested_at = new Date().toISOString();
        patientData.previous_prescription_validity = oldPatient?.prescription_validity || null;
      } else {
        patientData.status = STATUS.PENDING;
      }

      // 3. Save patient record
      const { data: patient, error: patientError } = await sb
        .from('patients')
        .upsert(patientData, { onConflict: 'user_id' })
        .select()
        .single();

      if (patientError) throw new Error(`Erro ao salvar cadastro: ${patientError.message}`);
      if (!patient) throw new Error('Erro ao salvar cadastro: nenhum dado retornado.');

      // 4. If renewal, save audit record
      if (isRenewalMode && oldPatient) {
        try {
          const snapshotFields = ['doctor_name', 'doctor_crm', 'prescription_validity', 'hc_number', 'salvo_conduto', 'court', 'full_name', 'email', 'phone'];
          const oldData = {};
          const newData = {};
          for (const f of snapshotFields) {
            oldData[f] = oldPatient[f] || null;
            newData[f] = patient[f] || null;
          }

          await sb.from('renewals').insert({
            patient_id: patient.id,
            user_id: userId,
            old_data: oldData,
            new_data: newData,
            status: 'pending'
          });
        } catch (auditErr) {
          console.error('[Patient] Renewal audit error (non-blocking):', auditErr);
        }
      }

      // 5. Upload documents to Supabase Storage (if any new files)
      const docUploads = [];
      for (const [docType, file] of Object.entries(uploadedFiles)) {
        try {
          const ext = file.name.includes('.') ? file.name.split('.').pop() : 'bin';
          const filePath = `${userId}/${docType}_${Date.now()}.${ext}`;
          const { error: uploadError } = await sb.storage
            .from(STORAGE_BUCKET)
            .upload(filePath, file, { contentType: file.type, upsert: true });

          if (uploadError) {
            console.error('[Patient] Storage upload error for', docType, ':', uploadError);
            continue;
          }

          docUploads.push({ docType, filePath, fileName: file.name, fileSize: file.size, mimeType: file.type });
        } catch (uploadErr) {
          console.error('[Patient] Upload exception for', docType, ':', uploadErr);
        }
      }

      // 6. Save document metadata
      for (const doc of docUploads) {
        try {
          await sb.from('documents').upsert({
            user_id: userId,
            patient_id: patient.id,
            doc_type: doc.docType,
            file_path: doc.filePath,
            file_name: doc.fileName,
            file_size: doc.fileSize,
            mime_type: doc.mimeType,
            status: 'uploaded'
          }, { onConflict: 'patient_id,doc_type', ignoreDuplicates: false });
        } catch (docErr) {
          console.error('[Patient] Doc metadata error:', docErr);
        }
      }

      // 7. Update state & navigate
      State.set('patient', patient);
      uploadedFiles = {};
      wizardStep = 1;

      if (isRenewalMode) {
        isRenewalMode = false;
        Toast.success('Renovacao enviada com sucesso! Aguarde a analise.');
      } else {
        Toast.success('Cadastro enviado com sucesso! Aguarde a analise.');
      }
      Router.navigate('dashboard');

    } catch (err) {
      console.error('[Patient] Submit error:', err);
      Toast.error(err.message || 'Erro ao enviar cadastro. Tente novamente.');
    } finally {
      if (nextBtn) { nextBtn.classList.remove('btn-loading'); nextBtn.disabled = false; }
    }
  }

  // ═══════════════════════════════════════
  //  DOCUMENTOS
  // ═══════════════════════════════════════
  const DOC_TYPE_LABELS = {
    [DOC_TYPES.IDENTITY]: 'Documento de Identidade',
    [DOC_TYPES.PRESCRIPTION]: 'Prescrição Médica',
    [DOC_TYPES.JUDICIAL]: 'Decisão Judicial',
    'medical_report': 'Relatório Médico',
    'other': 'Outro'
  };

  async function renderDocumentos(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Documentos</h2>
        <p>Visualize, envie e gerencie seus documentos</p>
      </div>

      <!-- Upload Card -->
      <div class="card mb-md">
        <div class="card-header">
          <h3 class="card-title">Enviar Novo Documento</h3>
        </div>
        <div class="card-body">
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="doc-type-select">Tipo de Documento *</label>
              <select id="doc-type-select" class="form-select">
                <option value="">Selecione o tipo...</option>
                <option value="identity">Documento de Identidade (RG/CNH)</option>
                <option value="prescription">Prescrição Médica</option>
                <option value="judicial_decision">Decisão Judicial</option>
                <option value="medical_report">Relatório Médico</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="doc-file-input">Arquivo *</label>
              <input type="file" id="doc-file-input" class="form-input" accept=".pdf,.jpg,.jpeg,.png">
              <span class="form-hint">PDF, JPG ou PNG — máx. 10MB</span>
            </div>
          </div>
          <button class="btn btn-primary mt-sm" id="doc-upload-btn">Enviar Documento</button>
        </div>
      </div>

      <!-- Documents List -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Meus Documentos</h3>
        </div>
        <div class="card-body" id="docs-list">
          <div class="flex-center"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    // Bind upload
    document.getElementById('doc-upload-btn').addEventListener('click', handleDocUpload);

    // Load documents
    await loadDocumentsList();
  }

  async function handleDocUpload() {
    const docType = document.getElementById('doc-type-select').value;
    const fileInput = document.getElementById('doc-file-input');
    const file = fileInput?.files?.[0];
    const btn = document.getElementById('doc-upload-btn');

    if (!docType) { Toast.warning('Selecione o tipo de documento.'); return; }
    if (!file) { Toast.warning('Selecione um arquivo.'); return; }

    // Validate file
    const validation = validateFile(file);
    if (!validation.valid) { Toast.error(validation.error); return; }

    // Check magic bytes
    const magicOk = await checkMagicBytes(file);
    if (!magicOk) { Toast.error('O conteúdo do arquivo não corresponde à extensão. Verifique o arquivo.'); return; }

    const userId = State.get('user')?.id;
    const patient = State.get('patient');

    if (!userId || !patient) {
      Toast.error('Complete seu cadastro antes de enviar documentos.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      // Upload to Storage
      const ext = file.name.split('.').pop().toLowerCase();
      const filePath = `${userId}/${docType}_${Date.now()}.${ext}`;

      const { error: uploadError } = await sb.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      // Save metadata
      const { error: dbError } = await sb.from('documents').insert({
        patient_id: patient.id,
        user_id: userId,
        doc_type: docType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type
      });

      if (dbError) throw dbError;

      Toast.success('Documento enviado com sucesso!');

      // Reset form
      document.getElementById('doc-type-select').value = '';
      fileInput.value = '';

      // Reload list
      await loadDocumentsList();

    } catch (err) {
      console.error('[Patient] Doc upload error:', err);
      Toast.error('Erro ao enviar documento. Tente novamente.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar Documento';
    }
  }

  async function loadDocumentsList() {
    const list = document.getElementById('docs-list');
    if (!list) return;

    const userId = State.get('user')?.id;
    const { data: docs, error } = await sb
      .from('documents')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error || !docs?.length) {
      list.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${Icons['empty-doc']}</div>
          <h4>Nenhum documento</h4>
          <p>Envie seus documentos usando o formulário acima.</p>
        </div>
      `;
      return;
    }

    // Get signed URLs for all docs
    const docsWithUrls = await Promise.all(docs.map(async (doc) => {
      try {
        const { data } = await sb.storage.from(STORAGE_BUCKET).createSignedUrl(doc.file_path, SIGNED_URL_EXPIRY);
        return { ...doc, signedUrl: data?.signedUrl };
      } catch {
        return { ...doc, signedUrl: null };
      }
    }));

    const statusLabel = (s) => s === 'verified' ? 'Verificado' : s === 'rejected' ? 'Rejeitado' : 'Enviado';
    const statusBadge = (s) => s === 'verified' ? 'success' : s === 'rejected' ? 'danger' : 'warning';

    list.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Tipo</th>
            <th>Arquivo</th>
            <th>Tamanho</th>
            <th>Status</th>
            <th>Data</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          ${docsWithUrls.map(doc => `
            <tr>
              <td>${DOC_TYPE_LABELS[doc.doc_type] || doc.doc_type}</td>
              <td class="truncate" style="max-width: 180px;" title="${sanitizeHTML(doc.file_name)}">${sanitizeHTML(doc.file_name)}</td>
              <td>${formatFileSize(doc.file_size || 0)}</td>
              <td><span class="badge badge-${statusBadge(doc.status)}">${statusLabel(doc.status)}</span></td>
              <td>${formatDate(doc.created_at)}</td>
              <td>
                <div class="btn-group-sm">
                  ${doc.signedUrl ? `<a href="${doc.signedUrl}" target="_blank" class="btn btn-sm btn-secondary">Ver</a>` : ''}
                  <button class="btn btn-sm btn-danger doc-delete-btn" data-doc-id="${doc.id}" data-file-path="${doc.file_path}" data-file-name="${sanitizeHTML(doc.file_name)}">Remover</button>
                </div>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;

    // Bind delete buttons
    list.querySelectorAll('.doc-delete-btn').forEach(btn => {
      btn.addEventListener('click', () => deleteDocument(btn.dataset.docId, btn.dataset.filePath, btn.dataset.fileName));
    });
  }

  async function deleteDocument(docId, filePath, fileName) {
    const confirmed = await Modal.open({
      title: 'Remover Documento',
      body: `Tem certeza que deseja remover o documento <strong>${fileName}</strong>? Esta ação não pode ser desfeita.`,
      confirmText: 'Remover',
      cancelText: 'Cancelar',
      danger: true
    });

    if (!confirmed) return;

    try {
      // Delete from Storage
      const { error: storageError } = await sb.storage
        .from(STORAGE_BUCKET)
        .remove([filePath]);

      if (storageError) console.warn('[Patient] Storage delete warning:', storageError);

      // Delete metadata from DB
      const { error: dbError } = await sb.from('documents').delete().eq('id', docId);
      if (dbError) throw dbError;

      Toast.success('Documento removido.');
      await loadDocumentsList();

    } catch (err) {
      console.error('[Patient] Doc delete error:', err);
      Toast.error('Erro ao remover documento.');
    }
  }

  // ═══════════════════════════════════════
  //  VIAGEM
  // ═══════════════════════════════════════
  function renderViagem(container) {
    const patient = State.get('patient');

    if (!patient || (patient.status !== STATUS.APPROVED && patient.status !== STATUS.RENEWAL_PENDING)) {
      container.innerHTML = `
        <div class="page-header">
          <h2>Registrar Viagem</h2>
          <p>Informe os dados da sua viagem para gerar o QR Code</p>
        </div>
        <div class="card">
          <div class="card-body">
            <div class="empty-state">
              <div class="empty-state-icon">${Icons.warning}</div>
              <h4>Cadastro nao aprovado</h4>
              <p>Seu cadastro precisa estar aprovado para registrar uma viagem.</p>
              <button class="btn btn-primary mt-md" onclick="Router.navigate('dashboard')">Ver Dashboard</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (patient.status === STATUS.RENEWAL_PENDING) {
      container.innerHTML = `
        <div class="page-header">
          <h2>Registrar Viagem</h2>
          <p>Informe os dados da sua viagem para gerar o QR Code</p>
        </div>
        <div class="card">
          <div class="card-body">
            <div class="empty-state">
              <div class="empty-state-icon">${Icons['empty-clock']}</div>
              <h4>Renovacao em Analise</h4>
              <p>Novas viagens estao bloqueadas enquanto sua renovacao esta sendo analisada. QR Codes existentes continuam validos.</p>
              <button class="btn btn-secondary mt-md" onclick="Router.navigate('dashboard')">Ver Dashboard</button>
            </div>
          </div>
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>Registrar Viagem</h2>
        <p>Informe os dados da sua viagem para gerar o QR Code</p>
      </div>
      <div class="card travel-card">
        <div class="card-body">
          <form id="travel-form" class="form-stack">
            <div class="travel-route">
              <div class="form-group" style="flex:1;">
                <label class="form-label" for="t-origin">Origem *</label>
                <input class="form-input" type="text" id="t-origin" placeholder="Cidade de origem" required>
              </div>
              <div class="travel-route-arrow">→</div>
              <div class="form-group" style="flex:1;">
                <label class="form-label" for="t-destination">Destino *</label>
                <input class="form-input" type="text" id="t-destination" placeholder="Cidade de destino" required>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="t-departure">Data de Partida *</label>
                <input class="form-input" type="date" id="t-departure" required min="${dayjs().format('YYYY-MM-DD')}">
              </div>
              <div class="form-group">
                <label class="form-label" for="t-return">Data de Retorno</label>
                <input class="form-input" type="date" id="t-return">
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="t-transport">Tipo de Transporte *</label>
                <select class="form-select" id="t-transport" required>
                  <option value="">Selecione...</option>
                  <option value="${TRANSPORT.AIR}">Aéreo</option>
                  <option value="${TRANSPORT.BUS}">Rodoviário</option>
                  <option value="${TRANSPORT.OTHER}">Outro</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="t-flight">Voo / Linha (opcional)</label>
                <input class="form-input" type="text" id="t-flight" placeholder="Ex: LATAM 3456">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="t-notes">Observações</label>
              <textarea class="form-input" id="t-notes" rows="3" placeholder="Informações adicionais sobre a viagem..."></textarea>
            </div>

            <button type="submit" class="btn btn-primary btn-lg btn-block" id="travel-submit-btn">
              Registrar Viagem e Gerar QR Code
            </button>
          </form>
        </div>
      </div>
    `;

    document.getElementById('travel-form')?.addEventListener('submit', handleTravelSubmit);
  }

  async function handleTravelSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('travel-submit-btn');
    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
      const userId = State.get('user').id;
      const patient = State.get('patient');
      const origin = document.getElementById('t-origin').value.trim();
      const destination = document.getElementById('t-destination').value.trim();
      const departure = document.getElementById('t-departure').value;
      const returnDate = document.getElementById('t-return').value || null;
      const transport = document.getElementById('t-transport').value;
      const flight = document.getElementById('t-flight').value.trim() || null;
      const notes = document.getElementById('t-notes').value.trim() || null;

      if (!origin || !destination || !departure || !transport) {
        Toast.error('Preencha todos os campos obrigatórios.');
        return;
      }

      // 1. Generate QR Code token first (we need the ID for travel_data)
      const token = generateToken();
      const viaLabel = patient.via === 'pharmacy' ? 'Farmácia/Associação' : 'Habeas Corpus';
      const legalRef = patient.via === 'pharmacy'
        ? 'RDC ANVISA nº 327/2019'
        : `HC ${patient.hc_number || '—'} — ${patient.court || '—'}`;

      // QR Code expires 48 hours after creation
      const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

      const { data: qr, error: qrError } = await sb
        .from('qr_codes')
        .insert({
          user_id: userId,
          patient_id: patient.id,
          token,
          patient_name: patient.full_name,
          cpf_masked: maskCPF(patient.cpf || ''),
          via: patient.via,
          product: patient.product_name || patient.product_type || '—',
          quantity: patient.transport_quantity || patient.total_quantity || '—',
          legal_reference: legalRef,
          is_active: true,
          expires_at: expiresAt.toISOString()
        })
        .select()
        .single();

      if (qrError) throw new Error(`Erro ao gerar QR Code: ${qrError.message}`);

      // 2. Create travel record linked to QR
      const { data: travel, error: travelError } = await sb
        .from('travel_data')
        .insert({
          user_id: userId,
          patient_id: patient.id,
          qr_code_id: qr.id,
          origin,
          destination,
          departure_date: departure,
          transport_type: transport,
          flight_or_bus: flight
        })
        .select()
        .single();

      if (travelError) throw new Error(`Erro ao registrar viagem: ${travelError.message}`);

      Toast.success('Viagem registrada e QR Code gerado!');
      Router.navigate('qrcode');

    } catch (err) {
      console.error('[Patient] Travel submit error:', err);
      Toast.error(err.message || 'Erro ao registrar viagem.');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  }

  // ═══════════════════════════════════════
  //  QR CODE
  // ═══════════════════════════════════════
  async function renderQRCode(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Meu QR Code</h2>
        <p>Seu QR Code de transporte verificável</p>
      </div>
      <div id="qr-content"><div class="flex-center"><div class="spinner"></div></div></div>
    `;

    const userId = State.get('user')?.id;
    const { data: qrCodes, error } = await sb
      .from('qr_codes')
      .select('*, travel_data(*)')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1);

    const content = document.getElementById('qr-content');
    if (!content) return;

    if (error || !qrCodes?.length) {
      content.innerHTML = `
        <div class="card">
          <div class="card-body">
            <div class="empty-state">
              <div class="empty-state-icon">${Icons['empty-qr']}</div>
              <h4>Nenhum QR Code ativo</h4>
              <p>Registre uma viagem para gerar seu QR Code.</p>
              ${State.get('patient')?.status === STATUS.APPROVED ? `
                <button class="btn btn-primary mt-md" onclick="Router.navigate('viagem')">Registrar Viagem</button>
              ` : ''}
            </div>
          </div>
        </div>
      `;
      return;
    }

    const qr = qrCodes[0];
    // travel_data is a reverse FK relation — returns array
    const travel = Array.isArray(qr.travel_data) ? qr.travel_data[0] : qr.travel_data;
    const expiresDate = qr.expires_at ? new Date(qr.expires_at) : null;
    const isExpired = expiresDate ? expiresDate <= new Date() : false;
    const qrUrl = `${window.location.origin}${window.location.pathname}${PUBLIC_VERIFY_HASH}${qr.token}`;

    // Calculate remaining time
    let expiryText = '';
    if (isExpired) {
      expiryText = `${Icons.warning} QR Code expirado — será removido automaticamente`;
    } else if (expiresDate) {
      const hoursLeft = Math.max(0, Math.floor((expiresDate - new Date()) / (1000 * 60 * 60)));
      const minsLeft = Math.max(0, Math.floor(((expiresDate - new Date()) % (1000 * 60 * 60)) / (1000 * 60)));
      expiryText = hoursLeft > 0
        ? `${Icons.success} Válido por ${hoursLeft}h${minsLeft > 0 ? `${minsLeft}min` : ''} — expira em ${formatDateTime(qr.expires_at)}`
        : `${Icons.warning} Expira em ${minsLeft} minutos`;
    }

    content.innerHTML = `
      <div class="qr-display">
        <canvas id="qr-canvas"></canvas>

        <div class="qr-expiry ${isExpired ? 'expired' : 'valid'}">
          ${expiryText}
        </div>

        <div class="qr-meta">
          <div class="qr-meta-item">
            <div class="qr-meta-label">Origem</div>
            <div class="qr-meta-value">${sanitizeHTML(travel?.origin || '—')}</div>
          </div>
          <div class="qr-meta-item">
            <div class="qr-meta-label">Destino</div>
            <div class="qr-meta-value">${sanitizeHTML(travel?.destination || '—')}</div>
          </div>
          <div class="qr-meta-item">
            <div class="qr-meta-label">Partida</div>
            <div class="qr-meta-value">${formatDate(travel?.departure_date)}</div>
          </div>
          <div class="qr-meta-item">
            <div class="qr-meta-label">Transporte</div>
            <div class="qr-meta-value">${getTransportLabel(travel?.transport_type)}</div>
          </div>
        </div>

        <div class="qr-meta mt-sm">
          <div class="qr-meta-item">
            <div class="qr-meta-label">Produto</div>
            <div class="qr-meta-value">${sanitizeHTML(qr.product || '—')}</div>
          </div>
          <div class="qr-meta-item">
            <div class="qr-meta-label">Quantidade</div>
            <div class="qr-meta-value">${sanitizeHTML(qr.quantity || '—')}</div>
          </div>
        </div>
      </div>
    `;

    // Generate QR Code on canvas (defer to next frame so DOM is fully laid out)
    requestAnimationFrame(() => {
      const canvas = document.getElementById('qr-canvas');
      if (!canvas || typeof QRious === 'undefined') return;

      const qr = new QRious({
        element: canvas,
        value: qrUrl,
        size: 280,
        foreground: '#1a1a2e',
        background: '#ffffff',
        level: 'M'
      });

      // Fallback: if canvas is visually empty, inject an <img> instead
      if (!qr.toDataURL()) return;
      canvas.style.display = 'block';
      canvas.style.margin = '0 auto';
    });
  }

  // ═══════════════════════════════════════
  //  HISTÓRICO
  // ═══════════════════════════════════════
  let historicoPage = 0;
  const HISTORICO_PAGE_SIZE = 10;

  async function renderHistorico(container) {
    historicoPage = 0;
    container.innerHTML = `
      <div class="page-header">
        <h2>Histórico</h2>
        <p>Viagens anteriores e verificações</p>
      </div>
      <div class="card">
        <div class="card-body" id="history-content">
          <div class="flex-center"><div class="spinner"></div></div>
        </div>
      </div>
    `;
    await loadHistoricoPage();
  }

  async function loadHistoricoPage() {
    const content = document.getElementById('history-content');
    if (!content) return;

    const userId = State.get('user')?.id;
    const from = historicoPage * HISTORICO_PAGE_SIZE;
    const to = from + HISTORICO_PAGE_SIZE - 1;

    const { data: travels, error, count } = await sb
      .from('travel_data')
      .select('*, qr_codes(*)', { count: 'exact' })
      .eq('user_id', userId)
      .order('departure_date', { ascending: false })
      .range(from, to);

    if (error || (!travels?.length && historicoPage === 0)) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">${Icons['empty-clock']}</div>
          <h4>Nenhum registro</h4>
          <p>Seu histórico aparecerá aqui após sua primeira viagem.</p>
        </div>
      `;
      return;
    }

    const totalPages = Math.ceil((count || 0) / HISTORICO_PAGE_SIZE);

    content.innerHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>Rota</th>
            <th>Data</th>
            <th>Transporte</th>
            <th>QR Code</th>
          </tr>
        </thead>
        <tbody>
          ${(travels || []).map(t => {
            const qr = t.qr_codes?.[0];
            const expired = t.departure_date && !isFutureDate(t.departure_date);
            return `
              <tr>
                <td>${sanitizeHTML(t.origin)} → ${sanitizeHTML(t.destination)}</td>
                <td>${formatDate(t.departure_date)}</td>
                <td>${getTransportLabel(t.transport_type)}</td>
                <td>
                  ${qr ? `<span class="badge badge-${expired ? 'warning' : 'success'}">${expired ? 'Expirado' : 'Ativo'}</span>` : '<span class="badge badge-neutral">—</span>'}
                </td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      ${totalPages > 1 ? `
        <div class="pagination mt-md" style="display:flex;justify-content:center;gap:6px;flex-wrap:wrap;">
          <button class="pagination-btn" id="hist-prev" ${historicoPage === 0 ? 'disabled' : ''}>&laquo; Anterior</button>
          <span class="text-sm text-muted" style="padding:8px;">${historicoPage + 1} / ${totalPages}</span>
          <button class="pagination-btn" id="hist-next" ${historicoPage >= totalPages - 1 ? 'disabled' : ''}>Próxima &raquo;</button>
        </div>
      ` : ''}
    `;

    document.getElementById('hist-prev')?.addEventListener('click', () => {
      if (historicoPage > 0) { historicoPage--; loadHistoricoPage(); }
    });
    document.getElementById('hist-next')?.addEventListener('click', () => {
      if (historicoPage < totalPages - 1) { historicoPage++; loadHistoricoPage(); }
    });
  }

  // ═══════════════════════════════════════
  //  PERFIL — Editable Profile
  // ═══════════════════════════════════════
  function renderPerfil(container) {
    const profile = State.get('profile');
    const patient = State.get('patient');
    const user = State.get('user');

    container.innerHTML = `
      <div class="page-header">
        <h2>Meu Perfil</h2>
        <p>Atualize seus dados de contato e foto sem refazer o cadastro</p>
      </div>

      <div class="cards-grid">
        <!-- Photo Card -->
        <div class="card">
          <div class="card-header"><h3 class="card-title">${Icons.camera || ''} Foto de Perfil</h3></div>
          <div class="card-body">
            <div style="display:flex;flex-direction:column;align-items:center;gap:16px;">
              <div id="perfil-avatar" style="width:100px;height:100px;border-radius:50%;background:var(--surface-hover);display:flex;align-items:center;justify-content:center;font-size:36px;font-weight:700;color:var(--green);border:3px solid var(--green);overflow:hidden;">
                ${profile?.avatar_url
                  ? `<img src="${sanitizeHTML(profile.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" alt="Foto">`
                  : getInitials(profile?.full_name)}
              </div>
              <div style="text-align:center;">
                <label class="btn btn-secondary btn-sm" style="cursor:pointer;">
                  ${Icons.upload} Alterar Foto
                  <input type="file" id="perfil-photo-input" accept="image/jpeg,image/png" style="display:none;">
                </label>
                <p class="text-xs text-muted mt-sm">JPG ou PNG, máx. 2MB</p>
              </div>
              <div id="perfil-photo-status"></div>
            </div>
          </div>
        </div>

        <!-- Contact Info Card -->
        <div class="card">
          <div class="card-header"><h3 class="card-title">${Icons.mail || ''} Dados de Contato</h3></div>
          <div class="card-body">
            <div class="form-stack">
              <div class="form-group">
                <label class="form-label" for="perfil-name">Nome Completo</label>
                <input class="form-input" type="text" id="perfil-name" value="${sanitizeHTML(profile?.full_name || '')}" disabled>
                <span class="form-hint">Para alterar o nome, utilize a Renovação de Cadastro.</span>
              </div>
              <div class="form-group">
                <label class="form-label" for="perfil-email">E-mail</label>
                <input class="form-input" type="email" id="perfil-email" value="${sanitizeHTML(profile?.email || user?.email || '')}">
              </div>
              <div class="form-group">
                <label class="form-label" for="perfil-phone">Telefone</label>
                <input class="form-input" type="text" id="perfil-phone" value="${maskPhone(patient?.phone || profile?.phone || '')}" placeholder="(00) 00000-0000" maxlength="15">
              </div>
              <button class="btn btn-primary" id="perfil-save-btn">${Icons.check} Salvar Alterações</button>
            </div>
          </div>
        </div>
      </div>

      <!-- Account Card -->
      <div class="card mt-md">
        <div class="card-header"><h3 class="card-title">${Icons.lock} Segurança</h3></div>
        <div class="card-body">
          <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px;">
            <div>
              <strong>Senha da conta</strong>
              <p class="text-sm text-muted">Altere sua senha de acesso ao Cannapass</p>
            </div>
            <button class="btn btn-secondary btn-sm" id="perfil-change-pw-btn">${Icons.lock} Alterar Senha</button>
          </div>
        </div>
      </div>
    `;

    // Phone mask
    const phoneInput = document.getElementById('perfil-phone');
    phoneInput?.addEventListener('input', (e) => {
      e.target.value = maskPhone(e.target.value);
    });

    // Photo upload handler with preview
    const photoInput = document.getElementById('perfil-photo-input');
    photoInput?.addEventListener('change', () => {
      const file = photoInput.files?.[0];
      if (!file) return;
      if (!['image/jpeg', 'image/png'].includes(file.type)) {
        Toast.error('Formato inválido. Use JPG ou PNG.');
        photoInput.value = '';
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        Toast.error('A foto deve ter no máximo 2MB.');
        photoInput.value = '';
        return;
      }
      // Show preview
      const reader = new FileReader();
      reader.onload = (e) => {
        const avatarEl = document.getElementById('perfil-avatar');
        if (avatarEl) avatarEl.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;" alt="Preview">`;
        const statusEl = document.getElementById('perfil-photo-status');
        if (statusEl) statusEl.innerHTML = `
          <div style="display:flex;gap:8px;justify-content:center;">
            <button class="btn btn-primary btn-sm" id="perfil-photo-confirm">${Icons.check} Confirmar</button>
            <button class="btn btn-secondary btn-sm" id="perfil-photo-cancel">${Icons.x} Cancelar</button>
          </div>
        `;
        document.getElementById('perfil-photo-confirm')?.addEventListener('click', () => handleProfilePhotoUpload(photoInput));
        document.getElementById('perfil-photo-cancel')?.addEventListener('click', () => {
          photoInput.value = '';
          statusEl.innerHTML = '';
          const profile = State.get('profile');
          if (avatarEl) avatarEl.innerHTML = profile?.avatar_url
            ? `<img src="${sanitizeHTML(profile.avatar_url)}" style="width:100%;height:100%;object-fit:cover;" alt="Foto">`
            : getInitials(profile?.full_name);
        });
      };
      reader.readAsDataURL(file);
    });

    // Save contact info
    document.getElementById('perfil-save-btn')?.addEventListener('click', saveProfileContact);

    // Change password
    document.getElementById('perfil-change-pw-btn')?.addEventListener('click', () => {
      if (typeof Auth !== 'undefined' && Auth.showChangePasswordModal) {
        Auth.showChangePasswordModal();
      } else {
        Auth.changePassword();
      }
    });

    // ─── Unsaved changes detection ───
    const origEmail = document.getElementById('perfil-email')?.value || '';
    const origPhone = document.getElementById('perfil-phone')?.value || '';
    const saveBtn = document.getElementById('perfil-save-btn');

    function checkDirty() {
      const curEmail = document.getElementById('perfil-email')?.value || '';
      const curPhone = document.getElementById('perfil-phone')?.value || '';
      const isDirty = curEmail !== origEmail || curPhone !== origPhone;
      if (saveBtn) {
        saveBtn.style.opacity = isDirty ? '1' : '0.6';
        saveBtn.title = isDirty ? 'Salvar alterações pendentes' : '';
      }
      return isDirty;
    }

    document.getElementById('perfil-email')?.addEventListener('input', checkDirty);
    document.getElementById('perfil-phone')?.addEventListener('input', checkDirty);

    // Warn on navigation if dirty
    const _navWarn = () => {
      if (checkDirty()) {
        const leave = confirm('Você tem alterações não salvas. Deseja sair mesmo assim?');
        if (!leave) {
          // Re-set hash to perfil
          window.removeEventListener('hashchange', _navWarn);
          window.location.hash = 'perfil';
          setTimeout(() => window.addEventListener('hashchange', _navWarn, { once: true }), 50);
          return;
        }
      }
      window.removeEventListener('hashchange', _navWarn);
    };
    window.addEventListener('hashchange', _navWarn, { once: true });
  }

  // ─── Compress image to max dimension using canvas ───
  function compressImage(file, maxSize = 500) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width <= maxSize && height <= maxSize) {
          resolve(file); // already small enough
          return;
        }
        // Scale down proportionally
        if (width > height) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        } else {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        canvas.getContext('2d').drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          resolve(blob || file);
        }, 'image/jpeg', 0.85);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }

  async function handleProfilePhotoUpload(input) {
    const file = input.files?.[0];
    if (!file) return;

    const statusEl = document.getElementById('perfil-photo-status');
    const userId = State.get('user')?.id;
    if (!userId) return;

    if (statusEl) statusEl.innerHTML = '<p class="text-muted text-sm">Comprimindo e enviando...</p>';

    try {
      // Compress before upload
      const compressed = await compressImage(file, 500);
      const filePath = `${userId}/profile_photo.jpg`;

      // Upload (upsert: true to replace existing)
      const { error: uploadError } = await sb.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, compressed, { contentType: 'image/jpeg', upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = sb.storage.from(STORAGE_BUCKET).getPublicUrl(filePath);
      const photoUrl = urlData?.publicUrl ? `${urlData.publicUrl}?t=${Date.now()}` : null;

      // Update profile record
      if (photoUrl) {
        const { error: updateError } = await sb.from('profiles')
          .update({ avatar_url: photoUrl })
          .eq('id', userId);

        if (updateError) throw updateError;

        // Update local state
        const profile = State.get('profile');
        if (profile) {
          profile.avatar_url = photoUrl;
          State.set('profile', profile);
        }

        // Update avatar display
        const avatarEl = document.getElementById('perfil-avatar');
        if (avatarEl) {
          avatarEl.innerHTML = `<img src="${sanitizeHTML(photoUrl)}" style="width:100%;height:100%;object-fit:cover;" alt="Foto">`;
        }

        Toast.success('Foto atualizada com sucesso!');
      }
    } catch (err) {
      console.error('[Patient] Photo upload error:', err);
      Toast.error('Erro ao enviar foto. Tente novamente.');
    } finally {
      if (statusEl) statusEl.innerHTML = '';
      input.value = '';
    }
  }

  async function saveProfileContact() {
    const btn = document.getElementById('perfil-save-btn');
    const email = document.getElementById('perfil-email')?.value?.trim();
    const phone = document.getElementById('perfil-phone')?.value?.replace(/\D/g, '');

    if (!email) { Toast.warning('Informe o e-mail.'); return; }
    if (phone && phone.length < 10) { Toast.warning('Telefone inválido.'); return; }

    const userId = State.get('user')?.id;
    if (!userId) return;

    setButtonLoading(btn, true, 'Salvando...');

    try {
      // Update profiles table (email only — profiles has no phone column)
      const { error: profileError } = await sb.from('profiles')
        .update({ email })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update patients table (email + phone)
      const patient = State.get('patient');
      if (patient?.id) {
        const { error: patientError } = await sb.from('patients')
          .update({ email, phone })
          .eq('id', patient.id);

        if (patientError) console.warn('[Patient] Patient table update warning:', patientError);

        patient.email = email;
        patient.phone = phone;
        State.set('patient', patient);
      }

      // Update profile local state
      const prevEmail = State.get('profile')?.email;
      const profile = State.get('profile');
      if (profile) {
        profile.email = email;
        State.set('profile', profile);
      }

      // If email changed, inform about verification
      if (prevEmail && prevEmail !== email) {
        Toast.success('Dados atualizados! Verifique o novo e-mail para confirmação.');
      } else {
        Toast.success('Dados atualizados com sucesso!');
      }
    } catch (err) {
      console.error('[Patient] Profile save error:', err);
      Toast.error('Erro ao salvar. Tente novamente.');
    } finally {
      setButtonLoading(btn, false);
    }
  }

  // ─── Start Renewal Mode ───
  function _startRenewal() {
    isRenewalMode = true;
    uploadedFiles = {};
    wizardStep = 1;
    Router.navigate('cadastro');
  }

  // ─── Public API ───
  return { render, _nextStep, _prevStep, _startRenewal };
})();
