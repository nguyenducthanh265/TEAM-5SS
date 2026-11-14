import { describe, expect, it } from '@jest/globals';

import type { Progress } from '../contracts';
import { TREE_STAGES, isThirsty, nextThreshold, stageFor } from '../tree';

function makeProgress(overrides: Partial<Progress> = {}): Progress {
  return {
    xp: 0,
    streakDays: 0,
    totalItems: 0,
    correctedItems: 0,
    ...overrides,
  };
}

describe('TREE_STAGES', () => {
  it('có đúng 4 giai đoạn với ngưỡng 0, 60, 300, 900', () => {
    expect(TREE_STAGES.map((s) => s.minXp)).toEqual([0, 60, 300, 900]);
    expect(TREE_STAGES.map((s) => s.name)).toEqual([
      'Mầm non',
      'Cây non',
      'Tán xanh',
      'Đại thụ',
    ]);
  });
});

describe('stageFor', () => {
  it('trả về đúng giai đoạn tại các mốc biên 0, 59, 60, 299, 300, 899, 900', () => {
    expect(stageFor(0).name).toBe('Mầm non');
    expect(stageFor(59).name).toBe('Mầm non');
    expect(stageFor(60).name).toBe('Cây non');
    expect(stageFor(299).name).toBe('Cây non');
    expect(stageFor(300).name).toBe('Tán xanh');
    expect(stageFor(899).name).toBe('Tán xanh');
    expect(stageFor(900).name).toBe('Đại thụ');
    expect(stageFor(2000).name).toBe('Đại thụ');
  });

  it('xử lý XP âm hoặc không hợp lệ về Mầm non', () => {
    expect(stageFor(-10).name).toBe('Mầm non');
    expect(stageFor(Number.NaN).name).toBe('Mầm non');
  });
});

describe('nextThreshold', () => {
  it('trả về ngưỡng kế tiếp hoặc null ở giai đoạn cuối', () => {
    expect(nextThreshold(0)).toBe(60);
    expect(nextThreshold(59)).toBe(60);
    expect(nextThreshold(60)).toBe(300);
    expect(nextThreshold(299)).toBe(300);
    expect(nextThreshold(300)).toBe(900);
    expect(nextThreshold(899)).toBe(900);
    expect(nextThreshold(900)).toBeNull();
    expect(nextThreshold(1999)).toBeNull();
  });

  it('xử lý XP âm hoặc NaN trả về 60', () => {
    expect(nextThreshold(-5)).toBe(60);
    expect(nextThreshold(Number.NaN)).toBe(60);
  });
});

describe('isThirsty', () => {
  it('trả về true khi chưa từng quét (lastScanDay trống)', () => {
    expect(isThirsty(makeProgress(), '2026-11-14')).toBe(true);
  });

  it('trả về true khi lần quét cuối khác hôm nay', () => {
    expect(isThirsty(makeProgress({ lastScanDay: '2026-11-13' }), '2026-11-14')).toBe(true);
  });

  it('trả về false khi hôm nay đã quét', () => {
    expect(isThirsty(makeProgress({ lastScanDay: '2026-11-14' }), '2026-11-14')).toBe(false);
  });
});
