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
  const linear = (value: number) => {
    const s = value / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (value: string) =>
    0.2126 * linear(parseInt(value.slice(0, 2), 16)) +
    0.7152 * linear(parseInt(value.slice(2, 4), 16)) +
    0.0722 * linear(parseInt(value.slice(4, 6), 16));
  const bg = luminance(full);
  const dark = luminance('14261A');
  const whiteContrast = 1.05 / (bg + 0.05);
  const darkContrast = (Math.max(bg, dark) + 0.05) / (Math.min(bg, dark) + 0.05);
  if (whiteContrast < 4.5 && darkContrast < 4.5) return '#000000';
  return whiteContrast >= darkContrast ? '#FFFFFF' : '#14261A';
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
