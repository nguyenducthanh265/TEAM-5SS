import React,{useEffect,useRef,useState} from 'react';
import { AccessibilityInfo,Animated } from 'react-native';
import Svg,{Ellipse,Path} from 'react-native-svg';
import type { TreeStageId } from '@/lib/tree';
interface Props {stageId:TreeStageId;thirsty:boolean;wateringKey:number;size?:number}
const leaves:Record<TreeStageId,React.ReactNode>={
  sprout:<><Path d="M100 147v-12" stroke="#537B3C" strokeWidth={4}/><Path d="M100 139c-10-16-20-16-24-15 1 15 11 21 24 15" fill="#8CB848"/></>,
  sapling:<><Path d="M100 151V98" stroke="#537B3C" strokeWidth={5}/><Path d="M100 121c-1-30 19-43 42-40-2 25-16 43-42 40" fill="#ABD36A"/><Path d="M100 135c-3-25-21-36-45-33 3 24 19 38 45 33" fill="#79A94A"/><Path d="m102 118 24-20m-28 34-26-17" stroke="#527A37" strokeWidth={1.5}/></>,
  canopy:<><Path d="M100 151V67" stroke="#537B3C" strokeWidth={6}/><Path d="M100 85c-2-28 15-42 38-40 0 22-14 40-38 40" fill="#ABD36A"/><Path d="M100 110c-3-30-23-42-49-38 5 27 21 42 49 38" fill="#79A94A"/><Path d="M101 132c0-29 21-41 46-36-5 26-20 41-46 36" fill="#91BE55"/><Path d="m102 82 23-23m-27 48L68 88m35 39 29-20" stroke="#527A37" strokeWidth={1.5}/></>,
  giant:<><Path d="M100 152V69" stroke="#6D8040" strokeWidth={7}/><Path d="M55 107c-23-9-20-38 0-47-2-22 18-39 38-34 19-18 47-8 49 13 30 0 42 30 25 48 11 28-17 50-39 39-22 16-53 8-57-9-7 2-14-3-16-10" fill="#91BE55"/><Path d="M55 107c-13-5-20-20-15-31 9 11 18 13 30 12 4 18 23 28 41 20 20 16 34 13 51-3-5 21-23 30-42 20-21 16-48 7-49-8-7 2-14-3-16-10" fill="#78A544"/><Path d="M100 151v-42m0 12-18-15m18 28 20-16" stroke="#6D8040" strokeWidth={5}/></>,
};
export function TreeIllustration({stageId,thirsty,wateringKey,size=220}:Props):React.JSX.Element {
  const opacity=useRef(new Animated.Value(1)).current;const [reduced,setReduced]=useState(true);
  useEffect(()=>{let alive=true;AccessibilityInfo.isReduceMotionEnabled().then(v=>{if(alive)setReduced(v)}).catch(()=>{});const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduced);return()=>{alive=false;sub.remove()}},[]);
  useEffect(()=>{if(!wateringKey||reduced)return;const animation=Animated.sequence([Animated.timing(opacity,{toValue:.65,duration:140,useNativeDriver:true}),Animated.timing(opacity,{toValue:1,duration:180,useNativeDriver:true})]);animation.start();return()=>{animation.stop();opacity.setValue(1)}},[opacity,reduced,wateringKey]);
  return <Animated.View style={{width:size,height:size*1.125,opacity}} accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><Svg width="100%" height="100%" viewBox="0 0 200 225" fill="none"><Ellipse cx={100} cy={204} rx={51} ry={7} fill="#173D2B" opacity={.09}/>{leaves[stageId]}<Path d="m62 155 9 42c1 5 6 8 11 8h37c5 0 10-3 11-8l9-42" fill="#C19A73"/><Path d="m62 155 9 42c1 5 6 8 11 8h18v-50" fill="#AA815C"/><Path d="M58 147h84v15H58z" fill="#D6B38A"/><Path d="M58 147h42v15H58z" fill="#C5A079"/><Ellipse cx={100} cy={147} rx={42} ry={6} fill="#E3C6A2"/><Ellipse cx={100} cy={147} rx={34} ry={3.5} fill="#6F6344"/><Path d="M100 147v-5" stroke="#537B3C" strokeWidth={5}/>{!thirsty?<Path d="m152 116 2-5 2 5 5 2-5 2-2 5-2-5-5-2 5-2M43 60l1.5-4 1.5 4 4 1.5-4 1.5-1.5 4-1.5-4-4-1.5 4-1.5" fill="#C6DB91"/>:null}</Svg></Animated.View>;
}
