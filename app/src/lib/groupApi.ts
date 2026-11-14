// Gọi API nhóm (WP-08). Không bao giờ throw: lỗi mạng / hết giờ / server lỗi → false hoặc null.
// Không có key nào ở đây; chỉ dùng địa chỉ backend từ biến build EXPO_PUBLIC_API_URL.

const TIMEOUT_MS = 8000;
const MAX_XP_DELTA = 200; // server giới hạn mỗi lần gọi

export interface GroupTopRow {
  code: string;
  xp: number;
}

export interface GroupInfo {
  code: string;
  xp: number;
  members: number;
  rank: number;
  top: GroupTopRow[];
}

export type FetchGroupResult =
  | { status: 'ok'; data: GroupInfo }
  | { status: 'not_found' }
  | { status: 'error' };

type HttpResult =
  | { ok: true; data: unknown }
  | { ok: false; status: number | null };

function baseUrl(): string | null {
  const raw = process.env.EXPO_PUBLIC_API_URL;
  if (typeof raw !== 'string') return null;
  const url = raw.trim().replace(/\/+$/, '');
  return url.length > 0 ? url : null;
}

/** Mã nhóm hợp lệ: 3–20 ký tự chữ/số/gạch ngang, viết hoa. Không hợp lệ → null. */
export function normalizeGroupCode(raw: string): string | null {
  const code = raw.trim().toUpperCase();
  return /^[A-Z0-9-]{3,20}$/.test(code) ? code : null;
}

async function request(path: string, init: RequestInit): Promise<HttpResult> {
  const base = baseUrl();
  if (!base) return { ok: false, status: null };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(`${base}${path}`, { ...init, signal: controller.signal });
    if (!res.ok) return { ok: false, status: res.status };
    const data: unknown = await res.json();
    return { ok: true, data };
  } catch {
    return { ok: false, status: null };
  } finally {
    clearTimeout(timer);
  }
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

function isNum(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v);
}

function parseGroupInfo(data: unknown): GroupInfo | null {
  if (!isRecord(data)) return null;
  if (typeof data.code !== 'string' || !isNum(data.xp)) return null;
  if (!isNum(data.members) || !isNum(data.rank)) return null;
  const top: GroupTopRow[] = [];
  if (Array.isArray(data.top)) {
    for (const row of data.top as unknown[]) {
      if (isRecord(row) && typeof row.code === 'string' && isNum(row.xp)) {
        top.push({ code: row.code, xp: row.xp });
      }
    }
  }
  return { code: data.code, xp: data.xp, members: data.members, rank: data.rank, top };
}

/** Cộng điểm cho nhóm. `items` = số món của phiên vừa lưu. Thành công → true. */
export async function postGroupScore(
  code: string,
  deviceId: string,
  xpDelta: number,
  items: number,
): Promise<boolean> {
  const clean = normalizeGroupCode(code);
  if (!clean || !deviceId.trim() || !isNum(xpDelta) || xpDelta <= 0) return false;
  const body = JSON.stringify({
    code: clean,
    deviceId,
    xpDelta: Math.min(MAX_XP_DELTA, Math.floor(xpDelta)),
    items: Math.max(0, Math.floor(items)),
  });
  const res = await request('/groups/score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Device-Id': deviceId },
    body,
  });
  return res.ok;
}

/** Điểm và bảng xếp hạng của nhóm, phân biệt 404 (chưa có dữ liệu) với lỗi mạng/timeout. */
export async function fetchGroupResult(code: string): Promise<FetchGroupResult> {
  const clean = normalizeGroupCode(code);
  if (!clean) return { status: 'error' };
  const res = await request(`/groups/${encodeURIComponent(clean)}`, { method: 'GET' });
  if (!res.ok) {
    return res.status === 404 ? { status: 'not_found' } : { status: 'error' };
  }
  const info = parseGroupInfo(res.data);
  return info ? { status: 'ok', data: info } : { status: 'error' };
}

/** Điểm và bảng xếp hạng của nhóm. Lỗi hoặc chưa có dữ liệu → null (giữ chữ ký cũ). */
export async function fetchGroup(code: string): Promise<GroupInfo | null> {
  const res = await fetchGroupResult(code);
  return res.status === 'ok' ? res.data : null;
}
