// components/shared/LocationSearchInput.tsx
// Searchable Philippine location picker powered by OpenStreetMap Nominatim.
// Completely free — no API key, no account required.
// Nominatim usage policy: max ~1 req/sec (fine for typing).

import React, { useState, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, ActivityIndicator, Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────
export interface LocationResult {
  display_name: string;
  latitude: number;
  longitude: number;
  province: string;
  municipality: string;
  barangay: string;
}

interface Props {
  /** Current values — shown as the "current location" chip */
  province: string;
  municipality: string;
  barangay: string;
  /** Called when the user picks a result */
  onSelect: (result: LocationResult) => void;
  /** Accent colour (helper green / parent blue / peso orange) */
  accentColor?: string;
  disabled?: boolean;
  label?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Nominatim helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Extract Philippine address parts from a Nominatim result */
function parseAddress(item: any): Omit<LocationResult, 'display_name'> {
  const addr = item.address ?? {};

  // Municipality / City — Nominatim uses different keys depending on settlement type
  const municipality =
    addr.city         ||
    addr.town         ||
    addr.municipality ||
    addr.county       ||
    addr.village      ||
    '';

  // Province — Nominatim uses "province" for PH provinces
  const province =
    addr.province ||
    addr.state    ||
    '';

  // Barangay — smaller units sit in "suburb", "neighbourhood", "quarter", or "village"
  // Only use "village" for barangay if a city/town is also present (avoids duplicating municipality)
  const barangay =
    addr.suburb          ||
    addr.neighbourhood   ||
    addr.quarter         ||
    (addr.city || addr.town ? addr.village : '') ||
    '';

  return {
    latitude:    parseFloat(item.lat),
    longitude:   parseFloat(item.lon),
    province:    province.replace(/ Province$/i, ''),
    municipality,
    barangay,
  };
}

/** Build a short, human-readable label for a result */
function shortLabel(r: ReturnType<typeof parseAddress>, display: string): string {
  const parts: string[] = [];
  if (r.barangay)    parts.push(r.barangay);
  if (r.municipality) parts.push(r.municipality);
  if (r.province)     parts.push(r.province);
  return parts.length >= 2 ? parts.join(', ') : display.split(',').slice(0, 3).join(',');
}

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
export function LocationSearchInput({
  province, municipality, barangay,
  onSelect, accentColor, disabled = false, label,
}: Props) {
  const accent = accentColor ?? theme.color.helper;

  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState<LocationResult[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [open,        setOpen]        = useState(false);
  const [error,       setError]       = useState('');
  const debounceRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasLocation = !!(province || municipality);

  // ── Search Nominatim ───────────────────────────────────────────────────────
  const search = useCallback(async (text: string) => {
    if (text.trim().length < 2) { setResults([]); setOpen(false); return; }
    setLoading(true);
    setError('');
    try {
      const url = `https://nominatim.openstreetmap.org/search?` +
        `q=${encodeURIComponent(text + ', Philippines')}` +
        `&format=json&addressdetails=1&countrycodes=ph&limit=7` +
        `&accept-language=en`;

      const res  = await fetch(url, {
        headers: { 'User-Agent': 'CareLink-App/1.0 (carelink.app)' },
      });
      const data: any[] = await res.json();

      const mapped: LocationResult[] = data
        .filter(d => d.address)
        .map(d => {
          const parts = parseAddress(d);
          return {
            display_name: shortLabel(parts, d.display_name),
            ...parts,
          };
        })
        // Deduplicate by municipality+province pair
        .filter((v, i, arr) =>
          arr.findIndex(x =>
            x.municipality === v.municipality &&
            x.province      === v.province     &&
            x.barangay      === v.barangay
          ) === i
        );

      setResults(mapped);
      setOpen(mapped.length > 0);
    } catch {
      setError('Could not reach location service. Check your internet.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChangeText = (text: string) => {
    setQuery(text);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(text), 350);
  };

  const handleSelect = (item: LocationResult) => {
    setOpen(false);
    setQuery('');
    setResults([]);
    Keyboard.dismiss();
    onSelect(item);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setOpen(false);
  };

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={s.wrapper}>
      {label && (
        <Text style={s.label}>
          {label} <Text style={{ color: theme.color.danger }}>*</Text>
        </Text>
      )}

      {/* Current location chip */}
      {hasLocation && !open && (
        <View style={[s.currentChip, { borderColor: accent + '50', backgroundColor: accent + '10' }]}>
          <Ionicons name="location" size={15} color={accent} />
          <Text style={[s.currentChipText, { color: accent }]} numberOfLines={1}>
            {[barangay, municipality, province].filter(Boolean).join(', ')}
          </Text>
          {!disabled && (
            <Text style={[s.changeTxt, { color: accent }]}>  Change</Text>
          )}
        </View>
      )}

      {/* Search box */}
      {!disabled && (
        <View style={[s.searchBox, open && { borderColor: accent, borderBottomLeftRadius: 0, borderBottomRightRadius: 0 }]}>
          <Ionicons name="search-outline" size={17} color={theme.color.muted} style={{ marginRight: 6 }} />
          <TextInput
            style={s.searchInput}
            value={query}
            onChangeText={handleChangeText}
            placeholder={hasLocation ? 'Search to change location…' : 'e.g. Ormoc, Leyte'}
            placeholderTextColor={theme.color.subtle}
            returnKeyType="search"
            autoCorrect={false}
          />
          {loading && <ActivityIndicator size="small" color={accent} style={{ marginLeft: 4 }} />}
          {!loading && query.length > 0 && (
            <TouchableOpacity onPress={handleClear} hitSlop={8}>
              <Ionicons name="close-circle" size={17} color={theme.color.subtle} />
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Error */}
      {error ? <Text style={s.errorTxt}>{error}</Text> : null}

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <View style={[s.dropdown, { borderColor: accent }]}>
          <FlatList
            data={results}
            keyExtractor={(_, i) => String(i)}
            keyboardShouldPersistTaps="always"
            scrollEnabled={results.length > 4}
            style={{ maxHeight: 230 }}
            renderItem={({ item }) => (
              <TouchableOpacity style={s.resultItem} onPress={() => handleSelect(item)} activeOpacity={0.75}>
                <View style={[s.resultIcon, { backgroundColor: accent + '15' }]}>
                  <Ionicons name="location-outline" size={14} color={accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.resultMain} numberOfLines={1}>{item.display_name}</Text>
                  {item.province ? (
                    <Text style={s.resultSub} numberOfLines={1}>{item.province}, Philippines</Text>
                  ) : null}
                </View>
                <Ionicons name="chevron-forward" size={14} color={theme.color.subtle} />
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={s.separator} />}
          />
        </View>
      )}

      {/* No results hint */}
      {open && results.length === 0 && !loading && query.length >= 2 && (
        <View style={s.noResults}>
          <Text style={s.noResultsTxt}>No results found. Try a broader search (e.g., municipality name).</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  wrapper:    { marginBottom: 16 },
  label:      { fontSize: 13, fontWeight: '700', color: theme.color.ink, marginBottom: 6 },

  currentChip:{ flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 8 },
  currentChipText: { flex: 1, fontSize: 13, fontWeight: '600' },
  changeTxt:  { fontSize: 12, fontWeight: '700' },

  searchBox:  { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: theme.color.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform_IOS_padding(), backgroundColor: theme.color.surface },
  searchInput:{ flex: 1, fontSize: 14, color: theme.color.ink, paddingVertical: 8 },

  dropdown:   { borderWidth: 1.5, borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#fff', overflow: 'hidden' },
  resultItem: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 11, gap: 10 },
  resultIcon: { width: 28, height: 28, borderRadius: 7, justifyContent: 'center', alignItems: 'center' },
  resultMain: { fontSize: 14, fontWeight: '600', color: theme.color.ink },
  resultSub:  { fontSize: 12, color: theme.color.muted, marginTop: 1 },
  separator:  { height: 1, backgroundColor: theme.color.surface },

  noResults:  { borderWidth: 1.5, borderTopWidth: 0, borderColor: theme.color.line, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, padding: 12 },
  noResultsTxt: { fontSize: 13, color: theme.color.muted, textAlign: 'center' },

  errorTxt:   { fontSize: 12, color: theme.color.danger, marginTop: 4 },
});

function Platform_IOS_padding() { return 0; }
