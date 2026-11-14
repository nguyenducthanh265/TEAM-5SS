import { describe, expect, it, jest } from '@jest/globals';

import type { ClassifiedItem } from '../contracts';
import { MAX_SPEECH_CHARS, buildSpeech, createSpeechQueue, cutAtWord } from '../voiceCore';

const short = (id: string): string => ({ recyclable: 'Tái chế', food: 'Thực phẩm', other: 'Còn lại' } as Record<string, string>)[id] ?? id;
const item = (over: Partial<ClassifiedItem> = {}): ClassifiedItem => ({
  name: 'Chai nhựa',
  groupId: 'recyclable',
  confidence: 0.9,
  reason: 'x',
  ...over,
});

describe('buildSpeech', () => {
  it('một món: tên, nhóm, mẹo', () => {
    expect(buildSpeech([item({ tip: 'Đổ hết nước, bóp dẹp.' })], short)).toBe('Chai nhựa. Tái chế. Đổ hết nước, bóp dẹp.');
  });

  it('không có món hoặc tên rỗng: không đọc gì', () => {
    expect(buildSpeech([], short)).toBe('');
    expect(buildSpeech([item({ name: '  ' })], short)).toBe('');
  });

  it('món chưa chắc: nói thẳng là chưa chắc, không bịa nhóm', () => {
    const s = buildSpeech([item({ groupId: 'unknown' })], short);
    expect(s).toContain('chưa chắc');
    expect(s).not.toContain('Tái chế');
  });

  it('rác nguy hại được cảnh báo ở đầu câu', () => {
    expect(buildSpeech([item({ name: 'Pin AA', groupId: 'other', hazardous: true })], short).startsWith('Chú ý, rác nguy hại.')).toBe(true);
  });

  it('nhiều món: đếm, nêu tối đa 3 tên, báo món sai túi và rác nguy hại', () => {
    const items = [item({ name: 'A' }), item({ name: 'B', misplaced: true }), item({ name: 'C', hazardous: true }), item({ name: 'D' })];
    const s = buildSpeech(items, short);
    expect(s).toContain('Có 4 món: A, B, C và các món khác');
    expect(s).toContain('1 món nằm sai túi');
    expect(s).toContain('rác nguy hại');
    expect(s).not.toContain('D,');
  });

  it('không bao giờ vượt giới hạn của backend', () => {
    const long = item({ name: 'x'.repeat(40), tip: 'từ '.repeat(100) });
    expect(buildSpeech([long], short).length).toBeLessThanOrEqual(MAX_SPEECH_CHARS);
  });

  it('không có dấu chấm đôi', () => {
    expect(buildSpeech([item({ tip: 'Bóp dẹp.' })], short)).not.toMatch(/\.\./);
  });
});

describe('cutAtWord', () => {
  it('cắt ở ranh giới từ', () => {
    expect(cutAtWord('một hai ba bốn năm sáu', 14)).toBe('một hai ba');
  });
  it('giữ nguyên câu ngắn', () => {
    expect(cutAtWord('ngắn', 10)).toBe('ngắn');
  });
});

describe('createSpeechQueue', () => {
  const tick = (): Promise<void> => new Promise((r) => setImmediate(r));

  it('đọc tuần tự, không chồng nhau', async () => {
    const log: string[] = [];
    let active = 0;
    let maxActive = 0;
    const q = createSpeechQueue(async (t) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      log.push(`bắt đầu ${t}`);
      await tick();
      log.push(`xong ${t}`);
      active -= 1;
    });
    q.say('a');
    q.say('b');
    await new Promise((r) => setTimeout(r, 20));
    expect(maxActive).toBe(1);
    expect(log).toEqual(['bắt đầu a', 'xong a', 'bắt đầu b', 'xong b']);
  });

  it('chờ quá nhiều thì bỏ câu cũ nhất, giữ câu mới', async () => {
    const played: string[] = [];
    let release: () => void = () => undefined;
    const q = createSpeechQueue(async (t) => {
      played.push(t);
      if (t === '1') await new Promise<void>((r) => (release = r));
    }, undefined, 2);
    q.say('1');
    q.say('2');
    q.say('3');
    q.say('4');
    expect(q.waiting).toBe(2);
    release();
    await new Promise((r) => setTimeout(r, 20));
    expect(played).toEqual(['1', '3', '4']);
  });

  it('bỏ qua câu trùng đang chờ và câu rỗng', async () => {
    let release: () => void = () => undefined;
    const q = createSpeechQueue(async () => new Promise<void>((r) => (release = r)));
    q.say('a');
    q.say('b');
    q.say('b');
    q.say('  ');
    expect(q.waiting).toBe(1);
    release();
  });

  it('stop xóa hàng chờ và ngắt câu đang đọc, sau đó đọc lại được', async () => {
    const played: string[] = [];
    const stopped = jest.fn();
    let release: () => void = () => undefined;
    const q = createSpeechQueue(async (t) => {
      played.push(t);
      if (t === 'a') await new Promise<void>((r) => (release = r));
    }, stopped);
    q.say('a');
    q.say('b');
    q.stop();
    expect(stopped).toHaveBeenCalledTimes(1);
    expect(q.waiting).toBe(0);
    release();
    await new Promise((r) => setTimeout(r, 10));
    expect(played).toEqual(['a']);
    q.say('c');
    await new Promise((r) => setTimeout(r, 10));
    expect(played).toEqual(['a', 'c']);
  });

  it('một câu lỗi không chặn các câu sau', async () => {
    const played: string[] = [];
    const q = createSpeechQueue(async (t) => {
      played.push(t);
      if (t === 'a') throw new Error('hỏng');
    });
    q.say('a');
    q.say('b');
    await new Promise((r) => setTimeout(r, 20));
    expect(played).toEqual(['a', 'b']);
  });
});
