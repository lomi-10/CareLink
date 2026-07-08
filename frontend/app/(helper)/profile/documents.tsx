// app/(helper)/profile/documents.tsx
// Documents & Verification — four fixed document cards (Valid ID, Barangay,
// Police, TESDA NC2). Each card uploads its file in place, then opens the
// Document Details screen where AI scanning starts automatically.
// PHP: helper/get_profile.php (list), helper/upload_documents.php (upload),
//      helper/get_documents.php (resolve new id), helper/scan_id.php (AI scan)

import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState, useMemo } from 'react';
import {
  ActivityIndicator, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { useHelperProfile } from '@/hooks/helper';
import { HelperTabBar } from '@/components/helper/home';
import { NotificationModal } from '@/components/shared';
import { useProfileTheme } from './profile.theme';
import { createStyles } from './documents.styles';

// ─── The four required documents (fixed order) ────────────────────────────────
type DocSlot = {
  type: string;
  field: string; // upload_documents.php form field name
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  desc: string;
};

const DOC_SLOTS: DocSlot[] = [
  { type: 'Valid ID',           field: 'valid_id',           icon: 'card-outline',          color: '#2563EB', bg: '#DBEAFE', desc: 'Government ID — front & back' },
  { type: 'Barangay Clearance', field: 'barangay_clearance', icon: 'document-text-outline', color: '#059669', bg: '#D1FAE5', desc: 'Issued by your barangay' },
  { type: 'Police Clearance',   field: 'police_clearance',   icon: 'shield-outline',        color: '#7C3AED', bg: '#EDE9FE', desc: 'PNP police clearance' },
  { type: 'TESDA NC2',          field: 'tesda_nc2',          icon: 'ribbon-outline',        color: '#E86019', bg: '#FEE2D5', desc: 'NC II certificate' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DocumentsScreen() {
  const router = useRouter();
  const t = useProfileTheme();
  const { GREEN, MUTED, ORANGE, DARK } = t;
  const s = useMemo(() => createStyles(t), [t]);
  const { profileData, loading, refresh } = useHelperProfile();

  const [activeTab, setActiveTab] = useState<'docs' | 'history'>('docs');
  const [busyType, setBusyType]   = useState<string | null>(null);
  const [notice, setNotice]       = useState<{ visible: boolean; title?: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({ visible: false, message: '', type: 'info' });

  const showNotice = (message: string, type: typeof notice.type = 'error', title?: string) =>
    setNotice({ visible: true, title, message, type });

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FBF5EC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  const documents = profileData?.documents ?? [];
  const verified  = documents.filter((d: any) => d.status === 'Verified').length;
  const uploadedCount = DOC_SLOTS.filter((slot) => documents.some((d: any) => d.document_type === slot.type)).length;

  const getDoc = (type: string): any => documents.find((d: any) => d.document_type === type);

  const goToDetail = (doc: any, autoscan: boolean) => {
    router.push({
      pathname: '/(helper)/profile/document-detail',
      params: {
        document_id:      doc.document_id      ?? '',
        document_type:    doc.document_type    ?? '',
        file_url:         doc.file_url         ?? '',
        file_path:        doc.file_path        ?? '',
        status:           doc.status           ?? 'Pending',
        uploaded_at:      doc.uploaded_at       ?? '',
        autoscan:         autoscan ? '1' : '',
        ai_status:        doc.ai_verification_status ?? '',
        ai_confidence_score: doc.ai_confidence_score != null ? String(doc.ai_confidence_score) : '',
        ai_extracted_data:   doc.ai_extracted_data ? JSON.stringify(doc.ai_extracted_data) : '',
        expiry_date:      doc.expiry_date      ?? '',
        verified_by:      doc.verified_by      ?? '',
        verified_at:      doc.verified_at      ?? '',
        rejection_reason: doc.rejection_reason ?? '',
      },
    } as never);
  };

  // Re-fetch documents and return the freshest record for a type (to get its id).
  const fetchDocByType = async (userId: string, type: string) => {
    try {
      const res = await fetch(`${API_URL}/helper/get_documents.php?user_id=${encodeURIComponent(userId)}&requester_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      const list = Array.isArray(data?.documents) ? data.documents : [];
      return list.find((d: any) => d.document_type === type) ?? null;
    } catch {
      return null;
    }
  };

  // Pick a single image/PDF; returns null if cancelled.
  const pickOne = async (fallbackName: string) => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'], copyToCacheDirectory: true, multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return null;
    const asset = result.assets[0];
    let name = asset.name || fallbackName;
    const mime = asset.mimeType || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
    if (!/\.[a-z0-9]+$/i.test(name)) name += mime.includes('pdf') ? '.pdf' : mime.includes('png') ? '.png' : '.jpg';
    return { uri: asset.uri, name, mime };
  };

  const appendFile = async (fd: FormData, field: string, f: { uri: string; name: string; mime: string }) => {
    if (Platform.OS === 'web') {
      const blob = await (await fetch(f.uri)).blob();
      fd.append(field, blob, f.name);
    } else {
      // @ts-ignore — RN FormData file shape
      fd.append(field, { uri: f.uri, name: f.name, type: f.mime });
    }
  };

  const pickAndUpload = async (slot: DocSlot) => {
    if (busyType) return;
    try {
      const isValidId = slot.field === 'valid_id';

      const front = await pickOne(`${slot.field}_front`);
      if (!front) return;

      // A Valid ID needs BOTH sides — the picker reopens for the back right away.
      let back: { uri: string; name: string; mime: string } | null = null;
      if (isValidId) {
        back = await pickOne('valid_id_back');
        if (!back) {
          showNotice('A Valid ID needs both the front and back. Please upload again and pick both photos (front first, then back).', 'warning', 'Front & back required');
          return;
        }
      }

      setBusyType(slot.type);
      const userData = await AsyncStorage.getItem('user_data');
      const userId = String(JSON.parse(userData || '{}')?.user_id || '');
      if (!userId) throw new Error('Please sign in again.');

      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('requester_id', userId);
      await appendFile(fd, slot.field, front);
      if (back) await appendFile(fd, 'valid_id_back', back);

      const res = await fetch(`${API_URL}/helper/upload_documents.php`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Upload failed. Please try again.');

      const newDoc = await fetchDocByType(userId, slot.type);
      refresh();
      if (newDoc) {
        goToDetail(newDoc, true); // proceed to details + start scanning immediately
      } else {
        showNotice('Uploaded, but we could not open the scan screen. Please tap the card.', 'warning', 'Uploaded');
      }
    } catch (e: any) {
      showNotice(e?.message || 'Could not upload this document.', 'error');
    } finally {
      setBusyType(null);
    }
  };

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>Documents & Verification</Text>
          <View style={[s.barShield, { backgroundColor: '#D1FAE5' }]}>
            <Ionicons name="shield-checkmark" size={18} color={GREEN} />
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Safety Banner */}
          <View style={s.banner}>
            <View style={[s.bannerIcon, { backgroundColor: '#FEE2D5' }]}>
              <Ionicons name="shield-checkmark" size={24} color={ORANGE} />
            </View>
            <View style={s.bannerText}>
              <Text style={s.bannerTitle}>Your safety, our priority</Text>
              <Text style={s.bannerSub}>All documents are encrypted and securely stored. We never share your documents without your consent.</Text>
            </View>
          </View>

          {/* Tab toggle */}
          <View style={s.tabRow}>
            <TouchableOpacity
              style={[s.tab, activeTab === 'docs' && s.tabActive]}
              onPress={() => setActiveTab('docs')}
              activeOpacity={0.85}
            >
              <Text style={[s.tabText, activeTab === 'docs' && s.tabTextActive]}>
                My Documents ({uploadedCount}/{DOC_SLOTS.length})
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.tab, activeTab === 'history' && s.tabActive]}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.85}
            >
              <Text style={[s.tabText, activeTab === 'history' && s.tabTextActive]}>
                Verification History
              </Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'docs' ? (
            <View style={c.grid}>
              {DOC_SLOTS.map((slot) => {
                const doc = getDoc(slot.type);
                const uploaded = !!doc;
                const isVerified = doc?.status === 'Verified';
                const isRejected = doc?.status === 'Rejected';
                const busy = busyType === slot.type;
                const uploadDate = doc?.uploaded_at
                  ? new Date(doc.uploaded_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                  : null;
                const scanStatus = doc?.ai_verification_status;
                const scanned = scanStatus && scanStatus !== 'Unchecked';

                return (
                  <TouchableOpacity
                    key={slot.type}
                    style={[c.card, uploaded ? c.cardFilled : c.cardEmpty]}
                    activeOpacity={uploaded ? 0.85 : 1}
                    onPress={uploaded ? () => goToDetail(doc, false) : () => pickAndUpload(slot)}
                    disabled={busy}
                  >
                    {/* Icon */}
                    <View style={[c.icon, { backgroundColor: uploaded ? slot.bg : '#F1E7D6' }]}>
                      <Ionicons name={slot.icon} size={22} color={uploaded ? slot.color : '#C2A988'} />
                    </View>

                    {/* Info */}
                    <View style={c.info}>
                      <Text style={c.name}>{slot.type}</Text>
                      {uploaded ? (
                        <View style={c.statusLine}>
                          <View style={[
                            c.pill,
                            isVerified ? c.pillVerified : isRejected ? c.pillRejected : c.pillPending,
                          ]}>
                            <Text style={[
                              c.pillText,
                              isVerified ? { color: GREEN } : isRejected ? { color: '#DC2626' } : { color: '#B45309' },
                            ]}>
                              {isVerified ? 'Verified ✓' : isRejected ? 'Rejected' : 'Pending'}
                            </Text>
                          </View>
                          {scanned ? (
                            <View style={c.aiPill}>
                              <Ionicons name="sparkles" size={10} color={ORANGE} />
                              <Text style={c.aiPillText}>AI {scanStatus === 'Passed' ? 'verified' : 'checked'}</Text>
                            </View>
                          ) : null}
                        </View>
                      ) : (
                        <Text style={c.desc}>{slot.desc}</Text>
                      )}
                      {uploaded && uploadDate ? <Text style={c.date}>Uploaded {uploadDate}</Text> : null}
                    </View>

                    {/* Right: upload action OR open chevron */}
                    {uploaded ? (
                      <View style={c.rightCol}>
                        <TouchableOpacity
                          style={c.replaceBtn}
                          onPress={(e) => { e.stopPropagation(); pickAndUpload(slot); }}
                          disabled={busy}
                          hitSlop={6}
                        >
                          {busy ? (
                            <ActivityIndicator size="small" color={MUTED} />
                          ) : (
                            <Ionicons name="cloud-upload-outline" size={18} color={MUTED} />
                          )}
                        </TouchableOpacity>
                        <Ionicons name="chevron-forward" size={18} color={MUTED} />
                      </View>
                    ) : (
                      <View style={[c.uploadBtn, busy && { opacity: 0.6 }]}>
                        {busy ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <>
                            <Ionicons name="cloud-upload-outline" size={16} color="#fff" />
                            <Text style={c.uploadBtnText}>Upload</Text>
                          </>
                        )}
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}

              <View style={c.hint}>
                <Ionicons name="sparkles-outline" size={15} color={MUTED} />
                <Text style={c.hintText}>
                  Upload an image or PDF (max 5MB). We’ll scan it with AI and PESO will verify it.
                </Text>
              </View>
            </View>
          ) : (
            <View style={s.historyWrap}>
              <Ionicons name="time-outline" size={48} color="#D4B896" />
              <Text style={s.historyTitle}>Verification History</Text>
              <Text style={s.historySub}>
                A record of all PESO verification actions on your documents will appear here.
              </Text>
              {verified > 0 && (
                <View style={s.historyStats}>
                  <Ionicons name="shield-checkmark" size={18} color={GREEN} />
                  <Text style={s.historyStatsText}>
                    {verified} document{verified !== 1 ? 's' : ''} verified
                  </Text>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <HelperTabBar />
      </SafeAreaView>

      <NotificationModal
        visible={notice.visible}
        title={notice.title}
        message={notice.message}
        type={notice.type}
        onClose={() => setNotice((n) => ({ ...n, visible: false }))}
      />
    </View>
  );
}

// ─── Local styles for the 4-card grid ─────────────────────────────────────────
const c = StyleSheet.create({
  grid: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1,
  },
  cardFilled: { borderColor: '#EFE2D0' },
  cardEmpty: { borderColor: '#EAD9C0', borderStyle: 'dashed', backgroundColor: '#FFFDF9' },
  icon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14.5, fontWeight: '800', color: '#2A1608' },
  desc: { fontSize: 12, color: '#9A7B5A' },
  date: { fontSize: 11, color: '#B89B79', marginTop: 1 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  pillVerified: { backgroundColor: '#D1FAE5' },
  pillPending: { backgroundColor: '#FEF3C7' },
  pillRejected: { backgroundColor: '#FECACA' },
  pillText: { fontSize: 11, fontWeight: '800' },
  aiPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#FEE2D5', paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  aiPillText: { fontSize: 10, fontWeight: '800', color: '#C24E12' },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replaceBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F7EEE0' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#E86019', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, minWidth: 96, justifyContent: 'center',
  },
  uploadBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingTop: 4 },
  hintText: { flex: 1, fontSize: 11.5, color: '#9A7B5A', lineHeight: 16 },
});
