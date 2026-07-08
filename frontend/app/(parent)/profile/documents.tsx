// app/(parent)/profile/documents.tsx
// Documents & Verification — fixed document cards (Valid ID, Barangay Clearance).
// Each card uploads its file in place, then opens the Document Details screen
// where AI scanning starts automatically.
// PHP: parent/get_profile.php (list), parent/upload_documents.php (upload),
//      parent/get_documents.php (resolve new id), helper/scan_id.php (AI scan)

import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, Platform, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useParentProfile } from '@/hooks/parent';
import { ParentTabBar } from '@/components/parent/home';
import { NotificationModal } from '@/components/shared';
import { ValidIdUploadCard } from '@/components/shared/ValidIdUploadCard';
import { VerificationHistoryList } from '@/components/shared/VerificationHistoryList';
import { BG, BROWN, CARAMEL, DARK, MUTED, GREEN, SUCCESS_BG, ICON_BG } from '@/components/parent/home/parentWarmTheme';
import { s } from './documents.styles';

// ─── The required documents (fixed order) ─────────────────────────────────────
type DocSlot = {
  type: string;
  field: string; // parent/upload_documents.php form field name
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  bg: string;
  desc: string;
};

const DOC_SLOTS: DocSlot[] = [
  { type: 'Valid ID',           field: 'valid_id',           icon: 'card-outline',          color: '#2563EB', bg: '#DBEAFE',  desc: 'Government-issued ID' },
  { type: 'Barangay Clearance', field: 'barangay_clearance', icon: 'document-text-outline', color: GREEN,     bg: SUCCESS_BG, desc: 'Issued by your barangay' },
];

