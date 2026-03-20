// services/encoder.js
// Base64, Base64URL, Base32, Hex encoding and decoding

// ---- Base64 ----
export function encodeBase64(str) {
  return btoa(unescape(encodeURIComponent(str)));
}

export function decodeBase64(str) {
  try {
    return decodeURIComponent(escape(atob(str)));
  } catch {
    throw new Error('Invalid Base64 string');
  }
}

// ---- Base64URL ----
export function encodeBase64URL(str) {
  return encodeBase64(str)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function decodeBase64URL(str) {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) base64 += '=';
  return decodeBase64(base64);
}

// ---- Hex ----
export function encodeHex(str) {
  return Array.from(new TextEncoder().encode(str))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

export function decodeHex(hex) {
  const clean = hex.replace(/\s/g, '');
  if (clean.length % 2 !== 0) throw new Error('Invalid hex string (odd length)');
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return new TextDecoder().decode(bytes);
}

// ---- Base32 ----
const BASE32_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(str) {
  const bytes = new TextEncoder().encode(str);
  let bits = 0;
  let value = 0;
  let output = '';

  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      output += BASE32_CHARS[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }

  if (bits > 0) {
    output += BASE32_CHARS[(value << (5 - bits)) & 31];
  }

  while (output.length % 8 !== 0) output += '=';
  return output;
}

export function decodeBase32(str) {
  const clean = str.toUpperCase().replace(/=+$/, '');
  let bits = 0;
  let value = 0;
  const bytes = [];

  for (const char of clean) {
    const idx = BASE32_CHARS.indexOf(char);
    if (idx === -1) throw new Error(`Invalid Base32 character: ${char}`);
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }

  return new TextDecoder().decode(new Uint8Array(bytes));
}

/**
 * Generic encode/decode router
 * @param {string} input
 * @param {'encode'|'decode'} direction
 * @param {'base64'|'base64url'|'base32'|'hex'} format
 * @returns {string}
 */
export function transform(input, direction, format) {
  if (direction === 'encode') {
    switch (format) {
      case 'base64':    return encodeBase64(input);
      case 'base64url': return encodeBase64URL(input);
      case 'base32':    return encodeBase32(input);
      case 'hex':       return encodeHex(input);
    }
  } else {
    switch (format) {
      case 'base64':    return decodeBase64(input);
      case 'base64url': return decodeBase64URL(input);
      case 'base32':    return decodeBase32(input);
      case 'hex':       return decodeHex(input);
    }
  }
  throw new Error('Unknown format');
}
