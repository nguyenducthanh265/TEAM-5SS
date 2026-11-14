import { afterEach, beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Progress, RewardState, ScanEntry } from '../contracts';
import { EMPTY_PROGRESS, applySession, withServerReward } from '../progress';
import { claimProgress, fetchRewardState, parseRewardState } from '../rewardsApi';
import { getProgress, saveSession } from '../store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

const SERVER: RewardState = {
  xp: 130,
  streak: 3,
  dayIndex: 3,
  todayItems: 5,
  todayCap: 15,
  minItems: 5,
  qualifiedToday: true,
  nextBonus: 40,
  restoresLeft: 3,
  restorable: false,
  today: '2026-11-14',
  gained: 40,
  gainedItems: 5,
  gainedItemXp: 10,
  gainedBonus: 30,
};

function entry(id: string, names: string[]): ScanEntry {
  return {
    id,
    uri: `file:///${id}.jpg`,
    mode: 'item',
    createdAt: 1,
    status: 'done',
    items: names.map((name) => ({ name, groupId: 'recyclable', confidence: 0.9, reason: 'thử' })),
  };
}

type FetchFn = (url: string, init?: { method?: string; body?: string }) => Promise<unknown>;
const realFetch = (globalThis as { fetch?: unknown }).fetch;
function mockFetch(impl: FetchFn): jest.Mock<FetchFn> {
  const fn = jest.fn<FetchFn>(impl);
  (globalThis as { fetch?: unknown }).fetch = fn;
  return fn;
}

beforeEach(async () => {
  process.env.EXPO_PUBLIC_API_URL = 'https://example.test';
  await AsyncStorage.clear();
});

afterEach(() => {
  (globalThis as { fetch?: unknown }).fetch = realFetch;
});

describe('parseRewardState', () => {
  it('đọc đủ các trường server trả về', () => {
    expect(parseRewardState({ ...SERVER })).toEqual(SERVER);
  });

  it('từ chối dữ liệu sai dạng, thiếu hoặc âm', () => {
    expect(parseRewardState(null)).toBeNull();
    expect(parseRewardState([])).toBeNull();
    expect(parseRewardState({ streak: 1 })).toBeNull();
    expect(parseRewardState({ xp: 'nhiều', streak: 1 })).toBeNull();
    expect(parseRewardState({ xp: -5, streak: 1 })).toBeNull();
    expect(parseRewardState({ xp: 5, streak: Number.NaN })).toBeNull();
  });

  it('trường phụ thiếu thì dùng mặc định an toàn', () => {
    const s = parseRewardState({ xp: 10, streak: 0 });
    expect(s).not.toBeNull();
    expect(s?.todayCap).toBe(15);
    expect(s?.minItems).toBe(5);
    expect(s?.qualifiedToday).toBe(false);
    expect(s?.gained).toBeUndefined();
  });
});

