//
// PUBLIC_INTERFACE
// Centralized environment variable parsing with safe defaults, type coercion, and feature flags.
// Reads only REACT_* vars as allowed by CRA. Provides normalized URLs and flags.
//
// Usage:
//   import env from '../utils/env';
//   const { API_BASE, WS_URL, FEATURE_FLAGS, EXPERIMENTS_ENABLED } = env();
//
function coerceBool(v, fallback = false) {
  if (typeof v === 'boolean') return v;
  const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
  if (['1', 'true', 'yes', 'on'].includes(s)) return true;
  if (['0', 'false', 'no', 'off', ''].includes(s)) return false;
  return !!fallback;
}

function coerceInt(v, fallback = 0) {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : fallback;
}

function normalizeUrl(v) {
  if (typeof v !== 'string') return '';
  const s = v.trim();
  if (!s) return '';
  // Allow ws://, wss://, http(s)://
  // Don't force slash to allow joining via `${base}/path`
  return s.replace(/\/+$/, '');
}

function parseFeatureFlags(raw) {
  // Accept JSON or CSV
  if (!raw || typeof raw !== 'string') return {};
  const s = raw.trim();
  if (!s) return {};
  try {
    const obj = JSON.parse(s);
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      return Object.fromEntries(
        Object.entries(obj).map(([k, v]) => [String(k), coerceBool(v, !!v)])
      );
    }
  } catch {
    // Fallback CSV: "flag1,flag2" => { flag1:true, flag2:true }
    const flags = {};
    s.split(',').map((x) => x.trim()).filter(Boolean).forEach((k) => {
      flags[k] = true;
    });
    return flags;
  }
  return {};
}

// PUBLIC_INTERFACE
export default function env() {
  /**
   * Returns normalized environment values and feature flags.
   */
  const {
    REACT_APP_API_BASE,
    REACT_APP_BACKEND_URL,
    REACT_APP_FRONTEND_URL,
    REACT_APP_WS_URL,
    REACT_APP_NODE_ENV,
    REACT_APP_NEXT_TELEMETRY_DISABLED,
    REACT_APP_ENABLE_SOURCE_MAPS,
    REACT_APP_PORT,
    REACT_APP_TRUST_PROXY,
    REACT_APP_LOG_LEVEL,
    REACT_APP_HEALTHCHECK_PATH,
    REACT_APP_FEATURE_FLAGS,
    REACT_APP_EXPERIMENTS_ENABLED,
    REACT_APP_OLLAMA_BASE_URL,
    REACT_APP_OLLAMA_MODEL
  } = process.env;

  // Base URLs
  const API_BASE = normalizeUrl(REACT_APP_API_BASE || REACT_APP_BACKEND_URL || '');
  const FRONTEND_URL = normalizeUrl(REACT_APP_FRONTEND_URL || '');
  const WS_URL = normalizeUrl(REACT_APP_WS_URL || '');

  // Misc config with defaults
  const NODE_ENV = (REACT_APP_NODE_ENV || process.env.NODE_ENV || 'development').toLowerCase();
  const NEXT_TELEMETRY_DISABLED = coerceBool(REACT_APP_NEXT_TELEMETRY_DISABLED, true);
  const ENABLE_SOURCE_MAPS = coerceBool(REACT_APP_ENABLE_SOURCE_MAPS, true);
  const PORT = coerceInt(REACT_APP_PORT, 3000);
  const TRUST_PROXY = coerceBool(REACT_APP_TRUST_PROXY, false);
  const LOG_LEVEL = (REACT_APP_LOG_LEVEL || 'info').toLowerCase();
  const HEALTHCHECK_PATH = (REACT_APP_HEALTHCHECK_PATH || '/healthz').trim() || '/healthz';

  // Features
  const FEATURE_FLAGS = parseFeatureFlags(REACT_APP_FEATURE_FLAGS || '');
  const EXPERIMENTS_ENABLED = coerceBool(REACT_APP_EXPERIMENTS_ENABLED, false);

  // Provider defaults (for seeding settings)
  const OLLAMA_BASE_URL = normalizeUrl(REACT_APP_OLLAMA_BASE_URL || 'http://localhost:11434');
  const OLLAMA_MODEL = (REACT_APP_OLLAMA_MODEL || 'llama3').trim() || 'llama3';

  return {
    API_BASE,
    FRONTEND_URL,
    WS_URL,
    NODE_ENV,
    NEXT_TELEMETRY_DISABLED,
    ENABLE_SOURCE_MAPS,
    PORT,
    TRUST_PROXY,
    LOG_LEVEL,
    HEALTHCHECK_PATH,
    FEATURE_FLAGS,
    EXPERIMENTS_ENABLED,
    OLLAMA_BASE_URL,
    OLLAMA_MODEL,
  };
}
