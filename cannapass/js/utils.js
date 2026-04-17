/* ═══════════════════════════════════════════
   CANNAPASS — Utilities
   Toasts, modals, masks, validation, formatting,
   sanitization, token generation, theme toggle
   ═══════════════════════════════════════════ */

// ─── Toast Notifications ───
const Toast = (() => {
  function show(message, type = 'info', duration = 4000) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toastIcons = {
      success: Icons.success,
      error: Icons.error,
      warning: Icons.warning,
      info: Icons.info
    };

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
      <span class="toast-icon">${toastIcons[type] || toastIcons.info}</span>
      <span class="toast-msg">${sanitizeHTML(message)}</span>
      <button class="toast-close" aria-label="Fechar">${Icons.x}</button>
    `;

    toast.querySelector('.toast-close').addEventListener('click', () => dismiss(toast));
    container.appendChild(toast);

    // Auto-dismiss
    const timer = setTimeout(() => dismiss(toast), duration);
    toast._timer = timer;
  }

  function dismiss(toast) {
    if (toast._timer) clearTimeout(toast._timer);
    toast.classList.add('removing');
    toast.addEventListener('animationend', () => toast.remove());
  }

  return {
    success: (msg, dur) => show(msg, 'success', dur),
    error: (msg, dur) => show(msg, 'error', dur ?? 6000),
    warning: (msg, dur) => show(msg, 'warning', dur),
    info: (msg, dur) => show(msg, 'info', dur)
  };
})();

// ─── Modal ───
const Modal = (() => {
  let _resolvePromise = null;

  function open({ title, body, confirmText = 'Confirmar', cancelText = 'Cancelar', danger = false }) {
    const overlay = document.getElementById('modal-overlay');
    const modalTitle = document.getElementById('modal-title');
    const modalBody = document.getElementById('modal-body');
    const confirmBtn = document.getElementById('modal-confirm');
    const cancelBtn = document.getElementById('modal-cancel');

    if (!overlay) return Promise.resolve(false);

    modalTitle.textContent = title;
    modalBody.innerHTML = sanitizeHTML(body);
    confirmBtn.textContent = confirmText;
    cancelBtn.textContent = cancelText;

    confirmBtn.className = danger ? 'btn btn-danger' : 'btn btn-primary';

    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';

    return new Promise(resolve => {
      _resolvePromise = resolve;

      const cleanup = () => {
        overlay.classList.remove('active');
        document.body.style.overflow = '';
        confirmBtn.removeEventListener('click', onConfirm);
        cancelBtn.removeEventListener('click', onCancel);
        overlay.removeEventListener('click', onOverlay);
        document.removeEventListener('keydown', onEscape);
      };

      const onConfirm = () => { cleanup(); resolve(true); };
      const onCancel = () => { cleanup(); resolve(false); };
      const onOverlay = (e) => { if (e.target === overlay) { cleanup(); resolve(false); } };
      const onEscape = (e) => { if (e.key === 'Escape') { cleanup(); resolve(false); } };

      confirmBtn.addEventListener('click', onConfirm);
      cancelBtn.addEventListener('click', onCancel);
      overlay.addEventListener('click', onOverlay);
      document.addEventListener('keydown', onEscape);
    });
  }

  return { open };
})();

// ─── CPF Mask (xxx.xxx.xxx-xx) ───
function maskCPF(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

// ─── Phone Mask (xx) xxxxx-xxxx ───
function maskPhone(value) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) return digits;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// ─── CPF Algorithmic Validation ───
function validateCPFAlgorithm(cpf) {
  const digits = cpf.replace(/\D/g, '');
  if (digits.length !== 11) return false;

  // Reject known invalid patterns (all same digit)
  if (/^(\d)\1{10}$/.test(digits)) return false;

  // First check digit
  let sum = 0;
  for (let i = 0; i < 9; i++) sum += parseInt(digits[i]) * (10 - i);
  let remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[9])) return false;

  // Second check digit
  sum = 0;
  for (let i = 0; i < 10; i++) sum += parseInt(digits[i]) * (11 - i);
  remainder = (sum * 10) % 11;
  if (remainder === 10) remainder = 0;
  if (remainder !== parseInt(digits[10])) return false;

  return true;
}

// ─── CPF Validation via Brasil API (with algorithmic fallback) ───
async function validateCPF(cpf) {
  const digits = cpf.replace(/\D/g, '');

  // First: algorithmic check
  if (!validateCPFAlgorithm(digits)) {
    return { valid: false, source: 'algorithm' };
  }

  // Second: Brasil API check
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(`${BRASIL_API_URL}/cpf/v1/${digits}`, {
      signal: controller.signal
    });
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      return { valid: true, name: data.nome, source: 'brasil_api' };
    }

    if (response.status === 404) {
      return { valid: false, source: 'brasil_api' };
    }

    // API error — fallback to algorithmic result
    return { valid: true, source: 'algorithm_fallback' };
  } catch {
    // Network error or timeout — fallback
    return { valid: true, source: 'algorithm_fallback' };
  }
}

// ─── Email Validation ───
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// ─── Date Formatting (using day.js) ───
function formatDate(dateStr, format = 'DD/MM/YYYY') {
  if (!dateStr) return '—';
  return dayjs(dateStr).format(format);
}

function formatDateTime(dateStr) {
  if (!dateStr) return '—';
  return dayjs(dateStr).format('DD/MM/YYYY [às] HH:mm');
}

function formatRelative(dateStr) {
  if (!dateStr) return '—';
  const date = dayjs(dateStr);
  const now = dayjs();
  const diffDays = now.diff(date, 'day');

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return `${diffDays} dias atrás`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} sem. atrás`;
  return formatDate(dateStr);
}

// ─── Check if date is in the future ───
function isFutureDate(dateStr) {
  return dayjs(dateStr).isAfter(dayjs(), 'day');
}

// ─── Check if date is expired ───
function isExpired(dateStr) {
  if (!dateStr) return false;
  return dayjs(dateStr).isBefore(dayjs(), 'day');
}

// ─── Check if date expires within N days ───
function isExpiringSoon(dateStr, daysThreshold = 30) {
  if (!dateStr) return false;
  const expiryDate = dayjs(dateStr);
  const now = dayjs();
  return expiryDate.isAfter(now) && expiryDate.diff(now, 'day') <= daysThreshold;
}

// ─── HTML Sanitization ───
function sanitizeHTML(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

// ─── Cryptographic Token Generation ───
function generateToken(length = 32) {
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, b => b.toString(16).padStart(2, '0')).join('');
}

// ─── File Validation ───
function validateFile(file) {
  if (!file) return { valid: false, error: 'Nenhum arquivo selecionado' };

  if (file.size > UPLOAD.MAX_SIZE) {
    const sizeMB = (UPLOAD.MAX_SIZE / (1024 * 1024)).toFixed(0);
    return { valid: false, error: `Arquivo excede o limite de ${sizeMB}MB` };
  }

  if (!UPLOAD.ALLOWED_TYPES.includes(file.type)) {
    return { valid: false, error: 'Tipo de arquivo não permitido. Use PDF, JPG ou PNG.' };
  }

  return { valid: true };
}

// ─── Magic Bytes Check (basic anti-fraud) ───
async function checkMagicBytes(file) {
  const buffer = await file.slice(0, 4).arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // PDF: %PDF
  if (bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46) {
    return file.type === 'application/pdf';
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return file.type === 'image/jpeg';
  }
  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return file.type === 'image/png';
  }

  return false;
}

