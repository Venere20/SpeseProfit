import { router } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { money, weekOf } from '../domain/ledger';
import { shortDate, weekLabel } from '../domain/analysis';
import { LedgerState, Transaction, WeeklySummary } from '../domain/model';
import { Card } from './components';
import { CategoryIcon, Icon } from './Icon';
import { colors, styles } from './theme';
export function MoneyText({ cents, main = false }: { cents: number; main?: boolean }) { return <Text style={{ color: colors.ink, fontSize: main ? 32 : 19, fontWeight: '600', fontVariant: ['tabular-nums'], flexShrink: 1 }}>{money(cents)}</Text>; }
export function TransactionRow({ item, state }: { item: Transaction; state: LedgerState }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`${item.description}, ${money(item.cents)}, ${shortDate(item.date)}. Apri dettaglio`} onPress={() => router.push({ pathname: '/movimento', params: { id: item.id } })} style={{ flexDirection:'row', alignItems:'center', gap:12, minHeight:76, paddingVertical:12, borderBottomWidth:1, borderBottomColor:colors.line }}>
    <CategoryIcon id={item.categoryId} /><View style={{ flex:1, gap:3 }}><Text style={[styles.text,{ fontWeight:'500' }]}>{item.description}</Text><Text style={styles.muted}>{state.categories.find(c=>c.id===item.categoryId)?.name} · {shortDate(item.date)}</Text>{item.classification!=='included' && <Text style={styles.muted}>{item.classification==='transfer'?'Trasferimento':'Escluso dal bilancio'}</Text>}</View>
    <Text style={{ color:colors.ink, fontSize:15, fontWeight:'500', fontVariant:['tabular-nums'], maxWidth:'40%', textAlign:'right' }}>{money(item.cents).replace('-','−')}</Text>
  </Pressable>;
}
export function WeekSummaryCard({ total, home = false }: { total: WeeklySummary; home?: boolean }) {
  const label = !total.hasCashIncome ? 'Da completare' : total.balance > 0 ? 'Positivo' : total.balance < 0 ? 'Negativo' : 'In pareggio';
  const color = !total.hasCashIncome ? colors.warning : total.balance < 0 ? colors.danger : total.balance > 0 ? colors.positive : colors.accent;
  return <Card>{!home && <Text style={styles.subheading}>Riepilogo settimanale</Text>}
    {home ? <><Text style={styles.muted}>Entrate settimanali</Text>{total.hasCashIncome ? <MoneyText cents={total.income} main /> : <><Text style={[styles.heading,{ color:colors.warning }]}>Da completare</Text>{total.income>0&&<><MoneyText cents={total.income}/><Text style={styles.muted}>Entrate rilevate dai movimenti</Text></>}</>}<View style={styles.divider}/><View style={[styles.row,{ alignItems:'flex-start' }]}><View style={{ flex:1,gap:6 }}><Text style={styles.muted}>Spese</Text><MoneyText cents={total.expenses}/></View><View style={{ flex:1,gap:6 }}><Text style={styles.muted}>Bilancio</Text>{total.hasCashIncome ? <MoneyText cents={total.balance}/> : <Text style={[styles.text,{color}]}>Da completare</Text>}</View></View></>
    : <><View style={[styles.row,{alignItems:'flex-start'}]}><View style={{flex:1,gap:6}}><Text style={styles.muted}>Entrate</Text>{total.hasCashIncome?<MoneyText cents={total.income}/>:<Text style={[styles.text,{color:colors.warning}]}>Da inserire</Text>}</View><View style={{flex:1,gap:6}}><Text style={styles.muted}>Spese</Text><MoneyText cents={total.expenses}/></View></View><View style={styles.divider}/><Text style={styles.muted}>Bilancio settimanale</Text>{total.hasCashIncome?<MoneyText cents={total.balance} main/>:<Text style={[styles.heading,{color:colors.warning}]}>Da completare</Text>}</>}
    {total.refunds>0&&<View style={styles.row}><Text style={styles.muted}>Rimborsi ricevuti</Text><MoneyText cents={total.refunds}/></View>}
    <View style={{flexDirection:'row',alignItems:'center',gap:8}}><Icon name={!total.hasCashIncome?'warning':total.balance>0?'up':total.balance<0?'down':'equal'} size={18} color={color}/><Text style={[styles.muted,{color}]}>{label}</Text></View>
    {!total.hasCashIncome && <Text style={styles.muted}>Manca l’incasso di questa settimana.</Text>}
  </Card>;
}
export function WeeklyBarChart({ bars, mode, selected, onSelect }: { bars: WeeklySummary[]; mode:'expenses'|'balance'; selected:string; onSelect?:(week:string)=>void }) {
  const values = bars.map(b=>mode==='balance'&&!b.hasCashIncome?null:mode==='expenses'?b.expenses:b.balance);
  const max = Math.max(1,...values.filter((v):v is number=>v!==null).map(Math.abs));
  const negative = values.some(v=>v!==null && v<0); const zero = negative?76:132;
  return <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{flexGrow:1}}><View style={{flexDirection:'row',flex:1,minWidth:300}}>
    {bars.map((bar,index)=>{const v=values[index]!;const active=bar.weekStart===weekOf(selected);const height=v===null?0:Math.abs(v)/max*(negative?64:112);
      return <Pressable key={bar.weekStart} disabled={!onSelect} accessibilityRole={onSelect?'button':'text'} accessibilityState={{selected:active}} accessibilityLabel={`Settimana ${weekLabel(bar.weekStart)}. ${mode==='expenses'?'Spese registrate':'Bilancio'}: ${v===null?'da completare':money(v)}${active?'. Settimana selezionata':''}`} onPress={()=>onSelect?.(bar.weekStart)} style={{flex:1,minWidth:60,paddingHorizontal:3,gap:8}}>
        <Text style={{color:active?colors.accent:colors.ink,fontSize:12,textAlign:'center',fontVariant:['tabular-nums']}}>{v===null?'—':`${Math.round(v/100)} €`}</Text>
        <View style={{height:152}}><View style={{position:'absolute',top:zero,left:0,right:0,height:1,backgroundColor:colors.line}}/>{v!==null && <View style={{position:'absolute',left:'24%',width:'52%',top:v<0?zero:zero-(v===0?2:height),height:v===0?2:height,backgroundColor:active?colors.accent:colors.line,borderRadius:4}}/>}</View>
        <Text style={{color:active?colors.accent:colors.muted,textAlign:'center',fontSize:12}}>{new Intl.DateTimeFormat('it-IT',{day:'numeric',month:'short',timeZone:'UTC'}).format(new Date(bar.weekStart+'T12:00:00Z'))}</Text>
      </Pressable>;
    })}
  </View></ScrollView>;
}
