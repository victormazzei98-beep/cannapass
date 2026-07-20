/* ═══════════════════════════════════════════
   CANNAPASS — Configuration
   Supabase client, constants, enums
   ═══════════════════════════════════════════ */

// ─── Supabase Client ───
const SUPABASE_URL = 'https://yoeqdwkshqqkvcctvmay.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlvZXFkd2tzaHFxa3ZjY3R2bWF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1MzM0MTUsImV4cCI6MjA5MDEwOTQxNX0.fGUSKerdpbszalc97LWvMnXV-GNJwi2qVegZn2xtaS8';

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ─── Roles ───
const ROLES = Object.freeze({
  PATIENT: 'patient',
  AGENT: 'agent',
  ADMIN: 'admin'
});

// ─── Registration Status ───
const STATUS = Object.freeze({
  DRAFT: 'draft',
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  RENEWAL_PENDING: 'renewal_pending'
});

// ─── Via Type (how patient obtains cannabis) ───
const VIA = Object.freeze({
  PHARMACY: 'pharmacy',
  HABEAS: 'hc'
});

// ─── Document Types ───
const DOC_TYPES = Object.freeze({
  IDENTITY: 'identity',
  PRESCRIPTION: 'prescription',
  JUDICIAL: 'judicial_decision'
});

// ─── QR Code Status ───
const QR_STATUS = Object.freeze({
  ACTIVE: 'active',
  EXPIRED: 'expired',
  REVOKED: 'revoked'
});

// ─── Verification Result ───
const VERIFICATION_RESULT = Object.freeze({
  VALID: 'valid',
  INVALID: 'invalid',
  EXPIRED: 'expired'
});

// ─── Transport Types (must match DB check constraint) ───
const TRANSPORT = Object.freeze({
  AIR: 'air',
  BUS: 'road',
  OTHER: 'other'
});

// ─── File Upload Constraints ───
const UPLOAD = Object.freeze({
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['application/pdf', 'image/jpeg', 'image/png'],
  ALLOWED_EXTENSIONS: ['.pdf', '.jpg', '.jpeg', '.png']
});

// ─── Pagination ───
const PAGINATION = Object.freeze({
  PAGE_SIZE: 20
});

// ─── Brasil API ───
const BRASIL_API_URL = 'https://brasilapi.com.br/api';

// ─── Public Verification URL prefix ───
const PUBLIC_VERIFY_HASH = '#/v/';

// ─── Signed URL expiry for document viewing (seconds) ───
const SIGNED_URL_EXPIRY = 300; // 5 minutes

// ─── Storage Bucket ───
const STORAGE_BUCKET = 'documents';

// ─── Cidades atendidas (origem/destino padronizados) ───
// Fonte única compartilhada pelo portal do Paciente (seleção da viagem) e pelo
// Admin (mapa de verificações). Selecionar em vez de digitar garante que a cidade
// seja sempre reconhecida no geo-mapeamento e nos relatórios.
const BRAZIL_CITIES = Object.freeze({
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
  // Principais polos de transporte
  'campinas':        { lat: -22.910, lng: -47.063, uf: 'SP', name: 'Campinas' },
  'guarulhos':       { lat: -23.454, lng: -46.533, uf: 'SP', name: 'Guarulhos' },
  'ribeirão preto':  { lat: -21.177, lng: -47.810, uf: 'SP', name: 'Ribeirão Preto' },
  'santos':          { lat: -23.961, lng: -46.334, uf: 'SP', name: 'Santos' },
  'sorocaba':        { lat: -23.502, lng: -47.458, uf: 'SP', name: 'Sorocaba' },
  'são josé dos campos': { lat: -23.190, lng: -45.884, uf: 'SP', name: 'São José dos Campos' },
  'londrina':        { lat: -23.310, lng: -51.163, uf: 'PR', name: 'Londrina' },
  'maringá':         { lat: -23.421, lng: -51.933, uf: 'PR', name: 'Maringá' },
  'foz do iguaçu':   { lat: -25.516, lng: -54.585, uf: 'PR', name: 'Foz do Iguaçu' },
  'uberlândia':      { lat: -18.919, lng: -48.277, uf: 'MG', name: 'Uberlândia' },
  'juiz de fora':    { lat: -21.764, lng: -43.350, uf: 'MG', name: 'Juiz de Fora' },
  'joinville':       { lat: -26.304, lng: -48.846, uf: 'SC', name: 'Joinville' },
  'niterói':         { lat: -22.884, lng: -43.104, uf: 'RJ', name: 'Niterói' },
  'feira de santana': { lat: -12.267, lng: -38.967, uf: 'BA', name: 'Feira de Santana' },
  'caruaru':         { lat: -8.284,  lng: -35.976, uf: 'PE', name: 'Caruaru' }
});

const UF_NAMES = Object.freeze({
  'AC': 'Acre', 'AL': 'Alagoas', 'AM': 'Amazonas', 'AP': 'Amapá',
  'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 'ES': 'Espírito Santo',
  'GO': 'Goiás', 'MA': 'Maranhão', 'MG': 'Minas Gerais', 'MS': 'Mato Grosso do Sul',
  'MT': 'Mato Grosso', 'PA': 'Pará', 'PB': 'Paraíba', 'PE': 'Pernambuco',
  'PI': 'Piauí', 'PR': 'Paraná', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RO': 'Rondônia', 'RR': 'Roraima', 'RS': 'Rio Grande do Sul', 'SC': 'Santa Catarina',
  'SE': 'Sergipe', 'SP': 'São Paulo', 'TO': 'Tocantins'
});

// ─── Produtos e quantidades padronizadas ───
// A quantidade depende do produto: o paciente escolhe o produto e o campo de
// quantidade passa a oferecer só as medidas que fazem sentido para ele.
const PRODUCT_OPTIONS = Object.freeze(['Flor', 'Óleo', 'Concentrado', 'Outro']);

const QUANTITY_OPTIONS = Object.freeze({
  'Flor':        ['5 g', '10 g', '15 g', '20 g', '30 g', '50 g', '100 g'],
  'Óleo':        ['1 frasco (30ml)', '2 frascos (60ml)', '3 frascos (90ml)', '4 frascos (120ml)', '5 frascos (150ml)', '6 ou mais frascos'],
  'Concentrado': ['1 g', '2 g', '5 g', '10 g', '20 g'],
  'Outro':       ['1 unidade', '2 unidades', '3 unidades', '4 unidades', '5 ou mais unidades']
});