// ─── Theme Toggle ───
const Theme = (() => {
  const STORAGE_KEY = 'cannapass-theme';

  function init() {
    const saved = localStorage.getItem(STORAGE_KEY);
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = saved || (prefersDark ? 'dark' : 'light');
    apply(theme);

    // Listen for OS theme changes
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        apply(e.matches ? 'dark' : 'light');
      }
    });
  }

  function apply(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    State.set('theme', theme);
    updateToggleIcon(theme);
  }

  function toggle() {
    const current = State.get('theme');
    const next = current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(STORAGE_KEY, next);
    apply(next);
  }

  function updateToggleIcon(theme) {
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.innerHTML = theme === 'dark' ? Icons.sun : Icons.moon;
    const btnAuth = document.getElementById('theme-toggle-auth');
    if (btnAuth) btnAuth.innerHTML = theme === 'dark' ? Icons.sun : Icons.moon;
  }

  return { init, toggle };
})();

// ─── Loading Screen ───
function showLoading() {
  const el = document.getElementById('loading-screen');
  if (el) el.classList.remove('hidden');
}

function hideLoading() {
  const el = document.getElementById('loading-screen');
  if (el) el.classList.add('hidden');
}

// ─── Show/Hide Auth vs App ───
function showAuth() {
  document.getElementById('auth-container')?.classList.remove('hidden');
  document.getElementById('app-container')?.classList.add('hidden');
  document.getElementById('portal-select-container')?.classList.add('hidden');
}

function showApp() {
  document.getElementById('auth-container')?.classList.add('hidden');
  document.getElementById('portal-select-container')?.classList.add('hidden');
  document.getElementById('app-container')?.classList.remove('hidden');
}

// ─── Debounce ───
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

// ─── Format File Size ───
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

// ─── Get Initials ───
function getInitials(name) {
  if (!name) return '?';
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('');
}

// ─── Status Label (PT-BR) ───
function getStatusLabel(status) {
  const labels = {
    [STATUS.DRAFT]: 'Rascunho',
    [STATUS.PENDING]: 'Pendente',
    [STATUS.APPROVED]: 'Aprovado',
    [STATUS.REJECTED]: 'Rejeitado',
    [STATUS.RENEWAL_PENDING]: 'Renovacao Pendente'
  };
  return labels[status] || status;
}

// ─── Status Badge Type ───
function getStatusBadgeType(status) {
  const types = {
    [STATUS.DRAFT]: 'neutral',
    [STATUS.PENDING]: 'warning',
    [STATUS.APPROVED]: 'success',
    [STATUS.REJECTED]: 'danger',
    [STATUS.RENEWAL_PENDING]: 'info'
  };
  return types[status] || 'neutral';
}

