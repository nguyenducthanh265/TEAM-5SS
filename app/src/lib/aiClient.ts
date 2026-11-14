// Gọi backend /classify. Không có key nào ở đây: key chỉ nằm trên server.
// Dựa trên mẫu ml/client/aiClient.ts của kit (phân biệt ai / fallback / busy / timeout / network / http).
// Nguyên tắc: chỉ kết quả chắc chắn là AI mới trả kind 'ai'. Mọi trường hợp khác là lỗi có tên, không có nhãn giả.
import type { ClassifiedItem, ScanMode } from '@/lib/contracts';
import { isValidGroupId } from '@/lib/rules';
import { getDeviceId } from '@/lib/store';

export type ClassifyResult =
  | { kind: 'ai'; items: ClassifiedItem[]; latencyMs: number }
  | { kind: 'fallback' | 'busy' | 'timeout' | 'network' | 'http'; message: string };

export const CLASSIFY_TIMEOUT_MS = 20000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function clamp01(v: unknown): number {
  const n = typeof v === 'number' ? v : Number.NaN;
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

function cut(s: string, max: number): string {
  const t = s.trim();
  return t.length > max ? t.slice(0, max) : t;
}

// Kiểm từng món phía app: server trả gì lạ thì hạ về 'unknown' chứ không tin.
function parseItem(raw: unknown): ClassifiedItem | null {
  if (!isRecord(raw)) return null;
  const name = typeof raw.name === 'string' ? cut(raw.name, 40) : '';
  if (!name) return null;
  const rawGroup = typeof raw.groupId === 'string' ? raw.groupId : '';
  const confidence = clamp01(raw.confidence);
  const groupId = confidence >= 0.5 && rawGroup !== 'unknown' && isValidGroupId(rawGroup) ? rawGroup : 'unknown';
  const item: ClassifiedItem = {
    name,
    groupId,
    confidence,
    reason: typeof raw.reason === 'string' ? cut(raw.reason, 120) : '',
  };
  if (typeof raw.tip === 'string' && raw.tip.trim()) item.tip = cut(raw.tip, 80);
  if (raw.hazardous === true) item.hazardous = true;
  if (raw.sellable === true) item.sellable = true;
  if (raw.misplaced === true) item.misplaced = true;
  return item;
}

export async function classifyImage(
  base64: string,
  mode: ScanMode,
  opts?: { timeoutMs?: number },
): Promise<ClassifyResult> {
  const baseUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim().replace(/\/+$/, '');
  if (!baseUrl) {
    return { kind: 'network', message: 'Chưa cấu hình địa chỉ máy chủ (EXPO_PUBLIC_API_URL).' };
  }
  const image = base64.replace(/^data:image\/[a-zA-Z0-9.+-]+;base64,/, '');
  if (!image) {
    return { kind: 'http', message: 'Ảnh rỗng, chụp lại giúp mình.' };
  }

  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  try {
    const deviceId = await getDeviceId();
    if (typeof deviceId === 'string' && deviceId) headers['X-Device-Id'] = deviceId;
  } catch {
    // Không đọc được id máy: vẫn gọi, chỉ thiếu header đếm người dùng.
  }

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), opts?.timeoutMs ?? CLASSIFY_TIMEOUT_MS);
  const t0 = Date.now();
  try {
    const res = await fetch(`${baseUrl}/classify`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ image, mode }),
      signal: ctrl.signal,
    });
    if (res.status === 503) {
      return { kind: 'busy', message: 'Máy chủ AI đang bận, thử lại sau vài giây.' };
    }
    if (!res.ok) {
      return { kind: 'http', message: `Lỗi máy chủ (${res.status}).` };
    }
    let data: unknown;
    try {
      data = await res.json();
    } catch (e) {
      if ((e as { name?: string } | null)?.name === 'AbortError') throw e;
      return { kind: 'http', message: 'Máy chủ trả dữ liệu không đọc được.' };
    }
    if (!isRecord(data)) {
      return { kind: 'http', message: 'Máy chủ trả dữ liệu sai định dạng.' };
    }
    if (data.source === 'busy') {
      return { kind: 'busy', message: 'Máy chủ AI đang bận, thử lại sau vài giây.' };
    }
    const rawItems: unknown = data.items;
    if (data.source !== 'ai' || Boolean(data.error) || !Array.isArray(rawItems)) {
      const why = typeof data.error === 'string' && data.error ? ` (${cut(data.error, 80)})` : '';
      return { kind: 'fallback', message: `AI chưa trả lời được${why}.` };
    }
    const items: ClassifiedItem[] = [];
    for (const raw of rawItems as unknown[]) {
      const item = parseItem(raw);
      if (item) items.push(item);
    }
    if (items.length !== rawItems.length) {
      return { kind: 'http', message: 'Máy chủ trả danh sách món sai định dạng.' };
    }
    const serverMs = typeof data.latencyMs === 'number' && Number.isFinite(data.latencyMs) ? data.latencyMs : null;
    return { kind: 'ai', items, latencyMs: serverMs ?? Date.now() - t0 };
  } catch (e) {
    if ((e as { name?: string } | null)?.name === 'AbortError') {
      return { kind: 'timeout', message: 'Quá thời gian chờ AI.' };
    }
    return { kind: 'network', message: 'Không kết nối được máy chủ. Kiểm tra mạng.' };
  } finally {
    clearTimeout(timer);
  }
}
