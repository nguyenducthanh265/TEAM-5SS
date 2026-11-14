import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ActionButton,GroupIcon } from './Elements';
import { getGroup,getHazardous } from '@/lib/rules';
import qd87 from '@/assets/qd87.json';
import { theme } from '@/lib/theme';
export function RuleSheet({groupId,onClose}:{groupId:string|null;onClose:()=>void}):React.JSX.Element {
  const group=groupId?getGroup(groupId):undefined,insets=useSafeAreaInsets();
  return <Modal visible={!!group} transparent animationType="slide" onRequestClose={onClose}><View style={styles.root}>
    <Pressable style={styles.backdrop} accessible={false} onPress={onClose}/>
    <ScrollView style={[styles.sheet,{marginTop:insets.top+24}]} contentContainerStyle={[styles.content,{paddingBottom:Math.max(insets.bottom,24)}]} accessibilityViewIsModal>
      <View style={styles.header}><GroupIcon id={groupId||'unknown'}/><Text style={styles.title} accessibilityRole="header">{group?.short}</Text><Pressable accessibilityLabel="Đóng hướng dẫn" accessibilityRole="button" onPress={onClose} style={styles.close}><Ionicons name="close" size={24} color={theme.text}/></Pressable></View>
      <Text style={styles.fullName}>{group?.name}</Text><Text style={styles.body}>{group?.disposal}</Text>
      <Text style={styles.subtitle}>Những món thuộc nhóm này</Text>{group?.examples.map(example=><Text key={example} style={styles.body}>• {example}</Text>)}
      {group?.exceptions.length?<Text style={styles.subtitle}>Cần lưu ý</Text>:null}{group?.exceptions.map(example=><Text key={example} style={styles.body}>• {example}</Text>)}
      {groupId==='other'?<View style={styles.warning}><Text style={styles.warningTitle}>Nguy hại: phải để riêng</Text><Text style={styles.body}>{getHazardous().note}</Text></View>:null}
      <Text style={styles.reference}>{group?.ref} · {qd87.review_status}</Text><ActionButton label="Mình đã hiểu" onPress={onClose}/>
    </ScrollView></View></Modal>;
}
const styles=StyleSheet.create({root:{flex:1,justifyContent:'flex-end'},backdrop:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(23,61,43,.48)'},sheet:{backgroundColor:theme.bg,borderTopLeftRadius:28,borderTopRightRadius:28,flexGrow:0,flexShrink:1},content:{padding:24,gap:16},header:{flexDirection:'row',alignItems:'center',gap:12},title:{fontSize:26,fontWeight:'700',color:theme.text,flex:1},close:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},fullName:{fontSize:16,lineHeight:24,fontWeight:'600',color:theme.text},body:{fontSize:14,lineHeight:23,color:theme.textDim},subtitle:{fontSize:17,fontWeight:'700',color:theme.text,marginTop:8},reference:{fontSize:12,lineHeight:20,color:theme.textDim},warning:{padding:16,borderRadius:18,backgroundColor:'#FFF0E3',gap:8},warningTitle:{fontSize:15,fontWeight:'700',color:theme.danger}});
