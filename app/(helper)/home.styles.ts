// app/(helper)/home.styles.ts
import { StyleSheet } from 'react-native';
import { theme } from '@/constants/theme';

export const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: "transparent" },
  mainContent: { flex: 1 },
  scrollContent: { padding: 32, paddingBottom: 60 },
  statsGrid: { flexDirection: 'row', gap: 20, marginBottom: 40 },
  mobileScrollContent: { padding: 16, paddingBottom: 40 },
  mobileStatsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  quickActionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 32 },
});