// components/shared/SelectField.tsx
//
// One-of-many selector for forms. Shared so the app has ONE select pattern
// instead of a chip row here, a Picker there, and a bespoke dropdown in the
// helper modal.
//
// WHY A SELECT AND NOT CHIPS:
// chips are right for a small set of short, scannable options where seeing them
// all at once IS the value — housing type (5 short words) is a good example.
// They are wrong for a long list: religion has 11 options, several of them long
// ("Seventh-day Adventist", "Prefer not to say"), which wraps to four rows and
// gives an OPTIONAL field more visual weight than the required fields above it.
// That inverts the form's hierarchy. A select collapses it to a single row and
// correctly signals "pick one of many".
//
// DESIGN NOTES
// • Expands INLINE rather than opening a modal. A modal to choose one value is
//   disproportionate, and it steals the form's context.
// • The list is capped and scrolls. Eleven rows fully expanded would push the
//   Save button off-screen — the fix people reach for (a modal) is worse than
//   the fix that works (a max height).
// • Selection is signalled three ways — tinted row, accent text, checkmark — so
//   it survives greyscale and colour-blindness, not just the accent hue.
// • Rows are 44px minimum: the smallest reliable touch target.
// • The open list is elevated so it reads as a layer ABOVE the form rather than
//   as more form content pushed downward.

import React, { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';

export type SelectOption = { value: string; label: string };

/** Warm CareLink defaults; every colour is overridable for role theming. */
const D = {
  ink: '#2A1608',
  muted: '#7A5C3E',
  placeholder: '#B8956A',
  line: '#EDE0D0',
  surface: '#FFFFFF',
  listSurface: '#FFFDF9',
  accent: '#8B5A2B',
};

export function SelectField({
  value,
  onChange,
  options,
  placeholder = 'Select',
  accent = D.accent,
  colors,
  disabled,
  /** Rows visible before the list scrolls. */
  visibleRows = 5,
}: {
  value: string;
  onChange: (v: string) => void;
  options: readonly SelectOption[];
  placeholder?: string;
  accent?: string;
  colors?: Partial<typeof D>;
  disabled?: boolean;
  visibleRows?: number;
}) {
  const [open, setOpen] = useState(false);
  const c = { ...D, ...colors, accent };

  const selected = options.find((o) => o.value === value);
  const ROW_H = 46;

  return (
    <View style={s.wrap}>
      <TouchableOpacity
        style={[
          s.field,
          { backgroundColor: c.surface, borderColor: open ? c.accent : c.line },
          disabled && { opacity: 0.55 },
        ]}
        onPress={() => !disabled && setOpen((o) => !o)}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={selected ? `${placeholder}: ${selected.label}` : placeholder}
        accessibilityState={{ expanded: open, disabled: !!disabled }}
      >
        <Text
          style={[s.value, { color: selected ? c.ink : c.placeholder }]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={open ? c.accent : c.muted} />
      </TouchableOpacity>

      {open && (
        <View style={[s.list, { backgroundColor: c.listSurface, borderColor: c.line }]}>
          <ScrollView
            style={{ maxHeight: ROW_H * visibleRows }}
            showsVerticalScrollIndicator={options.length > visibleRows}
            nestedScrollEnabled
            keyboardShouldPersistTaps="handled"
          >
            {options.map((opt, i) => {
              const on = opt.value === value;
              return (
                <TouchableOpacity
                  key={opt.value}
                  style={[
                    s.row,
                    { minHeight: ROW_H, borderBottomColor: c.line },
                    i === options.length - 1 && { borderBottomWidth: 0 },
                    on && { backgroundColor: accent + '14' },
                  ]}
                  onPress={() => { onChange(opt.value); setOpen(false); }}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityState={{ selected: on }}
                >
                  <Text
                    style={[
                      s.rowText,
                      { color: on ? c.accent : c.ink },
                      on && { fontFamily: FontFamily.fredokaSemiBold },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {on && <Ionicons name="checkmark" size={17} color={c.accent} />}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { marginBottom: 14 },
  field: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1.5, borderRadius: 12,
    paddingHorizontal: 14, minHeight: 48,
    ...Platform.select({ web: { cursor: 'pointer' } as any, default: {} }),
  },
  value: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 15, marginRight: 10 },

  list: {
    marginTop: 6, borderWidth: 1, borderRadius: 12, overflow: 'hidden',
    // Reads as a layer above the form, not as more form content.
    ...Platform.select({
      ios: { shadowColor: '#8B5E3C', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.14, shadowRadius: 14 },
      android: { elevation: 4 },
      default: { boxShadow: '0 8px 22px rgba(139,94,60,0.16)' } as any,
    }),
  },
  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: StyleSheet.hairlineWidth,
    ...Platform.select({ web: { cursor: 'pointer' } as any, default: {} }),
  },
  rowText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 14.5, marginRight: 10 },
});
