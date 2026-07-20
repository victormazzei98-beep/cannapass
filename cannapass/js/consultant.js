/* ═══════════════════════════════════════════
   CANNAPASS — Portal do Consultor
   Perfil profissional, documentos, plantão de
   atendimento e conversa com o paciente
   ═══════════════════════════════════════════ */

const Consultant = (() => {

  // ─── Entrada ───
  function render(page, container) {
    const consultant = State.get('consultant');

    // Sem cadastro profissional, tudo começa pelo perfil
    if (!consultant && page !== 'perfil-consultor') {
      renderPerfil(container, true);
      return;
    }

    switch (page) {
      case 'plantao':               renderPlantao(container); break;
      case 'meus-atendimentos':     renderAtendimentos(container); break;
      case 'perfil-consultor':      renderPerfil(container); break;
      case 'documentos-consultor':  renderDocumentos(container); break;
      default:                      renderPlantao(container);
    }
  }

  // ─── Helpers ───
  function professionLabel(v) {
    const p = PROFESSIONS.find(x => x.value === v);
    return p ? p.label : (v || '—');
  }

  function licenseLabel(v) {
    const p = PROFESSIONS.find(x => x.value === v);
    return p ? p.license : 'Registro';
  }

  function categoryLabel(v) {
    const c = HELP_CATEGORIES.find(x => x.value === v);
    return c ? c.label : (v || '—');
  }

  function urgencyBadge(u) {
    const map = {
      emergencia: ['badge-danger',  'Emergência'],
      urgente:    ['badge-warning', 'Urgente'],
      normal:     ['badge-info',    'Normal']
    };
    const [cls, label] = map[u] || map.normal;
    return `<span class="badge ${cls}">${label}</span>`;
  }

  function ufOptions(selected) {
    return Object.keys(UF_NAMES).sort().map(uf =>
      `<option value="${uf}"${uf === selected ? ' selected' : ''}>${uf} — ${sanitizeHTML(UF_NAMES[uf])}</option>`
    ).join('');
  }

  function timeAgo(ts) {
    if (!ts) return '';
    const mins = dayjs().diff(dayjs(ts), 'minute');
    if (mins < 1) return 'agora';
    if (mins < 60) return `há ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `há ${hours}h`;
    return `há ${Math.floor(hours / 24)}d`;
  }

  // ═══════════════════════════════════════
  //  PERFIL PROFISSIONAL
  // ═══════════════════════════════════════
  function renderPerfil(container, forced = false) {
    const consultant = State.get('consultant');
    const c = consultant || {};
    const isNew = !consultant;

    container.innerHTML = `
      <div class="page-header">
        <h2>Perfil Profissional</h2>
        <p>${isNew
          ? 'Complete seu cadastro para ser avaliado pela nossa equipe'
          : 'Estes dados aparecem para os pacientes no Diretório'}</p>
      </div>

      ${forced ? `
      <div class="card mb-md">
        <div class="card-body">
          <strong>Complete seu cadastro profissional</strong>
          <p class="text-muted text-sm mt-sm">Depois de enviar, seu cadastro passa por análise da administração. Você receberá um e-mail quando for aprovado.</p>
        </div>
      </div>` : ''}

      ${consultant && consultant.status === 'rejected' ? `
      <div class="card mb-md">
        <div class="card-body">
          <strong style="color:var(--red);">Cadastro recusado</strong>
          <p class="text-muted text-sm mt-sm">${sanitizeHTML(consultant.rejection_reason || 'Entre em contato com o suporte para mais detalhes.')}</p>
        </div>
      </div>` : ''}

      <div class="card">
        <div class="card-body">
          <form id="consultant-form" class="form-stack">
            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="c-name">Nome completo *</label>
                <input class="form-input" type="text" id="c-name" required value="${sanitizeHTML(c.full_name || State.get('profile')?.full_name || '')}">
              </div>
              <div class="form-group">
                <label class="form-label" for="c-profession">Área de atuação *</label>
                <select class="form-select" id="c-profession" required>
                  <option value="">Selecione...</option>
                  ${PROFESSIONS.map(p => `<option value="${p.value}"${c.profession === p.value ? ' selected' : ''}>${p.label}</option>`).join('')}
                </select>
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="c-license-number"><span id="c-license-label">Registro profissional</span> *</label>
                <div style="display:flex; gap:8px;">
                  <input class="form-input" type="text" id="c-license-number" placeholder="Número" style="flex:1;" required value="${sanitizeHTML(c.license_number || '')}">
                  <select class="form-select" id="c-license-uf" style="flex:1;" aria-label="UF do registro">
                    <option value="">UF...</option>
                    ${ufOptions(c.license_uf)}
                  </select>
                </div>
              </div>
              <div class="form-group">
                <label class="form-label" for="c-specialty">Especialidade</label>
                <input class="form-input" type="text" id="c-specialty" placeholder="Ex: Neurologia, Direito penal" value="${sanitizeHTML(c.specialty || '')}">
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="c-state">Estado *</label>
                <select class="form-select" id="c-state" required>
                  <option value="">Selecione...</option>
                  ${ufOptions(c.state)}
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="c-city">Cidade</label>
                <input class="form-input" type="text" id="c-city" value="${sanitizeHTML(c.city || '')}">
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="c-bio">Apresentação</label>
              <textarea class="form-input" id="c-bio" rows="3" placeholder="Conte brevemente sua experiência com cannabis medicinal...">${sanitizeHTML(c.bio || '')}</textarea>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="c-phone">Telefone *</label>
                <input class="form-input" type="text" id="c-phone" placeholder="(00) 00000-0000" required value="${sanitizeHTML(c.phone || '')}">
              </div>
              <div class="form-group">
                <label class="form-label" for="c-whatsapp">WhatsApp</label>
                <input class="form-input" type="text" id="c-whatsapp" placeholder="(00) 00000-0000" value="${sanitizeHTML(c.whatsapp || '')}">
              </div>
            </div>

            <div class="grid-2">
              <div class="form-group">
                <label class="form-label" for="c-website">Site</label>
                <input class="form-input" type="text" id="c-website" placeholder="https://" value="${sanitizeHTML(c.website || '')}">
              </div>
              <div class="form-group">
                <label class="form-label" for="c-instagram">Instagram</label>
                <input class="form-input" type="text" id="c-instagram" placeholder="@perfil" value="${sanitizeHTML(c.instagram || '')}">
              </div>
            </div>

            <p class="text-muted text-xs">
              A divulgação profissional segue as regras do seu conselho de classe (CFM, OAB, CREA).
              Mantenha as informações sóbrias e verdadeiras.
            </p>

            <button type="submit" class="btn btn-primary btn-lg btn-block" id="consultant-submit">
              ${isNew ? 'Enviar cadastro para análise' : 'Salvar alterações'}
            </button>
          </form>
        </div>
      </div>
    `;

    // O rótulo do registro acompanha a área escolhida (CRM, OAB, CREA...)
    const professionSel = document.getElementById('c-profession');
    const licenseLabelEl = document.getElementById('c-license-label');
    function refreshLicenseLabel() {
      if (licenseLabelEl) licenseLabelEl.textContent = professionSel.value
        ? licenseLabel(professionSel.value)
        : 'Registro profissional';
    }
    professionSel?.addEventListener('change', refreshLicenseLabel);
    refreshLicenseLabel();

    document.getElementById('consultant-form')?.addEventListener('submit', handlePerfilSubmit);
  }

  async function handlePerfilSubmit(e) {
    e.preventDefault();
    const btn = document.getElementById('consultant-submit');
    btn.classList.add('btn-loading');
    btn.disabled = true;

    try {
      const userId = State.get('user')?.id;
      const existing = State.get('consultant');

      const payload = {
        user_id: userId,
        full_name: document.getElementById('c-name').value.trim(),
        profession: document.getElementById('c-profession').value,
        license_type: licenseLabel(document.getElementById('c-profession').value),
        license_number: document.getElementById('c-license-number').value.trim(),
        license_uf: document.getElementById('c-license-uf').value || null,
        specialty: document.getElementById('c-specialty').value.trim() || null,
        state: document.getElementById('c-state').value || null,
        city: document.getElementById('c-city').value.trim() || null,
        bio: document.getElementById('c-bio').value.trim() || null,
        phone: document.getElementById('c-phone').value.trim() || null,
        whatsapp: document.getElementById('c-whatsapp').value.trim() || null,
        website: document.getElementById('c-website').value.trim() || null,
        instagram: document.getElementById('c-instagram').value.trim() || null
      };

      if (!payload.full_name || !payload.profession || !payload.license_number || !payload.state) {
        Toast.error('Preencha os campos obrigatórios.');
        return;
      }

      let saved;
      if (existing) {
        const { data, error } = await sb.from('consultants')
          .update(payload).eq('id', existing.id).select().single();
        if (error) throw error;
        saved = data;
        Toast.success('Perfil atualizado!');
      } else {
        const { data, error } = await sb.from('consultants')
          .insert(payload).select().single();
        if (error) throw error;
        saved = data;
        Toast.success('Cadastro enviado para análise!');
      }

      State.set('consultant', saved);

      // Recém-cadastrado fica pendente: envia para a tela de análise
      if (!existing) {
        setTimeout(() => window.location.reload(), 1200);
      }
    } catch (err) {
      console.error('[Consultant] Perfil error:', err);
      Toast.error(err.message || 'Erro ao salvar o perfil.');
    } finally {
      btn.classList.remove('btn-loading');
      btn.disabled = false;
    }
  }

  // ═══════════════════════════════════════
  //  DOCUMENTOS PROFISSIONAIS
  // ═══════════════════════════════════════
  async function renderDocumentos(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Meus Documentos</h2>
        <p>Comprove sua habilitação profissional</p>
      </div>

      <div class="card mb-md">
        <div class="card-body">
          <h4 class="mb-md">Enviar Documento</h4>
          <div class="grid-2">
            <div class="form-group">
              <label class="form-label" for="cd-type">Tipo *</label>
              <select class="form-select" id="cd-type">
                <option value="">Selecione o tipo...</option>
                <option value="professional_license">Carteira profissional (CRM / OAB / CREA)</option>
                <option value="identity">Documento de identidade</option>
                <option value="certificate">Certificado / especialização</option>
                <option value="other">Outro</option>
              </select>
            </div>
            <div class="form-group">
              <label class="form-label" for="cd-file">Arquivo *</label>
              <input class="form-input" type="file" id="cd-file" accept=".pdf,.jpg,.jpeg,.png">
              <span class="text-xs text-muted">PDF, JPG ou PNG — máx. 10MB</span>
            </div>
          </div>
          <button class="btn btn-primary" id="cd-upload">Enviar Documento</button>
        </div>
      </div>

      <div class="card">
        <div class="card-body">
          <h4 class="mb-md">Documentos Enviados</h4>
          <div id="cd-list"><div class="flex-center"><div class="spinner"></div></div></div>
        </div>
      </div>
    `;

    document.getElementById('cd-upload')?.addEventListener('click', handleDocUpload);
    await loadDocs();
  }

  async function loadDocs() {
    const list = document.getElementById('cd-list');
    if (!list) return;
    const consultant = State.get('consultant');
    if (!consultant) { list.innerHTML = '<p class="text-muted">Complete seu perfil primeiro.</p>'; return; }

    const { data, error } = await sb.from('consultant_documents')
      .select('*').eq('consultant_id', consultant.id).order('created_at', { ascending: false });

    if (error) { list.innerHTML = '<p class="text-muted">Erro ao carregar documentos.</p>'; return; }
    if (!data || !data.length) {
      list.innerHTML = `<div class="empty-state"><p>Nenhum documento enviado ainda.</p></div>`;
      return;
    }

    const labels = {
      professional_license: 'Carteira profissional',
      identity: 'Documento de identidade',
      certificate: 'Certificado',
      other: 'Outro'
    };
    const statusBadge = { uploaded: 'badge-warning', verified: 'badge-success', rejected: 'badge-danger' };
    const statusText  = { uploaded: 'Em análise', verified: 'Verificado', rejected: 'Recusado' };

    list.innerHTML = `
      <div class="table-wrapper">
        <table class="table">
          <thead><tr><th>Tipo</th><th>Arquivo</th><th>Status</th><th>Data</th></tr></thead>
          <tbody>
            ${data.map(d => `
              <tr>
                <td>${labels[d.doc_type] || d.doc_type}</td>
                <td>${sanitizeHTML(d.file_name)}</td>
                <td><span class="badge ${statusBadge[d.status] || 'badge-info'}">${statusText[d.status] || d.status}</span></td>
                <td>${formatDate(d.created_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  async function handleDocUpload() {
    const btn = document.getElementById('cd-upload');
    const typeEl = document.getElementById('cd-type');
    const fileEl = document.getElementById('cd-file');
    const docType = typeEl.value;
    const file = fileEl.files[0];
    const consultant = State.get('consultant');

    if (!docType) { Toast.warning('Selecione o tipo do documento.'); return; }
    if (!file) { Toast.warning('Selecione um arquivo.'); return; }
    if (!consultant) { Toast.error('Complete seu perfil antes de enviar documentos.'); return; }

    const validation = validateFile(file);
    if (!validation.valid) { Toast.error(validation.error); return; }

    btn.disabled = true;
    btn.textContent = 'Enviando...';

    try {
      const userId = State.get('user').id;
      const ext = file.name.split('.').pop().toLowerCase();
      const filePath = `${userId}/consultor_${docType}_${Date.now()}.${ext}`;

      const { data: existing } = await sb.from('consultant_documents')
        .select('id, file_path').eq('consultant_id', consultant.id).eq('doc_type', docType).maybeSingle();

      const { error: upErr } = await sb.storage.from(STORAGE_BUCKET)
        .upload(filePath, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;

      const { error: dbErr } = await sb.from('consultant_documents').upsert({
        consultant_id: consultant.id,
        user_id: userId,
        doc_type: docType,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        status: 'uploaded'
      }, { onConflict: 'consultant_id,doc_type' });

      if (dbErr) {
        await sb.storage.from(STORAGE_BUCKET).remove([filePath]).catch(() => {});
        throw dbErr;
      }

      if (existing?.file_path && existing.file_path !== filePath) {
        await sb.storage.from(STORAGE_BUCKET).remove([existing.file_path]).catch(() => {});
      }

      Toast.success(existing ? 'Documento atualizado!' : 'Documento enviado!');
      typeEl.value = ''; fileEl.value = '';
      await loadDocs();
    } catch (err) {
      console.error('[Consultant] Upload error:', err);
      Toast.error('Erro ao enviar documento.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Enviar Documento';
    }
  }

  // ═══════════════════════════════════════
  //  PLANTÃO (fila anonimizada)
  // ═══════════════════════════════════════
  async function renderPlantao(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Plantão de Atendimento</h2>
        <p>Chamados aguardando um consultor. Os dados do paciente só aparecem depois que você assume.</p>
      </div>
      <div id="plantao-content"><div class="flex-center"><div class="spinner"></div></div></div>
    `;
    await loadPlantao();
  }

  async function loadPlantao() {
    const box = document.getElementById('plantao-content');
    if (!box) return;

    const { data, error } = await sb.rpc('list_open_help_requests');

    if (error) {
      box.innerHTML = `
        <div class="card"><div class="card-body">
          <div class="empty-state">
            <h4>Fila indisponível</h4>
            <p>${sanitizeHTML(error.message || 'Seu cadastro precisa estar aprovado para atender.')}</p>
          </div>
        </div></div>`;
      return;
    }

    if (!data || !data.length) {
      box.innerHTML = `
        <div class="card"><div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">${Icons.success || ''}</div>
            <h4>Nenhum chamado aberto</h4>
            <p>Quando um paciente precisar de ajuda, o chamado aparece aqui.</p>
          </div>
        </div></div>`;
      return;
    }

    box.innerHTML = data.map(r => `
      <div class="card mb-sm">
        <div class="card-body" style="display:flex;align-items:center;gap:16px;flex-wrap:wrap;">
          <div style="flex:1;min-width:240px;">
            <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
              ${urgencyBadge(r.urgency)}
              <span class="badge badge-info">${categoryLabel(r.category)}</span>
              ${r.auto_generated ? '<span class="badge badge-warning">Automático</span>' : ''}
              ${r.state ? `<span class="text-xs text-muted">${sanitizeHTML(r.state)}</span>` : ''}
            </div>
            <div style="font-weight:600;margin-top:8px;">${sanitizeHTML(r.subject)}</div>
            <div class="text-xs text-muted">Aberto ${timeAgo(r.created_at)}</div>
          </div>
          <button class="btn btn-primary accept-btn" data-id="${r.id}">Assumir chamado</button>
        </div>
      </div>
    `).join('');

    box.querySelectorAll('.accept-btn').forEach(btn => {
      btn.addEventListener('click', () => acceptRequest(btn.dataset.id, btn));
    });
  }

  async function acceptRequest(id, btn) {
    btn.disabled = true;
    btn.textContent = 'Assumindo...';
    try {
      const { data, error } = await sb.rpc('accept_help_request', { request_id: id });
      if (error) throw error;
      if (!data?.ok) {
        Toast.warning(data?.error || 'Não foi possível assumir este chamado.');
        await loadPlantao();
        return;
      }
      Toast.success('Chamado assumido! Ele está em Meus Atendimentos.');
      Router.navigate('meus-atendimentos');
    } catch (err) {
      console.error('[Consultant] Accept error:', err);
      Toast.error(err.message || 'Erro ao assumir o chamado.');
      btn.disabled = false;
      btn.textContent = 'Assumir chamado';
    }
  }

  // ═══════════════════════════════════════
  //  MEUS ATENDIMENTOS (com conversa)
  // ═══════════════════════════════════════
  async function renderAtendimentos(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Meus Atendimentos</h2>
        <p>Chamados que você assumiu</p>
      </div>
      <div id="atend-content"><div class="flex-center"><div class="spinner"></div></div></div>
    `;
    await loadAtendimentos();
  }

  async function loadAtendimentos() {
    const box = document.getElementById('atend-content');
    if (!box) return;

    const consultant = State.get('consultant');
    if (!consultant) { box.innerHTML = '<p class="text-muted">Complete seu perfil primeiro.</p>'; return; }

    const { data, error } = await sb.from('help_requests')
      .select('*, patients(full_name, cpf, via, registration_id)')
      .eq('assigned_to', consultant.id)
      .order('created_at', { ascending: false });

    if (error) {
      box.innerHTML = '<p class="text-muted">Erro ao carregar atendimentos.</p>';
      return;
    }
    if (!data || !data.length) {
      box.innerHTML = `
        <div class="card"><div class="card-body">
          <div class="empty-state">
            <h4>Nenhum atendimento ainda</h4>
            <p>Assuma um chamado no Plantão para começar.</p>
            <button class="btn btn-primary mt-md" onclick="Router.navigate('plantao')">Ir para o Plantão</button>
          </div>
        </div></div>`;
      return;
    }

    const statusText = { open: 'Aberto', assigned: 'Em atendimento', resolved: 'Resolvido', closed: 'Encerrado' };
    box.innerHTML = data.map(r => {
      const p = r.patients || {};
      return `
      <div class="card mb-sm">
        <div class="card-body">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
            ${urgencyBadge(r.urgency)}
            <span class="badge badge-info">${categoryLabel(r.category)}</span>
            <span class="badge ${r.status === 'resolved' ? 'badge-success' : 'badge-warning'}">${statusText[r.status] || r.status}</span>
          </div>
          <div style="font-weight:600;margin-top:8px;">${sanitizeHTML(r.subject)}</div>
          <div class="text-sm text-muted mt-sm">
            Paciente: <strong>${sanitizeHTML(p.full_name || '—')}</strong>
            ${p.registration_id ? ` · ${sanitizeHTML(p.registration_id)}` : ''}
            ${p.via ? ` · ${p.via === 'hc' ? 'Habeas Corpus' : 'Farmácia/Associação'}` : ''}
          </div>
          ${r.description ? `<p class="text-sm mt-sm">${sanitizeHTML(r.description)}</p>` : ''}
          <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap;">
            <button class="btn btn-secondary open-chat" data-id="${r.id}">Abrir conversa</button>
            ${r.status !== 'resolved' ? `<button class="btn btn-outline resolve-btn" data-id="${r.id}">Marcar como resolvido</button>` : ''}
          </div>
          <div class="chat-box hidden" id="chat-${r.id}" style="margin-top:16px;border-top:1px solid var(--border);padding-top:12px;">
            <div class="chat-messages" id="msgs-${r.id}" style="max-height:280px;overflow-y:auto;"></div>
            <div style="display:flex;gap:8px;margin-top:8px;">
              <input class="form-input" type="text" id="input-${r.id}" placeholder="Escreva sua orientação..." style="flex:1;">
              <button class="btn btn-primary send-btn" data-id="${r.id}">Enviar</button>
            </div>
          </div>
        </div>
      </div>`;
    }).join('');

    box.querySelectorAll('.open-chat').forEach(b => b.addEventListener('click', () => toggleChat(b.dataset.id)));
    box.querySelectorAll('.send-btn').forEach(b => b.addEventListener('click', () => sendMessage(b.dataset.id)));
    box.querySelectorAll('.resolve-btn').forEach(b => b.addEventListener('click', () => resolveRequest(b.dataset.id)));
  }

  async function toggleChat(id) {
    const box = document.getElementById(`chat-${id}`);
    if (!box) return;
    box.classList.toggle('hidden');
    if (!box.classList.contains('hidden')) await loadMessages(id);
  }

  async function loadMessages(id) {
    const el = document.getElementById(`msgs-${id}`);
    if (!el) return;
    const { data } = await sb.from('help_messages')
      .select('*').eq('request_id', id).order('created_at', { ascending: true });

    if (!data || !data.length) {
      el.innerHTML = '<p class="text-muted text-sm">Nenhuma mensagem ainda. Envie a primeira orientação.</p>';
      return;
    }
    const myId = State.get('user')?.id;
    el.innerHTML = data.map(m => {
      const mine = m.sender_id === myId;
      return `
        <div style="margin-bottom:8px;text-align:${mine ? 'right' : 'left'};">
          <div style="display:inline-block;max-width:80%;padding:8px 12px;border-radius:12px;
                      background:${mine ? 'var(--green)' : 'var(--surface-2)'};
                      color:${mine ? '#0c1a12' : 'var(--text)'};text-align:left;">
            <div style="font-size:.85rem;">${sanitizeHTML(m.body)}</div>
            <div style="font-size:.7rem;opacity:.7;margin-top:2px;">${timeAgo(m.created_at)}</div>
          </div>
        </div>`;
    }).join('');
    el.scrollTop = el.scrollHeight;
  }

  async function sendMessage(id) {
    const input = document.getElementById(`input-${id}`);
    const body = input?.value.trim();
    if (!body) return;
    try {
      const { error } = await sb.from('help_messages').insert({
        request_id: id,
        sender_id: State.get('user').id,
        sender_role: 'consultant',
        body
      });
      if (error) throw error;
      input.value = '';
      await loadMessages(id);
    } catch (err) {
      console.error('[Consultant] Message error:', err);
      Toast.error('Erro ao enviar mensagem.');
    }
  }

  async function resolveRequest(id) {
    try {
      const { error } = await sb.from('help_requests')
        .update({ status: 'resolved', resolved_at: new Date().toISOString() })
        .eq('id', id);
      if (error) throw error;
      Toast.success('Chamado marcado como resolvido.');
      await loadAtendimentos();
    } catch (err) {
      console.error('[Consultant] Resolve error:', err);
      Toast.error('Erro ao atualizar o chamado.');
    }
  }

  return { render };
})();
