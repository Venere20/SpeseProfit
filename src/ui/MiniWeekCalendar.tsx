import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { calendarDays, calendarMonth, displayDate, displayMonth } from '../domain/calendar';
import { weekOf } from '../domain/ledger';
import { colors, styles } from './theme';
export function MiniWeekCalendar({ value, onChange }: { value:string; onChange:(day:string)=>void }) {
  const [month,setMonth]=useState(value); const week=weekOf(value);
  return <View style={[styles.card,{paddingHorizontal:8}]}><View style={styles.row}>
    <Pressable accessibilityRole="button" accessibilityLabel="Mese precedente" onPress={()=>setMonth(calendarMonth(month,-1))} style={{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center'}}><Text style={{color:colors.accent,fontSize:26}}>‹</Text></Pressable>
    <Text style={[styles.subheading,{flex:1,textAlign:'center',textTransform:'capitalize'}]}>{displayMonth(month)}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Mese successivo" onPress={()=>setMonth(calendarMonth(month,1))} style={{minWidth:48,minHeight:48,justifyContent:'center',alignItems:'center'}}><Text style={{color:colors.accent,fontSize:26}}>›</Text></Pressable></View>
    <View style={{flexDirection:'row'}}>{['L','M','M','G','V','S','D'].map((d,i)=><Text key={i} style={[styles.muted,{flex:1,textAlign:'center'}]}>{d}</Text>)}</View>
    <View style={{flexDirection:'row',flexWrap:'wrap'}}>{calendarDays(month).map((day,i)=>{const selected=weekOf(day)===week;const active=day===value;return <Pressable key={day} accessibilityRole="button" accessibilityLabel={displayDate(day)} accessibilityState={{selected:active}} onPress={()=>onChange(day)} style={{width:'14.285714%',minHeight:48,alignItems:'center',justifyContent:'center',backgroundColor:selected?colors.accent:'transparent',borderTopLeftRadius:i%7===0?12:0,borderBottomLeftRadius:i%7===0?12:0,borderTopRightRadius:i%7===6?12:0,borderBottomRightRadius:i%7===6?12:0}}>
      <Text style={{fontSize:15,color:selected?colors.onAccent:day.slice(0,7)===month.slice(0,7)?colors.ink:colors.muted,fontWeight:active?'700':'400'}}>{Number(day.slice(8))}</Text><View style={{height:4,width:4,borderRadius:2,marginTop:3,backgroundColor:active?colors.onAccent:'transparent'}}/>
    </Pressable>;})}</View></View>;
}
