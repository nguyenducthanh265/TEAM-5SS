import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { Pressable,StyleSheet,Text,View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { IconName } from '@/components/ui/Elements';
import { theme } from '@/lib/theme';
const labels:Record<string,{label:string;icon:IconName}>={index:{label:'Trang chủ',icon:'home-outline'},guide:{label:'Cẩm nang',icon:'book-outline'},scan:{label:'Quét',icon:'scan-outline'},garden:{label:'Cây xanh',icon:'leaf-outline'},stats:{label:'Thống kê',icon:'stats-chart-outline'}};
type TabBarProps=Parameters<NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>>[0];
function EcoTabBar({state,emitter,navigateToTab}:TabBarProps):React.JSX.Element|null {
  const insets=useSafeAreaInsets();if(state.routes[state.index].name==='scan')return null;
  return <View style={[styles.bar,{paddingBottom:Math.max(insets.bottom,10)}]}>{state.routes.map((route,index)=>{
    const entry=labels[route.name];if(!entry)return null;const selected=state.index===index,isScan=route.name==='scan';
    return <Pressable key={route.key} accessibilityRole="button" accessibilityLabel={isScan?'Quét rác':entry.label} accessibilityState={{selected}} onPress={()=>{const event=emitter.emit({type:'tabPress',target:route.key,canPreventDefault:true});if(!selected&&!event.defaultPrevented)navigateToTab(route.key)}} style={({pressed})=>[styles.item,pressed&&{opacity:.6}]}><View style={isScan?styles.scanIcon:styles.icon}><Ionicons name={entry.icon} size={isScan?28:23} color={selected||isScan?theme.text:theme.textDim}/></View><Text style={[styles.label,(selected||isScan)&&styles.selected]}>{entry.label}</Text>{selected&&!isScan?<View style={styles.dot}/>:null}</Pressable>;
  })}</View>;
}
export default function TabsLayout():React.JSX.Element {
  return <Tabs tabBar={props=><EcoTabBar {...props}/>} screenOptions={{headerShown:false,animation:'none'}}><Tabs.Screen name="index" options={{title:'Trang chủ'}}/><Tabs.Screen name="guide" options={{title:'Cẩm nang'}}/><Tabs.Screen name="scan" options={{title:'Quét'}}/><Tabs.Screen name="garden" options={{title:'Cây xanh'}}/><Tabs.Screen name="stats" options={{title:'Thống kê'}}/></Tabs>;
}
const styles=StyleSheet.create({bar:{backgroundColor:theme.bg,borderTopWidth:1,borderTopColor:theme.border,flexDirection:'row',paddingTop:8,minHeight:80},item:{flex:1,alignItems:'center',justifyContent:'flex-start',minHeight:60,gap:4,paddingHorizontal:2},icon:{height:32,alignItems:'center',justifyContent:'center'},scanIcon:{height:76,width:76,borderWidth:6,borderColor:theme.bg,borderRadius:40,backgroundColor:theme.primary,alignItems:'center',justifyContent:'center',marginTop:-32},label:{fontSize:10,lineHeight:16,color:theme.textDim,textAlign:'center'},selected:{color:theme.text,fontWeight:'700'},dot:{width:4,height:4,borderRadius:2,backgroundColor:theme.text}});
