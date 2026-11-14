// Phần thuần của giọng đọc kết quả quét (không import thư viện native nên test được bằng jest).
// voice.ts ghép phần này với expo-audio (giọng AI từ backend /speak) và expo-speech (dự phòng).
import type { ClassifiedItem } from './contracts';

export const MAX_SPEECH_CHARS = 240; // khớp giới hạn của backend /speak
const MAX_NAMES = 3;

function tidy(s: string | undefined): string {
  return (s ?? '').replace(/\s+/g, ' ').trim().replace(/[.!?。\s]+$/, '');
}

/** Cắt theo ranh giới từ, không vượt `max` ký tự. */
export function cutAtWord(text: string, max: number): string {
  if (text.length <= max) return text;
  const head = text.slice(0, max);
  const space = head.lastIndexOf(' ');
  return (space > max * 0.6 ? head.slice(0, space) : head).replace(/[,;:\s]+$/, '');
}

function describeOne(item: ClassifiedItem, groupShort: (id: string) => string): string {
  const parts: string[] = [];
  if (item.hazardous) parts.push('Chú ý, rác nguy hại');
  parts.push(tidy(item.name));
  parts.push(item.groupId === 'unknown' ? 'Mình chưa chắc, bạn hãy chọn nhóm bằng tay' : tidy(groupShort(item.groupId)));
  const tip = tidy(item.tip);
  if (tip) parts.push(tip);
  return parts.filter(Boolean).join('. ');
}

/** Câu sẽ đọc cho một lượt quét. Rỗng nếu không có món nào (không đọc gì thay vì đọc câu giả). */
export function buildSpeech(items: readonly ClassifiedItem[], groupShort: (id: string) => string): string {
  const list = items.filter((it) => tidy(it.name).length > 0);
  if (list.length === 0) return '';
  if (list.length === 1) return cutAtWord(`${describeOne(list[0], groupShort)}.`, MAX_SPEECH_CHARS);

  const names = list.slice(0, MAX_NAMES).map((it) => tidy(it.name)).join(', ');
  const sentences = [`Có ${list.length} món: ${names}${list.length > MAX_NAMES ? ' và các món khác' : ''}`];
  const misplaced = list.filter((it) => it.misplaced === true).length;
  if (misplaced > 0) sentences.push(`${misplaced} món nằm sai túi`);
  if (list.some((it) => it.hazardous === true)) sentences.push('Có rác nguy hại, hãy để riêng');
  return cutAtWord(`${sentences.join('. ')}.`, MAX_SPEECH_CHARS);
}

export interface SpeechQueue {
  say(text: string): void;
  stop(): void;
  readonly waiting: number;
}

/**
 * Hàng chờ đọc tuần tự: không bao giờ hai câu đọc chồng lên nhau.
 * Chờ quá `maxWaiting` câu thì bỏ câu cũ nhất (kết quả mới quan trọng hơn). Câu trùng đang chờ bị bỏ qua.
 * Lỗi của `play` không làm hỏng hàng chờ. `stop` xóa hàng chờ và gọi `onStop` để ngắt câu đang đọc.
 */
export function createSpeechQueue(
  play: (text: string) => Promise<void>,
  onStop?: () => void,
  maxWaiting = 2,
): SpeechQueue {
  const waiting: string[] = [];
  let running = false;
  let generation = 0;

  async function drain(): Promise<void> {
    if (running) return;
    running = true;
    const mine = generation;
    try {
      while (waiting.length > 0 && mine === generation) {
        const next = waiting.shift() as string;
        try {
          await play(next);
        } catch {
          // một câu lỗi không chặn các câu sau
        }
      }
    } finally {
      if (mine === generation) running = false;
    }
  }

  return {
    say(text: string): void {
      const t = text.trim();
      if (!t || waiting.includes(t)) return;
      waiting.push(t);
      while (waiting.length > maxWaiting) waiting.shift();
      void drain();
    },
    stop(): void {
      generation += 1;
      waiting.length = 0;
      running = false;
      try {
        onStop?.();
      } catch {
        // bỏ qua
      }
    },
    get waiting(): number {
      return waiting.length;
    },
  };
}
