import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Progress, RewardState, SavedItem } from '@/lib/contracts';
import { EMPTY_PROGRESS } from '@/lib/progress';
import { fetchRewardState } from '@/lib/rewardsApi';
import { getDeviceId, getHistory, getProgress, getSampleMode } from '@/lib/store';

export function useDashboard() {
  const [progress,setProgress]=useState<Progress>(EMPTY_PROGRESS);
  const [history,setHistory]=useState<SavedItem[]>([]);
  const [sample,setSample]=useState(false);
  const [reward,setReward]=useState<RewardState|null>(null); // điểm, chuỗi, số món hôm nay theo SERVER (null khi chưa hỏi được)
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [revision,setRevision]=useState(0);
  useFocusEffect(useCallback(()=>{
    let alive=true; setLoading(true); setError(false);
    Promise.all([getProgress(),getHistory(0),getSampleMode()]).then(async([p,h,s])=>{
      // Điểm và chuỗi hiển thị lấy từ server; mất mạng thì dùng giá trị đã lưu lần trước (không cộng thêm gì).
      let shown=p,state:RewardState|null=null;
      try{const r=await fetchRewardState(await getDeviceId());if(r){state=r;shown={...p,xp:r.xp,streakDays:r.streak}}}catch{}
      if(alive){setProgress(shown);setReward(state);setHistory(h);setSample(s)}
    }).catch(()=>{if(alive)setError(true)}).finally(()=>{if(alive)setLoading(false)});
    return()=>{alive=false};
  },[revision]));
  return {progress,reward,history,sample,loading,error,retry:()=>setRevision(n=>n+1)};
}
