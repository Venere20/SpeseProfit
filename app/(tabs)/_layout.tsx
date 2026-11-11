import { useState } from 'react';
import { router } from 'expo-router';
import { Tabs, BottomTabBarProps } from 'expo-router/js-tabs';
import { Pressable, Text, View } from 'react-native';
import { Icon, IconName } from '../../src/ui/Icon';
import { romeDate, weekOf } from '../../src/domain/ledger';
import { Sheet } from '../../src/ui/components';
import { colors, styles } from '../../src/ui/theme';
function Navigation({ state, navigation }: BottomTabBarProps) {
  const [open,setOpen]=useState(false);
  const destinations: {name:string;label:string;icon:IconName}[]=[{name:'index',label:'Home',icon:'home'},{name:'movimenti',label:'Movimenti',icon:'list'},{name:'add',label:'Aggiungi movimento',icon:'plus'},{name:'analisi',label:'Analisi',icon:'chart'},{name:'impostazioni',label:'Impostazioni',icon:'settings'}];
  return <><View style={{flexDirection:'row',backgroundColor:colors.navigation,paddingVertical:8,borderTopWidth:1,borderTopColor:colors.line}}>
    {destinations.map(item=>{const selected=state.routes[state.index]?.name===item.name;return <Pressable key={item.name} accessibilityRole="button" accessibilityLabel={item.label} accessibilityState={{selected}} onPress={()=>item.name==='add'?setOpen(true):navigation.navigate(item.name)} style={{flex:1,minHeight:56,alignItems:'center',justifyContent:'center',gap:5}}>
      {item.name==='add'?<View style={{width:54,height:54,borderRadius:27,backgroundColor:colors.accent,alignItems:'center',justifyContent:'center'}}><Icon name="plus" color={colors.onAccent} size={28}/></View>:<><Icon name={item.icon} color={selected?colors.accent:colors.muted}/><Text style={{fontSize:10,color:selected?colors.accent:colors.muted,fontWeight:'500',textAlign:'center'}}>{item.label}</Text></>}
    </Pressable>;})}
  </View><Sheet visible={open} close={()=>setOpen(false)} title="Cosa vuoi aggiungere?">
    {[{title:'Aggiungi spesa',detail:"Registra un'uscita manuale",icon:'bag' as const,path:'/spesa' as const},{title:'Aggiungi incasso',detail:'Aggiorna il totale settimanale',icon:'wallet' as const,path:'/incasso' as const},{title:'Aggiungi rimborso',detail:'Registra una somma rimborsata',icon:'wallet' as const,path:'/rimborso' as const},{title:'Registra prestito',detail:'Soldi prestati o ricevuti',icon:'up' as const,path:'/prestito' as const}].map(a=><Pressable key={a.path} accessibilityRole="button" onPress={()=>{setOpen(false);router.push(a.path==='/incasso'?{pathname:'/incasso',params:{week:weekOf(romeDate())}}:a.path);}} style={[styles.row,{minHeight:76,paddingVertical:12}]}><Icon name={a.icon}/><View style={{flex:1}}><Text style={styles.subheading}>{a.title}</Text><Text style={styles.muted}>{a.detail}</Text></View><Icon name="chevron" size={18}/></Pressable>)}
  </Sheet></>;
}
export default function TabLayout() { return <Tabs detachInactiveScreens={false} tabBar={props=><Navigation {...props}/>} screenOptions={{headerShown:false}}><Tabs.Screen name="index"/><Tabs.Screen name="movimenti"/><Tabs.Screen name="analisi"/><Tabs.Screen name="impostazioni"/></Tabs>; }
