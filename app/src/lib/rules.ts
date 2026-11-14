import qd87 from '@/assets/qd87.json';
import type { RuleGroup } from '@/lib/contracts';

export interface HardItem {
  name: string;
  group_id: string;
  hazardous?: boolean;
  certainty: string;
  why: string;
  tip: string;
}

interface HazardousRule {
  note: string;
  color_hex: string;
  examples: string[];
}

interface RulesFile {
  review_status: string;
  groups: RuleGroup[];
  hazardous: HazardousRule;
  hard_items: HardItem[];
}

const data = qd87 as RulesFile;
const groupMap = new Map<string, RuleGroup>(data.groups.map((g) => [g.id, g]));

export const UNKNOWN_GROUP = {
  id: 'unknown',
  short: 'Chưa chắc — chọn tay',
  color_hex: '#9CA3AF',
} as const;

export function getGroups(): RuleGroup[] {
  return data.groups;
}

export function getGroup(id: string): RuleGroup | undefined {
  return groupMap.get(id);
}

export function getHazardous(): HazardousRule {
  return {
    note: data.hazardous.note,
    color_hex: data.hazardous.color_hex,
    examples: data.hazardous.examples,
  };
}

export function getHardItems(): HardItem[] {
  return data.hard_items;
}

export function getReviewStatus(): string {
  return data.review_status;
}

/** Chỉ trả về true với id nhóm hợp lệ trong file luật; 'unknown' trả về false. */
export function isValidGroupId(id: string): boolean {
  return groupMap.has(id);
}

export function groupColor(id: string): string {
  return groupMap.get(id)?.color_hex ?? UNKNOWN_GROUP.color_hex;
}

export function groupShort(id: string): string {
  return groupMap.get(id)?.short ?? UNKNOWN_GROUP.short;
}
