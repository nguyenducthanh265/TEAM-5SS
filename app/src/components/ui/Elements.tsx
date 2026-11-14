import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { theme } from '@/lib/theme';
import { groupColor } from '@/lib/rules';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export function GroupIcon({ id, size=22 }: { id: string; size?: number }): React.JSX.Element {
  const name: IconName = id==='recyclable'?'refresh-outline':id==='food'?'nutrition-outline':'trash-outline';
  return <View style={[styles.groupIcon, { backgroundColor: `${groupColor(id)}15` }]}><Ionicons name={name} size={size} color={groupColor(id)} /></View>;
}
export function Heading({ eyebrow, title, description }: { eyebrow?: string; title: string; description?: string }): React.JSX.Element {
  return <View style={styles.heading}>{eyebrow?<Text style={styles.eyebrow}>{eyebrow}</Text>:null}<Text accessibilityRole="header" style={styles.title}>{title}</Text>{description?<Text style={styles.description}>{description}</Text>:null}</View>;
}
export function ActionButton({ label, onPress, icon, secondary=false, disabled=false, busy=false }: { label: string; onPress: ()=>void; icon?: IconName; secondary?: boolean; disabled?: boolean; busy?: boolean }): React.JSX.Element {
  return <Pressable onPress={onPress} disabled={disabled||busy} accessibilityRole="button" accessibilityState={{ disabled: disabled||busy, busy }} style={({pressed})=>[styles.button,secondary&&styles.secondary,(pressed||disabled||busy)&&styles.pressed]}>{busy?<ActivityIndicator color={theme.text}/>:icon?<Ionicons name={icon} size={22} color={theme.text}/>:null}<Text style={styles.buttonText}>{label}</Text></Pressable>;
}
export function ErrorNotice({ message, onRetry }: {message: string; onRetry?:()=>void}): React.JSX.Element {
  return <View style={styles.error}><Text accessibilityRole="alert" style={styles.errorText}>{message}</Text>{onRetry?<ActionButton label="Thử tải lại" onPress={onRetry} secondary/>:null}</View>;
}
export function SectionTitle({ title, action, onPress }: { title: string; action?: string; onPress?:()=>void }): React.JSX.Element {
  return <View style={styles.section}><Text accessibilityRole="header" style={styles.sectionTitle}>{title}</Text>{action&&onPress?<Pressable onPress={onPress} accessibilityRole="button" style={styles.sectionAction}><Text style={styles.actionText}>{action}</Text><Ionicons name="chevron-forward" size={14} color={theme.textDim}/></Pressable>:null}</View>;
}
const styles=StyleSheet.create({
  heading:{gap:9},eyebrow:{fontSize:11,fontWeight:'700',letterSpacing:1.5,color:theme.textDim,lineHeight:17},title:{fontSize:31,lineHeight:39,fontWeight:'700',letterSpacing:-1.1,color:theme.text},description:{fontSize:14,lineHeight:22,color:theme.textDim},
  button:{minHeight:56,borderRadius:18,backgroundColor:theme.primary,flexDirection:'row',alignItems:'center',justifyContent:'center',padding:14,gap:10},secondary:{backgroundColor:theme.card,borderColor:theme.border,borderWidth:1},buttonText:{fontSize:16,lineHeight:23,fontWeight:'700',color:theme.text,textAlign:'center',flexShrink:1},pressed:{opacity:.55},
  error:{padding:16,borderRadius:18,backgroundColor:'#FFF0E3',gap:12},errorText:{fontSize:14,lineHeight:22,color:theme.danger},
  groupIcon:{width:42,height:42,borderRadius:13,alignItems:'center',justifyContent:'center'},section:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',gap:8},sectionTitle:{fontSize:18,lineHeight:25,fontWeight:'700',color:theme.text,letterSpacing:-.4,flex:1},sectionAction:{minHeight:48,flexDirection:'row',alignItems:'center',gap:3},actionText:{fontSize:12,color:theme.textDim},
});
