// components/helper/web/HelperProfileWeb.tsx — single-page desktop helper profile.
// List mode: sidebar + big section cards. Edit mode: sidebar section-nav + data
// view + inline edit form (no modals). Scalar edits save the full merged payload
// (update_profile.php resets omitted scalars, so we always send current values).
import React, { useState } from 'react';
import { View, Text, StyleSheet, Image, ScrollView, Pressable, TextInput, ActivityIndicator, Platform, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { useHelperProfile, useHelperStats } from '@/hooks/helper';
import { useJobReferences } from '@/hooks/shared/useJobReferences';
import { useCareBot } from '@/contexts/CareBotContext';
import { NotificationModal, ConfirmationModal } from '@/components/shared';
import { DocumentAIScan, ScanResult } from '@/components/shared/DocumentAIScan';
import { VerificationHistoryList } from '@/components/shared/VerificationHistoryList';
import { ImageZoomModal } from '@/components/shared/ImageZoomModal';
import { LocationSearchInput, type LocationResult } from '@/components/shared/LocationSearchInput';
import { HelperTopNav } from './HelperTopNav';
import { wt, FEATURE_GRADIENT, ACCENT_GRADIENT } from './webTheme';

const CAREBOT_ICON = require('../../../assets/images/chatbot_icon.png');
const TRANS = { transitionDuration: '150ms', transitionProperty: 'all', transitionTimingFunction: 'ease' } as any;
const REQUIRED_DOCS = ['Valid ID', 'Barangay Clearance'];
const RELIGION_OPTIONS = ['Roman Catholic', 'Christian', 'Iglesia ni Cristo', 'Islam', 'Protestant', 'Seventh-day Adventist', 'Born Again', 'Buddhist', 'Aglipayan', 'Other', 'Prefer not to say'];
const DOC_SLOTS: { type: string; field: string; icon: keyof typeof Ionicons.glyphMap; color: string; bg: string; desc: string; twoSided?: boolean }[] = [
  { type: 'Valid ID', field: 'valid_id', icon: 'card', color: wt.blue, bg: wt.blueSoft, desc: 'Government ID — front & back', twoSided: true },
  { type: 'Barangay Clearance', field: 'barangay_clearance', icon: 'document-text', color: wt.green, bg: wt.greenSoft, desc: 'Issued by your barangay' },
  { type: 'Police Clearance', field: 'police_clearance', icon: 'shield-checkmark', color: wt.purple, bg: wt.purpleSoft, desc: 'PNP police clearance' },
  { type: 'TESDA NC2', field: 'tesda_nc2', icon: 'ribbon', color: wt.accent, bg: wt.accentSoft, desc: 'NC II certificate' },
];
type SecKey = 'personal' | 'skills' | 'prefs' | 'documents' | 'experience';

// ── small ring with configurable center colour (fixes dark-on-dark %) ──
function Ring({ pct, size = 84, stroke = 9, track = 'rgba(255,255,255,.14)', fill = wt.accent, center }: any) {
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

export function HelperProfileWeb({ userName, avatar, onLogout }: { userName: string; avatar: string | null; onLogout: () => void }) {
  const router = useRouter();
  const { open: openCareBot } = useCareBot();
  const { profileData, refresh } = useHelperProfile();
  const { stats } = useHelperStats();
  const refs = useJobReferences();
  const [editing, setEditing] = useState<SecKey | null>(null);
  const [saving, setSaving] = useState(false);
  const [notif, setNotif] = useState<{ visible: boolean; msg: string; type: 'success' | 'error' }>({ visible: false, msg: '', type: 'success' });
  const [form, setForm] = useState<Record<string, string>>({});
  // skills editor selections + wizard step (category → roles → skills → languages)
  const [selCats, setSelCats] = useState<number[]>([]);
  const [selJobs, setSelJobs] = useState<number[]>([]);
  const [selSkills, setSelSkills] = useState<number[]>([]);
  const [selLangs, setSelLangs] = useState<number[]>([]);
  const [skillStep, setSkillStep] = useState<'category' | 'roles' | 'skills' | 'languages'>('category');
  // documents editor
  const [uploadingDoc, setUploadingDoc] = useState<string | null>(null);
  const [selectedDocType, setSelectedDocType] = useState<string | null>(null);
  const [pendingScan, setPendingScan] = useState<{ type: string; side: 'front' | 'back' } | null>(null);
  const [confirmDeleteDoc, setConfirmDeleteDoc] = useState<any | null>(null);
  const [docTab, setDocTab] = useState<'docs' | 'history'>('docs');
  const [zoom, setZoom] = useState<{ uri: string; title: string } | null>(null);

  const p: any = profileData?.profile ?? {};
  const U: any = profileData?.user ?? {};
  const roles: string[] = profileData?.mappedSpecialties?.jobs ?? [];
  const skills: string[] = profileData?.mappedSpecialties?.skills ?? [];
  const languages: string[] = profileData?.mappedSpecialties?.languages ?? [];
  const docs: any[] = profileData?.documents ?? [];
  const completeness = profileData?.profile_completeness ?? 0;
  const verified = p.verification_status === 'Verified';
  const rating = Number(p.rating_average ?? 0);
  const reviews = Number(p.rating_count ?? 0);
  const go = (path: string) => router.push(path as never);

  const docVerified = docs.filter((d) => d.status === 'Verified').length;
  const personalDone = !!(p.contact_number && (p.city || p.municipality || p.address));
  const skillsDone = roles.length > 0 && skills.length > 0;
  const prefsDone = !!(p.employment_type || p.work_schedule || p.expected_salary);
  const docsDone = REQUIRED_DOCS.every((d) => docs.some((x) => x.document_type === d));
  const expDone = Number(p.years_experience) > 0;
  const location = [p.city ?? p.municipality, p.province].filter(Boolean).join(', ') || 'Location not set';
  const incompleteCount = [personalDone, skillsDone, prefsDone, docsDone].filter((x) => !x).length;

  const SECTIONS: { key: SecKey; title: string; sub: string; icon: keyof typeof Ionicons.glyphMap; color: string; fill: string; done: boolean; badge?: number }[] = [
    { key: 'personal', title: 'Personal Information', sub: 'Basic info and contact details', icon: 'person', color: wt.accent, fill: wt.accentSoft, done: personalDone },
    { key: 'skills', title: 'Skills & Expertise', sub: 'Your skills, roles and languages', icon: 'sparkles', color: wt.purple, fill: wt.purpleSoft, done: skillsDone },
    { key: 'prefs', title: 'Work Preferences', sub: 'Job setup, schedule and salary', icon: 'briefcase', color: wt.accent, fill: wt.accentSoft, done: prefsDone },
    { key: 'documents', title: 'Documents', sub: 'Your documents and verification', icon: 'shield-checkmark', color: wt.green, fill: wt.greenSoft, done: docsDone, badge: docsDone ? 0 : 1 },
    { key: 'experience', title: 'Experience', sub: 'Your previous work experience', icon: 'time', color: wt.blue, fill: wt.blueSoft, done: expDone },
  ];

  // ── save the full merged scalar payload (only overrides change).
  // `extras` (e.g. job_ids/skill_ids/language_ids JSON) are appended verbatim —
  // update_profile.php only touches those when present, so scalars stay intact. ──
  const save = async (overrides: Record<string, string>, extras?: Record<string, string>) => {
    setSaving(true);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const user = raw ? JSON.parse(raw) : {};
      const base: Record<string, string> = {
        user_id: String(user.user_id ?? ''), requester_id: String(user.user_id ?? ''),
        first_name: U.first_name ?? '', middle_name: U.middle_name ?? '', last_name: U.last_name ?? '', username: U.username ?? '',
        contact_number: p.contact_number ?? '', birth_date: (p.birth_date ?? p.date_of_birth ?? '') || '',
        gender: p.gender ?? '', civil_status: p.civil_status ?? 'Single', religion: p.religion ?? '',
        province: p.province ?? '', municipality: (p.municipality ?? p.city) ?? '', barangay: p.barangay ?? '',
        address: p.address ?? '', landmark: p.landmark ?? '', bio: p.bio ?? '', education_level: p.education_level ?? '',
        experience_years: String(p.years_experience ?? p.experience_years ?? 0),
        employment_type: p.employment_type ?? 'Any', work_schedule: p.work_schedule ?? 'Full-time',
        expected_salary: String(p.expected_salary ?? 6000), salary_period: p.salary_period ?? 'Monthly',
      };
      const payload = { ...base, ...overrides, ...(extras ?? {}) };
      // gender & education_level are nullable enums — sending '' would truncate,
      // so omit them when empty and let the backend keep NULL/its default.
      const OMIT_IF_EMPTY = new Set(['gender', 'education_level']);
      const fd = new FormData();
      Object.entries(payload).forEach(([k, v]) => {
        if (OMIT_IF_EMPTY.has(k) && (v ?? '') === '') return;
        fd.append(k, v ?? '');
      });
      const res = await fetch(`${API_URL}/helper/update_profile.php`, { method: 'POST', body: fd });
      const data = JSON.parse(await res.text());
      if (data.success) {
        setNotif({ visible: true, msg: 'Changes saved.', type: 'success' });
        setEditing(null);
        refresh();
      } else {
        setNotif({ visible: true, msg: data.message || 'Could not save.', type: 'error' });
      }
    } catch {
      setNotif({ visible: true, msg: 'Could not save. Check your connection.', type: 'error' });
    } finally { setSaving(false); }
  };

  // Skills save no longer touches experience_years — that lives on the Experience card.
  const saveSkills = () =>
    save({}, {
      job_ids: JSON.stringify(selJobs),
      skill_ids: JSON.stringify(selSkills),
      language_ids: JSON.stringify(selLangs),
    });

  // Address is a derived "barangay, municipality, province" string (same
  // convention the mobile edit modal uses) — recomputed at save time.
  const savePersonal = () => {
    const address = [form.barangay, form.municipality, form.province].filter(Boolean).join(', ');
    save({ ...form, address });
  };

  const startEdit = (key: SecKey) => {
    if (key === 'skills') {
      const jobs = profileData?.specialtyIds?.jobs ?? [];
      setSelJobs(jobs);
      setSelSkills(profileData?.specialtyIds?.skills ?? []);
      setSelLangs(profileData?.specialtyIds?.languages ?? []);
      // Pre-select the categories of the roles the helper already has.
      const cats = Array.from(new Set(refs.jobs.filter((j: any) => jobs.includes(Number(j.job_id))).map((j: any) => Number(j.category_id))));
      setSelCats(cats);
      setSkillStep('category');
    }
    if (key === 'documents') { setSelectedDocType('Valid ID'); setPendingScan(null); setDocTab('docs'); }
    setForm({
      gender: p.gender ?? 'Female', birth_date: (p.birth_date ?? p.date_of_birth ?? '') || '',
      civil_status: p.civil_status ?? 'Single', religion: p.religion ?? '', education_level: p.education_level ?? '',
      contact_number: p.contact_number ?? '', address: p.address ?? '',
      province: p.province ?? '', municipality: (p.municipality ?? p.city) ?? '', barangay: p.barangay ?? '', landmark: p.landmark ?? '',
      employment_type: p.employment_type ?? 'Stay-in', work_schedule: p.work_schedule ?? 'Full-time',
      expected_salary: String(p.expected_salary ?? ''), experience_years: String(p.years_experience ?? p.experience_years ?? ''),
    });
    setEditing(key);
  };

  // Deep-link from the dashboard setup guide (e.g. ?edit=personal) opens that editor.
  const params = useLocalSearchParams<{ edit?: string }>();
  React.useEffect(() => {
    const e = params.edit;
    if (e && ['personal', 'skills', 'prefs', 'documents', 'experience'].includes(e) && !editing) {
      startEdit(e as SecKey);
    }
  }, [params.edit, refs.loading]); // eslint-disable-line react-hooks/exhaustive-deps
  const setF = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const toggleId = (setter: React.Dispatch<React.SetStateAction<number[]>>, id: number) =>
    setter((arr) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id]));

  // Category toggle mirrors mobile: "General Househelp" (id 1) is all-around —
  // selecting it checks all 5 PESO categories AND auto-selects every role under
  // them. "Others" (id 6) is never auto-included. Selecting all 5 promotes to General.
  const toggleCategory = (id: number) => {
    const GENERAL = 1, OTHERS = 6;
    const pesoFive = refs.categories.filter((c: any) => Number(c.category_id) !== OTHERS).map((c: any) => Number(c.category_id));
    const jobIdsIn = (cats: number[]) => refs.jobs.filter((j: any) => cats.includes(Number(j.category_id))).map((j: any) => Number(j.job_id));
    const selected = selCats.includes(id);
    if (id === GENERAL) {
      if (selected) {
        const keep = selCats.filter((x) => x === OTHERS);
        setSelCats(keep);
        const keepJobs = jobIdsIn(keep);
        setSelJobs((js) => js.filter((x) => keepJobs.includes(x)));
        const keepSkills = refs.skills.filter((sk: any) => keepJobs.includes(Number(sk.job_id))).map((sk: any) => Number(sk.skill_id));
        setSelSkills((ss) => ss.filter((x) => keepSkills.includes(x)));
      } else {
        setSelCats(selCats.includes(OTHERS) ? [...pesoFive, OTHERS] : pesoFive);
        setSelJobs((js) => Array.from(new Set([...js, ...jobIdsIn(pesoFive)])));
      }
      return;
    }
    if (selected) {
      setSelCats(selCats.filter((x) => x !== id && x !== GENERAL));
      const rmJobs = refs.jobs.filter((j: any) => Number(j.category_id) === id).map((j: any) => Number(j.job_id));
      setSelJobs((js) => js.filter((x) => !rmJobs.includes(x)));
      const rmSkills = refs.skills.filter((sk: any) => rmJobs.includes(Number(sk.job_id))).map((sk: any) => Number(sk.skill_id));
      setSelSkills((ss) => ss.filter((x) => !rmSkills.includes(x)));
    } else {
      const next = [...selCats, id];
      if (pesoFive.every((c: number) => next.includes(c))) {
        setSelCats(next.includes(OTHERS) ? [...pesoFive, OTHERS] : pesoFive);
        setSelJobs((js) => Array.from(new Set([...js, ...jobIdsIn(pesoFive)])));
      } else setSelCats(next);
    }
  };

  // Pick a file and upload it to a document slot (inline — no modal, no redirect).
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
      const res = await fetch(`${API_URL}/helper/upload_documents.php`, { method: 'POST', body: fd });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Upload failed.');
      setNotif({ visible: true, msg: `${type} uploaded.`, type: 'success' });
      // Auto-run the AI scan for the side we just uploaded (front & back scan independently).
      setSelectedDocType(type);
      setPendingScan({ type, side: field === 'valid_id_back' ? 'back' : 'front' });
      refresh();
    } catch (e: any) {
      setNotif({ visible: true, msg: e?.message || 'Could not upload this document.', type: 'error' });
    } finally { setUploadingDoc(null); }
  };

  const deleteDoc = async (doc: any) => {
    setConfirmDeleteDoc(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const userId = String(JSON.parse(raw || '{}')?.user_id || '');
      const res = await fetch(`${API_URL}/helper/delete_document.php`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ document_id: doc.document_id, user_id: userId }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message || 'Could not delete.');
      setNotif({ visible: true, msg: `${doc.document_type} deleted.`, type: 'success' });
      setSelectedDocType(null);
      refresh();
    } catch (e: any) {
      setNotif({ visible: true, msg: e?.message || 'Could not delete this document.', type: 'error' });
    }
  };

  // ─── Sidebar (shared) ───
  const profileCard = (compact: boolean) => (
    <LinearGradient colors={FEATURE_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.pcard}>
      <View style={s.pcardTop}>
        <Pressable onPress={() => startEdit('personal')} style={s.avaWrap}>
          {avatar ? <Image source={{ uri: avatar }} style={s.ava} /> : <View style={[s.ava, s.avaFb]}><Ionicons name="person" size={40} color="rgba(255,255,255,.5)" /></View>}
          <View style={s.avaCam}><Ionicons name="camera" size={13} color="#fff" /></View>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={s.pcardName}>{userName || 'Helper'}</Text>
          <View style={[s.verPill, !verified && s.verPillOff]}><Ionicons name={verified ? 'checkmark-circle' : 'time-outline'} size={12} color={verified ? wt.green : wt.amber} /><Text style={[s.verPillText, !verified && { color: wt.amber }]}>{verified ? 'PESO Verified Helper' : 'Pending verification'}</Text></View>
          {roles.length > 0 && <Text style={s.pcardRoles}>{roles.slice(0, 3).join('  ·  ')}</Text>}
          <View style={s.metaItem}><Ionicons name="location-outline" size={12} color={wt.featMut} /><Text style={s.metaText}>{location}</Text></View>
        </View>
      </View>
      <View style={s.pcardDiv} />
      <View style={s.pcardComp}>
        <Ring pct={completeness} size={70} stroke={8} center="#fff" />
        <View style={{ flex: 1 }}>
          <Text style={s.compTitle}>Profile completion</Text>
          <Text style={s.compText}>{completeness >= 100 ? 'Your profile is complete!' : `Almost there! Complete ${incompleteCount || 1} more item to increase your chances.`}</Text>
          <View style={s.compBar}><View style={[s.compBarFill, { width: `${Math.min(100, completeness)}%` }]} /></View>
        </View>
      </View>
    </LinearGradient>
  );

  const careBotCard = (
    <View style={s.botCard}>
      <View style={s.botHeadRow}>
        <Image source={CAREBOT_ICON} style={s.botMascot} resizeMode="contain" />
        <View style={{ flex: 1 }}>
          <Text style={s.botTitle}>Need help improving your profile?</Text>
          <Text style={s.botText}>Chat with CareBot for tips and suggestions.</Text>
        </View>
      </View>
      <Pressable onPress={openCareBot} style={({ hovered, pressed }: any) => [s.botBtn, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
        <Image source={CAREBOT_ICON} style={s.botBtnIcon} resizeMode="contain" />
        <Text style={s.botBtnText}>Chat with CareBot</Text>
      </Pressable>
    </View>
  );

  // Values shown in a section's read view
  const readRows: Record<SecKey, { label: string; value: string }[]> = {
    personal: [
      { label: 'Gender', value: p.gender || '—' }, { label: 'Date of Birth', value: fmtDate(p.birth_date ?? p.date_of_birth) },
      { label: 'Civil Status', value: p.civil_status || '—' }, { label: 'Religion', value: p.religion || '—' },
      { label: 'Education Level', value: p.education_level || '—' }, { label: 'Contact Number', value: p.contact_number || '—' },
      { label: 'Email Address', value: U.email || '—' }, { label: 'Current Address', value: p.address || location },
    ],
    prefs: [
      { label: 'Employment Type', value: p.employment_type || '—' }, { label: 'Work Schedule', value: p.work_schedule || '—' },
      { label: 'Expected Salary', value: p.expected_salary ? `₱${Number(p.expected_salary).toLocaleString()}` : '—' },
      { label: 'Availability', value: p.employment_type ? 'Immediately' : '—' },
    ],
    experience: [
      { label: 'Total Experience', value: Number(p.years_experience) > 0 ? `${p.years_experience} years` : '—' },
      { label: 'Most Recent Role', value: roles[0] || '—' },
    ],
    skills: [
      { label: 'Roles', value: roles.length ? roles.join(', ') : '—' },
      { label: 'Skills', value: skills.length ? skills.join(', ') : '—' },
      { label: 'Languages', value: languages.length ? languages.join(', ') : '—' },
    ],
    documents: DOC_SLOTS.map((d) => {
      const doc = docs.find((x) => x.document_type === d.type);
      return { label: d.type, value: doc ? (doc.status || 'Uploaded') : 'Not uploaded' };
    }),
  };

  return (
    <View style={s.root}>
      <HelperTopNav active={'profile' as any} userName={userName} avatar={avatar} verified={verified} onLogout={onLogout} />
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>
        <View style={s.page}>
          {/* ── SIDEBAR ── */}
          <View style={s.sidebar}>
            {profileCard(true)}
            {editing ? (
              <View style={s.navCard}>
                <Text style={s.navLabel}>PROFILE SECTIONS</Text>
                {SECTIONS.map((sec) => {
                  const on = editing === sec.key;
                  return (
                    <Pressable key={sec.key} onPress={() => startEdit(sec.key)} style={({ hovered }: any) => [s.navItem, on && s.navItemOn, TRANS, hovered && !on && { backgroundColor: wt.lineSoft }]}>
                      <View style={[s.navIc, { backgroundColor: sec.fill }]}><Ionicons name={sec.icon} size={16} color={sec.color} /></View>
                      <View style={{ flex: 1 }}>
                        <Text style={[s.navTitle, on && { color: wt.accent }]}>{sec.title}</Text>
                        <Text style={s.navSub}>{sec.sub}</Text>
                      </View>
                      {sec.badge ? <View style={s.navBadge}><Text style={s.navBadgeText}>{sec.badge}</Text></View> : <Ionicons name="checkmark-circle" size={16} color={sec.done ? wt.green : wt.subtle} />}
                      <Ionicons name="chevron-forward" size={15} color={wt.subtle} />
                    </Pressable>
                  );
                })}
              </View>
            ) : (
              <View style={s.card}>
                <Text style={s.cardTitle}>Quick Overview</Text>
                <View style={s.ovGrid}>
                  <Mini icon="briefcase" fill={wt.accentSoft} color={wt.accent} value={stats.applications ?? 0} label="Applications" onPress={() => go('/(helper)/applications')} />
                  <Mini icon="eye" fill={wt.greenSoft} color={wt.green} value={stats.profile_views ?? 0} label="Profile Views" onPress={() => go('/(helper)/profile')} />
                  <Mini icon="bookmark" fill={wt.accentSoft} color="#8A4B23" value={stats.saved_jobs ?? 0} label="Saved Jobs" onPress={() => go('/(helper)/browse/saved_jobs')} />
                  <Mini icon="star" fill={wt.amberSoft} color={wt.amber} value={rating > 0 ? rating.toFixed(1) : '—'} label="Rating" onPress={() => go('/(helper)/profile')} />
                </View>
              </View>
            )}
            {careBotCard}
          </View>

          {/* ── MAIN ── */}
          {editing === 'documents' ? (
            <View style={{ flex: 1, minWidth: 0 }}>
              <Pressable onPress={() => setEditing(null)} style={({ hovered }: any) => [s.back, hovered && { opacity: 0.7 }]}>
                <Ionicons name="arrow-back" size={17} color={wt.accent} /><Text style={s.backText}>Back to Profile</Text>
              </Pressable>
              <Text style={s.dvTitle}>Documents & Verification</Text>
              <Text style={s.dvSub}>Upload each document. It’s AI-scanned instantly, then reviewed by PESO.</Text>
              <View style={s.docTabs}>
                {(['docs', 'history'] as const).map((tab) => (
                  <Pressable key={tab} onPress={() => setDocTab(tab)} style={({ hovered }: any) => [s.docTab, docTab === tab && s.docTabOn, TRANS, hovered && docTab !== tab && { backgroundColor: wt.lineSoft }]}>
                    <Text style={[s.docTabText, docTab === tab && { color: wt.accent }]}>{tab === 'docs' ? `My Documents (${docs.length}/${DOC_SLOTS.length})` : 'Verification History'}</Text>
                  </Pressable>
                ))}
              </View>
              {docTab === 'history' ? (
                <View style={{ marginTop: 4 }}><VerificationHistoryList documents={docs} themeKey="helper" /></View>
              ) : (
              <View style={s.editRow}>
              {/* Slots list */}
              <View style={s.dataCol}>
                <View style={{ gap: 12 }}>
                  {DOC_SLOTS.map((slot) => {
                    const doc = docs.find((x) => x.document_type === slot.type);
                    const ok = doc?.status === 'Verified';
                    const rejected = doc?.status === 'Rejected';
                    const has = !!doc;
                    const on = selectedDocType === slot.type;
                    return (
                      <Pressable key={slot.type} onPress={() => setSelectedDocType(slot.type)} style={({ hovered }: any) => [s.docRowCard, on && s.docRowCardOn, TRANS, hovered && !on && { borderColor: wt.accent }]}>
                        <View style={[s.upIc, { backgroundColor: slot.bg }]}><Ionicons name={slot.icon} size={19} color={slot.color} /></View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.upName}>{slot.type}</Text>
                          <Text style={s.upDesc}>{slot.desc}</Text>
                        </View>
                        <View style={[s.upStatus, { backgroundColor: ok ? wt.greenSoft : rejected ? wt.redSoft : has ? wt.amberSoft : wt.lineSoft }]}>
                          <Text style={[s.upStatusText, { color: ok ? wt.green : rejected ? wt.red : has ? wt.amber : wt.subtle }]}>{ok ? 'Verified' : rejected ? 'Rejected' : has ? 'Pending' : 'Missing'}</Text>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color={wt.subtle} />
                      </Pressable>
                    );
                  })}
                </View>
                <View style={s.why}>
                  <Ionicons name="shield-checkmark-outline" size={17} color={wt.accent} />
                  <View style={{ flex: 1 }}><Text style={s.whyTitle}>Why documents matter</Text><Text style={s.whyText}>Verified documents earn the PESO badge and make employers far more likely to hire you.</Text></View>
                </View>
              </View>

              {/* Document detail + AI scan */}
              <DocDetailPanel
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
              {/* Data view */}
              <View style={s.dataCol}>
                <Pressable onPress={() => setEditing(null)} style={({ hovered }: any) => [s.back, hovered && { opacity: 0.7 }]}>
                  <Ionicons name="arrow-back" size={17} color={wt.accent} /><Text style={s.backText}>Back to Profile</Text>
                </Pressable>
                <Text style={s.dvTitle}>{SECTIONS.find((x) => x.key === editing)?.title}</Text>
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
                  <Ionicons name="bulb-outline" size={17} color={wt.accent} />
                  <View style={{ flex: 1 }}><Text style={s.whyTitle}>Why this matters?</Text><Text style={s.whyText}>Complete and accurate information helps employers trust your profile and find you easily.</Text></View>
                </View>
              </View>

              {/* Inline edit form */}
              <View style={s.formCol}>
                <View style={s.formHead}>
                  <Text style={s.formTitle}>Edit {SECTIONS.find((x) => x.key === editing)?.title}</Text>
                  <Pressable onPress={() => setEditing(null)} hitSlop={8}><Ionicons name="close" size={20} color={wt.muted} /></Pressable>
                </View>
                <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
                  {editing === 'personal' && (
                    <>
                      <FLabel>Gender</FLabel>
                      <Toggle options={['Female', 'Male']} value={form.gender} onChange={(v) => setF('gender', v)} />
                      <FLabel>Date of Birth</FLabel>
                      <DateField value={form.birth_date} onChange={(v) => setF('birth_date', v)} />
                      <FLabel>Civil Status</FLabel>
                      <PillSelect options={['Single', 'Married', 'Widowed', 'Separated']} value={form.civil_status} onChange={(v) => setF('civil_status', v)} />
                      <FLabel>Religion</FLabel>
                      <SelectField value={form.religion} onChange={(v) => setF('religion', v)} options={RELIGION_OPTIONS} placeholder="Select religion" />
                      <FLabel>Education Level</FLabel>
                      <PillSelect options={['Elementary', 'High School Undergrad', 'High School Grad', 'College Undergrad', 'College Grad', 'Vocational']} value={form.education_level} onChange={(v) => setF('education_level', v)} />
                      <FLabel>Contact Number</FLabel>
                      <FInput value={form.contact_number} onChange={(v) => setF('contact_number', v)} placeholder="0917 000 0000" />
                      <FLabel>Current Address</FLabel>
                      <LocationSearchInput
                        province={form.province} municipality={form.municipality} barangay={form.barangay}
                        accentColor={wt.accent}
                        onSelect={(r: LocationResult) => setForm((f) => ({ ...f, province: r.province, municipality: r.municipality, barangay: r.barangay, latitude: String(r.latitude), longitude: String(r.longitude) }))}
                      />
                      <View style={s.addrGrid}>
                        <View style={{ flex: 1 }}><FLabel>Province</FLabel><FInput value={form.province} onChange={(v) => setF('province', v)} placeholder="Leyte" /></View>
                        <View style={{ flex: 1 }}><FLabel>Municipality</FLabel><FInput value={form.municipality} onChange={(v) => setF('municipality', v)} placeholder="Isabel" /></View>
                        <View style={{ flex: 1 }}><FLabel>Barangay</FLabel><FInput value={form.barangay} onChange={(v) => setF('barangay', v)} placeholder="San Jose" /></View>
                      </View>
                      <FLabel>Landmark / Street</FLabel>
                      <FInput value={form.landmark} onChange={(v) => setF('landmark', v)} placeholder="Near church / Street name" />
                    </>
                  )}
                  {editing === 'prefs' && (
                    <>
                      <FLabel>Employment Type</FLabel>
                      <Toggle options={['Stay-in', 'Stay-out', 'Any']} value={form.employment_type} onChange={(v) => setF('employment_type', v)} />
                      <FLabel>Work Schedule</FLabel>
                      <Toggle options={['Full-time', 'Part-time', 'Any']} value={form.work_schedule} onChange={(v) => setF('work_schedule', v)} />
                      <FLabel>Expected Salary (₱ / month)</FLabel>
                      <FInput value={form.expected_salary} onChange={(v) => setF('expected_salary', v.replace(/[^0-9]/g, ''))} placeholder="8000" />
                    </>
                  )}
                  {editing === 'experience' && (
                    <>
                      <FLabel>Total Years of Experience</FLabel>
                      <FInput value={form.experience_years} onChange={(v) => setF('experience_years', v.replace(/[^0-9]/g, ''))} placeholder="3" />
                      <Text style={s.hint}>Detailed work history (past employers) can be added in the full profile editor.</Text>
                    </>
                  )}
                  {editing === 'skills' && (
                    refs.loading ? <ActivityIndicator color={wt.accent} style={{ marginTop: 20 }} /> : (
                      <SkillsWizard step={skillStep} refs={refs}
                        selCats={selCats} selJobs={selJobs} selSkills={selSkills} selLangs={selLangs}
                        onToggleCat={toggleCategory} onToggleJob={(id) => toggleId(setSelJobs, id)}
                        onToggleSkill={(id) => toggleId(setSelSkills, id)} onToggleLang={(id) => toggleId(setSelLangs, id)} />
                    )
                  )}
                </ScrollView>
                {editing === 'skills' ? (
                  <SkillsWizardFooter step={skillStep} saving={saving}
                    canNext={skillStep === 'category' ? selCats.length > 0 : skillStep === 'roles' ? selJobs.length > 0 : true}
                    onBack={() => setSkillStep((st) => st === 'languages' ? 'skills' : st === 'skills' ? 'roles' : st === 'roles' ? 'category' : 'category')}
                    onCancel={() => setEditing(null)}
                    onNext={() => setSkillStep((st) => st === 'category' ? 'roles' : st === 'roles' ? 'skills' : 'languages')}
                    onSave={saveSkills} />
                ) : (
                  <View style={s.formBtns}>
                    <Pressable onPress={() => setEditing(null)} style={({ hovered }: any) => [s.cancelBtn, TRANS, hovered && { backgroundColor: wt.lineSoft }]}><Text style={s.cancelText}>Cancel</Text></Pressable>
                    <Pressable disabled={saving} onPress={() => (editing === 'personal' ? savePersonal() : save(form))} style={({ hovered, pressed }: any) => [{ flex: 1.4 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
                      <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.saveBtn}>
                        {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>Save Changes</Text>}
                      </LinearGradient>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          ) : (
            <View style={s.mainCol}>
              <Text style={s.pageTitle}>My Profile</Text>
              <Text style={s.pageSub}>Manage your information and increase your chances of getting hired.</Text>

              {/* Personal */}
              <BigCard sec={SECTIONS[0]} statusLabel={personalDone ? 'Complete' : 'Incomplete'} statusOk={personalDone} onEdit={() => startEdit('personal')}>
                <DataGrid items={[{ v: p.gender || '—', l: 'Gender' }, { v: fmtDate(p.birth_date ?? p.date_of_birth), l: 'Date of Birth' }, { v: p.age ? `${p.age} years old` : '—', l: 'Age' }, { v: p.civil_status || '—', l: 'Civil Status' }]} />
              </BigCard>

              {/* Skills */}
              <BigCard sec={SECTIONS[1]} statusLabel={skillsDone ? 'Complete' : 'Incomplete'} statusOk={skillsDone} onEdit={() => startEdit('skills')}>
                <View style={s.chipsRow}>
                  {roles.slice(0, 3).map((r) => <Text key={r} style={s.chip}>{r}</Text>)}
                  {(roles.length + skills.length) > 3 && <Text style={[s.chip, s.chipMore]}>+{roles.length + skills.length - 3} more skills</Text>}
                  <View style={s.chipStat}><Text style={s.chipStatVal}>{roles.length}</Text><Text style={s.chipStatLbl}>Roles</Text></View>
                  <View style={s.chipStat}><Text style={s.chipStatVal}>{skills.length}</Text><Text style={s.chipStatLbl}>Skills</Text></View>
                  <View style={s.chipStat}><Text style={s.chipStatVal}>{languages.length}</Text><Text style={s.chipStatLbl}>Languages</Text></View>
                </View>
              </BigCard>

              {/* Work prefs */}
              <BigCard sec={SECTIONS[2]} statusLabel={prefsDone ? 'Complete' : 'Incomplete'} statusOk={prefsDone} onEdit={() => startEdit('prefs')}>
                <DataGrid items={[{ v: p.employment_type || '—', l: 'Employment Type' }, { v: p.work_schedule || '—', l: 'Work Schedule' }, { v: p.expected_salary ? `₱${Number(p.expected_salary).toLocaleString()}` : '—', l: 'Expected Salary' }, { v: p.employment_type ? 'Immediately' : '—', l: 'Availability' }]} />
              </BigCard>

              {/* Documents */}
              <BigCard sec={SECTIONS[3]} statusLabel={`${docVerified}/${docs.length || 5} Verified`} statusOk={docsDone} onEdit={() => startEdit('documents')}>
                <View style={s.docChips}>
                  {(docs.length ? docs : REQUIRED_DOCS.map((d) => ({ document_type: d, status: 'Pending' }))).slice(0, 5).map((d: any) => {
                    const ok = d.status === 'Verified';
                    return (
                      <View key={d.document_type} style={s.docChip}>
                        <Ionicons name={ok ? 'document-text' : 'cloud-upload-outline'} size={15} color={ok ? wt.green : wt.amber} />
                        <View><Text style={s.docName}>{d.document_type}</Text><Text style={[s.docStatus, { color: ok ? wt.green : wt.amber }]}>{ok ? 'Verified' : 'Pending'}</Text></View>
                      </View>
                    );
                  })}
                </View>
              </BigCard>

              {/* Experience */}
              <BigCard sec={SECTIONS[4]} statusLabel={expDone ? 'Complete' : 'Incomplete'} statusOk={expDone} onEdit={() => startEdit('experience')}>
                <DataGrid items={[{ v: '—', l: 'Employers' }, { v: Number(p.years_experience) > 0 ? `${p.years_experience} years` : '—', l: 'Total Experience' }, { v: roles[0] || '—', l: 'Most Recent Role' }, { v: '—', l: 'Last Work Period' }]} />
              </BigCard>

              <View style={s.tip}>
                <Ionicons name="bulb-outline" size={18} color={wt.accent} />
                <Text style={s.tipText}>Tip: A complete profile gets 3× more interview requests. </Text>
                <Pressable onPress={() => startEdit('personal')} style={({ hovered }: any) => [hovered && { opacity: 0.75 }]}><Text style={s.tipLink}>Improve your profile →</Text></Pressable>
              </View>
            </View>
          )}
        </View>
        <View style={{ height: 30 }} />
      </ScrollView>
      <ConfirmationModal
        visible={!!confirmDeleteDoc}
        title="Delete Document"
        message={`Delete "${confirmDeleteDoc?.document_type}"? This cannot be undone.`}
        confirmText="Delete" cancelText="Cancel" type="danger"
        onConfirm={() => deleteDoc(confirmDeleteDoc)}
        onCancel={() => setConfirmDeleteDoc(null)}
      />
      <ImageZoomModal visible={!!zoom} uri={zoom?.uri ?? null} title={zoom?.title} onClose={() => setZoom(null)} />
      <NotificationModal visible={notif.visible} message={notif.msg} type={notif.type} autoClose duration={1600} onClose={() => setNotif((n) => ({ ...n, visible: false }))} />
    </View>
  );
}

function fmtDate(v?: string) {
  if (!v) return '—';
  const d = new Date(String(v).replace(' ', 'T'));
  return isNaN(d.getTime()) ? '—' : d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
}
function Mini({ icon, fill, color, value, label, onPress }: any) {
  return (
    <Pressable onPress={onPress} style={({ hovered, pressed }: any) => [s.mini, TRANS, hovered && s.miniHover, pressed && { transform: [{ scale: 0.98 }] }]}>
      <View style={[s.miniIc, { backgroundColor: fill }]}><Ionicons name={icon} size={17} color={color} /></View>
      <View><Text style={s.miniVal}>{value}</Text><Text style={s.miniLabel}>{label}</Text></View>
    </Pressable>
  );
}
function BigCard({ sec, statusLabel, statusOk, onEdit, children }: any) {
  return (
    <Pressable onPress={onEdit} style={({ hovered }: any) => [s.big, TRANS, hovered && s.bigHover]}>
      <View style={s.bigHead}>
        <View style={[s.bigIc, { backgroundColor: sec.fill }]}><Ionicons name={sec.icon} size={22} color={sec.color} /></View>
        <View style={{ flex: 1 }}><Text style={s.bigTitle}>{sec.title}</Text><Text style={s.bigSub}>{sec.sub}</Text></View>
        <View style={[s.bigStatus, { backgroundColor: statusOk ? wt.greenSoft : wt.amberSoft }]}>
          <Ionicons name={statusOk ? 'checkmark-circle' : 'alert-circle'} size={14} color={statusOk ? wt.green : wt.amber} />
          <Text style={[s.bigStatusText, { color: statusOk ? wt.green : wt.amber }]}>{statusLabel}</Text>
        </View>
        <Pressable onPress={onEdit} style={({ hovered, pressed }: any) => [s.editBtn, TRANS, hovered && s.editBtnHover, pressed && { transform: [{ translateY: 1 }] }]}>
          <Ionicons name="create-outline" size={15} color={wt.accent} /><Text style={s.editBtnText}>Edit</Text>
        </Pressable>
      </View>
      <View style={s.bigBody}>{children}</View>
    </Pressable>
  );
}
function DataGrid({ items }: { items: { v: string; l: string }[] }) {
  return (
    <View style={s.dataGrid}>
      {items.map((it, i) => (
        <View key={i} style={[s.dataCell, i < items.length - 1 && s.dataCellDiv]}>
          <Text style={s.dataVal} numberOfLines={1}>{it.v}</Text>
          <Text style={s.dataLbl}>{it.l}</Text>
        </View>
      ))}
    </View>
  );
}
function FLabel({ children }: any) { return <Text style={s.fLabel}>{children}</Text>; }
function FInput({ value, onChange, placeholder, multiline }: { value: string; onChange: (v: string) => void; placeholder?: string; multiline?: boolean }) {
  return <TextInput style={[s.fInput, multiline && { minHeight: 66, textAlignVertical: 'top' }]} value={value} onChangeText={onChange} placeholder={placeholder} placeholderTextColor={wt.subtle} multiline={multiline} />;
}
// Native browser date picker (real calendar UI) — matches the web branch the
// mobile edit modal already uses for Platform.OS === 'web'.
function DateField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return React.createElement('input', {
    type: 'date', value: value || '', min: '1940-01-01', max: new Date().toISOString().slice(0, 10),
    onChange: (e: any) => onChange(e.target.value || ''),
    style: { border: `1px solid ${wt.line}`, borderRadius: 11, paddingTop: 11, paddingBottom: 11, paddingLeft: 12, paddingRight: 12, fontSize: 14, width: '100%', fontFamily: 'inherit', backgroundColor: wt.raise, color: wt.ink, boxSizing: 'border-box', marginBottom: 14 },
  });
}
// Native <select> — real dropdown behaviour, styled to match FInput.
function SelectField({ value, onChange, options, placeholder }: { value: string; onChange: (v: string) => void; options: string[]; placeholder?: string }) {
  return React.createElement(
    'select',
    {
      value: value || '',
      onChange: (e: any) => onChange(e.target.value),
      style: { border: `1px solid ${wt.line}`, borderRadius: 11, paddingTop: 11, paddingBottom: 11, paddingLeft: 12, paddingRight: 12, fontSize: 14, width: '100%', fontFamily: 'inherit', backgroundColor: wt.raise, color: value ? wt.ink : wt.subtle, boxSizing: 'border-box', marginBottom: 14 },
    },
    React.createElement('option', { value: '' }, placeholder || 'Select'),
    ...options.map((o) => React.createElement('option', { key: o, value: o }, o)),
  );
}
function Toggle({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.toggle}>
      {options.map((o) => {
        const on = value === o;
        return <Pressable key={o} onPress={() => onChange(o)} style={({ hovered }: any) => [s.toggleOpt, on && s.toggleOptOn, TRANS, hovered && !on && { backgroundColor: wt.lineSoft }]}><Text style={[s.toggleText, on && { color: '#fff' }]}>{o}</Text></Pressable>;
      })}
    </View>
  );
}
function PillSelect({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  return (
    <View style={s.chipPickWrap}>
      {options.map((o) => {
        const on = value === o;
        return (
          <Pressable key={o} onPress={() => onChange(o)} style={({ hovered }: any) => [s.pick, on && s.pickOn, TRANS, hovered && !on && { borderColor: wt.accent }]}>
            {on && <Ionicons name="checkmark" size={13} color="#fff" />}
            <Text style={[s.pickText, on && { color: '#fff' }]}>{o}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
function ChipPick({ items, selected, onToggle }: { items: { id: number; label: string }[]; selected: number[]; onToggle: (id: number) => void }) {
  if (!items.length) return <Text style={s.hint}>Nothing available.</Text>;
  return (
    <View style={s.chipPickWrap}>
      {items.map((it) => {
        const on = selected.includes(it.id);
        return (
          <Pressable key={it.id} onPress={() => onToggle(it.id)} style={({ hovered }: any) => [s.pick, on && s.pickOn, TRANS, hovered && !on && { borderColor: wt.accent }]}>
            {on && <Ionicons name="checkmark" size={13} color="#fff" />}
            <Text style={[s.pickText, on && { color: '#fff' }]}>{it.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
// Category icon/colour map — mirrors the mobile edit modal so the same
// category always looks the same regardless of platform.
type CatIconCfg = { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string };
const CAT_ICON_MAP: Array<{ match: string[]; cfg: CatIconCfg }> = [
  { match: ['general', 'household', 'househelp'], cfg: { icon: 'home', color: wt.accent, bg: wt.accentSoft } },
  { match: ['yaya', 'nanny'], cfg: { icon: 'people', color: wt.purple, bg: wt.purpleSoft } },
  { match: ['cook', 'culinary'], cfg: { icon: 'restaurant', color: wt.amber, bg: wt.amberSoft } },
  { match: ['elderly', 'senior'], cfg: { icon: 'heart', color: wt.red, bg: wt.redSoft } },
  { match: ['pet', 'animal'], cfg: { icon: 'paw', color: wt.green, bg: wt.greenSoft } },
  { match: ['driver'], cfg: { icon: 'car', color: wt.blue, bg: wt.blueSoft } },
  { match: ['laundry', 'ironing'], cfg: { icon: 'shirt', color: '#0891B2', bg: '#CFFAFE' } },
  { match: ['garden', 'landscape'], cfg: { icon: 'leaf', color: wt.green, bg: wt.greenSoft } },
  { match: ['other', 'misc'], cfg: { icon: 'grid-outline', color: wt.muted, bg: wt.lineSoft } },
];
function getCategoryIcon(name: string): CatIconCfg {
  const lower = (name || '').toLowerCase();
  for (const { match, cfg } of CAT_ICON_MAP) if (match.some((k) => lower.includes(k))) return cfg;
  return { icon: 'briefcase', color: wt.blue, bg: wt.blueSoft };
}
function CategoryGrid({ items, selected, onToggle }: { items: { id: number; label: string }[]; selected: number[]; onToggle: (id: number) => void }) {
  return (
    <View style={s.catGrid}>
      {items.map((it) => {
        const on = selected.includes(it.id);
        const { icon, color, bg } = getCategoryIcon(it.label);
        return (
          <Pressable key={it.id} onPress={() => onToggle(it.id)} style={({ hovered }: any) => [s.catCard, on && s.catCardOn, TRANS, hovered && !on && { borderColor: wt.accent }]}>
            <View style={[s.catIc, { backgroundColor: on ? 'rgba(255,255,255,.25)' : bg }]}><Ionicons name={icon} size={20} color={on ? '#fff' : color} /></View>
            <Text style={[s.catName, on && { color: '#fff' }]} numberOfLines={2}>{it.label}</Text>
            {on && <View style={s.catCheck}><Ionicons name="checkmark" size={11} color={wt.accent} /></View>}
          </Pressable>
        );
      })}
    </View>
  );
}

// Paged skills editor: Category → Roles → Skills → Languages (mirrors mobile).
const SKILL_STEPS = ['category', 'roles', 'skills', 'languages'] as const;
const SKILL_TITLES: Record<string, { title: string; hint: string }> = {
  category: { title: 'What kind of work do you do?', hint: 'Pick one or more categories. Tip: choose “General Househelp” if you can do everything — it selects all roles for you.' },
  roles: { title: 'Choose your roles', hint: 'Select every role you can take on.' },
  skills: { title: 'Add your skills', hint: 'Pick the skills you have for those roles.' },
  languages: { title: 'Languages you speak', hint: 'Select all that apply.' },
};
function SkillsWizard({ step, refs, selCats, selJobs, selSkills, selLangs, onToggleCat, onToggleJob, onToggleSkill, onToggleLang }: {
  step: 'category' | 'roles' | 'skills' | 'languages'; refs: any;
  selCats: number[]; selJobs: number[]; selSkills: number[]; selLangs: number[];
  onToggleCat: (id: number) => void; onToggleJob: (id: number) => void; onToggleSkill: (id: number) => void; onToggleLang: (id: number) => void;
}) {
  const idx = SKILL_STEPS.indexOf(step);
  const meta = SKILL_TITLES[step];
  const skills = refs.skills.filter((sk: any) => selJobs.includes(Number(sk.job_id)));
  const selectedCats = refs.categories.filter((c: any) => selCats.includes(Number(c.category_id)));
  return (
    <View>
      <View style={s.wizSteps}>
        {SKILL_STEPS.map((k, i) => <View key={k} style={[s.wizDot, i === idx && s.wizDotOn, i < idx && s.wizDotDone]} />)}
      </View>
      <Text style={s.wizStepLabel}>Step {idx + 1} of 4</Text>
      <Text style={s.wizTitle}>{meta.title}</Text>
      <Text style={s.wizHint}>{meta.hint}</Text>
      <View style={{ marginTop: 12 }}>
        {step === 'category' && <CategoryGrid items={refs.categories.map((c: any) => ({ id: Number(c.category_id), label: c.name }))} selected={selCats} onToggle={onToggleCat} />}
        {step === 'roles' && (
          selectedCats.length === 0 ? <Text style={s.hint}>Go back and pick a category first.</Text> : (
            <View style={{ gap: 16 }}>
              {selectedCats.map((cat: any) => {
                const catJobs = refs.jobs.filter((j: any) => Number(j.category_id) === Number(cat.category_id));
                if (!catJobs.length) return null;
                return (
                  <View key={cat.category_id}>
                    <View style={s.jobGroupHead}><View style={s.jobGroupDot} /><Text style={s.jobGroupTitle}>{cat.name}</Text></View>
                    <ChipPick items={catJobs.map((j: any) => ({ id: Number(j.job_id), label: j.job_title }))} selected={selJobs} onToggle={onToggleJob} />
                  </View>
                );
              })}
            </View>
          )
        )}
        {step === 'skills' && (selJobs.length ? (skills.length ? <ChipPick items={skills.map((sk: any) => ({ id: Number(sk.skill_id), label: sk.skill_name }))} selected={selSkills} onToggle={onToggleSkill} /> : <Text style={s.hint}>No specific skills for these roles — you can continue.</Text>) : <Text style={s.hint}>Go back and pick a role first.</Text>)}
        {step === 'languages' && <ChipPick items={refs.languages.map((l: any) => ({ id: Number(l.language_id), label: l.language_name }))} selected={selLangs} onToggle={onToggleLang} />}
      </View>
    </View>
  );
}
function SkillsWizardFooter({ step, saving, canNext, onBack, onCancel, onNext, onSave }: {
  step: string; saving: boolean; canNext: boolean; onBack: () => void; onCancel: () => void; onNext: () => void; onSave: () => void;
}) {
  const first = step === 'category', last = step === 'languages';
  return (
    <View style={s.formBtns}>
      <Pressable onPress={first ? onCancel : onBack} style={({ hovered }: any) => [s.cancelBtn, TRANS, hovered && { backgroundColor: wt.lineSoft }]}>
        <Text style={s.cancelText}>{first ? 'Cancel' : 'Back'}</Text>
      </Pressable>
      <Pressable disabled={saving || (!last && !canNext)} onPress={last ? onSave : onNext} style={({ hovered, pressed }: any) => [{ flex: 1.4, opacity: !last && !canNext ? 0.5 : 1 }, TRANS, hovered && { transform: [{ translateY: -2 }] }, pressed && { opacity: 0.9 }]}>
        <LinearGradient colors={ACCENT_GRADIENT} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.saveBtn}>
          {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.saveText}>{last ? 'Save Changes' : 'Next'}</Text>}
        </LinearGradient>
      </Pressable>
    </View>
  );
}
function UpBtn({ label, busy, onPress }: { label: string; busy: boolean; onPress: () => void }) {
  return (
    <Pressable disabled={busy} onPress={onPress} style={({ hovered, pressed }: any) => [s.upBtn, TRANS, hovered && s.upBtnHover, pressed && { transform: [{ translateY: 1 }] }]}>
      {busy ? <ActivityIndicator size="small" color={wt.accent} /> : <><Ionicons name="cloud-upload-outline" size={15} color={wt.accent} /><Text style={s.upBtnText}>{label}</Text></>}
    </Pressable>
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
  // Legacy documents scanned before per-side storage kept flat front data.
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

// One AI-scan block per side (front & back scan independently).
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
      themeKey="helper"
      side={side}
      title={label}
      inlineResults
      autoStart={isPending && !initial}
      initialResult={initial}
      onScanned={onScanned}
      onViewImage={(uri) => onZoom(uri, `${doc.document_type} — ${side === 'front' ? 'Front' : 'Back'}`)}
    />
  );
}

// Full document detail: preview (front/back), per-side AI scans, status, actions.
function DocDetailPanel({ slot, doc, pendingScan, uploadingKey, onUpload, onScanned, onDelete, onZoom, onClose }: {
  slot: (typeof DOC_SLOTS)[number] | null;
  doc: any | null;
  pendingScan: { type: string; side: 'front' | 'back' } | null;
  uploadingKey: string | null;
  onUpload: (field: string, type: string) => void;
  onScanned: () => void;
  onDelete: (doc: any) => void;
  onZoom: (uri: string, title: string) => void;
  onClose: () => void;
}) {
  const [side, setSide] = useState<'front' | 'back'>('front');
  if (!slot) {
    return (
      <View style={[s.formCol, { alignItems: 'center', justifyContent: 'center', paddingVertical: 60 }]}>
        <View style={[s.upIc, { width: 54, height: 54, borderRadius: 16, backgroundColor: wt.accentSoft }]}><Ionicons name="documents-outline" size={26} color={wt.accent} /></View>
        <Text style={[s.formTitle, { marginTop: 14, textAlign: 'center' }]}>Select a document</Text>
        <Text style={[s.upDesc, { textAlign: 'center', marginTop: 4, maxWidth: 220 }]}>Choose a document on the left to upload it or view its AI scan and status.</Text>
      </View>
    );
  }

  const status = String(doc?.status ?? '').toLowerCase();
  const isVerified = status === 'verified';
  const isRejected = status === 'rejected';
  const hasBack = !!doc?.file_url_back;
  const shownUrl = side === 'back' && hasBack ? doc.file_url_back : doc?.file_url;
  const shownIsPdf = String(shownUrl ?? '').toLowerCase().endsWith('.pdf');
  const uploaded = doc?.uploaded_at ? new Date(String(doc.uploaded_at).replace(' ', 'T')).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : null;

  return (
    <View style={s.formCol}>
      <View style={s.formHead}>
        <Text style={s.formTitle}>{slot.type}</Text>
        <Pressable onPress={onClose} hitSlop={8}><Ionicons name="close" size={20} color={wt.muted} /></Pressable>
      </View>
      <ScrollView style={{ maxHeight: 620 }} showsVerticalScrollIndicator={false}>
        {!doc ? (
          <View style={{ alignItems: 'center', paddingVertical: 8 }}>
            <View style={[s.upIc, { width: 50, height: 50, borderRadius: 15, backgroundColor: slot.bg }]}><Ionicons name={slot.icon} size={24} color={slot.color} /></View>
            <Text style={[s.upName, { marginTop: 12, fontSize: 15 }]}>Upload {slot.type}</Text>
            <Text style={[s.upDesc, { textAlign: 'center', marginTop: 3, marginBottom: 14 }]}>{slot.desc}</Text>
            <View style={{ alignSelf: 'stretch', gap: 8 }}>
              <UpBtn label={slot.twoSided ? 'Upload Front' : 'Upload'} busy={uploadingKey === slot.type + slot.field} onPress={() => onUpload(slot.field, slot.type)} />
              {slot.twoSided && <UpBtn label="Upload Back" busy={uploadingKey === slot.type + 'valid_id_back'} onPress={() => onUpload('valid_id_back', slot.type)} />}
            </View>
          </View>
        ) : (
          <>
            {/* Preview — tap to zoom / review */}
            <Pressable onPress={() => shownUrl && onZoom(shownUrl, `${slot.type}${hasBack ? ` — ${side === 'front' ? 'Front' : 'Back'}` : ''}`)} style={s.docPreview}>
              {shownUrl && !shownIsPdf ? (
                <Image source={{ uri: shownUrl }} style={s.docPreviewImg} resizeMode="cover" />
              ) : (
                <View style={s.docPreviewFb}><Ionicons name={shownIsPdf ? 'document-text' : 'document-outline'} size={40} color={wt.subtle} /><Text style={s.docPreviewFbText}>{shownIsPdf ? 'PDF file' : 'No preview'}</Text></View>
              )}
              {shownUrl ? <View style={s.docZoomBadge}><Ionicons name="expand" size={13} color="#fff" /><Text style={s.docZoomText}>View</Text></View> : null}
            </Pressable>
            {hasBack && (
              <View style={s.sideToggle}>
                {(['front', 'back'] as const).map((sd) => (
                  <Pressable key={sd} onPress={() => setSide(sd)} style={[s.sideBtn, side === sd && s.sideBtnOn]}>
                    <Ionicons name={side === sd ? 'card' : 'card-outline'} size={14} color={side === sd ? '#fff' : wt.muted} />
                    <Text style={[s.sideBtnText, side === sd && { color: '#fff' }]}>{sd === 'front' ? 'Front' : 'Back'}</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Status banner */}
            <View style={[s.docBanner, { backgroundColor: isVerified ? wt.greenSoft : isRejected ? wt.redSoft : wt.amberSoft }]}>
              <Ionicons name={isVerified ? 'shield-checkmark' : isRejected ? 'close-circle' : 'time'} size={18} color={isVerified ? wt.green : isRejected ? wt.red : wt.amber} />
              <View style={{ flex: 1 }}>
                <Text style={[s.docBannerTitle, { color: isVerified ? wt.green : isRejected ? wt.red : wt.amber }]}>{isVerified ? 'Verified by PESO' : isRejected ? 'Rejected by PESO' : 'Pending — Under Review'}</Text>
                <Text style={s.docBannerSub}>{isVerified ? `Verified${doc.verified_by ? ` by ${doc.verified_by}` : ''}.` : isRejected ? (doc.rejection_reason || 'Please re-upload a corrected copy.') : 'PESO is reviewing this document.'}{uploaded ? `  Uploaded ${uploaded}.` : ''}</Text>
              </View>
            </View>

            {/* AI scan — front & back each get their own scan */}
            <Text style={s.docSectionLabel}>AI Document Scan</Text>
            <View style={{ gap: 14 }}>
              <SideScan doc={doc} side="front" label={slot.twoSided ? 'Front side' : undefined as any} url={doc.file_url} pendingScan={pendingScan} onScanned={onScanned} onZoom={onZoom} />
              {slot.twoSided && (
                doc.file_url_back
                  ? <SideScan doc={doc} side="back" label="Back side" url={doc.file_url_back} pendingScan={pendingScan} onScanned={onScanned} onZoom={onZoom} />
                  : <View style={s.backHint}><Ionicons name="information-circle-outline" size={16} color={wt.muted} /><Text style={s.backHintText}>Upload the back side to scan it separately.</Text></View>
              )}
            </View>

            {/* Actions */}
            <View style={s.docActions}>
              <UpBtn label={slot.twoSided ? 'Replace Front' : 'Replace'} busy={uploadingKey === slot.type + slot.field} onPress={() => onUpload(slot.field, slot.type)} />
              {slot.twoSided && <UpBtn label={doc.file_url_back ? 'Replace Back' : 'Upload Back'} busy={uploadingKey === slot.type + 'valid_id_back'} onPress={() => onUpload('valid_id_back', slot.type)} />}
            </View>
            <View style={s.docActions}>
              {!!doc.file_url && (
                <Pressable onPress={() => Linking.openURL(shownUrl || doc.file_url)} style={({ hovered }: any) => [s.docDownload, TRANS, hovered && { backgroundColor: wt.lineSoft }]}>
                  <Ionicons name="download-outline" size={16} color={wt.ink} /><Text style={s.docDownloadText}>Download</Text>
                </Pressable>
              )}
              <Pressable onPress={() => onDelete(doc)} style={({ hovered }: any) => [s.docDelete, TRANS, hovered && { backgroundColor: wt.redSoft }]}>
                <Ionicons name="trash-outline" size={16} color={wt.red} /><Text style={s.docDeleteText}>Delete</Text>
              </Pressable>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const shadowSm = { boxShadow: '0 3px 12px rgba(120,80,45,.07)' } as any;
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: wt.canvas },
  scroll: { paddingBottom: 20 },
  page: { flexDirection: 'row', gap: 20, maxWidth: 1480, width: '100%', alignSelf: 'center', paddingHorizontal: 28, paddingTop: 22 },
  sidebar: { width: 300, gap: 16 },

  // Profile card (dark)
  pcard: { borderRadius: 18, padding: 18, overflow: 'hidden' },
  pcardTop: { flexDirection: 'row', gap: 14, alignItems: 'center' },
  avaWrap: { position: 'relative' },
  ava: { width: 88, height: 88, borderRadius: 44, borderWidth: 3, borderColor: wt.accent },
  avaFb: { backgroundColor: 'rgba(255,255,255,.12)', alignItems: 'center', justifyContent: 'center' },
  avaCam: { position: 'absolute', right: 0, bottom: 2, width: 28, height: 28, borderRadius: 14, backgroundColor: wt.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: wt.feat2 },
  pcardName: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, letterSpacing: -0.3 },
  verPill: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(22,163,74,.16)', borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, marginVertical: 6 },
  verPillOff: { backgroundColor: 'rgba(201,122,14,.20)' },
  verPillText: { color: wt.green, fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5 },
  pcardRoles: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, marginBottom: 5 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 12 },
  pcardDiv: { height: 1, backgroundColor: 'rgba(255,255,255,.12)', marginVertical: 16 },
  pcardComp: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  compTitle: { color: wt.featInk, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5 },
  compText: { color: wt.featMut, fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, lineHeight: 16, marginVertical: 5 },
  compBar: { height: 7, borderRadius: 999, backgroundColor: 'rgba(255,255,255,.14)', overflow: 'hidden' },
  compBarFill: { height: '100%', borderRadius: 999, backgroundColor: wt.accent },

  // Section nav (edit mode)
  navCard: { backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 18, padding: 12, ...shadowSm },
  navLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10.5, letterSpacing: 1, color: wt.subtle, paddingHorizontal: 8, paddingVertical: 8 },
  navItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 12, borderLeftWidth: 3, borderLeftColor: 'transparent' },
  navItemOn: { backgroundColor: wt.accentSoft, borderLeftColor: wt.accent },
  navIc: { width: 34, height: 34, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  navSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.muted },
  navBadge: { backgroundColor: wt.amber, borderRadius: 9, minWidth: 18, alignItems: 'center', paddingHorizontal: 5 },
  navBadgeText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  // Quick overview
  card: { backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 18, padding: 16, ...shadowSm },
  cardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink, marginBottom: 14 },
  ovGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  mini: { width: '45%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 6, cursor: 'pointer' as any },
  miniHover: { backgroundColor: '#FFF9F3' },
  miniIc: { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  miniVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 20, color: wt.ink },
  miniLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.muted },

  // CareBot
  botCard: { backgroundColor: wt.accentSoft, borderRadius: 18, padding: 16 },
  botHeadRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  botMascot: { width: 46, height: 46 },
  botTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.ink },
  botText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, marginTop: 3 },
  botBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: wt.feat2, borderRadius: 11, paddingHorizontal: 14, paddingVertical: 11 },
  botBtnIcon: { width: 18, height: 18 },
  botBtnText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 13 },

  // Main list
  mainCol: { flex: 1, gap: 16, minWidth: 0 },
  pageTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 26, color: wt.ink, letterSpacing: -0.5 },
  pageSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: wt.muted, marginTop: 2, marginBottom: 6 },

  big: { backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 18, padding: 22, ...shadowSm, cursor: 'pointer' as any },
  bigHover: { borderColor: wt.accent, boxShadow: '0 10px 26px rgba(232,100,26,.10)' as any },
  bigHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  bigIc: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bigTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16.5, color: wt.ink },
  bigSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, marginTop: 1 },
  bigStatus: { flexDirection: 'row', alignItems: 'center', gap: 5, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  bigStatusText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1.4, borderColor: wt.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  editBtnHover: { backgroundColor: wt.accentSoft, transform: [{ translateY: -1 }] },
  editBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.accent },
  bigBody: { marginTop: 18, borderTopWidth: 1, borderTopColor: wt.lineSoft, paddingTop: 16 },

  dataGrid: { flexDirection: 'row' },
  dataCell: { flex: 1, paddingHorizontal: 4 },
  dataCellDiv: { borderRightWidth: 1, borderRightColor: wt.lineSoft },
  dataVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink },
  dataLbl: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted, marginTop: 2 },

  chipsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  chip: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.ink, backgroundColor: wt.lineSoft, borderRadius: 8, paddingHorizontal: 11, paddingVertical: 6 },
  chipMore: { color: wt.accent, backgroundColor: wt.accentSoft },
  chipStat: { marginLeft: 8, alignItems: 'center' },
  chipStatVal: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: wt.ink },
  chipStatLbl: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: wt.muted },

  docChips: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  docChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderColor: wt.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: wt.raise },
  docName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.ink },
  docStatus: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },

  tip: { flexDirection: 'row', alignItems: 'center', gap: 9, backgroundColor: wt.accentSoft, borderRadius: 14, paddingHorizontal: 18, paddingVertical: 14, marginTop: 4 },
  tipText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.ink },
  tipLink: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.accent },

  // Edit mode
  editRow: { flex: 1, flexDirection: 'row', gap: 20, minWidth: 0 },
  dataCol: { flex: 1, minWidth: 0 },
  back: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 12 },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.accent },
  dvTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 24, color: wt.ink, letterSpacing: -0.4 },
  dvSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13.5, color: wt.muted, marginTop: 2, marginBottom: 16 },
  dvCard: { backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 16, paddingHorizontal: 18, ...shadowSm },
  dvRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: wt.lineSoft },
  dvLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.muted },
  dvValue: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.ink },
  why: { flexDirection: 'row', gap: 10, backgroundColor: wt.accentSoft, borderRadius: 14, padding: 14, marginTop: 16 },
  whyTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  whyText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, marginTop: 2, lineHeight: 17 },

  formCol: { width: 340, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 18, padding: 18, ...shadowSm, alignSelf: 'flex-start' },
  formHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  formTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: wt.ink },
  fLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: wt.muted, marginBottom: 6, marginTop: 12 },
  fInput: { borderWidth: 1, borderColor: wt.line, borderRadius: 11, paddingHorizontal: 12, paddingVertical: 11, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: wt.ink, backgroundColor: wt.raise },
  addrGrid: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  hint: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.subtle, marginTop: 10, lineHeight: 17 },
  toggle: { flexDirection: 'row', gap: 8 },
  toggleOpt: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: wt.line, backgroundColor: wt.raise },
  toggleOptOn: { backgroundColor: wt.accent, borderColor: wt.accent },
  toggleText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.muted },

  // Skills chip picker
  chipPickWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wizSteps: { flexDirection: 'row', gap: 6, marginBottom: 12 },
  wizDot: { flex: 1, height: 5, borderRadius: 3, backgroundColor: wt.line },
  wizDotOn: { backgroundColor: wt.accent },
  wizDotDone: { backgroundColor: wt.green },
  wizStepLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5, color: wt.accent, letterSpacing: 0.4 },
  wizTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: wt.ink, marginTop: 3 },
  wizHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: wt.muted, marginTop: 3, lineHeight: 17 },
  catGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: { width: '47%', flexGrow: 1, flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: wt.raise, borderRadius: 14, paddingVertical: 13, paddingHorizontal: 12, borderWidth: 1.5, borderColor: wt.line, cursor: 'pointer' as any },
  catCardOn: { backgroundColor: wt.accent, borderColor: wt.accent },
  catIc: { width: 38, height: 38, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink, lineHeight: 18 },
  catCheck: { position: 'absolute', top: -6, right: -6, width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center', ...({ boxShadow: '0 2px 6px rgba(0,0,0,.15)' } as any) },
  jobGroupHead: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  jobGroupDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: wt.accent },
  jobGroupTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.muted, textTransform: 'uppercase', letterSpacing: 0.4 },
  pick: { flexDirection: 'row', alignItems: 'center', gap: 4, borderWidth: 1, borderColor: wt.line, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: wt.raise },
  pickOn: { backgroundColor: wt.accent, borderColor: wt.accent },
  pickText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.ink },

  // Document upload slots
  upSlot: { borderWidth: 1, borderColor: wt.line, borderRadius: 13, padding: 12, backgroundColor: wt.raise },
  upHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  upIc: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  upName: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: wt.ink },
  upDesc: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.muted, marginTop: 1 },
  upStatus: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 4 },
  upStatusText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11 },
  upBtns: { flexDirection: 'row', gap: 8, marginTop: 10 },
  upBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1.4, borderColor: wt.accent, borderRadius: 10, paddingVertical: 9, minHeight: 38 },
  upBtnHover: { backgroundColor: wt.accentSoft, transform: [{ translateY: -1 }] },
  upBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.accent },

  // Documents manager — tabs, slot rows (middle) + detail panel (right)
  docTabs: { flexDirection: 'row', gap: 6, backgroundColor: wt.lineSoft, borderRadius: 12, padding: 4, marginTop: 14, marginBottom: 16, alignSelf: 'flex-start' },
  docTab: { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 9 },
  docTabOn: { backgroundColor: wt.surface, ...shadowSm },
  docTabText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.muted },
  docRowCard: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: wt.surface, borderWidth: 1, borderColor: wt.line, borderRadius: 14, padding: 14, ...shadowSm, cursor: 'pointer' as any },
  docRowCardOn: { borderColor: wt.accent, backgroundColor: '#FFF9F3' },
  docPreview: { height: 180, borderRadius: 14, overflow: 'hidden', backgroundColor: wt.lineSoft, marginBottom: 10, cursor: 'pointer' as any },
  docPreviewImg: { width: '100%', height: '100%' },
  docPreviewFb: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 6 },
  docPreviewFbText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: wt.subtle },
  docZoomBadge: { position: 'absolute', right: 10, bottom: 10, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  docZoomText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 11.5 },
  backHint: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: wt.lineSoft, borderRadius: 12, padding: 12 },
  backHintText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: wt.muted },
  sideToggle: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  sideBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: wt.line, backgroundColor: wt.raise },
  sideBtnOn: { backgroundColor: wt.accent, borderColor: wt.accent },
  sideBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: wt.muted },
  docBanner: { flexDirection: 'row', alignItems: 'center', gap: 10, borderRadius: 12, padding: 12, marginBottom: 14 },
  docBannerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5 },
  docBannerSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 11.5, color: wt.muted, marginTop: 2, lineHeight: 16 },
  docSectionLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink, marginBottom: 10 },
  docActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  docDownload: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: wt.line },
  docDownloadText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.ink },
  docDelete: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: wt.redSoft },
  docDeleteText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: wt.red },

  formBtns: { flexDirection: 'row', gap: 10, marginTop: 16 },
  cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 11, borderWidth: 1, borderColor: wt.line },
  cancelText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: wt.muted },
  saveBtn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 11 },
  saveText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
});
