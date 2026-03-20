// cryptoUtils.js — re-exports shared utilities + hash-specific helpers
// showToast and copyToClipboard now live in ui-helpers.js (single source of truth)
export { showToast, copyToClipboard } from './ui-helpers.js';

// Hash-specific: detect algo from hash length
export function detectHashAlgo(hash) {
  const len = hash.trim().length;
  if (hash.trim().startsWith('$2')) return 'BCRYPT';
  if (len === 32)  return 'MD5';
  if (len === 40)  return 'SHA-1';
  if (len === 56)  return 'SHA-224';
  if (len === 64)  return 'SHA-256 or SHA3-256';
  if (len === 96)  return 'SHA-384';
  if (len === 128) return 'SHA-512 or SHA3-512';
  if (len === 8)   return 'CRC32';
  return 'Unknown';
}

// Random string for sample inputs
export function randomString(length = 32) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const arr   = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

// Format bytes
export function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
