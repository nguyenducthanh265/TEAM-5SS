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
  it('có đúng 4 giai đoạn với ngưỡng 0, 50, 150, 400', () => {
    expect(TREE_STAGES.map((s) => s.minXp)).toEqual([0, 50, 150, 400]);
    expect(TREE_STAGES.map((s) => s.name)).toEqual([
      'Mầm non',
      'Cây non',
      'Tán xanh',
      'Đại thụ',
    ]);
  });
});

describe('stageFor', () => {
  it('trả về đúng giai đoạn tại các mốc biên 0, 49, 50, 149, 150, 399, 400', () => {
    expect(stageFor(0).name).toBe('Mầm non');
    expect(stageFor(49).name).toBe('Mầm non');
    expect(stageFor(50).name).toBe('Cây non');
    expect(stageFor(149).name).toBe('Cây non');
    expect(stageFor(150).name).toBe('Tán xanh');
    expect(stageFor(399).name).toBe('Tán xanh');
    expect(stageFor(400).name).toBe('Đại thụ');
    expect(stageFor(1200).name).toBe('Đại thụ');
  });

  it('xử lý XP âm hoặc không hợp lệ về Mầm non', () => {
    expect(stageFor(-10).name).toBe('Mầm non');
    expect(stageFor(Number.NaN).name).toBe('Mầm non');
  });
});

describe('nextThreshold', () => {
  it('trả về ngưỡng kế tiếp hoặc null ở giai đoạn cuối', () => {
    expect(nextThreshold(0)).toBe(50);
    expect(nextThreshold(49)).toBe(50);
    expect(nextThreshold(50)).toBe(150);
    expect(nextThreshold(149)).toBe(150);
    expect(nextThreshold(150)).toBe(400);
    expect(nextThreshold(399)).toBe(400);
    expect(nextThreshold(400)).toBeNull();
    expect(nextThreshold(999)).toBeNull();
  });

  it('xử lý XP âm hoặc NaN trả về 50', () => {
    expect(nextThreshold(-5)).toBe(50);
    expect(nextThreshold(Number.NaN)).toBe(50);
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
