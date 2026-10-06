// tests/sha3-crc32.test.js — exercises the real browser modules (no inlined copies).
import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { createHash } from 'node:crypto';
import zlib from 'node:zlib';
import { sha3_256 } from '../public/js/services/sha3.js';
import { crc32, generateHash } from '../public/js/services/hashGenerator.js';

describe('SHA3-256 (FIPS 202)', () => {
  it('"abc" test vector', () => assert.equal(sha3_256('abc'), '3a985da74fe225b2045c172d6bd390bd855f086e3e9d525b46bfe24511431532'));
  it('empty string', () => assert.equal(sha3_256(''), 'a7ffc6f8bf1ed76651c14756a061d662f580ff4de43b49fa82d80a4b80f8434a'));
  it('matches node sha3-256 across block boundaries', () => {
    for (const n of [1, 135, 136, 137, 271, 272, 273, 1000]) {
      const s = 'x'.repeat(n);
      assert.equal(sha3_256(s), createHash('sha3-256').update(s).digest('hex'), `len ${n}`);
    }
  });
  it('generateHash("SHA3") is SHA3-256, not Keccak', async () => {
    assert.equal(await generateHash('héllo €😀', 'SHA3'), createHash('sha3-256').update('héllo €😀').digest('hex'));
  });
});

describe('CRC32 over UTF-8', () => {
  for (const s of ['hello', 'é', '€', '😀', 'héllo wörld']) {
    it(JSON.stringify(s), () => {
      const want = zlib.crc32 ? (zlib.crc32(Buffer.from(s, 'utf8')) >>> 0).toString(16).padStart(8, '0') : null;
      if (want) assert.equal(crc32(s), want);
    });
  }
  it('"hello" = 3610a686', () => assert.equal(crc32('hello'), '3610a686'));
  it('"é" = 0e048d3e', () => assert.equal(crc32('é'), '0e048d3e'));
});
