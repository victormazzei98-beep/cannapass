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
      let allTravelHistory = [];
      let patientVerifications = [];

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

        // Fetch ALL travel history (not just latest)
        const { data: tData } = await sb.from('travel_data')
          .select('*')
          .eq('patient_id', qrRecord.patient_id)
          .order('created_at', { ascending: false });
        allTravelHistory = tData || [];
        travelData = allTravelHistory.length > 0 ? allTravelHistory[0] : null;

        // Fetch all verifications for this patient
        const { data: vData } = await sb.from('verifications')
          .select('*')
          .eq('patient_name', qrRecord.patient_name || patientData?.full_name)
          .order('created_at', { ascending: false })
          .limit(50);
        patientVerifications = vData || [];
      }

      // Record verification — use qr_id from RPC
      await recordVerification(qrRecord.qr_id, token, qrRecord.patient_name, result);

      // Cache successful verification for offline use
      if (result === 'valid' || result === 'expired') {
        OfflineCache.save(token, { result, qrRecord, patientData, travelData, documents, allTravelHistory, patientVerifications });
      }

      // Render result
      renderVerificationResult(resultArea, result, qrRecord, patientData, travelData, documents, false, allTravelHistory, patientVerifications);

    } catch (err) {
      console.error('[Verification]', err);

      // ─── Offline fallback: try cached result ───
      if (!navigator.onLine) {
        const cached = await OfflineCache.get(token);
        if (cached) {
          const age = dayjs().diff(dayjs(cached.cachedAt), 'hour');
          Toast.warning(`Sem conexão — exibindo resultado em cache (${age < 1 ? 'agora' : age + 'h atrás'})`);
          renderVerificationResult(resultArea, cached.data.result, cached.data.qrRecord, cached.data.patientData, cached.data.travelData, cached.data.documents, true, cached.data.allTravelHistory || [], cached.data.patientVerifications || []);
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

  // Chart instance for patient profile
  let chartPatientTrips = null;

  function renderVerificationResult(container, result, qrRecord, patientData, travelData, documents, isOffline = false, allTravelHistory = [], patientVerifications = []) {
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

    // ═══ STATUS BANNER ═══
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

    // Show full patient profile for valid/expired
    if ((result === 'valid' || result === 'expired') && qrRecord) {

      // ═══ PATIENT PROFILE HEADER ═══
      const patientName = qrRecord.patient_name || patientData?.full_name || '—';
      const initials = patientName.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
      const cpfDisplay = qrRecord.cpf_masked || (patientData?.cpf ? maskCPF(patientData.cpf) : '—');
      const regId = patientData?.registration_id || '—';
      const viaLabel = getViaLabel(qrRecord.via || patientData?.via || '');

      html += `
        <div class="card mt-md">
          <div class="card-body">
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:20px;">
              <div style="width:56px;height:56px;border-radius:50%;background:var(--green-soft);border:2px solid var(--green);display:flex;align-items:center;justify-content:center;font-family:'Syne',sans-serif;font-weight:700;font-size:18px;color:var(--green);flex-shrink:0;">
                ${initials}
              </div>
              <div style="flex:1;min-width:0;">
                <h3 style="font-family:'Syne',sans-serif;font-size:1.15rem;font-weight:700;margin:0 0 4px;">${sanitizeHTML(patientName)}</h3>
                <div style="display:flex;flex-wrap:wrap;gap:6px;align-items:center;">
                  <span class="badge badge-neutral" style="font-size:11px;">${sanitizeHTML(cpfDisplay)}</span>
                  <span class="badge badge-neutral" style="font-size:11px;">${sanitizeHTML(regId)}</span>
                  <span class="badge badge-${getStatusBadgeType(patientData?.status || 'approved')}" style="font-size:11px;">${getStatusLabel(patientData?.status || 'approved')}</span>
                </div>
              </div>
            </div>
            <div class="verification-data">
              <div class="verification-field">
                <span class="text-muted text-sm">Via de Acesso</span>
                <strong>${sanitizeHTML(viaLabel)}</strong>
              </div>
              <div class="verification-field">
                <span class="text-muted text-sm">Produto</span>
                <strong>${sanitizeHTML(qrRecord.product || patientData?.product_name || '—')}</strong>
              </div>
              <div class="verification-field">
                <span class="text-muted text-sm">Quantidade Autorizada</span>
                <strong>${sanitizeHTML(qrRecord.quantity || patientData?.transport_quantity || '—')}</strong>
              </div>
              ${patientData?.dosage ? `
                <div class="verification-field">
                  <span class="text-muted text-sm">Dosagem</span>
                  <strong>${sanitizeHTML(patientData.dosage)}</strong>
                </div>
              ` : ''}
            </div>
          </div>
        </div>
      `;

      // ═══ STATS CARDS — Transport overview ═══
      const totalTrips = allTravelHistory.length;
      const thirtyDaysAgo = dayjs().subtract(30, 'day');
      const tripsLast30 = allTravelHistory.filter(t => dayjs(t.created_at).isAfter(thirtyDaysAgo)).length;
      const totalVerifications = patientVerifications.length;
      const lastVerifDate = patientVerifications.length > 0 ? formatDate(patientVerifications[0].created_at) : '—';

      html += `
        <div class="stats-grid mt-md" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr));">
          <div class="stat-card green">
            <div class="stat-info" style="text-align:center;width:100%;">
              <div class="stat-value green">${totalTrips}</div>
              <div class="stat-label">Viagens Registradas</div>
            </div>
          </div>
          <div class="stat-card blue">
            <div class="stat-info" style="text-align:center;width:100%;">
              <div class="stat-value blue">${tripsLast30}</div>
              <div class="stat-label">Últimos 30 Dias</div>
            </div>
          </div>
          <div class="stat-card gold">
            <div class="stat-info" style="text-align:center;width:100%;">
              <div class="stat-value gold">${totalVerifications}</div>
              <div class="stat-label">Verificações</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-info" style="text-align:center;width:100%;">
              <div class="stat-value" style="font-size:14px;">${lastVerifDate}</div>
              <div class="stat-label">Última Verificação</div>
            </div>
          </div>
        </div>
      `;

      // ═══ TRANSPORT HISTORY CHART (last 6 months) ═══
      if (allTravelHistory.length > 0) {
        html += `
          <div class="card mt-md">
            <div class="card-header">
              <h3 class="card-title">Volume de Transportes (6 meses)</h3>
            </div>
            <div class="card-body">
              <div class="chart-container" style="height:220px;">
                <canvas id="chart-patient-trips"></canvas>
              </div>
            </div>
          </div>
        `;
      }

      // ═══ CURRENT TRAVEL DATA ═══
      if (travelData) {
        html += `
          <div class="card mt-md">
            <div class="card-header">
              <h3 class="card-title">Viagem Atual</h3>
              <span class="badge badge-success" style="font-size:11px;">Ativa</span>
            </div>
            <div class="card-body">
              <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                <div style="flex:1;text-align:center;padding:12px;background:var(--surface-2);border-radius:var(--radius-sm);">
                  <div class="text-xs text-muted" style="margin-bottom:4px;">Origem</div>
                  <strong class="text-sm">${sanitizeHTML(travelData.origin || '—')}</strong>
                </div>
                <div style="color:var(--green);flex-shrink:0;">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
                </div>
                <div style="flex:1;text-align:center;padding:12px;background:var(--surface-2);border-radius:var(--radius-sm);">
                  <div class="text-xs text-muted" style="margin-bottom:4px;">Destino</div>
                  <strong class="text-sm">${sanitizeHTML(travelData.destination || '—')}</strong>
                </div>
              </div>
              <div class="verification-data">
                <div class="verification-field">
                  <span class="text-muted text-sm">Data de Partida</span>
                  <strong>${formatDate(travelData.departure_date)}</strong>
                </div>
                <div class="verification-field">
                  <span class="text-muted text-sm">Transporte</span>
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

      // ═══ TRAVEL HISTORY TABLE ═══
      if (allTravelHistory.length > 0) {
        const historyRows = allTravelHistory.slice(0, 10).map(t => {
          const date = formatDate(t.departure_date || t.created_at);
          const origin = sanitizeHTML(t.origin || '—');
          const dest = sanitizeHTML(t.destination || '—');
          const transport = sanitizeHTML(getTransportLabel(t.transport_type));
          return `
            <tr>
              <td class="text-sm">${date}</td>
              <td class="text-sm">${origin}</td>
              <td class="text-sm">${dest}</td>
              <td class="text-sm">${transport}</td>
            </tr>
          `;
        }).join('');

        html += `
          <div class="card mt-md">
            <div class="card-header">
              <h3 class="card-title">Histórico de Viagens</h3>
              <span class="badge badge-neutral">${allTravelHistory.length} registro${allTravelHistory.length > 1 ? 's' : ''}</span>
            </div>
            <div class="card-body" style="overflow-x:auto;">
              <table class="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Origem</th>
                    <th>Destino</th>
                    <th>Transporte</th>
                  </tr>
                </thead>
                <tbody>
                  ${historyRows}
                </tbody>
              </table>
              ${allTravelHistory.length > 10 ? `<p class="text-xs text-muted mt-sm text-center">Exibindo as 10 viagens mais recentes de ${allTravelHistory.length} total</p>` : ''}
            </div>
          </div>
        `;
      }

      // ═══ MEDICAL / LEGAL INFO ═══
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
      }

      // ═══ DOCUMENTS — with open/view capability ═══
      if (documents && documents.length > 0) {
        html += `
          <div class="card mt-md">
            <div class="card-header">
              <h3 class="card-title">Documentos Anexados</h3>
              <span class="badge badge-neutral">${documents.length} arquivo${documents.length > 1 ? 's' : ''}</span>
            </div>
            <div class="card-body" id="documents-list">
              <div class="text-center text-muted"><div class="spinner"></div></div>
            </div>
          </div>
        `;
      }

      // ═══ VERIFICATION HISTORY ═══
      if (patientVerifications.length > 0) {
        const verifRows = patientVerifications.slice(0, 8).map(v => {
          const date = formatDateTime(v.created_at);
          const resultBadge = {
            valid: '<span class="badge badge-success">Válido</span>',
            invalid: '<span class="badge badge-danger">Inválido</span>',
            expired: '<span class="badge badge-warning">Expirado</span>'
          };
          const agentName = sanitizeHTML(v.agent_name || '—');
          const location = sanitizeHTML(v.agent_location || '—');
          return `
            <tr>
              <td class="text-sm">${date}</td>
              <td>${resultBadge[v.result] || `<span class="badge badge-neutral">${sanitizeHTML(v.result)}</span>`}</td>
              <td class="text-sm">${agentName}</td>
              <td class="text-sm">${location}</td>
            </tr>
          `;
        }).join('');

        html += `
          <div class="card mt-md">
            <div class="card-header">
              <h3 class="card-title">Histórico de Verificações</h3>
              <span class="badge badge-neutral">${patientVerifications.length} registro${patientVerifications.length > 1 ? 's' : ''}</span>
            </div>
            <div class="card-body" style="overflow-x:auto;">
              <table class="table">
                <thead>
                  <tr>
                    <th>Data/Hora</th>
                    <th>Resultado</th>
                    <th>Agente</th>
                    <th>Local</th>
                  </tr>
                </thead>
                <tbody>
                  ${verifRows}
                </tbody>
              </table>
              ${patientVerifications.length > 8 ? `<p class="text-xs text-muted mt-sm text-center">Exibindo as 8 verificações mais recentes de ${patientVerifications.length} total</p>` : ''}
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
      if (chartPatientTrips) { chartPatientTrips.destroy(); chartPatientTrips = null; }
      renderScanner(document.querySelector('[data-page-content]') || container.parentElement);
    });

    // Load document signed URLs with view buttons
    if (documents && documents.length > 0) {
      loadDocumentLinks(documents);
    }

    // Render transport volume chart
    if (allTravelHistory.length > 0) {
      renderPatientTripsChart(allTravelHistory);
    }
  }

  function renderPatientTripsChart(travelHistory) {
    const canvas = document.getElementById('chart-patient-trips');
    if (!canvas || typeof Chart === 'undefined') return;

    if (chartPatientTrips) { chartPatientTrips.destroy(); chartPatientTrips = null; }

    // Build monthly data for last 6 months
    const months = [];
    for (let i = 5; i >= 0; i--) {
      months.push(dayjs().subtract(i, 'month'));
    }

    const monthLabels = months.map(m => m.format('MMM/YY'));
    const monthCounts = months.map(m => {
      const startOfMonth = m.startOf('month');
      const endOfMonth = m.endOf('month');
      return travelHistory.filter(t => {
        const d = dayjs(t.departure_date || t.created_at);
        return d.isAfter(startOfMonth) && d.isBefore(endOfMonth);
      }).length;
    });

    chartPatientTrips = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: monthLabels,
        datasets: [{
          label: 'Viagens',
          data: monthCounts,
          backgroundColor: 'rgba(61, 214, 140, 0.3)',
          borderColor: '#3dd68c',
          borderWidth: 2,
          borderRadius: 6,
          barPercentage: 0.6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.parsed.y} viagen${ctx.parsed.y !== 1 ? 's' : ''}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { stepSize: 1, color: '#9ca3af' },
            grid: { color: 'rgba(255,255,255,0.06)' }
          },
          x: {
            ticks: { color: '#9ca3af' },
            grid: { display: false }
          }
        }
      }
    });
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

        const fileExt = (doc.file_name || '').split('.').pop()?.toLowerCase() || '';
        const isImage = ['jpg', 'jpeg', 'png', 'webp', 'gif'].includes(fileExt);
        const isPdf = fileExt === 'pdf';
        const fileIcon = isPdf
          ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--red)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>'
          : isImage
            ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>'
            : '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>';

        html += `
          <div style="display:flex;align-items:center;gap:12px;padding:12px;border-radius:var(--radius-sm);background:var(--surface-2);margin-bottom:8px;">
            <div style="flex-shrink:0;">${fileIcon}</div>
            <div style="flex:1;min-width:0;">
              <strong class="text-sm" style="display:block;">${sanitizeHTML(label)}</strong>
              <p class="text-xs text-muted" style="margin:2px 0 0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${sanitizeHTML(doc.file_name || '—')}</p>
            </div>
            <div style="display:flex;align-items:center;gap:6px;flex-shrink:0;">
              ${statusBadge}
              ${url !== '#' ? `
                <a href="${url}" target="_blank" class="btn btn-sm btn-primary" style="display:inline-flex;align-items:center;gap:4px;">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  Abrir
                </a>
              ` : ''}
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

      // Fetch ALL travel data
      const { data: tData } = await sb.from('travel_data')
        .select('*')
        .eq('patient_id', patientId)
        .order('created_at', { ascending: false });

      // Fetch QR code
      const { data: qrData } = await sb.from('qr_codes')
        .select('*')
        .eq('patient_id', patientId)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1);

      // Fetch verifications for this patient
      const { data: vData } = await sb.from('verifications')
        .select('*')
        .eq('patient_name', patientData.full_name)
        .order('created_at', { ascending: false })
        .limit(50);

      const qrRecord = qrData && qrData.length > 0 ? qrData[0] : null;
      const allTravelHistory = tData || [];
      const travelData = allTravelHistory.length > 0 ? allTravelHistory[0] : null;
      const documents = docs || [];
      const patientVerifications = vData || [];

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
      }, patientData, travelData, documents, false, allTravelHistory, patientVerifications);

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
