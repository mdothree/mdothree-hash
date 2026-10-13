// services/hashChecker.js
// Verify file or text hashes by comparing against a known hash

import { generateHash, webCryptoHash, crc32Bytes } from './hashGenerator.js';

/**
 * Verify a string against a known hash
 * @param {string} text
 * @param {string} knownHash
 * @param {string} algo
 * @param {number} [saltRounds]
 * @returns {Promise<{match: boolean, computed: string}>}
 */
export async function verifyTextHash(text, knownHash, algo, saltRounds = 10) {
  if (algo === 'BCRYPT') {
    // bcrypt uses async compare
    return new Promise((resolve, reject) => {
      try {
        const match = dcodeIO.bcrypt.compareSync(text, knownHash);
        resolve({ match, computed: knownHash });
      } catch (e) {
        reject(new Error('bcrypt verification failed'));
      }
    });
  }

  const computed = await generateHash(text, algo, saltRounds);
  const match = computed.toLowerCase() === knownHash.toLowerCase().trim();
  return { match, computed };
}

/**
 * Hash a File object using Web Crypto API
 * @param {File} file
 * @param {string} algo - 'SHA-256' | 'SHA-512' | 'SHA-384' | 'SHA-1' | 'MD5' | 'CRC32'
 * @returns {Promise<string>} hex hash
 */
export async function hashFile(file, algo = 'SHA-256') {
  const buffer = await file.arrayBuffer();
  if (algo === 'MD5') return CryptoJS.MD5(CryptoJS.lib.WordArray.create(new Uint8Array(buffer))).toString(CryptoJS.enc.Hex);
  if (algo === 'CRC32') return crc32Bytes(new Uint8Array(buffer));
  const hashBuffer = await crypto.subtle.digest(algo, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Verify a file against a known hash
 * @param {File} file
 * @param {string} knownHash
 * @param {string} algo
 * @returns {Promise<{match: boolean, computed: string, filename: string, size: number}>}
 */
export async function verifyFileHash(file, knownHash, algo = 'SHA-256') {
  const computed = await hashFile(file, algo);
  const match = computed.toLowerCase() === knownHash.toLowerCase().trim();
  return { match, computed, filename: file.name, size: file.size };
}
