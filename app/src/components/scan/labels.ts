// Chữ và màu dùng chung cho các thẻ ở màn Quét. Tên/màu nhóm chỉ lấy từ file luật qua rules.ts.
import type { ClassifiedItem, ScanEntry } from '@/lib/contracts';
import { UNKNOWN_GROUP, groupColor, groupShort, isValidGroupId } from '@/lib/rules';

function known(id: string): boolean {
  return id !== 'unknown' && isValidGroupId(id);
}

export function safeGroupColor(id: string): string {
  return known(id) ? groupColor(id) : UNKNOWN_GROUP.color_hex;
}

export function safeGroupShort(id: string): string {
  return known(id) ? groupShort(id) : UNKNOWN_GROUP.short;
}

/** Màu chữ đọc được trên nền `hex` (#RGB hoặc #RRGGBB). Không đọc được mã màu thì dùng chữ tối. */
export function textOn(hex: string): string {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return '#14261A';
  const raw = m[1];
  const full = raw.length === 3 ? raw.split('').map((c) => c + c).join('') : raw;
  const r = parseInt(full.slice(0, 2), 16);
  const g = parseInt(full.slice(2, 4), 16);
  const b = parseInt(full.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? '#14261A' : '#FFFFFF';
}

export function errorText(kind: ScanEntry['errorKind']): string {
  switch (kind) {
    case 'timeout':
      return 'Quá thời gian chờ';
    case 'network':
      return 'Không có mạng';
    case 'busy':
      return 'Máy chủ đang bận';
    case 'fallback':
      return 'AI chưa trả lời';
    default:
      return 'Lỗi máy chủ';
  }
}

export function misplacedCount(items: readonly ClassifiedItem[]): number {
  return items.filter((i) => i.misplaced === true).length;
}

export function hasHazard(items: readonly ClassifiedItem[]): boolean {
  return items.some((i) => i.hazardous === true);
}
