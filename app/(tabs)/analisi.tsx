import { useState } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { displayDate } from '../../src/domain/calendar';
import { dayReport, weeklyBars, weekLabel } from '../../src/domain/analysis';
import { romeDate, validateDate, weekOf } from '../../src/domain/ledger';
import { weeklyReport } from '../../src/domain/progress';
import { Button, Card, Choice, Choices, EmptyState, Page } from '../../src/ui/components';
import { useRuntime } from '../../src/ui/context';
import { MoneyText, TransactionRow, WeekSummaryCard, WeeklyBarChart } from '../../src/ui/finance';
import { MiniWeekCalendar } from '../../src/ui/MiniWeekCalendar';
import { Icon } from '../../src/ui/Icon';
import { styles } from '../../src/ui/theme';
export default function AnalysisRoute() {
  const params=useLocalSearchParams<{day?:string}>(); let initial=romeDate();try{if(typeof params.day==='string')initial=validateDate(params.day);}catch{}
  return <Analysis key={typeof params.day==='string'?initial:'default'} initial={initial}/>;
}
function Analysis({initial}:{initial:string}) {
  const {state,setWeek}=useRuntime();const [day,setDay]=useState(initial);const [anchor,setAnchor]=useState(initial);
  const [mode,setMode]=useState<'day'|'week'>('week');const [chart,setChart]=useState<'expenses'|'balance'>('expenses');const [open,setOpen]=useState(false);
  if(!state)return null;const total=weeklyReport(state,weekOf(day)).total;const daily=dayReport(state,day);
  const choose=(date:string)=>{setDay(date);setAnchor(date);setOpen(false);setWeek(weekOf(date));};
  return <Page title="Analisi"><Choices><Choice label="Giorno" selected={mode==='day'} onPress={()=>setMode('day')}/><Choice label="Settimana" selected={mode==='week'} onPress={()=>setMode('week')}/></Choices>
    <Pressable accessibilityRole="button" accessibilityLabel="Apri calendario" accessibilityState={{expanded:open}} onPress={()=>setOpen(!open)}><Card><View style={styles.row}><Icon name="calendar"/><View style={{flex:1}}><Text style={styles.muted}>{mode==='day'?'Giorno selezionato':'Settimana selezionata'}</Text><Text style={styles.text}>{mode==='day'?displayDate(day):weekLabel(day)}</Text></View><Icon name="chevron" size={18}/></View></Card></Pressable>
    {open && <MiniWeekCalendar value={day} onChange={choose}/>}
    {mode==='day'?<><Card><Text style={styles.subheading}>Riepilogo giornaliero</Text><Text style={styles.muted}>Totale spese del giorno</Text><MoneyText cents={daily.cents} main/><View style={styles.divider}/><View style={styles.row}><Text style={styles.muted}>Numero di movimenti</Text><Text style={styles.subheading}>{daily.count}</Text></View></Card>
      <Card><Text style={styles.subheading}>Le 3 spese più alte</Text>{daily.top.length?daily.top.map(t=><TransactionRow key={t.id} state={state} item={t}/>):<EmptyState title="Nessuna spesa registrata in questo giorno."/>}</Card></>
      :<><WeekSummaryCard total={total}/><Card><Text style={styles.subheading}>Andamento settimanale</Text><Text style={styles.muted}>5 settimane</Text><Choices><Choice label="Spese" selected={chart==='expenses'} onPress={()=>setChart('expenses')}/><Choice label="Bilancio" selected={chart==='balance'} onPress={()=>setChart('balance')}/></Choices><WeeklyBarChart bars={weeklyBars(state,anchor)} selected={day} mode={chart} onSelect={date=>{setDay(date);setWeek(date);}}/></Card>
      <Button title={total.hasCashIncome?'Modifica incasso della settimana':'Inserisci incasso della settimana'} secondary onPress={()=>router.push({pathname:'/incasso',params:{week:weekOf(day)}})}/></>}
    <Button title="Bilancio mensile" secondary onPress={()=>router.push('/mese')}/><Button title="Vista annuale" secondary onPress={()=>router.push('/anno')}/><Button title="Confronta due mesi" secondary onPress={()=>router.push('/confronto')}/><Button title="Differenza accumulata" secondary onPress={()=>router.push('/accumulato')}/>
  </Page>;
}
