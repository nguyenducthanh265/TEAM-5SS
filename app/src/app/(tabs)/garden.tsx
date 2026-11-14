import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams,useRouter } from 'expo-router';
import React,{useEffect,useState} from 'react';
import { ActivityIndicator,Pressable,StyleSheet,Text,View,useWindowDimensions } from 'react-native';
import { StreakCard } from '@/components/streak/StreakCard';
import { type SavedBannerData, parseSavedBanner } from '@/components/streak/streakViewModel';
import { TreeIllustration } from '@/components/tree/TreeIllustration';
import { ActionButton,ErrorNotice,Heading,SectionTitle } from '@/components/ui/Elements';
import { Screen } from '@/components/ui/Screen';
import { useDashboard } from '@/hooks/useDashboard';
import { treeProgress } from '@/lib/presentation';
import { MAX_ITEMS_PER_DAY, MIN_ITEMS_FOR_STREAK, XP_PER_ITEM, dayKey } from '@/lib/progress';
import { TREE_STAGES, isThirsty } from '@/lib/tree';
import { theme } from '@/lib/theme';

export default function GardenScreen():React.JSX.Element {
  const data=useDashboard(),router=useRouter(),params=useLocalSearchParams<{gained?:string;gainedBonus?:string;gainedItems?:string;restored?:string}>(),{width}=useWindowDimensions();
  const [preview,setPreview]=useState<number|null>(null),[savedBanner,setSavedBanner]=useState<SavedBannerData|null>(null),[wateringKey,setWateringKey]=useState(0);
  useEffect(()=>{const parsed=parseSavedBanner(params);if(parsed){setSavedBanner(parsed);setWateringKey(k=>k+1);router.setParams({gained:undefined,gainedBonus:undefined,gainedItems:undefined,restored:undefined})}},[params.gained,params.gainedBonus,params.gainedItems,params.restored,router]);
  const progress=treeProgress(data.progress.xp),stage=TREE_STAGES[preview??progress.stage.index],thirsty=preview===null&&isThirsty(data.progress,dayKey(new Date()));
  return <Screen><Heading eyebrow="KHU VƯỜN CỦA BẠN" title={'Gieo thói quen.\nNuôi một mầm xanh.'} description="Mỗi món được xác nhận là một chút lớn lên."/>
    {savedBanner?<View style={styles.saved} accessibilityLiveRegion="polite"><Ionicons name="checkmark-circle-outline" size={20} color={theme.forest}/><Text style={styles.savedText}>{savedBanner.text}</Text></View>:null}
    {data.loading?<ActivityIndicator color={theme.forest}/>:data.error?<ErrorNotice message="Chưa tải được cây đã lưu. Thử lại để xem đúng tiến độ." onRetry={data.retry}/>:<>
      <View style={styles.hero}><Text style={styles.badge}>{preview!==null?'XEM TRƯỚC · ':''}GIAI ĐOẠN {stage.index+1} / 4</Text><TreeIllustration stageId={stage.id} thirsty={thirsty} wateringKey={wateringKey} size={220}/><Text style={styles.name}>{stage.name}</Text><Text style={styles.hint}>{preview!==null?'Cây thật vẫn giữ nguyên tiến độ.':thirsty?'Cây đang khát nước — quét 1 món để tưới nhé.':'Bạn đang chăm một điều thật đẹp.'}</Text></View>
      <View style={styles.progress}><View style={styles.labels}><Text style={styles.xp}>{data.progress.xp} XP tích lũy</Text><Text style={styles.next}>{progress.next?`Mốc tiếp: ${progress.next} XP`:'Đã trưởng thành'}</Text></View><View style={styles.track} accessibilityRole="progressbar" accessibilityLabel="Tiến độ cây" accessibilityValue={{min:0,max:100,now:progress.percent}}><View style={[styles.fill,{width:`${progress.percent}%`}]}/></View><Text style={styles.hint}>{progress.remaining?`Còn ${progress.remaining} XP để cây lớn thêm một giai đoạn.`:'Tiếp tục phân loại để nối dài chuỗi ngày xanh.'}</Text></View>
      <StreakCard reward={data.reward}/>
      <View style={{gap:14}}><SectionTitle title="Hành trình lớn lên"/><View style={styles.stages}>{TREE_STAGES.map(s=><Pressable key={s.id} accessibilityRole="button" accessibilityLabel={`Xem trước ${s.name}, ${s.minXp} XP`} accessibilityState={{selected:stage.id===s.id}} onPress={()=>setPreview(s.index)} style={({pressed})=>[styles.stage,stage.id===s.id&&styles.selected,pressed&&{opacity:.6}]}><View style={{opacity:data.progress.xp < s.minXp ? 0.5 : 1}}><TreeIllustration stageId={s.id} thirsty={false} wateringKey={0} size={Math.min(64,(width-94)/4)}/></View><Text style={styles.stageName}>{s.name}</Text><Text style={styles.stageXp}>{s.minXp} XP</Text></Pressable>)}</View></View>
      {preview!==null?<ActionButton label="Về cây hiện tại" secondary onPress={()=>setPreview(null)}/>:null}
    </>}
    <ActionButton label="Quét thêm, xanh thêm" icon="scan-outline" onPress={()=>router.navigate('/(tabs)/scan')}/><View style={styles.tip}><Ionicons name="information-circle-outline" size={21} color={theme.forest}/><Text style={styles.tipText}>Cây ảo, thói quen thật. Mỗi món được +{XP_PER_ITEM} XP (tối đa {MAX_ITEMS_PER_DAY} món mỗi ngày). Đủ {MIN_ITEMS_FOR_STREAK} món là ngày được tính chuỗi và nhận thêm thưởng chuỗi.</Text></View>
  </Screen>;
}
const styles=StyleSheet.create({hero:{backgroundColor:theme.garden,borderRadius:28,padding:22,alignItems:'center',gap:8},badge:{fontSize:11,lineHeight:18,color:theme.text,backgroundColor:'#DCE8C8',paddingVertical:5,paddingHorizontal:12,borderRadius:20},name:{fontSize:29,lineHeight:36,fontWeight:'700',letterSpacing:-1,color:theme.text},hint:{fontSize:12,lineHeight:19,color:theme.textDim},progress:{gap:11},labels:{flexDirection:'row',justifyContent:'space-between',gap:8,flexWrap:'wrap'},xp:{fontSize:13,fontWeight:'700',color:theme.text},next:{fontSize:12,color:theme.textDim},track:{height:8,borderRadius:8,overflow:'hidden',backgroundColor:theme.border},fill:{height:'100%',backgroundColor:theme.forest,borderRadius:8},stages:{flexDirection:'row',gap:7},stage:{flex:1,alignItems:'center',paddingVertical:10,paddingHorizontal:2,borderRadius:17,borderWidth:1,borderColor:theme.border,backgroundColor:theme.card,gap:4},selected:{borderColor:theme.forest,backgroundColor:theme.soft},stageName:{fontSize:10,lineHeight:16,fontWeight:'700',color:theme.text,textAlign:'center'},stageXp:{fontSize:10,color:theme.textDim},tip:{backgroundColor:theme.soft,padding:17,borderRadius:18,flexDirection:'row',gap:10},tipText:{fontSize:12,lineHeight:20,color:theme.textDim,flex:1},saved:{padding:15,borderRadius:16,backgroundColor:theme.primary,flexDirection:'row',alignItems:'center',gap:9},savedText:{fontSize:13,lineHeight:20,color:theme.text,flex:1}});
