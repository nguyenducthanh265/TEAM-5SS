// Hàng chờ quét: mỗi ảnh -> thu nhỏ (~512 px, JPEG 0,6) -> classifyImage. Tối đa 3 request cùng lúc.
// Trạng thái nằm ở session.ts nên rời màn Quét rồi quay lại vẫn còn; request đang bay vẫn ghi kết quả về đúng thẻ.
// Không có kết quả giả ở đây: thẻ chỉ 'done' khi classifyImage trả kind 'ai'.
import { useSyncExternalStore } from 'react';
import { Image } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

import { classifyImage } from '@/lib/aiClient';
import type { ClassifyResult } from '@/lib/aiClient';
import type { ScanEntry, ScanMode } from '@/lib/contracts';
import { clearSession, getSessionEntries, setSessionEntries, subscribeSession } from '@/lib/session';

export { classifyImage };
export type { ClassifyResult };

export const MAX_CONCURRENT = 3;
export const LONG_EDGE_PX = 512;
export const JPEG_QUALITY = 0.6;

export type ImageSize = { width: number; height: number };

function readSize(uri: string): Promise<ImageSize | null> {
  return new Promise((resolve) => {
    Image.getSize(
      uri,
      (width, height) => resolve(width > 0 && height > 0 ? { width, height } : null),
      () => resolve(null),
    );
  });
}

/** Thu nhỏ ảnh (cạnh dài ~512 px), nén JPEG 0,6, trả base64 không có tiền tố data:. Selftest dùng lại đúng hàm này. */
export async function prepareImageBase64(uri: string, size?: ImageSize): Promise<string> {
  const dims = size && size.width > 0 && size.height > 0 ? size : await readSize(uri);
  const ctx = ImageManipulator.manipulate(uri);
  if (!dims) {
    ctx.resize({ width: LONG_EDGE_PX });
  } else if (Math.max(dims.width, dims.height) > LONG_EDGE_PX) {
    ctx.resize(dims.width >= dims.height ? { width: LONG_EDGE_PX } : { height: LONG_EDGE_PX });
  }
  const rendered = await ctx.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: JPEG_QUALITY, base64: true });
  if (!saved.base64) throw new Error('no-base64');
  return saved.base64;
}

// ---- hàng chờ (mức module: sống qua việc rời/quay lại màn) ----
let active = 0;
let seq = 0;
const waiting: string[] = [];
const sizes = new Map<string, ImageSize>();

function findEntry(id: string): ScanEntry | undefined {
  return getSessionEntries().find((e) => e.id === id);
}

function patchEntry(id: string, patch: Partial<ScanEntry>): void {
  const list = getSessionEntries();
  if (!list.some((e) => e.id === id)) return; // thẻ đã bị xóa trong lúc chờ: bỏ kết quả
  setSessionEntries(list.map((e) => (e.id === id ? { ...e, ...patch } : e)));
}

async function runOne(id: string): Promise<void> {
  const entry = findEntry(id);
  if (!entry || entry.status !== 'pending') return;
  let base64: string;
  try {
    base64 = await prepareImageBase64(entry.uri, sizes.get(id));
  } catch {
    patchEntry(id, { status: 'error', errorKind: 'http', items: [] });
    return;
  }
  const result = await classifyImage(base64, entry.mode);
  if (result.kind === 'ai') {
    patchEntry(id, { status: 'done', items: result.items, errorKind: undefined });
  } else {
    patchEntry(id, { status: 'error', errorKind: result.kind, items: [] });
  }
}

function pump(): void {
  while (active < MAX_CONCURRENT && waiting.length > 0) {
    const id = waiting.shift();
    if (id === undefined) break;
    const entry = findEntry(id);
    if (!entry || entry.status !== 'pending') continue;
    active += 1;
    runOne(id)
      .catch(() => {
        patchEntry(id, { status: 'error', errorKind: 'http', items: [] });
      })
      .finally(() => {
        active -= 1;
        pump();
      });
  }
}

/** Thêm một ảnh vào phiên và hàng chờ. Thẻ hiện ngay ở trạng thái 'pending'. Trả về id của thẻ. */
export function enqueue(uri: string, mode: ScanMode, size?: ImageSize): string {
  seq += 1;
  const id = `${Date.now().toString(36)}-${seq}`;
  if (size) sizes.set(id, size);
  const entry: ScanEntry = { id, uri, mode, createdAt: Date.now(), status: 'pending', items: [] };
  setSessionEntries([...getSessionEntries(), entry]);
  waiting.push(id);
  pump();
  return id;
}

/** Chạy lại một thẻ đang lỗi (gọi lại AI thật). */
export function retry(id: string): void {
  const entry = findEntry(id);
  if (!entry || entry.status !== 'error') return;
  patchEntry(id, { status: 'pending', errorKind: undefined, items: [] });
  if (!waiting.includes(id)) waiting.push(id);
  pump();
}

export function remove(id: string): void {
  sizes.delete(id);
  const at = waiting.indexOf(id);
  if (at >= 0) waiting.splice(at, 1);
  const list = getSessionEntries();
  if (list.some((e) => e.id === id)) setSessionEntries(list.filter((e) => e.id !== id));
}

export function clear(): void {
  waiting.length = 0;
  sizes.clear();
  clearSession();
}

/** Số thẻ đã có kết quả AI với ít nhất 1 món. */
export function countDone(entries: readonly ScanEntry[]): number {
  return entries.filter((e) => e.status === 'done' && e.items.length > 0).length;
}

export function useScanQueue(): {
  entries: ScanEntry[];
  enqueue: (uri: string, mode: ScanMode, size?: ImageSize) => string;
  retry: (id: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  doneCount: number;
} {
  const entries = useSyncExternalStore(subscribeSession, getSessionEntries, getSessionEntries);
  return { entries, enqueue, retry, remove, clear, doneCount: countDone(entries) };
}