// ─── Via Label ───
function getViaLabel(via) {
  const labels = {
    [VIA.PHARMACY]: 'Farmácia / Associação',
    [VIA.HABEAS]: 'Habeas Corpus'
  };
  return labels[via] || via;
}

// ─── Transport Label ───
function getTransportLabel(type) {
  const labels = {
    [TRANSPORT.AIR]: 'Aéreo',
    [TRANSPORT.BUS]: 'Rodoviário',
    [TRANSPORT.OTHER]: 'Outro'
  };
  return labels[type] || type;
}

// ─── Role Label ───
function getRoleLabel(role) {
  const labels = {
    [ROLES.PATIENT]: 'Paciente',
    [ROLES.AGENT]: 'Agente Fiscalizador',
    [ROLES.ADMIN]: 'Administrador'
  };
  return labels[role] || role;
}

// ─── Button Loading State ───
function setButtonLoading(btn, loading, text) {
  if (!btn) return;
  if (loading) {
    btn._origHTML = btn.innerHTML;
    btn.innerHTML = `<span class="btn-text">${text || btn.textContent}</span>`;
    btn.classList.add('loading');
    btn.disabled = true;
  } else {
    btn.classList.remove('loading');
    btn.disabled = false;
    if (btn._origHTML) btn.innerHTML = btn._origHTML;
    delete btn._origHTML;
  }
}

// ─── Inline Form Validation ───
function validateFieldInline(input, validatorFn, errorMsg) {
  if (!input) return;
  const handler = () => {
    const val = input.value.trim();
    const group = input.closest('.form-group');
    if (!val) {
      input.classList.remove('input-valid', 'input-invalid');
      if (group) group.querySelector('.inline-error')?.remove();
      return;
    }
    const isValid = validatorFn(val);
    input.classList.toggle('input-valid', isValid);
    input.classList.toggle('input-invalid', !isValid);
    // Show/remove inline error
    let errEl = group?.querySelector('.inline-error');
    if (!isValid && errorMsg) {
      if (!errEl && group) {
        errEl = document.createElement('span');
        errEl.className = 'inline-error form-hint text-red';
        group.appendChild(errEl);
      }
      if (errEl) errEl.textContent = errorMsg;
    } else if (errEl) {
      errEl.remove();
    }
  };
  input.addEventListener('blur', handler);
  return handler;
}

// ─── Lazy Script Loader ───
const LazyLoad = (() => {
  const _loaded = new Set();
  const _loading = {};

  function script(url) {
    if (_loaded.has(url)) return Promise.resolve();
    if (_loading[url]) return _loading[url];

    _loading[url] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url;
      s.onload = () => { _loaded.add(url); delete _loading[url]; resolve(); };
      s.onerror = () => { delete _loading[url]; reject(new Error(`Failed to load: ${url}`)); };
      document.head.appendChild(s);
    });
    return _loading[url];
  }

  async function chartJS() {
    if (typeof Chart !== 'undefined') return;
    await script('https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js');
  }

  async function leaflet() {
    if (typeof L !== 'undefined') return;
    await script('https://cdn.jsdelivr.net/npm/leaflet@1.9.4/dist/leaflet.js');
  }

  async function jsPDF() {
    if (typeof window.jspdf !== 'undefined') return;
    await script('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js');
    await script('https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js');
  }

  async function qrScanner() {
    if (typeof Html5Qrcode !== 'undefined') return;
    await script('https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js');
  }

  return { script, chartJS, leaflet, jsPDF, qrScanner };
})();

// ─── Global Error Boundary ───
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise]', event.reason);
  Toast.error('Ocorreu um erro inesperado. Tente novamente.');
});

window.addEventListener('error', (event) => {
  console.error('[Global Error]', event.error);
  // Show fallback UI only for critical render errors
  const main = document.getElementById('main-content');
  if (main && !main.innerHTML.trim()) {
    main.innerHTML = `
      <div style="padding:40px;text-align:center;">
        <div style="font-size:48px;margin-bottom:16px;">&#9888;</div>
        <h3>Algo deu errado</h3>
        <p style="color:var(--muted);margin:12px 0;">Ocorreu um erro ao carregar esta página.</p>
        <button class="btn btn-primary" onclick="window.location.reload()">Recarregar</button>
      </div>
    `;
  }
});

// ─── API Retry Helper ───
async function fetchWithRetry(fn, retries = 2, delay = 1000) {
  for (let i = 0; i <= retries; i++) {
    try {
      const result = await fn();
      return result;
    } catch (err) {
      if (i === retries) throw err;
      await new Promise(r => setTimeout(r, delay * (i + 1)));
    }
  }
}

// ─── Offline Detection ───
window.addEventListener('offline', () => {
  Toast.warning('Você está offline. Algumas funcionalidades podem não funcionar.');
});
window.addEventListener('online', () => {
  Toast.success('Conexão restaurada.');
});
