import { useState } from 'react';
import { Text, View, Pressable } from 'react-native';
import { romeDate } from '../../src/domain/ledger';
import { searchMovements } from '../../src/domain/search';
import { Card, Choice, Choices, EmptyState, Field, Page, Sheet, Button } from '../../src/ui/components';
import { useRuntime } from '../../src/ui/context';
import { TransactionRow } from '../../src/ui/finance';
import { Icon } from '../../src/ui/Icon';
import { styles, colors } from '../../src/ui/theme';
import { DateField } from '../../src/ui/DateField';
export default function Transactions() {
  const {state,week}=useRuntime();const [query,setQuery]=useState('');const [category,setCategory]=useState('all');const [open,setOpen]=useState(false);const [limit,setLimit]=useState(30);
  const [origin,setOrigin]=useState<'all'|'card'|'cash'|'account'>('all');const [period,setPeriod]=useState<'all'|'week'|'range'>('all');const [from,setFrom]=useState(romeDate());const [to,setTo]=useState(romeDate());
  if(!state)return null;let error='';let list:ReturnType<typeof searchMovements>=[];
  try{list=searchMovements(state,{query,category,origin,period,week,from,to});}catch(e){error=(e as Error).message;}
  const reset=()=>{setQuery('');setCategory('all');setOrigin('all');setPeriod('all');setLimit(30);};
  return <Page title="Movimenti"><View style={[styles.row,{alignItems:'flex-end'}]}><View style={{flex:1}}><Field label="Ricerca" style={{paddingLeft:42,paddingRight:query?48:14}} placeholder="Cerca spesa..." value={query} onChangeText={v=>{setQuery(v);setLimit(30);}}/><View pointerEvents="none" style={{position:'absolute',left:14,bottom:16}}><Icon name="search" size={20}/></View>{!!query&&<Pressable accessibilityRole="button" accessibilityLabel="Cancella ricerca" onPress={()=>setQuery('')} style={{position:'absolute',right:0,bottom:0,width:48,height:54,alignItems:'center',justifyContent:'center'}}><Text style={{color:colors.muted,fontSize:24}}>×</Text></Pressable>}</View><Pressable accessibilityRole="button" accessibilityLabel="Filtra per categoria" onPress={()=>setOpen(true)} style={{width:52,height:54,borderRadius:12,backgroundColor:category!=='all'||period!=='all'||origin!=='all'?colors.raised:colors.input,alignItems:'center',justifyContent:'center'}}><Icon name="filter"/></Pressable></View>
    {category!=='all' && <Button title={`${state.categories.find(c=>c.id===category)?.name} · Rimuovi filtro`} secondary onPress={()=>setCategory('all')}/>}
    <Card><View style={styles.row}><Text style={styles.subheading}>Spese recenti</Text><Text style={styles.muted}>{list.length}</Text></View>{!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {list.slice(0,limit).map(t=><TransactionRow key={t.id} item={t} state={state}/>)}
      {!list.length && <EmptyState title={state.transactions.some(t=>t.cents<0)?'Nessun movimento trovato':'Nessuna spesa registrata'} detail={state.transactions.some(t=>t.cents<0)?"Prova un'altra ricerca o rimuovi i filtri.":'Le spese che aggiungerai compariranno qui.'}/>}
      {!list.length && <Button title="Azzera filtri" secondary onPress={reset}/>} {list.length>limit && <Button title="Mostra altri movimenti" secondary onPress={()=>setLimit(limit+30)}/>}
    </Card>
    <Sheet title="Filtra movimenti" visible={open} close={()=>setOpen(false)}><Text style={styles.label}>Categoria</Text><Choices><Choice label="Tutte" selected={category==='all'} onPress={()=>setCategory('all')}/>{state.categories.filter(c=>c.kind==='expense').map(c=><Choice key={c.id} label={c.name} selected={c.id===category} onPress={()=>setCategory(c.id)}/>)}</Choices>
      <Text style={styles.label}>Pagamento</Text><Choices>{(['all','card','cash','account'] as const).map(v=><Choice key={v} label={{all:'Tutti',card:'Carta',cash:'Contanti',account:'Conto / bonifico'}[v]} selected={v===origin} onPress={()=>setOrigin(v)}/>)}</Choices>
      <Text style={styles.label}>Periodo</Text><Choices>{(['all','week','range'] as const).map(v=><Choice key={v} label={{all:'Tutto lo storico',week:'Settimana selezionata',range:'Intervallo'}[v]} selected={v===period} onPress={()=>setPeriod(v)}/>)}</Choices>{period==='range' && <><DateField label="Dal" value={from} onChange={setFrom}/><DateField label="Al" value={to} onChange={setTo}/></>}
      <Button title="Mostra risultati" onPress={()=>setOpen(false)}/><Button title="Azzera filtri" secondary onPress={reset}/>
    </Sheet>
  </Page>;
}
