export interface RefLock {
  current: boolean;
}

/**
 * Khóa đồng bộ chống bấm đôi khi lưu phiên:
 * - Trả về false ngay nếu đang có lượt lưu chạy.
 * - Đặt lock.current = true trước khi await task.
 * - Nếu task lỗi, nhả khóa (lock.current = false) rồi ném tiếp lỗi để UI cho thử lại.
 */
export async function runWithSaveLock(
  lock: RefLock,
  task: () => Promise<void>,
): Promise<boolean> {
  if (lock.current) return false;
  lock.current = true;
  try {
    await task();
    return true;
  } catch (err) {
    lock.current = false;
    throw err;
  }
}
