// services/hmacGenerator.js
// HMAC generation using Web Crypto API

const ALGO_MAP = {
  'SHA-256': 'SHA-256',
  'SHA-512': 'SHA-512',
  'SHA-384': 'SHA-384',
  'SHA-1': 'SHA-1',
};

/**
 * Generate HMAC signature
 * @param {string} message
 * @param {string} secret
 * @param {string} algo - 'SHA-256' | 'SHA-512' | 'SHA-384' | 'SHA-1'
 * @returns {Promise<string>} hex HMAC
 */
export async function generateHMAC(message, secret, algo = 'SHA-256') {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: ALGO_MAP[algo] || 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const arr = Array.from(new Uint8Array(signature));
  return arr.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate HMAC as base64
 * @param {string} message
 * @param {string} secret
 * @param {string} algo
 * @returns {Promise<string>}
 */
export async function generateHMACBase64(message, secret, algo = 'SHA-256') {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: ALGO_MAP[algo] || 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, enc.encode(message));
  const bytes = new Uint8Array(signature);
  return btoa(String.fromCharCode(...bytes));
}
