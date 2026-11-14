// Quy tắc điểm và chuỗi ngày. Hàm THUẦN: không import React Native, không đọc đồng hồ, không I/O.
import type { ClassifiedItem, Progress, RewardState, SavedItem, ScanEntry } from './contracts';

// --- Hằng số điểm (đổi ở đây) ---
// Điểm thật do SERVER tính (ml/serve/rewards.py); các hằng số này chỉ để hiển thị cho khớp luật của server.
export const XP_PER_ITEM = 2; // mỗi món AI nhận ra thật
export const XP_MISPLACED_BONUS = 0; // không còn thưởng riêng cho món sai túi
export const MAX_ITEMS_PER_DAY = 15; // trần số món được tính điểm mỗi ngày
export const MIN_ITEMS_FOR_STREAK = 5; // số món tối thiểu để ngày được tính chuỗi
export const MAX_HISTORY_ITEMS = 2000;

export const EMPTY_PROGRESS: Progress = {
  xp: 0,
  streakDays: 0,
  totalItems: 0,
  correctedItems: 0,
};

// Món trong màn Xem lại: thêm cờ cục bộ lên ClassifiedItem (không gửi lên server).
export type ReviewItem = ClassifiedItem & {
  removed?: boolean; // người dùng bấm "Bỏ món này"
  corrected?: boolean; // người dùng đã chọn lại nhóm cho đúng món này
};

// Món đã lưu, kèm cờ misplaced để tính điểm thưởng.
export type SessionItem = SavedItem & { misplaced?: boolean };

function pad2(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

/** YYYY-MM-DD theo giờ máy. */
export function dayKey(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

/** Số ngày từ `from` đến `to` (cả hai dạng YYYY-MM-DD). Sai định dạng → null. */
export function daysBetween(from: string, to: string): number | null {
  const a = parseDayKey(from);
  const b = parseDayKey(to);
  if (a === null || b === null) return null;
  return Math.round((b - a) / 86400000);
}

function parseDayKey(key: string): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) return null;
  const t = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  return Number.isFinite(t) ? t : null;
}

/** XP của một danh sách món (chưa cộng vào tiến độ). */
export function xpForItems(items: readonly SessionItem[]): number {
  let xp = 0;
  for (const it of items) {
    xp += XP_PER_ITEM;
    if (it.misplaced === true) xp += XP_MISPLACED_BONUS;
  }
  return xp;
}

/**
 * Cộng một phiên lưu vào tiến độ. `today` là dayKey của lúc lưu.
 * Chuỗi ngày: lần lưu trước là hôm qua → +1; cùng ngày → giữ; cách ≥ 2 ngày hoặc chưa từng lưu → 1.
 * Phiên không có món nào → không đổi gì.
 */
export function applySession(
  progress: Progress,
  items: readonly SessionItem[],
  today: string,
): { gained: number; progress: Progress } {
  if (items.length === 0) {
    return { gained: 0, progress: { ...progress } };
  }
  const gained = xpForItems(items);
  const corrected = items.filter((it) => it.corrected).length;

  let streakDays = 1;
  let lastScanDay = today;
  if (progress.lastScanDay !== undefined) {
    const diff = daysBetween(progress.lastScanDay, today);
    if (diff === 1) {
      streakDays = progress.streakDays + 1;
    } else if (diff !== null && diff <= 0) {
      // cùng ngày (hoặc đồng hồ máy bị lùi): giữ chuỗi, không lùi mốc ngày
      streakDays = Math.max(1, progress.streakDays);
      lastScanDay = progress.lastScanDay;
    }
  }

  return {
    gained,
    progress: {
      xp: progress.xp + gained,
      streakDays,
      lastScanDay,
      totalItems: progress.totalItems + items.length,
      correctedItems: progress.correctedItems + corrected,
    },
  };
}

/**
 * Thay điểm và chuỗi tính cục bộ bằng kết quả của SERVER (chống gian lận: đổi đồng hồ máy hay sửa dữ liệu trên máy
 * không tăng được điểm). `reward === null` nghĩa là không hỏi được server: KHÔNG cộng điểm, giữ nguyên điểm và chuỗi cũ.
 * Tổng món, số món đã sửa vẫn lấy từ phép tính cục bộ.
 */
export function withServerReward(
  local: { gained: number; progress: Progress },
  current: Progress,
  reward: RewardState | null,
): { gained: number; progress: Progress } {
  if (reward === null) {
    return { gained: 0, progress: { ...local.progress, xp: current.xp, streakDays: current.streakDays, lastScanDay: current.lastScanDay } };
  }
  return { gained: reward.gained ?? 0, progress: { ...local.progress, xp: reward.xp, streakDays: reward.streak } };
}

/**
 * Đổi các entry của phiên quét thành món để lưu.
 * Bỏ entry chưa `done`, bỏ món có `removed`. Cờ corrected lấy theo từng món nếu có,
 * không có thì theo `entry.corrected`.
 */
export function entriesToSavedItems(entries: readonly ScanEntry[], now: Date): SessionItem[] {
  const day = dayKey(now);
  const savedAt = now.getTime();
  const out: SessionItem[] = [];
  for (const entry of entries) {
    if (entry.status !== 'done') continue;
    for (const raw of entry.items) {
      const item: ReviewItem = raw;
      if (item.removed === true) continue;
      const corrected =
        typeof item.corrected === 'boolean' ? item.corrected : entry.corrected === true;
      const saved: SessionItem = {
        name: item.name,
        groupId: item.groupId,
        day,
        savedAt,
        corrected,
        hazardous: item.hazardous === true,
        sellable: item.sellable === true,
      };
      if (item.misplaced === true) saved.misplaced = true;
      out.push(saved);
    }
  }
  return out;
}