// ─── Component ────────────────────────────────────────────────────────────────
export default function DocumentsScreen() {
  const router = useRouter();
  const { profileData, loading, refresh } = useParentProfile();

  const [busyType, setBusyType] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'docs' | 'history'>('docs');
  const [notice, setNotice]     = useState<{ visible: boolean; title?: string; message: string; type: 'success' | 'error' | 'warning' | 'info' }>({ visible: false, message: '', type: 'info' });

  const showNotice = (message: string, type: typeof notice.type = 'error', title?: string) =>
    setNotice({ visible: true, title, message, type });

  if (loading || !profileData) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  const documents = profileData.documents ?? [];
  const getDoc = (type: string): any => documents.find((d: any) => d.document_type === type);
  const uploadedCount = DOC_SLOTS.filter((slot) => documents.some((d: any) => d.document_type === slot.type)).length;

  const goToDetail = (doc: any, autoscan: boolean) => {
    router.push({
      pathname: '/(parent)/profile/document-detail',
      params: {
        document_id:      doc.document_id      ?? '',
        document_type:    doc.document_type    ?? '',
        file_url:         doc.file_url         ?? '',
        file_url_back:    doc.file_url_back    ?? '',
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

  const fetchDocByType = async (userId: string, type: string) => {
    try {
      const res = await fetch(`${API_URL}/parent/get_documents.php?user_id=${encodeURIComponent(userId)}&requester_id=${encodeURIComponent(userId)}`);
      const data = await res.json();
      const list = Array.isArray(data?.documents) ? data.documents : [];
      return list.find((d: any) => d.document_type === type) ?? null;
    } catch {
      return null;
    }
  };

  const pickAndUpload = async (slot: DocSlot) => {
    if (busyType) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setBusyType(slot.type);
      const userData = await AsyncStorage.getItem('user_data');
      const userId = String(JSON.parse(userData || '{}')?.user_id || '');
      if (!userId) throw new Error('Please sign in again.');

      let name = asset.name || 'file';
      const mime = asset.mimeType || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      if (!/\.[a-z0-9]+$/i.test(name)) {
        name += mime.includes('pdf') ? '.pdf' : mime.includes('png') ? '.png' : '.jpg';
      }

      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('requester_id', userId);
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        fd.append(slot.field, blob, name);
      } else {
        // @ts-ignore — RN FormData file shape
        fd.append(slot.field, { uri: asset.uri, name, type: mime });
      }

      const res = await fetch(`${API_URL}/parent/upload_documents.php`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Upload failed. Please try again.');

      const newDoc = await fetchDocByType(userId, slot.type);
      refresh();
      if (newDoc) {
        goToDetail(newDoc, true);
      } else {
        showNotice('Uploaded, but we could not open the scan screen. Please tap the card.', 'warning', 'Uploaded');
      }
    } catch (e: any) {
      showNotice(e?.message || 'Could not upload this document.', 'error');
    } finally {
      setBusyType(null);
    }
  };

  // Valid ID front & back are uploaded separately. The AI scan only runs once
  // BOTH sides are present, so a half ID is never scanned twice.
  const uploadValidIdSide = async (side: 'front' | 'back') => {
    if (busyType) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      setBusyType('Valid ID');
      const userData = await AsyncStorage.getItem('user_data');
      const userId = String(JSON.parse(userData || '{}')?.user_id || '');
      if (!userId) throw new Error('Please sign in again.');

      let name = asset.name || 'file';
      const mime = asset.mimeType || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      if (!/\.[a-z0-9]+$/i.test(name)) name += mime.includes('pdf') ? '.pdf' : mime.includes('png') ? '.png' : '.jpg';

      const field = side === 'front' ? 'valid_id' : 'valid_id_back';
      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('requester_id', userId);
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        fd.append(field, blob, name);
      } else {
        // @ts-ignore — RN FormData file shape
        fd.append(field, { uri: asset.uri, name, type: mime });
      }

      const res = await fetch(`${API_URL}/parent/upload_documents.php`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Upload failed. Please try again.');

      const newDoc = await fetchDocByType(userId, 'Valid ID');
      refresh();
      if (newDoc?.file_url && newDoc?.file_url_back) {
        goToDetail(newDoc, true);
      } else {
        showNotice(
          side === 'front' ? 'Front saved. Now upload the BACK of your ID.' : 'Back saved. Now upload the FRONT of your ID.',
          'success', 'Saved',
        );
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
          <View style={[s.barShield, { backgroundColor: SUCCESS_BG }]}>
            <Ionicons name="shield-checkmark" size={18} color={GREEN} />
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Safety Banner */}
          <View style={s.banner}>
            <View style={[s.bannerIcon, { backgroundColor: ICON_BG }]}>
              <Ionicons name="shield-checkmark" size={24} color={CARAMEL} />
            </View>
            <View style={s.bannerText}>
              <Text style={s.bannerTitle}>Your safety, our priority</Text>
              <Text style={s.bannerSub}>All documents are encrypted and securely stored. We never share your documents without your consent.</Text>
            </View>
          </View>

          {/* Tab toggle */}
          <View style={tab.row}>
            <TouchableOpacity style={[tab.tab, activeTab === 'docs' && tab.tabActive]} onPress={() => setActiveTab('docs')} activeOpacity={0.85}>
              <Text style={[tab.text, activeTab === 'docs' && tab.textActive]}>My Documents ({uploadedCount}/{DOC_SLOTS.length})</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[tab.tab, activeTab === 'history' && tab.tabActive]} onPress={() => setActiveTab('history')} activeOpacity={0.85}>
              <Text style={[tab.text, activeTab === 'history' && tab.textActive]}>Verification History</Text>
            </TouchableOpacity>
          </View>

          {activeTab === 'history' ? (
            <VerificationHistoryList documents={documents} themeKey="parent" />
          ) : (
          /* Document cards */
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

              // Valid ID = front + back, uploaded one side at a time.
              if (slot.field === 'valid_id') {
                return (
                  <ValidIdUploadCard
                    key={slot.type}
                    doc={doc}
                    themeKey="parent"
                    busy={busy}
                    onUploadSide={uploadValidIdSide}
                    onOpen={() => goToDetail(doc, false)}
                  />
                );
              }

              return (
                <TouchableOpacity
                  key={slot.type}
                  style={[c.card, uploaded ? c.cardFilled : c.cardEmpty]}
                  activeOpacity={uploaded ? 0.85 : 1}
                  onPress={uploaded ? () => goToDetail(doc, false) : () => pickAndUpload(slot)}
                  disabled={busy}
                >
                  <View style={[c.icon, { backgroundColor: uploaded ? slot.bg : '#F1E7D6' }]}>
                    <Ionicons name={slot.icon} size={22} color={uploaded ? slot.color : '#C2A988'} />
                  </View>

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
                            <Ionicons name="sparkles" size={10} color={CARAMEL} />
                            <Text style={c.aiPillText}>AI {scanStatus === 'Passed' ? 'verified' : 'checked'}</Text>
                          </View>
                        ) : null}
                      </View>
                    ) : (
                      <Text style={c.desc}>{slot.desc}</Text>
                    )}
                    {uploaded && uploadDate ? <Text style={c.date}>Uploaded {uploadDate}</Text> : null}
                  </View>

                  {uploaded ? (
                    <View style={c.rightCol}>
                      <TouchableOpacity
                        style={c.replaceBtn}
                        onPress={(e) => { e.stopPropagation(); pickAndUpload(slot); }}
                        disabled={busy}
                        hitSlop={6}
                      >
                        {busy ? <ActivityIndicator size="small" color={MUTED} /> : <Ionicons name="cloud-upload-outline" size={18} color={MUTED} />}
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
          )}
        </ScrollView>

        <ParentTabBar />
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

// ─── Tab toggle (My Documents / Verification History) ─────────────────────────
const tab = StyleSheet.create({
  row: { flexDirection: 'row', backgroundColor: '#F3E7D3', borderRadius: 12, padding: 4, marginBottom: 14 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 9, alignItems: 'center' },
  tabActive: { backgroundColor: CARAMEL },
  text: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED },
  textActive: { color: '#FFFFFF' },
});

// ─── Local styles (parent warm theme) ─────────────────────────────────────────
const c = StyleSheet.create({
  grid: { gap: 12 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    backgroundColor: '#FFFFFF', borderRadius: 16, padding: 14, borderWidth: 1,
  },
  cardFilled: { borderColor: '#F0E2CF' },
  cardEmpty: { borderColor: '#EAD9C0', borderStyle: 'dashed', backgroundColor: '#FFFCF7' },
  icon: { width: 46, height: 46, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  info: { flex: 1, gap: 3 },
  name: { fontSize: 14.5, fontWeight: '800', color: '#3B2A18' },
  desc: { fontSize: 12, color: '#7E6347' },
  date: { fontSize: 11, color: '#A98C6B', marginTop: 1 },
  statusLine: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 8 },
  pillVerified: { backgroundColor: SUCCESS_BG },
  pillPending: { backgroundColor: '#FEF3C7' },
  pillRejected: { backgroundColor: '#FECACA' },
  pillText: { fontSize: 11, fontWeight: '800' },
  aiPill: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: ICON_BG, paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8 },
  aiPillText: { fontSize: 10, fontWeight: '800', color: '#8B5A2B' },
  rightCol: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  replaceBtn: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#F6ECDD' },
  uploadBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: CARAMEL, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 11, minWidth: 96, justifyContent: 'center',
  },
  uploadBtnText: { color: '#fff', fontSize: 13, fontWeight: '800' },
  hint: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 4, paddingTop: 4 },
  hintText: { flex: 1, fontSize: 11.5, color: '#7E6347', lineHeight: 16 },
});
