import type { ClassifiedItem } from './contracts';
import type { ReviewItem } from './progress';
import { getGroup, getHardItems, getHazardous, isValidGroupId } from './rules';
import { nextThreshold, stageFor } from './tree';

export interface GuideExample {
  name: string;
  groupId: string;
  why: string;
  tip: string;
  hazardous: boolean;
  certainty: string;
}

function normalize(value: string): string {
  return value.toLocaleLowerCase('vi').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/đ/g,'d').trim();
}

/** Search only the examples maintained with the project's rule source. */
export function searchGuide(query: string): GuideExample[] {
  const term=normalize(query);
  return getHardItems().map(row=>({
    name:row.name,groupId:row.group_id,why:row.why,tip:row.tip,
    hazardous:row.hazardous === true,certainty:row.certainty,
  })).filter(row=>normalize(`${row.name} ${getGroup(row.groupId)?.short ?? ''}`).includes(term));
}

export function canSaveReview(items: readonly ClassifiedItem[]): boolean {
  return items.length>0 && items.every(item=>isValidGroupId(item.groupId) && (!item.hazardous || item.groupId==='other'));
}

/** A correction cannot turn hazardous waste into ordinary food/recycling. */
export function correctReviewItem(item: ReviewItem, groupId: string): ReviewItem {
  if(!isValidGroupId(groupId))throw new Error('Nhóm không hợp lệ');
  const next=item.hazardous?'other':groupId;
  if(next===item.groupId)return item;
  return {
    ...item,groupId:next,corrected:true,
    reason:'Bạn đã xác nhận lại nhóm cho món này.',
    tip:item.hazardous?getHazardous().note:getGroup(next)?.disposal,
    sellable:next==='recyclable' && item.sellable===true,
  };
}

export function treeProgress(xp: number) {
  const safe=Number.isFinite(xp)?Math.max(0,xp):0;
  const stage=stageFor(safe),next=nextThreshold(safe);
  return {
    stage,next,remaining:next===null?0:Math.max(0,next-safe),
    percent:next===null?100:Math.max(0,Math.min(100,Math.round((safe-stage.minXp)/(next-stage.minXp)*100))),
  };
}
