import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
const source = (await readFile(new URL('../base44/shared/perkSphereClient.ts', import.meta.url), 'utf8'))
  .replace('import { secrets } from "base44:runtime";', 'const secrets = { get: () => undefined };');
const client = await import('data:text/javascript;base64,' + Buffer.from(source).toString('base64'));
test('partner signature agrees with Linux canonical format and nonces always satisfy its contract', async () => {
  const creds = { keyId: client.EXPECTED_KEY_ID, hmacSecret: 'offline-only-secret'.repeat(5) };
  const body = JSON.stringify({ evidence: { registration_reference: 'reg-1' } });
  const nonces = new Set();
  for (let i = 0; i < 512; i++) {
    const headers = await client.signRequest('POST', '/v1/partners/events', body, creds);
    const nonce = headers['X-PS-Nonce'];
    assert.match(nonce, /^[A-Za-z0-9_-]{16,128}$/);
    assert.equal(nonces.has(nonce), false); nonces.add(nonce);
    const canonical = ['POST', '/v1/partners/events', headers['X-PS-Timestamp'], nonce, createHash('sha256').update(body).digest('hex')].join('\n');
    assert.equal(headers['X-PS-Signature'], createHmac('sha256', creds.hmacSecret).update(canonical).digest('hex'));
  }
});
