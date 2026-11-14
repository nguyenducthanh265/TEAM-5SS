// Phiên quét hiện tại, giữ trong bộ nhớ (không ghi đĩa): màn Quét ghi, màn Xem lại đọc/sửa.
// Rời màn rồi quay lại không mất; đóng hẳn app thì phiên chưa lưu sẽ mất (chủ ý: chỉ món đã xác nhận mới vào kho).
import type { ScanEntry } from '@/lib/contracts';

let entries: ScanEntry[] = [];
const listeners = new Set<() => void>();

function emit(): void {
  listeners.forEach((cb) => {
    try {
      cb();
    } catch {
      // một người nghe lỗi không được chặn người nghe khác
    }
  });
}

/** Mảng hiện tại. Coi như bất biến: muốn đổi thì gọi setSessionEntries với mảng mới. */
export function getSessionEntries(): ScanEntry[] {
  return entries;
}

export function setSessionEntries(e: ScanEntry[]): void {
  entries = e;
  emit();
}

export function clearSession(): void {
  if (entries.length === 0) return;
  entries = [];
  emit();
}

export function subscribeSession(cb: () => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
