/* ═══════════════════════════════════════════
   CANNAPASS — Internationalization (PT/EN)
   Dictionary-based translation for the
   agent portal (international airport use)
   ═══════════════════════════════════════════ */

const I18n = (() => {
  let _lang = 'pt'; // default

  // ─── Translation Dictionary ───
  const DICT = {
    // ── Common ──
    'loading':            { pt: 'Carregando...',          en: 'Loading...' },
    'error':              { pt: 'Erro',                   en: 'Error' },
    'close':              { pt: 'Fechar',                 en: 'Close' },
    'confirm':            { pt: 'Confirmar',              en: 'Confirm' },
    'cancel':             { pt: 'Cancelar',               en: 'Cancel' },
    'save':               { pt: 'Salvar',                 en: 'Save' },
    'back':               { pt: 'Voltar',                 en: 'Back' },
    'search':             { pt: 'Buscar',                 en: 'Search' },
    'no_results':         { pt: 'Nenhum resultado encontrado', en: 'No results found' },

    // ── Roles ──
    'role.patient':       { pt: 'Paciente',               en: 'Patient' },
    'role.agent':         { pt: 'Agente Fiscalizador',    en: 'Enforcement Agent' },
    'role.admin':         { pt: 'Administrador',          en: 'Administrator' },

    // ── Status ──
    'status.valid':       { pt: 'VÁLIDO',                 en: 'VALID' },
    'status.expired':     { pt: 'EXPIRADO',               en: 'EXPIRED' },
    'status.invalid':     { pt: 'INVÁLIDO',               en: 'INVALID' },
    'status.approved':    { pt: 'Aprovado',               en: 'Approved' },
    'status.pending':     { pt: 'Pendente',               en: 'Pending' },
    'status.rejected':    { pt: 'Rejeitado',              en: 'Rejected' },
    'status.draft':       { pt: 'Rascunho',               en: 'Draft' },

    // ── Verification Results ──
    'result.valid.desc':  { pt: 'QR Code válido. Documentação em conformidade.',
                            en: 'Valid QR Code. Documentation compliant.' },
    'result.expired.desc':{ pt: 'QR Code expirado. Solicite atualização ao paciente.',
                            en: 'Expired QR Code. Request update from patient.' },
    'result.invalid.desc':{ pt: 'QR Code não encontrado ou revogado. Siga o procedimento padrão.',
                            en: 'QR Code not found or revoked. Follow standard procedure.' },

    // ── Via ──
    'via.pharmacy':       { pt: 'Farmácia / Associação',  en: 'Pharmacy / Association' },
    'via.hc':             { pt: 'Habeas Corpus',          en: 'Habeas Corpus' },

    // ── Transport ──
    'transport.air':      { pt: 'Aéreo',                  en: 'Air' },
    'transport.road':     { pt: 'Rodoviário',             en: 'Road' },
    'transport.other':    { pt: 'Outro',                  en: 'Other' },

    // ── Scanner Page ──
    'scanner.title':      { pt: 'Scanner QR Code',        en: 'QR Code Scanner' },
    'scanner.desc':       { pt: 'Escaneie o QR Code do paciente para verificação',
                            en: 'Scan the patient\'s QR Code for verification' },
    'scanner.start':      { pt: 'Iniciar Scanner',        en: 'Start Scanner' },
    'scanner.stop':       { pt: 'Parar Scanner',          en: 'Stop Scanner' },
    'scanner.manual':     { pt: 'Verificação Manual',     en: 'Manual Verification' },
    'scanner.manual.hint':{ pt: 'Cole o token do QR Code aqui',
                            en: 'Paste the QR Code token here' },
    'scanner.verify':     { pt: 'Verificar',              en: 'Verify' },
    'scanner.verifying':  { pt: 'Verificando token...',   en: 'Verifying token...' },

    // ── Search Page ──
    'search.title':       { pt: 'Busca Avançada',         en: 'Advanced Search' },
    'search.desc':        { pt: 'Busque cadastros por CPF, nome ou nº de registro',
                            en: 'Search registrations by CPF, name, or registration ID' },
    'search.placeholder': { pt: 'CPF, nome ou nº de registro...',
                            en: 'CPF, name, or registration ID...' },
    'search.hint':        { pt: 'Mínimo 3 caracteres',    en: 'Minimum 3 characters' },
    'search.filter':      { pt: 'Filtrar por status',     en: 'Filter by status' },
    'search.filter.all':  { pt: 'Todos os status',        en: 'All statuses' },
    'search.method':      { pt: 'Método',                 en: 'Method' },
    'search.method.cpf':       { pt: 'CPF exato',         en: 'Exact CPF' },
    'search.method.cpf_partial':{ pt: 'CPF parcial',      en: 'Partial CPF' },
    'search.method.reg_id':    { pt: 'Nº registro exato', en: 'Exact reg. ID' },
    'search.method.reg_partial':{ pt: 'Nº registro parcial', en: 'Partial reg. ID' },
    'search.method.name':      { pt: 'Nome',              en: 'Name' },

    // ── History Page ──
    'history.title':      { pt: 'Histórico de Verificações', en: 'Verification History' },
    'history.desc':       { pt: 'Verificações realizadas por você',
                            en: 'Verifications performed by you' },
    'history.empty':      { pt: 'Nenhuma verificação registrada.',
                            en: 'No verifications recorded.' },

    // ── Guide Page ──
    'guide.title':        { pt: 'Guia de Fiscalização',   en: 'Enforcement Guide' },
    'guide.desc':         { pt: 'Procedimento padrão para verificação',
                            en: 'Standard verification procedure' },
    'guide.step1.title':  { pt: 'Solicitar QR Code',      en: 'Request QR Code' },
    'guide.step1.desc':   { pt: 'Peça ao paciente para apresentar o QR Code do Cannapass no celular ou impresso.',
                            en: 'Ask the patient to present the Cannapass QR Code on their phone or printed.' },
    'guide.step2.title':  { pt: 'Escanear ou Digitar',    en: 'Scan or Enter' },
    'guide.step2.desc':   { pt: 'Use o scanner da câmera ou digite o token manualmente na aba Scanner.',
                            en: 'Use the camera scanner or enter the token manually in the Scanner tab.' },
    'guide.step3.title':  { pt: 'Analisar Resultado',     en: 'Analyze Result' },
    'guide.step3.desc':   { pt: 'O sistema retornará VÁLIDO, EXPIRADO ou INVÁLIDO com os dados do paciente.',
                            en: 'The system will return VALID, EXPIRED, or INVALID with the patient\'s data.' },
    'guide.step4.title':  { pt: 'Conferir Documentos',    en: 'Check Documents' },
    'guide.step4.desc':   { pt: 'Para QR Codes válidos, verifique a foto do documento de identidade e a prescrição médica ou decisão judicial.',
                            en: 'For valid QR Codes, check the photo ID and the medical prescription or court order.' },
    'guide.step5.title':  { pt: 'Liberar ou Reter',       en: 'Release or Detain' },
    'guide.step5.desc':   { pt: 'QR Code válido com documentos conferidos: liberação imediata. Caso contrário, siga o procedimento padrão.',
                            en: 'Valid QR Code with documents verified: immediate release. Otherwise, follow standard procedure.' },
    'guide.legal':        { pt: 'Base Legal',              en: 'Legal Basis' },
    'guide.anvisa':       { pt: 'Resolução ANVISA RDC nº 327/2019 — Autoriza a importação e uso de produtos à base de cannabis para fins medicinais.',
                            en: 'ANVISA Resolution RDC No. 327/2019 — Authorizes the import and use of cannabis-based products for medical purposes.' },
    'guide.lei':          { pt: 'Lei nº 11.343/2006 — Distingue uso medicinal de tráfico. O porte com documentação válida é legal.',
                            en: 'Law No. 11,343/2006 — Distinguishes medical use from trafficking. Possession with valid documentation is legal.' },

    // ── Field Labels ──
    'field.name':         { pt: 'Nome',                    en: 'Name' },
    'field.cpf':          { pt: 'CPF',                     en: 'CPF' },
    'field.status':       { pt: 'Status',                  en: 'Status' },
    'field.registration': { pt: 'Nº Registro',             en: 'Registration ID' },
    'field.via':          { pt: 'Via de Obtenção',          en: 'Acquisition Method' },
    'field.product':      { pt: 'Produto',                  en: 'Product' },
    'field.quantity':     { pt: 'Quantidade',                en: 'Quantity' },
    'field.dosage':       { pt: 'Dosagem',                   en: 'Dosage' },
    'field.legal_ref':    { pt: 'Amparo Legal',              en: 'Legal Reference' },
    'field.origin':       { pt: 'Origem',                    en: 'Origin' },
    'field.destination':  { pt: 'Destino',                   en: 'Destination' },
    'field.departure':    { pt: 'Data da Viagem',            en: 'Travel Date' },
    'field.transport':    { pt: 'Transporte',                en: 'Transport' },
    'field.flight':       { pt: 'Voo / Linha',               en: 'Flight / Line' },
    'field.verified_at':  { pt: 'Verificado em',             en: 'Verified at' },
    'field.result':       { pt: 'Resultado',                 en: 'Result' },
    'field.patient':      { pt: 'Paciente',                  en: 'Patient' },
    'field.date':         { pt: 'Data',                      en: 'Date' },

    // ── Navigation ──
    'nav.scanner':        { pt: 'Scanner',                   en: 'Scanner' },
    'nav.search':         { pt: 'Busca Manual',              en: 'Manual Search' },
    'nav.history':        { pt: 'Histórico',                 en: 'History' },
    'nav.guide':          { pt: 'Guia',                      en: 'Guide' },
    'nav.stats':          { pt: 'Minhas Estatísticas',       en: 'My Statistics' },

    // ── Offline ──
    'offline.banner':     { pt: 'Modo Offline',              en: 'Offline Mode' },
    'offline.cached':     { pt: 'Resultado em cache. Verifique novamente quando houver conexão.',
                            en: 'Cached result. Verify again when connection is available.' },
    'offline.cache_label':{ pt: 'CACHE',                     en: 'CACHED' }
  };

  // ─── Translate ───
  function t(key, fallback) {
    const entry = DICT[key];
    if (!entry) return fallback || key;
    return entry[_lang] || entry.pt || fallback || key;
  }

  // ─── Get Current Language ───
  function lang() {
    return _lang;
  }

  // ─── Set Language ───
  function setLang(newLang) {
    _lang = (newLang === 'en') ? 'en' : 'pt';
    localStorage.setItem('cannapass-lang', _lang);

    // Update dayjs locale
    if (typeof dayjs !== 'undefined') {
      dayjs.locale(_lang === 'pt' ? 'pt-br' : 'en');
    }
  }

  // ─── Toggle Language ───
  function toggle() {
    setLang(_lang === 'pt' ? 'en' : 'pt');

    // Re-render current agent page
    const container = document.getElementById('main-content');
    const page = State.get('currentPage');
    if (container && page && typeof Agent !== 'undefined') {
      container.innerHTML = '';
      container.className = 'main-content animate-in';
      Agent.render(page, container);
    }

    // Update toggle button text
    const btn = document.getElementById('lang-toggle-btn');
    if (btn) btn.textContent = _lang === 'pt' ? 'EN' : 'PT';
  }

  // ─── Initialize ───
  function init() {
    const saved = localStorage.getItem('cannapass-lang');
    if (saved === 'en' || saved === 'pt') _lang = saved;
  }

  return { t, lang, setLang, toggle, init };
})();
