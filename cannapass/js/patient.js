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
  const WIZARD_DRAFT_KEY = 'cannapass-wizard-draft';

  function saveWizardDraft() {
    try {
      const draft = { wizardData, wizardStep, savedAt: Date.now() };
      localStorage.setItem(WIZARD_DRAFT_KEY, JSON.stringify(draft));
    } catch { /* ignore quota errors */ }
  }

  function loadWizardDraft() {
    try {
      const raw = localStorage.getItem(WIZARD_DRAFT_KEY);
      if (!raw) return null;
      const draft = JSON.parse(raw);
      if (Date.now() - draft.savedAt > 86400000) {
        localStorage.removeItem(WIZARD_DRAFT_KEY);
        return null;
      }
      return draft;
    } catch { return null; }
  }

  function clearWizardDraft() {
    localStorage.removeItem(WIZARD_DRAFT_KEY);
  }

  function render(page, container) {
    switch (page) {
      case 'dashboard': renderDashboard(container); break;
      case 'cadastro': renderCadastro(container); break;
      case 'documentos': renderDocumentos(container); break;
      case 'viagem': renderViagem(container); break;
      case 'qrcode': renderQRCode(container); break;
      case 'historico': renderHistorico(container); break;
      case 'suporte': renderSuporte(container); break;
      case 'diretorio': renderDiretorio(container); break;
      case 'ajuda': renderAjuda(container); break;
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
            <div class="stat-value" id="doc-count">—</div>
            <div class="stat-label">Documentos Enviados</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-qr']}</div>
          <div class="stat-info">
            <div class="stat-value" id="qr-count">—</div>
            <div class="stat-label">QR Codes Ativos</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-travel']}</div>
          <div class="stat-info">
            <div class="stat-value" id="trip-count">—</div>
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
            <label class="form-label" for="w-crm-number">CRM *</label>
            <div style="display:flex; gap:8px;">
              <input class="form-input" type="text" inputmode="numeric" id="w-crm-number" placeholder="Número" style="flex:1;" value="${sanitizeHTML(parseCrm(wizardData.doctor_crm).number)}">
              <select class="form-select" id="w-crm-uf" style="flex:1;" aria-label="Estado do CRM">
                <option value="">UF...</option>
                ${ufOptionsHTML(parseCrm(wizardData.doctor_crm).uf)}
              </select>
            </div>
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
          <label class="form-label" for="w-court-ordinal">Vara / Tribunal *</label>
          <div style="display:flex; gap:8px;">
            <select class="form-select" id="w-court-ordinal" style="flex:0 0 90px;" aria-label="Número da vara">
              <option value="">Nº...</option>
              ${ordinalOptionsHTML(parseCourt(wizardData.court).ordinal)}
            </select>
            <select class="form-select" id="w-court-type" style="flex:2;" aria-label="Tipo de vara">
              <option value="">Selecione o tipo...</option>
              ${courtTypeOptionsHTML(parseCourt(wizardData.court).type)}
            </select>
            <select class="form-select" id="w-court-uf" style="flex:1;" aria-label="Estado da vara">
              <option value="">UF...</option>
              ${ufOptionsHTML(parseCourt(wizardData.court).uf)}
            </select>
          </div>
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
          wizardData.doctor_crm = composeCrm(
            document.getElementById('w-crm-number')?.value,
            document.getElementById('w-crm-uf')?.value
          );
          wizardData.prescription_validity = document.getElementById('w-prescription-validity')?.value || '';
        } else if (wizardData.via_type === VIA.HABEAS) {
          wizardData.hc_number = document.getElementById('w-hc-number')?.value.trim() || '';
          wizardData.salvo_conduto = document.getElementById('w-salvo-conduto')?.value.trim() || '';
          wizardData.court = composeCourt(
            document.getElementById('w-court-ordinal')?.value,
            document.getElementById('w-court-type')?.value,
            document.getElementById('w-court-uf')?.value
          );
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
          if (!wizardData.doctor_crm) { Toast.error('Informe o número do CRM e selecione a UF.'); return false; }
          if (!wizardData.prescription_validity) { Toast.error('Informe a validade da prescrição.'); return false; }
        }
        if (wizardData.via_type === VIA.HABEAS) {
          if (!wizardData.hc_number) { Toast.error('Informe o número do Habeas Corpus. Este campo é obrigatório.'); return false; }
          if (!wizardData.salvo_conduto) { Toast.error('Informe o número do Salvo Conduto. Este campo é obrigatório.'); return false; }
          if (!wizardData.court) { Toast.error('Selecione o número, o tipo e a UF da Vara/Tribunal.'); return false; }
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
      clearWizardDraft();

      if (isRenewalMode) {
        isRenewalMode = false;
        Toast.success('Renovacao enviada com sucesso! Aguarde a analise.');
      } else {
        Toast.success('Cadastro enviado com sucesso! Aguarde a analise.');
      }
      Router.navigate('dashboard');

      // 8. Send confirmation email (non-blocking)
      try {
        sb.functions.invoke('send-notification', {
          body: {
            type: 'registration_submitted',
            patient_email: wizardData.email || patient.email,
            patient_name: patient.full_name
          }
        }).catch(err => console.warn('[Patient] Email notification error:', err));
      } catch (_) { /* non-blocking */ }

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

      // Só é permitido 1 documento por tipo (constraint única patient_id + doc_type).
      // Se já existir um deste tipo, vamos substituí-lo e limpar o arquivo antigo.
      const { data: existing } = await sb.from('documents')
        .select('id, file_path')
        .eq('patient_id', patient.id)
        .eq('doc_type', docType)
        .maybeSingle();

      const { error: uploadError } = await sb.storage
        .from(STORAGE_BUCKET)
        .upload(filePath, file, { contentType: file.type, upsert: false });

      if (uploadError) throw uploadError;

      // Insere ou substitui o registro do mesmo tipo
      const { error: dbError } = await sb.from('documents').upsert({
        patient_id: patient.id,
        user_id: userId,
        doc_type: docType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        status: 'uploaded'
      }, { onConflict: 'patient_id,doc_type' });

      if (dbError) {
        // Evita arquivo órfão: remove o que acabou de subir se o registro falhou
        await sb.storage.from(STORAGE_BUCKET).remove([filePath]).catch(() => {});
        throw dbError;
      }

      // Substituiu um documento anterior? Remove o arquivo antigo do storage
      if (existing?.file_path && existing.file_path !== filePath) {
        await sb.storage.from(STORAGE_BUCKET).remove([existing.file_path]).catch(() => {});
      }

      Toast.success(existing ? 'Documento atualizado com sucesso!' : 'Documento enviado com sucesso!');

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
  // Monta as cidades disponíveis agrupadas por estado, para o paciente apenas
  // selecionar (evita grafias divergentes como "Florianopolis" x "Florianópolis").
  function cityOptionsHTML() {
    const byUf = {};
    Object.values(BRAZIL_CITIES).forEach(c => {
      (byUf[c.uf] = byUf[c.uf] || []).push(c.name);
    });
    return Object.keys(byUf)
      .sort((a, b) => (UF_NAMES[a] || a).localeCompare(UF_NAMES[b] || b, 'pt-BR'))
      .map(uf => {
        const cities = [...new Set(byUf[uf])].sort((a, b) => a.localeCompare(b, 'pt-BR'));
        return `<optgroup label="${sanitizeHTML(UF_NAMES[uf] || uf)}">` +
          cities.map(n => `<option value="${sanitizeHTML(n)}">${sanitizeHTML(n)}</option>`).join('') +
          `</optgroup>`;
      }).join('');
  }

  // Aeroportos agrupados por estado — usados apenas quando o transporte é aéreo
  function airportOptionsHTML() {
    const byUf = {};
    AIRPORTS.forEach(a => { (byUf[a.uf] = byUf[a.uf] || []).push(a); });
    return Object.keys(byUf)
      .sort((a, b) => (UF_NAMES[a] || a).localeCompare(UF_NAMES[b] || b, 'pt-BR'))
      .map(uf => {
        const list = byUf[uf].slice().sort((a, b) => a.city.localeCompare(b.city, 'pt-BR'));
        return `<optgroup label="${sanitizeHTML(UF_NAMES[uf] || uf)}">` +
          list.map(a => {
            const label = `${a.code} — ${a.name} (${a.city})`;
            return `<option value="${sanitizeHTML(label)}">${sanitizeHTML(label)}</option>`;
          }).join('') + `</optgroup>`;
      }).join('');
  }

  // ─── Padronização dos campos de CRM e Vara (selecionar em vez de digitar) ───
  function ufOptionsHTML(selected) {
    return Object.keys(UF_NAMES).sort().map(uf =>
      `<option value="${uf}"${uf === selected ? ' selected' : ''}>${uf} — ${sanitizeHTML(UF_NAMES[uf])}</option>`
    ).join('');
  }

  function ordinalOptionsHTML(selected) {
    let out = '';
    for (let i = 1; i <= 30; i++) {
      out += `<option value="${i}"${String(i) === String(selected) ? ' selected' : ''}>${i}ª</option>`;
    }
    return out;
  }

  function courtTypeOptionsHTML(selected) {
    return COURT_TYPES.map(t =>
      `<option value="${t}"${t === selected ? ' selected' : ''}>${t}</option>`
    ).join('');
  }

  // "CRM/SP 123456" → { uf, number } (tolerante a valores antigos)
  function parseCrm(value) {
    const v = (value || '').trim();
    if (!v) return { uf: '', number: '' };
    const uf = (v.toUpperCase().match(/\b([A-Z]{2})\b/) || [])[1] || '';
    const number = (v.match(/(\d{3,})/) || [])[1] || '';
    return { uf: UF_NAMES[uf] ? uf : '', number };
  }
  function composeCrm(number, uf) {
    const n = (number || '').trim();
    if (!n) return '';
    return uf ? `CRM/${uf} ${n}` : n;
  }

  // "7ª Vara Federal — SC" → { ordinal, type, uf }. Também tenta ler textos
  // antigos como "7 Vara Federal de Florianópolis" (deduz a UF pela cidade).
  function parseCourt(value) {
    const v = (value || '').trim();
    if (!v) return { ordinal: '', type: '', uf: '' };
    const ordinal = (v.match(/(\d{1,2})\s*[ªa]?/) || [])[1] || '';
    const type = COURT_TYPES.find(t => v.toLowerCase().includes(t.toLowerCase())) || '';
    let uf = (v.toUpperCase().match(/\b([A-Z]{2})\b/) || [])[1] || '';
    if (!UF_NAMES[uf]) {
      uf = '';
      const lower = v.toLowerCase();
      for (const c of Object.values(BRAZIL_CITIES)) {
        if (lower.includes(c.name.toLowerCase())) { uf = c.uf; break; }
      }
    }
    return { ordinal, type, uf };
  }
  function composeCourt(ordinal, type, uf) {
    if (!ordinal || !type || !uf) return '';
    return `${ordinal}ª ${type} — ${uf}`;
  }

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

    const cityOpts = cityOptionsHTML();
    const airportOpts = airportOptionsHTML();

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
                <select class="form-select" id="t-origin" required>
                  <option value="">Selecione a cidade...</option>
                  ${cityOpts}
                </select>
              </div>
              <div class="travel-route-arrow">→</div>
              <div class="form-group" style="flex:1;">
                <label class="form-label" for="t-destination">Destino *</label>
                <select class="form-select" id="t-destination" required>
                  <option value="">Selecione a cidade...</option>
                  ${cityOpts}
                </select>
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

            <!-- Aeroportos: exibidos apenas quando o transporte é aéreo -->
            <div class="grid-2 hidden" id="airport-fields">
              <div class="form-group">
                <label class="form-label" for="t-airport-dest">Aeroporto de destino *</label>
                <select class="form-select" id="t-airport-dest">
                  <option value="">Selecione o aeroporto...</option>
                  ${airportOpts}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="t-airport-return">Aeroporto de retorno</label>
                <select class="form-select" id="t-airport-return">
                  <option value="">Selecione o aeroporto...</option>
                  ${airportOpts}
                </select>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="t-product">Produto *</label>
                <select class="form-select" id="t-product" required>
                  <option value="">Selecione...</option>
                  ${PRODUCT_OPTIONS.map(o => `<option value="${o}">${o}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="t-quantity">Quantidade *</label>
                <select class="form-select" id="t-quantity" required disabled>
                  <option value="">Selecione o produto primeiro</option>
                </select>
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

    // A quantidade depende do produto: só oferece as medidas que fazem sentido
    const productSel = document.getElementById('t-product');
    const qtySel = document.getElementById('t-quantity');

    function refreshQuantityOptions(preselect) {
      if (!qtySel) return;
      const opts = QUANTITY_OPTIONS[productSel?.value] || [];
      if (!opts.length) {
        qtySel.innerHTML = '<option value="">Selecione o produto primeiro</option>';
        qtySel.disabled = true;
        return;
      }
      qtySel.disabled = false;
      qtySel.innerHTML = '<option value="">Selecione...</option>' +
        opts.map(o => `<option value="${o}">${o}</option>`).join('');
      if (preselect && opts.includes(preselect)) qtySel.value = preselect;
    }

    if (productSel) {
      // Pré-seleciona o produto do cadastro, quando casar com uma das opções
      const cadastroProduct = (patient.product_type || patient.product_name || '').trim().toLowerCase();
      const match = Array.from(productSel.options).find(o => o.value && o.value.toLowerCase() === cadastroProduct);
      if (match) productSel.value = match.value;
      productSel.addEventListener('change', () => refreshQuantityOptions());
    }
    refreshQuantityOptions((patient.transport_quantity || patient.total_quantity || '').trim());

    // Aeroportos só fazem sentido em viagem aérea
    const transportSel = document.getElementById('t-transport');
    const airportFields = document.getElementById('airport-fields');
    const airportDest = document.getElementById('t-airport-dest');
    const airportReturn = document.getElementById('t-airport-return');

    function refreshAirportFields() {
      const isAir = transportSel?.value === TRANSPORT.AIR;
      airportFields?.classList.toggle('hidden', !isAir);
      if (airportDest) airportDest.required = isAir;
      if (!isAir) {
        if (airportDest) airportDest.value = '';
        if (airportReturn) airportReturn.value = '';
      }
    }
    transportSel?.addEventListener('change', refreshAirportFields);
    refreshAirportFields();

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
      const product = document.getElementById('t-product').value.trim();
      const quantity = document.getElementById('t-quantity').value.trim();
      const notes = document.getElementById('t-notes').value.trim() || null;
      const isAir = transport === TRANSPORT.AIR;
      const airportDest = isAir ? (document.getElementById('t-airport-dest')?.value || '') : '';
      const airportReturn = isAir ? (document.getElementById('t-airport-return')?.value || '') : '';

      if (!origin || !destination || !departure || !transport || !product || !quantity) {
        Toast.error('Preencha todos os campos obrigatórios.');
        return;
      }

      if (isAir && !airportDest) {
        Toast.error('Selecione o aeroporto de destino.');
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
          product,
          quantity,
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
          flight_or_bus: flight,
          airport_destination: airportDest || null,
          airport_return: airportReturn || null
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

        ${(travel?.airport_destination || travel?.airport_return) ? `
        <div class="qr-meta mt-sm">
          ${travel?.airport_destination ? `
          <div class="qr-meta-item">
            <div class="qr-meta-label">Aeroporto de destino</div>
            <div class="qr-meta-value">${sanitizeHTML(travel.airport_destination)}</div>
          </div>` : ''}
          ${travel?.airport_return ? `
          <div class="qr-meta-item">
            <div class="qr-meta-label">Aeroporto de retorno</div>
            <div class="qr-meta-value">${sanitizeHTML(travel.airport_return)}</div>
          </div>` : ''}
        </div>` : ''}
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
  async function renderHistorico(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Historico</h2>
        <p>Viagens anteriores e verificacoes dos seus QR Codes</p>
      </div>

      <!-- Viagens -->
      <div class="card mb-md">
        <div class="card-header">
          <h3 class="card-title">Viagens</h3>
        </div>
        <div class="card-body" id="history-travels">
          <div class="flex-center"><div class="spinner"></div></div>
        </div>
      </div>

      <!-- Verificacoes -->
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Verificacoes dos seus QR Codes</h3>
          <span class="text-sm text-muted">Quando e onde agentes escanearam seu QR Code</span>
        </div>
        <div class="card-body" id="history-verifications">
          <div class="flex-center"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    const userId = State.get('user')?.id;

    // Load both in parallel
    const [travelsRes, verifsRes] = await Promise.all([
      sb.from('travel_data').select('*, qr_codes(*)').eq('user_id', userId).order('departure_date', { ascending: false }),
      sb.from('verifications').select('*, qr_codes!inner(user_id)').eq('qr_codes.user_id', userId).order('created_at', { ascending: false }).limit(50)
    ]);

    // ── Render Travels ──
    const travelsEl = document.getElementById('history-travels');
    if (travelsEl) {
      const travels = travelsRes.data || [];
      if (!travels.length) {
        travelsEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${Icons['empty-clock']}</div>
            <h4>Nenhuma viagem</h4>
            <p>Seu historico aparecera aqui apos sua primeira viagem.</p>
          </div>
        `;
      } else {
        travelsEl.innerHTML = `
          <table class="table">
            <thead><tr><th>Rota</th><th>Data</th><th>Transporte</th><th>QR Code</th></tr></thead>
            <tbody>
              ${travels.map(t => {
                const qr = Array.isArray(t.qr_codes) ? t.qr_codes[0] : t.qr_codes;
                const expired = t.departure_date && !isFutureDate(t.departure_date);
                return `<tr>
                  <td>${sanitizeHTML(t.origin)} &rarr; ${sanitizeHTML(t.destination)}</td>
                  <td>${formatDate(t.departure_date)}</td>
                  <td>${getTransportLabel(t.transport_type)}</td>
                  <td>${qr ? `<span class="badge badge-${expired ? 'warning' : 'success'}">${expired ? 'Expirado' : 'Ativo'}</span>` : '<span class="badge badge-neutral">&mdash;</span>'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        `;
      }
    }

    // ── Render Verifications ──
    const verifsEl = document.getElementById('history-verifications');
    if (verifsEl) {
      const verifs = verifsRes.data || [];
      if (verifsRes.error || !verifs.length) {
        verifsEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${Icons['stat-verified'] || Icons.success}</div>
            <h4>Nenhuma verificacao</h4>
            <p>Quando um agente escanear seu QR Code, o registro aparecera aqui.</p>
          </div>
        `;
      } else {
        const resultIcons = {
          valid: `<span class="badge badge-success">Valido</span>`,
          invalid: `<span class="badge badge-danger">Invalido</span>`,
          expired: `<span class="badge badge-warning">Expirado</span>`,
          suspicious: `<span class="badge badge-danger">Suspeito</span>`
        };

        verifsEl.innerHTML = `
          <div class="text-sm text-muted mb-sm">${verifs.length} verificacao(oes) encontrada(s)</div>
          <table class="table">
            <thead><tr><th>Data/Hora</th><th>Agente</th><th>Local</th><th>Resultado</th></tr></thead>
            <tbody>
              ${verifs.map(v => `<tr>
                <td>${formatDateTime(v.created_at)}</td>
                <td>
                  <strong>${sanitizeHTML(v.agent_name || 'Agente')}</strong>
                  ${v.agent_organization ? `<br><span class="text-sm text-muted">${sanitizeHTML(v.agent_organization)}</span>` : ''}
                </td>
                <td>
                  ${sanitizeHTML(v.agent_location || '—')}
                  ${v.latitude && v.longitude ? `<br><span class="text-sm text-muted">${v.latitude.toFixed(4)}, ${v.longitude.toFixed(4)}</span>` : ''}
                </td>
                <td>${resultIcons[v.result] || v.result}</td>
              </tr>`).join('')}
            </tbody>
          </table>
        `;
      }
    }
  }

  // ═══════════════════════════════════════
  //  SUPORTE
  // ═══════════════════════════════════════
  async function renderSuporte(container) {
    container.innerHTML = `<div class="loading-state"><div class="spinner"></div><p>Carregando...</p></div>`;

    const { data: configs } = await sb.from('app_config').select('key, value');
    const cfg = {};
    (configs || []).forEach(c => { cfg[c.key] = c.value; });

    const whatsapp = cfg.support_whatsapp || '';
    const phone    = cfg.support_phone    || '';
    const email    = cfg.support_email    || '';
    const hours    = cfg.support_hours    || 'Seg–Sex, 9h–18h';
    const waNum    = whatsapp.replace(/\D/g, '');
    const waUrl    = waNum  ? `https://wa.me/55${waNum}` : null;
    const telUrl   = phone  ? `tel:+55${phone.replace(/\D/g, '')}` : null;

    container.innerHTML = `
      <div class="page-header">
        <h2>Suporte</h2>
        <p class="text-muted">Central de atendimento Cannapass.</p>
      </div>

      <div class="alert alert-warning" style="margin-bottom:24px;">
        <div style="display:flex;align-items:flex-start;gap:12px;">
          <div style="flex-shrink:0;margin-top:2px;">${Icons.warning}</div>
          <div>
            <strong>Em caso de abordagem policial ou fiscalização</strong>
            <p style="margin:6px 0 0;font-size:.88rem;line-height:1.5;">
              Se seu QR Code não está sendo reconhecido durante uma abordagem, entre em contato com a central imediatamente. Nossa equipe pode confirmar sua situação em tempo real.
            </p>
          </div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-bottom:20px;">
        ${waUrl ? `
        <div class="card" style="text-align:center;padding:28px 20px;">
          <div style="width:56px;height:56px;border-radius:50%;background:#25D36618;display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="#25D366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
          </div>
          <h3 style="margin:0 0 4px;font-size:1rem;">WhatsApp</h3>
          <p style="color:var(--text-muted);font-size:.82rem;margin:0 0 16px;">Resposta imediata</p>
          <a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-primary" style="width:100%;background:#25D366;border-color:#25D366;">
            Abrir WhatsApp
          </a>
        </div>` : ''}

        ${telUrl ? `
        <div class="card" style="text-align:center;padding:28px 20px;">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--primary-alpha,#16a34a18);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
            ${Icons.suporte}
          </div>
          <h3 style="margin:0 0 4px;font-size:1rem;">Telefone</h3>
          <p style="color:var(--text-muted);font-size:.82rem;margin:0 0 16px;">${sanitizeHTML(hours)}</p>
          <a href="${telUrl}" class="btn btn-outline" style="width:100%;">Ligar agora</a>
        </div>` : ''}

        ${email ? `
        <div class="card" style="text-align:center;padding:28px 20px;">
          <div style="width:56px;height:56px;border-radius:50%;background:var(--primary-alpha,#16a34a18);display:flex;align-items:center;justify-content:center;margin:0 auto 14px;">
            ${Icons.mail}
          </div>
          <h3 style="margin:0 0 4px;font-size:1rem;">E-mail</h3>
          <p style="color:var(--text-muted);font-size:.82rem;margin:0 0 16px;">Resposta em até 24h</p>
          <a href="mailto:${sanitizeHTML(email)}" class="btn btn-outline" style="width:100%;">Enviar e-mail</a>
        </div>` : ''}

        ${!waUrl && !telUrl && !email ? `
        <div class="card" style="text-align:center;padding:40px 20px;grid-column:1/-1;">
          ${Icons.info}
          <p style="margin-top:12px;color:var(--text-muted);">Contatos de suporte serão configurados em breve.</p>
        </div>` : ''}
      </div>

      <div class="card">
        <h3 style="margin:0 0 16px;">Dúvidas frequentes</h3>
        <div style="display:flex;flex-direction:column;gap:10px;">
          ${[
            ['QR Code não está sendo reconhecido',
             'Verifique se o QR Code não está vencido na aba "Meu QR Code". Se ainda válido, o agente pode tentar escanear com melhor iluminação ou acessar o link diretamente. Em último caso, acione o suporte acima.'],
            ['Cadastro pendente há muito tempo',
             'O prazo padrão de análise é de até 3 dias úteis. Se já passou desse prazo, entre em contato informando nome completo e CPF.'],
            ['Documentos rejeitados — o que fazer?',
             'Acesse a aba "Documentos" para ver o motivo da rejeição. Corrija o arquivo indicado (geralmente legibilidade ou validade) e reenvie. O prazo de análise reinicia após o reenvio.'],
            ['Como atualizar minha receita médica?',
             'Acesse "Documentos", clique em substituir na receita médica e faça o upload do novo arquivo. Se a validade da sua prescrição expirou, pode ser necessário iniciar uma renovação de cadastro.']
          ].map(([q, a]) => `
          <details style="border:1px solid var(--border);border-radius:8px;">
            <summary style="padding:13px 16px;cursor:pointer;font-weight:500;user-select:none;">${sanitizeHTML(q)}</summary>
            <div style="padding:0 16px 13px;color:var(--text-muted);font-size:.88rem;line-height:1.6;border-top:1px solid var(--border);margin-top:0;padding-top:12px;">${sanitizeHTML(a)}</div>
          </details>`).join('')}
        </div>
      </div>
    `;
  }

  // ═══════════════════════════════════════
  //  DIRETÓRIO
  // ═══════════════════════════════════════
  async function renderDiretorio(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Diretório</h2>
        <p class="text-muted">Médicos prescritores, associações de pacientes e advogados especializados.</p>
      </div>
      <div class="loading-state"><div class="spinner"></div><p>Carregando diretório...</p></div>
    `;

    const { data, error } = await sb.from('directory').select('*').eq('active', true).order('name');

    if (error) {
      container.querySelector('.loading-state').outerHTML = `
        <div class="empty-state">${Icons.error}<p>Erro ao carregar diretório. Tente novamente.</p></div>`;
      return;
    }

    const entries = data || [];

    const typeLabels = { medico: 'Médico', associacao: 'Associação', advogado: 'Advogado' };
    const typeBadge  = { medico: 'badge-info', associacao: 'badge-success', advogado: 'badge-warning' };
    const stateList  = [...new Set(entries.map(e => e.state).filter(Boolean))].sort();

    let activeFilter = 'todos';
    let activeState  = '';

    function renderCards() {
      let filtered = entries;
      if (activeFilter !== 'todos') filtered = filtered.filter(e => e.type === activeFilter);
      if (activeState)              filtered = filtered.filter(e => e.state === activeState);

      const grid = container.querySelector('#dir-grid');
      if (!grid) return;

      if (!filtered.length) {
        grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1;">${Icons['empty-users']}<p>Nenhum resultado encontrado.</p></div>`;
        return;
      }

      grid.innerHTML = filtered.map(e => {
        const waNum  = (e.whatsapp || '').replace(/\D/g, '');
        const waUrl  = waNum ? `https://wa.me/55${waNum}` : null;
        const telUrl = e.phone ? `tel:+55${e.phone.replace(/\D/g, '')}` : null;
        return `
        <div class="card" style="display:flex;flex-direction:column;gap:0;">
          <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:10px;">
            <div>
              <span class="badge ${typeBadge[e.type] || 'badge-info'}" style="margin-bottom:6px;">${typeLabels[e.type] || e.type}</span>
              <h3 style="margin:0;font-size:1rem;line-height:1.3;">${sanitizeHTML(e.name)}</h3>
              ${e.specialty ? `<p style="margin:2px 0 0;font-size:.82rem;color:var(--text-muted);">${sanitizeHTML(e.specialty)}</p>` : ''}
            </div>
          </div>
          ${(e.city || e.state) ? `
          <div style="display:flex;align-items:center;gap:6px;font-size:.83rem;color:var(--text-muted);margin-bottom:8px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
            ${[e.city, e.state].filter(Boolean).map(sanitizeHTML).join(' — ')}
          </div>` : ''}
          ${e.description ? `<p style="font-size:.85rem;color:var(--text-muted);margin:0 0 12px;line-height:1.5;">${sanitizeHTML(e.description)}</p>` : ''}
          <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:auto;padding-top:12px;border-top:1px solid var(--border);">
            ${waUrl  ? `<a href="${waUrl}" target="_blank" rel="noopener" class="btn btn-sm" style="background:#25D366;color:#fff;border-color:#25D366;flex:1;text-align:center;">WhatsApp</a>` : ''}
            ${telUrl ? `<a href="${telUrl}" class="btn btn-outline btn-sm" style="flex:1;text-align:center;">Ligar</a>` : ''}
            ${e.website ? `<a href="${sanitizeHTML(e.website)}" target="_blank" rel="noopener" class="btn btn-outline btn-sm" style="flex:1;text-align:center;">Site</a>` : ''}
            ${e.email ? `<a href="mailto:${sanitizeHTML(e.email)}" class="btn btn-outline btn-sm" style="flex:1;text-align:center;">E-mail</a>` : ''}
          </div>
        </div>`;
      }).join('');
    }

    container.innerHTML = `
      <div class="page-header">
        <h2>Diretório</h2>
        <p class="text-muted">Médicos prescritores, associações de pacientes e advogados especializados.</p>
      </div>

      <div class="card" style="margin-bottom:20px;padding:16px 20px;">
        <div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;">
          <div style="display:flex;gap:6px;flex-wrap:wrap;">
            ${[['todos','Todos'],['medico','Médicos'],['associacao','Associações'],['advogado','Advogados']].map(([v,l]) =>
              `<button class="btn btn-sm dir-filter ${v === 'todos' ? 'btn-primary' : 'btn-outline'}" data-filter="${v}">${l}</button>`
            ).join('')}
          </div>
          ${stateList.length ? `
          <select class="form-control" id="dir-state-filter" style="width:auto;min-width:150px;padding:6px 10px;font-size:.85rem;">
            <option value="">Todos os estados</option>
            ${stateList.map(s => `<option value="${sanitizeHTML(s)}">${sanitizeHTML(s)}</option>`).join('')}
          </select>` : ''}
        </div>
      </div>

      <div id="dir-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;">
        ${!entries.length ? `<div class="empty-state" style="grid-column:1/-1;">${Icons['empty-users']}<p>Nenhum parceiro cadastrado ainda. Em breve!</p></div>` : ''}
      </div>
    `;

    if (entries.length) renderCards();

    container.querySelectorAll('.dir-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        activeFilter = btn.dataset.filter;
        container.querySelectorAll('.dir-filter').forEach(b => {
          b.className = `btn btn-sm dir-filter ${b.dataset.filter === activeFilter ? 'btn-primary' : 'btn-outline'}`;
        });
        renderCards();
      });
    });

    container.querySelector('#dir-state-filter')?.addEventListener('change', e => {
      activeState = e.target.value;
      renderCards();
    });
  }

  // ─── Start Renewal Mode ───
  function _startRenewal() {
    isRenewalMode = true;
    uploadedFiles = {};
    wizardStep = 1;
    Router.navigate('cadastro');
  }

  // ─── Public API ───
  // ═══════════════════════════════════════
  //  PRECISO DE AJUDA (chamados ao Diretório)
  // ═══════════════════════════════════════
  function helpCategoryLabel(v) {
    const c = HELP_CATEGORIES.find(x => x.value === v);
    return c ? c.label : (v || '—');
  }

  function helpUrgencyBadge(u) {
    const map = {
      emergencia: ['badge-danger',  'Emergência'],
      urgente:    ['badge-warning', 'Urgente'],
      normal:     ['badge-info',    'Normal']
    };
    const [cls, label] = map[u] || map.normal;
    return `<span class="badge ${cls}">${label}</span>`;
  }

  function renderAjuda(container) {
    const patient = State.get('patient');

    if (!patient) {
      container.innerHTML = `
        <div class="page-header"><h2>Preciso de Ajuda</h2></div>
        <div class="card"><div class="card-body">
          <div class="empty-state">
            <h4>Complete seu cadastro</h4>
            <p>Você precisa ter um cadastro para acionar nossos consultores.</p>
            <button class="btn btn-primary mt-md" onclick="Router.navigate('cadastro')">Ir para o Cadastro</button>
          </div>
        </div></div>`;
      return;
    }

    const ufOpts = Object.keys(UF_NAMES).sort()
      .map(uf => `<option value="${uf}">${uf} — ${sanitizeHTML(UF_NAMES[uf])}</option>`).join('');

    container.innerHTML = `
      <div class="page-header">
        <h2>Preciso de Ajuda</h2>
        <p>Nosso time de consultores parceiros atende você — médicos, advogados, engenheiros e associações</p>
      </div>

      <div class="card mb-md">
        <div class="card-body">
          <form id="help-form" class="form-stack">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="h-category">Sobre o que você precisa de ajuda? *</label>
                <select class="form-select" id="h-category" required>
                  <option value="">Selecione...</option>
                  ${HELP_CATEGORIES.map(c => `<option value="${c.value}">${c.label}</option>`).join('')}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="h-urgency">Urgência *</label>
                <select class="form-select" id="h-urgency" required>
                  ${URGENCY_LEVELS.map(u => `<option value="${u.value}">${u.label}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="h-state">Onde você está? *</label>
                <select class="form-select" id="h-state" required>
                  <option value="">Selecione o estado...</option>
                  ${ufOpts}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="h-subject">Assunto *</label>
                <input class="form-input" type="text" id="h-subject" placeholder="Resuma em poucas palavras" required maxlength="120">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="h-description">Descreva o que está acontecendo</label>
              <textarea class="form-input" id="h-description" rows="3" placeholder="Quanto mais detalhes, mais rápido o consultor consegue ajudar..."></textarea>
            </div>

            <div id="h-emergency-note" class="hidden">
              <p class="text-sm" style="color:var(--red);">
                <strong>Emergência:</strong> abriremos o chamado com prioridade máxima. Se estiver sendo abordado agora,
                mantenha a calma, apresente seu QR Code e aguarde o contato do consultor.
              </p>
            </div>

            <button type="submit" class="btn btn-primary btn-lg btn-block" id="help-submit">
              Acionar um consultor
            </button>
          </form>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h4 class="mb-md">Meus Chamados</h4>
          <div id="help-list"><div class="flex-center"><div class="spinner"></div></div></div>
        </div>
      </div>
    `;

    const urgencySel = document.getElementById('h-urgency');
    const note = document.getElementById('h-emergency-note');
    urgencySel?.addEventListener('change', () => {
      note?.classList.toggle('hidden', urgencySel.value !== 'emergencia');
    });

    document.getElementById('help-form')?.addEventListener('submit', handleHelpSubmit);
    loadMeusChamados();
  }

  async function handleHelpSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('help-submit');
    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
      const patient = State.get('patient');
      const userId = State.get('user').id;
      const category = document.getElementById('h-category').value;
      const urgency = document.getElementById('h-urgency').value;
      const state = document.getElementById('h-state').value;
      const subject = document.getElementById('h-subject').value.trim();
      const description = document.getElementById('h-description').value.trim() || null;

      if (!category || !urgency || !state || !subject) {
        Toast.error('Preencha os campos obrigatórios.');
        return;
      }

      const { error } = await sb.from('help_requests').insert({
        patient_id: patient.id,
        user_id: userId,
        category, urgency, state, subject, description,
        status: 'open'
      });
      if (error) throw error;

      Toast.success('Chamado aberto! Um consultor será notificado.');
      document.getElementById('help-form').reset();
      document.getElementById('h-emergency-note')?.classList.add('hidden');
      await loadMeusChamados();
    } catch (err) {
      console.error('[Patient] Help request error:', err);
      Toast.error(err.message || 'Erro ao abrir o chamado.');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  }

  async function loadMeusChamados() {
    const list = document.getElementById('help-list');
    if (!list) return;

    const userId = State.get('user')?.id;
    const { data, error } = await sb.from('help_requests')
      .select('*, consultants(full_name, profession, phone, whatsapp)')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) { list.innerHTML = '<p class="text-muted">Erro ao carregar chamados.</p>'; return; }
    if (!data || !data.length) {
      list.innerHTML = `<div class="empty-state"><p>Você ainda não abriu nenhum chamado.</p></div>`;
      return;
    }

    const statusText = { open: 'Aguardando consultor', assigned: 'Em atendimento', resolved: 'Resolvido', closed: 'Encerrado' };
    list.innerHTML = data.map(r => {
      const c = r.consultants || null;
      return `
      <div class="card mb-sm" style="background:var(--surface-2);">
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${helpUrgencyBadge(r.urgency)}
            <span class="badge badge-info">${helpCategoryLabel(r.category)}</span>
            <span class="badge ${r.status === 'resolved' ? 'badge-success' : r.status === 'assigned' ? 'badge-warning' : 'badge-info'}">${statusText[r.status] || r.status}</span>
          </div>
          <div style="font-weight:600;margin-top:8px;">${sanitizeHTML(r.subject)}</div>
          ${c ? `
          <div class="text-sm text-muted mt-sm">
            Atendido por <strong>${sanitizeHTML(c.full_name)}</strong>
            ${c.whatsapp ? ` · <a href="https://wa.me/55${sanitizeHTML((c.whatsapp || '').replace(/\D/g,''))}" target="_blank" rel="noopener" style="color:var(--green);">WhatsApp</a>` : ''}
          </div>` : '<div class="text-sm text-muted mt-sm">Aguardando um consultor assumir...</div>'}
          ${c ? `
          <button class="btn btn-secondary mt-sm p-open-chat" data-id="${r.id}">Abrir conversa</button>
          <div class="chat-box hidden" id="pchat-${r.id}" style="margin-top:12px;border-top:1px solid var(--border);padding-top:12px;">
            <div id="pmsgs-${r.id}" style="max-height:260px;overflow-y:auto;"></div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <input class="form-input" type="text" id="pinput-${r.id}" placeholder="Escreva sua mensagem..." style="flex:1;">
              <button class="btn btn-primary p-send" data-id="${r.id}">Enviar</button>
            </div>
          </div>` : ''}
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('.p-open-chat').forEach(b => b.addEventListener('click', () => {
      const box = document.getElementById(`pchat-${b.dataset.id}`);
      box?.classList.toggle('hidden');
      if (box && !box.classList.contains('hidden')) loadMensagensPaciente(b.dataset.id);
    }));
    list.querySelectorAll('.p-send').forEach(b => b.addEventListener('click', () => enviarMensagemPaciente(b.dataset.id)));
  }

  async function loadMensagensPaciente(id) {
    const el = document.getElementById(`pmsgs-${id}`);
    if (!el) return;
    const { data } = await sb.from('help_messages')
      .select('*').eq('request_id', id).order('created_at', { ascending: true });

    if (!data || !data.length) {
      el.innerHTML = '<p class="text-muted text-sm">Nenhuma mensagem ainda.</p>';
      return;
    }
    const myId = State.get('user')?.id;
    el.innerHTML = data.map(m => {
      const mine = m.sender_id === myId;
      return `
        <div style="margin-bottom:8px;text-align:${mine ? 'right' : 'left'};">
          <div style="display:inline-block;max-width:80%;padding:8px 12px;border-radius:12px;
                      background:${mine ? 'var(--green)' : 'var(--surface)'};
                      color:${mine ? '#0c1a12' : 'var(--text)'};text-align:left;">
            <div style="font-size:.85rem;">${sanitizeHTML(m.body)}</div>
            <div style="font-size:.7rem;opacity:.7;margin-top:2px;">${formatDate(m.created_at)}</div>
          </div>
        </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  async function enviarMensagemPaciente(id) {
    const input = document.getElementById(`pinput-${id}`);
    const body = input?.value.trim();
    if (!body) return;
    try {
      const { error } = await sb.from('help_messages').insert({
        request_id: id,
        sender_id: State.get('user').id,
        sender_role: 'patient',
        body
      });
      if (error) throw error;
      input.value = '';
      await loadMensagensPaciente(id);
    } catch (err) {
      console.error('[Patient] Help message error:', err);
      Toast.error('Erro ao enviar mensagem.');
    }
  }

  return { render, _nextStep, _prevStep, _startRenewal };
})();
