import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import type { Progress, SavedItem } from '@/lib/contracts';
import { EMPTY_PROGRESS } from '@/lib/progress';
import { getHistory, getProgress, getSampleMode } from '@/lib/store';

export function useDashboard() {
  const [progress,setProgress]=useState<Progress>(EMPTY_PROGRESS);
  const [history,setHistory]=useState<SavedItem[]>([]);
  const [sample,setSample]=useState(false);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState(false);
  const [revision,setRevision]=useState(0);
  useFocusEffect(useCallback(()=>{
    let alive=true; setLoading(true); setError(false);
    Promise.all([getProgress(),getHistory(0),getSampleMode()]).then(([p,h,s])=>{
      if(alive){setProgress(p);setHistory(h);setSample(s)}
    }).catch(()=>{if(alive)setError(true)}).finally(()=>{if(alive)setLoading(false)});
    return()=>{alive=false};
  },[revision]));
  return {progress,history,sample,loading,error,retry:()=>setRevision(n=>n+1)};
}
