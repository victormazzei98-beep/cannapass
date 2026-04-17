/* ═══════════════════════════════════════════
   CANNAPASS — Internationalization (i18n)
   PT-BR / EN language toggle
   ═══════════════════════════════════════════ */

const I18n = (() => {
  const STORAGE_KEY = 'cannapass-lang';
  let _lang = 'pt';

  // ─── Translation Dictionary ───
  const DICT = {
    // ─── Common ───
    'app.name': { pt: 'Cannapass', en: 'Cannapass' },
    'common.loading': { pt: 'Carregando...', en: 'Loading...' },
    'common.search': { pt: 'Buscar', en: 'Search' },
    'common.cancel': { pt: 'Cancelar', en: 'Cancel' },
    'common.confirm': { pt: 'Confirmar', en: 'Confirm' },
    'common.save': { pt: 'Salvar', en: 'Save' },
    'common.close': { pt: 'Fechar', en: 'Close' },
    'common.back': { pt: 'Voltar', en: 'Back' },
    'common.next': { pt: 'Próximo', en: 'Next' },
    'common.prev': { pt: 'Anterior', en: 'Previous' },
    'common.yes': { pt: 'Sim', en: 'Yes' },
    'common.no': { pt: 'Não', en: 'No' },
    'common.error': { pt: 'Erro', en: 'Error' },
    'common.success': { pt: 'Sucesso', en: 'Success' },
    'common.today': { pt: 'Hoje', en: 'Today' },
    'common.yesterday': { pt: 'Ontem', en: 'Yesterday' },
    'common.noResults': { pt: 'Nenhum resultado', en: 'No results' },

    // ─── Roles ───
    'role.patient': { pt: 'Paciente', en: 'Patient' },
    'role.agent': { pt: 'Agente Fiscalizador', en: 'Inspection Agent' },
    'role.admin': { pt: 'Administrador', en: 'Administrator' },

    // ─── Status ───
    'status.draft': { pt: 'Rascunho', en: 'Draft' },
    'status.pending': { pt: 'Pendente', en: 'Pending' },
    'status.approved': { pt: 'Aprovado', en: 'Approved' },
    'status.rejected': { pt: 'Rejeitado', en: 'Rejected' },
    'status.renewal_pending': { pt: 'Renovação Pendente', en: 'Renewal Pending' },
    'status.expired': { pt: 'Expirado', en: 'Expired' },

    // ─── Verification Results ───
    'result.valid': { pt: 'Válido', en: 'Valid' },
    'result.invalid': { pt: 'Inválido', en: 'Invalid' },
    'result.expired': { pt: 'Expirado', en: 'Expired' },
    'result.suspicious': { pt: 'Suspeito', en: 'Suspicious' },

    // ─── Via ───
    'via.pharmacy': { pt: 'Farmácia / Associação', en: 'Pharmacy / Association' },
    'via.hc': { pt: 'Habeas Corpus', en: 'Habeas Corpus' },

    // ─── Transport ───
    'transport.air': { pt: 'Aéreo', en: 'Air' },
    'transport.road': { pt: 'Rodoviário', en: 'Road' },
    'transport.other': { pt: 'Outro', en: 'Other' },

    // ─── Agent — Scanner ───
    'agent.scanner.title': { pt: 'Scanner QR Code', en: 'QR Code Scanner' },
    'agent.scanner.subtitle': { pt: 'Escaneie o QR Code do paciente para verificação', en: 'Scan the patient\'s QR Code for verification' },
    'agent.scanner.camera': { pt: 'Câmera', en: 'Camera' },
    'agent.scanner.start': { pt: 'Iniciar Scanner', en: 'Start Scanner' },
    'agent.scanner.stop': { pt: 'Parar Scanner', en: 'Stop Scanner' },
    'agent.scanner.disabled': { pt: 'Scanner desativado', en: 'Scanner disabled' },
    'agent.scanner.clickToStart': { pt: 'Clique em "Iniciar Scanner" para ativar a câmera', en: 'Click "Start Scanner" to activate camera' },
    'agent.scanner.manual': { pt: 'Código Manual', en: 'Manual Code' },
    'agent.scanner.manualLabel': { pt: 'Token ou URL do QR Code', en: 'QR Code Token or URL' },
    'agent.scanner.manualHint': { pt: 'Ex: https://cannapass.vercel.app/#/v/abc123 ou apenas abc123', en: 'E.g.: https://cannapass.vercel.app/#/v/abc123 or just abc123' },
    'agent.scanner.verify': { pt: 'Verificar', en: 'Verify' },

    // ─── Agent — Search ───
    'agent.search.title': { pt: 'Busca Avançada', en: 'Advanced Search' },
    'agent.search.subtitle': { pt: 'Busque por CPF (completo ou parcial), código de registro ou nome', en: 'Search by CPF (full or partial), registration code, or name' },
    'agent.search.label': { pt: 'Pesquisar', en: 'Search' },
    'agent.search.placeholder': { pt: 'CPF, código de registro ou nome...', en: 'CPF, registration code or name...' },
    'agent.search.hint': { pt: 'CPF parcial (ex: últimos 4 dígitos), CPF completo, número de registro ou nome do paciente', en: 'Partial CPF (e.g. last 4 digits), full CPF, registration number or patient name' },
    'agent.search.allStatus': { pt: 'Todos os Status', en: 'All Statuses' },
    'agent.search.searching': { pt: 'Buscando...', en: 'Searching...' },
    'agent.search.results': { pt: 'resultado(s)', en: 'result(s)' },
    'agent.search.noResults': { pt: 'Nenhum paciente encontrado para', en: 'No patient found for' },
    'agent.search.method.cpfExact': { pt: 'CPF exato', en: 'Exact CPF' },
    'agent.search.method.cpfPartial': { pt: 'CPF parcial', en: 'Partial CPF' },
    'agent.search.method.regId': { pt: 'Código de registro', en: 'Registration code' },
    'agent.search.method.regPartial': { pt: 'Código parcial', en: 'Partial code' },
    'agent.search.method.name': { pt: 'Nome', en: 'Name' },
    'agent.search.registerVerif': { pt: 'Registrar Verificação', en: 'Record Verification' },
    'agent.search.newSearch': { pt: 'Nova Busca', en: 'New Search' },

    // ─── Agent — History ───
    'agent.history.title': { pt: 'Histórico de Verificações', en: 'Verification History' },
    'agent.history.subtitle': { pt: 'Verificações realizadas por você', en: 'Verifications performed by you' },
    'agent.history.noVerif': { pt: 'Nenhuma verificação', en: 'No verifications' },
    'agent.history.emptyMsg': { pt: 'Seu histórico aparecerá aqui após sua primeira verificação.', en: 'Your history will appear here after your first verification.' },
    'agent.history.detail': { pt: 'Detalhes da Verificação', en: 'Verification Details' },

    // ─── Agent — Stats ───
    'agent.stats.title': { pt: 'Minhas Estatísticas', en: 'My Statistics' },
    'agent.stats.subtitle': { pt: 'Métricas das suas verificações', en: 'Your verification metrics' },
    'agent.stats.total': { pt: 'Total de Verificações', en: 'Total Verifications' },
    'agent.stats.today': { pt: 'Hoje', en: 'Today' },
    'agent.stats.validRate': { pt: 'Taxa de Válidos', en: 'Valid Rate' },
    'agent.stats.thisWeek': { pt: 'Esta Semana', en: 'This Week' },
    'agent.stats.dailyChart': { pt: 'Verificações por Dia (últimos 14 dias)', en: 'Verifications per Day (last 14 days)' },
    'agent.stats.resultsChart': { pt: 'Resultados', en: 'Results' },
    'agent.stats.recent': { pt: 'Últimas Verificações', en: 'Recent Verifications' },

    // ─── Agent — Guide ───
    'agent.guide.title': { pt: 'Guia de Fiscalização', en: 'Inspection Guide' },
    'agent.guide.subtitle': { pt: 'Procedimento passo a passo para verificação de transporte', en: 'Step-by-step procedure for transport verification' },
    'agent.guide.step1.title': { pt: 'Solicitar QR Code', en: 'Request QR Code' },
    'agent.guide.step1.desc': { pt: 'Peça ao passageiro para apresentar o QR Code do Cannapass no celular ou impresso.', en: 'Ask the passenger to present their Cannapass QR Code on phone or printed.' },
    'agent.guide.step2.title': { pt: 'Escanear QR Code', en: 'Scan QR Code' },
    'agent.guide.step2.desc': { pt: 'Use o scanner do aplicativo para ler o QR Code. A câmera traseira será ativada automaticamente.', en: 'Use the app scanner to read the QR Code. The rear camera will be activated automatically.' },
    'agent.guide.step3.title': { pt: 'Verificar Resultado', en: 'Check Result' },
    'agent.guide.step3.desc': { pt: 'O sistema mostrará se o QR Code é válido, expirado ou inválido. Confira os dados exibidos.', en: 'The system will show if the QR Code is valid, expired, or invalid. Check the displayed data.' },
    'agent.guide.step4.title': { pt: 'Conferir Documentos', en: 'Verify Documents' },
    'agent.guide.step4.desc': { pt: 'Para QR Codes válidos, verifique a foto do documento de identidade e a prescrição médica ou decisão judicial.', en: 'For valid QR Codes, check the photo ID and the medical prescription or court order.' },
    'agent.guide.step5.title': { pt: 'Liberar ou Reter', en: 'Release or Detain' },
    'agent.guide.step5.desc': { pt: 'QR Code válido com documentos conferidos: liberação imediata. Caso contrário, siga o procedimento padrão.', en: 'Valid QR Code with verified documents: immediate release. Otherwise, follow standard procedure.' },
    'agent.guide.legal': { pt: 'Base Legal', en: 'Legal Basis' },
    'agent.guide.anvisa': { pt: 'Resolução ANVISA RDC nº 327/2019 — Autoriza a importação e uso de produtos à base de cannabis para fins medicinais.', en: 'ANVISA Resolution RDC No. 327/2019 — Authorizes the import and use of cannabis-based products for medical purposes.' },
    'agent.guide.law': { pt: 'Lei nº 11.343/2006 — Distingue uso medicinal de tráfico. O porte com documentação válida é legal.', en: 'Law No. 11,343/2006 — Distinguishes medical use from trafficking. Possession with valid documentation is legal.' },

    // ─── Verification Result Display ───
    'verif.valid.title': { pt: 'Autorização Válida', en: 'Valid Authorization' },
    'verif.valid.desc': { pt: 'Este paciente possui autorização válida para transporte de cannabis medicinal.', en: 'This patient has a valid authorization for medical cannabis transport.' },
    'verif.invalid.title': { pt: 'QR Code Inválido', en: 'Invalid QR Code' },
    'verif.invalid.desc': { pt: 'Este QR Code não foi encontrado no sistema ou está inativo.', en: 'This QR Code was not found in the system or is inactive.' },
    'verif.expired.title': { pt: 'QR Code Expirado', en: 'Expired QR Code' },
    'verif.expired.desc': { pt: 'A autorização vinculada a este QR Code expirou.', en: 'The authorization linked to this QR Code has expired.' },

    // ─── Field Labels ───
    'field.patient': { pt: 'Paciente', en: 'Patient' },
    'field.cpf': { pt: 'CPF', en: 'CPF (Tax ID)' },
    'field.via': { pt: 'Via de Obtenção', en: 'Procurement Method' },
    'field.legal': { pt: 'Amparo Legal', en: 'Legal Basis' },
    'field.product': { pt: 'Produto', en: 'Product' },
    'field.quantity': { pt: 'Quantidade', en: 'Quantity' },
    'field.origin': { pt: 'Origem', en: 'Origin' },
    'field.destination': { pt: 'Destino', en: 'Destination' },
    'field.departure': { pt: 'Data de Partida', en: 'Departure Date' },
    'field.transport': { pt: 'Transporte', en: 'Transport' },
    'field.flight': { pt: 'Voo / Linha', en: 'Flight / Line' },
    'field.date': { pt: 'Data', en: 'Date' },
    'field.result': { pt: 'Resultado', en: 'Result' },
    'field.location': { pt: 'Local', en: 'Location' },
    'field.status': { pt: 'Status', en: 'Status' },
    'field.datetime': { pt: 'Data/Hora', en: 'Date/Time' },
    'field.coordinates': { pt: 'Coordenadas', en: 'Coordinates' },
    'field.notes': { pt: 'Observações', en: 'Notes' },
    'field.token': { pt: 'Token', en: 'Token' },
    'field.prescriptionValidity': { pt: 'Validade da Prescrição', en: 'Prescription Validity' },
    'field.doctor': { pt: 'Médico', en: 'Doctor' },
    'field.crm': { pt: 'CRM', en: 'Medical License' },

    // ─── Sidebar / Navigation ───
    'nav.scanner': { pt: 'Scanner', en: 'Scanner' },
    'nav.search': { pt: 'Busca Avançada', en: 'Advanced Search' },
    'nav.history': { pt: 'Histórico', en: 'History' },
    'nav.stats': { pt: 'Estatísticas', en: 'Statistics' },
    'nav.guide': { pt: 'Guia', en: 'Guide' },
    'nav.verification': { pt: 'Verificação', en: 'Verification' },
    'nav.records': { pt: 'Registros', en: 'Records' },
    'nav.support': { pt: 'Suporte', en: 'Support' },
    'nav.agentPortal': { pt: 'Portal do Agente', en: 'Agent Portal' },

    // ─── Table Headers ───
    'table.date': { pt: 'Data', en: 'Date' },
    'table.patient': { pt: 'Paciente', en: 'Patient' },
    'table.result': { pt: 'Resultado', en: 'Result' },
    'table.location': { pt: 'Local', en: 'Location' },
    'table.page': { pt: 'Página', en: 'Page' },
    'table.of': { pt: 'de', en: 'of' },

    // ─── Misc ───
    'lang.toggle': { pt: 'English', en: 'Português' },
    'lang.current': { pt: 'PT', en: 'EN' },
    'offline.warning': { pt: 'Você está offline. Algumas funcionalidades podem não funcionar.', en: 'You are offline. Some features may not work.' },
    'offline.restored': { pt: 'Conexão restaurada.', en: 'Connection restored.' },
    'error.unexpected': { pt: 'Ocorreu um erro inesperado. Tente novamente.', en: 'An unexpected error occurred. Please try again.' },

    // ─── New Verification Button ───
    'verif.new': { pt: 'Nova Verificação', en: 'New Verification' },
    'verif.register': { pt: 'Registrar Verificação', en: 'Record Verification' },
    'verif.registered': { pt: 'Verificação Registrada', en: 'Verification Recorded' },
    'verif.manualConfirm': { pt: 'Deseja registrar uma verificação manual para', en: 'Do you want to record a manual verification for' },
    'verif.success': { pt: 'Verificação registrada com sucesso.', en: 'Verification recorded successfully.' },
  };

  // ─── Get Translation ───
  function t(key, fallback) {
    const entry = DICT[key];
    if (!entry) return fallback || key;
    return entry[_lang] || entry['pt'] || fallback || key;
  }

  // ─── Get Current Language ───
  function lang() {
    return _lang;
  }

  // ─── Set Language ───
  function setLang(newLang) {
    if (newLang !== 'pt' && newLang !== 'en') return;
    _lang = newLang;
    localStorage.setItem(STORAGE_KEY, newLang);
    document.documentElement.setAttribute('data-lang', newLang);
    // Update dayjs locale
    if (typeof dayjs !== 'undefined') {
      dayjs.locale(newLang === 'pt' ? 'pt-br' : 'en');
    }
  }

  // ─── Toggle Language ───
  function toggle() {
    setLang(_lang === 'pt' ? 'en' : 'pt');
    // Re-render current page
    const currentPage = State.get('currentPage');
    const role = State.get('activeRole') || State.get('profile')?.role;
    if (role === 'agent' && currentPage) {
      const container = document.getElementById('main-content');
      if (container && typeof Agent !== 'undefined') {
        Agent.render(currentPage, container);
      }
    }
    updateToggleButton();
  }

  // ─── Update Toggle Button Text ───
  function updateToggleButton() {
    const btn = document.getElementById('lang-toggle-btn');
    if (btn) {
      btn.innerHTML = `<span style="font-weight:600;font-size:12px;">${t('lang.current')}</span>`;
      btn.title = t('lang.toggle');
    }
  }

  // ─── Init ───
  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'en' || saved === 'pt') {
      _lang = saved;
    }
    document.documentElement.setAttribute('data-lang', _lang);
    if (typeof dayjs !== 'undefined') {
      dayjs.locale(_lang === 'pt' ? 'pt-br' : 'en');
    }
  }

  return { t, lang, setLang, toggle, init, updateToggleButton };
})();
