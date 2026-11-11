import { creditOverview } from '../../src/domain/credits';
import { router } from 'expo-router';
import { Text } from 'react-native';
import { money, romeDate, weekOf } from '../../src/domain/ledger';
import { weeklyBars, weekLabel } from '../../src/domain/analysis';
import { weeklyReport } from '../../src/domain/progress';
import { useRuntime } from '../../src/ui/context';
import { Button, Card, Page } from '../../src/ui/components';
import { WeekSummaryCard, WeeklyBarChart } from '../../src/ui/finance';
import { styles } from '../../src/ui/theme';
import { useToday } from '../../src/ui/useToday';
export default function Home() {
  const {state}=useRuntime(); const today=useToday(); if(!state)return null;
  const credits=creditOverview(state,today); const week=weekOf(today);const total=weeklyReport(state,week).total;
  return <Page title="Panoramica"><Text style={styles.muted}>Questa settimana</Text><Text style={styles.subheading}>{weekLabel(week)}</Text>
    <WeekSummaryCard total={total} home/>
    {total.expenses===0 && <Text style={styles.muted}>Nessuna spesa registrata questa settimana</Text>}
    <Card><Text style={styles.subheading}>Andamento delle spese</Text><WeeklyBarChart bars={weeklyBars(state,week)} selected={week} mode="expenses"/></Card>
    {!!credits.open && <Card><Text style={styles.subheading}>Prestiti aperti</Text><Text style={styles.text}>Da ricevere: {money(credits.receivable)}</Text><Text style={styles.text}>Da restituire: {money(credits.payable)}</Text><Text style={styles.muted}>Separati dal bilancio settimanale</Text></Card>}
    <Button title="Rimborsi e prestiti" secondary onPress={()=>router.push('/rimborsi-prestiti')}/>
    <Button title={state.completedDays?.includes(romeDate())?'Giornata completata · controlla':'Controlla la giornata'} secondary onPress={()=>router.push('/giornata')}/>
  </Page>;
}
