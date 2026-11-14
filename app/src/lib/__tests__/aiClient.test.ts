import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import { classifyImage } from '../aiClient';

jest.mock('../store', () => ({ getDeviceId: async () => 'test-device' }));

const validItem = { name: 'Lon', groupId: 'recyclable', confidence: 0.9, reason: 'Kim loại sạch' };
const savedFetch = globalThis.fetch;
const savedUrl = process.env.EXPO_PUBLIC_API_URL;

beforeEach(() => {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test';
  globalThis.fetch = jest.fn() as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = savedFetch;
  if (savedUrl === undefined) delete process.env.EXPO_PUBLIC_API_URL;
  else process.env.EXPO_PUBLIC_API_URL = savedUrl;
});

function response(body: unknown, status = 200) {
  (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
    ok: status >= 200 && status < 300, status, json: async () => body,
  } as Response);
}

test('does not accept ai combined with an error', async () => {
  response({ source: 'ai', error: 'provider_down', items: [validItem] });
  expect((await classifyImage('aGVsbG8=', 'item')).kind).toBe('fallback');
});

test.each([0.2, Number.NaN, Number.POSITIVE_INFINITY, true])('unsafe confidence %s becomes unknown', async (confidence) => {
  response({ source: 'ai', items: [{ ...validItem, confidence }] });
  const result = await classifyImage('aGVsbG8=', 'item');
  expect(result.kind).toBe('ai');
  if (result.kind === 'ai') expect(result.items[0].groupId).toBe('unknown');
});

test('rejects a partially malformed item list', async () => {
  response({ source: 'ai', items: [validItem, { nonsense: true }] });
  expect((await classifyImage('aGVsbG8=', 'bag')).kind).toBe('http');
});

test('honors reason and tip limits from the shared contract', async () => {
  response({ source: 'ai', items: [{ ...validItem, reason: 'r'.repeat(160), tip: 't'.repeat(120) }] });
  const result = await classifyImage('aGVsbG8=', 'item');
  expect(result.kind).toBe('ai');
  if (result.kind === 'ai') {
    expect(result.items[0].reason.length).toBeLessThanOrEqual(120);
    expect(result.items[0].tip?.length).toBeLessThanOrEqual(80);
  }
});

test('returns busy for 503 and fallback for an offline result', async () => {
  response({ source: 'busy' }, 503);
  expect((await classifyImage('aGVsbG8=', 'item')).kind).toBe('busy');
  response({ source: 'fallback', items: [validItem] });
  expect((await classifyImage('aGVsbG8=', 'item')).kind).toBe('fallback');
});

test('valid empty detection remains ai without inventing items', async () => {
  response({ source: 'ai', items: [], latencyMs: 12 });
  expect(await classifyImage('aGVsbG8=', 'item')).toEqual({ kind: 'ai', items: [], latencyMs: 12 });
});
