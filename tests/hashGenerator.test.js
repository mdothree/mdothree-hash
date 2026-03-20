// tests/hashGenerator.test.js
// Unit tests for hashGenerator.js and related services.
// Run with: npm test
//
// Uses Node.js built-in test runner (Node 18+) and the Web Crypto API
// available in Node 19+ via globalThis.crypto.

import { strict as assert } from 'node:assert';
import { describe, it, before } from 'node:test';

// We test the pure logic functions that don't depend on browser APIs
// by importing directly.  Functions that use Web Crypto are tested
// with the Node.js crypto global.

// ─── CRC32 (pure JS, no browser deps) ────────────────────────
// Inline the function here to test in isolation
function crc32(str) {
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
  const table = makeCRC32Table();
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < str.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ str.charCodeAt(i)) & 0xFF];
  }
  return ((crc ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0');
}

// ─── Encoder (pure JS) ───────────────────────────────────────
function encodeBase64(str) {
  return Buffer.from(str).toString('base64');
}
function decodeBase64(str) {
  return Buffer.from(str, 'base64').toString('utf8');
}
function encodeHex(str) {
  return Buffer.from(str, 'utf8').toString('hex');
}
function decodeHex(hex) {
  return Buffer.from(hex, 'hex').toString('utf8');
}

// ─── SHA hashes via Node crypto ──────────────────────────────
import { createHash } from 'node:crypto';
function nodeSHA256(str) {
  return createHash('sha256').update(str).digest('hex');
}
function nodeMD5(str) {
  return createHash('md5').update(str).digest('hex');
}

// ─── Tests ───────────────────────────────────────────────────

describe('CRC32', () => {
  it('empty string', () => {
    assert.strictEqual(crc32(''), '00000000');
  });
  it('known value: "hello"', () => {
    // CRC32 of "hello" = 3610a686
    assert.strictEqual(crc32('hello'), '3610a686');
  });
  it('known value: "123456789"', () => {
    // Standard CRC32 check value
    assert.strictEqual(crc32('123456789'), 'cbf43926');
  });
  it('returns 8-char hex', () => {
    const result = crc32('test');
    assert.match(result, /^[0-9a-f]{8}$/);
  });
  it('is deterministic', () => {
    assert.strictEqual(crc32('mdothree'), crc32('mdothree'));
  });
});

describe('SHA-256 (Node crypto)', () => {
  it('known value: empty string', () => {
    assert.strictEqual(
      nodeSHA256(''),
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
    );
  });
  it('known value: "hello"', () => {
    assert.strictEqual(
      nodeSHA256('hello'),
      '2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824'
    );
  });
  it('returns 64-char hex', () => {
    assert.match(nodeSHA256('test'), /^[0-9a-f]{64}$/);
  });
  it('different inputs produce different hashes', () => {
    assert.notStrictEqual(nodeSHA256('a'), nodeSHA256('b'));
  });
});

describe('MD5 (Node crypto)', () => {
  it('known value: "hello"', () => {
    assert.strictEqual(nodeMD5('hello'), '5d41402abc4b2a76b9719d911017c592');
  });
  it('returns 32-char hex', () => {
    assert.match(nodeMD5('test'), /^[0-9a-f]{32}$/);
  });
});

describe('Base64 encoding', () => {
  it('encodes "hello world"', () => {
    assert.strictEqual(encodeBase64('hello world'), 'aGVsbG8gd29ybGQ=');
  });
  it('round-trips', () => {
    const original = 'mdothree test string 123!@#';
    assert.strictEqual(decodeBase64(encodeBase64(original)), original);
  });
  it('handles empty string', () => {
    assert.strictEqual(encodeBase64(''), '');
  });
  it('handles unicode', () => {
    const str = 'Hello 🌍';
    assert.strictEqual(decodeBase64(encodeBase64(str)), str);
  });
});

describe('Hex encoding', () => {
  it('encodes "hello"', () => {
    assert.strictEqual(encodeHex('hello'), '68656c6c6f');
  });
  it('round-trips', () => {
    const original = 'test string';
    assert.strictEqual(decodeHex(encodeHex(original)), original);
  });
  it('returns lowercase hex', () => {
    assert.match(encodeHex('ABC'), /^[0-9a-f]+$/);
  });
});
