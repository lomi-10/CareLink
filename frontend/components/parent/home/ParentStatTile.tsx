// components/parent/home/ParentStatTile.tsx
// Compact "My Hiring Activity" stat tile — small icon, modest number size
// (per reference mockup, the counts read small/secondary, not oversized),
// with a "View all" link beneath. Used on the parent dashboard only.

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FontFamily } from '@/constants/GlobalStyles';
import { CARD_BG, DARK, MUTED, DIVIDER } from './parentWarmTheme';

interface ParentStatTileProps {
  icon:    keyof typeof Ionicons.glyphMap;
  color:   string;
  iconBg:  string;
  value:   number;
  label:   string;
  onPress?: () => void;
}

export function ParentStatTile({ icon, color, iconBg, value, label, onPress }: ParentStatTileProps) {
  return (
    <View style={s.tile}>
      <View style={[s.iconWrap, { backgroundColor: iconBg }]}>
        <Ionicons name={icon} size={16} color={color} />
      </View>
      <Text style={s.value}>{value}</Text>
      <Text style={s.label} numberOfLines={1}>{label}</Text>
      {onPress && (
        <TouchableOpacity onPress={onPress} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
          <Text style={[s.viewAll, { color }]}>View all</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  tile: {
    flex: 1,
    minWidth: 78,
    backgroundColor: CARD_BG,
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 10,
    alignItems: 'flex-start',
    gap: 2,
    borderWidth: 1,
    borderColor: DIVIDER,
    ...Platform.select({
      ios:     { shadowColor: '#8B5A2B', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 },
      android: { elevation: 1 },
      default: { boxShadow: '0 2px 10px rgba(139,90,43,0.07)' } as any,
    }),
  },
  iconWrap: {
    width: 30, height: 30, borderRadius: 9,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 4,
  },
  value: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  label: { fontFamily: FontFamily.fredokaRegular, fontSize: 10.5, color: MUTED },
  viewAll: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, marginTop: 3 },
});
