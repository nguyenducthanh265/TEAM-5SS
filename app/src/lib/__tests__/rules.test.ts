import { describe, expect, test } from '@jest/globals';

import {
  UNKNOWN_GROUP,
  getGroup,
  getGroups,
  getHardItems,
  getHazardous,
  getReviewStatus,
  groupColor,
  groupShort,
  isValidGroupId,
} from '@/lib/rules';

describe('rules (QĐ 87)', () => {
  test('getGroups trả về danh sách nhóm không rỗng với đầy đủ trường', () => {
    const groups = getGroups();
    expect(groups.length).toBeGreaterThan(0);
    for (const g of groups) {
      expect(typeof g.id).toBe('string');
      expect(g.id.length).toBeGreaterThan(0);
      expect(g.short.length).toBeGreaterThan(0);
      expect(g.color_hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(isValidGroupId(g.id)).toBe(true);
      expect(getGroup(g.id)).toEqual(g);
    }
  });

  test("isValidGroupId('unknown') trả về false theo quy ước chỉ nhận id trong file luật", () => {
    expect(isValidGroupId('unknown')).toBe(false);
    expect(isValidGroupId('khong-ton-tai')).toBe(false);
    expect(isValidGroupId('')).toBe(false);
  });

  test('groupColor và groupShort của id lạ trả về giá trị của UNKNOWN_GROUP', () => {
    expect(UNKNOWN_GROUP.id).toBe('unknown');
    expect(UNKNOWN_GROUP.short).toBe('Chưa chắc — chọn tay');
    expect(UNKNOWN_GROUP.color_hex).toMatch(/^#[0-9A-Fa-f]{6}$/);

    expect(groupColor('unknown')).toBe(UNKNOWN_GROUP.color_hex);
    expect(groupColor('id-la')).toBe(UNKNOWN_GROUP.color_hex);
    expect(groupShort('unknown')).toBe(UNKNOWN_GROUP.short);
    expect(groupShort('id-la')).toBe(UNKNOWN_GROUP.short);
    expect(getGroup('id-la')).toBeUndefined();
  });

  test('getHazardous trả về note, color_hex, examples hợp lệ', () => {
    const haz = getHazardous();
    expect(haz.note.length).toBeGreaterThan(0);
    expect(haz.color_hex).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(Array.isArray(haz.examples)).toBe(true);
    expect(haz.examples.length).toBeGreaterThan(0);
  });

  test('getHardItems trả về danh sách món hay gặp hợp lệ', () => {
    const items = getHardItems();
    expect(items.length).toBeGreaterThan(0);
    for (const item of items) {
      expect(item.name.length).toBeGreaterThan(0);
      expect(isValidGroupId(item.group_id)).toBe(true);
      expect(item.certainty.length).toBeGreaterThan(0);
      expect(item.why.length).toBeGreaterThan(0);
      expect(item.tip.length).toBeGreaterThan(0);
      if (item.hazardous !== undefined) {
        expect(typeof item.hazardous).toBe('boolean');
      }
    }
  });

  test('getReviewStatus trả về chuỗi trạng thái soát xét không rỗng', () => {
    const status = getReviewStatus();
    expect(typeof status).toBe('string');
    expect(status.trim().length).toBeGreaterThan(0);
  });
});
