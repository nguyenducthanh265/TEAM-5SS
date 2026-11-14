import React from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { GroupIcon } from './Elements';
import { getGroups } from '@/lib/rules';
import { theme } from '@/lib/theme';
export function GroupTiles({onPick,currentId,disabledIds=[]}:{onPick:(id:string)=>void;currentId?:string;disabledIds?:string[]}):React.JSX.Element {
  return <View style={styles.row}>{getGroups().map(g=>{
    const disabled=disabledIds.includes(g.id);
    return <Pressable key={g.id} accessibilityRole="button" accessibilityLabel={g.short} accessibilityState={{selected:g.id===currentId,disabled}} disabled={disabled} onPress={()=>onPick(g.id)} style={({pressed})=>[styles.tile,g.id===currentId&&styles.selected,(pressed||disabled)&&styles.dim]}><GroupIcon id={g.id}/><Text style={styles.label}>{g.short}</Text></Pressable>;
  })}</View>;
}
const styles=StyleSheet.create({row:{flexDirection:'row',gap:10},tile:{flex:1,minHeight:112,minWidth:0,backgroundColor:theme.card,borderColor:theme.border,borderWidth:1,borderRadius:18,padding:12,gap:12},selected:{borderColor:theme.forest,borderWidth:2},dim:{opacity:.5},label:{fontSize:13,lineHeight:20,fontWeight:'700',color:theme.text,flexShrink:1}});
