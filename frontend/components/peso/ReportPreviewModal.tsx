// components/peso/ReportPreviewModal.tsx
// See the report before committing it to a file.
//
// PESO asked to view the workbook first, and the reason is practical: an export
// is something they file or hand to a supervisor, so discovering a blank column
// or a wrong figure AFTER downloading means doing the whole thing twice.
//
// The preview and the workbook are rendered from the SAME $sheets array on the
// server (peso/export_report.php, ?format=json). A preview assembled from its
// own separate query would drift from the file the first time either side was
// edited, which is worse than having no preview at all.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, ScrollView, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { MotiView } from 'moti';
import API_URL from '@/constants/api';
import { withPesoStaffQuery } from '@/lib/pesoStaffQuery';
import { usePesoTheme, radius, font, type PesoColors } from '@/contexts/PesoThemeContext';

type Sheet = {
  name: string;
  widths?: number[];
  headers?: string[];
  rows?: any[][];
  blocks?: { title: string; headers: string[] | null; rows: any[][] }[];
  total_rows: number;
  shown_rows: number;
  money?: number[];
  dates?: number[];
};

const PREVIEW_LIMIT = 100;
const PESO_SIGN = '\u20B1';

export function ReportPreviewModal({
  visible, onClose, onDownload, downloading,
}: {
  visible: boolean;
  onClose: () => void;
  onDownload: () => void;
  downloading?: boolean;
}) {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<{ sheets: Sheet[]; generated_at: string; file_name: string } | null>(null);
  const [active, setActive] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await withPesoStaffQuery(`${API_URL}/peso/export_report.php?format=json&limit=${PREVIEW_LIMIT}`);
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) { setData(json); setActive(0); }
      else setError(json.message || 'Could not build the preview.');
    } catch {
      setError('Could not reach the server.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (visible) void load(); }, [visible, load]);

  const sheet = data?.sheets?.[active];

  const fmt = (v: any, col: number, sh: Sheet) => {
    if (v === null || v === undefined || v === '') return '—';
    if (sh.dates?.includes(col)) {
      const d = new Date(String(v).replace(' ', 'T'));
      return isNaN(d.getTime()) ? String(v) : d.toLocaleDateString('en-PH', { dateStyle: 'medium' });
    }
    if (sh.money?.includes(col) && !isNaN(Number(v))) return PESO_SIGN + Number(v).toLocaleString();
    return String(v);
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <View style={s.root}>
        <View style={s.bar}>
          <View style={s.barIcon}><Ionicons name="grid" size={17} color={c.accent} /></View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={s.title}>Report preview</Text>
            <Text style={s.sub} numberOfLines={1}>
              {data ? `${data.file_name}  ·  generated ${data.generated_at}` : 'Building the workbook…'}
            </Text>
          </View>
          <Pressable onPress={() => load()} style={s.iconBtn} hitSlop={6}>
            <Ionicons name="refresh" size={17} color={c.muted} />
          </Pressable>
          <Pressable onPress={onClose} style={s.iconBtn} hitSlop={8}>
            <Ionicons name="close" size={20} color={c.muted} />
          </Pressable>
        </View>

        {/* Sheet tabs — the workbook's own tab strip, in the same order */}
        {!!data && (
          <ScrollView
            horizontal showsHorizontalScrollIndicator={false}
            style={s.tabStrip} contentContainerStyle={{ gap: 6, paddingHorizontal: 14 }}
          >
            {data.sheets.map((sh, i) => (
              <Pressable key={sh.name} onPress={() => setActive(i)} style={[s.tab, active === i && s.tabOn]}>
                <Text style={[s.tabText, active === i && s.tabTextOn]}>{sh.name}</Text>
                <View style={[s.tabCount, active === i && { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                  <Text style={[s.tabCountText, active === i && { color: '#fff' }]}>{sh.total_rows}</Text>
                </View>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {loading ? (
          <View style={s.center}>
            <ActivityIndicator size="large" color={c.accent} />
            <Text style={s.centerText}>Building the workbook…</Text>
          </View>
        ) : error ? (
          <View style={s.center}>
            <Ionicons name="alert-circle-outline" size={42} color={c.subtle} />
            <Text style={s.centerText}>{error}</Text>
            <Pressable style={s.retry} onPress={() => load()}><Text style={s.retryText}>Try again</Text></Pressable>
          </View>
        ) : !sheet ? (
          <View style={s.center}><Text style={s.centerText}>Nothing to preview.</Text></View>
        ) : (
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 14 }}>
            {/* The table scrolls sideways inside its own container so the page never does */}
            <ScrollView horizontal showsHorizontalScrollIndicator contentContainerStyle={{ paddingBottom: 8 }}>
              <View>
                {sheet.blocks ? sheet.blocks.map((b) => (
                  <View key={b.title} style={{ marginBottom: 18 }}>
                    <Text style={s.blockTitle}>{b.title}</Text>
                    {!!b.headers && (
                      <View style={s.headRow}>
                        {b.headers.map((h, i) => (
                          <Text key={i} style={[s.th, { width: sheet.widths?.[i] ?? 150 }]} numberOfLines={2}>{h}</Text>
                        ))}
                      </View>
                    )}
                    {b.rows.map((r, ri) => (
                      <View key={ri} style={[s.row, ri % 2 === 1 && { backgroundColor: c.sunken }]}>
                        {r.map((v, ci) => (
                          <Text
                            key={ci}
                            style={[s.td, { width: sheet.widths?.[ci] ?? 150 }, ci === 0 && !b.headers && s.tdLabel]}
                            numberOfLines={2}
                          >
                            {v === '' || v === null ? '' : String(v)}
                          </Text>
                        ))}
                      </View>
                    ))}
                  </View>
                )) : (
                  <>
                    <View style={s.headRow}>
                      {(sheet.headers ?? []).map((h, i) => (
                        <Text key={i} style={[s.th, { width: sheet.widths?.[i] ?? 150 }]} numberOfLines={2}>{h}</Text>
                      ))}
                    </View>
                    {(sheet.rows ?? []).length === 0 ? (
                      <View style={s.emptySheet}>
                        <Ionicons name="document-outline" size={26} color={c.subtle} />
                        <Text style={s.centerText}>This sheet has no rows yet.</Text>
                      </View>
                    ) : (sheet.rows ?? []).map((r, ri) => (
                      <MotiView
                        key={ri}
                        from={{ opacity: 0 }} animate={{ opacity: 1 }}
                        transition={{ type: 'timing', duration: 180, delay: Math.min(ri * 12, 240) }}
                        style={[s.row, ri % 2 === 1 && { backgroundColor: c.sunken }]}
                      >
                        {r.map((v, ci) => (
                          <Text key={ci} style={[s.td, { width: sheet.widths?.[ci] ?? 150 }]} numberOfLines={2} selectable>
                            {fmt(v, ci, sheet)}
                          </Text>
                        ))}
                      </MotiView>
                    ))}
                  </>
                )}
              </View>
            </ScrollView>

            {/* Said plainly: the preview is capped, the download is not. */}
            {sheet.total_rows > sheet.shown_rows && (
              <View style={s.capNote}>
                <Ionicons name="information-circle-outline" size={14} color={c.muted} />
                <Text style={s.capText}>
                  Showing the first {sheet.shown_rows} of {sheet.total_rows} rows. The downloaded file contains all {sheet.total_rows}.
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        <View style={s.footer}>
          <Text style={s.footNote}>
            {sheet ? `${sheet.name}: ${sheet.total_rows} row${sheet.total_rows === 1 ? '' : 's'}` : ''}
          </Text>
          <View style={{ flex: 1 }} />
          <Pressable style={s.cancel} onPress={onClose}><Text style={s.cancelText}>Close</Text></Pressable>
          <Pressable
            style={[s.download, (downloading || !data) && { opacity: 0.5 }]}
            onPress={onDownload}
            disabled={downloading || !data}
          >
            {downloading
              ? <ActivityIndicator color="#fff" size="small" />
              : <Ionicons name="download-outline" size={17} color="#fff" />}
            <Text style={s.downloadText}>{downloading ? 'Preparing…' : 'Download Excel'}</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  root: { flex: 1, backgroundColor: c.canvas },

  bar: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line },
  barIcon: { width: 34, height: 34, borderRadius: 11, backgroundColor: c.accentSoft, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: font.display, fontSize: 16, color: c.ink },
  sub: { fontFamily: font.regular, fontSize: 11.5, color: c.subtle, marginTop: 1 },
  iconBtn: { width: 34, height: 34, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', backgroundColor: c.sunken },

  tabStrip: { flexGrow: 0, backgroundColor: c.surface, borderBottomWidth: 1, borderBottomColor: c.line, paddingVertical: 9 },
  tab: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 7, paddingHorizontal: 13, borderRadius: radius.pill, borderWidth: 1, borderColor: c.line, backgroundColor: c.surface },
  tabOn: { backgroundColor: c.accent, borderColor: c.accent },
  tabText: { fontFamily: font.semibold, fontSize: 12.5, color: c.muted },
  tabTextOn: { color: '#fff' },
  tabCount: { minWidth: 20, paddingHorizontal: 5, borderRadius: 9, backgroundColor: c.sunken, alignItems: 'center' },
  tabCountText: { fontFamily: font.semibold, fontSize: 10.5, color: c.muted },

  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 11, padding: 40 },
  centerText: { fontFamily: font.regular, fontSize: 13, color: c.muted, textAlign: 'center' },
  retry: { paddingVertical: 10, paddingHorizontal: 22, borderRadius: radius.md, borderWidth: 1, borderColor: c.line },
  retryText: { fontFamily: font.semibold, color: c.ink },
  emptySheet: { alignItems: 'center', gap: 8, paddingVertical: 40 },

  blockTitle: { fontFamily: font.semibold, fontSize: 11, letterSpacing: 0.9, textTransform: 'uppercase', color: c.accentInk, marginBottom: 7 },
  headRow: { flexDirection: 'row', backgroundColor: c.accent, borderTopLeftRadius: radius.sm, borderTopRightRadius: radius.sm },
  th: { fontFamily: font.semibold, fontSize: 11, color: '#fff', paddingVertical: 9, paddingHorizontal: 9 },
  row: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.line, backgroundColor: c.surface },
  td: { fontFamily: font.regular, fontSize: 12, color: c.ink, paddingVertical: 8, paddingHorizontal: 9 },
  tdLabel: { fontFamily: font.semibold },

  capNote: { flexDirection: 'row', alignItems: 'center', gap: 7, marginTop: 12, backgroundColor: c.sunken, borderRadius: radius.md, padding: 11 },
  capText: { flex: 1, fontFamily: font.regular, fontSize: 11.5, color: c.muted, lineHeight: 16 },

  footer: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12, backgroundColor: c.surface, borderTopWidth: 1, borderTopColor: c.line },
  footNote: { fontFamily: font.regular, fontSize: 12, color: c.subtle },
  cancel: { paddingVertical: 12, paddingHorizontal: 20, borderRadius: radius.md, borderWidth: 1, borderColor: c.line },
  cancelText: { fontFamily: font.semibold, fontSize: 13.5, color: c.muted },
  download: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 12, paddingHorizontal: 22, borderRadius: radius.md, backgroundColor: c.accent, minWidth: 180 },
  downloadText: { color: '#fff', fontFamily: font.semibold, fontSize: 13.5 },
});
