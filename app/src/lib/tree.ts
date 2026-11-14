// Logic thuần của cây EcoHanoi: 4 giai đoạn theo XP và trạng thái khát nước.
import type { Progress } from './contracts';

export type TreeStageId = 'sprout' | 'sapling' | 'canopy' | 'giant';

export interface TreeStage {
  index: number;
  id: TreeStageId;
  name: string;
  minXp: number;
}

export const TREE_STAGES: readonly TreeStage[] = [
  { index: 0, id: 'sprout', name: 'Mầm non', minXp: 0 },
  { index: 1, id: 'sapling', name: 'Cây non', minXp: 60 }, // ~2 ngày đủ 5 món
  { index: 2, id: 'canopy', name: 'Tán xanh', minXp: 300 }, // ~1 tuần chuỗi liên tục
  { index: 3, id: 'giant', name: 'Đại thụ', minXp: 900 }, // ~3 tuần chuỗi liên tục
] as const;

function sanitizeXp(xp: number): number {
  return typeof xp === 'number' && Number.isFinite(xp) && xp > 0 ? xp : 0;
}

/** Giai đoạn hiện tại ứng với số XP. */
export function stageFor(xp: number): TreeStage {
  const safeXp = sanitizeXp(xp);
  let current = TREE_STAGES[0];
  for (const stage of TREE_STAGES) {
    if (safeXp >= stage.minXp) {
      current = stage;
    }
  }
  return current;
}

/** Ngưỡng XP của giai đoạn kế tiếp; null nếu đã đạt Đại thụ. */
export function nextThreshold(xp: number): number | null {
  const safeXp = sanitizeXp(xp);
  for (const stage of TREE_STAGES) {
    if (safeXp < stage.minXp) {
      return stage.minXp;
    }
  }
  return null;
}

/** Cây khát nước khi hôm nay chưa có lượt quét nào được lưu. */
export function isThirsty(progress: Progress, today: string): boolean {
  return progress.lastScanDay !== today;
}
