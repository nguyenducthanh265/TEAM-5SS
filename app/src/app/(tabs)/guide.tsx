import { Ionicons } from '@expo/vector-icons';
import React,{useState} from 'react';
import { Pressable,StyleSheet,Text,TextInput,View } from 'react-native';
import qd87 from '@/assets/qd87.json';
import { GroupIcon,Heading,SectionTitle } from '@/components/ui/Elements';
import { GroupTiles } from '@/components/ui/GroupTiles';
import { RuleSheet } from '@/components/ui/RuleSheet';
import { Screen } from '@/components/ui/Screen';
import { searchGuide } from '@/lib/presentation';
import { getHazardous,groupShort } from '@/lib/rules';
import { theme } from '@/lib/theme';

export default function GuideScreen():React.JSX.Element {
  const [query,setQuery]=useState(''),[picked,setPicked]=useState<string|null>(null),[expanded,setExpanded]=useState<string|null>(null);
  const results=searchGuide(query);
  return <><Screen><Heading eyebrow="CẨM NANG XANH · HÀ NỘI" title={'Đúng nhóm.\nNhẹ việc mỗi ngày.'} description="Nhớ ba nhóm, bắt đầu từ món quen thuộc."/>
    <View style={styles.search}><Ionicons name="search-outline" size={21} color={theme.textDim}/><TextInput accessibilityLabel="Tìm tên món rác" value={query} onChangeText={text=>{setQuery(text);setExpanded(null)}} placeholder="Chai nhựa, pin, vỏ chuối…" placeholderTextColor={theme.textDim} style={styles.input} autoCorrect={false} returnKeyType="search"/>{query?<Pressable accessibilityRole="button" accessibilityLabel="Xóa tìm kiếm" style={styles.clear} onPress={()=>setQuery('')}><Ionicons name="close" size={21} color={theme.text}/></Pressable>:null}</View>
    <GroupTiles onPick={setPicked}/><SectionTitle title="Những món hay gặp"/>
    <View style={styles.results}>{results.map(item=>{const open=expanded===item.name;return <View key={item.name} style={styles.card}><Pressable accessibilityRole="button" accessibilityState={{expanded:open}} onPress={()=>setExpanded(open?null:item.name)} style={styles.row}><GroupIcon id={item.groupId}/><View style={styles.copy}><Text style={styles.name}>{item.name}</Text><Text style={styles.meta}>{item.hazardous?'Nguy hại · Để riêng':groupShort(item.groupId)}{item.certainty==='suy luận'?' · Cần đối chiếu':''}</Text></View><Ionicons name={open?'chevron-up':'chevron-forward'} size={17} color={theme.text}/></Pressable>{open?<View style={styles.detail}><Text style={styles.reason}>{item.why}</Text><Text style={styles.tip}>{item.tip}</Text></View>:null}</View>})}{!results.length?<View style={styles.empty}><Ionicons name="search-outline" size={36} color={theme.textDim}/><Text style={styles.name}>Chưa tìm thấy món này</Text><Text style={styles.reason}>Thử tên ngắn hơn hoặc xem hướng dẫn theo nhóm.</Text></View>:null}</View>
    <View style={styles.warning}><Ionicons name="warning-outline" size={24} color={theme.danger}/><View style={styles.copy}><Text style={styles.warningTitle}>Pin, bóng đèn… cần một chỗ riêng.</Text><Text style={styles.reason}>{getHazardous().note}</Text></View></View>
    <Text style={styles.reference}>Nguồn: QĐ 87/2025/QĐ-UBND trong dự án.{ '\n' }{qd87.review_status}. Mục “Cần đối chiếu” đang chờ soát.</Text>
  </Screen><RuleSheet groupId={picked} onClose={()=>setPicked(null)}/></>;
}
const styles=StyleSheet.create({search:{backgroundColor:theme.card,borderWidth:1,borderColor:theme.border,borderRadius:17,paddingLeft:15,flexDirection:'row',alignItems:'center',minHeight:54,gap:9},input:{flex:1,minWidth:0,minHeight:52,color:theme.text,fontSize:14,paddingVertical:12},clear:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},results:{gap:11,marginTop:-10},card:{backgroundColor:theme.card,borderRadius:19,borderWidth:1,borderColor:theme.border,overflow:'hidden'},row:{padding:15,flexDirection:'row',alignItems:'center',gap:12,minHeight:86},copy:{flex:1},name:{fontSize:14,fontWeight:'700',lineHeight:22,color:theme.text},meta:{fontSize:11,lineHeight:18,color:theme.textDim,marginTop:4},detail:{padding:17,paddingTop:0,gap:12},reason:{fontSize:13,lineHeight:21,color:theme.textDim},tip:{fontSize:13,lineHeight:22,fontWeight:'600',color:theme.text,backgroundColor:theme.soft,padding:13,borderRadius:12},warning:{padding:17,borderRadius:19,backgroundColor:'#FFF0E3',flexDirection:'row',gap:12},warningTitle:{fontSize:14,lineHeight:22,fontWeight:'700',color:theme.danger,marginBottom:7},reference:{fontSize:11,lineHeight:19,color:theme.textDim},empty:{padding:25,alignItems:'center',gap:12}});
