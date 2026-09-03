// components/shared/WorkHoursSummary.tsx
//
// Hours worked and overtime for one month of a placement. Used by both the
// helper and the employer, because the point of the record is that both sides
// see the same numbers.
//
// LAYOUT
//
// Two genuinely different arrangements, not one stretched:
//   mobile   a 2x2 grid of tiles, then overtime days listed underneath. Thumb
//            reach and one column of reading.
//   desktop  a single row of four tiles with the overtime days beside them, so
//            the whole month is one glance with no scrolling.
//
// The 12-hour ceiling is styled as a warning rather than an error: it is a
// contract term, and a helper who worked thirteen hours has done nothing wrong
// — the flag is for the employer.
import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API_URL from '@/constants/api';
import { useResponsive } from '@/hooks/shared';

type DayHours = {
  worked: number | null;
  normal: number | null;
  overtime: number | null;
  over_ceiling: boolean;
  open: boolean;
  label: string | null;
};

type Day = { date: string; hours?: DayHours };

type Totals = {
  days_worked: number;
  hours: number;
  normal: number;
  overtime: number;
  days_over_ceiling: number;
  open_days: number;
  hours_label: string;
  overtime_label: string;
};

const AMBER = '#B26A00';
const AMBER_BG = '#FFF4E3';

