// Kho dữ liệu trên máy (AsyncStorage). Mọi số bắt đầu từ 0, không có dữ liệu giả.
import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Progress, RewardState, SavedItem, ScanEntry } from './contracts';
import {
  EMPTY_PROGRESS,
  MAX_HISTORY_ITEMS,
  applySession,
  dayKey,
  entriesToSavedItems,
  withServerReward,
} from './progress';

const KEY_PROGRESS = 'ecohanoi.progress.v1';
const KEY_HISTORY = 'ecohanoi.history.v1';
const KEY_DEVICE_ID = 'ecohanoi.deviceId';
const KEY_GROUP_CODE = 'ecohanoi.groupCode';
const KEY_SAMPLE_MODE = 'ecohanoi.sampleMode';

// --- Hàng chờ: mọi thao tác đọc–sửa–ghi chạy lần lượt, không chen nhau ---
let queue: Promise<void> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = queue.then(fn, fn);
  queue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

// --- Đọc an toàn: dữ liệu hỏng → coi như rỗng ---
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function safeCount(v: unknown): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? Math.floor(v) : 0;
}

function parseProgress(raw: string | null): Progress {
  if (!raw) return { ...EMPTY_PROGRESS };
  try {
    const v: unknown = JSON.parse(raw);
    if (!isRecord(v)) return { ...EMPTY_PROGRESS };
    const progress: Progress = {
      xp: safeCount(v.xp),
      streakDays: safeCount(v.streakDays),
      totalItems: safeCount(v.totalItems),
      correctedItems: safeCount(v.correctedItems),
    };
    if (typeof v.lastScanDay === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.lastScanDay)) {
      progress.lastScanDay = v.lastScanDay;
    }
    return progress;
  } catch {
    return { ...EMPTY_PROGRESS };
  }
}

function parseSavedItem(v: unknown): SavedItem | null {
  if (!isRecord(v)) return null;
  if (typeof v.name !== 'string' || typeof v.groupId !== 'string') return null;
  if (typeof v.day !== 'string' || typeof v.savedAt !== 'number') return null;
  return {
    name: v.name,
    groupId: v.groupId,
    day: v.day,
    savedAt: v.savedAt,
    corrected: v.corrected === true,
    hazardous: v.hazardous === true,
    sellable: v.sellable === true,
  };
}

function parseHistory(raw: string | null): SavedItem[] {
  if (!raw) return [];
  try {
    const v: unknown = JSON.parse(raw);
    if (!Array.isArray(v)) return [];
    const out: SavedItem[] = [];
    for (const one of v) {
      const item = parseSavedItem(one);
      if (item) out.push(item);
    }
    return out;
  } catch {
    return [];
  }
}

async function readItem(key: string): Promise<string | null> {
  // Missing data is null; an I/O failure must reach the caller. Treating it as
  // an empty account could overwrite existing progress during the next save.
  return AsyncStorage.getItem(key);
}

// --- Tiến độ + lịch sử ---
export function getProgress(): Promise<Progress> {
  return withLock(async () => parseProgress(await readItem(KEY_PROGRESS)));
}

/**
 * Lưu một phiên đã xem lại: thêm vào lịch sử và cập nhật điểm.
 * `reward`: kết quả claim từ SERVER (điểm và chuỗi do server tính). `null` = không hỏi được server: lưu lịch sử nhưng
 * KHÔNG cộng điểm. Bỏ trống (undefined) chỉ để các test cũ chạy phép tính cục bộ; màn Xem lại luôn truyền giá trị.
 */
export function saveSession(
  entries: ScanEntry[],
  reward?: RewardState | null,
): Promise<{ gained: number; progress: Progress }> {
  return withLock(async () => {
    const now = new Date();
    const items = entriesToSavedItems(entries, now);
    const current = parseProgress(await readItem(KEY_PROGRESS));
    if (items.length === 0) {
      return { gained: 0, progress: current };
    }
    const history = parseHistory(await readItem(KEY_HISTORY));
    const local = applySession(current, items, dayKey(now));
    const result = reward === undefined ? local : withServerReward(local, current, reward);
    const toStore: SavedItem[] = items.map((it) => ({
      name: it.name,
      groupId: it.groupId,
      day: it.day,
      savedAt: it.savedAt,
      corrected: it.corrected,
      hazardous: it.hazardous,
      sellable: it.sellable,
    }));
    const nextHistory = history.concat(toStore).slice(-MAX_HISTORY_ITEMS);
    await AsyncStorage.multiSet([
      [KEY_PROGRESS, JSON.stringify(result.progress)],
      [KEY_HISTORY, JSON.stringify(nextHistory)],
    ]);
    return result;
  });
}

/** Các món đã lưu trong `days` ngày gần nhất (tính cả hôm nay). days ≤ 0 → toàn bộ. */
export function getHistory(days: number): Promise<SavedItem[]> {
  return withLock(async () => {
    const history = parseHistory(await readItem(KEY_HISTORY));
    if (!Number.isFinite(days) || days <= 0) return history;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (Math.floor(days) - 1));
    const cutoffKey = dayKey(cutoff);
    return history.filter((it) => it.day >= cutoffKey);
  });
}

// --- Mã máy: tạo ngẫu nhiên một lần, không chứa thông tin cá nhân ---
let deviceIdCache: string | null = null;
let deviceIdPending: Promise<string> | null = null;

function randomId(): string {
  let s = '';
  while (s.length < 20) {
    s += Math.random().toString(36).slice(2);
  }
  return `d-${Date.now().toString(36)}-${s.slice(0, 20)}`;
}

export function getDeviceId(): Promise<string> {
  if (deviceIdCache) return Promise.resolve(deviceIdCache);
  if (deviceIdPending) return deviceIdPending;
  const pending = withLock(async () => {
    let saved: string | null = null;
    try {
      saved = await readItem(KEY_DEVICE_ID);
    } catch {
      // Classification can still proceed with an in-memory identifier.
      const id = randomId();
      deviceIdCache = id;
      return id;
    }
    if (saved && /^[A-Za-z0-9-]{8,64}$/.test(saved)) {
      deviceIdCache = saved;
      return saved;
    }
    const id = randomId();
    deviceIdCache = id;
    try {
      await AsyncStorage.setItem(KEY_DEVICE_ID, id);
    } catch {
      // không ghi được: vẫn dùng id trong bộ nhớ cho lần chạy này
    }
    return id;
  });
  deviceIdPending = pending;
  const done = (): void => {
    deviceIdPending = null;
  };
  pending.then(done, done);
  return pending;
}

// --- Mã nhóm ---
export async function getGroupCode(): Promise<string | null> {
  const raw = await readItem(KEY_GROUP_CODE);
  const code = raw ? raw.trim() : '';
  return code.length > 0 ? code : null;
}

/** Lưu mã nhóm (viết hoa, bỏ khoảng trắng đầu cuối). Chuỗi rỗng → xóa mã. */
export async function setGroupCode(code: string): Promise<void> {
  const clean = code.trim().toUpperCase();
  if (clean.length === 0) {
    await AsyncStorage.removeItem(KEY_GROUP_CODE);
    return;
  }
  await AsyncStorage.setItem(KEY_GROUP_CODE, clean);
}

// --- Công tắc "Dữ liệu mẫu" (mặc định tắt) ---
export async function getSampleMode(): Promise<boolean> {
  return (await readItem(KEY_SAMPLE_MODE)) === '1';
}

export async function setSampleMode(on: boolean): Promise<void> {
  await AsyncStorage.setItem(KEY_SAMPLE_MODE, on ? '1' : '0');
}
