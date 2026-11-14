import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal,Pressable,ScrollView,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GroupTiles } from '@/components/ui/GroupTiles';
import { theme } from '@/lib/theme';
interface Props {visible:boolean;itemName:string;currentGroupId:string;hazardous?:boolean;onPick:(groupId:string)=>void;onRemove:()=>void;onClose:()=>void}
export function GroupPickerSheet({visible,itemName,currentGroupId,hazardous=false,onPick,onRemove,onClose}:Props):React.JSX.Element {
  const insets=useSafeAreaInsets();
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}><View style={styles.root}><Pressable style={styles.backdrop} onPress={onClose} accessible={false}/><ScrollView style={[styles.sheet,{marginTop:insets.top+24}]} contentContainerStyle={[styles.content,{paddingBottom:Math.max(insets.bottom,24)}]} accessibilityViewIsModal keyboardShouldPersistTaps="handled">
    <View style={styles.header}><Text style={styles.title} accessibilityRole="header">Chọn lại nhóm</Text><Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="Đóng chọn nhóm" style={styles.close}><Ionicons name="close" size={23} color={theme.text}/></Pressable></View><Text style={styles.name}>{itemName}</Text><Text style={styles.hint}>Bạn là người xác nhận cuối cùng.</Text>
    {hazardous?<Text style={styles.warning}>Món nguy hại phải để riêng; không chuyển sang túi tái chế hoặc thực phẩm.</Text>:null}
    <GroupTiles onPick={onPick} currentId={currentGroupId} disabledIds={hazardous?['recyclable','food']:[]}/>
    <Pressable onPress={onRemove} accessibilityRole="button" style={styles.remove}><Ionicons name="trash-outline" size={18} color={theme.danger}/><Text style={styles.removeText}>Bỏ món này khỏi lượt quét</Text></Pressable>
  </ScrollView></View></Modal>;
}
const styles=StyleSheet.create({root:{flex:1,justifyContent:'flex-end'},backdrop:{position:'absolute',top:0,left:0,right:0,bottom:0,backgroundColor:'rgba(23,61,43,.48)'},sheet:{flexGrow:0,flexShrink:1,backgroundColor:theme.bg,borderTopLeftRadius:28,borderTopRightRadius:28},content:{padding:24,gap:17},header:{flexDirection:'row',alignItems:'center',gap:12},title:{fontSize:25,lineHeight:33,fontWeight:'700',letterSpacing:-.7,color:theme.text,flex:1},close:{minWidth:48,minHeight:48,alignItems:'center',justifyContent:'center'},name:{fontSize:16,lineHeight:24,fontWeight:'600',color:theme.text},hint:{fontSize:14,lineHeight:22,color:theme.textDim},warning:{backgroundColor:'#FFF0E3',color:theme.danger,borderRadius:15,padding:14,fontSize:13,lineHeight:21},remove:{minHeight:52,flexDirection:'row',alignItems:'center',justifyContent:'center',gap:8},removeText:{fontSize:13,color:theme.danger,flexShrink:1}});
