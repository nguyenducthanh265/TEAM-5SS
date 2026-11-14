import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Image,Pressable,StyleSheet,Text,View } from 'react-native';
import { GroupIcon } from '@/components/ui/Elements';
import type { ReviewItem } from '@/lib/progress';
import { UNKNOWN_GROUP,getHazardous,groupColor,groupShort } from '@/lib/rules';
import { theme } from '@/lib/theme';

export function groupLabel(groupId:string):{short:string;color:string} {return {short:groupShort(groupId),color:groupColor(groupId)};}
interface Props {uri:string;item:ReviewItem;onPress:()=>void}
export function ReviewItemCard({uri,item,onPress}:Props):React.JSX.Element {
  const label=groupLabel(item.groupId),unknown=item.groupId===UNKNOWN_GROUP.id;
  return <View style={styles.card}>
    <Image source={{uri}} style={styles.image} resizeMode="cover" accessibilityLabel={`Ảnh ${item.name}`}/>
    <View style={styles.content}><View style={styles.nameRow}><Text style={styles.name}>{item.name}</Text><Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Sửa nhóm cho ${item.name}`} style={styles.edit}><Ionicons name="create-outline" size={16} color={theme.text}/><Text style={styles.editText}>Sửa</Text></Pressable></View>
      <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`${label.short}. Chạm để sửa nhóm`} style={[styles.group,{backgroundColor:unknown?'#FFF0E3':`${label.color}10`,borderColor:unknown?theme.warn:`${label.color}30`}]}><Text style={styles.overline}>{unknown?'CẦN BẠN XÁC NHẬN':'HÃY XẾP VÀO NHÓM'}</Text><View style={styles.groupLine}><GroupIcon id={item.groupId}/><Text style={styles.groupName}>{label.short}</Text></View><Text style={styles.reason}>{item.reason}</Text>{item.corrected?<Text style={styles.corrected}>✓ Bạn đã sửa nhóm</Text>:null}</Pressable>
      {item.hazardous?<View style={styles.warning}><Ionicons name="warning-outline" size={22} color={theme.danger}/><View style={{flex:1}}><Text style={styles.warningTitle}>Nguy hại · Phải để riêng</Text><Text style={styles.reason}>{getHazardous().note}</Text></View></View>:null}
      {item.tip?<View style={styles.tip}><Ionicons name="bulb-outline" size={21} color={theme.text}/><View style={{flex:1}}><Text style={styles.tipTitle}>Một bước nhỏ trước khi bỏ</Text><Text style={styles.tipText}>{item.tip}</Text></View></View>:null}
      {item.misplaced?<Text style={styles.reason}>Món nằm sai túi · Đã được bạn nhận ra.</Text>:null}
    </View>
  </View>;
}
const styles=StyleSheet.create({card:{backgroundColor:theme.bg,borderRadius:24,overflow:'hidden'},image:{width:'100%',aspectRatio:1.65,borderRadius:24,backgroundColor:theme.soft},content:{paddingVertical:20,gap:17},nameRow:{flexDirection:'row',alignItems:'flex-start',gap:12},name:{flex:1,fontSize:25,lineHeight:32,fontWeight:'700',letterSpacing:-.7,color:theme.text},edit:{minHeight:48,minWidth:65,padding:10,flexDirection:'row',gap:5,alignItems:'center',justifyContent:'center',borderRadius:24,borderWidth:1,borderColor:theme.border,backgroundColor:theme.card},editText:{fontSize:13,color:theme.text},group:{padding:18,borderRadius:22,borderWidth:1,gap:12},overline:{fontSize:10,lineHeight:16,letterSpacing:1.2,fontWeight:'600',color:theme.textDim},groupLine:{flexDirection:'row',alignItems:'center',gap:10},groupName:{fontSize:26,lineHeight:34,fontWeight:'700',color:theme.text,flex:1},reason:{fontSize:13,lineHeight:21,color:theme.text},corrected:{fontSize:12,color:theme.text,fontWeight:'600'},tip:{flexDirection:'row',gap:12},tipTitle:{fontSize:14,lineHeight:22,color:theme.text,fontWeight:'700'},tipText:{fontSize:13,lineHeight:21,color:theme.textDim,marginTop:5},warning:{padding:16,backgroundColor:'#FFF0E3',borderRadius:18,flexDirection:'row',gap:10},warningTitle:{fontSize:14,lineHeight:22,color:theme.danger,fontWeight:'700',marginBottom:5}});
