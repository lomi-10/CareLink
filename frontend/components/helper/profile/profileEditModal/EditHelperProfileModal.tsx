// components/helper/profile/profileEditModal/EditHelperProfileModal.tsx
// PHP: helper/get_profile.php (load), helper/update_profile.php (save)
//
// Flow: Modal opens → Section Chooser → tap section → paged steps → Save
// All business logic (state, API calls, toggles) is preserved from original.

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator, Animated, Keyboard, KeyboardAvoidingView,
  Modal, Platform, Pressable, ScrollView, StyleSheet,
  Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontFamily } from '@/constants/GlobalStyles';
import API_URL from '@/constants/api';
import { NotificationModal } from '@/components/shared';
import { AddressSection, SelectionModal } from '.';

// ─── Category icon map ────────────────────────────────────────────────────────
// Maps PESO job category names → Ionicons icon + color theme for the card grid.

type IconCfg = { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string };

const CAT_ICON_MAP: Array<{ match: string[]; cfg: IconCfg }> = [
  { match: ['general', 'household', 'househelp'], cfg: { icon: 'home',              color: '#E86019', bg: '#FEE2D5' } },
  { match: ['yaya', 'nanny'],                     cfg: { icon: 'people',            color: '#7C3AED', bg: '#EDE9FE' } },
  { match: ['cook', 'culinary'],                  cfg: { icon: 'restaurant',        color: '#D97706', bg: '#FEF3C7' } },
  { match: ['elderly', 'senior'],                 cfg: { icon: 'heart',             color: '#DC2626', bg: '#FEE2E2' } },
  { match: ['pet', 'animal'],                     cfg: { icon: 'paw',               color: '#059669', bg: '#D1FAE5' } },
  { match: ['driver'],                            cfg: { icon: 'car',               color: '#2563EB', bg: '#DBEAFE' } },
  { match: ['laundry', 'ironing'],                cfg: { icon: 'shirt',             color: '#0891B2', bg: '#CFFAFE' } },
  { match: ['garden', 'landscape'],               cfg: { icon: 'leaf',              color: '#16A34A', bg: '#DCFCE7' } },
  { match: ['other', 'misc'],                     cfg: { icon: 'grid-outline',      color: '#6B7280', bg: '#F3F4F6' } },
];

function getCategoryIcon(name: string): IconCfg {
  const lower = name.toLowerCase();
  for (const { match, cfg } of CAT_ICON_MAP) {
    if (match.some(k => lower.includes(k))) return cfg;
  }
  return { icon: 'briefcase', color: '#2563EB', bg: '#DBEAFE' };
}

// ─── Types ────────────────────────────────────────────────────────────────────

type SectionKey = 'personal' | 'address' | 'professional' | 'skills' | 'preferences';
type ModalView  = { type: 'chooser' } | { type: 'section'; key: SectionKey; step: number };

interface Props {
  visible:           boolean;
  onClose:           () => void;
  onSaveSuccess?:    () => void;
  /** Called right after a photo upload succeeds, so the host screen can
   *  refresh its own profile data without closing this modal. */
  onProfileUpdated?: () => void;
}

// ─── Section config ───────────────────────────────────────────────────────────

const SECTIONS: {
  key:        SectionKey;
  title:      string;
  subtitle:   string;
  icon:       keyof typeof Ionicons.glyphMap;
  iconBg:     string;
  iconColor:  string;
  totalSteps: number;
}[] = [
  { key: 'personal',     title: 'Personal Information', subtitle: 'Name, birth date, gender and contact details',      icon: 'person',          iconBg: '#DBEAFE', iconColor: '#2563EB', totalSteps: 3 },
  { key: 'address',      title: 'Address',              subtitle: 'Your current location and address',                  icon: 'location',        iconBg: '#FEE2D5', iconColor: '#E86019', totalSteps: 1 },
  { key: 'professional', title: 'Professional Profile', subtitle: 'Bio, education and your experience',                 icon: 'briefcase',       iconBg: '#D1FAE5', iconColor: '#059669', totalSteps: 2 },
  { key: 'skills',       title: 'Skills & Matching',    subtitle: 'Roles, skills, languages and job categories',        icon: 'sparkles',        iconBg: '#EDE9FE', iconColor: '#7C3AED', totalSteps: 4 },
  { key: 'preferences',  title: 'Work Preferences',     subtitle: 'Work setup, schedule and expected salary',           icon: 'time-outline',    iconBg: '#FEF3C7', iconColor: '#D97706', totalSteps: 1 },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseBirthYmd(s: string): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(2000, 0, 15);
}

function toYmd(d: Date): string {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
}

