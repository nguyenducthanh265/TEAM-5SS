// Kiểu dữ liệu dùng chung giữa các màn và backend. Không có logic ở đây.
// Hợp đồng HTTP: POST {API}/classify  body {image: <base64 jpeg, không có tiền tố data:>, mode}
// header X-Device-Id  ->  ClassifyResponse (khóa camelCase). 503 {source:'busy'} khi server quá tải.

export type GroupId = string; // id nhóm trong rules/qd87.json
export type ScanMode = 'item' | 'bag';

export interface ClassifiedItem {
  name: string; // tên món, tiếng Việt, ≤ 40 ký tự
  groupId: GroupId | 'unknown';
  confidence: number; // 0..1
  reason: string; // 1 câu, ≤ 120 ký tự
  tip?: string; // mẹo xử lý, ≤ 80 ký tự
  hazardous?: boolean; // pin, bóng đèn...: hiện hướng dẫn riêng từ rules.hazardous
  sellable?: boolean; // bán ve chai được
  misplaced?: boolean; // chỉ ở chế độ 'bag': món nằm sai túi
}

export interface ClassifyRequest {
  image: string;
  mode: ScanMode;
}

export interface ClassifyResponse {
  items: ClassifiedItem[];
  source: 'ai' | 'fallback';
  latencyMs: number;
  error?: string;
}

export interface ScanEntry {
  id: string;
  uri: string;
  mode: ScanMode;
  createdAt: number;
  status: 'pending' | 'done' | 'error';
  items: ClassifiedItem[];
  errorKind?: 'timeout' | 'network' | 'busy' | 'fallback' | 'http';
  corrected?: boolean; // người dùng đã sửa nhãn ở màn Xem lại
}

export interface Progress {
  xp: number;
  streakDays: number;
  lastScanDay?: string; // YYYY-MM-DD theo giờ máy
  totalItems: number;
  correctedItems: number;
}

// Một món đã lưu sau màn Xem lại (dùng cho Thống kê).
export interface SavedItem {
  name: string;
  groupId: GroupId | 'unknown';
  day: string; // YYYY-MM-DD
  savedAt: number;
  corrected: boolean;
  hazardous: boolean;
  sellable: boolean;
}

export interface RuleGroup {
  id: GroupId;
  name: string;
  short: string;
  color: string; // mô tả màu bao bì theo văn bản
  color_hex: string; // màu hiển thị trên giao diện
  ref?: string;
  examples: string[];
  disposal: string;
  exceptions: string[];
}
