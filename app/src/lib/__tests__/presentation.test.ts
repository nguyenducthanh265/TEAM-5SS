import { describe, expect, it } from '@jest/globals';
import { canSaveReview, correctReviewItem, searchGuide, treeProgress } from '../presentation';
import type { ClassifiedItem } from '../contracts';

const item: ClassifiedItem = { name: 'Chai nhựa', groupId: 'recyclable', confidence: .9, reason: 'Bao bì nhựa' };

describe('guide search', () => {
  it('finds Vietnamese examples without requiring accents or word order', () => {
    expect(searchGuide('vo chuoi').some(row => row.name === 'Vỏ chuối')).toBe(true);
    expect(searchGuide('chai nhựa').some(row => row.name === 'Chai nước nhựa đã uống hết')).toBe(true);
    expect(searchGuide('chai nhua').some(row => row.name === 'Chai nước nhựa đã uống hết')).toBe(true);
    expect(searchGuide('nhựa chai').some(row => row.name === 'Chai nước nhựa đã uống hết')).toBe(true);
    expect(searchGuide('nhua chai').some(row => row.name === 'Chai nước nhựa đã uống hết')).toBe(true);
    expect(searchGuide('PIN').some(row => row.hazardous)).toBe(true);
  });
  it('empty query returns all source examples; unrelated terms return no matches', () => {
    expect(searchGuide('')).toHaveLength(10);
    expect(searchGuide('khong-co-mon-nay-12345')).toHaveLength(0);
  });
});
describe('review integrity', () => {
  it('requires every item to have a valid group before saving', () => {
    expect(canSaveReview([item])).toBe(true);
    expect(canSaveReview([])).toBe(false);
    expect(canSaveReview([{ ...item, groupId: 'unknown' }])).toBe(false);
    expect(canSaveReview([{ ...item, groupId: 'invented' }])).toBe(false);
    expect(canSaveReview([{ ...item, hazardous: true }])).toBe(false);
    expect(canSaveReview([{ ...item, hazardous: true, groupId: 'other' }])).toBe(true);
  });
  it('keeps hazardous items in other and rejects unrecognized groups', () => {
    const battery = { ...item, name: 'Pin', hazardous: true, groupId: 'other' };
    expect(correctReviewItem(battery, 'food').groupId).toBe('other');
    expect(correctReviewItem(battery, 'food').hazardous).toBe(true);
    expect(() => correctReviewItem(item, 'invented')).toThrow();
  });
  it('marks a corrected group without changing original data', () => {
    expect(correctReviewItem(item, 'food')).toMatchObject({ groupId: 'food', corrected: true });
    expect(item.groupId).toBe('recyclable');
  });
});
describe('tree progress respects current product thresholds', () => {
  it('reports within-stage progress at 0/60/300/900 boundaries', () => {
    expect(treeProgress(0)).toMatchObject({ percent: 0, remaining: 60 });
    expect(treeProgress(30)).toMatchObject({ percent: 50, remaining: 30 });
    expect(treeProgress(300)).toMatchObject({ percent: 0, remaining: 600 });
    expect(treeProgress(900)).toMatchObject({ percent: 100, remaining: 0 });
    expect(treeProgress(Number.NaN)).toMatchObject({ percent: 0, remaining: 60 });
  });
});
