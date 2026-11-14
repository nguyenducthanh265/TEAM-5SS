import { describe, expect, it } from '@jest/globals';

import type { ClassifiedItem, Progress, ScanEntry } from '../contracts';
import {
  EMPTY_PROGRESS,
  XP_MISPLACED_BONUS,
  XP_PER_ITEM,
  applySession,
  dayKey,
  daysBetween,
  entriesToSavedItems,
} from '../progress';
import type { ReviewItem } from '../progress';

function item(name: string, extra: Partial<ReviewItem> = {}): ClassifiedItem {
  const base: ReviewItem = {
    name,
    groupId: 'recyclable',
    confidence: 0.9,
    reason: 'thử',
    ...extra,
  };
  return base;
}

function entry(id: string, items: ClassifiedItem[], extra: Partial<ScanEntry> = {}): ScanEntry {
  return {
    id,
    uri: `file:///${id}.jpg`,
    mode: 'item',
    createdAt: 1,
    status: 'done',
    items,
    ...extra,
  };
}

describe('dayKey', () => {
  it('trả YYYY-MM-DD theo giờ máy, có số 0 đứng đầu', () => {
    expect(dayKey(new Date(2026, 0, 5, 9, 30))).toBe('2026-01-05');
    expect(dayKey(new Date(2026, 10, 14, 23, 59))).toBe('2026-11-14');
  });

  it('daysBetween đếm đúng qua ranh giới tháng', () => {
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(daysBetween('2026-11-14', '2026-11-14')).toBe(0);
    expect(daysBetween('hỏng', '2026-11-14')).toBeNull();
  });
});

describe('applySession', () => {
  const now = new Date(2026, 10, 14, 12, 0);

  it('cộng XP_PER_ITEM mỗi món (phép tính cục bộ), bắt đầu từ 0', () => {
    const items = entriesToSavedItems([entry('a', [item('Chai nhựa'), item('Lon')])], now);
    const { gained, progress } = applySession(EMPTY_PROGRESS, items, dayKey(now));
    expect(gained).toBe(2 * XP_PER_ITEM);
    expect(progress.xp).toBe(2 * XP_PER_ITEM);
    expect(progress.totalItems).toBe(2);
    expect(progress.correctedItems).toBe(0);
    expect(progress.streakDays).toBe(1);
    expect(progress.lastScanDay).toBe('2026-11-14');
  });

  it('món misplaced được giữ lại cộng thêm 5', () => {
    const items = entriesToSavedItems(
      [entry('a', [item('Vỏ chuối', { misplaced: true }), item('Lon')], { mode: 'bag' })],
      now,
    );
    const { gained } = applySession(EMPTY_PROGRESS, items, dayKey(now));
    expect(gained).toBe(2 * XP_PER_ITEM + XP_MISPLACED_BONUS);
  });

  it('không đổi object tiến độ đầu vào', () => {
    const before: Progress = { ...EMPTY_PROGRESS };
    const items = entriesToSavedItems([entry('a', [item('Lon')])], now);
    applySession(before, items, dayKey(now));
    expect(before).toEqual(EMPTY_PROGRESS);
  });

  it('chuỗi ngày +1 khi lưu qua nửa đêm (23:59 rồi 00:01)', () => {
    const late = new Date(2026, 10, 14, 23, 59);
    const early = new Date(2026, 10, 15, 0, 1);
    const first = applySession(
      EMPTY_PROGRESS,
      entriesToSavedItems([entry('a', [item('Lon')])], late),
      dayKey(late),
    );
    const second = applySession(
      first.progress,
      entriesToSavedItems([entry('b', [item('Chai')])], early),
      dayKey(early),
    );
    expect(first.progress.streakDays).toBe(1);
    expect(second.progress.streakDays).toBe(2);
    expect(second.progress.lastScanDay).toBe('2026-11-15');
    expect(second.progress.xp).toBe(2 * XP_PER_ITEM);
  });

  it('lưu hai lần cùng ngày thì chuỗi giữ nguyên', () => {
    const start: Progress = { ...EMPTY_PROGRESS, streakDays: 3, lastScanDay: '2026-11-14', xp: 50 };
    const items = entriesToSavedItems([entry('a', [item('Lon')])], now);
    const { progress } = applySession(start, items, '2026-11-14');
    expect(progress.streakDays).toBe(3);
    expect(progress.xp).toBe(50 + XP_PER_ITEM);
  });

  it('cách 2 ngày thì chuỗi về 1', () => {
    const start: Progress = { ...EMPTY_PROGRESS, streakDays: 5, lastScanDay: '2026-11-12' };
    const items = entriesToSavedItems([entry('a', [item('Lon')])], now);
    const { progress } = applySession(start, items, '2026-11-14');
    expect(progress.streakDays).toBe(1);
    expect(progress.lastScanDay).toBe('2026-11-14');
  });

  it('phiên không có món thì không cộng gì, không tính chuỗi', () => {
    const { gained, progress } = applySession(EMPTY_PROGRESS, [], '2026-11-14');
    expect(gained).toBe(0);
    expect(progress).toEqual(EMPTY_PROGRESS);
  });
});

describe('entriesToSavedItems', () => {
  const now = new Date(2026, 10, 14, 8, 0);

  it('bỏ entry chưa done', () => {
    const items = entriesToSavedItems(
      [
        entry('a', [item('Lon')]),
        entry('b', [item('Đang soi')], { status: 'pending' }),
        entry('c', [item('Lỗi')], { status: 'error', errorKind: 'timeout' }),
      ],
      now,
    );
    expect(items.map((it) => it.name)).toEqual(['Lon']);
    expect(items[0]?.day).toBe('2026-11-14');
    expect(items[0]?.savedAt).toBe(now.getTime());
  });

  it('món bị người dùng loại không được tính', () => {
    const items = entriesToSavedItems(
      [entry('a', [item('Lon'), item('Bỏ đi', { removed: true })])],
      now,
    );
    expect(items).toHaveLength(1);
    const { gained, progress } = applySession(EMPTY_PROGRESS, items, dayKey(now));
    expect(gained).toBe(XP_PER_ITEM);
    expect(progress.totalItems).toBe(1);
  });

  it('đếm món đã sửa nhãn theo từng món, không có thì theo entry', () => {
    const items = entriesToSavedItems(
      [
        entry('a', [item('Sửa', { corrected: true }), item('Giữ', { corrected: false })], {
          corrected: true,
        }),
        entry('b', [item('Theo entry')], { corrected: true }),
        entry('c', [item('Không sửa')]),
      ],
      now,
    );
    expect(items.map((it) => it.corrected)).toEqual([true, false, true, false]);
    const { progress } = applySession(EMPTY_PROGRESS, items, dayKey(now));
    expect(progress.correctedItems).toBe(2);
  });

  it('điền mặc định false cho hazardous và sellable', () => {
    const items = entriesToSavedItems(
      [entry('a', [item('Pin', { hazardous: true }), item('Lon', { sellable: true })])],
      now,
    );
    expect(items[0]).toMatchObject({ hazardous: true, sellable: false });
    expect(items[1]).toMatchObject({ hazardous: false, sellable: true });
  });
});
