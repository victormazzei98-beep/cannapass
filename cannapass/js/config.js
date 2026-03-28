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
  REJECTED: 'rejected'
});

// ─── Via Type (how patient obtains cannabis) ───
const VIA = Object.freeze({
  PHARMACY: 'farmacia_associacao',
  HABEAS: 'habeas_corpus'
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

// ─── Transport Types ───
const TRANSPORT = Object.freeze({
  AIR: 'aereo',
  BUS: 'rodoviario',
  OTHER: 'outro'
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
