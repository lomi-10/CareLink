// components/parent/web/ParentProfileWeb.tsx — single-page desktop parent profile.
// List mode: sidebar + big section cards. Edit mode: sidebar section-nav + data
// view (middle) + inline edit card (right) — no modals. Every save posts the FULL
// merged payload because parent/update_profile.php resets omitted values.
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, TextInput, ActivityIndicator, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useParentProfile, useParentStats, useParentPortalMode } from '@/hooks/parent';
import { useCareBot } from '@/contexts/CareBotContext';
import { NotificationModal, ConfirmationModal, VerifyChangeModal } from '@/components/shared';
import { DocumentAIScan, type ScanResult } from '@/components/shared/DocumentAIScan';
import { VerificationHistoryList } from '@/components/shared/VerificationHistoryList';
import { ImageZoomModal } from '@/components/shared/ImageZoomModal';
import { LocationSearchInput, type LocationResult } from '@/components/shared/LocationSearchInput';
import { PARENT_HOUSEHOLD_TYPE_OPTIONS, formatParentHouseholdType } from '@/constants/parentHousehold';
import { ParentTopNav } from './ParentTopNav';
import { pt, CARAMEL_GRADIENT, ACCENT_GRADIENT } from './parentWebTheme';
import { isValidPhMobile, normalizePhMobile } from '@/lib/phone';

const CAREBOT_ICON = require('../../../assets/images/chatbot_icon.png');
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const GENDERS = ['Male', 'Female', 'Prefer not to say'];
const CARE_LEVELS = ['Independent', 'Needs Assistance', 'Fully Dependent'];

type SecKey = 'personal' | 'address' | 'household' | 'documents';
type Child = { age: string; gender: string; special_needs: string };
type Elder = { age: string; gender: string; condition: string; care_level: string };

const DOC_SLOTS: { type: string; field: string; icon: keyof typeof Ionicons.glyphMap; desc: string; twoSided?: boolean }[] = [
  { type: 'Valid ID', field: 'valid_id', icon: 'card', desc: 'Government-issued ID — front & back', twoSided: true },
  { type: 'Barangay Clearance', field: 'barangay_clearance', icon: 'document-text', desc: 'Issued by your barangay' },
];