describe('claimProgress / fetchRewardState', () => {
  it('claim gửi đúng thân yêu cầu và trả trạng thái của server', async () => {
    const f = mockFetch(async () => ({ ok: true, json: async () => ({ ...SERVER }) }));
    await expect(claimProgress('dev-1', 6)).resolves.toEqual(SERVER);
    const [url, init] = f.mock.calls[0];
    expect(url).toBe('https://example.test/progress/claim');
    expect(init?.method).toBe('POST');
    expect(JSON.parse(init?.body ?? '{}')).toEqual({ deviceId: 'dev-1', items: 6 });
  });

  it('chặn số món quá lớn ở phía app (server vẫn là nơi quyết định)', async () => {
    const f = mockFetch(async () => ({ ok: true, json: async () => ({ ...SERVER }) }));
    await claimProgress('dev-1', 5000);
    expect(JSON.parse(f.mock.calls[0][1]?.body ?? '{}').items).toBe(100);
  });

  it('lỗi HTTP, lỗi mạng hoặc JSON hỏng đều ra null, không ném lỗi', async () => {
    mockFetch(async () => ({ ok: false, json: async () => ({}) }));
    await expect(claimProgress('dev-1', 5)).resolves.toBeNull();
    mockFetch(async () => {
      throw new Error('mất mạng');
    });
    await expect(claimProgress('dev-1', 5)).resolves.toBeNull();
    mockFetch(async () => ({
      ok: true,
      json: async () => {
        throw new Error('không phải JSON');
      },
    }));
    await expect(fetchRewardState('dev-1')).resolves.toBeNull();
  });

  it('không gọi mạng khi thiếu id máy hoặc số món không hợp lệ', async () => {
    const f = mockFetch(async () => ({ ok: true, json: async () => ({ ...SERVER }) }));
    await expect(claimProgress('  ', 5)).resolves.toBeNull();
    await expect(claimProgress('dev-1', -1)).resolves.toBeNull();
    await expect(fetchRewardState('')).resolves.toBeNull();
    expect(f).not.toHaveBeenCalled();
  });

  it('fetchRewardState gọi GET với id máy đã mã hóa', async () => {
    const f = mockFetch(async () => ({ ok: true, json: async () => ({ ...SERVER }) }));
    await fetchRewardState('d v/1');
    expect(f.mock.calls[0][0]).toBe('https://example.test/progress?d=d%20v%2F1');
    expect(f.mock.calls[0][1]?.method).toBe('GET');
  });
});

describe('withServerReward', () => {
  const current: Progress = { xp: 50, streakDays: 2, lastScanDay: '2026-11-13', totalItems: 4, correctedItems: 1 };

  it('điểm và chuỗi lấy từ server, tổng món vẫn tính cục bộ', () => {
    const items = [{ name: 'Lon', groupId: 'recyclable', day: '2026-11-14', savedAt: 1, corrected: false, hazardous: false, sellable: true }];
    const r = withServerReward(applySession(current, items, '2026-11-14'), current, SERVER);
    expect(r.gained).toBe(40);
    expect(r.progress.xp).toBe(130);
    expect(r.progress.streakDays).toBe(3);
    expect(r.progress.totalItems).toBe(5);
  });

  it('không hỏi được server: không cộng điểm và giữ nguyên chuỗi cũ', () => {
    const local = applySession(current, [], '2026-11-14');
    const r = withServerReward({ gained: 999, progress: { ...local.progress, xp: 9999, streakDays: 99 } }, current, null);
    expect(r.gained).toBe(0);
    expect(r.progress.xp).toBe(50);
    expect(r.progress.streakDays).toBe(2);
    expect(r.progress.lastScanDay).toBe('2026-11-13');
  });
});

describe('saveSession với điểm do server tính', () => {
  it('lưu lịch sử và dùng điểm của server, bỏ qua phép tính cục bộ', async () => {
    const { gained, progress } = await saveSession([entry('a', ['Lon', 'Chai'])], SERVER);
    expect(gained).toBe(40);
    expect(progress.xp).toBe(130);
    expect(progress.streakDays).toBe(3);
    expect(progress.totalItems).toBe(2);
    expect((await getProgress()).xp).toBe(130);
  });

  it('server không trả lời (null): vẫn lưu món nhưng KHÔNG cộng điểm', async () => {
    const { gained, progress } = await saveSession([entry('a', ['Lon', 'Chai'])], null);
    expect(gained).toBe(0);
    expect(progress.xp).toBe(EMPTY_PROGRESS.xp);
    expect(progress.streakDays).toBe(0);
    expect(progress.totalItems).toBe(2);
  });

  it('server null không làm mất điểm đã có từ trước', async () => {
    await saveSession([entry('a', ['Lon'])], SERVER);
    const { progress } = await saveSession([entry('b', ['Chai'])], null);
    expect(progress.xp).toBe(130);
    expect(progress.streakDays).toBe(3);
    expect(progress.totalItems).toBe(2);
  });
});
