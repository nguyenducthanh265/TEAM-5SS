// Gọi API điểm và chuỗi của server (ml/serve/rewards.py). Không bao giờ throw: lỗi mạng, hết giờ, dữ liệu sai dạng -> null.
// Điểm do server tính nên app không có "điểm giả": hỏi không được thì không cộng gì và báo cho người dùng biết.
import type { RewardState } from '@/lib/contracts';

const TIMEOUT_MS = 8000;

function baseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (typeof raw !== 'string') return null;
  const url = raw.trim().replace(/\/+$/, '');
  return url.length > 0 ? url : null;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback;
}

/** Kiểm từng trường: server trả gì lạ thì không tin. xp và streak bắt buộc phải là số. */
export function parseRewardState(data: unknown): RewardState | null {
  if (!isRecord(data)) return null;
  if (typeof data.xp !== 'number' || !Number.isFinite(data.xp) || data.xp < 0) return null;
  if (typeof data.streak !== 'number' || !Number.isFinite(data.streak) || data.streak < 0) return null;
  const state: RewardState = {
    xp: Math.floor(data.xp),
    streak: Math.floor(data.streak),
    dayIndex: num(data.dayIndex),
    todayItems: num(data.todayItems),
    todayCap: num(data.todayCap, 15),
    minItems: num(data.minItems, 5),
    qualifiedToday: data.qualifiedToday === true,
    nextBonus: num(data.nextBonus),
    restoresLeft: num(data.restoresLeft),
    restorable: data.restorable === true,
    today: typeof data.today === 'string' ? data.today : '',
  };
  if (typeof data.gained === 'number') state.gained = num(data.gained);
  if (typeof data.gainedItems === 'number') state.gainedItems = num(data.gainedItems);
  if (typeof data.gainedItemXp === 'number') state.gainedItemXp = num(data.gainedItemXp);
  if (typeof data.gainedBonus === 'number') state.gainedBonus = num(data.gainedBonus);
  if (data.restored === true) state.restored = true;
  return state;
}

async function request(path: string, init: RequestInit): Promise<RewardState | null> {
  const base = baseUrl();
  if (!base) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, { ...init, signal: ctrl.signal });
    if (!res.ok) return null;
    return parseRewardState(await res.json());
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Báo cho server `items` món vừa lưu. Server chỉ cộng trong phạm vi nó đã tự thấy ở /classify. */
export function claimProgress(deviceId: string, items: number): Promise<RewardState | null> {
  if (!deviceId.trim() || !Number.isFinite(items) || items < 0) return Promise.resolve(null);
  return request('/progress/claim', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deviceId, items: Math.min(100, Math.floor(items)) }),
  });
}

/** Điểm, chuỗi và số món hôm nay theo server. */
export function fetchRewardState(deviceId: string): Promise<RewardState | null> {
  if (!deviceId.trim()) return Promise.resolve(null);
  return request(`/progress?d=${encodeURIComponent(deviceId)}`, { method: 'GET' });
}
