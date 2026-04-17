/* ═══════════════════════════════════════════
   CANNAPASS — Agent Portal
   Scanner, verification, search, history, guide
   ═══════════════════════════════════════════ */

const Agent = (() => {
  // ─── i18n shortcut ───
  const _t = (key, fb) => typeof I18n !== 'undefined' ? I18n.t(key, fb) : fb || key;

  // ─── Local state ───
  let html5QrCode = null;
  let scannerRunning = false;
  let agentLocation = { latitude: null, longitude: null };
  let historicoPage = 0;
  let historicoTotal = 0;

  // ─── Try to get agent geolocation on load ───
  function requestGeolocation() {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          agentLocation.latitude = pos.coords.latitude;
          agentLocation.longitude = pos.coords.longitude;
        },
        () => { /* ignore errors silently */ },
        { enableHighAccuracy: false, timeout: 10000 }
      );
    }
  }

  // ─── Router ───
  function render(page, container) {
    // Always try to get location
    requestGeolocation();

    switch (page) {
      case 'scanner': renderScanner(container); break;
      case 'busca': renderBusca(container); break;
      case 'historico-agent': renderHistorico(container); break;
      case 'agent-stats': renderAgentStats(container); break;
      case 'guia': renderGuia(container); break;
      default: renderScanner(container);
    }
  }

  // ═══════════════════════════════════════════
  //  SCANNER PAGE
  // ═══════════════════════════════════════════
  function renderScanner(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>${_t('agent.scanner.title', 'Scanner QR Code')}</h2>
        <p>${_t('agent.scanner.subtitle', 'Escaneie o QR Code do paciente para verificação')}</p>
      </div>

      <div class="card">
        <div class="card-header">
          <h3 class="card-title">${_t('agent.scanner.camera', 'Câmera')}</h3>
          <button class="btn btn-primary btn-sm" id="scanner-toggle-btn">${_t('agent.scanner.start', 'Iniciar Scanner')}</button>
        </div>
        <div class="card-body">
          <div id="qr-reader" style="width:100%;max-width:500px;margin:0 auto;"></div>
          <div id="scanner-placeholder" class="empty-state">
            <div class="empty-state-icon">${Icons['empty-camera']}</div>
            <h4>${_t('agent.scanner.disabled', 'Scanner desativado')}</h4>
            <p>${_t('agent.scanner.clickToStart', 'Clique em "Iniciar Scanner" para ativar a câmera')}</p>
          </div>
        </div>
      </div>

      <div class="card mt-md">
        <div class="card-header">
          <h3 class="card-title">${_t('agent.scanner.manual', 'Código Manual')}</h3>
        </div>
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">${_t('agent.scanner.manualLabel', 'Token ou URL do QR Code')}</label>
            <input type="text" id="manual-token-input" class="form-input" placeholder="Cole o token ou URL aqui...">
            <span class="form-hint">${_t('agent.scanner.manualHint', 'Ex: https://cannapass.vercel.app/#/v/abc123 ou apenas abc123')}</span>
          </div>
          <button class="btn btn-primary mt-sm" id="manual-verify-btn">${_t('agent.scanner.verify', 'Verificar')}</button>
        </div>
      </div>

      <div id="verification-result-area" class="mt-md"></div>
    `;

    // ─── Bind events ───
    const toggleBtn = document.getElementById('scanner-toggle-btn');
    toggleBtn.addEventListener('click', () => toggleScanner(toggleBtn));

    document.getElementById('manual-verify-btn').addEventListener('click', () => {
      const input = document.getElementById('manual-token-input').value.trim();
      if (!input) {
        Toast.warning('Digite ou cole um token para verificar.');
        return;
      }
      const token = extractToken(input);
      handleVerification(token);
    });

    // Allow Enter key on manual input
    document.getElementById('manual-token-input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        document.getElementById('manual-verify-btn').click();
      }
    });
  }

  async function toggleScanner(btn) {
    if (scannerRunning) {
      await stopScanner();
      btn.textContent = 'Iniciar Scanner';
      btn.classList.remove('btn-danger');
      btn.classList.add('btn-primary');
      const placeholder = document.getElementById('scanner-placeholder');
      if (placeholder) placeholder.style.display = '';
    } else {
      await startScanner();
      btn.textContent = 'Parar Scanner';
      btn.classList.remove('btn-primary');
      btn.classList.add('btn-danger');
      const placeholder = document.getElementById('scanner-placeholder');
      if (placeholder) placeholder.style.display = 'none';
    }
  }

  async function startScanner() {
    try {
      // Lazy load QR scanner lib
      await LazyLoad.qrScanner();

      const readerEl = document.getElementById('qr-reader');
      if (!readerEl) return;

      html5QrCode = new Html5Qrcode('qr-reader');

      await html5QrCode.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1
        },
        (decodedText) => {
          // On successful scan
          const token = extractToken(decodedText);
          stopScanner();
          const btn = document.getElementById('scanner-toggle-btn');
          if (btn) {
            btn.textContent = 'Iniciar Scanner';
            btn.classList.remove('btn-danger');
            btn.classList.add('btn-primary');
          }
          handleVerification(token);
        },
        () => { /* ignore scan failures (no QR in frame) */ }
      );

      scannerRunning = true;
    } catch (err) {
      console.error('[Scanner]', err);
      Toast.error('Não foi possível iniciar a câmera. Verifique as permissões.');
    }
  }

  async function stopScanner() {
    try {
      if (html5QrCode && scannerRunning) {
        await html5QrCode.stop();
        html5QrCode.clear();
      }
    } catch (err) {
      console.error('[Scanner stop]', err);
    }
    scannerRunning = false;
  }

  function extractToken(input) {
    // If full URL like https://cannapass.vercel.app/#/v/TOKEN
    const hashMatch = input.match(/#\/v\/(.+)/);
    if (hashMatch) return hashMatch[1];

    // If just the token path /v/TOKEN
    const pathMatch = input.match(/\/v\/(.+)/);
    if (pathMatch) return pathMatch[1];

    // Otherwise treat entire input as token
    return input.trim();
  }

  // ═══════════════════════════════════════════
  //  OFFLINE CACHE (IndexedDB)
  // ═══════════════════════════════════════════
  const OfflineCache = (() => {
    const DB_NAME = 'cannapass-agent-cache';
    const STORE = 'verifications';
    const DB_VERSION = 1;

    function openDB() {
      return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains(STORE)) {
            db.createObjectStore(STORE, { keyPath: 'token' });
          }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
    }

    async function save(token, data) {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).put({ token, data, cachedAt: new Date().toISOString() });
        await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
        db.close();
      } catch (e) { console.warn('[OfflineCache] save error:', e); }
    }

    const TTL_HOURS = 24; // cached results expire after 24h

    async function get(token) {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readonly');
        const req = tx.objectStore(STORE).get(token);
        const result = await new Promise((res, rej) => { req.onsuccess = () => res(req.result); req.onerror = rej; });
        db.close();
        if (!result) return null;
        // Check TTL
        const ageHours = (Date.now() - new Date(result.cachedAt).getTime()) / (1000 * 60 * 60);
        if (ageHours > TTL_HOURS) {
          remove(token); // async cleanup, don't await
          return null;
        }
        return result;
      } catch (e) { console.warn('[OfflineCache] get error:', e); return null; }
    }

    async function remove(token) {
      try {
        const db = await openDB();
        const tx = db.transaction(STORE, 'readwrite');
        tx.objectStore(STORE).delete(token);
        await new Promise((res, rej) => { tx.oncomplete = res; tx.onerror = rej; });
        db.close();
      } catch (e) { /* ignore */ }
    }

    return { save, get };
  })();

  // ═══════════════════════════════════════════
  //  VERIFICATION LOGIC
  // ═══════════════════════════════════════════
  async function handleVerification(token) {
    const resultArea = document.getElementById('verification-result-area');
    if (!resultArea) return;

    resultArea.innerHTML = `
      <div class="card">
        <div class="card-body text-center">
          <div class="spinner"></div>
          <p class="mt-sm text-muted">Verificando token...</p>
        </div>
      </div>
    `;

    try {
      // Call RPC to verify
      const { data: qrData, error: rpcError } = await sb.rpc('verify_qr_token', { lookup_token: token });

      let result, qrRecord, patientData, travelData, documents;

      if (rpcError || !qrData || (Array.isArray(qrData) && qrData.length === 0)) {
        result = 'invalid';
        // Record verification even for invalid
        await recordVerification(null, token, null, result);
        renderVerificationResult(resultArea, result, null, null, null, null);
        return;
      }

      // RPC returns single JSON object
      qrRecord = Array.isArray(qrData) ? qrData[0] : qrData;

      // Check for RPC-level error (token not found)
      if (qrRecord.error) {
        result = 'invalid';
        await recordVerification(null, token, null, result);
        renderVerificationResult(resultArea, result, null, null, null, null);
        return;
      }

      // Use RPC's pre-computed valid/expired flags
      if (qrRecord.valid) {
        result = 'valid';
      } else if (qrRecord.expired) {
        result = 'expired';
      } else if (!qrRecord.is_active) {
        result = 'invalid';
      } else {
        result = 'invalid';
      }

      // Fetch patient details if we have patient_id (returned by updated RPC)
      if (qrRecord.patient_id) {
        const { data: pData } = await sb.from('patients')
          .select('*')
          .eq('id', qrRecord.patient_id)
          .single();
        patientData = pData;

        // Fetch documents
        if (patientData) {
          const { data: docs } = await sb.from('documents')
            .select('*')
            .eq('patient_id', patientData.id)
            .order('created_at', { ascending: false });
          documents = docs || [];
        }

        // Fetch travel data (RPC already returns latest travel, but we get full record)
        const { data: tData } = await sb.from('travel_data')
          .select('*')
          .eq('patient_id', qrRecord.patient_id)
          .order('created_at', { ascending: false })
          .limit(1);
        travelData = tData && tData.length > 0 ? tData[0] : null;
      }

      // Record verification — use qr_id from RPC
      await recordVerification(qrRecord.qr_id, token, qrRecord.patient_name, result);

      // Cache successful verification for offline use
      if (result === 'valid' || result === 'expired') {
        OfflineCache.save(token, { result, qrRecord, patientData, travelData, documents });
      }

      // Render result
      renderVerificationResult(resultArea, result, qrRecord, patientData, travelData, documents);

    } catch (err) {
      console.error('[Verification]', err);

      // ─── Offline fallback: try cached result ───
      if (!navigator.onLine) {
        const cached = await OfflineCache.get(token);
        if (cached) {
          const age = dayjs().diff(dayjs(cached.cachedAt), 'hour');
          Toast.warning(`Sem conexão — exibindo resultado em cache (${age < 1 ? 'agora' : age + 'h atrás'})`);
          renderVerificationResult(resultArea, cached.data.result, cached.data.qrRecord, cached.data.patientData, cached.data.travelData, cached.data.documents, true);
          return;
        }
      }

      Toast.error('Erro ao verificar token. Verifique sua conexão.');
      resultArea.innerHTML = '';
    }
  }

  async function recordVerification(qrCodeId, token, patientName, result) {
    try {
      const profile = State.get('profile');
      const agentName = profile?.full_name || 'Agente';
      const agentOrg = profile?.organization || null;

      await sb.from('verifications').insert({
        qr_code_id: qrCodeId || null,
        agent_id: State.get('user')?.id,
        token_scanned: token,
        patient_name: patientName || null,
        agent_name: agentName,
        agent_organization: agentOrg,
        agent_location: agentLocation.latitude ? `${agentLocation.latitude}, ${agentLocation.longitude}` : null,
        result: result,
        latitude: agentLocation.latitude,
        longitude: agentLocation.longitude
      });
    } catch (err) {
      console.error('[Record verification]', err);
    }
  }

  function renderVerificationResult(container, result, qrRecord, patientData, travelData, documents, isOffline = false) {
    const statusConfig = {
      valid: {
        label: 'VÁLIDO',
        badgeClass: 'badge-success',
        cardClass: 'valid',
        icon: Icons.success,
        description: 'QR Code válido. Documentação em conformidade.'
      },
      expired: {
        label: 'EXPIRADO',
        badgeClass: 'badge-warning',
        cardClass: 'expired',
        icon: Icons.warning,
        description: 'QR Code expirado. Solicite atualização ao paciente.'
      },
      invalid: {
        label: 'INVÁLIDO',
        badgeClass: 'badge-danger',
        cardClass: '',
        icon: Icons.error,
        description: 'QR Code não encontrado ou revogado. Siga o procedimento padrão.'
      }
    };

    const cfg = statusConfig[result] || statusConfig.invalid;

    let html = '';

    if (isOffline) {
      html += `
        <div style="padding:10px 14px;border-radius:8px;background:rgba(240,192,96,0.12);border:1px solid rgba(240,192,96,0.3);margin-bottom:12px;font-size:13px;display:flex;align-items:center;gap:8px;">
          ${Icons.warning} <span><strong>Modo Offline</strong> — Resultado em cache. Verifique novamente quando houver conexão.</span>
        </div>
      `;
    }

    html += `
      <div class="verification-result ${cfg.cardClass}">
        <div class="verification-status">
          <div class="verification-status-icon">${cfg.icon}</div>
          <div class="verification-status-text">
            <span class="badge ${cfg.badgeClass}">${cfg.label}${isOffline ? ' (CACHE)' : ''}</span>
            <p class="text-sm mt-sm">${cfg.description}</p>
          </div>
        </div>
      </div>
    `;

    // Show patient and QR details for valid/expired
    if ((result === 'valid' || result === 'expired') && qrRecord) {
      html += `
        <div class="card mt-md">
          <div class="card-header">
            <h3 class="card-title">Dados do Paciente</h3>
          </div>
          <div class="card-body">
            <div class="verification-data">
              <div class="verification-field">
                <span class="text-muted text-sm">Nome</span>
                <strong>${sanitizeHTML(qrRecord.patient_name || patientData?.full_name || '—')}</strong>
              </div>
              <div class="verification-field">
                <span class="text-muted text-sm">CPF</span>
                <strong>${sanitizeHTML(qrRecord.cpf_masked || (patientData?.cpf ? maskCPF(patientData.cpf) : '—'))}</strong>
              </div>
              ${patientData ? `
                <div class="verification-field">
                  <span class="text-muted text-sm">Registro</span>
                  <strong>${sanitizeHTML(patientData.registration_id || '—')}</strong>
                </div>
                <div class="verification-field">
                  <span class="text-muted text-sm">Status do Cadastro</span>
                  <span class="badge badge-${getStatusBadgeType(patientData.status)}">${getStatusLabel(patientData.status)}</span>
                </div>
              ` : ''}
              <div class="verification-field">
                <span class="text-muted text-sm">Via</span>
                <strong>${sanitizeHTML(getViaLabel(qrRecord.via || patientData?.via || ''))}</strong>
              </div>
            </div>
          </div>
        </div>
      `;

      // Product info
      html += `
        <div class="card mt-md">
          <div class="card-header">
            <h3 class="card-title">Produto</h3>
          </div>
          <div class="card-body">
            <div class="verification-data">
              <div class="verification-field">
                <span class="text-muted text-sm">Produto</span>
                <strong>${sanitizeHTML(qrRecord.product || patientData?.product_name || '—')}</strong>
              </div>
              <div class="verification-field">
                <span class="text-muted text-sm">Quantidade para Transporte</span>
                <strong>${sanitizeHTML(qrRecord.quantity || patientData?.transport_quantity || '—')}</strong>
              </div>
              ${patientData?.dosage ? `
                <div class="verification-field">
                  <span class="text-muted text-sm">Dosagem</span>
                  <strong>${sanitizeHTML(patientData.dosage)}</strong>
                </div>
              ` : ''}
              ${qrRecord.legal_reference ? `
                <div class="verification-field">
                  <span class="text-muted text-sm">Referência Legal</span>
                  <strong>${sanitizeHTML(qrRecord.legal_reference)}</strong>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      // Medical / Legal info
      if (patientData) {
        const isHC = patientData.via === 'hc';
        html += `
          <div class="card mt-md">
            <div class="card-header">
              <h3 class="card-title">${isHC ? 'Dados Judiciais' : 'Dados Médicos'}</h3>
            </div>
            <div class="card-body">
              <div class="verification-data">
                ${!isHC ? `
                  <div class="verification-field">
                    <span class="text-muted text-sm">Médico</span>
                    <strong>${sanitizeHTML(patientData.doctor_name || '—')}</strong>
                  </div>
                  <div class="verification-field">
                    <span class="text-muted text-sm">CRM</span>
                    <strong>${sanitizeHTML(patientData.doctor_crm || '—')}</strong>
                  </div>
                  <div class="verification-field">
                    <span class="text-muted text-sm">Validade da Prescrição</span>
                    <strong>${formatDate(patientData.prescription_validity)}</strong>
                  </div>
                ` : `
                  <div class="verification-field">
                    <span class="text-muted text-sm">Habeas Corpus Nº</span>
                    <strong>${sanitizeHTML(patientData.hc_number || '—')}</strong>
                  </div>
                  <div class="verification-field">
                    <span class="text-muted text-sm">Salvo Conduto Nº</span>
                    <strong>${sanitizeHTML(patientData.salvo_conduto || '—')}</strong>
                  </div>
                  <div class="verification-field">
                    <span class="text-muted text-sm">Vara / Tribunal</span>
                    <strong>${sanitizeHTML(patientData.court || '—')}</strong>
                  </div>
                `}
              </div>
            </div>
          </div>
        `;
      }

      // Travel data
      if (travelData) {
        html += `
          <div class="card mt-md">
            <div class="card-header">
              <h3 class="card-title">Dados de Viagem</h3>
            </div>
            <div class="card-body">
              <div class="verification-data">
                <div class="verification-field">
                  <span class="text-muted text-sm">Origem</span>
                  <strong>${sanitizeHTML(travelData.origin || '—')}</strong>
                </div>
                <div class="verification-field">
                  <span class="text-muted text-sm">Destino</span>
                  <strong>${sanitizeHTML(travelData.destination || '—')}</strong>
                </div>
                <div class="verification-field">
                  <span class="text-muted text-sm">Data de Partida</span>
                  <strong>${formatDate(travelData.departure_date)}</strong>
                </div>
                <div class="verification-field">
                  <span class="text-muted text-sm">Tipo de Transporte</span>
                  <strong>${sanitizeHTML(getTransportLabel(travelData.transport_type))}</strong>
                </div>
                ${travelData.flight_or_bus ? `
                  <div class="verification-field">
                    <span class="text-muted text-sm">Voo / Linha</span>
                    <strong>${sanitizeHTML(travelData.flight_or_bus)}</strong>
                  </div>
                ` : ''}
              </div>
            </div>
          </div>
        `;
      }

      // Documents
      if (documents && documents.length > 0) {
        html += `
          <div class="card mt-md">
            <div class="card-header">
              <h3 class="card-title">Documentos</h3>
            </div>
            <div class="card-body" id="documents-list">
              <div class="text-center text-muted"><div class="spinner"></div></div>
            </div>
          </div>
        `;
      }
    }

    // New verification button
    html += `
      <div class="text-center mt-lg">
        <button class="btn btn-primary" id="new-verification-btn">Nova Verificação</button>
      </div>
    `;

    container.innerHTML = html;

    // Bind new verification button
    document.getElementById('new-verification-btn')?.addEventListener('click', () => {
      const mainContainer = container.closest('.main-content') || container.parentElement;
      // Re-render scanner page
      renderScanner(document.querySelector('[data-page-content]') || container.parentElement);
    });

    // Load document signed URLs
    if (documents && documents.length > 0) {
      loadDocumentLinks(documents);
    }
  }

  async function loadDocumentLinks(documents) {
    const listEl = document.getElementById('documents-list');
    if (!listEl) return;

    try {
      const docTypeLabels = {
        identity: 'Documento de Identidade',
        prescription: 'Prescrição Médica',
        medical_report: 'Relatório Médico',
        judicial_decision: 'Decisão Judicial',
        other: 'Outro'
      };

      let html = '';
      for (const doc of documents) {
        let url = '#';
        if (doc.file_path) {
          const { data: signedData } = await sb.storage
            .from(STORAGE_BUCKET)
            .createSignedUrl(doc.file_path, SIGNED_URL_EXPIRY);
          if (signedData?.signedUrl) {
            url = signedData.signedUrl;
          }
        }

        const label = docTypeLabels[doc.doc_type] || doc.doc_type;
        const statusBadge = doc.status === 'verified'
          ? '<span class="badge badge-success">Verificado</span>'
          : doc.status === 'rejected'
            ? '<span class="badge badge-danger">Rejeitado</span>'
            : '<span class="badge badge-neutral">Enviado</span>';

        html += `
          <div style="display:flex;align-items:center;justify-content:space-between;padding:0.75rem 0;border-bottom:1px solid var(--border);">
            <div>
              <strong class="text-sm">${sanitizeHTML(label)}</strong>
              <p class="text-xs text-muted">${sanitizeHTML(doc.file_name || '—')}</p>
            </div>
            <div style="display:flex;align-items:center;gap:0.5rem;">
              ${statusBadge}
              ${url !== '#' ? `<a href="${url}" target="_blank" class="btn btn-sm btn-secondary">Visualizar</a>` : ''}
            </div>
          </div>
        `;
      }

      listEl.innerHTML = html || '<p class="text-muted">Nenhum documento encontrado.</p>';
    } catch (err) {
      console.error('[Load documents]', err);
      listEl.innerHTML = '<p class="text-muted">Erro ao carregar documentos.</p>';
    }
  }

  // ═══════════════════════════════════════════
  //  BUSCA MANUAL PAGE
  // ═══════════════════════════════════════════
  function renderBusca(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>${_t('agent.search.title', 'Busca Avançada')}</h2>
        <p>${_t('agent.search.subtitle', 'Busque por CPF (completo ou parcial), código de registro ou nome')}</p>
      </div>

      <div class="card">
        <div class="card-body">
          <div class="form-group">
            <label class="form-label">${_t('agent.search.label', 'Pesquisar')}</label>
            <div style="display:flex;gap:0.5rem;flex-wrap:wrap;">
              <input type="text" id="busca-input" class="form-input" placeholder="${_t('agent.search.placeholder', 'CPF, código de registro ou nome...')}" style="flex:1;min-width:200px;">
              <select id="busca-status-filter" class="form-select" style="max-width:200px;">
                <option value="">${_t('agent.search.allStatus', 'Todos os Status')}</option>
                <option value="approved">${_t('status.approved', 'Aprovado')}</option>
                <option value="pending">${_t('status.pending', 'Pendente')}</option>
                <option value="rejected">${_t('status.rejected', 'Rejeitado')}</option>
                <option value="renewal_pending">${_t('status.renewal_pending', 'Renovação Pendente')}</option>
              </select>
            </div>
            <span class="form-hint">${_t('agent.search.hint', 'CPF parcial (ex: últimos 4 dígitos), CPF completo, número de registro ou nome do paciente')}</span>
          </div>
          <button class="btn btn-primary mt-sm" id="busca-btn">${Icons.busca} ${_t('common.search', 'Buscar')}</button>
        </div>
      </div>

      <div id="busca-results" class="mt-md"></div>
      <div id="busca-detail" class="mt-md"></div>
    `;

    // CPF mask on input (only when 11 digits)
    const input = document.getElementById('busca-input');
    input.addEventListener('input', (e) => {
      const raw = e.target.value.replace(/\D/g, '');
      // Auto-apply CPF mask only if user is typing digits and it looks like a full CPF
      if (raw.length > 0 && raw.length <= 11 && /^\d+$/.test(e.target.value.replace(/[.\-]/g, ''))) {
        e.target.value = maskCPF(raw);
      }
    });

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') document.getElementById('busca-btn').click();
    });

    document.getElementById('busca-btn').addEventListener('click', () => {
      const query = input.value.trim();
      if (!query) {
        Toast.warning('Digite algo para buscar.');
        return;
      }
      performSearch(query);
    });
  }

  async function performSearch(query) {
    const resultsEl = document.getElementById('busca-results');
    const detailEl = document.getElementById('busca-detail');
    const statusFilter = document.getElementById('busca-status-filter')?.value || '';
    if (!resultsEl) return;
    if (detailEl) detailEl.innerHTML = '';

    resultsEl.innerHTML = `
      <div class="card">
        <div class="card-body text-center">
          <div class="spinner"></div>
          <p class="mt-sm text-muted">Buscando...</p>
        </div>
      </div>
    `;

    try {
      const digits = query.replace(/\D/g, '');
      let patients = [];
      let searchMethod = '';

      // 1. If looks like a full CPF (11 digits), search by exact CPF
      if (digits.length === 11) {
        let q = sb.from('patients').select('*').eq('cpf', digits);
        if (statusFilter) q = q.eq('status', statusFilter);
        const { data } = await q;
        if (data && data.length > 0) {
          patients = data;
          searchMethod = _t('agent.search.method.cpfExact', 'CPF exato');
        }
      }

      // 2. If 3-10 digits → partial CPF search
      if (patients.length === 0 && digits.length >= 3 && digits.length < 11) {
        let q = sb.from('patients').select('*').ilike('cpf', `%${digits}%`).limit(20);
        if (statusFilter) q = q.eq('status', statusFilter);
        const { data } = await q;
        if (data && data.length > 0) {
          patients = data;
          searchMethod = _t('agent.search.method.cpfPartial', 'CPF parcial');
        }
      }

      // 3. Try registration_id (exact match)
      if (patients.length === 0 && query.length > 0) {
        let q = sb.from('patients').select('*').eq('registration_id', query);
        if (statusFilter) q = q.eq('status', statusFilter);
        const { data } = await q;
        if (data && data.length > 0) {
          patients = data;
          searchMethod = _t('agent.search.method.regId', 'Código de registro');
        }
      }

      // 4. Try registration_id partial (ilike)
      if (patients.length === 0 && query.length >= 3) {
        let q = sb.from('patients').select('*').ilike('registration_id', `%${query}%`).limit(20);
        if (statusFilter) q = q.eq('status', statusFilter);
        const { data } = await q;
        if (data && data.length > 0) {
          patients = data;
          searchMethod = _t('agent.search.method.regPartial', 'Código parcial');
        }
      }

      // 5. Try name search (ilike)
      if (patients.length === 0 && query.length >= 3) {
        let q = sb.from('patients').select('*').ilike('full_name', `%${query}%`).limit(20);
        if (statusFilter) q = q.eq('status', statusFilter);
        const { data } = await q;
        if (data && data.length > 0) {
          patients = data;
          searchMethod = _t('agent.search.method.name', 'Nome');
        }
      }

      if (patients.length === 0) {
        resultsEl.innerHTML = `
          <div class="card">
            <div class="card-body">
              <div class="empty-state">
                <div class="empty-state-icon">${Icons['empty-search']}</div>
                <h4>Nenhum resultado</h4>
                <p>Nenhum paciente encontrado para "${sanitizeHTML(query)}"${statusFilter ? ` com status "${getStatusLabel(statusFilter)}"` : ''}</p>
              </div>
            </div>
          </div>
        `;
        return;
      }

      let html = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.75rem;">
          <h4>${patients.length} resultado${patients.length > 1 ? 's' : ''}</h4>
          <span class="badge badge-neutral">${sanitizeHTML(searchMethod)}</span>
        </div>
      `;
      for (const p of patients) {
        const regId = p.registration_id ? `<code class="text-xs" style="margin-left:0.5rem;">${sanitizeHTML(p.registration_id)}</code>` : '';
        html += `
          <div class="card mb-sm" style="cursor:pointer;" data-patient-id="${p.id}">
            <div class="card-body" style="display:flex;align-items:center;justify-content:space-between;">
              <div>
                <strong>${sanitizeHTML(p.full_name)}</strong>${regId}
                <p class="text-sm text-muted">${sanitizeHTML(maskCPF(p.cpf || ''))} &middot; ${sanitizeHTML(getViaLabel(p.via))}</p>
              </div>
              <div style="display:flex;align-items:center;gap:0.5rem;">
                <span class="badge badge-${getStatusBadgeType(p.status)}">${getStatusLabel(p.status)}</span>
                ${Icons['arrow-right']}
              </div>
            </div>
          </div>
        `;
      }
      resultsEl.innerHTML = html;

      // Bind click on each card
      resultsEl.querySelectorAll('[data-patient-id]').forEach(card => {
        card.addEventListener('click', () => {
          const patientId = card.dataset.patientId;
          showPatientDetail(patientId, detailEl);
        });
      });

    } catch (err) {
      console.error('[Search]', err);
      Toast.error('Erro ao realizar busca.');
      resultsEl.innerHTML = '';
    }
  }

  async function showPatientDetail(patientId, container) {
    if (!container) return;

    container.innerHTML = `
      <div class="card">
        <div class="card-body text-center">
          <div class="spinner"></div>
          <p class="mt-sm text-muted">Carregando detalhes...</p>
        </div>
      </div>
    `;

    try {
      // Fetch patient
      const { data: patientData } = await sb.from('patients')
        .select('*')
        .eq('id', patientId)
        .single();

      if (!patientData) {
        container.innerHTML = '<p class="text-muted">Paciente não encontrado.</p>';
        return;
      }

      // Fetch documents
      const { data: docs } = await sb.from('documents')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      // Fetch travel data
      const { data: tData } = await sb.from('travel_data')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false })
        .limit(1);

      // Fetch QR code
      const { data: qrData } = await sb.from('qr_codes')
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      const qrRecord = qrData && qrData.length > 0 ? qrData[0] : null;
      const travelData = tData && tData.length > 0 ? tData[0] : null;
      const documents = docs || [];

      // Build a synthetic result for rendering
      const fakeResult = qrRecord ? (qrRecord.is_active ? 'valid' : 'invalid') : 'invalid';
      const isExpired = qrRecord?.expires_at && new Date(qrRecord.expires_at) < new Date();
      const result = isExpired ? 'expired' : fakeResult;

      // Render the full detail view
      renderVerificationResult(container, result, qrRecord || {
        patient_name: patientData.full_name,
        cpf_masked: maskCPF(patientData.cpf || ''),
        via: patientData.via,
        product: patientData.product_name,
        quantity: patientData.transport_quantity
      }, patientData, travelData, documents);

      // Add "Registrar Verificação Manual" button before the "Nova Verificação" button
      const newVerBtn = document.getElementById('new-verification-btn');
      if (newVerBtn) {
        const recordBtn = document.createElement('button');
        recordBtn.className = 'btn btn-secondary';
        recordBtn.style.marginRight = '0.5rem';
        recordBtn.textContent = 'Registrar Verificação';
        recordBtn.addEventListener('click', async () => {
          const confirmed = await Modal.open({
            title: 'Registrar Verificação Manual',
            body: `Deseja registrar uma verificação manual para ${sanitizeHTML(patientData.full_name)}?`,
            confirmText: 'Registrar',
            cancelText: 'Cancelar'
          });
          if (!confirmed) return;

          await recordVerification(
            qrRecord?.id || null,
            qrRecord?.token || 'busca-manual',
            patientData.full_name,
            result
          );
          Toast.success('Verificação registrada com sucesso.');
          recordBtn.disabled = true;
          recordBtn.textContent = 'Verificação Registrada';
        });
        newVerBtn.parentElement.insertBefore(recordBtn, newVerBtn);

        // Override new verification to go back to busca
        newVerBtn.textContent = 'Nova Busca';
        newVerBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          const pageContainer = container.closest('[data-page-content]') || container.parentElement?.parentElement;
          if (pageContainer) renderBusca(pageContainer);
        }, { once: true });
      }

    } catch (err) {
      console.error('[Patient detail]', err);
      Toast.error('Erro ao carregar detalhes do paciente.');
      container.innerHTML = '';
    }
  }

  // ═══════════════════════════════════════════
  //  HISTÓRICO PAGE
  // ═══════════════════════════════════════════
  async function renderHistorico(container) {
    historicoPage = 0;
    container.innerHTML = `
      <div class="page-header">
        <h2>${_t('agent.history.title', 'Histórico de Verificações')}</h2>
        <p>${_t('agent.history.subtitle', 'Verificações realizadas por você')}</p>
      </div>
      <div id="historico-content">
        <div class="card">
          <div class="card-body text-center">
            <div class="spinner"></div>
            <p class="mt-sm text-muted">${_t('common.loading', 'Carregando...')}</p>
          </div>
        </div>
      </div>
    `;

    await loadHistorico();
  }

  async function loadHistorico() {
    const contentEl = document.getElementById('historico-content');
    if (!contentEl) return;

    try {
      const userId = State.get('user')?.id;
      if (!userId) return;

      const from = historicoPage * PAGINATION.PAGE_SIZE;
      const to = from + PAGINATION.PAGE_SIZE - 1;

      // Get total count
      const { count } = await sb.from('verifications')
        .select('*', { count: 'exact', head: true })
        .eq('agent_id', userId);
      historicoTotal = count || 0;

      // Get page data
      const { data: verifications, error } = await sb.from('verifications')
        .select('*')
        .eq('agent_id', userId)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      if (!verifications || verifications.length === 0) {
        contentEl.innerHTML = `
          <div class="card">
            <div class="card-body">
              <div class="empty-state">
                <div class="empty-state-icon">${Icons['empty-clock']}</div>
                <h4>Nenhuma verificação</h4>
                <p>Seu histórico aparecerá aqui após sua primeira verificação.</p>
              </div>
            </div>
          </div>
        `;
        return;
      }

      const resultBadge = (r) => {
        const map = {
          valid: { class: 'badge-success', label: _t('result.valid', 'Válido') },
          invalid: { class: 'badge-danger', label: _t('result.invalid', 'Inválido') },
          expired: { class: 'badge-warning', label: _t('result.expired', 'Expirado') },
          suspicious: { class: 'badge-danger', label: _t('result.suspicious', 'Suspeito') }
        };
        const cfg = map[r] || { class: 'badge-neutral', label: r };
        return `<span class="badge ${cfg.class}">${cfg.label}</span>`;
      };

      let tableRows = '';
      for (const v of verifications) {
        tableRows += `
          <tr class="historico-row" data-verification-id="${v.id}" style="cursor:pointer;">
            <td class="text-sm">${formatDateTime(v.created_at)}</td>
            <td class="text-sm">${sanitizeHTML(v.patient_name || '—')}</td>
            <td>${resultBadge(v.result)}</td>
            <td class="text-sm">${sanitizeHTML(v.agent_location || '—')}</td>
          </tr>
        `;
      }

      const totalPages = Math.ceil(historicoTotal / PAGINATION.PAGE_SIZE);
      const currentPage = historicoPage + 1;

      contentEl.innerHTML = `
        <div class="card">
          <div class="card-body" style="overflow-x:auto;">
            <table class="table">
              <thead>
                <tr>
                  <th>${_t('table.date', 'Data')}</th>
                  <th>${_t('table.patient', 'Paciente')}</th>
                  <th>${_t('table.result', 'Resultado')}</th>
                  <th>${_t('table.location', 'Local')}</th>
                </tr>
              </thead>
              <tbody>
                ${tableRows}
              </tbody>
            </table>
          </div>
        </div>

        ${totalPages > 1 ? `
          <div style="display:flex;align-items:center;justify-content:center;gap:1rem;margin-top:1rem;">
            <button class="btn btn-sm btn-secondary" id="hist-prev" ${historicoPage === 0 ? 'disabled' : ''}>Anterior</button>
            <span class="text-sm text-muted">Página ${currentPage} de ${totalPages}</span>
            <button class="btn btn-sm btn-secondary" id="hist-next" ${currentPage >= totalPages ? 'disabled' : ''}>Próxima</button>
          </div>
        ` : ''}

        <div id="historico-detail" class="mt-md"></div>
      `;

      // Bind row clicks for expand
      contentEl.querySelectorAll('.historico-row').forEach(row => {
        row.addEventListener('click', () => {
          const vId = row.dataset.verificationId;
          const ver = verifications.find(v => v.id === vId);
          if (ver) showVerificationDetail(ver);
        });
      });

      // Pagination
      document.getElementById('hist-prev')?.addEventListener('click', () => {
        if (historicoPage > 0) {
          historicoPage--;
          loadHistorico();
        }
      });
      document.getElementById('hist-next')?.addEventListener('click', () => {
        if ((historicoPage + 1) * PAGINATION.PAGE_SIZE < historicoTotal) {
          historicoPage++;
          loadHistorico();
        }
      });

    } catch (err) {
      console.error('[Historico]', err);
      Toast.error('Erro ao carregar histórico.');
      contentEl.innerHTML = '';
    }
  }

  function showVerificationDetail(verification) {
    const detailEl = document.getElementById('historico-detail');
    if (!detailEl) return;

    const resultLabels = {
      valid: 'Válido',
      invalid: 'Inválido',
      expired: 'Expirado',
      suspicious: 'Suspeito'
    };

    const resultBadgeMap = {
      valid: 'badge-success',
      invalid: 'badge-danger',
      expired: 'badge-warning',
      suspicious: 'badge-danger'
    };

    detailEl.innerHTML = `
      <div class="card">
        <div class="card-header">
          <h3 class="card-title">Detalhes da Verificação</h3>
          <button class="btn btn-sm btn-secondary" id="close-detail-btn" aria-label="Fechar detalhes">${Icons.x}</button>
        </div>
        <div class="card-body">
          <div class="verification-data">
            <div class="verification-field">
              <span class="text-muted text-sm">Data/Hora</span>
              <strong>${formatDateTime(verification.created_at)}</strong>
            </div>
            <div class="verification-field">
              <span class="text-muted text-sm">Resultado</span>
              <span class="badge ${resultBadgeMap[verification.result] || 'badge-neutral'}">${resultLabels[verification.result] || verification.result}</span>
            </div>
            <div class="verification-field">
              <span class="text-muted text-sm">Paciente</span>
              <strong>${sanitizeHTML(verification.patient_name || '—')}</strong>
            </div>
            <div class="verification-field">
              <span class="text-muted text-sm">Token</span>
              <strong class="text-xs">${sanitizeHTML(verification.token_scanned || '—')}</strong>
            </div>
            <div class="verification-field">
              <span class="text-muted text-sm">Local</span>
              <strong>${sanitizeHTML(verification.agent_location || '—')}</strong>
            </div>
            ${verification.latitude ? `
              <div class="verification-field">
                <span class="text-muted text-sm">Coordenadas</span>
                <strong class="text-xs">${verification.latitude.toFixed(6)}, ${verification.longitude?.toFixed(6) || '—'}</strong>
              </div>
            ` : ''}
            ${verification.notes ? `
              <div class="verification-field">
                <span class="text-muted text-sm">Observações</span>
                <strong>${sanitizeHTML(verification.notes)}</strong>
              </div>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    document.getElementById('close-detail-btn')?.addEventListener('click', () => {
      detailEl.innerHTML = '';
    });

    // Scroll to detail
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  // ═══════════════════════════════════════════
  //  AGENT STATS PAGE
  // ═══════════════════════════════════════════
  let chartWeekly = null;
  let chartResults = null;

  async function renderAgentStats(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>${_t('agent.stats.title', 'Minhas Estatísticas')}</h2>
        <p>${_t('agent.stats.subtitle', 'Métricas das suas verificações')}</p>
      </div>

      <div class="stats-grid" id="agent-stats-grid">
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-verified']}</div>
          <div class="stat-info">
            <div class="stat-value" id="astat-total">—</div>
            <div class="stat-label">${_t('agent.stats.total', 'Total de Verificações')}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">${Icons['stat-pending']}</div>
          <div class="stat-info">
            <div class="stat-value" id="astat-today">—</div>
            <div class="stat-label">${_t('agent.stats.today', 'Hoje')}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg></div>
          <div class="stat-info">
            <div class="stat-value" id="astat-valid-rate">—</div>
            <div class="stat-label">${_t('agent.stats.validRate', 'Taxa de Válidos')}</div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon"><svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></div>
          <div class="stat-info">
            <div class="stat-value" id="astat-week">—</div>
            <div class="stat-label">${_t('agent.stats.thisWeek', 'Esta Semana')}</div>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${_t('agent.stats.dailyChart', 'Verificações por Dia (últimos 14 dias)')}</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-agent-weekly"></canvas>
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header">
            <h3 class="card-title">${_t('agent.stats.resultsChart', 'Resultados')}</h3>
          </div>
          <div class="card-body">
            <div class="chart-container">
              <canvas id="chart-agent-results"></canvas>
            </div>
          </div>
        </div>
      </div>

      <div class="card" style="margin-top:1.5rem;">
        <div class="card-header">
          <h3 class="card-title">${_t('agent.stats.recent', 'Últimas Verificações')}</h3>
        </div>
        <div class="card-body" style="overflow-x:auto;" id="agent-recent-verifs">
          <div class="flex-center"><div class="spinner"></div></div>
        </div>
      </div>
    `;

    await loadAgentStats();
  }

  async function loadAgentStats() {
    try {
      const userId = State.get('user')?.id;
      if (!userId) return;

      // Fetch all verifications for this agent
      const { data: allVerifs } = await sb.from('verifications')
        .select('created_at, result, patient_name, agent_location')
        .eq('agent_id', userId)
        .order('created_at', { ascending: false });

      const verifs = allVerifs || [];
      const el = (id) => document.getElementById(id);

      // ─── Stats ───
      const total = verifs.length;
      const todayStr = dayjs().format('YYYY-MM-DD');
      const todayCount = verifs.filter(v => dayjs(v.created_at).format('YYYY-MM-DD') === todayStr).length;
      const weekStart = dayjs().startOf('week').toISOString();
      const weekCount = verifs.filter(v => dayjs(v.created_at).isAfter(weekStart)).length;
      const validCount = verifs.filter(v => v.result === 'valid').length;
      const validRate = total > 0 ? Math.round((validCount / total) * 100) : 0;

      if (el('astat-total')) el('astat-total').textContent = total;
      if (el('astat-today')) el('astat-today').textContent = todayCount;
      if (el('astat-week')) el('astat-week').textContent = weekCount;
      if (el('astat-valid-rate')) el('astat-valid-rate').textContent = `${validRate}%`;

      // ─── Daily chart (last 14 days) ───
      if (chartWeekly) { chartWeekly.destroy(); chartWeekly = null; }
      if (chartResults) { chartResults.destroy(); chartResults = null; }

      const days = [];
      for (let i = 13; i >= 0; i--) {
        days.push(dayjs().subtract(i, 'day'));
      }
      const dayLabels = days.map(d => d.format('DD/MM'));
      const dayCounts = days.map(d => {
        const key = d.format('YYYY-MM-DD');
        return verifs.filter(v => dayjs(v.created_at).format('YYYY-MM-DD') === key).length;
      });

      const weeklyCanvas = document.getElementById('chart-agent-weekly');
      if (weeklyCanvas && typeof Chart !== 'undefined') {
        chartWeekly = new Chart(weeklyCanvas, {
          type: 'bar',
          data: {
            labels: dayLabels,
            datasets: [{
              label: 'Verificações',
              data: dayCounts,
              backgroundColor: '#22c55e88',
              borderColor: '#22c55e',
              borderWidth: 1,
              borderRadius: 4
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
                ticks: { color: '#9ca3af', maxRotation: 45, font: { size: 10 } },
                grid: { display: false }
              }
            }
          }
        });
      }

      // ─── Results doughnut ───
      const invalidCount = verifs.filter(v => v.result === 'invalid').length;
      const expiredCount = verifs.filter(v => v.result === 'expired').length;
      const suspiciousCount = verifs.filter(v => v.result === 'suspicious').length;

      const resultsCanvas = document.getElementById('chart-agent-results');
      if (resultsCanvas && typeof Chart !== 'undefined') {
        chartResults = new Chart(resultsCanvas, {
          type: 'doughnut',
          data: {
            labels: [_t('result.valid','Válido'), _t('result.invalid','Inválido'), _t('result.expired','Expirado'), _t('result.suspicious','Suspeito')],
            datasets: [{
              data: [validCount, invalidCount, expiredCount, suspiciousCount],
              backgroundColor: ['#22c55e', '#ef4444', '#eab308', '#f97316'],
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

      // ─── Recent verifications table ───
      const recentEl = document.getElementById('agent-recent-verifs');
      if (!recentEl) return;

      const recent = verifs.slice(0, 10);
      if (recent.length === 0) {
        recentEl.innerHTML = `
          <div class="empty-state">
            <div class="empty-state-icon">${Icons['empty-clock']}</div>
            <h4>Nenhuma verificação</h4>
            <p>Suas verificações aparecerão aqui.</p>
          </div>
        `;
        return;
      }

      const resultBadge = (r) => {
        const map = {
          valid: { cls: 'badge-success', label: _t('result.valid','Válido') },
          invalid: { cls: 'badge-danger', label: _t('result.invalid','Inválido') },
          expired: { cls: 'badge-warning', label: _t('result.expired','Expirado') },
          suspicious: { cls: 'badge-danger', label: _t('result.suspicious','Suspeito') }
        };
        const cfg = map[r] || { cls: 'badge-neutral', label: r };
        return `<span class="badge ${cfg.cls}">${cfg.label}</span>`;
      };

      recentEl.innerHTML = `
        <table class="table">
          <thead>
            <tr>
              <th>Data</th>
              <th>Paciente</th>
              <th>Resultado</th>
              <th>Local</th>
            </tr>
          </thead>
          <tbody>
            ${recent.map(v => `
              <tr>
                <td class="text-sm">${formatDateTime(v.created_at)}</td>
                <td class="text-sm">${sanitizeHTML(v.patient_name || '—')}</td>
                <td>${resultBadge(v.result)}</td>
                <td class="text-sm">${sanitizeHTML(v.agent_location || '—')}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      `;
    } catch (err) {
      console.error('[AgentStats]', err);
      Toast.error('Erro ao carregar estatísticas.');
    }
  }

  // ═══════════════════════════════════════════
  //  GUIA PAGE (kept exactly as original)
  // ═══════════════════════════════════════════
  function renderGuia(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>${_t('agent.guide.title', 'Guia de Fiscalização')}</h2>
        <p>${_t('agent.guide.subtitle', 'Procedimento passo a passo para verificação de transporte')}</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="guide-step-number">1</div>
              <div>
                <h4>${_t('agent.guide.step1.title', 'Solicitar QR Code')}</h4>
                <p>${_t('agent.guide.step1.desc', 'Peça ao passageiro para apresentar o QR Code do Cannapass no celular ou impresso.')}</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="guide-step-number">2</div>
              <div>
                <h4>${_t('agent.guide.step2.title', 'Escanear QR Code')}</h4>
                <p>${_t('agent.guide.step2.desc', 'Use o scanner do aplicativo para ler o QR Code. A câmera traseira será ativada automaticamente.')}</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="guide-step-number">3</div>
              <div>
                <h4>${_t('agent.guide.step3.title', 'Verificar Resultado')}</h4>
                <p>${_t('agent.guide.step3.desc', 'O sistema mostrará se o QR Code é válido, expirado ou inválido. Confira os dados exibidos.')}</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="guide-step-number">4</div>
              <div>
                <h4>${_t('agent.guide.step4.title', 'Conferir Documentos')}</h4>
                <p>${_t('agent.guide.step4.desc', 'Para QR Codes válidos, verifique a foto do documento de identidade e a prescrição médica ou decisão judicial.')}</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="guide-step-number">5</div>
              <div>
                <h4>${_t('agent.guide.step5.title', 'Liberar ou Reter')}</h4>
                <p>${_t('agent.guide.step5.desc', 'QR Code válido com documentos conferidos: liberação imediata. Caso contrário, siga o procedimento padrão.')}</p>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div>
            <h4 class="mb-sm">${_t('agent.guide.legal', 'Base Legal')}</h4>
            <p class="text-sm text-muted">
              ${_t('agent.guide.anvisa', 'Resolução ANVISA RDC nº 327/2019 — Autoriza a importação e uso de produtos à base de cannabis para fins medicinais.')}
            </p>
            <p class="text-sm text-muted mt-sm">
              ${_t('agent.guide.law', 'Lei nº 11.343/2006 — Distingue uso medicinal de tráfico. O porte com documentação válida é legal.')}
            </p>
          </div>
        </div>
      </div>
    `;
  }

  return { render };
})();
