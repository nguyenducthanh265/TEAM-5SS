import { describe, expect, test } from '@jest/globals';
import type { RewardState } from '@/lib/contracts';
import {
  OFFLINE_STREAK_TEXT,
  buildStreakViewModel,
  parseSavedBanner,
} from '../streakViewModel';

function makeReward(overrides: Partial<RewardState> = {}): RewardState {
  return {
    xp: 42,
    streak: 3,
    dayIndex: 3,
    todayItems: 2,
    todayCap: 15,
    minItems: 5,
    qualifiedToday: false,
    nextBonus: 40,
    restoresLeft: 2,
    restorable: false,
    today: '2026-11-14',
    ...overrides,
  };
}

describe('buildStreakViewModel', () => {
  test('returns offline message and no numbers when reward is null', () => {
    const vm = buildStreakViewModel(null);
    expect(vm.offline).toBe(true);
    expect(vm.offlineText).toBe(OFFLINE_STREAK_TEXT);
    expect(vm.days).toEqual([]);
    expect(vm.restoreBanner).toBeNull();
  });

  test('builds today text, progress, nextBonus, and 7 day cells', () => {
    const vm = buildStreakViewModel(makeReward({ todayItems: 3, minItems: 5, dayIndex: 3, nextBonus: 40 }));
    expect(vm.offline).toBe(false);
    expect(vm.todayText).toBe('Hôm nay 3/5 món để giữ chuỗi');
    expect(vm.progressPercent).toBe(60);
    expect(vm.nextBonusText).toBe('Ngày mai +40 XP');
    expect(vm.restoreBanner).toBeNull();
    expect(vm.days).toHaveLength(7);
    expect(vm.days[2].active).toBe(true);
    expect(vm.days[0].active).toBe(false);
    expect(vm.days[3].bonus).toBe(40);
  });

  test('caps displayed todayItems at todayCap', () => {
    const vm = buildStreakViewModel(makeReward({ todayItems: 25, todayCap: 15, minItems: 5 }));
    expect(vm.cappedTodayItems).toBe(15);
    expect(vm.todayText).toBe('Hôm nay 15/5 món để giữ chuỗi');
    expect(vm.progressPercent).toBe(100);
  });

  test('shows restore banner when restorable is true', () => {
    const vm = buildStreakViewModel(
      makeReward({ restorable: true, minItems: 5, restoresLeft: 2 }),
    );
    expect(vm.restoreBanner).toBe(
      'Bạn bỏ lỡ 1 ngày. Quét đủ 5 món hôm nay để khôi phục chuỗi (còn 2 lần trong tháng)',
    );
  });
});

describe('parseSavedBanner', () => {
  test('returns null when gained is missing or non-positive', () => {
    expect(parseSavedBanner({})).toBeNull();
    expect(parseSavedBanner({ gained: '0' })).toBeNull();
    expect(parseSavedBanner({ gained: 'abc' })).toBeNull();
  });

  test('formats gained XP without bonus or restore', () => {
    const res = parseSavedBanner({ gained: '10' });
    expect(res?.text).toBe('Đã lưu · +10 XP');
  });

  test('appends streak bonus and restored text when present', () => {
    const res = parseSavedBanner({
      gained: '30',
      gainedBonus: '20',
      gainedItems: '5',
      restored: '1',
    });
    expect(res?.text).toBe('Đã lưu · +30 XP (thưởng chuỗi +20) · Đã khôi phục chuỗi');

    const resTrue = parseSavedBanner({
      gained: '30',
      gainedBonus: '0',
      restored: 'true',
    });
    expect(resTrue?.text).toBe('Đã lưu · +30 XP · Đã khôi phục chuỗi');
  });
});
