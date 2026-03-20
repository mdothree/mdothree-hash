// services/uuidGenerator.js
// UUID v1, v4, v5 generation

// ---- UUID v4 (random) ----
export function uuidV4() {
  if (crypto.randomUUID) return crypto.randomUUID();
  // Polyfill for older browsers
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// ---- UUID v1 (time-based, simulated) ----
let lastTime = 0;
let clockSeq = Math.floor(Math.random() * 0x3FFF);

export function uuidV1() {
  let now = Date.now();
  if (now <= lastTime) clockSeq = (clockSeq + 1) & 0x3FFF;
  lastTime = now;

  // Convert to 100-nanosecond intervals since Oct 15, 1582
  const epoch = now * 10000 + 122192928000000000n;
  // We'll approximate with BigInt if available, else fallback
  const timeHex = (BigInt(now) * 10000n + 122192928000000000n).toString(16).padStart(16, '0');

  const timeLow = timeHex.slice(-8);
  const timeMid = timeHex.slice(-12, -8);
  const timeHiVer = '1' + timeHex.slice(-15, -12);
  const clockSeqHiRes = ((clockSeq >>> 8) | 0x80).toString(16).padStart(2, '0');
  const clockSeqLow = (clockSeq & 0xFF).toString(16).padStart(2, '0');
  const nodeBytes = crypto.getRandomValues(new Uint8Array(6));
  const node = Array.from(nodeBytes).map(b => b.toString(16).padStart(2, '0')).join('');

  return `${timeLow}-${timeMid}-${timeHiVer}-${clockSeqHiRes}${clockSeqLow}-${node}`;
}

// ---- UUID v5 (name-based, SHA-1) ----
const DNS_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
const URL_NAMESPACE = '6ba7b811-9dad-11d1-80b4-00c04fd430c8';

function parseUUIDToBytes(uuid) {
  const hex = uuid.replace(/-/g, '');
  const bytes = new Uint8Array(16);
  for (let i = 0; i < 16; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToUUID(bytes) {
  const hex = Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32),
  ].join('-');
}

export async function uuidV5(name, namespace = DNS_NAMESPACE) {
  const nsBytes = parseUUIDToBytes(namespace);
  const nameBytes = new TextEncoder().encode(name);
  const combined = new Uint8Array(nsBytes.length + nameBytes.length);
  combined.set(nsBytes);
  combined.set(nameBytes, nsBytes.length);

  const hashBuffer = await crypto.subtle.digest('SHA-1', combined);
  const hashBytes = new Uint8Array(hashBuffer).slice(0, 16);

  // Set version (5) and variant bits
  hashBytes[6] = (hashBytes[6] & 0x0F) | 0x50;
  hashBytes[8] = (hashBytes[8] & 0x3F) | 0x80;

  return bytesToUUID(hashBytes);
}

/**
 * Generate N UUIDs of a given version
 * @param {'v1'|'v4'|'v5'} version
 * @param {number} count
 * @param {string} [name] - required for v5
 * @param {string} [namespace] - for v5
 * @returns {Promise<string[]>}
 */
export async function generateUUIDs(version, count = 1, name = '', namespace = DNS_NAMESPACE) {
  const results = [];
  for (let i = 0; i < count; i++) {
    if (version === 'v4') results.push(uuidV4());
    else if (version === 'v1') results.push(uuidV1());
    else if (version === 'v5') results.push(await uuidV5(name, namespace));
  }
  return results;
}

export { DNS_NAMESPACE, URL_NAMESPACE };
