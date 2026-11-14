import type { RewardState } from '@/lib/contracts';
import * as progressLib from '@/lib/progress';

export interface StreakDayCell {
  day: number;
  bonus: number | null;
  active: boolean;
}

export interface StreakViewModel {
  offline: boolean;
  offlineText: string;
  todayText: string;
  progressPercent: number;
  cappedTodayItems: number;
  nextBonusText: string;
  restoreBanner: string | null;
  days: StreakDayCell[];
}

export interface SavedBannerData {
  gained: number;
  gainedBonus: number;
  gainedItems: number;
  restored: boolean;
  text: string;
}

export const OFFLINE_STREAK_TEXT =
  'Chưa tải được chuỗi, điểm đang hiển thị là lần cập nhật trước';

function readStreakBonus(): readonly number[] | null {
  const maybe = (progressLib as { STREAK_BONUS?: unknown }).STREAK_BONUS;
  if (
    Array.isArray(maybe) &&
    maybe.length === 7 &&
    maybe.every((v) => typeof v === 'number' && Number.isFinite(v))
  ) {
    return maybe as number[];
  }
  return null;
}

export function buildStreakViewModel(reward: RewardState | null): StreakViewModel {
  if (reward === null) {
    return {
      offline: true,
      offlineText: OFFLINE_STREAK_TEXT,
      todayText: '',
      progressPercent: 0,
      cappedTodayItems: 0,
      nextBonusText: '',
      restoreBanner: null,
      days: [],
    };
  }

  const cap = reward.todayCap > 0 ? reward.todayCap : reward.minItems;
  const cappedTodayItems = Math.max(0, Math.min(reward.todayItems, cap));
  const denom = reward.minItems > 0 ? reward.minItems : cap;
  const progressPercent =
    denom > 0 ? Math.min(100, Math.max(0, Math.round((cappedTodayItems / denom) * 100))) : 0;

  const bonuses = readStreakBonus();
  const nextDay = reward.dayIndex > 0 ? (reward.dayIndex % 7) + 1 : 1;

  const days: StreakDayCell[] = Array.from({ length: 7 }, (_, i) => {
    const day = i + 1;
    let bonus: number | null = null;
    if (bonuses) {
      bonus = bonuses[i];
    } else if (day === nextDay) {
      bonus = reward.nextBonus;
    }
    return {
      day,
      bonus,
      active: reward.dayIndex === day,
    };
  });

  const restoreBanner = reward.restorable
    ? `Bạn bỏ lỡ 1 ngày. Quét đủ ${reward.minItems} món hôm nay để khôi phục chuỗi (còn ${reward.restoresLeft} lần trong tháng)`
    : null;

  return {
    offline: false,
    offlineText: '',
    todayText: `Hôm nay ${cappedTodayItems}/${reward.minItems} món để giữ chuỗi`,
    progressPercent,
    cappedTodayItems,
    nextBonusText: `Ngày mai +${reward.nextBonus} XP`,
    restoreBanner,
    days,
  };
}

export function parseSavedBanner(params: {
  gained?: string;
  gainedBonus?: string;
  gainedItems?: string;
  restored?: string;
}): SavedBannerData | null {
  const gained = Number(params.gained);
  if (!Number.isFinite(gained) || gained <= 0) return null;

  const rawBonus = Number(params.gainedBonus);
  const gainedBonus = Number.isFinite(rawBonus) && rawBonus > 0 ? Math.floor(rawBonus) : 0;

  const rawItems = Number(params.gainedItems);
  const gainedItems = Number.isFinite(rawItems) && rawItems > 0 ? Math.floor(rawItems) : 0;

  const restored = params.restored === '1' || params.restored === 'true';

  let text = `Đã lưu · +${Math.floor(gained)} XP`;
  if (gainedBonus > 0) {
    text += ` (thưởng chuỗi +${gainedBonus})`;
  }
  if (restored) {
    text += ' · Đã khôi phục chuỗi';
  }

  return {
    gained: Math.floor(gained),
    gainedBonus,
    gainedItems,
    restored,
    text,
  };
}
