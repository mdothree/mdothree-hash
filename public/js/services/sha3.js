// services/sha3.js
// FIPS 202 SHA3-256 (pure JS, no dependencies).
// Note: CryptoJS.SHA3 is the original Keccak (pre-standard padding 0x01) and does
// NOT produce SHA-3 output, so we implement the standard here.
// Test vector: sha3_256("abc") = 3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532

const RC = [ // 24 round constants as [lo, hi] 32-bit halves
  0x00000001, 0x00000000, 0x00008082, 0x00000000, 0x0000808a, 0x80000000, 0x80008000, 0x80000000,
  0x0000808b, 0x00000000, 0x80000001, 0x00000000, 0x80008081, 0x80000000, 0x00008009, 0x80000000,
  0x0000008a, 0x00000000, 0x00000088, 0x00000000, 0x80008009, 0x00000000, 0x8000000a, 0x00000000,
  0x8000808b, 0x00000000, 0x0000008b, 0x80000000, 0x00008089, 0x80000000, 0x00008003, 0x80000000,
  0x00008002, 0x80000000, 0x00000080, 0x80000000, 0x0000800a, 0x00000000, 0x8000000a, 0x80000000,
  0x80008081, 0x80000000, 0x00008080, 0x80000000, 0x80000001, 0x00000000, 0x80008008, 0x80000000,
];

// Rotation offsets indexed by x + 5y
const ROT = [0, 1, 62, 28, 27, 36, 44, 6, 55, 20, 3, 10, 43, 25, 39, 41, 45, 15, 21, 8, 18, 2, 61, 56, 14];

function keccakF(s) {
  const B = new Uint32Array(50);
  const C = new Uint32Array(10);
  for (let round = 0; round < 24; round++) {
    // theta
    for (let x = 0; x < 5; x++) {
      C[2 * x]     = s[2 * x]     ^ s[2 * (x + 5)]     ^ s[2 * (x + 10)]     ^ s[2 * (x + 15)]     ^ s[2 * (x + 20)];
      C[2 * x + 1] = s[2 * x + 1] ^ s[2 * (x + 5) + 1] ^ s[2 * (x + 10) + 1] ^ s[2 * (x + 15) + 1] ^ s[2 * (x + 20) + 1];
    }
    for (let x = 0; x < 5; x++) {
      const x1 = (x + 1) % 5, x4 = (x + 4) % 5;
      // D = C[x-1] ^ rot(C[x+1], 1)
      const lo = C[2 * x4]     ^ ((C[2 * x1] << 1) | (C[2 * x1 + 1] >>> 31));
      const hi = C[2 * x4 + 1] ^ ((C[2 * x1 + 1] << 1) | (C[2 * x1] >>> 31));
      for (let y = 0; y < 25; y += 5) {
        s[2 * (x + y)] ^= lo;
        s[2 * (x + y) + 1] ^= hi;
      }
    }
    // rho + pi: B[y, 2x+3y] = rot(A[x, y], ROT[x, y])
    for (let x = 0; x < 5; x++) {
      for (let y = 0; y < 5; y++) {
        const i = x + 5 * y;
        let lo = s[2 * i], hi = s[2 * i + 1];
        let n = ROT[i];
        if (n >= 32) { const t = lo; lo = hi; hi = t; n -= 32; }
        if (n > 0) {
          const nlo = (lo << n) | (hi >>> (32 - n));
          const nhi = (hi << n) | (lo >>> (32 - n));
          lo = nlo; hi = nhi;
        }
        const j = y + 5 * ((2 * x + 3 * y) % 5);
        B[2 * j] = lo; B[2 * j + 1] = hi;
      }
    }
    // chi
    for (let y = 0; y < 25; y += 5) {
      for (let x = 0; x < 5; x++) {
        const a = 2 * (x + y), b = 2 * (((x + 1) % 5) + y), c = 2 * (((x + 2) % 5) + y);
        s[a]     = B[a]     ^ (~B[b]     & B[c]);
        s[a + 1] = B[a + 1] ^ (~B[b + 1] & B[c + 1]);
      }
    }
    // iota
    s[0] ^= RC[2 * round];
    s[1] ^= RC[2 * round + 1];
  }
}

/**
 * SHA3-256 of a string (UTF-8) or Uint8Array.
 * @param {string|Uint8Array} input
 * @returns {string} 64-char lowercase hex
 */
export function sha3_256(input) {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input;
  const rate = 136; // (1600 - 2*256) / 8
  const padLen = rate - (bytes.length % rate);
  const msg = new Uint8Array(bytes.length + padLen);
  msg.set(bytes);
  msg[bytes.length] ^= 0x06;          // SHA-3 domain separation
  msg[msg.length - 1] ^= 0x80;        // final bit of pad10*1

  const s = new Uint32Array(50);
  for (let off = 0; off < msg.length; off += rate) {
    for (let i = 0; i < rate / 4; i++) {
      const p = off + 4 * i;
      s[i] ^= msg[p] | (msg[p + 1] << 8) | (msg[p + 2] << 16) | (msg[p + 3] << 24);
    }
    keccakF(s);
  }
  let hex = '';
  for (let i = 0; i < 8; i++) {
    const w = s[i];
    for (let k = 0; k < 4; k++) hex += ((w >>> (8 * k)) & 0xff).toString(16).padStart(2, '0');
  }
  return hex;
}
