import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { ScanEntry } from '../contracts';
import {
  getDeviceId,
  getGroupCode,
  getHistory,
  getProgress,
  getSampleMode,
  saveSession,
  setGroupCode,
  setSampleMode,
} from '../store';

jest.mock('@react-native-async-storage/async-storage', () =>
  jest.requireActual('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

function entry(id: string, names: string[]): ScanEntry {
  return {
    id,
    uri: `file:///${id}.jpg`,
    mode: 'item',
    createdAt: 1,
    status: 'done',
    items: names.map((name) => ({
      name,
      groupId: 'recyclable',
      confidence: 0.9,
      reason: 'thử',
    })),
  };
}

beforeEach(async () => {
  await AsyncStorage.clear();
});

describe('store', () => {
  it('người dùng mới: mọi số bằng 0, lịch sử rỗng', async () => {
    const progress = await getProgress();
    expect(progress).toEqual({ xp: 0, streakDays: 0, totalItems: 0, correctedItems: 0 });
    expect(await getHistory(30)).toEqual([]);
    expect(await getGroupCode()).toBeNull();
    expect(await getSampleMode()).toBe(false);
  });

  it('saveSession cộng XP và ghi lịch sử, đọc lại vẫn còn', async () => {
    const { gained, progress } = await saveSession([entry('a', ['Lon', 'Chai'])]);
    expect(gained).toBe(20);
    expect(progress.xp).toBe(20);
    expect(progress.streakDays).toBe(1);

    const again = await getProgress();
    expect(again.xp).toBe(20);
    expect(again.totalItems).toBe(2);
    const history = await getHistory(30);
    expect(history.map((it) => it.name)).toEqual(['Lon', 'Chai']);
  });

  it('hai saveSession gọi liền nhau không mất dữ liệu', async () => {
    const [first, second] = await Promise.all([
      saveSession([entry('a', ['Lon'])]),
      saveSession([entry('b', ['Chai', 'Hộp giấy'])]),
    ]);
    expect(first.gained).toBe(10);
    expect(second.gained).toBe(20);
    expect(second.progress.xp).toBe(30);

    const progress = await getProgress();
    expect(progress.xp).toBe(30);
    expect(progress.totalItems).toBe(3);
    const history = await getHistory(30);
    expect(history.map((it) => it.name)).toEqual(['Lon', 'Chai', 'Hộp giấy']);
  });

  it('phiên không có món done thì không ghi gì', async () => {
    const pending: ScanEntry = { ...entry('a', ['Lon']), status: 'pending' };
    const { gained, progress } = await saveSession([pending]);
    expect(gained).toBe(0);
    expect(progress.xp).toBe(0);
    expect(progress.streakDays).toBe(0);
    expect(await getHistory(30)).toEqual([]);
  });

  it('dữ liệu hỏng trong AsyncStorage được coi như rỗng', async () => {
    await AsyncStorage.setItem('ecohanoi.progress.v1', '{khong phai json');
    await AsyncStorage.setItem('ecohanoi.history.v1', '"khong phai mang"');
    expect((await getProgress()).xp).toBe(0);
    expect(await getHistory(30)).toEqual([]);
    const { progress } = await saveSession([entry('a', ['Lon'])]);
    expect(progress.xp).toBe(10);
    expect(await getHistory(30)).toHaveLength(1);
  });

  it('getHistory bỏ món cũ hơn số ngày yêu cầu', async () => {
    const old = {
      name: 'Cũ',
      groupId: 'other',
      day: '2020-01-01',
      savedAt: 1577836800000,
      corrected: false,
      hazardous: false,
      sellable: false,
    };
    await AsyncStorage.setItem('ecohanoi.history.v1', JSON.stringify([old]));
    await saveSession([entry('a', ['Mới'])]);
    expect((await getHistory(30)).map((it) => it.name)).toEqual(['Mới']);
    expect((await getHistory(0)).map((it) => it.name)).toEqual(['Cũ', 'Mới']);
  });

  it('getDeviceId trả cùng một id cho mọi lần gọi', async () => {
    const [a, b] = await Promise.all([getDeviceId(), getDeviceId()]);
    const c = await getDeviceId();
    expect(a).toBe(b);
    expect(a).toBe(c);
    expect(a.length).toBeGreaterThanOrEqual(8);
  });

  it('mã nhóm được viết hoa; chuỗi rỗng thì xóa', async () => {
    await setGroupCode('  ktx-b2-305 ');
    expect(await getGroupCode()).toBe('KTX-B2-305');
    await setGroupCode('');
    expect(await getGroupCode()).toBeNull();
  });

  it('công tắc dữ liệu mẫu mặc định tắt và nhớ trạng thái', async () => {
    await setSampleMode(true);
    expect(await getSampleMode()).toBe(true);
    await setSampleMode(false);
    expect(await getSampleMode()).toBe(false);
  });
});
