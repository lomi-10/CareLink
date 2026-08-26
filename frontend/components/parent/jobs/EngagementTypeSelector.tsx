// components/parent/jobs/EngagementTypeSelector.tsx
// The RA 10361 scope question, asked before anything else on the job form.
//
// WHY IT EXISTS: CareLink handles kasambahay employment under the Batas
// Kasambahay only. The statute excludes anyone performing domestic work "only
// occasionally or sporadically and not on an occupational basis".
//
// The test is OCCUPATIONAL BASIS, not length. A short live-in engagement that is
// someone's occupation is covered; a neighbour paid once to help move furniture
// is not. So the question asks what KIND of engagement this is, and the app
// imposes no minimum duration — there is no provision that would support one,
// and an invented threshold could not be defended as compliance.
//
// Choosing "one-time task" blocks the post outright: no job post, no contract,
// no placement. The refusal explains itself rather than just disabling a button.

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import { FontFamily } from '@/constants/GlobalStyles';

export type EngagementType = 'recurring' | 'one_time' | '';

const OPTIONS: { key: Exclude<EngagementType, ''>; title: string; body: string; icon: any }[] = [
  {
    key: 'recurring',
    title: 'Recurring household employment',
    body: 'Regular domestic work — a kasambahay, yaya, cook, or household helper employed on an ongoing basis.',
    icon: 'home',
  },
  {
    key: 'one_time',
    title: 'A one-time task',
    body: 'Occasional or sporadic help that is not the person\u2019s occupation — a single cleanup, one day of moving.',
    icon: 'time-outline',
  },
];

export function EngagementTypeSelector({ value, onChange, error, disabled }: {
  value: EngagementType;
  onChange: (v: EngagementType) => void;
  error?: string;
  disabled?: boolean;
}) {
  const blocked = value === 'one_time';

  return (
    <View style={s.wrap}>
      <Text style={s.label}>
        What kind of work is this? <Text style={s.req}>*</Text>
      </Text>
      <Text style={s.hint}>
        CareLink creates employment contracts under the Batas Kasambahay (RA 10361), which covers
        household work done as an occupation.
      </Text>

      <View style={s.options}>
        {OPTIONS.map((o) => {
          const on = value === o.key;
          const warn = on && o.key === 'one_time';
          return (
            <Pressable
              key={o.key}
              disabled={disabled}
              onPress={() => onChange(o.key)}
              style={[
                s.card,
                on && s.cardOn,
                warn && s.cardWarn,
                disabled && { opacity: 0.6 },
              ]}
            >
              <View style={[s.icon, on && s.iconOn, warn && s.iconWarn]}>
                <Ionicons name={o.icon} size={18} color={warn ? '#B91C1C' : on ? '#fff' : theme.color.inkMuted} />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[s.cardTitle, warn && { color: '#B91C1C' }]}>{o.title}</Text>
                <Text style={s.cardBody}>{o.body}</Text>
              </View>
              {on && <Ionicons name={warn ? 'close-circle' : 'checkmark-circle'} size={20} color={warn ? '#B91C1C' : theme.color.parent} />}
            </Pressable>
          );
        })}
      </View>

      {/* The refusal explains itself, at the moment of choosing. */}
      {blocked && (
        <View style={s.blockBox}>
          <Ionicons name="information-circle" size={17} color="#B91C1C" />
          <Text style={s.blockText}>
            One-time and occasional tasks fall outside the Batas Kasambahay, so CareLink cannot post them
            or generate an employment contract for them. If this work is actually regular household
            employment, choose the first option instead.
          </Text>
        </View>
      )}

      {!!error && !blocked && <Text style={s.error}>{error}</Text>}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: theme.space.lg },
  label: { fontSize: theme.font.body, fontFamily: FontFamily.fredokaSemiBold, color: theme.color.ink, marginBottom: 4 },
  req: { color: '#DC2626' },
  hint: { fontSize: 12.5, fontFamily: FontFamily.fredokaRegular, color: theme.color.inkMuted, lineHeight: 18, marginBottom: 10 },
  options: { gap: 10 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.6, borderColor: theme.color.line, borderRadius: theme.radius.lg,
    padding: 13, backgroundColor: theme.color.surface,
  },
  cardOn: { borderColor: theme.color.parent, backgroundColor: theme.color.parentSoft },
  cardWarn: { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' },
  icon: { width: 36, height: 36, borderRadius: 11, backgroundColor: theme.color.surfaceElevated, alignItems: 'center', justifyContent: 'center' },
  iconOn: { backgroundColor: theme.color.parent },
  iconWarn: { backgroundColor: '#FEE2E2' },
  cardTitle: { fontSize: 14, fontFamily: FontFamily.fredokaSemiBold, color: theme.color.ink },
  cardBody: { fontSize: 12, fontFamily: FontFamily.fredokaRegular, color: theme.color.inkMuted, marginTop: 2, lineHeight: 17 },
  blockBox: {
    flexDirection: 'row', gap: 9, alignItems: 'flex-start',
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FCA5A5',
    borderRadius: theme.radius.md, padding: 12, marginTop: 10,
  },
  blockText: { flex: 1, fontSize: 12.5, fontFamily: FontFamily.fredokaRegular, color: '#991B1B', lineHeight: 18 },
  error: { fontSize: 12.5, fontFamily: FontFamily.fredokaSemiBold, color: '#DC2626', marginTop: 8 },
});
