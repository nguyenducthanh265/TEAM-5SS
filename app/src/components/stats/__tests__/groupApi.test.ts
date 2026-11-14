import { afterEach, beforeEach, expect, jest, test } from '@jest/globals';
import {
  fetchGroup,
  fetchGroupResult,
  normalizeGroupCode,
  postGroupScore,
} from '../../../lib/groupApi';

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

function mockResponse(body: unknown, status = 200) {
  (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValue({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response);
}

test('normalizeGroupCode trims, uppercases, and validates 3-20 chars', () => {
  expect(normalizeGroupCode(' ktx-b2-305 ')).toBe('KTX-B2-305');
  expect(normalizeGroupCode('ab')).toBeNull();
  expect(normalizeGroupCode('a_b')).toBeNull();
});

test('fetchGroupResult returns ok on 200 with valid GroupInfo', async () => {
  const payload = { code: 'KTX-1', xp: 50, members: 2, rank: 1, top: [{ code: 'KTX-1', xp: 50 }] };
  mockResponse(payload, 200);
  expect(await fetchGroupResult('ktx-1')).toEqual({ status: 'ok', data: payload });
});

test('fetchGroupResult distinguishes HTTP 404 as not_found', async () => {
  mockResponse({ error: 'not_found' }, 404);
  expect(await fetchGroupResult('KTX-NEW')).toEqual({ status: 'not_found' });
});

test('fetchGroupResult returns error on 500, network failure, or malformed JSON', async () => {
  mockResponse({ error: 'server_error' }, 500);
  expect(await fetchGroupResult('KTX-1')).toEqual({ status: 'error' });

  (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('offline'));
  expect(await fetchGroupResult('KTX-1')).toEqual({ status: 'error' });

  mockResponse({ code: 'KTX-1', xp: 'bad' }, 200);
  expect(await fetchGroupResult('KTX-1')).toEqual({ status: 'error' });
});

test('fetchGroup keeps legacy GroupInfo | null contract', async () => {
  mockResponse({ error: 'not_found' }, 404);
  expect(await fetchGroup('KTX-NEW')).toBeNull();

  const payload = { code: 'KTX-1', xp: 10, members: 1, rank: 1, top: [] };
  mockResponse(payload, 200);
  expect(await fetchGroup('KTX-1')).toEqual(payload);
});

test('postGroupScore returns true on 200 and false on error or invalid input', async () => {
  mockResponse({ code: 'KTX-1', xp: 20, members: 1, rank: 1, top: [] }, 200);
  expect(await postGroupScore('ktx-1', 'dev-1', 20, 2)).toBe(true);

  expect(await postGroupScore('ktx-1', '', 20, 2)).toBe(false);
  expect(await postGroupScore('ktx-1', 'dev-1', 0, 2)).toBe(false);

  (globalThis.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(new Error('offline'));
  expect(await postGroupScore('ktx-1', 'dev-1', 20, 2)).toBe(false);
});
