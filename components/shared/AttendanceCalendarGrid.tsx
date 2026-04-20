import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

import { theme } from '@/constants/theme';
import type { AttendanceDay } from '@/lib/attendanceApi';
import { attendanceCalendarCellStyle, attendanceDayCellType } from '@/lib/attendanceUi';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type Props = {
  year: number;
  month: number;
  days: AttendanceDay[];
  todayYmd: string;
  onDayPress?: (day: AttendanceDay) => void;
};

export function AttendanceCalendarGrid({ year, month, days, todayYmd, onDayPress }: Props) {
  const byDate = useMemo(() => {
    const m = new Map<string, AttendanceDay>();
    for (const d of days) {
      m.set(d.date, d);
    }
    return m;
  }, [days]);

  const { cells } = useMemo(() => {
    const first = new Date(year, month - 1, 1);
    const jsDow = first.getDay();
    const mondayBased = jsDow === 0 ? 6 : jsDow - 1;
    const dim = new Date(year, month, 0).getDate();
    const out: ({ kind: 'blank' } | { kind: 'day'; day: number })[] = [];
    for (let i = 0; i < mondayBased; i++) {
      out.push({ kind: 'blank' });
    }
    for (let d = 1; d <= dim; d++) {
      out.push({ kind: 'day', day: d });
    }
    return { cells: out };
  }, [year, month]);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        {WEEKDAYS.map((w) => (
          <Text key={w} style={styles.headerCell}>
            {w}
          </Text>
        ))}
      </View>
      <View style={styles.grid}>
        {cells.map((cell, idx) => {
          if (cell.kind === 'blank') {
            return <View key={`b-${idx}`} style={styles.cell} />;
          }
          const ymd = `${year}-${String(month).padStart(2, '0')}-${String(cell.day).padStart(2, '0')}`;
          const row = byDate.get(ymd);
          const isToday = ymd === todayYmd;
          const cellType = row ? attendanceDayCellType(row) : 'future';
          const st = attendanceCalendarCellStyle(cellType, isToday);
          const label = String(cell.day);
          const inner = (
            <View
              style={[
                styles.cellInner,
                {
                  backgroundColor: st.backgroundColor,
                  borderColor: st.borderColor,
                  borderWidth: st.borderWidth,
                },
              ]}
            >
              <Text
                style={[
                  styles.dayNum,
                  (cellType === 'future' || cellType === 'leave') && styles.dayNumDark,
                ]}
                numberOfLines={1}
              >
                {label}
              </Text>
            </View>
          );
          if (!row || !onDayPress) {
            return (
              <View key={ymd} style={styles.cell}>
                {inner}
              </View>
            );
          }
          return (
            <TouchableOpacity
              key={ymd}
              style={styles.cell}
              onPress={() => onDayPress(row)}
              activeOpacity={0.85}
            >
              {inner}
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%' },
  headerRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  headerCell: {
    flex: 1,
    textAlign: 'center',
    fontSize: 11,
    fontWeight: '800',
    color: theme.color.muted,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    width: '14.2857%',
    aspectRatio: 1,
    padding: 3,
  },
  cellInner: {
    flex: 1,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayNum: {
    fontSize: 13,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  dayNumDark: {
    color: theme.color.ink,
  },
});