const ORANGE = '#E86019';
const DARK   = '#2A1608';
const MUTED  = '#7A5C3E';

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditHelperProfileModal({ visible, onClose, onSaveSuccess, onProfileUpdated }: Props) {

  // ── Navigation state ────────────────────────────────────────────────────────
  const [view, setView] = useState<ModalView>({ type: 'chooser' });

  // ── All profile state (unchanged from original) ──────────────────────────────
  const [userId, setUserId] = useState<string | null>(null);
  const [firstName,    setFirstName]    = useState('');
  const [middleName,   setMiddleName]   = useState('');
  const [lastName,     setLastName]     = useState('');
  const [username,     setUsername]     = useState('');
  const [email,        setEmail]        = useState('');
  const [contactNumber,setContactNumber]= useState('');
  const [birthDate,    setBirthDate]    = useState('');
  const [gender,       setGender]       = useState<'Male' | 'Female'>('Female');
  const [civilStatus,  setCivilStatus]  = useState<string>('Single');
  const [religion,     setReligion]     = useState('');
  const [province,     setProvince]     = useState('Leyte');
  const [municipality, setMunicipality] = useState('');
  const [barangay,     setBarangay]     = useState('');
  const [address,      setAddress]      = useState('');
  const [landmark,     setLandmark]     = useState('');
  const [latitude,     setLatitude]     = useState<number | null>(null);
  const [longitude,    setLongitude]    = useState<number | null>(null);
  const [bio,          setBio]          = useState('');
  const [educationLevel, setEducationLevel] = useState<string>('High School Grad');
  const [experienceYears, setExperienceYears] = useState('0');
  const [employmentType, setEmploymentType] = useState<string>('Any');
  const [workSchedule,   setWorkSchedule]   = useState<string>('Full-time');
  const [expectedSalary, setExpectedSalary] = useState('6000');
  const [salaryPeriod,   setSalaryPeriod]   = useState<string>('Monthly');
  const [profileImage,   setProfileImage]   = useState<string | null>(null);
  const [imageChanged,   setImageChanged]   = useState(false);

  // Reference data
  const [availableCategories, setAvailableCategories] = useState<any[]>([]);
  const [availableJobs,       setAvailableJobs]       = useState<any[]>([]);
  const [availableSkills,     setAvailableSkills]     = useState<any[]>([]);
  const [availableLanguages,  setAvailableLanguages]  = useState<any[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedJobIds,      setSelectedJobIds]      = useState<number[]>([]);
  const [selectedSkillIds,    setSelectedSkillIds]    = useState<number[]>([]);
  const [selectedLanguageIds, setSelectedLanguageIds] = useState<number[]>([]);
  const [customJobs,  setCustomJobs]  = useState<string[]>([]);
  const [customSkills,setCustomSkills]= useState<string[]>([]);

  // UI state
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType,    setNotifType]    = useState<'success' | 'error'>('success');
  const [showBirthPicker, setShowBirthPicker] = useState(false);

  // Selection modals
  const [jobModalVisible,      setJobModalVisible]      = useState(false);
  const [skillModalVisible,    setSkillModalVisible]    = useState(false);
  const [languageModalVisible, setLanguageModalVisible] = useState(false);
  const [jobSearch,  setJobSearch]  = useState('');
  const [skillSearch,setSkillSearch]= useState('');
  const [langSearch, setLangSearch] = useState('');

  // ── Computed ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const parts = [barangay, municipality, province].filter(p => p?.trim());
    if (parts.length) setAddress(parts.join(', '));
  }, [barangay, municipality, province]);

  const isGeneralHousehelpSelected = selectedCategoryIds.includes(1);
  const availableJobsForSelection  = useMemo(() => {
    if (isGeneralHousehelpSelected) return availableJobs;
    if (!selectedCategoryIds.length) return [];
    return availableJobs.filter(j => selectedCategoryIds.includes(j.category_id));
  }, [availableJobs, selectedCategoryIds, isGeneralHousehelpSelected]);

  const availableSkillsForSelection = useMemo(() => {
    if (!selectedJobIds.length) return [];
    return availableSkills.filter(s => selectedJobIds.includes(s.job_id));
  }, [availableSkills, selectedJobIds]);

  const filteredJobs  = useMemo(() => availableJobsForSelection.filter(j => j.job_title.toLowerCase().includes(jobSearch.toLowerCase())), [availableJobsForSelection, jobSearch]);
  const filteredSkills= useMemo(() => availableSkillsForSelection.filter(s => s.skill_name.toLowerCase().includes(skillSearch.toLowerCase())), [availableSkillsForSelection, skillSearch]);
  const filteredLangs = useMemo(() => availableLanguages.filter(l => l.language_name.toLowerCase().includes(langSearch.toLowerCase())), [availableLanguages, langSearch]);

  const selectedCategories = useMemo(() => availableCategories.filter(c => selectedCategoryIds.includes(c.category_id)), [availableCategories, selectedCategoryIds]);
  const selectedJobs       = useMemo(() => availableJobs.filter(j => selectedJobIds.includes(j.job_id)), [availableJobs, selectedJobIds]);
  const selectedSkills     = useMemo(() => availableSkills.filter(s => selectedSkillIds.includes(s.skill_id)), [availableSkills, selectedSkillIds]);
  const selectedLanguages  = useMemo(() => availableLanguages.filter(l => selectedLanguageIds.includes(l.language_id)), [availableLanguages, selectedLanguageIds]);

  // ── Lifecycle ───────────────────────────────────────────────────────────────
  useEffect(() => {
    if (visible) { loadData(); setImageChanged(false); setView({ type: 'chooser' }); }
  }, [visible]);

  const showNotif = (msg: string, type: 'success' | 'error') => {
    setNotifMessage(msg); setNotifType(type); setNotifVisible(true);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const raw  = await AsyncStorage.getItem('user_data');
      if (!raw)  throw new Error('Not logged in');
      const parsed = JSON.parse(raw);
      setUserId(parsed.user_id);
      const res  = await fetch(`${API_URL}/helper/get_profile.php?user_id=${parsed.user_id}&requester_id=${parsed.user_id}`);
      const data = JSON.parse(await res.text());
      if (!data.success) throw new Error(data.message || 'Failed to load profile');

      if (data.user) {
        setFirstName(data.user.first_name || '');
        setMiddleName(data.user.middle_name || '');
        setLastName(data.user.last_name || '');
        setUsername(data.user.username || '');
        setEmail(data.user.email || '');
      }
      if (data.profile) {
        const p = data.profile;
        setContactNumber(p.contact_number || '');
        setBirthDate(p.birth_date || '');
        setGender(p.gender || 'Female');
        setCivilStatus(p.civil_status || 'Single');
        setReligion(p.religion || '');
        setProvince(p.province || 'Leyte');
        setMunicipality(p.municipality || '');
        setBarangay(p.barangay || '');
        setLandmark(p.landmark || '');
        setLatitude(p.latitude   ? parseFloat(p.latitude)  : null);
        setLongitude(p.longitude ? parseFloat(p.longitude) : null);
        setBio(p.bio || '');
        setEducationLevel(p.education_level || 'High School Grad');
        setExperienceYears(p.experience_years ? String(p.experience_years) : '0');
        setEmploymentType(p.employment_type || 'Any');
        setWorkSchedule(p.work_schedule || 'Full-time');
        setExpectedSalary(p.expected_salary ? String(p.expected_salary) : '6000');
        setSalaryPeriod(p.salary_period || 'Monthly');
        setProfileImage(p.profile_image || null);
      }
      setAvailableCategories(data.available_categories || []);
      setAvailableSkills(data.available_skills || []);
      setAvailableLanguages(data.available_languages || []);
      setAvailableJobs(data.available_jobs || []);
      const selectedJobData = data.selected_jobs || [];
      const jobData         = data.available_jobs || [];
      const catIds          = new Set<number>();
      selectedJobData.forEach((jobId: number) => {
        const job = jobData.find((j: any) => j.job_id === jobId);
        if (job) catIds.add(job.category_id);
      });
      setSelectedCategoryIds(Array.from(catIds));
      setSelectedJobIds(data.selected_jobs || []);
      setSelectedSkillIds(data.selected_skills || []);
      setSelectedLanguageIds(data.selected_languages || []);
    } catch (e: any) {
      showNotif(e.message || 'Failed to load', 'error');
    } finally {
      setLoading(false);
    }
  };

  // ── Toggle handlers ─────────────────────────────────────────────────────────
  // General Househelp (id 1) is the "all-around" category; Others (id 6) is the
  // catch-all and is NEVER auto-included. Selecting General Househelp checks all
  // 5 PESO categories (1–5) AND auto-selects every job role under them.
  const GENERAL_ID = 1;
  const OTHERS_ID  = 6;
  const jobIdsIn = (catIds: number[]) => availableJobs.filter(j => catIds.includes(j.category_id)).map(j => j.job_id);

  const toggleCategory = (id: number) => {
    const pesoFive = availableCategories.filter(c => c.category_id !== OTHERS_ID).map(c => c.category_id); // [1..5]
    const selected = selectedCategoryIds.includes(id);

    if (id === GENERAL_ID) {
      if (selected) {
        // Deselect all-around → keep only Others if it was picked; drop the rest + their jobs/skills
        const keep = selectedCategoryIds.filter(x => x === OTHERS_ID);
        setSelectedCategoryIds(keep);
        const keepJobs = jobIdsIn(keep);
        setSelectedJobIds(selectedJobIds.filter(x => keepJobs.includes(x)));
        const keepSkills = availableSkills.filter(s => keepJobs.includes(s.job_id)).map(s => s.skill_id);
        setSelectedSkillIds(selectedSkillIds.filter(x => keepSkills.includes(x)));
      } else {
        // Select all-around → all 5 categories + ALL their job roles auto-checked
        const cats = selectedCategoryIds.includes(OTHERS_ID) ? [...pesoFive, OTHERS_ID] : pesoFive;
        setSelectedCategoryIds(cats);
        setSelectedJobIds(Array.from(new Set([...selectedJobIds, ...jobIdsIn(pesoFive)])));
      }
      return;
    }

    // A specific (non-general) category
    if (selected) {
      const next = selectedCategoryIds.filter(x => x !== id && x !== GENERAL_ID);
      setSelectedCategoryIds(next);
      const rmJobs = availableJobs.filter(j => j.category_id === id).map(j => j.job_id);
      setSelectedJobIds(selectedJobIds.filter(x => !rmJobs.includes(x)));
      const rmSkills = availableSkills.filter(s => rmJobs.includes(s.job_id)).map(s => s.skill_id);
      setSelectedSkillIds(selectedSkillIds.filter(x => !rmSkills.includes(x)));
    } else {
      const next = [...selectedCategoryIds, id];
      // If all 5 PESO categories end up selected, promote to General + auto-select all their roles
      if (pesoFive.every(c => next.includes(c))) {
        const cats = next.includes(OTHERS_ID) ? [...pesoFive, OTHERS_ID] : pesoFive;
        setSelectedCategoryIds(cats);
        setSelectedJobIds(Array.from(new Set([...selectedJobIds, ...jobIdsIn(pesoFive)])));
      } else {
        setSelectedCategoryIds(next);
      }
    }
  };
  const toggleJob = (id: number) => {
    if (selectedJobIds.includes(id)) {
      setSelectedJobIds(selectedJobIds.filter(x => x !== id));
      const rm = availableSkills.filter(s => s.job_id === id).map(s => s.skill_id);
      setSelectedSkillIds(selectedSkillIds.filter(x => !rm.includes(x)));
    } else setSelectedJobIds([...selectedJobIds, id]);
  };
  const toggleSkill    = (id: number) => setSelectedSkillIds(selectedSkillIds.includes(id) ? selectedSkillIds.filter(x => x !== id) : [...selectedSkillIds, id]);
  const toggleLanguage = (id: number) => setSelectedLanguageIds(selectedLanguageIds.includes(id) ? selectedLanguageIds.filter(x => x !== id) : [...selectedLanguageIds, id]);

  // Per-section completion + the next section to guide the helper to ("Start here").
  const sectionDone: Record<string, boolean> = {
    personal:     !!(firstName.trim() && lastName.trim() && contactNumber.trim() && birthDate),
    address:      !!(province && municipality && barangay),
    professional: !!(bio.trim() || educationLevel || parseInt(experienceYears || '0', 10) > 0),
    skills:       selectedCategoryIds.length > 0 && selectedLanguageIds.length > 0,
    preferences:  !!(expectedSalary && parseFloat(expectedSalary) >= 6000),
  };
  const nextSectionKey = SECTIONS.find(sec => !sectionDone[sec.key])?.key;

  // ── Submit profile (shared by section saves and photo auto-save) ───────────
  const submitProfile = async (successMessage: string, onSuccess?: () => void, photoOverride?: string) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('user_id',        userId || '');
      fd.append('requester_id',   userId || '');
      fd.append('first_name',     firstName);
      fd.append('middle_name',    middleName);
      fd.append('last_name',      lastName);
      fd.append('username',       username);
      fd.append('contact_number', contactNumber);
      fd.append('birth_date',     birthDate);
      fd.append('gender',         gender);
      fd.append('civil_status',   civilStatus);
      fd.append('religion',       religion);
      fd.append('province',       province);
      fd.append('municipality',   municipality);
      fd.append('barangay',       barangay);
      fd.append('address',        address);
      fd.append('landmark',       landmark);
      if (latitude  !== null) fd.append('latitude',  String(latitude));
      if (longitude !== null) fd.append('longitude', String(longitude));
      fd.append('bio',             bio);
      fd.append('education_level', educationLevel);
      fd.append('experience_years',experienceYears);
      fd.append('employment_type', employmentType);
      fd.append('work_schedule',   workSchedule);
      fd.append('expected_salary', expectedSalary);
      fd.append('salary_period',   salaryPeriod);
      fd.append('skill_ids',       JSON.stringify(selectedSkillIds));
      fd.append('language_ids',    JSON.stringify(selectedLanguageIds));
      fd.append('job_ids',         JSON.stringify(selectedJobIds));
      fd.append('custom_jobs',     JSON.stringify(customJobs));
      fd.append('custom_skills',   JSON.stringify(customSkills));

      const photoToSend = photoOverride ?? (imageChanged ? profileImage : null);
      if (photoToSend && !photoToSend.startsWith('http')) {
        const fn = photoToSend.split('/').pop() || 'photo.jpg';
        if (Platform.OS === 'web') {
          try {
            const blob = await (await fetch(photoToSend)).blob();
            fd.append('profile_image', blob, fn);
          } catch { (fd as any).append('profile_image', { uri: photoToSend, name: fn, type: 'image/jpeg' }); }
        } else {
          (fd as any).append('profile_image', { uri: photoToSend, name: fn, type: 'image/jpeg' });
        }
      }
      const res  = await fetch(`${API_URL}/helper/update_profile.php`, { method: 'POST', body: fd });
      let data: any;
      try { data = JSON.parse(await res.text()); } catch { throw new Error('Invalid server response'); }
      if (data.success) {
        showNotif(successMessage, 'success');
        const newPhoto = data.data?.profile_image ?? null;
        if (newPhoto) {
          setProfileImage(newPhoto);
          setImageChanged(false);
          // Keep AsyncStorage in sync so the dashboard shows the new photo immediately
          try {
            const raw = await AsyncStorage.getItem('user_data');
            if (raw) {
              const parsed = JSON.parse(raw);
              await AsyncStorage.setItem('user_data', JSON.stringify({ ...parsed, profile_image: newPhoto }));
            }
          } catch { /* best-effort */ }
          onProfileUpdated?.();
        }
        onSuccess?.();
      } else throw new Error(data.message || 'Save failed');
    } catch (e: any) {
      showNotif(e.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  // ── Image picker ────────────────────────────────────────────────────────────
  // The photo lives on the chooser screen, which has no Save button - so a new
  // photo is uploaded immediately instead of waiting for a section save.
  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') return showNotif('Photo library permission required', 'error');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.7 });
    if (result.canceled) return;
    const uri = result.assets[0].uri;
    setProfileImage(uri);
    setImageChanged(true);
    await submitProfile('Profile photo updated!', undefined, uri);
  };

  // ── Validation per section ──────────────────────────────────────────────────
  const validateSection = (key: SectionKey): string | null => {
    switch (key) {
      case 'personal':
        if (!firstName.trim()) return 'First name is required';
        if (!lastName.trim())  return 'Last name is required';
        if (!contactNumber.trim()) return 'Contact number is required';
        if (!birthDate) return 'Birth date is required';
        return null;
      case 'address':
        if (!province || !municipality || !barangay) return 'Province, municipality and barangay are required';
        return null;
      case 'professional':
        // Bio is optional — only validate length if the helper actually typed one.
        if (bio.trim() && bio.trim().length < 15) return 'If you add a bio, please make it at least 15 characters';
        return null;
      case 'skills':
        if (!selectedCategoryIds.length) return 'Select at least one job category';
        if (!selectedLanguageIds.length) return 'Select at least one language';
        return null;
      case 'preferences':
        if (!expectedSalary || parseFloat(expectedSalary) < 6000) return 'Minimum salary is ₱6,000';
        return null;
    }
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = async (section: SectionKey) => {
    Keyboard.dismiss();
    const err = validateSection(section);
    if (err) return showNotif(err, 'error');
    await submitProfile('Changes saved!', () => {
      setTimeout(() => { setView({ type: 'chooser' }); onSaveSuccess?.(); }, 1200);
    });
  };

  // ── Navigation ──────────────────────────────────────────────────────────────
  const openSection = (key: SectionKey) => setView({ type: 'section', key, step: 1 });
  const goToStep    = (key: SectionKey, step: number) => setView({ type: 'section', key, step });
  const goBack      = () => {
    if (view.type === 'section') {
      if (view.step > 1) setView({ ...view, step: view.step - 1 });
      else setView({ type: 'chooser' });
    } else onClose();
  };

  // ── Step content renderers ──────────────────────────────────────────────────

  const renderPersonalStep = (step: number) => {
    if (step === 1) return (
      <>
        <Label>First name <Req /></Label>
        <StyledInput value={firstName} onChangeText={setFirstName} placeholder="Juan" />
        <Label>Last name <Req /></Label>
        <StyledInput value={lastName} onChangeText={setLastName} placeholder="Dela Cruz" />
        <Label>Middle name <OptTag /></Label>
        <StyledInput value={middleName} onChangeText={setMiddleName} placeholder="Optional" />
      </>
    );
    if (step === 2) return (
      <>
        <Label>Birth Date <Req /></Label>
        {Platform.OS === 'web' ? (
          React.createElement('input', {
            type: 'date', value: birthDate || '', min: '1940-01-01', max: toYmd(new Date()),
            onChange: (e: any) => setBirthDate(e.target.value || ''),
            style: { padding: 12, border: '1px solid #E5E5EA', borderRadius: 12, fontSize: 15, width: '100%', fontFamily: 'inherit', backgroundColor: '#FDF5E8', color: DARK, boxSizing: 'border-box', marginBottom: 16 } as any,
          })
        ) : (
          <>
            <TouchableOpacity style={s.dateBtn} onPress={() => setShowBirthPicker(true)} activeOpacity={0.85}>
              <Ionicons name="calendar-outline" size={18} color={ORANGE} />
              <Text style={[s.dateBtnText, !birthDate && { color: '#B8956A' }]}>
                {birthDate ? new Date(birthDate + 'T00:00:00').toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'Select birth date'}
              </Text>
              <Ionicons name="chevron-down" size={16} color={MUTED} />
            </TouchableOpacity>
            {showBirthPicker && (
              <DateTimePicker value={parseBirthYmd(birthDate)} mode="date" display="default"
                maximumDate={new Date()} minimumDate={new Date(1940, 0, 1)}
                onChange={(_, d) => { setShowBirthPicker(false); if (d) setBirthDate(toYmd(d)); }}
              />
            )}
          </>
        )}
        <Label>Gender <Req /></Label>
        <ToggleRow options={['Male', 'Female']} value={gender} onChange={v => setGender(v as any)} />
        <Label>Civil Status <Req /></Label>
        <ToggleRow options={['Single', 'Married', 'Widowed', 'Separated']} value={civilStatus} onChange={setCivilStatus} />
        <Label>Religion <OptTag /></Label>
        <DropdownField value={religion} onChange={setReligion} options={RELIGION_OPTIONS} placeholder="Select religion" />
      </>
    );
    if (step === 3) return (
      <>
        <Label>Contact Number <Req /></Label>
        <StyledInput value={contactNumber} onChangeText={setContactNumber} placeholder="09XX XXX XXXX" keyboardType="phone-pad" />
        <Label>Email Address</Label>
        <StyledInput value={email} onChangeText={setEmail} placeholder="email@example.com" editable={false} style={{ opacity: 0.6 }} />
      </>
    );
    return null;
  };

  const renderAddressStep = () => (
    <AddressSection
      isWeb={Platform.OS === 'web'}
      province={province} setProvince={setProvince}
      municipality={municipality} setMunicipality={setMunicipality}
      barangay={barangay} setBarangay={setBarangay}
      landmark={landmark} setLandmark={setLandmark}
      setLatitude={setLatitude} setLongitude={setLongitude}
    />
  );

  const renderProfessionalStep = (step: number) => {
    if (step === 1) return (
      <>
        <Label>Tell employers about yourself <Req /></Label>
        <TextInput
          style={[s.input, s.textArea]}
          multiline numberOfLines={4}
          value={bio} onChangeText={setBio}
          placeholder="I am experienced in household chores, cooking and childcare..."
          placeholderTextColor="#B8956A"
        />
        <Text style={s.inputHint}>Minimum 15 characters</Text>
        <Label>Educational Attainment <Req /></Label>
        <ToggleRow
          options={['Elementary', 'High School Grad', 'College Undergrad', 'College Grad']}
          value={educationLevel} onChange={setEducationLevel}
        />
        <Label>Years of Experience <Req /></Label>
        <ToggleRow
          options={['0', '1', '2', '3', '4', '5+']}
          value={experienceYears} onChange={setExperienceYears}
        />
      </>
    );
    if (step === 2) return (
      <>
        <View style={s.infoBox}>
          <Ionicons name="information-circle-outline" size={18} color="#7C3AED" />
          <Text style={s.infoBoxText}>
            Work experience and references are managed through your profile documents. For now, ensure your bio and years of experience accurately reflect your background.
          </Text>
        </View>
        <Label>Years of Experience (confirm)</Label>
        <ToggleRow
          options={['0', '1', '2', '3', '4', '5+']}
          value={experienceYears} onChange={setExperienceYears}
        />
      </>
    );
    return null;
  };

  const renderSkillsStep = (step: number) => {
    // ── Step 1: Category icon cards (2-column grid) ───────────────────────────
    if (step === 1) return (
      <>
        <Text style={s.stepDesc}>Select nature of work. You can select more than one.</Text>
        <View style={s.catGrid}>
          {availableCategories.map(c => {
            const sel = selectedCategoryIds.includes(c.category_id);
            const { icon, color, bg } = getCategoryIcon(c.category_name);
            return (
              <TouchableOpacity
                key={c.category_id}
                style={[s.catCard, sel && s.catCardActive]}
                onPress={() => toggleCategory(c.category_id)}
                activeOpacity={0.82}
              >
                {/* Icon circle */}
                <View style={[s.catIconWrap, { backgroundColor: sel ? 'rgba(255,255,255,0.22)' : bg }]}>
                  <Ionicons name={icon} size={20} color={sel ? '#fff' : color} />
                </View>
                {/* Name */}
                <Text style={[s.catName, sel && s.catNameActive]} numberOfLines={2}>
                  {c.category_name}
                </Text>
                {/* Selected checkmark badge */}
                {sel && (
                  <View style={s.catCheck}>
                    <Ionicons name="checkmark" size={10} color={ORANGE} />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </>
    );

    // ── Steps 2–4: Badge pills ─────────────────────────────────────────────────
    if (step === 2) return (
      <>
        <Text style={s.stepDesc}>Select specific job roles. Choose all that apply.</Text>
        {availableJobsForSelection.length === 0 ? (
          <View style={s.emptyHint}>
            <Ionicons name="alert-circle-outline" size={20} color={MUTED} />
            <Text style={s.emptyHintText}>Select a nature of work in the previous step first.</Text>
          </View>
        ) : (
          // Group roles under their category so it's clear which roles belong to
          // which nature of work (e.g. Yaya vs Cook) instead of one mixed list.
          selectedCategories.map((cat: any) => {
            const catJobs = availableJobsForSelection.filter(j => j.category_id === cat.category_id);
            if (catJobs.length === 0) return null;
            return (
              <View key={cat.category_id} style={s.jobGroup}>
                <View style={s.jobGroupHeaderRow}>
                  <View style={s.jobGroupDot} />
                  <Text style={s.jobGroupHeader}>{cat.category_name}</Text>
                </View>
                <BadgePillGrid
                  items={catJobs.map(j => ({ id: j.job_id, name: j.job_title }))}
                  selectedIds={selectedJobIds}
                  onToggle={toggleJob}
                />
              </View>
            );
          })
        )}
      </>
    );
    if (step === 3) return (
      <>
        <Text style={s.stepDesc}>Select your skills. Choose all that apply.</Text>
        {availableSkillsForSelection.length === 0 ? (
          <View style={s.emptyHint}>
            <Ionicons name="alert-circle-outline" size={20} color={MUTED} />
            <Text style={s.emptyHintText}>Select job roles in the previous step to see related skills.</Text>
          </View>
        ) : (
          <BadgePillGrid
            items={availableSkillsForSelection.map(sk => ({ id: sk.skill_id, name: sk.skill_name }))}
            selectedIds={selectedSkillIds}
            onToggle={toggleSkill}
          />
        )}
      </>
    );
    if (step === 4) return (
      <>
        <Text style={s.stepDesc}>Languages you can speak. Choose all that apply.</Text>
        <BadgePillGrid
          items={availableLanguages.map(l => ({ id: l.language_id, name: l.language_name }))}
          selectedIds={selectedLanguageIds}
          onToggle={toggleLanguage}
        />
      </>
    );
    return null;
  };

  const renderPreferencesStep = () => (
    <>
      <Label>Stay Arrangement</Label>
      <ToggleRow options={['Stay-in', 'Stay-out', 'Any']} value={employmentType} onChange={setEmploymentType} />
      <Label>Work Hours</Label>
      <ToggleRow
        options={['Full-time', 'Part-time', 'Any']}
        value={workSchedule}
        onChange={v => {
          if (employmentType === 'Stay-in' && (v === 'Part-time' || v === 'Any')) return;
          setWorkSchedule(v);
        }}
        disabledOptions={employmentType === 'Stay-in' ? ['Part-time', 'Any'] : []}
      />
      <Label>Expected Salary (₱) <Req /></Label>
      <StyledInput value={expectedSalary} onChangeText={setExpectedSalary} placeholder="6000" keyboardType="numeric" />
      <Text style={s.inputHint}>Recommended minimum: ₱6,000/month</Text>
    </>
  );

  // ── Render step content ─────────────────────────────────────────────────────
  const renderStepContent = () => {
    if (view.type !== 'section') return null;
    switch (view.key) {
      case 'personal':     return renderPersonalStep(view.step);
      case 'address':      return renderAddressStep();
      case 'professional': return renderProfessionalStep(view.step);
      case 'skills':       return renderSkillsStep(view.step);
      case 'preferences':  return renderPreferencesStep();
    }
  };

  const isLastStep = () => {
    if (view.type !== 'section') return false;
    return view.step === SECTIONS.find(s => s.key === view.key)?.totalSteps;
  };

  const getSaveLabel = () => {
    if (view.type !== 'section') return 'Save';
    switch (view.key) {
      case 'personal':     return 'Save Information';
      case 'address':      return 'Save Address';
      case 'professional': return 'Save & Continue';
      case 'skills':       return 'Save & Continue';
      case 'preferences':  return 'Save Preferences';
    }
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  const inner = (
    <View style={s.modal}>
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={ORANGE} />
          <Text style={s.loadingText}>Preparing your profile…</Text>
        </View>
      ) : view.type === 'chooser' ? (
        // ── CHOOSER ─────────────────────────────────────────────────────────
        <>
          {/* Header */}
          <View style={s.chooserHeader}>
            <TouchableOpacity style={s.headerClose} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
            <Text style={s.chooserTitle}>Edit Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={s.chooserScroll} showsVerticalScrollIndicator={false}>
            <Text style={s.chooserSub}>Let's keep your profile complete and up to date.</Text>

            {/* ── Profile photo ── */}
            <View style={s.photoRow}>
              <TouchableOpacity style={s.photoOuter} onPress={pickImage} activeOpacity={0.85} disabled={saving}>
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={s.photoImg} contentFit="cover" />
                ) : (
                  <View style={s.photoFallback}>
                    <Ionicons name="person" size={34} color="#B8956A" />
                  </View>
                )}
                {/* Camera badge */}
                <View style={s.cameraBadge}>
                  {saving ? <ActivityIndicator color="#fff" size="small" /> : <Ionicons name="camera" size={13} color="#fff" />}
                </View>
                {saving && (
                  <View style={s.photoUploadingOverlay}>
                    <ActivityIndicator color="#fff" size="small" />
                  </View>
                )}
              </TouchableOpacity>
              <View style={s.photoMeta}>
                <Text style={s.photoMetaTitle}>Profile Photo</Text>
                <Text style={s.photoMetaSub}>Tap your photo to change it.{'\n'}JPG or PNG, max 5MB.</Text>
              </View>
            </View>

            {/* Sections — guided: the next incomplete one shows a red "Start here" */}
            {SECTIONS.map(sec => {
              const done = sectionDone[sec.key];
              const isNext = sec.key === nextSectionKey;
              return (
                <TouchableOpacity
                  key={sec.key}
                  style={[s.sectionCard, isNext && s.sectionCardActive]}
                  onPress={() => openSection(sec.key)}
                  activeOpacity={0.82}
                >
                  <View style={[s.secIconWrap, { backgroundColor: sec.iconBg }]}>
                    <Ionicons name={sec.icon} size={20} color={sec.iconColor} />
                  </View>
                  <View style={s.secInfo}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <Text style={s.secTitle}>{sec.title}</Text>
                      {done && <Ionicons name="checkmark-circle" size={15} color="#1A7F4B" />}
                    </View>
                    <Text style={[s.secSub, isNext && { color: '#C24E12', fontFamily: FontFamily.fredokaSemiBold }]}>
                      {isNext ? '👉 Start here — do this next' : sec.subtitle}
                    </Text>
                  </View>
                  {isNext ? (
                    <View style={s.secStartBtn}>
                      <Text style={s.secStartText}>Start here</Text>
                    </View>
                  ) : (
                    <View style={s.secEditBtn}>
                      <Text style={s.secEditText}>{done ? 'Edit' : 'Add'}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}

            {/* Tips card */}
            <View style={s.tipsCard}>
              <Ionicons name="bulb-outline" size={22} color={ORANGE} />
              <View style={{ flex: 1 }}>
                <Text style={s.tipsTitle}>Tips for a Strong Profile</Text>
                <Text style={s.tipsSub}>A complete profile gets more job matches and trusted opportunities.</Text>
              </View>
            </View>
          </ScrollView>
        </>
      ) : (
        // ── SECTION STEPS ───────────────────────────────────────────────────
        (() => {
          const sectionCfg = SECTIONS.find(s => s.key === view.key)!;
          return (
            <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={Platform.OS === 'ios' ? 80 : 0}>
              {/* Section header */}
              <View style={s.sectionHeader}>
                <TouchableOpacity style={s.headerClose} onPress={goBack} hitSlop={8}>
                  <Ionicons name="arrow-back" size={22} color={DARK} />
                </TouchableOpacity>
                <View style={s.sectionHeaderCenter}>
                  <Text style={s.sectionHeaderTitle}>{sectionCfg.title}</Text>
                  <Text style={s.sectionHeaderStep}>
                    Step {view.step} of {sectionCfg.totalSteps}
                  </Text>
                </View>
                <View style={{ width: 36 }} />
              </View>

              {/* Progress dots */}
              <View style={s.progressRow}>
                {Array.from({ length: sectionCfg.totalSteps }).map((_, i) => (
                  <View key={i} style={[s.progressDot, i < view.step && s.progressDotActive, i === view.step - 1 && s.progressDotCurrent]} />
                ))}
              </View>

              {/* Form content */}
              <ScrollView contentContainerStyle={s.sectionScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
                {renderStepContent()}
              </ScrollView>

              {/* Footer buttons */}
              <View style={s.footer}>
                {view.step > 1 ? (
                  <TouchableOpacity style={s.backBtn} onPress={goBack} activeOpacity={0.85}>
                    <Text style={s.backBtnText}>Back</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={s.cancelBtn} onPress={() => setView({ type: 'chooser' })} activeOpacity={0.85}>
                    <Text style={s.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                )}

                {isLastStep() ? (
                  <TouchableOpacity
                    style={[s.saveBtn, saving && { opacity: 0.6 }]}
                    onPress={() => handleSave(view.key)}
                    disabled={saving}
                    activeOpacity={0.88}
                  >
                    {saving
                      ? <ActivityIndicator color="#fff" size="small" />
                      : <Text style={s.saveBtnText}>{getSaveLabel()}</Text>
                    }
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={s.nextBtn}
                    onPress={() => goToStep(view.key, view.step + 1)}
                    activeOpacity={0.88}
                  >
                    <Text style={s.nextBtnText}>Next</Text>
                  </TouchableOpacity>
                )}
              </View>
            </KeyboardAvoidingView>
          );
        })()
      )}
    </View>
  );

  return (
    <>
      <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen" onRequestClose={goBack}>
        {Platform.OS === 'web' ? (
          <View style={s.webOverlay}>
            <View style={s.webCard}>{inner}</View>
          </View>
        ) : (
          <SafeAreaView style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.45)' }} edges={['bottom']}>
            <View style={{ flex: 1, justifyContent: 'flex-end' }}>
              <View style={s.bottomSheet}>{inner}</View>
            </View>
          </SafeAreaView>
        )}
      </Modal>

      {/* Selection modals */}
      <SelectionModal
        visible={jobModalVisible} onClose={() => setJobModalVisible(false)} title="Select Job Roles"
        subtitle={isGeneralHousehelpSelected
          ? 'All-around — roles across every category'
          : selectedCategories.length
            ? `Roles under: ${selectedCategories.map((c: any) => c.category_name).join(', ')}`
            : 'Pick a category first'}
        data={filteredJobs} selectedIds={selectedJobIds} onToggle={toggleJob}
        searchValue={jobSearch} onSearchChange={setJobSearch} idKey="job_id" nameKey="job_title" showSearch
        customData={customJobs} onAddCustom={(j: string) => setCustomJobs([...customJobs, j])}
        onRemoveCustom={(j: string) => setCustomJobs(customJobs.filter(x => x !== j))}
      />
      <SelectionModal
        visible={skillModalVisible} onClose={() => setSkillModalVisible(false)} title="Select Skills"
        data={filteredSkills} selectedIds={selectedSkillIds} onToggle={toggleSkill}
        searchValue={skillSearch} onSearchChange={setSkillSearch} idKey="skill_id" nameKey="skill_name" showSearch
        customData={customSkills} onAddCustom={(s: string) => setCustomSkills([...customSkills, s])}
        onRemoveCustom={(s: string) => setCustomSkills(customSkills.filter(x => x !== s))}
      />
      <SelectionModal
        visible={languageModalVisible} onClose={() => setLanguageModalVisible(false)} title="Languages"
        data={filteredLangs} selectedIds={selectedLanguageIds} onToggle={toggleLanguage}
        searchValue={langSearch} onSearchChange={setLangSearch} idKey="language_id" nameKey="language_name"
      />

      <NotificationModal visible={notifVisible} message={notifMessage} type={notifType} onClose={() => setNotifVisible(false)} />
    </>
  );
}

// ─── Small inline sub-components ─────────────────────────────────────────────

// ─── BadgePillGrid ────────────────────────────────────────────────────────────
// Used for steps 2, 3, 4 (jobs / skills / languages).
// Unselected = outlined pill | Selected = orange badge with X on right.

function BadgePillGrid({
  items, selectedIds, onToggle,
}: {
  items:       { id: number; name: string }[];
  selectedIds: number[];
  onToggle:    (id: number) => void;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const INITIAL_COUNT = 12;
  const visible = expanded ? items : items.slice(0, INITIAL_COUNT);
  const hasMore = items.length > INITIAL_COUNT;

  return (
    <>
      <View style={s.badgeGrid}>
        {visible.map(item => {
          const sel = selectedIds.includes(item.id);
          return (
            <TouchableOpacity
              key={item.id}
              style={[s.badgePill, sel && s.badgePillSelected]}
              onPress={() => onToggle(item.id)}
              activeOpacity={0.8}
            >
              <Text style={[s.badgePillText, sel && s.badgePillTextSelected]}>
                {item.name}
              </Text>
              {sel && (
                <View style={s.badgeDot}>
                  <Ionicons name="close" size={10} color="#fff" />
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
      {hasMore && (
        <TouchableOpacity style={s.showMoreBtn} onPress={() => setExpanded(v => !v)} activeOpacity={0.7}>
          <Text style={s.showMoreText}>
            {expanded ? 'Show fewer' : `View more roles (${items.length - INITIAL_COUNT})`}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={ORANGE} />
        </TouchableOpacity>
      )}
    </>
  );
}

const Req = () => <Text style={{ color: ORANGE }}>*</Text>;
const OptTag = () => <Text style={{ color: MUTED, fontFamily: FontFamily.fredokaRegular, fontSize: 12 }}> (optional)</Text>;

function Label({ children }: { children: React.ReactNode }) {
  return <Text style={s.label}>{children}</Text>;
}

function StyledInput({ style, ...props }: React.ComponentProps<typeof TextInput> & { style?: any }) {
  return (
    <TextInput
      style={[s.input, style]}
      placeholderTextColor="#B8956A"
      {...props}
    />
  );
}

function ToggleRow({ options, value, onChange, disabledOptions = [] }: {
  options:         string[];
  value:           string;
  onChange:        (v: string) => void;
  disabledOptions?: string[];
}) {
  return (
    <View style={s.toggleRow}>
      {options.map(opt => {
        const active   = value === opt;
        const disabled = disabledOptions.includes(opt);
        return (
          <TouchableOpacity
            key={opt}
            style={[s.toggleBtn, active && s.toggleBtnActive, disabled && s.toggleBtnDisabled]}
            onPress={() => !disabled && onChange(opt)}
            activeOpacity={disabled ? 1 : 0.8}
          >
            <Text style={[s.toggleText, active && s.toggleTextActive, disabled && { opacity: 0.4 }]}>
              {opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const RELIGION_OPTIONS = [
  'Roman Catholic', 'Christian', 'Iglesia ni Cristo', 'Islam',
  'Protestant', 'Seventh-day Adventist', 'Born Again', 'Buddhist',
  'Aglipayan', 'Other', 'Prefer not to say',
];

function DropdownField({ value, onChange, options, placeholder }: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <View>
      <TouchableOpacity style={[s.input, s.dropdownField]} onPress={() => setOpen(o => !o)} activeOpacity={0.8}>
        <Text style={[s.dropdownValue, !value && { color: '#B8956A' }]}>{value || placeholder || 'Select'}</Text>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={MUTED} />
      </TouchableOpacity>
      {open && (
        <View style={s.dropdownList}>
          {options.map(opt => (
            <TouchableOpacity key={opt} style={s.dropdownItem} onPress={() => { onChange(opt); setOpen(false); }} activeOpacity={0.7}>
              <Text style={[s.dropdownItemText, value === opt && { color: ORANGE, fontFamily: FontFamily.fredokaSemiBold }]}>{opt}</Text>
              {value === opt && <Ionicons name="checkmark" size={16} color={ORANGE} />}
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  dropdownField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  dropdownValue: { fontFamily: FontFamily.fredokaRegular, fontSize: 15, color: DARK },
  dropdownList: { marginTop: 6, borderWidth: 1, borderColor: '#EDE0D0', borderRadius: 12, overflow: 'hidden', backgroundColor: '#FFFBF5' },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 11, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EDE0D0' },
  dropdownItemText: { fontFamily: FontFamily.fredokaRegular, fontSize: 14.5, color: DARK },
  // Containers
  modal:      { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  bottomSheet:{ height: '93%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  webOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  webCard:    { width: '100%', maxWidth: 540, maxHeight: '92%', borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFFFFF',
    ...Platform.select({ default: { boxShadow: '0 20px 60px rgba(0,0,0,0.3)' } as any }),
  },
  loadingWrap:{ flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
  loadingText:{ fontFamily: FontFamily.fredokaRegular, fontSize: 15, color: MUTED },

  // Chooser
  chooserHeader:{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 12 },
  headerClose:  { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5E6CC', alignItems: 'center', justifyContent: 'center' },
  chooserTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  chooserScroll:{ paddingHorizontal: 16, paddingBottom: 32, gap: 10 },
  chooserSub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: MUTED, marginBottom: 4 },

  // Photo row in chooser
  photoRow:      { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#FFFBF5', borderRadius: 16, padding: 14, borderWidth: 1, borderColor: '#EDE0D0' },
  photoOuter:    { width: 72, height: 72, borderRadius: 36, overflow: 'visible', position: 'relative' },
  photoImg:      { width: 72, height: 72, borderRadius: 36 },
  photoFallback: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F5E6CC', alignItems: 'center', justifyContent: 'center' },
  cameraBadge:   { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
  photoUploadingOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, borderRadius: 36, backgroundColor: 'rgba(0,0,0,0.35)', alignItems: 'center', justifyContent: 'center' },
  photoMeta:     { flex: 1 },
  photoMetaTitle:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 3 },
  photoMetaSub:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, lineHeight: 17 },

  // Section cards (chooser)
  sectionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFBF5', borderRadius: 16, padding: 14, gap: 12, borderWidth: 1, borderColor: '#EDE0D0' },
  secIconWrap: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  secInfo:     { flex: 1 },
  secTitle:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  secSub:      { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED },
  secEditBtn:  { backgroundColor: '#FDF0D0', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7, borderWidth: 1, borderColor: '#D4B896' },
  secEditText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  sectionCardActive: { borderWidth: 2, borderColor: ORANGE, backgroundColor: '#FFF8F1' },
  secStartBtn:  { backgroundColor: '#E11D48', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 7 },
  secStartText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#fff' },

  // Tips card
  tipsCard: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: '#FEF6EE', borderRadius: 14, padding: 14, marginTop: 4 },
  tipsTitle:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginBottom: 2 },
  tipsSub:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED, lineHeight: 17 },

  // Section header
  sectionHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 8 },
  sectionHeaderCenter:{ alignItems: 'center' },
  sectionHeaderTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK },
  sectionHeaderStep:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED },

  // Progress dots
  progressRow:        { flexDirection: 'row', gap: 8, justifyContent: 'center', paddingVertical: 10 },
  progressDot:        { width: 8,  height: 8,  borderRadius: 4, backgroundColor: '#E5E7EB' },
  progressDotActive:  { backgroundColor: ORANGE, opacity: 0.5 },
  progressDotCurrent: { width: 22, backgroundColor: ORANGE, opacity: 1 },

  // Form scroll
  sectionScroll: { padding: 20, paddingBottom: 16, gap: 0 },

  // Form elements
  label:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginBottom: 6, marginTop: 14 },
  input:     { backgroundColor: '#FDF5E8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 15, fontFamily: FontFamily.fredokaRegular, color: DARK, borderWidth: 1, borderColor: '#EDE0D0', marginBottom: 2 },
  textArea:  { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  inputHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginBottom: 4 },
  dateBtn:   { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#FDF5E8', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#EDE0D0', marginBottom: 2 },
  dateBtnText:{ flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 15, color: DARK },

  // Toggle buttons
  toggleRow:         { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  toggleBtn:         { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: '#D4B896', backgroundColor: '#FFFBF5' },
  toggleBtnActive:   { backgroundColor: ORANGE, borderColor: ORANGE },
  toggleBtnDisabled: { opacity: 0.4 },
  toggleText:        { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  toggleTextActive:  { color: '#FFFFFF' },

  // Pill grid (skills/languages)
  stepDesc:      { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, marginBottom: 14, lineHeight: 18 },
  pillGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill:          { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: '#D4B896', backgroundColor: '#FFFBF5' },
  pillActive:    { backgroundColor: ORANGE, borderColor: ORANGE },
  pillText:      { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK },
  pillTextActive:{ color: '#FFFFFF' },

  // Info box
  infoBox:     { flexDirection: 'row', gap: 10, alignItems: 'flex-start', backgroundColor: '#F5F0FF', borderRadius: 12, padding: 14, marginBottom: 16 },
  infoBoxText: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#5B21B6', lineHeight: 18 },

  // Empty hint
  emptyHint:    { flexDirection: 'row', gap: 8, alignItems: 'center', backgroundColor: '#FEF3C7', borderRadius: 12, padding: 14 },
  emptyHintText:{ flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#D97706', lineHeight: 18 },

  // ── Step 1: Category icon cards ────────────────────────────────────────────
  catGrid:      { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  catCard: {
    width: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#FFFBF5',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#EDE0D0',
    position: 'relative',
  },
  catCardActive:  { backgroundColor: '#FEE2D5', borderColor: ORANGE },
  catIconWrap:    { width: 40, height: 40, borderRadius: 11, alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  catName:        { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, lineHeight: 18 },
  catNameActive:  { color: DARK },
  // Small checkmark badge — top-right corner of card
  catCheck: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: ORANGE,
  },

  // ── Steps 2–4: Badge pills ─────────────────────────────────────────────────
  jobGroup: { marginBottom: 16 },
  jobGroupHeaderRow: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 9 },
  jobGroupDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: ORANGE },
  jobGroupHeader: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13.5, color: DARK, letterSpacing: 0.2 },
  badgeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#D4B896',
    backgroundColor: '#FFFBF5',
  },
  badgePillSelected: { borderColor: ORANGE, backgroundColor: '#FEF0E5' },
  badgePillText:     { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK },
  badgePillTextSelected: { fontFamily: FontFamily.fredokaSemiBold, color: DARK },
  badgeDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  showMoreBtn:  { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'center', marginTop: 8, paddingVertical: 6, paddingHorizontal: 12 },
  showMoreText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE },

  // Footer buttons
  footer:    { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EDE0D0', backgroundColor: '#FFFFFF' },
  backBtn:   { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#D4B896', alignItems: 'center' },
  backBtnText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#D4B896', alignItems: 'center' },
  cancelBtnText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  nextBtn:   { flex: 1.5, paddingVertical: 14, borderRadius: 14, backgroundColor: DARK, alignItems: 'center' },
  nextBtnText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#FFFFFF' },
  saveBtn:   { flex: 1.5, paddingVertical: 14, borderRadius: 14, backgroundColor: ORANGE, alignItems: 'center' },
  saveBtnText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#FFFFFF' },
});
