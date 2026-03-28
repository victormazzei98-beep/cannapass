/* ═══════════════════════════════════════════
   CANNAPASS — Agent Portal
   Scanner, verification, search, guide
   ═══════════════════════════════════════════ */

const Agent = (() => {
  function render(page, container) {
    switch (page) {
      case 'scanner': renderScanner(container); break;
      case 'busca': renderBusca(container); break;
      case 'historico-agent': renderHistorico(container); break;
      case 'guia': renderGuia(container); break;
      default: renderScanner(container);
    }
  }

  // ─── Scanner ───
  function renderScanner(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Scanner QR Code</h2>
        <p>Escaneie o QR Code do paciente para verificação</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">📷</div>
            <h4>Em construção</h4>
            <p>O scanner com câmera será implementado na Fase 3.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Busca Manual ───
  function renderBusca(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Busca Manual</h2>
        <p>Busque por CPF, código de registro ou nome</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">🔍</div>
            <h4>Em construção</h4>
            <p>A busca manual será implementada na Fase 3.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Histórico ───
  function renderHistorico(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Histórico de Verificações</h2>
        <p>Verificações realizadas por você</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="empty-state">
            <div class="empty-state-icon">🕐</div>
            <h4>Nenhuma verificação</h4>
            <p>Seu histórico aparecerá aqui após sua primeira verificação.</p>
          </div>
        </div>
      </div>
    `;
  }

  // ─── Guia ───
  function renderGuia(container) {
    container.innerHTML = `
      <div class="page-header">
        <h2>Guia de Fiscalização</h2>
        <p>Procedimento passo a passo para verificação de transporte</p>
      </div>
      <div class="card">
        <div class="card-body">
          <div class="guide-steps">
            <div class="guide-step">
              <div class="guide-step-number">1</div>
              <div>
                <h4>Solicitar QR Code</h4>
                <p>Peça ao passageiro para apresentar o QR Code do Cannapass no celular ou impresso.</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="guide-step-number">2</div>
              <div>
                <h4>Escanear QR Code</h4>
                <p>Use o scanner do aplicativo para ler o QR Code. A câmera traseira será ativada automaticamente.</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="guide-step-number">3</div>
              <div>
                <h4>Verificar Resultado</h4>
                <p>O sistema mostrará se o QR Code é válido, expirado ou inválido. Confira os dados exibidos.</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="guide-step-number">4</div>
              <div>
                <h4>Conferir Documentos</h4>
                <p>Para QR Codes válidos, verifique a foto do documento de identidade e a prescrição médica ou decisão judicial.</p>
              </div>
            </div>
            <div class="guide-step">
              <div class="guide-step-number">5</div>
              <div>
                <h4>Liberar ou Reter</h4>
                <p>QR Code válido com documentos conferidos: liberação imediata. Caso contrário, siga o procedimento padrão.</p>
              </div>
            </div>
          </div>

          <div class="divider"></div>

          <div>
            <h4 class="mb-sm">Base Legal</h4>
            <p class="text-sm text-muted">
              Resolução ANVISA RDC nº 327/2019 — Autoriza a importação e uso de produtos à base de cannabis para fins medicinais.
            </p>
            <p class="text-sm text-muted mt-sm">
              Lei nº 11.343/2006 — Distingue uso medicinal de tráfico. O porte com documentação válida é legal.
            </p>
          </div>
        </div>
      </div>
    `;
  }

  return { render };
})();
