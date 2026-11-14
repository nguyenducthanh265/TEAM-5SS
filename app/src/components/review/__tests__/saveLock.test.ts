import { describe, expect, it, jest } from '@jest/globals';

import { runWithSaveLock } from '../saveLock';

describe('runWithSaveLock', () => {
  it('bấm 2 lần đồng thời chỉ chạy hàm lưu đúng 1 lần', async () => {
    const lock = { current: false };
    let resolveTask!: () => void;
    const task = jest.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveTask = resolve;
        }),
    );

    const first = runWithSaveLock(lock, task);
    const second = runWithSaveLock(lock, task);

    expect(lock.current).toBe(true);
    expect(task).toHaveBeenCalledTimes(1);
    await expect(second).resolves.toBe(false);

    resolveTask();
    await expect(first).resolves.toBe(true);
    expect(task).toHaveBeenCalledTimes(1);
  });

  it('khi lỗi thì nhả khóa để lần sau bấm lại được', async () => {
    const lock = { current: false };
    const task = jest
      .fn<() => Promise<void>>()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValueOnce(undefined);

    await expect(runWithSaveLock(lock, task)).rejects.toThrow('disk full');
    expect(lock.current).toBe(false);

    await expect(runWithSaveLock(lock, task)).resolves.toBe(true);
    expect(lock.current).toBe(true);
    expect(task).toHaveBeenCalledTimes(2);
  });
});
