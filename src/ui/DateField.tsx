import { useState } from 'react';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { calendarDays, calendarMonth, displayDate, displayMonth } from '../domain/calendar';
import { romeDate } from '../domain/ledger';
import { Button } from './components';
import { colors, styles } from './theme';

const weekdays = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];

export function DateField({ label, value, onChange, disabled = false }: {
  label: string; value: string; onChange: (date: string) => void; disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(value);
  const today = romeDate();
  const select = (date: string) => { onChange(date); setOpen(false); };
  return <View style={{ gap: 8 }}>
    <Text style={[styles.label, { marginBottom: 0 }]}>{label}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel={label + ': ' + displayDate(value)}
      accessibilityHint="Apre il calendario per scegliere un giorno"
      accessibilityState={{ expanded: open, disabled }} disabled={disabled}
      onPress={() => { if (!open) { Keyboard.dismiss(); setMonth(value); } setOpen(!open); }}
      style={[styles.input, styles.row, { opacity: disabled ? 0.45 : 1 }]}>
      <Text style={[styles.text, { flex: 1 }]}>{displayDate(value)}</Text>
      <Text style={{ color: colors.accent, fontWeight: '700' }}>{open ? 'Chiudi' : 'Calendario'}</Text>
    </Pressable>
    {open && !disabled && <View style={{ borderWidth: 1, borderColor: colors.line, borderRadius: 14, padding: 10, gap: 12 }}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel="Mese precedente"
          onPress={() => setMonth(calendarMonth(month, -1))}
          style={{ padding: 12, minWidth: 48, alignItems: 'center' }}>
          <Text style={{ color: colors.accent, fontSize: 24 }}>‹</Text>
        </Pressable>
        <Text accessibilityRole="header" accessibilityLiveRegion="polite"
          style={[styles.label, { flex: 1, textAlign: 'center', marginBottom: 0 }]}>{displayMonth(month)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel="Mese successivo"
          onPress={() => setMonth(calendarMonth(month, 1))}
          style={{ padding: 12, minWidth: 48, alignItems: 'center' }}>
          <Text style={{ color: colors.accent, fontSize: 24 }}>›</Text>
        </Pressable>
      </View>
      <View style={{ flexDirection: 'row' }}>{weekdays.map(day =>
        <Text key={day} style={[styles.muted, { width: '14.285714%', textAlign: 'center' }]}>{day}</Text>)}</View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
        {calendarDays(month).map(day => {
          const selected = day === value;
          const inMonth = day.slice(0, 7) === month.slice(0, 7);
          return <Pressable key={day} accessibilityRole="button" accessibilityLabel={displayDate(day) + (day === today ? ', oggi' : '')}
            accessibilityState={{ selected }} onPress={() => select(day)}
            style={{ width: '14.285714%', minHeight: 48, paddingVertical: 10, alignItems: 'center', justifyContent: 'center',
              borderRadius: 10, backgroundColor: selected ? colors.accent : 'transparent',
              borderWidth: 1, borderColor: day === today && !selected ? colors.accent : 'transparent' }}>
            <Text style={{ color: selected ? colors.onAccent : inMonth ? colors.ink : colors.muted, fontSize: 15,
              fontWeight: selected || day === today ? '700' : '400' }}>{Number(day.slice(8))}</Text>
          </Pressable>;
        })}
      </View>
      <Button title="Seleziona oggi" secondary onPress={() => select(today)} />
    </View>}
  </View>;
}