export function WorkHoursSummary({
  applicationId,
  userId,
  userType,
  accent,
  year,
  month,
}: {
  applicationId: number;
  userId: number;
  userType: 'helper' | 'parent';
  accent: string;
  /** Defaults to the current month. */
  year?: number;
  month?: number;
}) {
  const { isDesktop } = useResponsive();
  const [totals, setTotals] = useState<Totals | null>(null);
  const [otDays, setOtDays] = useState<Day[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const y = year ?? new Date().getFullYear();
  const m = month ?? new Date().getMonth() + 1;

  const load = useCallback(async () => {
    if (!applicationId || !userId) return;
    setLoading(true);
    setError(null);
    try {
      const url =
        `${API_URL}/v1/applications/attendance_month.php` +
        `?application_id=${applicationId}&user_id=${userId}` +
        `&user_type=${encodeURIComponent(userType)}&year=${y}&month=${m}`;
      const res = await fetch(url);
      const data = await res.json();
      if (!data?.success) {
        setError(data?.message || 'Could not load hours.');
        return;
      }
      setTotals(data.hours_totals ?? null);
      const days: Day[] = Array.isArray(data.days) ? data.days : [];
      setOtDays(days.filter((d) => (d.hours?.overtime ?? 0) > 0));
    } catch {
      setError('Could not load hours. Check your connection.');
    } finally {
      setLoading(false);
    }
  }, [applicationId, userId, userType, y, m]);

  useEffect(() => { void load(); }, [load]);

  if (loading) {
    return (
      <View style={{ padding: 24, alignItems: 'center' }}>
        <ActivityIndicator color={accent} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={{ padding: 16, borderRadius: 14, backgroundColor: '#FDEDED', gap: 8 }}>
        <Text style={{ color: '#B3261E', fontSize: 13 }}>{error}</Text>
        <Pressable onPress={() => void load()} hitSlop={8}>
          <Text style={{ color: '#B3261E', fontWeight: '700', fontSize: 13 }}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  if (!totals || totals.days_worked === 0) {
    return (
      <View style={{ padding: 20, borderRadius: 14, backgroundColor: '#F7F7F5', alignItems: 'center', gap: 6 }}>
        <Ionicons name="time-outline" size={22} color="#8A8A85" />
        <Text style={{ color: '#6B6B66', fontSize: 13, textAlign: 'center' }}>
          No completed days this month yet. Hours appear once a day is checked out.
        </Text>
      </View>
    );
  }

  const tiles = [
    { label: 'Total hours', value: totals.hours_label, tone: 'plain' as const },
    { label: 'Days worked', value: String(totals.days_worked), tone: 'plain' as const },
    { label: 'Regular', value: `${totals.normal}h`, tone: 'plain' as const },
    {
      label: 'Overtime',
      value: totals.overtime > 0 ? totals.overtime_label : '—',
      tone: totals.overtime > 0 ? ('amber' as const) : ('plain' as const),
    },
  ];

  const Tile = ({ label, value, tone }: { label: string; value: string; tone: 'plain' | 'amber' }) => (
    <View
      style={{
        // Desktop shares one row; mobile is a 2-up grid, so the basis differs.
        flexGrow: 1,
        flexBasis: isDesktop ? 0 : '45%',
        minWidth: isDesktop ? 0 : 130,
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 14,
        backgroundColor: tone === 'amber' ? AMBER_BG : '#F7F7F5',
        gap: 4,
      }}
    >
      <Text
        style={{
          fontSize: 11,
          letterSpacing: 0.6,
          textTransform: 'uppercase',
          fontWeight: '700',
          color: tone === 'amber' ? AMBER : '#8A8A85',
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          fontSize: isDesktop ? 24 : 21,
          fontWeight: '800',
          color: tone === 'amber' ? AMBER : '#1F1B16',
          // Digits line up between tiles rather than dancing by glyph width.
          fontVariant: ['tabular-nums'],
        }}
      >
        {value}
      </Text>
    </View>
  );

  const OvertimeList = () => (
    <View style={{ flex: isDesktop ? 1 : undefined, gap: 8 }}>
      <Text style={{ fontSize: 12, fontWeight: '800', color: '#6B6B66', letterSpacing: 0.4 }}>
        DAYS WITH OVERTIME
      </Text>
      {otDays.slice(0, isDesktop ? 8 : 4).map((d) => (
        <View
          key={d.date}
          style={{
            flexDirection: 'row', alignItems: 'center', gap: 10,
            paddingVertical: 9, paddingHorizontal: 12,
            borderRadius: 10,
            backgroundColor: d.hours?.over_ceiling ? AMBER_BG : '#F7F7F5',
          }}
        >
          <Ionicons
            name={d.hours?.over_ceiling ? 'warning-outline' : 'time-outline'}
            size={15}
            color={d.hours?.over_ceiling ? AMBER : '#8A8A85'}
          />
          <Text style={{ flex: 1, fontSize: 13, color: '#1F1B16' }}>
            {new Date(d.date + 'T00:00:00').toLocaleDateString(undefined, {
              weekday: 'short', month: 'short', day: 'numeric',
            })}
          </Text>
          <Text style={{ fontSize: 13, fontWeight: '700', color: '#1F1B16', fontVariant: ['tabular-nums'] }}>
            {d.hours?.label}
          </Text>
          <Text style={{ fontSize: 12, fontWeight: '700', color: AMBER, fontVariant: ['tabular-nums'] }}>
            +{d.hours?.overtime}h
          </Text>
        </View>
      ))}
      {otDays.length > (isDesktop ? 8 : 4) && (
        <Text style={{ fontSize: 12, color: '#8A8A85' }}>
          and {otDays.length - (isDesktop ? 8 : 4)} more
        </Text>
      )}
    </View>
  );

  return (
    <View style={{ gap: 14 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="time" size={17} color={accent} />
        <Text style={{ fontSize: 15, fontWeight: '800', color: '#1F1B16' }}>Hours this month</Text>
      </View>

      {/* Desktop: one row of four. Mobile: 2x2, which keeps every value at a
          readable size instead of four squeezed columns. */}
      <View style={{ flexDirection: 'row', flexWrap: isDesktop ? 'nowrap' : 'wrap', gap: 10 }}>
        {tiles.map((t) => <Tile key={t.label} {...t} />)}
      </View>

      {totals.days_over_ceiling > 0 && (
        <View
          style={{
            flexDirection: 'row', alignItems: 'flex-start', gap: 9,
            padding: 12, borderRadius: 12, backgroundColor: AMBER_BG,
          }}
        >
          <Ionicons name="warning" size={16} color={AMBER} style={{ marginTop: 1 }} />
          <Text style={{ flex: 1, fontSize: 12.5, color: AMBER, lineHeight: 18 }}>
            {totals.days_over_ceiling} day{totals.days_over_ceiling === 1 ? '' : 's'} went past the
            12-hour limit set in the employment contract. Under RA 10361 a normal working day is
            8 hours, and hours beyond that are overtime.
          </Text>
        </View>
      )}

      {otDays.length > 0 && (
        // Side by side on desktop; stacked on mobile, where a two-column layout
        // would make both halves too narrow to read.
        <View style={{ flexDirection: isDesktop ? 'row' : 'column', gap: 14 }}>
          <OvertimeList />
        </View>
      )}

      {totals.open_days > 0 && (
        <Text style={{ fontSize: 12, color: '#8A8A85' }}>
          {totals.open_days} day{totals.open_days === 1 ? '' : 's'} not checked out yet, so not counted.
        </Text>
      )}
    </View>
  );
}