// ── completion ring ──
function Ring({ pct, size = 70, stroke = 8, track = 'rgba(255,255,255,.22)', fill = pt.accent, center = '#fff' }: any) {
  const r = (size - stroke) / 2, c = size / 2, circ = 2 * Math.PI * r;
  const dash = (Math.min(100, pct) / 100) * circ;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <View style={{ position: 'absolute' }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
          <circle cx={c} cy={c} r={r} stroke={track} strokeWidth={stroke} fill="none" />
          <circle cx={c} cy={c} r={r} stroke={fill} strokeWidth={stroke} fill="none" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ - dash}`} transform={`rotate(-90 ${c} ${c})`} />
        </svg>
      </View>
      <Text style={{ fontFamily: FontFamily.fredokaSemiBold, fontSize: size * 0.26, color: center }}>{Math.round(pct)}%</Text>
    </View>
  );
}

export function ParentProfileWeb({ onLogout }: { onLogout: () => void }) {
  const isWorkMode = useParentPortalMode();
  const { open: openCareBot } = useCareBot();
  const { profileData, loading, refresh, getFullName, getVerificationBadge } = useParentProfile();
  const { stats } = useParentStats();

  const [editing, setEditing] = useState<SecKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ visible: boolean; msg: string; type: 'success' | 'error' }>({ visible: false, msg: '', type: 'success' });
  const [form, setForm] = useState<Record<string, string>>({});
  const [children, setChildren] = useState<Child[]>([]);
  const [elderly, setElderly] = useState<Elder[]>([]);
  const [hhStep, setHhStep] = useState<1 | 2 | 3>(1);
  const [photoBusy, setPhotoBusy] = useState(false);
  // documents
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<{ type: string; side: 'front' | 'back' } | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<any | null>(null);
  const [docTab, setDocTab] = useState<'docs' | 'history'>('docs');
  const [zoom, setZoom] = useState<{ uri: string; title: string } | null>(null);
  const [changeField, setChangeField] = useState<null | 'email' | 'contact'>(null);

  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const err = (msg: string) => setNotif({ visible: true, msg, type: 'error' });

  const p: any = profileData?.profile ?? {};
  const U: any = profileData?.user ?? {};
  const household: any = profileData?.household ?? {};
  const docs: any[] = profileData?.documents ?? [];
  const fullName = getFullName();
  const badge = getVerificationBadge();
  const verified = badge.variant === 'peso_verified';
  const completeness = profileData?.profile_completeness ?? 0;
  const avatar = p.profile_image ?? null;
  const location = [p.barangay, p.municipality, p.province].filter(Boolean).join(', ') || 'Address not set';

  const docVerified = docs.filter((d) => d.status === 'Verified').length;
  // Personal info is complete once the name (from signup) is present — contact
  // number and bio are optional, so they don't gate completion.
  const personalDone = !!((U.first_name ?? '').trim() || (U.last_name ?? '').trim());
  const addressDone = !!(p.province && p.municipality && p.barangay);
  const householdDone = !!household?.household_type;
  const docsDone = DOC_SLOTS.every((slot) => docs.some((d) => d.document_type === slot.type));
  const incompleteCount = [personalDone, addressDone, householdDone, docsDone].filter((x) => !x).length;

  const SECTIONS: { key: SecKey; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; done: boolean }[] = [
    { key: 'personal', title: 'Personal Information', sub: 'Contact number and short bio', icon: 'person', done: personalDone },
    { key: 'address', title: 'Address', sub: 'Your home location and landmark', icon: 'location', done: addressDone },
    { key: 'household', title: 'Household Details', sub: 'Housing type, members and pets', icon: 'home', done: householdDone },
    { key: 'documents', title: 'Documents', sub: 'Verification documents', icon: 'shield-checkmark', done: docsDone },
  ];

  const startEdit = (key: SecKey) => {
    setForm({
      first_name: U.first_name ?? '', middle_name: U.middle_name ?? '', last_name: U.last_name ?? '',
      contact_number: p.contact_number ?? '', bio: p.bio ?? '',
      province: p.province ?? 'Leyte', municipality: p.municipality ?? '', barangay: p.barangay ?? '',
      landmark: p.landmark ?? '', latitude: '', longitude: '',
      household_size: household?.household_size != null ? String(household.household_size) : '',
      household_type: household?.household_type ?? '',
      has_children: household?.has_children ? '1' : '0',
      has_elderly: household?.has_elderly ? '1' : '0',
      has_pets: household?.has_pets ? '1' : '0',
      pet_details: household?.pet_details ?? '',
    });
    setChildren((profileData?.children ?? []).map((c: any) => ({ age: c.age != null ? String(c.age) : '', gender: c.gender || 'Prefer not to say', special_needs: c.special_needs || '' })));
    setElderly((profileData?.elderly ?? []).map((e: any) => ({ age: e.age != null ? String(e.age) : '', gender: e.gender || 'Prefer not to say', condition: e.condition || '', care_level: e.care_level || 'Independent' })));
    setHhStep(1);
    setSelectedDocType(null);
    setEditing(key);
  };

  // ── Full merged payload — update_profile.php resets anything we omit ──
  const submit = async (overrides: Record<string, string>, opts?: { childrenList?: Child[]; elderlyList?: Elder[]; photo?: string; success?: string; onDone?: () => void }) => {
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = raw ? JSON.parse(raw) : {};
      const uid = String(user.user_id ?? '');
      if (!uid) throw new Error('Please sign in again.');

      const base: Record<string, string> = {
        first_name: U.first_name ?? '', middle_name: U.middle_name ?? '', last_name: U.last_name ?? '',
        contact_number: p.contact_number ?? '', bio: p.bio ?? '',
        province: p.province ?? '', municipality: p.municipality ?? '', barangay: p.barangay ?? '', landmark: p.landmark ?? '',
        household_size: household?.household_size != null ? String(household.household_size) : '',
        household_type: household?.household_type ?? '',
        has_children: household?.has_children ? '1' : '0',
        has_elderly: household?.has_elderly ? '1' : '0',
        has_pets: household?.has_pets ? '1' : '0',
        pet_details: household?.pet_details ?? '',
        latitude: '', longitude: '',
      };
      const v = { ...base, ...overrides };

      const fd = new FormData();
      fd.append('user_id', uid);
      fd.append('requester_id', uid);
      (['first_name', 'middle_name', 'last_name', 'contact_number', 'province', 'municipality', 'barangay', 'bio', 'landmark', 'household_type'] as const)
        .forEach((k) => fd.append(k, String(v[k] ?? '').trim()));
      fd.append('household_size', v.household_size || '0');
      fd.append('has_children', v.has_children);
      fd.append('has_elderly', v.has_elderly);
      fd.append('has_pets', v.has_pets);
      fd.append('pet_details', v.has_pets === '1' ? String(v.pet_details ?? '').trim() : '');
      if (v.latitude) fd.append('latitude', v.latitude);
      if (v.longitude) fd.append('longitude', v.longitude);

      const cl = opts?.childrenList ?? (profileData?.children ?? []).map((c: any) => ({ age: String(c.age ?? ''), gender: c.gender || 'Prefer not to say', special_needs: c.special_needs || '' }));
      const el = opts?.elderlyList ?? (profileData?.elderly ?? []).map((e: any) => ({ age: String(e.age ?? ''), gender: e.gender || 'Prefer not to say', condition: e.condition || '', care_level: e.care_level || 'Independent' }));
      fd.append('children', JSON.stringify(cl.map((c) => ({ age: parseInt(String(c.age)) || 0, gender: c.gender, special_needs: (c.special_needs || '').trim() || null }))));
      fd.append('elderly', JSON.stringify(el.map((e) => ({ age: parseInt(String(e.age)) || 0, gender: e.gender, condition: (e.condition || '').trim() || null, care_level: e.care_level }))));

      if (opts?.photo && !opts.photo.startsWith('http')) {
        const fn = opts.photo.split('/').pop() || 'photo.jpg';
        if (Platform.OS === 'web') {
          const blob = await (await fetch(opts.photo)).blob();
          fd.append('profile_image', blob, fn);
        } else {
          (fd as any).append('profile_image', { uri: opts.photo, name: fn, type: 'image/jpeg' });
        }
      }

      const res = await fetch(`${API_URL}/parent/update_profile.php`, { method: 'POST', body: fd });
      let data: any;
      try { data = JSON.parse(await res.text()); } catch { throw new Error('Invalid server response'); }
      if (!data.success) throw new Error(data.message || 'Save failed');

      const newPhoto = data.data?.profile_image ?? null;
      if (newPhoto) {
        try {
          const r2 = await AsyncStorage.getItem('user_data');
          if (r2) await AsyncStorage.setItem('user_data', JSON.stringify({ ...JSON.parse(r2), profile_image: newPhoto }));
        } catch { /* best-effort */ }
      }
      setNotif({ visible: true, msg: opts?.success ?? 'Changes saved!', type: 'success' });
      refresh();
      opts?.onDone?.();
    } catch (e: any) {
      err(e?.message || 'Could not save your changes.');
    } finally { setSaving(false); }
  };

  const saveSection = () => {
    if (editing === 'personal') {
      if (!form.first_name?.trim()) return err('First name is required');
      if (!form.last_name?.trim()) return err('Last name is required');
      // Contact number is optional — validate only if one was entered.
      if (form.contact_number?.trim() && !isValidPhMobile(form.contact_number)) return err('Enter a valid PH mobile number, like 0917 123 4567 — or leave it blank');
      if (form.bio?.trim() && form.bio.trim().length < 15) return err('Bio must be at least 15 characters');
      // Email is changed via the verified flow; everything else saves here.
      return submit({ first_name: form.first_name, middle_name: form.middle_name, last_name: form.last_name, contact_number: normalizePhMobile(form.contact_number) ?? form.contact_number, bio: form.bio }, { success: 'Personal information saved!', onDone: () => setEditing(null) });
    }
    if (editing === 'address') {
      if (!form.province?.trim() || !form.municipality?.trim() || !form.barangay?.trim()) return err('Province, municipality and barangay are required');
      return submit(
        { province: form.province, municipality: form.municipality, barangay: form.barangay, landmark: form.landmark, latitude: form.latitude, longitude: form.longitude },
        { success: 'Address saved!', onDone: () => setEditing(null) },
      );
    }
    if (editing === 'household') {
      if (!form.household_type) return err('Please select a housing type');
      return submit(
        { household_type: form.household_type, household_size: form.household_size, has_children: form.has_children, has_elderly: form.has_elderly, has_pets: form.has_pets, pet_details: form.pet_details },
        { childrenList: children, elderlyList: elderly, success: 'Household details saved!', onDone: () => setEditing(null) },
      );
    }
  };

  // ── Photo ──
  const pickPhoto = async () => {
    if (photoBusy) return;
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return err('Photo library permission is required');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled) return;
    setPhotoBusy(true);
    await submit({}, { photo: result.assets[0].uri, success: 'Profile photo updated!' });
    setPhotoBusy(false);
  };

  // ── Documents ──
  const uploadDoc = async (field: string, type: string) => {
    if (uploadingDoc) return;
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: ['image/*', 'application/pdf'], copyToCacheDirectory: true, multiple: false });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      let name = asset.name || `${field}.jpg`;
      const mime = asset.mimeType || (name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');
      if (!/\.[a-z0-9]+$/i.test(name)) name += mime.includes('pdf') ? '.pdf' : '.jpg';
      setUploadingDoc(type + field);
      const raw = await AsyncStorage.getItem('user_data');
      const userId = String(JSON.parse(raw || '{}')?.user_id || '');
      if (!userId) throw new Error('Please sign in again.');
      const fd = new FormData();
      fd.append('user_id', userId);
      fd.append('requester_id', userId);
      if (Platform.OS === 'web') {
        const blob = await (await fetch(asset.uri)).blob();
        fd.append(field, blob, name);
      } else {
        // @ts-ignore RN FormData file shape
        fd.append(field, { uri: asset.uri, name, type: mime });
      }
      const res = await fetch(`${API_URL}/parent/upload_documents.php`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Upload failed.');
      setNotif({ visible: true, msg: `${type} uploaded.`, type: 'success' });
      setSelectedDocType(type);
      setPendingScan({ type, side: field === 'valid_id_back' ? 'back' : 'front' });
      refresh();
    } catch (e: any) {
      err(e?.message || 'Could not upload this document.');
    } finally { setUploadingDoc(null); }
  };

  const deleteDoc = async (doc: any) => {
    setConfirmDeleteDoc(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const userId = String(JSON.parse(raw || '{}')?.user_id || '');
      const res = await fetch(`${API_URL}/parent/delete_document.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: doc.document_id, user_id: userId, requester_id: userId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not delete.');
      setNotif({
        visible: true,
        msg: data.verification_reverted
          ? `${doc.document_type} deleted. This paused your PESO verification — you'll need to re-upload it and be re-verified before posting jobs again.`
          : `${doc.document_type} deleted.`,
        type: data.verification_reverted ? 'error' : 'success',
      });
      setSelectedDocType(null);
      refresh();
    } catch (e: any) { err(e?.message || 'Could not delete this document.'); }
  };

  if (loading || !profileData) {
    return (
      <View style={s.root}>
        <ParentTopNav active="none" mode={isWorkMode ? 'work' : 'recruitment'} userName="" avatar={null} verified={false} onLogout={onLogout} />
        <ActivityIndicator size="large" color={pt.accent} style={{ marginTop: 60 }} />
      </View>
    );
  }

  // ── Read rows per section (middle "data view") ──
  const readRows: Record<SecKey, { label: string; value: string }[]> = {
    personal: [
      { label: 'Full Name', value: fullName || '—' },
      { label: 'Username', value: U.username || '—' },
      { label: 'Email Address', value: U.email || '—' },
      { label: 'Contact Number', value: p.contact_number || '—' },
      { label: 'About the Household', value: p.bio || '—' },
    ],
    address: [
      { label: 'Province', value: p.province || '—' },
      { label: 'Municipality', value: p.municipality || '—' },
      { label: 'Barangay', value: p.barangay || '—' },
      { label: 'Landmark', value: p.landmark || '—' },
      { label: 'Full Address', value: p.address || location },
    ],
    household: [
      { label: 'Housing Type', value: formatParentHouseholdType(household?.household_type) },
      { label: 'Household Size', value: household?.household_size ? `${household.household_size} members` : '—' },
      { label: 'Children', value: String(profileData.children_count ?? 0) },
      { label: 'Elderly Members', value: String(profileData.elderly_count ?? 0) },
      { label: 'Pets', value: household?.has_pets ? (household?.pet_details || 'Yes') : 'None' },
    ],
    documents: DOC_SLOTS.map((d) => {
      const doc = docs.find((x) => x.document_type === d.type);
      return { label: d.type, value: doc ? (doc.status || 'Uploaded') : 'Not uploaded' };
    }),
  };

  const sectionTitle = SECTIONS.find((x) => x.key === editing)?.title ?? '';

  const householdItems: { icon: keyof typeof Ionicons.glyphMap; label: string; value: string }[] = [
    { icon: 'home-outline', label: 'Housing Type', value: formatParentHouseholdType(household?.household_type) },
    { icon: 'people-outline', label: 'Members', value: household?.household_size ? String(household.household_size) : '—' },
    { icon: 'happy-outline', label: 'Children', value: String(profileData.children_count ?? 0) },
    { icon: 'walk-outline', label: 'Elderly', value: String(profileData.elderly_count ?? 0) },
    { icon: 'paw-outline', label: 'Pets', value: household?.has_pets ? (household?.pet_details || 'Yes') : 'None' },
  ];

  // ── Sidebar profile card ──
  const profileCard = (
    <LinearGradient colors={CARAMEL_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pcard}>
      <View style={s.pcardTop}>
        <Pressable onPress={pickPhoto} style={s.avaWrap}>
          {avatar ? <Image source={{ uri: avatar }} style={s.ava} /> : <View style={[s.ava, s.avaFb]}><Text style={s.avaText}>{(fullName || 'P').trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase()}</Text></View>}
          <View style={s.avaCam}>{photoBusy ? <ActivityIndicator size="small" color="#fff" /> : <Ionicons name="camera" size={13} color="#fff" />}</View>
        </Pressable>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.pcardName} numberOfLines={2}>{fullName || 'Parent'}</Text>
          <View style={[s.verPill, !verified && s.verPillOff]}>
            <Ionicons name={verified ? 'shield-checkmark' : 'time-outline'} size={12} color={verified ? pt.green : pt.amber} />
            <Text style={[s.verPillText, !verified && { color: pt.amber }]}>{verified ? 'PESO Verified Employer' : badge.text}</Text>
          </View>
          <View style={s.metaItem}><Ionicons name="location-outline" size={12} color={pt.featMut} /><Text style={s.metaText} numberOfLines={1}>{location}</Text></View>
        </View>
      </View>
      <View style={s.pcardDiv} />
      <View style={s.pcardComp}>
        <Ring pct={completeness} size={70} stroke={8} center="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={s.compTitle}>Profile completion</Text>
          <Text style={s.compText}>{completeness >= 100 ? 'Your profile is complete!' : `Complete ${incompleteCount || 1} more section to attract better helpers.`}</Text>
          <View style={s.compBar}><View style={[s.compBarFill, { width: `${Math.min(100, completeness)}%` }]} /></View>
        </View>
      </View>
    </LinearGradient>
  );

  return (
    <View style={s.root}>
      <ParentTopNav active="none" mode={isWorkMode ? 'work' : 'recruitment'} userName={fullName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.page}>
          {/* ── SIDEBAR ── */}
          <View style={s.sidebar}>
            {profileCard}
            {editing ? (
              <View style={s.navCard}>
                <Text style={s.navLabel}>PROFILE SECTIONS</Text>
                {SECTIONS.map((sec) => {
                  const on = editing === sec.key;
                  return (
                    <Pressable key={sec.key} onPress={() => startEdit(sec.key)} style={({ hovered }: any) => [s.navItem, on && s.navItemOn, TRANS, hovered && !on && { backgroundColor: pt.lineSoft }]}>
                      <View style={s.navIc}><Ionicons name={sec.icon} size={16} color={pt.accent} /></View>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <Text style={[s.navTitle, on && { color: pt.accent }]}>{sec.title}</Text>
                        <Text style={s.navSub} numberOfLines={1}>{sec.sub}</Text>
                      </View>
                      <Ionicons name="checkmark-circle" size={16} color={sec.done ? pt.green : pt.subtle} />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <>
                <View style={s.card}>
                  <Text style={s.cardTitle}>Quick Overview</Text>
                  <View style={s.ovGrid}>
                    <Mini icon="briefcase" value={stats.active_job_posts ?? 0} label="Job Posts" />
                    <Mini icon="people" value={stats.total_applicants ?? 0} label="Applications" />
                    <Mini icon="heart" value={stats.saved_helpers ?? 0} label="Saved Helpers" />
                    <Mini icon="star" value="—" label="Rating" />
                  </View>
                </View>

                <View style={s.card}>
                  <View style={s.cardHeadRow}>
                    <Text style={[s.cardTitle, { marginBottom: 0 }]}>Household Summary</Text>
                    <Pressable onPress={() => startEdit('household')} style={({ hovered }: any) => [s.cardEdit, TRANS, hovered && { backgroundColor: pt.accentSoft, borderColor: pt.accent }]}>
                      <Ionicons name="pencil-outline" size={13} color={pt.accent} />
                    </Pressable>
                  </View>
                  <View style={{ gap: 10 }}>
                    {householdItems.map((item) => (
                      <View key={item.label} style={s.hhRow}>
                        <View style={s.hhIc}><Ionicons name={item.icon} size={15} color={pt.accent} /></View>
                        <Text style={s.hhRowLabel}>{item.label}</Text>
                        <Text style={s.hhRowValue} numberOfLines={1}>{item.value}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
            <View style={s.botCard}>
              <View style={s.botHeadRow}>
                <Image source={CAREBOT_ICON} style={s.botMascot} resizeMode="contain" />
                <View style={{ flex: 1 }}>
                  <Text style={s.botTitle}>Need help with your profile?</Text>
                  <Text style={s.botText}>CareBot can guide you through each section.</Text>
                </View>
              </View>
              <Pressable onPress={openCareBot} style={({ hovered, pressed }: any) => [s.botBtn, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
                <Image source={CAREBOT_ICON} style={s.botBtnIcon} resizeMode="contain" />
                <Text style={s.botBtnText}>Chat with CareBot</Text>
              </Pressable>
            </View>
          </View>

          {/* ── MAIN ── */}
          {editing === 'documents' ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Pressable onPress={() => setEditing(null)} style={({ hovered }: any) => [s.back, hovered && { opacity: 0.7 }]}>
                <Ionicons name="arrow-back" size={17} color={pt.accent} /><Text style={s.backText}>Back to Profile</Text>
              </Pressable>
              <Text style={s.dvTitle}>Documents &amp; Verification</Text>
              <Text style={s.dvSub}>Upload each document. It’s AI-scanned instantly, then reviewed by PESO.</Text>
              <View style={s.docTabs}>
                {(['docs', 'history'] as const).map((tab) => (
                  <Pressable key={tab} onPress={() => setDocTab(tab)} style={({ hovered }: any) => [s.docTab, docTab === tab && s.docTabOn, TRANS, hovered && docTab !== tab && { backgroundColor: pt.lineSoft }]}>
                    <Text style={[s.docTabText, docTab === tab && { color: pt.accent }]}>{tab === 'docs' ? `My Documents (${docs.length}/${DOC_SLOTS.length})` : 'Verification History'}</Text>
                  </Pressable>
                ))}
              </View>
              {docTab === 'history' ? (
                <View style={{ marginTop: 4 }}><VerificationHistoryList documents={docs} themeKey="parent" /></View>
              ) : (
                <View style={s.editRow}>
                  <View style={s.dataCol}>
                    <View style={{ gap: 12 }}>
                      {DOC_SLOTS.map((slot) => {
                        const doc = docs.find((x) => x.document_type === slot.type);
                        const ok = doc?.status === 'Verified';
                        const rejected = doc?.status === 'Rejected';
                        const has = !!doc;
                        const on = selectedDocType === slot.type;
                        return (
                          <Pressable key={slot.type} onPress={() => setSelectedDocType(slot.type)} style={({ hovered }: any) => [s.docRowCard, on && s.docRowCardOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
                            <View style={s.upIc}><Ionicons name={slot.icon} size={19} color={pt.accent} /></View>
                            <View style={{ flex: 1, minWidth: 0 }}>
                              <Text style={s.upName}>{slot.type}</Text>
                              <Text style={s.upDesc}>{slot.desc}</Text>
                            </View>
                            <View style={[s.upStatus, { backgroundColor: ok ? pt.greenSoft : rejected ? pt.redSoft : has ? pt.amberSoft : pt.lineSoft }]}>
                              <Text style={[s.upStatusText, { color: ok ? pt.green : rejected ? pt.red : has ? pt.amber : pt.subtle }]}>{ok ? 'Verified' : rejected ? 'Rejected' : has ? 'Pending' : 'Missing'}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={16} color={pt.subtle} />
                          </Pressable>
                        );
                      })}
                    </View>
                    <View style={s.why}>
                      <Ionicons name="shield-checkmark-outline" size={17} color={pt.accent} />
                      <View style={{ flex: 1 }}><Text style={s.whyTitle}>Why documents matter</Text><Text style={s.whyText}>Verified documents earn the PESO badge — helpers are far more likely to trust and accept your offers.</Text></View>
                    </View>
                  </View>

                  <DocPanel
                    key={selectedDocType ?? 'none'}
                    slot={DOC_SLOTS.find((x) => x.type === selectedDocType) || null}
                    doc={selectedDocType ? docs.find((x) => x.document_type === selectedDocType) : null}
                    pendingScan={pendingScan}
                    uploadingKey={uploadingDoc}
                    onUpload={uploadDoc}
                    onScanned={() => setPendingScan(null)}
                    onDelete={(d) => setConfirmDeleteDoc(d)}
                    onZoom={(uri, title) => setZoom({ uri, title })}
                    onClose={() => setSelectedDocType(null)}
                  />
                </View>
              )}
            </View>
          ) : editing ? (
            <View style={s.editRow}>
              {/* Data view (middle) */}
              <View style={s.dataCol}>
                <Pressable onPress={() => setEditing(null)} style={({ hovered }: any) => [s.back, hovered && { opacity: 0.7 }]}>
                  <Ionicons name="arrow-back" size={17} color={pt.accent} /><Text style={s.backText}>Back to Profile</Text>
                </Pressable>
                <Text style={s.dvTitle}>{sectionTitle}</Text>
                <Text style={s.dvSub}>Review your details, then edit them on the right.</Text>
                <View style={s.dvCard}>
                  {(readRows[editing] ?? []).map((r, i, arr) => (
                    <View key={r.label} style={[s.dvRow, i === arr.length - 1 && { borderBottomWidth: 0 }]}>
                      <Text style={s.dvLabel}>{r.label}</Text>
                      <Text style={s.dvValue}>{r.value}</Text>
                    </View>
                  ))}
                </View>
                <View style={s.why}>
                  <Ionicons name="bulb-outline" size={17} color={pt.accent} />
                  <View style={{ flex: 1 }}>
                    <Text style={s.whyTitle}>Why this matters?</Text>
                    <Text style={s.whyText}>{editing === 'household'
                      ? 'Helpers use your household details to judge the workload and decide if the job fits them.'
                      : editing === 'address'
                      ? 'Your location is used to match you with nearby helpers and to compute travel distance.'
                      : 'Complete contact details let verified helpers reach you and build trust with your household.'}</Text>
                  </View>
                </View>
              </View>

              {/* Inline edit card (right) */}
              <View style={s.formCol}>
                <View style={s.formHead}>
                  <Text style={s.formTitle}>Edit {sectionTitle}</Text>
                  <Pressable onPress={() => setEditing(null)} hitSlop={8}><Ionicons name="close" size={20} color={pt.muted} /></Pressable>
                </View>
                {editing === 'household' && (
                  <View style={s.stepsRow}>
                    <Text style={s.stepsText}>Step {hhStep} of 3</Text>
                    <View style={s.stepsDots}>
                      {[1, 2, 3].map((i) => <View key={i} style={[s.stepDot, i <= hhStep && { backgroundColor: pt.accent }]} />)}
                    </View>
                  </View>
                )}
                <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
                  {editing === 'personal' && (
                    <>
                      <View style={{ flexDirection: 'row', gap: 8 }}>
                        <View style={{ flex: 1 }}><FLabel>First Name <Req /></FLabel><FInput value={form.first_name} onChange={(v) => setF('first_name', v)} placeholder="First name" /></View>
                        <View style={{ flex: 1 }}><FLabel>Last Name <Req /></FLabel><FInput value={form.last_name} onChange={(v) => setF('last_name', v)} placeholder="Last name" /></View>
                      </View>
                      <FLabel>Middle Name <Opt /></FLabel>
                      <FInput value={form.middle_name} onChange={(v) => setF('middle_name', v)} placeholder="(optional)" />
                      <FLabel>Contact Number <Opt /></FLabel>
                      <FInput value={form.contact_number} onChange={(v) => setF('contact_number', v)} placeholder="09XX XXX XXXX" />
                      <PVerifiedField label="Email Address" value={U.email || 'Not set'} onChange={() => setChangeField('email')} />
                      <FLabel>About the Household <Opt /></FLabel>
                      <FInput value={form.bio} onChange={(v) => setF('bio', v)} placeholder="Tell helpers about your family and what you're looking for…" multiline />
                      <Text style={s.hint}>{(form.bio ?? '').trim().length > 0 && (form.bio ?? '').trim().length < 15 ? 'At least 15 characters.' : 'A short intro helps helpers feel comfortable applying.'}</Text>
                    </>
                  )}
                  {editing === 'address' && (
                    <>
                      <FLabel>Search Location</FLabel>
                      <LocationSearchInput
                        province={form.province} municipality={form.municipality} barangay={form.barangay}
                        accentColor={pt.accent}
                        onSelect={(r: LocationResult) => setForm((f) => ({ ...f, province: r.province, municipality: r.municipality, barangay: r.barangay, latitude: String(r.latitude), longitude: String(r.longitude) }))}
                      />
                      <FLabel>Province <Req /></FLabel>
                      <FInput value={form.province} onChange={(v) => setForm((f) => ({ ...f, province: v, latitude: '', longitude: '' }))} placeholder="Leyte" />
                      <View style={s.grid2}>
                        <View style={{ flex: 1 }}><FLabel>Municipality <Req /></FLabel><FInput value={form.municipality} onChange={(v) => setForm((f) => ({ ...f, municipality: v, latitude: '', longitude: '' }))} placeholder="Isabel" /></View>
                        <View style={{ flex: 1 }}><FLabel>Barangay <Req /></FLabel><FInput value={form.barangay} onChange={(v) => setForm((f) => ({ ...f, barangay: v, latitude: '', longitude: '' }))} placeholder="San Jose" /></View>
                      </View>
                      {[form.barangay, form.municipality, form.province].filter(Boolean).length > 0 && (
                        <View style={s.addrPreview}>
                          <Ionicons name="location" size={15} color={pt.accent} />
                          <Text style={s.addrPreviewText}>{[form.barangay, form.municipality, form.province].filter(Boolean).join(', ')}</Text>
                        </View>
                      )}
                      <FLabel>Landmark <Opt /></FLabel>
                      <FInput value={form.landmark} onChange={(v) => setF('landmark', v)} placeholder="e.g., Near SM City" />
                    </>
                  )}
                  {editing === 'household' && hhStep === 1 && (
                    <>
                      <FLabel>Housing Type <Req /></FLabel>
                      <Text style={s.hint}>Where you live helps helpers understand the work environment.</Text>
                      <PillSelect
                        options={PARENT_HOUSEHOLD_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        value={form.household_type} onChange={(v) => setF('household_type', v)}
                      />
                      <FLabel>Total Household Size <Opt /></FLabel>
                      <FInput value={form.household_size} onChange={(v) => setF('household_size', v.replace(/[^0-9]/g, ''))} placeholder="e.g., 4" />
                    </>
                  )}
                  {editing === 'household' && hhStep === 2 && (
                    <>
                      <SwitchRow icon="happy-outline" label="We have children" value={form.has_children === '1'} onChange={(v) => setF('has_children', v ? '1' : '0')} />
                      {form.has_children === '1' && (
                        <View style={{ gap: 10, marginTop: 4 }}>
                          {children.map((c, i) => (
                            <View key={i} style={s.memberCard}>
                              <View style={s.memberHead}>
                                <Text style={s.memberTitle}>Child {i + 1}</Text>
                                <Pressable onPress={() => setChildren(children.filter((_, x) => x !== i))} hitSlop={8}><Ionicons name="trash-outline" size={16} color={pt.red} /></Pressable>
                              </View>
                              <FLabel>Age</FLabel>
                              <FInput value={c.age} onChange={(v) => setChildren(children.map((x, xi) => xi === i ? { ...x, age: v.replace(/[^0-9]/g, '') } : x))} placeholder="e.g., 5" />
                              <FLabel>Gender</FLabel>
                              <PillSelect options={GENDERS.map((g) => ({ value: g, label: g }))} value={c.gender} onChange={(v) => setChildren(children.map((x, xi) => xi === i ? { ...x, gender: v } : x))} />
                              <FLabel>Special Needs <Opt /></FLabel>
                              <FInput value={c.special_needs} onChange={(v) => setChildren(children.map((x, xi) => xi === i ? { ...x, special_needs: v } : x))} placeholder="e.g., Asthma" />
                            </View>
                          ))}
                          <Pressable onPress={() => setChildren([...children, { age: '', gender: 'Prefer not to say', special_needs: '' }])} style={({ hovered }: any) => [s.addBtn, TRANS, hovered && { backgroundColor: pt.accentSoft, borderColor: pt.accent }]}>
                            <Ionicons name="add" size={16} color={pt.accent} /><Text style={s.addBtnText}>Add a child</Text>
                          </Pressable>
                        </View>
                      )}
                      <View style={{ height: 8 }} />
                      <SwitchRow icon="walk-outline" label="We have elderly members" value={form.has_elderly === '1'} onChange={(v) => setF('has_elderly', v ? '1' : '0')} />
                      {form.has_elderly === '1' && (
                        <View style={{ gap: 10, marginTop: 4 }}>
                          {elderly.map((e, i) => (
                            <View key={i} style={s.memberCard}>
                              <View style={s.memberHead}>
                                <Text style={s.memberTitle}>Elderly {i + 1}</Text>
                                <Pressable onPress={() => setElderly(elderly.filter((_, x) => x !== i))} hitSlop={8}><Ionicons name="trash-outline" size={16} color={pt.red} /></Pressable>
                              </View>
                              <FLabel>Age</FLabel>
                              <FInput value={e.age} onChange={(v) => setElderly(elderly.map((x, xi) => xi === i ? { ...x, age: v.replace(/[^0-9]/g, '') } : x))} placeholder="e.g., 72" />
                              <FLabel>Gender</FLabel>
                              <PillSelect options={GENDERS.map((g) => ({ value: g, label: g }))} value={e.gender} onChange={(v) => setElderly(elderly.map((x, xi) => xi === i ? { ...x, gender: v } : x))} />
                              <FLabel>Care Level</FLabel>
                              <PillSelect options={CARE_LEVELS.map((g) => ({ value: g, label: g }))} value={e.care_level} onChange={(v) => setElderly(elderly.map((x, xi) => xi === i ? { ...x, care_level: v } : x))} />
                              <FLabel>Condition <Opt /></FLabel>
                              <FInput value={e.condition} onChange={(v) => setElderly(elderly.map((x, xi) => xi === i ? { ...x, condition: v } : x))} placeholder="e.g., Diabetes" />
                            </View>
                          ))}
                          <Pressable onPress={() => setElderly([...elderly, { age: '', gender: 'Prefer not to say', condition: '', care_level: 'Independent' }])} style={({ hovered }: any) => [s.addBtn, TRANS, hovered && { backgroundColor: pt.accentSoft, borderColor: pt.accent }]}>
                            <Ionicons name="add" size={16} color={pt.accent} /><Text style={s.addBtnText}>Add an elderly member</Text>
                          </Pressable>
                        </View>
                      )}
                    </>
                  )}
                  {editing === 'household' && hhStep === 3 && (
                    <>
                      <SwitchRow icon="paw-outline" label="We have pets" value={form.has_pets === '1'} onChange={(v) => setF('has_pets', v ? '1' : '0')} />
                      {form.has_pets === '1' && (
                        <>
                          <FLabel>Pet Details</FLabel>
                          <FInput value={form.pet_details} onChange={(v) => setF('pet_details', v)} placeholder="e.g., 1 dog, 2 cats" multiline />
                          <Text style={s.hint}>Helpers with allergies or fears need to know this before applying.</Text>
                        </>
                      )}
                    </>
                  )}
                </ScrollView>

                {editing === 'household' ? (
                  <View style={s.formBtns}>
                    <Pressable onPress={() => (hhStep === 1 ? setEditing(null) : setHhStep((st) => (st === 3 ? 2 : 1)))} style={({ hovered }: any) => [s.cancelBtn, TRANS, hovered && { backgroundColor: pt.lineSoft }]}>
                      <Text style={s.cancelText}>{hhStep === 1 ? 'Cancel' : 'Back'}</Text>
                    </Pressable>
                    <Pressable disabled={saving || (hhStep === 1 && !form.household_type)} onPress={() => (hhStep === 3 ? saveSection() : setHhStep((st) => (st === 1 ? 2 : 3)))}
                      style={({ hovered, pressed }: any) => [{ flex: 1.4, opacity: hhStep === 1 && !form.household_type ? 0.5 : 1 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
                      <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.saveBtn}>
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>{hhStep === 3 ? 'Save Changes' : 'Next'}</Text>}
                      </LinearGradient>
                    </Pressable>
                  </View>
                ) : (
                  <View style={s.formBtns}>
                    <Pressable onPress={() => setEditing(null)} style={({ hovered }: any) => [s.cancelBtn, TRANS, hovered && { backgroundColor: pt.lineSoft }]}><Text style={s.cancelText}>Cancel</Text></Pressable>
                    <Pressable disabled={saving} onPress={saveSection} style={({ hovered, pressed }: any) => [{ flex: 1.4 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
                      <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.saveBtn}>
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>Save Changes</Text>}
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ) : (
            /* ── LIST MODE ── */
            <View style={s.mainCol}>
              <Text style={s.pageTitle}>My Profile</Text>
              <Text style={s.pageSub}>Keep your household details current so helpers know exactly what to expect.</Text>

              <BigCard sec={SECTIONS[0]} statusLabel={personalDone ? 'Complete' : 'Incomplete'} statusOk={personalDone} onEdit={() => startEdit('personal')}>
                <DataGrid items={[{ v: p.contact_number || '—', l: 'Contact Number' }, { v: U.email || '—', l: 'Email' }, { v: U.username || '—', l: 'Username' }]} />
                <View style={s.aboutBlock}>
                  <Text style={s.aboutLabel}>About the Household</Text>
                  {p.bio
                    ? <Text style={s.aboutText}>{p.bio}</Text>
                    : <Text style={[s.aboutText, { color: pt.subtle }]}>Not set yet — add a short intro so helpers know who they’d be working for.</Text>}
                </View>
              </BigCard>

              <BigCard sec={SECTIONS[1]} statusLabel={addressDone ? 'Complete' : 'Incomplete'} statusOk={addressDone} onEdit={() => startEdit('address')}>
                <DataGrid items={[{ v: p.province || '—', l: 'Province' }, { v: p.municipality || '—', l: 'Municipality' }, { v: p.barangay || '—', l: 'Barangay' }, { v: p.landmark || '—', l: 'Landmark' }]} />
              </BigCard>

              <BigCard sec={SECTIONS[2]} statusLabel={householdDone ? 'Complete' : 'Incomplete'} statusOk={householdDone} onEdit={() => startEdit('household')}>
                <DataGrid items={[
                  { v: formatParentHouseholdType(household?.household_type), l: 'Housing Type' },
                  { v: household?.household_size ? String(household.household_size) : '—', l: 'Members' },
                  { v: String(profileData.children_count ?? 0), l: 'Children' },
                  { v: String(profileData.elderly_count ?? 0), l: 'Elderly' },
                  { v: household?.has_pets ? (household?.pet_details || 'Yes') : 'None', l: 'Pets' },
                ]} />
              </BigCard>

              <BigCard sec={SECTIONS[3]} statusLabel={`${docVerified}/${DOC_SLOTS.length} Verified`} statusOk={docsDone} onEdit={() => startEdit('documents')}>
                <View style={{ gap: 10 }}>
                  {DOC_SLOTS.map((slot) => {
                    const doc = docs.find((x) => x.document_type === slot.type);
                    const ok = doc?.status === 'Verified';
                    const rejected = doc?.status === 'Rejected';
                    return (
                      <View key={slot.type} style={s.docLine}>
                        <Ionicons name={ok ? 'checkmark-circle' : rejected ? 'close-circle' : doc ? 'time-outline' : 'ellipse-outline'} size={16} color={ok ? pt.green : rejected ? pt.red : doc ? pt.amber : pt.subtle} />
                        <Text style={s.docLineName}>{slot.type}</Text>
                        <Text style={[s.docLineStatus, { color: ok ? pt.green : rejected ? pt.red : doc ? pt.amber : pt.subtle }]}>{ok ? 'Verified' : rejected ? 'Rejected' : doc ? 'Pending' : 'Not uploaded'}</Text>
                      </View>
                    );
                  })}
                </View>
              </BigCard>

              <View style={s.tip}>
                <Ionicons name="bulb" size={17} color={pt.accent} />
                <Text style={s.tipText}>A complete, verified profile gets more helper applications and faster replies.</Text>
                <Pressable onPress={() => startEdit(SECTIONS.find((x) => !x.done)?.key ?? 'personal')} style={({ hovered }: any) => [hovered && { opacity: 0.75 }]}>
                  <Text style={s.tipLink}>Improve your profile →</Text>
                </Pressable>
              </View>
            </View>
          )}
        </View>
      </ScrollView>

      <NotificationModal visible={notif.visible} message={notif.msg} type={notif.type} autoClose duration={1600} onClose={() => setNotif((n) => ({ ...n, visible: false }))} />
      <VerifyChangeModal
        visible={!!changeField}
        field={changeField ?? 'email'}
        userId={U.user_id ?? ''}
        currentValue={changeField === 'contact' ? p.contact_number : U.email}
        accent={pt.accent}
        onClose={() => setChangeField(null)}
        onSuccess={() => { setChangeField(null); setNotif({ visible: true, msg: changeField === 'contact' ? 'Contact number updated.' : 'Email updated.', type: 'success' }); refresh(); }}
      />
      <ConfirmationModal
        visible={!!confirmDeleteDoc} title="Delete Document?"
        message={`Delete "${confirmDeleteDoc?.document_type}"? You'll need to upload it again for PESO verification.`}
        confirmText="Delete" cancelText="Cancel" type="danger"
        onConfirm={() => deleteDoc(confirmDeleteDoc)} onCancel={() => setConfirmDeleteDoc(null)}
      />
      <ImageZoomModal visible={!!zoom} uri={zoom?.uri ?? ''} title={zoom?.title} onClose={() => setZoom(null)} />
    </View>
  );
}

// ─── Document detail + AI scan (right column of Documents mode) ───
function DocPanel({ slot, doc, pendingScan, uploadingKey, onUpload, onScanned, onDelete, onZoom, onClose }: {
  slot: { type: string; field: string; icon: keyof typeof Ionicons.glyphMap; desc: string; twoSided?: boolean } | null;
  doc: any | null;
  pendingScan: { type: string; side: 'front' | 'back' } | null;
  uploadingKey: string | null;
  onUpload: (field: string, type: string) => void;
  onScanned: () => void;
  onDelete: (d: any) => void;
  onZoom: (uri: string, title: string) => void;
  onClose: () => void;
}) {
  if (!slot) {
    return (
      <View style={[s.formCol, { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }]}>
        <View style={s.emptyIc}><Ionicons name="document-text-outline" size={28} color={pt.accent} /></View>
        <Text style={s.emptyTitle}>Select a document</Text>
        <Text style={s.emptySub}>Pick a document on the left to upload it or review its AI scan here.</Text>
      </View>
    );
  }
  const front = doc?.file_url ?? doc?.file_path ?? null;
  const back = doc?.file_url_back ?? doc?.file_path_back ?? null;
  const ok = doc?.status === 'Verified';
  const rejected = doc?.status === 'Rejected';

  return (
    <View style={s.formCol}>
      <View style={s.formHead}>
        <Text style={s.formTitle}>{slot.type}</Text>
        <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={20} color={pt.muted} /></Pressable>
      </View>
      <ScrollView style={{ maxHeight: 560 }} showsVerticalScrollIndicator={false}>
        <Text style={s.hint}>{slot.desc}</Text>
        {doc && (
          <View style={[s.docStatusBar, { backgroundColor: ok ? pt.greenSoft : rejected ? pt.redSoft : pt.amberSoft }]}>
            <Ionicons name={ok ? 'shield-checkmark' : rejected ? 'close-circle' : 'time-outline'} size={15} color={ok ? pt.green : rejected ? pt.red : pt.amber} />
            <Text style={[s.docStatusText, { color: ok ? pt.green : rejected ? pt.red : pt.amber }]}>
              {ok ? 'Verified by PESO' : rejected ? 'Rejected — please re-upload' : 'Waiting for PESO review'}
            </Text>
          </View>
        )}

        {slot.twoSided ? (
          <>
            <FLabel>Front</FLabel>
            {front ? <SideScan doc={doc} side="front" label="Front of ID" url={front} pendingScan={pendingScan} onScanned={onScanned} onZoom={onZoom} />
              : <UpBtn label="Upload front" busy={uploadingKey === slot.type + 'valid_id'} onPress={() => onUpload('valid_id', slot.type)} />}
            {!!front && <UpBtn label="Replace front" busy={uploadingKey === slot.type + 'valid_id'} onPress={() => onUpload('valid_id', slot.type)} />}
            <FLabel>Back</FLabel>
            {back ? <SideScan doc={doc} side="back" label="Back of ID" url={back} pendingScan={pendingScan} onScanned={onScanned} onZoom={onZoom} />
              : <UpBtn label="Upload back" busy={uploadingKey === slot.type + 'valid_id_back'} onPress={() => onUpload('valid_id_back', slot.type)} />}
            {!!back && <UpBtn label="Replace back" busy={uploadingKey === slot.type + 'valid_id_back'} onPress={() => onUpload('valid_id_back', slot.type)} />}
          </>
        ) : (
          <>
            {front ? <SideScan doc={doc} side="front" label={slot.type} url={front} pendingScan={pendingScan} onScanned={onScanned} onZoom={onZoom} />
              : null}
            <UpBtn label={front ? 'Replace file' : 'Upload file'} busy={uploadingKey === slot.type + slot.field} onPress={() => onUpload(slot.field, slot.type)} />
          </>
        )}

        {doc && (
          <Pressable onPress={() => onDelete(doc)} style={({ hovered }: any) => [s.delBtn, TRANS, hovered && { backgroundColor: pt.redSoft, borderColor: pt.red }]}>
            <Ionicons name="trash-outline" size={15} color={pt.red} /><Text style={s.delBtnText}>Delete document</Text>
          </Pressable>
        )}
      </ScrollView>
    </View>
  );
}

// Reconstruct a stored per-side scan result (front/back), with legacy fallback.
function sideScanResult(doc: any, side: 'front' | 'back'): ScanResult | null {
  const sc = doc?.ai_extracted_data?.scans?.[side];
  if (sc && sc.ai_status && sc.ai_status !== 'Unchecked') {
    return {
      ai_verification_status: sc.ai_status,
      legitimacy_score: sc.legitimacy_score ?? null,
      quality_score: sc.quality_score ?? null,
      fields: Array.isArray(sc.fields) ? sc.fields : [],
      warnings: Array.isArray(sc.warnings) ? sc.warnings : [],
      document_type: doc?.document_type,
      document_guess: sc.document_guess ?? '',
      doc_status: doc?.status,
    };
  }
  if (side === 'front') {
    const aiStatus = doc?.ai_verification_status;
    if (aiStatus && aiStatus !== 'Unchecked') {
      const extra = doc?.ai_extracted_data || {};
      return {
        ai_verification_status: aiStatus,
        legitimacy_score: extra?.legitimacy_score ?? null,
        quality_score: doc?.ai_confidence_score ? Number(doc.ai_confidence_score) : null,
        fields: Array.isArray(extra?.fields) ? extra.fields : [],
        warnings: Array.isArray(extra?.warnings) ? extra.warnings : [],
        document_type: doc?.document_type,
        document_guess: extra?.document_guess ?? '',
        doc_status: doc?.status,
      };
    }
  }
  return null;
}

function SideScan({ doc, side, label, url, pendingScan, onScanned, onZoom }: {
  doc: any; side: 'front' | 'back'; label: string; url: string | null;
  pendingScan: { type: string; side: 'front' | 'back' } | null;
  onScanned: () => void; onZoom: (uri: string, title: string) => void;
}) {
  const isPdf = String(url ?? '').toLowerCase().endsWith('.pdf');
  const initial = sideScanResult(doc, side);
  const isPending = pendingScan?.type === doc.document_type && pendingScan?.side === side;
  return (
    <DocumentAIScan
      key={`${doc.document_id}-${side}`}
      doc={{ document_id: doc.document_id, document_type: doc.document_type, file_url: isPdf ? null : url, file_path: url }}
      themeKey="parent"
      side={side}
      title={label}
      inlineResults
      autoStart={isPending && !initial}
      initialResult={initial}
      onScanned={onScanned}
      onViewImage={(uri: string) => onZoom(uri, `${doc.document_type} — ${side === 'front' ? 'Front' : 'Back'}`)}
    />
  );
}

// ─── Small pieces ───
function UpBtn({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={busy} onPress={onPress} style={({ hovered, pressed }: any) => [s.upBtn, TRANS, hovered && { backgroundColor: pt.accentSoft, borderColor: pt.accent }, pressed && { transform: [{ translateY: 1 }] }]}>
      {busy ? <ActivityIndicator size="small" color={pt.accent} /> : <><Ionicons name="cloud-upload-outline" size={15} color={pt.accent} /><Text style={s.upBtnText}>{label}</Text></>}
    </Pressable>
  );
}
function Req() { return <Text style={{ color: pt.red }}>*</Text>; }
function Opt() { return <Text style={s.optTag}>optional</Text>; }
function FLabel({ children }: { children: React.ReactNode }) { return <Text style={s.fLabel}>{children}</Text>; }
// Sensitive field (email / contact) — read-only with a Change button that opens
// the verify-by-code flow.
function PVerifiedField({ label, value, onChange }: { label: string; value: string; onChange: () => void }) {
  return (
    <>
      <FLabel>{label}</FLabel>
      <View style={s.pvRow}>
        <Text style={s.pvVal} numberOfLines={1}>{value}</Text>
        <Pressable onPress={onChange} style={({ hovered }: any) => [s.pvBtn, hovered && { backgroundColor: pt.accentSoft }]}>
          <Ionicons name="shield-checkmark-outline" size={13} color={pt.accent} />
          <Text style={s.pvBtnText}>Change</Text>
        </Pressable>
      </View>
    </>
  );
}
function FInput({ value, onChange, placeholder, multiline }: { value?: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return (
    <TextInput
      style={[s.fInput, multiline && { minHeight: 92, textAlignVertical: 'top', paddingTop: 11 }]}
      value={value ?? ''} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={pt.subtle} multiline={multiline}
    />
  );
}
function PillSelect({ options, value, onChange }: { options: { value: string; label: string }[]; value?: string; onChange: (v: string) => void }) {
  return (
    <View style={s.pills}>
      {options.map((o) => {
        const on = value === o.value;
        return (
          <Pressable key={o.value} onPress={() => onChange(o.value)} style={({ hovered }: any) => [s.pill, on && s.pillOn, TRANS, hovered && !on && { borderColor: pt.accent }]}>
            <Text style={[s.pillText, on && { color: '#fff' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
function SwitchRow({ icon, label, value, onChange }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable onPress={() => onChange(!value)} style={({ hovered }: any) => [s.switchRow, value && { borderColor: pt.accent, backgroundColor: '#FFFCF6' }, TRANS, hovered && !value && { borderColor: pt.accent }]}>
      <View style={s.navIc}><Ionicons name={icon} size={16} color={pt.accent} /></View>
      <Text style={s.switchLabel}>{label}</Text>
      <View style={[s.track, value && { backgroundColor: pt.accent }]}><View style={[s.knob, value && { transform: [{ translateX: 16 }] }]} /></View>
    </Pressable>
  );
}
function Mini({ icon, value, label }: { icon: keyof typeof Ionicons.glyphMap; value: string | number; label: string }) {
  return (
    <View style={s.mini}>
      <View style={s.miniIc}><Ionicons name={icon} size={15} color={pt.accent} /></View>
      <Text style={s.miniValue}>{value}</Text>
      <Text style={s.miniLabel}>{label}</Text>
    </View>
  );
}
function DataGrid({ items }: { items: { v: string; l: string }[] }) {
  return (
    <View style={s.dataGrid}>
      {items.map((it) => (
        <View key={it.l} style={s.dataCell}>
          <Text style={s.dataV} numberOfLines={1}>{it.v}</Text>
          <Text style={s.dataL}>{it.l}</Text>
        </View>
      ))}
    </View>
  );
}
function BigCard({ sec, statusLabel, statusOk, onEdit, children }: {
  sec: { title: string; sub: string; icon: keyof typeof Ionicons.glyphMap };
  statusLabel: string; statusOk: boolean; onEdit: () => void; children: React.ReactNode;
}) {
  return (
    <View style={s.big}>
      <View style={s.bigHead}>
        <View style={s.bigIc}><Ionicons name={sec.icon} size={20} color={pt.accent} /></View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={s.bigTitle}>{sec.title}</Text>
          <Text style={s.bigSub}>{sec.sub}</Text>
        </View>
        <View style={[s.bigStatus, { backgroundColor: statusOk ? pt.greenSoft : pt.amberSoft }]}>
          <Text style={[s.bigStatusText, { color: statusOk ? pt.green : pt.amber }]}>{statusLabel}</Text>
        </View>
        <Pressable onPress={onEdit} style={({ hovered }: any) => [s.editBtn, TRANS, hovered && { backgroundColor: pt.accentSoft, borderColor: pt.accent }]}>
          <Ionicons name="pencil-outline" size={14} color={pt.accent} /><Text style={s.editBtnText}>Edit</Text>
        </Pressable>
      </View>
      <View style={s.bigBody}>{children}</View>
    </View>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: pt.canvas },
  scroll: { paddingBottom: 34 },
  page: { flexDirection: 'row', gap: 22, maxWidth: 1400, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 24, alignItems: 'flex-start' },
  sidebar: { width: 330, flexGrow: 0, flexShrink: 0, gap: 16 },
  mainCol: { flex: 1, minWidth: 0 },

  // sidebar profile card
  pcard: { borderRadius: 20, padding: 18 },
  pcardTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avaWrap: { position: 'relative', cursor: 'pointer' as any },
  ava: { width: 74, height: 74, borderRadius: 20, borderWidth: 3, borderColor: 'rgba(255,255,255,.45)' },
  avaFb: { backgroundColor: 'rgba(255,255,255,.22)', alignItems: 'center', justifyContent: 'center' },
  avaText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: '#fff' },
  avaCam: { position: 'absolute', bottom: -3, right: -3, width: 26, height: 26, borderRadius: 13, backgroundColor: pt.feat2, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  pcardName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: '#fff' },
  verPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: '#fff', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4, marginTop: 6 },
  verPillOff: { backgroundColor: 'rgba(255,255,255,.92)' },
  verPillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: pt.green },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  metaText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.featInk, flex: 1 },
  pcardDiv: { height: 1, backgroundColor: 'rgba(255,255,255,.18)', marginVertical: 16 },
  pcardComp: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  compTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: '#fff' },
  compText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.featInk, marginTop: 2, lineHeight: 16 },
  compBar: { height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,.25)', marginTop: 8, overflow: 'hidden' },
  compBarFill: { height: 5, borderRadius: 3, backgroundColor: pt.accent },

  card: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 16, ...shadowSm },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14.5, color: pt.ink, marginBottom: 12 },
  cardHeadRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  cardEdit: { width: 28, height: 28, borderRadius: 9, borderWidth: 1.2, borderColor: pt.line, alignItems: 'center', justifyContent: 'center' },
  hhRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hhIc: { width: 28, height: 28, borderRadius: 9, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  hhRowLabel: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted },
  hhRowValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink, maxWidth: 130 },
  ovGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  mini: { flexBasis: '46%', flexGrow: 1, backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 12, padding: 11 },
  miniIc: { width: 28, height: 28, borderRadius: 9, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  miniValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: pt.ink },
  miniLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.muted, marginTop: 1 },

  // section nav (edit mode)
  navCard: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 10, ...shadowSm },
  navLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, color: pt.subtle, letterSpacing: 0.6, paddingHorizontal: 8, paddingTop: 6, paddingBottom: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 9, borderRadius: 11 },
  navItemOn: { backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: pt.accent },
  navIc: { width: 32, height: 32, borderRadius: 10, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  navSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.muted, marginTop: 1 },

  // carebot
  botCard: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, padding: 14, ...shadowSm },
  botHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  botMascot: { width: 40, height: 40 },
  botTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  botText: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginTop: 2, lineHeight: 16 },
  botBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: pt.accent, borderRadius: 12, paddingVertical: 11, marginTop: 12 },
  botBtnIcon: { width: 17, height: 17 },
  botBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' },

  // list mode
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: pt.ink, letterSpacing: -0.5 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: pt.muted, marginTop: 2, marginBottom: 18 },
  big: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 18, padding: 18, marginBottom: 16, ...shadowSm },
  bigHead: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bigIc: { width: 44, height: 44, borderRadius: 13, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: pt.ink },
  bigSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 2 },
  bigStatus: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 },
  bigStatusText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.3, borderColor: pt.line, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  editBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.accent },
  bigBody: { marginTop: 16, borderTopWidth: 1, borderTopColor: pt.lineSoft, paddingTop: 16 },
  dataGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dataCell: { flexBasis: 130, flexGrow: 1, backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 12, padding: 12 },
  dataV: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  dataL: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginTop: 2 },
  aboutBlock: { backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 12, padding: 13, marginTop: 12 },
  aboutLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginBottom: 5 },
  aboutText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.ink, lineHeight: 20 },
  docLine: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  docLineName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  docLineStatus: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },
  tip: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: pt.accentSoft, borderRadius: 14, padding: 14, flexWrap: 'wrap' },
  tipText: { flex: 1, minWidth: 200, fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: pt.ink },
  tipLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },

  // edit mode
  editRow: { flex: 1, flexDirection: 'row', gap: 18, alignItems: 'flex-start', minWidth: 0 },
  dataCol: { flex: 1, minWidth: 0 },
  formCol: { width: 400, flexGrow: 0, flexShrink: 0, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 18, padding: 18, ...shadowSm },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.accent },
  dvTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 23, color: pt.ink, letterSpacing: -0.4 },
  dvSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.muted, marginTop: 2, marginBottom: 16 },
  dvCard: { backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 16, paddingHorizontal: 16, ...shadowSm },
  dvRow: { paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: pt.lineSoft },
  dvLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: pt.muted },
  dvValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink, marginTop: 3 },
  why: { flexDirection: 'row', gap: 10, backgroundColor: pt.accentSoft, borderRadius: 14, padding: 14, marginTop: 16 },
  whyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  whyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, marginTop: 2, lineHeight: 18 },

  formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  formTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: pt.ink },
  stepsRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  stepsText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: pt.muted },
  stepsDots: { flexDirection: 'row', gap: 5 },
  stepDot: { width: 22, height: 4, borderRadius: 2, backgroundColor: pt.line },
  fLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink, marginTop: 14, marginBottom: 6 },
  optTag: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: pt.subtle },
  fInput: { borderWidth: 1.4, borderColor: pt.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: pt.ink, backgroundColor: pt.raise, outlineStyle: 'none' as any },
  pvRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1.4, borderColor: pt.line, borderRadius: 11, paddingLeft: 12, paddingRight: 8, paddingVertical: 8, backgroundColor: pt.raise },
  pvVal: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  pvBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.3, borderColor: pt.accent, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 6 },
  pvBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.accent },
  hint: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.subtle, marginTop: 6, lineHeight: 16 },
  grid2: { flexDirection: 'row', gap: 10 },
  addrPreview: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: pt.accentSoft, borderRadius: 10, padding: 10, marginTop: 12 },
  addrPreviewText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.ink },
  pills: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { borderWidth: 1.3, borderColor: pt.line, backgroundColor: pt.surface, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 8 },
  pillOn: { backgroundColor: pt.accent, borderColor: pt.accent },
  pillText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.muted },
  switchRow: { flexDirection: 'row', alignItems: 'center', gap: 11, borderWidth: 1.4, borderColor: pt.line, borderRadius: 13, padding: 12, marginTop: 12 },
  switchLabel: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.ink },
  track: { width: 38, height: 22, borderRadius: 11, backgroundColor: pt.line, padding: 3, justifyContent: 'center' },
  knob: { width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff' },
  memberCard: { backgroundColor: pt.raise, borderWidth: 1, borderColor: pt.line, borderRadius: 13, padding: 12 },
  memberHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  memberTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.ink },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.4, borderStyle: 'dashed', borderColor: pt.line, borderRadius: 12, paddingVertical: 11 },
  addBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },
  formBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: pt.line },
  cancelText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: pt.muted },
  saveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 13, borderRadius: 12 },
  saveText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: '#fff' },

  // documents mode
  docTabs: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  docTab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10, borderWidth: 1, borderColor: pt.line, backgroundColor: pt.surface },
  docTabOn: { borderColor: pt.accent, backgroundColor: '#FFFCF6' },
  docTabText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.muted },
  docRowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: pt.surface, borderWidth: 1, borderColor: pt.line, borderRadius: 14, padding: 13, cursor: 'pointer' as any },
  docRowCardOn: { borderColor: pt.accent, backgroundColor: '#FFFCF6' },
  upIc: { width: 44, height: 44, borderRadius: 12, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center' },
  upName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: pt.ink },
  upDesc: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: pt.muted, marginTop: 2 },
  upStatus: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  upStatusText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },
  docStatusBar: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 11, padding: 11, marginTop: 12 },
  docStatusText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5 },
  upBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.4, borderStyle: 'dashed', borderColor: pt.line, borderRadius: 12, paddingVertical: 12, marginTop: 8 },
  upBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: pt.accent },
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, borderWidth: 1.3, borderColor: pt.line, borderRadius: 12, paddingVertical: 11, marginTop: 16 },
  delBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: pt.red },
  emptyIc: { width: 60, height: 60, borderRadius: 18, backgroundColor: pt.accentSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 14 },
  emptyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: pt.ink },
  emptySub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: pt.muted, textAlign: 'center', marginTop: 6, lineHeight: 18 },
});
