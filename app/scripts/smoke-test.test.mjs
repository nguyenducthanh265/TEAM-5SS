import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { once } from 'node:events';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

function run(script, args = [], env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [fileURLToPath(new URL(script, import.meta.url)), ...args], {
      env: { ...process.env, SMOKE_API_URL: '', EXPO_PUBLIC_API_URL: '', ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    child.stdout.on('data', (chunk) => { output += chunk; });
    child.stderr.on('data', (chunk) => { output += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, output }));
  });
}

test('predeploy refuses to pass without a real API check', async () => {
  const result = await run('./smoke-test.mjs', ['--require-api']);
  assert.notEqual(result.code, 0, result.output);
});

test('EAS build refuses a missing or placeholder backend URL', async () => {
  for (const url of ['', 'https://TEN-BACKEND.onrender.com', 'http://127.0.0.1:8000']) {
    const result = await run('./check-build-env.mjs', [], { EXPO_PUBLIC_API_URL: url });
    assert.notEqual(result.code, 0, result.output);
  }
});

test('EAS build accepts a public HTTPS URL', async () => {
  const result = await run('./check-build-env.mjs', [], { EXPO_PUBLIC_API_URL: 'https://ecohanoi.example.org' });
  assert.equal(result.code, 0, result.output);
});

const item = { name: 'Lon', groupId: 'recyclable', confidence: 0.9, reason: 'Kim loại' };
for (const [label, body, expected] of [
  ['valid AI', { source: 'ai', items: [item], latencyMs: 10 }, 0],
  ['AI with error', { source: 'ai', error: 'provider_down', items: [item] }, 1],
  ['empty detection', { source: 'ai', items: [] }, 1],
  ['unknown group', { source: 'ai', items: [{ ...item, groupId: 'unknown' }] }, 1],
  ['low confidence', { source: 'ai', items: [{ ...item, confidence: 0.1 }] }, 1],
  ['invalid items', { source: 'ai', items: [{}] }, 1],
  ['fallback', { source: 'fallback', items: [] }, 1],
]) {
  test(`smoke checks /classify: ${label}`, async () => {
    const server = createServer((req, res) => {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(req.url === '/health' ? { status: 'ok' } : body));
    });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    try {
      const result = await run('./smoke-test.mjs', ['--require-api'], {
        SMOKE_API_URL: `http://127.0.0.1:${server.address().port}`,
      });
      assert.equal(result.code, expected, result.output);
    } finally {
      await new Promise((resolve) => server.close(resolve));
    }
  });
}
