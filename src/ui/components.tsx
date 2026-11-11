import { router, useSegments } from 'expo-router';
import { Icon } from './Icon';
import React, { ReactNode, useEffect, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, TextInputProps, View } from 'react-native';
import { colors, styles } from './theme';
import { useRuntime } from './context';
export function Page({ title, subtitle, children, standalone = false }: { title: string; subtitle?: string; children: ReactNode; standalone?: boolean }) {
  const segments = useSegments();
  const primary = standalone || segments[0] === '(tabs)';
  return <KeyboardAvoidingView style={styles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    {!primary && <View style={{flexDirection:'row',alignItems:'center',paddingHorizontal:8,minHeight:56,width:'100%',maxWidth:700,alignSelf:'center'}}><Pressable accessibilityRole="button" accessibilityLabel="Indietro" onPress={()=>router.canGoBack()?router.back():router.replace('/')} style={{width:48,minHeight:48,alignItems:'center',justifyContent:'center'}}><View style={{transform:[{rotate:'180deg'}]}}><Icon name="chevron"/></View></Pressable><Text accessibilityRole="header" style={[styles.subheading,{flex:1,paddingRight:16}]}>{title}</Text></View>}
    <ScrollView style={styles.page} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {primary && <View style={{ gap: 5 }}><Text style={{ color: colors.accent, fontSize: 11, fontWeight: '600', letterSpacing: 2 }}>SPESEPROFIT</Text><Text accessibilityRole="header" style={styles.heading}>{title}</Text>{subtitle && <Text style={styles.muted}>{subtitle}</Text>}</View>}{children}
    </ScrollView>
  </KeyboardAvoidingView>;
}
export function Card({ children }: { children: ReactNode }) { return <View style={styles.card}>{children}</View>; }
export function Button({ title, onPress, secondary = false, disabled = false, busy = false }: {
  title: string; onPress: () => void; secondary?: boolean; disabled?: boolean; busy?: boolean;
}) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled: disabled || busy }} disabled={disabled || busy} onPress={onPress}
    style={({ pressed }) => ({ backgroundColor: secondary ? colors.input : colors.accent, minHeight: 52, padding: 14, borderRadius: 12,
      opacity: disabled || busy ? 0.45 : pressed ? 0.75 : 1, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 })}>
    {busy && <ActivityIndicator color={secondary ? colors.ink : colors.onAccent} />}
    <Text style={{ color: secondary ? colors.ink : colors.onAccent, fontWeight: '600', fontSize: 15, textAlign: 'center' }}>{title}</Text>
  </Pressable>;
}
export function Field({ label, error, ...props }: TextInputProps & { label: string; error?: string }) {
  const [focused, setFocused] = useState(false);
  const { touchActivity } = useRuntime();
  return <View style={{ gap: 4 }}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} selectionColor={colors.accent} placeholderTextColor={colors.muted}
    {...props} onChangeText={value => { touchActivity(); props.onChangeText?.(value); }} onFocus={e => { touchActivity(); setFocused(true); props.onFocus?.(e); }} onBlur={e => { setFocused(false); props.onBlur?.(e); }}
    style={[styles.input, { borderColor: error ? colors.danger : focused ? colors.accent : colors.line }, props.style]} />
    {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}</View>;
}
export function Choice({ label, selected, onPress, disabled = false }: { label: string; selected: boolean; onPress: () => void; disabled?: boolean }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ checked: selected, disabled }} disabled={disabled} onPress={onPress}
    style={{ opacity: disabled ? 0.45 : 1, minHeight: 48, justifyContent: 'center', paddingHorizontal: 13, paddingVertical: 10, borderRadius: 12, borderWidth: 1,
      borderColor: selected ? colors.accent : colors.line, backgroundColor: selected ? colors.accent : colors.input }}>
    <Text style={{ color: selected ? colors.onAccent : colors.ink, fontWeight: selected ? '600' : '400' }}>{label}</Text>
  </Pressable>;
}
export function Choices({ children }: { children: ReactNode }) { return <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{children}</View>; }
export function Sheet({ visible, close, title, children }: { visible: boolean; close: () => void; title: string; children: ReactNode }) {
  const [reduceMotion,setReduceMotion] = useState(true);
  useEffect(()=>{let live=true;void AccessibilityInfo.isReduceMotionEnabled().then(value=>{if(live)setReduceMotion(value);}).catch(()=>undefined);const sub=AccessibilityInfo.addEventListener('reduceMotionChanged',setReduceMotion);return()=>{live=false;sub.remove();};},[]);
  return <Modal visible={visible} transparent animationType={reduceMotion ? 'none' : 'slide'} onRequestClose={close} statusBarTranslucent>
    <View style={{ flex: 1, justifyContent: 'flex-end' }}>
      <Pressable accessibilityRole="button" accessibilityLabel="Chiudi pannello" onPress={close} style={{ position: 'absolute', inset: 0, backgroundColor: '#00000099' }} />
      <View accessibilityViewIsModal style={{ backgroundColor: colors.raised, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 32, maxHeight: '85%', gap: 16 }}>
        <View style={{ width: 40, height: 4, backgroundColor: colors.muted, borderRadius: 4, alignSelf: 'center' }} /><Text accessibilityRole="header" style={styles.subheading}>{title}</Text>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ gap: 12 }}>{children}</ScrollView>
      </View>
    </View>
  </Modal>;
}
export function EmptyState({ title, detail }: { title: string; detail?: string }) { return <View style={{ gap: 8, paddingVertical: 20 }}><Text style={styles.subheading}>{title}</Text>{detail && <Text style={styles.muted}>{detail}</Text>}</View>; }
