// services/hashGenerator.js
// Generates cryptographic hashes using Web Crypto API + CryptoJS

/**
 * Map algo names to Web Crypto API names
 */
const WEB_CRYPTO_ALGOS = {
  SHA256: 'SHA-256',
  SHA512: 'SHA-512',
  SHA384: 'SHA-384',
  SHA1: 'SHA-1',
};

/**
 * Generate hash via Web Crypto API (SHA family)
 * @param {string} text
 * @param {string} algo - e.g. 'SHA-256'
 * @returns {Promise<string>} hex string
 */
export async function webCryptoHash(text, algo) {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algo, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generate CRC32 hash
 * @param {string} str
 * @returns {string} hex string
 */
export function crc32(str) {
  const table = makeCRC32Table();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
}

function makeCRC32Table() {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c;
  }
  return table;
}

/**
 * Main hash generation function
 * Supports: SHA256, SHA512, SHA384, SHA1, SHA3, MD5, CRC32, BCRYPT
 * @param {string} text
 * @param {string} algo
 * @param {number} [saltRounds=10] - for bcrypt
 * @returns {Promise<string>}
 */
export async function generateHash(text, algo, saltRounds = 10) {
  if (!text) return '';

  switch (algo) {
    case 'SHA256':
    case 'SHA512':
    case 'SHA384':
    case 'SHA1':
      return webCryptoHash(text, WEB_CRYPTO_ALGOS[algo]);

    case 'SHA3':
      // CryptoJS SHA3 (default 512-bit)
      return CryptoJS.SHA3(text, { outputLength: 256 }).toString(CryptoJS.enc.Hex);

    case 'MD5':
      return CryptoJS.MD5(text).toString(CryptoJS.enc.Hex);

    case 'CRC32':
      return crc32(text);

    case 'BCRYPT':
      return new Promise((resolve, reject) => {
        try {
          const salt = dcodeIO.bcrypt.genSaltSync(saltRounds);
          const hash = dcodeIO.bcrypt.hashSync(text, salt);
          resolve(hash);
        } catch (e) {
          // fallback: use bcryptjs global if available
          reject(new Error('bcrypt library not loaded'));
        }
      });

    default:
      throw new Error(`Unsupported algorithm: ${algo}`);
  }
}

/**
 * Generate all available hashes for a given input
 * @param {string} text
 * @returns {Promise<Object>} { SHA256, SHA512, ... }
 */
export async function generateAllHashes(text) {
  if (!text) return {};

  const algos = ['SHA256', 'SHA512', 'SHA384', 'SHA1', 'SHA3', 'MD5', 'CRC32'];
  const results = {};

  await Promise.all(
    algos.map(async algo => {
      try {
        results[algo] = await generateHash(text, algo);
      } catch (e) {
        results[algo] = 'Error: ' + e.message;
      }
    })
  );

  return results;
}
