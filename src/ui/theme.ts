import { StyleSheet } from 'react-native';
export const colors = {
  bg: '#101C27', brand: '#182735', card: '#223543', input: '#263947', raised: '#304653', navigation: '#1B2D3B',
  ink: '#F4EFE5', muted: '#B9C4CD', accent: '#CDBB98', secondary: '#9C8665', line: '#405563',
  positive: '#A7D5BF', danger: '#E8A7A7', warning: '#EACB8C', white: '#F4EFE5', onAccent: '#182735',
};
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32 };
export const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.bg },
  content: { padding: 16, paddingBottom: 32, gap: 16, width: '100%', maxWidth: 700, alignSelf: 'center' },
  heading: { fontSize: 26, fontWeight: '600', color: colors.ink },
  subheading: { fontSize: 18, fontWeight: '600', color: colors.ink },
  text: { fontSize: 15, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  card: { backgroundColor: colors.card, padding: 16, borderRadius: 16, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  input: { backgroundColor: colors.input, borderWidth: 1, borderColor: colors.line, borderRadius: 12, minHeight: 54, padding: 14, fontSize: 16, color: colors.ink },
  label: { fontSize: 13, fontWeight: '500', color: colors.muted, marginBottom: 7 },
  error: { color: colors.danger, fontSize: 14, lineHeight: 21 },
  badge: { backgroundColor: colors.raised, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10 },
  badgeText: { color: colors.accent, fontSize: 12, fontWeight: '600' },
  divider: { height: 1, backgroundColor: colors.line, marginVertical: 4 },
});
