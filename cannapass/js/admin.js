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
  let transportMap = null;

  // ─── Brazil Cities Coordinates (state capitals + major transport hubs) ───
  const BRAZIL_CITIES = {
    'rio branco':      { lat: -9.975,  lng: -67.810, uf: 'AC', name: 'Rio Branco' },
    'maceió':          { lat: -9.666,  lng: -35.735, uf: 'AL', name: 'Maceió' },
    'macapá':          { lat:  0.035,  lng: -51.066, uf: 'AP', name: 'Macapá' },
    'manaus':          { lat: -3.119,  lng: -60.022, uf: 'AM', name: 'Manaus' },
    'salvador':        { lat: -12.971, lng: -38.512, uf: 'BA', name: 'Salvador' },
    'fortaleza':       { lat: -3.717,  lng: -38.543, uf: 'CE', name: 'Fortaleza' },
    'brasília':        { lat: -15.798, lng: -47.892, uf: 'DF', name: 'Brasília' },
    'vitória':         { lat: -20.315, lng: -40.313, uf: 'ES', name: 'Vitória' },
    'goiânia':         { lat: -16.687, lng: -49.265, uf: 'GO', name: 'Goiânia' },
    'são luís':        { lat: -2.530,  lng: -44.283, uf: 'MA', name: 'São Luís' },
    'cuiabá':          { lat: -15.601, lng: -56.098, uf: 'MT', name: 'Cuiabá' },
    'campo grande':    { lat: -20.470, lng: -54.620, uf: 'MS', name: 'Campo Grande' },
    'belo horizonte':  { lat: -19.917, lng: -43.935, uf: 'MG', name: 'Belo Horizonte' },
    'belém':           { lat: -1.456,  lng: -48.502, uf: 'PA', name: 'Belém' },
    'joão pessoa':     { lat: -7.120,  lng: -34.845, uf: 'PB', name: 'João Pessoa' },
    'curitiba':        { lat: -25.428, lng: -49.273, uf: 'PR', name: 'Curitiba' },
    'recife':          { lat: -8.048,  lng: -34.877, uf: 'PE', name: 'Recife' },
    'teresina':        { lat: -5.089,  lng: -42.802, uf: 'PI', name: 'Teresina' },
    'rio de janeiro':  { lat: -22.907, lng: -43.173, uf: 'RJ', name: 'Rio de Janeiro' },
    'natal':           { lat: -5.795,  lng: -35.211, uf: 'RN', name: 'Natal' },
    'porto alegre':    { lat: -30.035, lng: -51.218, uf: 'RS', name: 'Porto Alegre' },
    'porto velho':     { lat: -8.761,  lng: -63.900, uf: 'RO', name: 'Porto Velho' },
    'boa vista':       { lat:  2.820,  lng: -60.671, uf: 'RR', name: 'Boa Vista' },
    'florianópolis':   { lat: -27.595, lng: -48.548, uf: 'SC', name: 'Florianópolis' },
    'são paulo':       { lat: -23.551, lng: -46.633, uf: 'SP', name: 'São Paulo' },
    'aracaju':         { lat: -10.909, lng: -37.068, uf: 'SE', name: 'Aracaju' },
    'palmas':          { lat: -10.169, lng: -48.332, uf: 'TO', name: 'Palmas' },
    // Major transport hubs
    'campinas':        { lat: -22.910, lng: -47.063, uf: 'SP', name: 'Campinas' },
    'guarulhos':       { lat: -23.454, lng: -46.533, uf: 'SP', name: 'Guarulhos' },
    'ribeirão preto':  { lat: -21.177, lng: -47.810, uf: 'SP', name: 'Ribeirão Preto' },
    'santos':          { lat: -23.961, lng: -46.334, uf: 'SP', name: 'Santos' },
    'sorocaba':        { lat: -23.502, lng: -47.458, uf: 'SP', name: 'Sorocaba' },
    'londrina':        { lat: -23.310, lng: -51.163, uf: 'PR', name: 'Londrina' },
    'uberlândia':      { lat: -18.919, lng: -48.277, uf: 'MG', name: 'Uberlândia' },
    'juiz de fora':    { lat: -21.764, lng: -43.350, uf: 'MG', name: 'Juiz de Fora' },
    'joinville':       { lat: -26.304, lng: -48.846, uf: 'SC', name: 'Joinville' },
    'niterói':         { lat: -22.884, lng: -43.104, uf: 'RJ', name: 'Niterói' },
    'foz do iguaçu':   { lat: -25.516, lng: -54.585, uf: 'PR', name: 'Foz do Iguaçu' },
    'maringá':         { lat: -23.421, lng: -51.933, uf: 'PR', name: 'Maringá' },
    'goiania':         { lat: -16.687, lng: -49.265, uf: 'GO', name: 'Goiânia' },
    'são josé dos campos': { lat: -23.190, lng: -45.884, uf: 'SP', name: 'São José dos Campos' },
    'feira de santana': { lat: -12.267, lng: -38.967, uf: 'BA', name: 'Feira de Santana' },
    'caruaru':         { lat: -8.284,  lng: -35.976, uf: 'PE', name: 'Caruaru' },
  };

  const UF_NAMES = {
    'AC': 'Acre', 'AL': 'Alagoas', 'AM': 'Amazonas', 'AP': 'Amapá',
    'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
    'GO': 'Goiás', 'MA': 'Maranhão', 'MG': 'Minas Gerais', 'MS': 'Mato Grosso do Sul',
    'MT': 'Mato Grosso', 'PA': 'Pará', 'PB': 'Paraíba', 'PE': 'Pernambuco',
    'PI': 'Piauí', 'PR': 'Paraná', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
    'RO': 'Rondônia', 'RR': 'Roraima', 'RS': 'Rio Grande do Sul', 'SC': 'Santa Catarina',
    'SE': 'Sergipe', 'SP': 'São Paulo', 'TO': 'Tocantins'
  };

  const STATE_NAME_TO_UF = {
    'acre': 'AC', 'alagoas': 'AL', 'amazonas': 'AM', 'amapá': 'AP', 'amapa': 'AP',
    'bahia': 'BA', 'ceará': 'CE', 'ceara': 'CE', 'distrito federal': 'DF',
    'espírito santo': 'ES', 'espirito santo': 'ES', 'goiás': 'GO', 'goias': 'GO',
    'maranhão': 'MA', 'maranhao': 'MA', 'minas gerais': 'MG',
    'mato grosso do sul': 'MS', 'mato grosso': 'MT',
    'pará': 'PA', 'para': 'PA', 'paraíba': 'PB', 'paraiba': 'PB',
    'pernambuco': 'PE', 'piauí': 'PI', 'piaui': 'PI',
    'paraná': 'PR', 'parana': 'PR', 'rio de janeiro': 'RJ',
    'rio grande do norte': 'RN', 'rio grande do sul': 'RS',
    'rondônia': 'RO', 'rondonia': 'RO', 'roraima': 'RR',
    'santa catarina': 'SC', 'são paulo': 'SP', 'sao paulo': 'SP',
    'sergipe': 'SE', 'tocantins': 'TO'
  };

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

      <div class="card" style="margin-top: 1.5rem;">
        <div class="card-header">
          <div>
            <h3 class="card-title">Mapa de Transportes — Brasil</h3>
            <p class="text-sm text-muted" style="margin-top:2px;">Principais pontos e rotas de transporte de cannabis medicinal</p>
          </div>
        </div>
        <div class="card-body" style="padding: 0;">
          <div class="transport-map-grid">
            <div id="transport-map"></div>
            <div id="transport-stats" class="transport-stats-panel">
              <div class="flex-center" style="padding: 2rem;"><div class="spinner"></div></div>
            </div>
          </div>
        </div>
      </div>
    `;

    loadAdminStats();
    loadCharts();
    loadTransportMap();
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
      const [approvedRes, pendingRes, rejectedRes, expiredRes, renewalRes] = await Promise.all([
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'approved'),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'rejected'),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'expired'),
        sb.from('patients').select('id', { count: 'exact', head: true }).eq('status', 'renewal_pending')
      ]);

      const statusCanvas = document.getElementById('chart-status');
      if (statusCanvas) {
        chartStatus = new Chart(statusCanvas, {
          type: 'doughnut',
          data: {
            labels: ['Aprovado', 'Pendente', 'Rejeitado', 'Expirado', 'Renovacao'],
            datasets: [{
              data: [
                approvedRes.count ?? 0,
                pendingRes.count ?? 0,
                rejectedRes.count ?? 0,
                expiredRes.count ?? 0,
                renewalRes.count ?? 0
              ],
              backgroundColor: ['#22c55e', '#eab308', '#ef4444', '#6b7280', '#3b82f6'],
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
  //  TRANSPORT MAP — Brazil Routes
  // ═══════════════════════════════════════════

  function normalizeText(text) {
    return (text || '').toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  function matchCity(text) {
    if (!text) return null;
    const normalized = normalizeText(text);

    // Exact match (with accents removed)
    for (const [key, data] of Object.entries(BRAZIL_CITIES)) {
      if (normalizeText(key) === normalized) return data;
    }

    // Partial match — input contains city name or vice versa
    for (const [key, data] of Object.entries(BRAZIL_CITIES)) {
      const nk = normalizeText(key);
      if (normalized.includes(nk) || nk.includes(normalized)) return data;
    }

    // Match by UF code (e.g. "SP", "RJ") → return state capital
    if (normalized.length === 2) {
      const uf = normalized.toUpperCase();
      if (UF_NAMES[uf]) {
        for (const [, data] of Object.entries(BRAZIL_CITIES)) {
          if (data.uf === uf) return data;
        }
      }
    }

    return null;
  }

  function processRouteData(travelData) {
    const cityActivity = {};
    const stateActivity = {};
    const routeMap = {};
    const transportTypes = {};

    for (const trip of travelData) {
      const originCoords = matchCity(trip.origin);
      const destCoords = matchCity(trip.destination);

      // Count transport types
      const tType = trip.transport_type || 'outro';
      transportTypes[tType] = (transportTypes[tType] || 0) + 1;

      if (originCoords) {
        const key = normalizeText(originCoords.name);
        if (!cityActivity[key]) cityActivity[key] = { ...originCoords, count: 0 };
        cityActivity[key].count++;
        stateActivity[originCoords.uf] = (stateActivity[originCoords.uf] || 0) + 1;
      }

      if (destCoords) {
        const key = normalizeText(destCoords.name);
        if (!cityActivity[key]) cityActivity[key] = { ...destCoords, count: 0 };
        cityActivity[key].count++;
        stateActivity[destCoords.uf] = (stateActivity[destCoords.uf] || 0) + 1;
      }

      if (originCoords && destCoords) {
        const routeKey = `${originCoords.name}→${destCoords.name}`;
        routeMap[routeKey] = (routeMap[routeKey] || { from: originCoords, to: destCoords, count: 0 });
        routeMap[routeKey].count++;
      }
    }

    const routes = Object.entries(routeMap)
      .map(([key, val]) => ({ ...val, label: key }))
      .sort((a, b) => b.count - a.count);

    return {
      cities: Object.values(cityActivity),
      states: stateActivity,
      routes,
      transportTypes,
      totalTrips: travelData.length
    };
  }

  async function loadTransportMap() {
    const mapContainer = document.getElementById('transport-map');
    const statsContainer = document.getElementById('transport-stats');
    if (!mapContainer) return;

    // Check if Leaflet is loaded
    if (typeof L === 'undefined') {
      mapContainer.innerHTML = '<div class="map-empty-state"><p class="text-muted">Biblioteca de mapa indisponível.</p></div>';
      if (statsContainer) statsContainer.innerHTML = '';
      return;
    }

    try {
      // 1. Load travel data from Supabase
      const { data: travelData, error } = await sb.from('travel_data')
        .select('origin, destination, transport_type, departure_date')
        .order('created_at', { ascending: false });

      if (error) throw error;

      // 2. Process route data
      const routeData = processRouteData(travelData || []);

      // 3. Fetch Brazil GeoJSON (state borders)
      let geojson = null;
      try {
        const resp = await fetch('https://raw.githubusercontent.com/codeforamerica/click_that_hood/master/public/data/brazil-states.geojson');
        if (resp.ok) geojson = await resp.json();
      } catch (e) {
        console.warn('[Admin] GeoJSON fetch failed, map will render without state borders:', e);
      }

      // 4. Initialize map
      initBrazilMap(mapContainer, geojson, routeData);

      // 5. Render stats panel
      renderMapStats(statsContainer, routeData);

    } catch (err) {
      console.error('[Admin] Transport map error:', err);
      mapContainer.innerHTML = '<div class="map-empty-state"><p class="text-muted">Erro ao carregar mapa de transportes.</p></div>';
    }
  }

  function initBrazilMap(container, geojson, routeData) {
    // Destroy previous map instance
    if (transportMap) {
      transportMap.remove();
      transportMap = null;
    }

    // Create map centered on Brazil
    transportMap = L.map(container, {
      center: [-14.5, -53.0],
      zoom: 4,
      zoomControl: true,
      attributionControl: false,
      scrollWheelZoom: false,
      dragging: true,
      maxBounds: [[-36, -76], [7, -28]],
      minZoom: 3,
      maxZoom: 8
    });

    // Detect theme for color adaptation
    const isDark = document.documentElement.dataset.theme !== 'light';

    const colors = {
      stateDefault:  isDark ? '#1a2820' : '#d8f0e0',
      stateBorder:   isDark ? '#264030' : '#a8c8b4',
      stateActive1:  isDark ? '#0d6640' : '#b0dcc0',
      stateActive2:  isDark ? '#1a9d5a' : '#60c890',
      stateActive3:  isDark ? '#3dd68c' : '#1a9d5a',
      markerColor:   '#3dd68c',
      routeColor:    '#f0c060',
      routeGlow:     isDark ? 'rgba(240,192,96,0.3)' : 'rgba(240,192,96,0.5)',
    };

    // Add GeoJSON state layer
    if (geojson) {
      const stateValues = Object.values(routeData.states);
      const maxCount = stateValues.length ? Math.max(...stateValues) : 1;

      const getStateStyle = (feature) => {
        const name = (feature.properties?.name || '').toLowerCase();
        const uf = STATE_NAME_TO_UF[name] || STATE_NAME_TO_UF[normalizeText(name)] || '';
        const count = routeData.states[uf] || 0;
        const intensity = maxCount > 0 ? count / maxCount : 0;

        let fillColor = colors.stateDefault;
        let fillOpacity = isDark ? 0.5 : 0.6;

        if (count > 0) {
          fillColor = intensity > 0.6 ? colors.stateActive3
            : intensity > 0.3 ? colors.stateActive2
            : colors.stateActive1;
          fillOpacity = 0.55 + intensity * 0.25;
        }

        return { fillColor, weight: 1, opacity: 0.7, color: colors.stateBorder, fillOpacity };
      };

      const geojsonLayer = L.geoJSON(geojson, {
        style: getStateStyle,
        onEachFeature: (feature, layer) => {
          const name = feature.properties?.name || '';
          const uf = STATE_NAME_TO_UF[name.toLowerCase()] || STATE_NAME_TO_UF[normalizeText(name)] || '';
          const count = routeData.states[uf] || 0;
          layer.bindTooltip(
            count ? `<strong>${name} (${uf})</strong><br>${count} transporte(s)` : `<strong>${name}</strong>`,
            { sticky: true, className: 'map-tooltip' }
          );
          layer.on('mouseover', function () { this.setStyle({ weight: 2, fillOpacity: 0.8 }); });
          layer.on('mouseout', function () { geojsonLayer.resetStyle(this); });
        }
      }).addTo(transportMap);
    }

    // Add route lines (dashed, animated)
    for (const route of routeData.routes) {
      const from = [route.from.lat, route.from.lng];
      const to = [route.to.lat, route.to.lng];

      // Curved midpoint for visual appeal
      const midLat = (from[0] + to[0]) / 2;
      const midLng = (from[1] + to[1]) / 2;
      const dx = to[1] - from[1];
      const dy = to[0] - from[0];
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offset = dist * 0.12;
      const curvePoint = [midLat + (dx / (dist || 1)) * offset, midLng - (dy / (dist || 1)) * offset];

      // Glow line (wider, transparent)
      L.polyline([from, curvePoint, to], {
        color: colors.routeGlow,
        weight: 6,
        opacity: 0.4,
        smoothFactor: 1.5,
        interactive: false
      }).addTo(transportMap);

      // Main route line
      const line = L.polyline([from, curvePoint, to], {
        color: colors.routeColor,
        weight: 2.5,
        opacity: 0.85,
        dashArray: '10 6',
        smoothFactor: 1.5,
        className: 'route-line-animated'
      }).bindTooltip(
        `<strong>${route.label}</strong><br>${route.count} viagem(ns)`,
        { sticky: true, className: 'map-tooltip' }
      ).addTo(transportMap);
    }

    // Add city markers
    const sortedCities = [...routeData.cities].sort((a, b) => a.count - b.count);
    for (const city of sortedCities) {
      const radius = Math.min(6 + city.count * 3, 16);

      // Outer glow
      L.circleMarker([city.lat, city.lng], {
        radius: radius + 4,
        fillColor: colors.markerColor,
        color: 'transparent',
        fillOpacity: 0.2,
        interactive: false
      }).addTo(transportMap);

      // Main marker
      L.circleMarker([city.lat, city.lng], {
        radius,
        fillColor: colors.markerColor,
        color: isDark ? '#ffffff' : '#ffffff',
        weight: 2,
        opacity: 0.9,
        fillOpacity: 0.85
      }).bindTooltip(
        `<strong>${city.name} (${city.uf})</strong><br>${city.count} transporte(s)`,
        { className: 'map-tooltip' }
      ).addTo(transportMap);
    }
  }

  function renderMapStats(container, routeData) {
    if (!container) return;

    const { cities, routes, transportTypes, totalTrips, states } = routeData;

    if (totalTrips === 0) {
      container.innerHTML = `
        <div class="map-empty-state">
          <div style="font-size: 2.5rem; margin-bottom: 0.5rem; opacity: 0.5;">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="var(--muted)" stroke-width="1.5"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>
          </div>
          <h4>Nenhuma rota registrada</h4>
          <p class="text-muted text-sm">As rotas aparecerão aqui quando pacientes registrarem suas viagens.</p>
        </div>
      `;
      return;
    }

    const topStates = Object.entries(states)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const topCities = [...cities].sort((a, b) => b.count - a.count).slice(0, 5);

    const transportLabels = {
      'aereo': 'Aéreo', 'rodoviario': 'Rodoviário',
      'outro': 'Outro', 'Aéreo': 'Aéreo', 'Rodoviário': 'Rodoviário'
    };

    container.innerHTML = `
      <div class="map-stat-section">
        <h4 class="map-stat-title">Resumo de Transportes</h4>
        <div class="map-stat-value">${totalTrips}</div>
        <span class="text-sm text-muted">viagem(ns) registrada(s)</span>
      </div>

      ${topStates.length ? `
        <div class="map-stat-section">
          <h4 class="map-stat-title">Estados Mais Ativos</h4>
          ${topStates.map(([uf, count]) => `
            <div class="map-stat-row">
              <span class="map-stat-label">${sanitizeHTML(UF_NAMES[uf] || uf)}</span>
              <span class="badge badge-success">${count}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${topCities.length ? `
        <div class="map-stat-section">
          <h4 class="map-stat-title">Principais Cidades</h4>
          ${topCities.map(c => `
            <div class="map-stat-row">
              <span class="map-stat-label">${sanitizeHTML(c.name)} <span class="text-muted">(${c.uf})</span></span>
              <span class="badge badge-success">${c.count}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${routes.length ? `
        <div class="map-stat-section">
          <h4 class="map-stat-title">Principais Rotas</h4>
          ${routes.slice(0, 5).map(r => `
            <div class="map-stat-row">
              <span class="map-stat-label text-sm">${sanitizeHTML(r.label)}</span>
              <span class="badge badge-neutral">${r.count}x</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      ${Object.keys(transportTypes).length ? `
        <div class="map-stat-section">
          <h4 class="map-stat-title">Tipo de Transporte</h4>
          ${Object.entries(transportTypes).map(([type, count]) => `
            <div class="map-stat-row">
              <span class="map-stat-label">${sanitizeHTML(transportLabels[type] || type)}</span>
              <span class="badge badge-neutral">${count}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}
    `;
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
              <option value="renewal_pending">Renovacao Pendente</option>
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
                  <div style="display:flex;gap:6px;align-items:center;">
                    <button class="btn btn-sm btn-secondary cadastro-view-btn" data-id="${p.id}">Ver</button>
                    <button class="btn btn-sm btn-danger cadastro-delete-btn"
                      data-id="${p.id}" data-user-id="${p.user_id}" data-name="${sanitizeHTML(p.full_name || '')}"
                      title="Excluir cadastro">
                      ${Icons.x}
                    </button>
                  </div>
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

      // Bind delete buttons
      content.querySelectorAll('.cadastro-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteCadastro(btn.dataset.id, btn.dataset.userId, btn.dataset.name, btn));
      });

      updatePagination('cadastros-pagination', count || 0);

    } catch (err) {
      console.error('[Admin] Cadastros error:', err);
      content.innerHTML = '<p class="text-muted text-center">Erro ao carregar cadastros.</p>';
    }
  }

  async function deleteCadastro(patientId, userId, patientName, btnEl) {
    const confirmed = await Modal.open({
      title: 'Excluir Cadastro',
      body: `Tem certeza que deseja excluir o cadastro de "${patientName}"? Todos os documentos, QR Codes e dados de viagem vinculados serao removidos. Esta acao e irreversivel.`,
      confirmText: 'Excluir Cadastro',
      cancelText: 'Cancelar',
      danger: true
    });

    if (!confirmed) return;

    btnEl.disabled = true;
    btnEl.innerHTML = '<div class="spinner spinner-sm"></div>';

    try {
      // 1. Delete travel_data for this patient
      await sb.from('travel_data').delete().eq('patient_id', patientId);

      // 2. Get QR codes to delete verifications
      const { data: qrCodes } = await sb.from('qr_codes').select('id').eq('patient_id', patientId);
      if (qrCodes?.length) {
        const qrIds = qrCodes.map(q => q.id);
        for (const qrId of qrIds) {
          await sb.from('verifications').delete().eq('qr_code_id', qrId);
        }
      }

      // 3. Delete QR codes
      await sb.from('qr_codes').delete().eq('patient_id', patientId);

      // 4. Delete documents (also remove files from storage)
      const { data: docs } = await sb.from('documents').select('file_path').eq('patient_id', patientId);
      if (docs?.length) {
        const paths = docs.map(d => d.file_path).filter(Boolean);
        if (paths.length) {
          await sb.storage.from(STORAGE_BUCKET).remove(paths);
        }
      }
      await sb.from('documents').delete().eq('patient_id', patientId);

      // 5. Delete the patient record
      const { error } = await sb.from('patients').delete().eq('id', patientId);
      if (error) throw error;

      Toast.success(`Cadastro de "${patientName}" excluido com sucesso!`);
      loadCadastros();

      // Clear detail area if open
      const detailArea = document.getElementById('cadastro-detail-area');
      if (detailArea) detailArea.innerHTML = '';

    } catch (err) {
      console.error('[Admin] Delete cadastro error:', err);
      Toast.error(`Erro ao excluir cadastro: ${err.message || 'Tente novamente.'}`);
      btnEl.disabled = false;
      btnEl.innerHTML = Icons.x;
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
                <div class="detail-item"><label>Habeas Corpus Nº</label><span>${sanitizeHTML(p.hc_number || '—')}</span></div>
                <div class="detail-item"><label>Salvo Conduto Nº</label><span>${sanitizeHTML(p.salvo_conduto || '—')}</span></div>
                <div class="detail-item"><label>Vara / Tribunal</label><span>${sanitizeHTML(p.court || '—')}</span></div>
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

            <!-- Renewal Diff (if renewal_pending) -->
            ${p.status === 'renewal_pending' ? `
              <div class="divider"></div>
              <h4 class="mb-sm" style="color:var(--blue);">Alteracoes da Renovacao</h4>
              <div id="renewal-diff-area">
                <div class="flex-center"><div class="spinner spinner-sm"></div></div>
              </div>
              ${p.renewal_count > 0 ? `<p class="text-sm text-muted mt-xs">Renovacao #${(p.renewal_count || 0) + 1}</p>` : ''}
            ` : ''}

            <!-- Actions -->
            ${p.status === 'pending' || p.status === 'renewal_pending' ? `
              <div class="divider"></div>
              <div class="detail-actions">
                <button class="btn btn-success" id="approve-btn" data-id="${p.id}">
                  ${p.status === 'renewal_pending' ? 'Aprovar Renovacao' : 'Aprovar Cadastro'}
                </button>
                <button class="btn btn-danger" id="reject-btn" data-id="${p.id}">
                  ${p.status === 'renewal_pending' ? 'Rejeitar Renovacao' : 'Rejeitar Cadastro'}
                </button>
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

      // Load renewal diff if applicable
      if (p.status === 'renewal_pending') {
        loadRenewalDiff(p.id);
      }

      // Scroll to detail
      area.scrollIntoView({ behavior: 'smooth', block: 'start' });

    } catch (err) {
      console.error('[Admin] Detail error:', err);
      area.innerHTML = '<div class="card mt-md"><div class="card-body"><p class="text-muted">Erro ao carregar detalhes.</p></div></div>';
    }
  }

  // ─── Renewal Diff View ───
  async function loadRenewalDiff(patientId) {
    const diffArea = document.getElementById('renewal-diff-area');
    if (!diffArea) return;

    try {
      const { data: renewal, error } = await sb.from('renewals')
        .select('*')
        .eq('patient_id', patientId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error || !renewal) {
        diffArea.innerHTML = '<p class="text-muted">Dados de renovacao nao encontrados.</p>';
        return;
      }

      const fieldLabels = {
        full_name: 'Nome',
        email: 'Email',
        phone: 'Telefone',
        doctor_name: 'Medico',
        doctor_crm: 'CRM',
        prescription_validity: 'Validade Prescricao',
        hc_number: 'HC Numero',
        salvo_conduto: 'Salvo Conduto',
        court: 'Vara/Tribunal'
      };

      const old = renewal.old_data || {};
      const nw = renewal.new_data || {};
      let changedCount = 0;

      let html = '<div class="detail-grid">';
      for (const [key, label] of Object.entries(fieldLabels)) {
        const oldVal = old[key] || null;
        const newVal = nw[key] || null;
        if (!oldVal && !newVal) continue;

        const changed = oldVal !== newVal;
        if (changed) changedCount++;

        const isDate = key.includes('validity');
        const displayOld = isDate ? formatDate(oldVal) : sanitizeHTML(oldVal || '—');
        const displayNew = isDate ? formatDate(newVal) : sanitizeHTML(newVal || '—');

        html += `
          <div class="detail-item" style="${changed ? 'border-left:3px solid var(--blue);padding-left:8px;' : ''}">
            <label>${label}</label>
            ${changed ? `
              <span><del style="color:var(--red);opacity:0.7;">${displayOld}</del> &rarr; <strong style="color:var(--green);">${displayNew}</strong></span>
            ` : `
              <span>${displayNew}</span>
            `}
          </div>
        `;
      }
      html += '</div>';

      if (changedCount === 0) {
        html = '<p class="text-muted">Nenhuma alteracao detectada nos dados.</p>';
      } else {
        html = `<p class="text-sm mb-sm" style="color:var(--blue);"><strong>${changedCount} campo(s) alterado(s)</strong></p>` + html;
      }

      diffArea.innerHTML = html;
    } catch (err) {
      console.error('[Admin] Renewal diff error:', err);
      diffArea.innerHTML = '<p class="text-muted">Erro ao carregar dados de renovacao.</p>';
    }
  }

  // ─── Send email notification via Edge Function ───
  async function sendNotification(type, patientEmail, patientName, extra = {}) {
    try {
      const { data, error } = await sb.functions.invoke('send-notification', {
        body: {
          type,
          patient_email: patientEmail,
          patient_name: patientName,
          ...extra
        }
      });
      if (error) console.warn('[Admin] Notification send warning:', error);
      else console.log('[Admin] Notification sent:', data);
    } catch (err) {
      console.warn('[Admin] Notification error (non-blocking):', err);
    }
  }

  async function approvePatient(patientId) {
    // Fetch patient to detect renewal
    const { data: patient } = await sb.from('patients').select('full_name, email, status, renewal_count').eq('id', patientId).single();
    const isRenewal = patient?.status === 'renewal_pending';

    const confirmed = await Modal.open({
      title: isRenewal ? 'Aprovar Renovacao' : 'Aprovar Cadastro',
      body: isRenewal
        ? 'Confirma a aprovacao desta renovacao? Os dados atualizados serao efetivados.'
        : 'Confirma a aprovacao deste cadastro? O paciente podera gerar QR Codes.',
      confirmText: 'Aprovar',
      cancelText: 'Cancelar'
    });

    if (!confirmed) return;

    try {
      const adminId = State.get('user')?.id;
      const updateData = {
        status: 'approved',
        validated_at: new Date().toISOString(),
        validated_by: adminId
      };

      if (isRenewal) {
        updateData.renewal_approved_at = new Date().toISOString();
        updateData.renewal_approved_by = adminId;
        updateData.renewal_count = (patient.renewal_count || 0) + 1;

        // Mark renewal audit record as approved (non-blocking)
        sb.from('renewals')
          .update({ status: 'approved', reviewed_by: adminId, reviewed_at: new Date().toISOString() })
          .eq('patient_id', patientId)
          .eq('status', 'pending')
          .then(() => {})
          .catch(err => console.warn('[Admin] Renewal audit update:', err));
      }

      const { error } = await sb.from('patients').update(updateData).eq('id', patientId);
      if (error) throw error;

      Toast.success(isRenewal ? 'Renovacao aprovada com sucesso!' : 'Cadastro aprovado com sucesso!');
      document.getElementById('cadastro-detail-area').innerHTML = '';
      loadCadastros();

      // Send email notification (non-blocking)
      if (patient?.email) {
        sendNotification(isRenewal ? 'renewal_approved' : 'approved', patient.email, patient.full_name);
      }
    } catch (err) {
      console.error('[Admin] Approve error:', err);
      Toast.error(isRenewal ? 'Erro ao aprovar renovacao.' : 'Erro ao aprovar cadastro.');
    }
  }

  async function rejectPatient(patientId) {
    const area = document.getElementById('cadastro-detail-area');

    // Fetch patient to detect renewal
    const { data: patient } = await sb.from('patients').select('full_name, email, status').eq('id', patientId).single();
    const isRenewal = patient?.status === 'renewal_pending';

    const confirmed = await Modal.open({
      title: isRenewal ? 'Rejeitar Renovacao' : 'Rejeitar Cadastro',
      body: `
        <p>Informe o motivo da rejeicao:</p>
        <textarea id="rejection-reason-input" class="form-input" rows="4"
          placeholder="Descreva o motivo da rejeicao..." style="margin-top:8px;width:100%;resize:vertical;"></textarea>
        ${isRenewal ? '<p class="text-sm text-muted mt-sm">O cadastro do paciente voltara ao status <strong>Aprovado</strong> com os dados anteriores.</p>' : ''}
      `,
      confirmText: 'Rejeitar',
      cancelText: 'Cancelar',
      danger: true
    });

    if (!confirmed) return;

    const reason = document.getElementById('rejection-reason-input')?.value?.trim();
    if (!reason) {
      Toast.warning('O motivo da rejeicao e obrigatorio.');
      return;
    }

    try {
      const adminId = State.get('user')?.id;

      if (isRenewal) {
        // For renewal rejection: restore to approved + revert data from snapshot
        const { data: renewal } = await sb.from('renewals')
          .select('old_data')
          .eq('patient_id', patientId)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Build restore data — revert to old values
        const restoreData = {
          status: 'approved',
          validated_at: new Date().toISOString(),
          validated_by: adminId,
          rejection_reason: reason,
          renewal_requested_at: null
        };

        // Restore old field values from snapshot
        if (renewal?.old_data) {
          const old = renewal.old_data;
          if (old.doctor_name !== undefined) restoreData.doctor_name = old.doctor_name;
          if (old.doctor_crm !== undefined) restoreData.doctor_crm = old.doctor_crm;
          if (old.prescription_validity !== undefined) restoreData.prescription_validity = old.prescription_validity;
          if (old.hc_number !== undefined) restoreData.hc_number = old.hc_number;
          if (old.salvo_conduto !== undefined) restoreData.salvo_conduto = old.salvo_conduto;
          if (old.court !== undefined) restoreData.court = old.court;
        }

        const { error } = await sb.from('patients').update(restoreData).eq('id', patientId);
        if (error) throw error;

        // Mark renewal audit record as rejected (non-blocking)
        sb.from('renewals')
          .update({ status: 'rejected', rejection_reason: reason, reviewed_by: adminId, reviewed_at: new Date().toISOString() })
          .eq('patient_id', patientId)
          .eq('status', 'pending')
          .then(() => {})
          .catch(err => console.warn('[Admin] Renewal audit reject:', err));

        Toast.success('Renovacao rejeitada. Cadastro restaurado ao status anterior.');
      } else {
        // Normal rejection
        const { error } = await sb.from('patients').update({
          status: 'rejected',
          validated_at: new Date().toISOString(),
          validated_by: adminId,
          rejection_reason: reason
        }).eq('id', patientId);

        if (error) throw error;
        Toast.success('Cadastro rejeitado.');
      }

      if (area) area.innerHTML = '';
      loadCadastros();

      // Send email notification (non-blocking)
      if (patient?.email) {
        sendNotification(
          isRenewal ? 'renewal_rejected' : 'rejected',
          patient.email,
          patient.full_name,
          { rejection_reason: reason }
        );
      }
    } catch (err) {
      console.error('[Admin] Reject error:', err);
      Toast.error(isRenewal ? 'Erro ao rejeitar renovacao.' : 'Erro ao rejeitar cadastro.');
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
                    <div style="display:flex;gap:6px;align-items:center;">
                      <button class="btn btn-sm ${qr.is_active ? 'btn-danger' : 'btn-success'} qr-toggle-btn"
                        data-id="${qr.id}" data-active="${qr.is_active}">
                        ${qr.is_active ? 'Desativar' : 'Ativar'}
                      </button>
                      <button class="btn btn-sm btn-danger qr-delete-btn"
                        data-id="${qr.id}" data-name="${sanitizeHTML(qr.patient_name || '')}"
                        title="Excluir QR Code">
                        ${Icons.x}
                      </button>
                    </div>
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

      // Bind delete buttons
      content.querySelectorAll('.qr-delete-btn').forEach(btn => {
        btn.addEventListener('click', () => deleteQR(btn.dataset.id, btn.dataset.name, btn));
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

  async function deleteQR(qrId, patientName, btnEl) {
    const confirmed = await Modal.open({
      title: 'Excluir QR Code',
      body: `Tem certeza que deseja excluir permanentemente o QR Code de "${patientName}"? Os dados de viagem vinculados e verificacoes tambem serao removidos. Esta acao e irreversivel.`,
      confirmText: 'Excluir Permanentemente',
      cancelText: 'Cancelar',
      danger: true
    });

    if (!confirmed) return;

    btnEl.disabled = true;
    btnEl.innerHTML = '<div class="spinner spinner-sm"></div>';

    try {
      // 1. Delete travel_data linked to this QR
      await sb.from('travel_data').delete().eq('qr_code_id', qrId);

      // 2. Delete verifications linked to this QR
      await sb.from('verifications').delete().eq('qr_code_id', qrId);

      // 3. Delete the QR code itself
      const { error } = await sb.from('qr_codes').delete().eq('id', qrId);
      if (error) throw error;

      Toast.success('QR Code excluido com sucesso!');
      loadQRCodes();
    } catch (err) {
      console.error('[Admin] Delete QR error:', err);
      Toast.error(`Erro ao excluir QR Code: ${err.message || 'Tente novamente.'}`);
      btnEl.disabled = false;
      btnEl.innerHTML = Icons.x;
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

      const currentUserId = State.get('user')?.id;

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
              <th>Ações</th>
            </tr>
          </thead>
          <tbody>
            ${data.map(u => `
              <tr data-row-id="${u.id}">
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
                <td>
                  ${u.id !== currentUserId ? `
                    <button class="btn btn-danger btn-sm delete-user-btn" data-user-id="${u.id}" data-user-name="${sanitizeHTML(u.full_name || u.email || '')}">
                      ${Icons.x} Excluir
                    </button>
                  ` : '<span class="text-muted text-xs">Você</span>'}
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

      // Bind delete user buttons
      content.querySelectorAll('.delete-user-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
          const userId = btn.dataset.userId;
          const userName = btn.dataset.userName;

          const confirmed = await Modal.open({
            title: 'Excluir Usuário',
            body: `Tem certeza que deseja excluir o usuário "${userName}" e todos os seus dados (cadastros, documentos, QR Codes, viagens)? Esta ação é irreversível.`,
            confirmText: 'Excluir Permanentemente',
            cancelText: 'Cancelar',
            danger: true
          });

          if (!confirmed) return;

          // Disable button and show loading
          btn.disabled = true;
          btn.innerHTML = '<div class="spinner spinner-sm"></div> Excluindo...';

          try {
            const { data, error } = await sb.rpc('delete_user_cascade', {
              target_user_id: userId
            });

            if (error) throw error;

            Toast.success(`Usuário "${userName}" excluído com sucesso!`);

            // Remove row with animation
            const row = content.querySelector(`tr[data-row-id="${userId}"]`);
            if (row) {
              row.style.transition = 'opacity 0.3s, transform 0.3s';
              row.style.opacity = '0';
              row.style.transform = 'translateX(20px)';
              setTimeout(() => {
                row.remove();
                // Check if table is now empty
                const tbody = content.querySelector('tbody');
                if (tbody && !tbody.children.length) {
                  loadUsuarios();
                }
              }, 300);
            } else {
              loadUsuarios();
            }
          } catch (err) {
            console.error('[Admin] Delete user error:', err);
            Toast.error(`Erro ao excluir usuário: ${err.message || 'Tente novamente.'}`);
            btn.disabled = false;
            btn.innerHTML = `${Icons.x} Excluir`;
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
