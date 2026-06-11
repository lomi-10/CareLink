// components/parent/profile/EditParentProfileModal.tsx
// PHP: parent/get_profile.php (load), parent/update_profile.php (save)
//
// Flow: Modal opens → Section Chooser → tap section → paged steps → Save
// Mirrors EditHelperProfileModal's chooser/section-steps pattern.

import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator, Keyboard, KeyboardAvoidingView,
  Modal, Platform, ScrollView, StyleSheet,
  Switch, Text, TextInput, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FontFamily } from '@/constants/GlobalStyles';
import API_URL from '@/constants/api';
import { NotificationModal, LocationSearchInput, LocationResult } from '@/components/shared';
import { PARENT_HOUSEHOLD_TYPE_OPTIONS } from '@/constants/parentHousehold';
import {
  CARAMEL, BROWN, DARK, MUTED, DANGER,
} from '@/components/parent/home/parentWarmTheme';

// ─── Types ────────────────────────────────────────────────────────────────────

type Child = {
  child_id?: number;
  age: string;
  gender: string;
  special_needs: string;
};

type Elderly = {
  elderly_id?: number;
  age: string;
  gender: string;
  condition: string;
  care_level: string;
};

type SectionKey = 'personal' | 'address' | 'household';
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
  { key: 'personal',  title: 'Personal Information', subtitle: 'About your household and contact number', icon: 'person',   iconBg: '#FBE6CF', iconColor: '#DD8A3C', totalSteps: 1 },
  { key: 'address',   title: 'Address',              subtitle: 'Your home location and landmark',          icon: 'location', iconBg: '#FEE2D5', iconColor: '#C8623F', totalSteps: 1 },
  { key: 'household', title: 'Household Details',    subtitle: 'Housing type, family members and pets',    icon: 'home',     iconBg: '#F3E3CF', iconColor: BROWN,     totalSteps: 3 },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function EditParentProfileModal({ visible, onClose, onSaveSuccess, onProfileUpdated }: Props) {

  // ── Navigation state ────────────────────────────────────────────────────────
  const [view, setView] = useState<ModalView>({ type: 'chooser' });

  const [userId, setUserId] = useState<string | null>(null);

  // Personal / contact
  const [contactNumber, setContactNumber] = useState('');
  const [bio, setBio] = useState('');

  // Address
  const [province, setProvince] = useState('Leyte');
  const [municipality, setMunicipality] = useState('');
  const [barangay, setBarangay] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude,  setLatitude]  = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);

  // Photo
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [imageChanged, setImageChanged] = useState(false);

  // Household
  const [householdSize, setHouseholdSize] = useState('');
  const [householdType, setHouseholdType] = useState('');
  const [hasPets, setHasPets] = useState(false);
  const [petDetails, setPetDetails] = useState('');

  const [hasChildren, setHasChildren] = useState(false);
  const [children, setChildren] = useState<Child[]>([]);

  const [hasElderly, setHasElderly] = useState(false);
  const [elderly, setElderly] = useState<Elderly[]>([]);

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving,  setSaving]  = useState(false);
  const [notifVisible, setNotifVisible] = useState(false);
  const [notifMessage, setNotifMessage] = useState('');
  const [notifType,    setNotifType]    = useState<'success' | 'error'>('success');

  const [deleteModal, setDeleteModal] = useState<{ visible: boolean; type: 'child' | 'elderly' | null; index: number | null }>({
    visible: false, type: null, index: null,
  });

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
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('No user data found');

      const parsed = JSON.parse(userData);
      setUserId(parsed.user_id);

      const response = await fetch(`${API_URL}/parent/get_profile.php?user_id=${parsed.user_id}`);
      const data = await response.json();

      if (!data.success) throw new Error(data.message || 'Failed to load profile data');

      if (data.profile) {
        const p = data.profile;
        setContactNumber(p.contact_number || '');
        setProvince(p.province || 'Leyte');
        setMunicipality(p.municipality || '');
        setBarangay(p.barangay || '');
        setLatitude(p.latitude   ? parseFloat(p.latitude)  : null);
        setLongitude(p.longitude ? parseFloat(p.longitude) : null);
        setBio(p.bio || '');
        setLandmark(p.landmark || '');
        if (p.profile_image) setProfileImage(p.profile_image);
      }

      if (data.household) {
        const h = data.household;
        setHouseholdSize(h.household_size ? String(h.household_size) : '');
        setHouseholdType(typeof h.household_type === 'string' ? h.household_type : '');
        setHasChildren(h.has_children === true || h.has_children === 1);
        setHasElderly(h.has_elderly === true || h.has_elderly === 1);
        setHasPets(h.has_pets === true || h.has_pets === 1);
        setPetDetails(h.pet_details || '');
      }

      if (data.children && Array.isArray(data.children)) {
        setChildren(data.children.map((c: any) => ({
          child_id: c.child_id,
          age: String(c.age),
          gender: c.gender || 'Prefer not to say',
          special_needs: c.special_needs || '',
        })));
      }

      if (data.elderly && Array.isArray(data.elderly)) {
        setElderly(data.elderly.map((e: any) => ({
          elderly_id: e.elderly_id,
          age: String(e.age),
          gender: e.gender || 'Prefer not to say',
          condition: e.condition || '',
          care_level: e.care_level || 'Independent',
        })));
      }
    } catch (error: any) {
      showNotif(error.message || 'Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generatedAddress = (() => {
    const parts: string[] = [];
    if (barangay.trim()) parts.push(barangay.trim());
    if (municipality.trim()) parts.push(municipality.trim());
    if (province.trim()) parts.push(province.trim());
    return parts.length > 0 ? parts.join(', ') : '';
  })();

  // ── Dynamic list handlers ───────────────────────────────────────────────────
  const addChild   = () => setChildren([...children, { age: '', gender: 'Prefer not to say', special_needs: '' }]);
  const addElderly = () => setElderly([...elderly, { age: '', gender: 'Prefer not to say', condition: '', care_level: 'Independent' }]);

  const updateChild = (idx: number, field: keyof Child, val: string) => {
    const next = [...children];
    next[idx] = { ...next[idx], [field]: val };
    setChildren(next);
  };

  const updateElderly = (idx: number, field: keyof Elderly, val: string) => {
    const next = [...elderly];
    next[idx] = { ...next[idx], [field]: val };
    setElderly(next);
  };

  const confirmDelete = () => {
    if (deleteModal.index !== null) {
      if (deleteModal.type === 'child') {
        setChildren(children.filter((_, i) => i !== deleteModal.index));
      } else if (deleteModal.type === 'elderly') {
        setElderly(elderly.filter((_, i) => i !== deleteModal.index));
      }
    }
    setDeleteModal({ visible: false, type: null, index: null });
  };

  // ── Submit profile (shared by section saves and photo auto-save) ───────────
  const submitProfile = async (successMessage: string, onSuccess?: () => void, photoOverride?: string) => {
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append('user_id', userId || '');
      fd.append('contact_number', contactNumber.trim());
      fd.append('province', province.trim());
      fd.append('municipality', municipality.trim());
      fd.append('barangay', barangay.trim());
      fd.append('bio', bio.trim());
      fd.append('landmark', landmark.trim());
      if (latitude  !== null) fd.append('latitude',  String(latitude));
      if (longitude !== null) fd.append('longitude', String(longitude));
      fd.append('household_size', householdSize || '0');
      fd.append('household_type', householdType.trim());
      fd.append('has_children', hasChildren ? '1' : '0');
      fd.append('has_elderly', hasElderly ? '1' : '0');
      fd.append('has_pets', hasPets ? '1' : '0');
      fd.append('pet_details', hasPets ? petDetails.trim() : '');

      const safeChildren = children.map(c => ({
        age: parseInt(c.age) || 0, gender: c.gender, special_needs: c.special_needs.trim() || null,
      }));
      fd.append('children', JSON.stringify(safeChildren));

      const safeElderly = elderly.map(e => ({
        age: parseInt(e.age) || 0, gender: e.gender, condition: e.condition.trim() || null, care_level: e.care_level,
      }));
      fd.append('elderly', JSON.stringify(safeElderly));

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

      const res  = await fetch(`${API_URL}/parent/update_profile.php`, { method: 'POST', body: fd });
      let data: any;
      try { data = JSON.parse(await res.text()); } catch { throw new Error('Invalid server response'); }
      if (data.success) {
        showNotif(successMessage, 'success');
        const newPhoto = data.data?.profile_image ?? null;
        if (newPhoto) {
          setProfileImage(newPhoto);
          setImageChanged(false);
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
    if (status !== 'granted') return showNotif('Photo library permission is required', 'error');
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
        if (!contactNumber.trim()) return 'Contact number is required';
        if (bio.trim() && bio.trim().length < 15) return 'Bio must be at least 15 characters';
        return null;
      case 'address':
        if (!province.trim() || !municipality.trim() || !barangay.trim()) return 'Province, municipality and barangay are required';
        return null;
      case 'household':
        if (!householdType) return 'Please select a housing type';
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

  const renderPersonalStep = () => (
    <>
      <Label>About Your Household <OptTag /></Label>
      <TextInput
        style={[s.input, s.textArea]}
        multiline numberOfLines={4}
        value={bio} onChangeText={setBio}
        placeholder="Share a short intro about your family and the kind of help you're looking for..."
        placeholderTextColor="#B8956A"
      />
      <Text style={s.inputHint}>If provided, must be at least 15 characters</Text>

      <Label>Contact Number <Req /></Label>
      <StyledInput value={contactNumber} onChangeText={setContactNumber} placeholder="09XX XXX XXXX" keyboardType="phone-pad" />
    </>
  );

  const renderAddressStep = () => (
    <>
      <LocationSearchInput
        province={province}
        municipality={municipality}
        barangay={barangay}
        onSelect={(result: LocationResult) => {
          setProvince(result.province);
          setMunicipality(result.municipality);
          setBarangay(result.barangay);
          setLatitude(result.latitude);
          setLongitude(result.longitude);
        }}
        accentColor={CARAMEL}
        label="Search Location"
      />

      <Label>Province <Req /></Label>
      <StyledInput value={province} onChangeText={v => { setProvince(v); setLatitude(null); setLongitude(null); }} placeholder="Leyte" />

      <View style={s.rowGrid}>
        <View style={s.rowHalf}>
          <Label>Municipality <Req /></Label>
          <StyledInput value={municipality} onChangeText={v => { setMunicipality(v); setLatitude(null); setLongitude(null); }} placeholder="Isabel" />
        </View>
        <View style={s.rowHalf}>
          <Label>Barangay <Req /></Label>
          <StyledInput value={barangay} onChangeText={v => { setBarangay(v); setLatitude(null); setLongitude(null); }} placeholder="San Jose" />
        </View>
      </View>

      {generatedAddress ? (
        <View style={s.addressPreview}>
          <Ionicons name="location" size={16} color={CARAMEL} />
          <Text style={s.addressPreviewText}>{generatedAddress}</Text>
        </View>
      ) : null}

      <Label>Landmark <OptTag /></Label>
      <StyledInput value={landmark} onChangeText={setLandmark} placeholder="e.g., Near SM City" />
    </>
  );

  const renderHouseholdStep = (step: number) => {
    if (step === 1) return (
      <>
        <Label>Housing Type <Req /></Label>
        <Text style={s.inputHint}>Where you live helps helpers understand the work environment.</Text>
        <OptionChipRow options={PARENT_HOUSEHOLD_TYPE_OPTIONS} value={householdType} onChange={setHouseholdType} />

        <Label>Total Household Size <OptTag /></Label>
        <StyledInput value={householdSize} onChangeText={setHouseholdSize} keyboardType="numeric" placeholder="e.g., 4" />

        <View style={s.toggleCard}>
          <View style={s.toggleCardInfo}>
            <Text style={s.toggleCardTitle}>Do you have pets?</Text>
            <Text style={s.toggleCardSub}>Dogs, cats, or other animals</Text>
          </View>
          <Switch value={hasPets} onValueChange={setHasPets} trackColor={{ false: '#E5D9C8', true: CARAMEL }} thumbColor="#fff" />
        </View>
        {hasPets && (
          <>
            <Label>Pet Details <OptTag /></Label>
            <StyledInput value={petDetails} onChangeText={setPetDetails} placeholder="e.g., 1 friendly Golden Retriever" />
          </>
        )}
      </>
    );

    if (step === 2) return (
      <>
        <View style={s.toggleCard}>
          <View style={s.toggleCardInfo}>
            <Text style={s.toggleCardTitle}>Do you have children?</Text>
            <Text style={s.toggleCardSub}>Ages 0–18</Text>
          </View>
          <Switch
            value={hasChildren}
            onValueChange={(val) => { setHasChildren(val); if (val && children.length === 0) addChild(); }}
            trackColor={{ false: '#E5D9C8', true: CARAMEL }} thumbColor="#fff"
          />
        </View>
        {hasChildren && (
          <>
            {children.map((child, index) => (
              <View key={index} style={s.memberCard}>
                <View style={s.memberHeader}>
                  <Text style={s.memberTitle}>Child {index + 1}</Text>
                  <TouchableOpacity onPress={() => setDeleteModal({ visible: true, type: 'child', index })} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={DANGER} />
                  </TouchableOpacity>
                </View>
                <Label>Age <Req /></Label>
                <StyledInput value={child.age} onChangeText={v => updateChild(index, 'age', v)} keyboardType="numeric" placeholder="e.g., 5" />
                <Label>Gender <Req /></Label>
                <ToggleRow options={['Male', 'Female', 'Prefer not to say']} value={child.gender} onChange={v => updateChild(index, 'gender', v)} />
                <Label>Special Needs <OptTag /></Label>
                <StyledInput value={child.special_needs} onChangeText={v => updateChild(index, 'special_needs', v)} placeholder="e.g., Allergies, Autism" />
              </View>
            ))}
            <TouchableOpacity onPress={addChild} style={s.addMemberBtn} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color={CARAMEL} />
              <Text style={s.addMemberText}>Add Another Child</Text>
            </TouchableOpacity>
          </>
        )}
      </>
    );

    return (
      <>
        <View style={s.toggleCard}>
          <View style={s.toggleCardInfo}>
            <Text style={s.toggleCardTitle}>Elderly Members?</Text>
            <Text style={s.toggleCardSub}>Seniors requiring care or attention</Text>
          </View>
          <Switch
            value={hasElderly}
            onValueChange={(val) => { setHasElderly(val); if (val && elderly.length === 0) addElderly(); }}
            trackColor={{ false: '#E5D9C8', true: CARAMEL }} thumbColor="#fff"
          />
        </View>
        {hasElderly && (
          <>
            {elderly.map((senior, index) => (
              <View key={index} style={s.memberCard}>
                <View style={s.memberHeader}>
                  <Text style={s.memberTitle}>Elderly Member {index + 1}</Text>
                  <TouchableOpacity onPress={() => setDeleteModal({ visible: true, type: 'elderly', index })} hitSlop={8}>
                    <Ionicons name="trash-outline" size={18} color={DANGER} />
                  </TouchableOpacity>
                </View>
                <Label>Age <Req /></Label>
                <StyledInput value={senior.age} onChangeText={v => updateElderly(index, 'age', v)} keyboardType="numeric" placeholder="e.g., 70" />
                <Label>Gender <Req /></Label>
                <ToggleRow options={['Male', 'Female', 'Prefer not to say']} value={senior.gender} onChange={v => updateElderly(index, 'gender', v)} />
                <Label>Care Level <Req /></Label>
                <ToggleRow options={['Independent', 'Needs Assistance', 'Fully Dependent']} value={senior.care_level} onChange={v => updateElderly(index, 'care_level', v)} />
                <Label>Medical Conditions <OptTag /></Label>
                <StyledInput value={senior.condition} onChangeText={v => updateElderly(index, 'condition', v)} placeholder="e.g., Diabetic, Bedridden" />
              </View>
            ))}
            <TouchableOpacity onPress={addElderly} style={s.addMemberBtn} activeOpacity={0.85}>
              <Ionicons name="add" size={18} color={CARAMEL} />
              <Text style={s.addMemberText}>Add Another Senior</Text>
            </TouchableOpacity>
          </>
        )}
      </>
    );
  };

  // ── Render step content ─────────────────────────────────────────────────────
  const renderStepContent = () => {
    if (view.type !== 'section') return null;
    switch (view.key) {
      case 'personal':  return renderPersonalStep();
      case 'address':   return renderAddressStep();
      case 'household': return renderHouseholdStep(view.step);
    }
  };

  const isLastStep = () => {
    if (view.type !== 'section') return false;
    return view.step === SECTIONS.find(sec => sec.key === view.key)?.totalSteps;
  };

  const getSaveLabel = () => {
    if (view.type !== 'section') return 'Save';
    switch (view.key) {
      case 'personal':  return 'Save Information';
      case 'address':   return 'Save Address';
      case 'household': return 'Save Household';
    }
  };

  // ── RENDER ──────────────────────────────────────────────────────────────────
  const inner = (
    <View style={s.modal}>
      {loading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="large" color={CARAMEL} />
          <Text style={s.loadingText}>Preparing your profile…</Text>
        </View>
      ) : view.type === 'chooser' ? (
        // ── CHOOSER ─────────────────────────────────────────────────────────
        <>
          <View style={s.chooserHeader}>
            <TouchableOpacity style={s.headerClose} onPress={onClose} hitSlop={8}>
              <Ionicons name="close" size={22} color={DARK} />
            </TouchableOpacity>
            <Text style={s.chooserTitle}>Edit Profile</Text>
            <View style={{ width: 36 }} />
          </View>

          <ScrollView contentContainerStyle={s.chooserScroll} showsVerticalScrollIndicator={false}>
            <Text style={s.chooserSub}>Let families and helpers get to know your household.</Text>

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

            {/* Sections */}
            {SECTIONS.map(sec => (
              <TouchableOpacity key={sec.key} style={s.sectionCard} onPress={() => openSection(sec.key)} activeOpacity={0.82}>
                <View style={[s.secIconWrap, { backgroundColor: sec.iconBg }]}>
                  <Ionicons name={sec.icon} size={20} color={sec.iconColor} />
                </View>
                <View style={s.secInfo}>
                  <Text style={s.secTitle}>{sec.title}</Text>
                  <Text style={s.secSub}>{sec.subtitle}</Text>
                </View>
                <View style={s.secEditBtn}>
                  <Text style={s.secEditText}>Edit</Text>
                </View>
              </TouchableOpacity>
            ))}

            {/* Tips card */}
            <View style={s.tipsCard}>
              <Ionicons name="bulb-outline" size={22} color={CARAMEL} />
              <View style={{ flex: 1 }}>
                <Text style={s.tipsTitle}>Tips for a Strong Profile</Text>
                <Text style={s.tipsSub}>A complete profile helps helpers and PESO understand your household better.</Text>
              </View>
            </View>
          </ScrollView>
        </>
      ) : (
        // ── SECTION STEPS ───────────────────────────────────────────────────
        (() => {
          const sectionCfg = SECTIONS.find(sec => sec.key === view.key)!;
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

      {/* Delete confirmation modal */}
      <Modal visible={deleteModal.visible} transparent animationType="fade" onRequestClose={() => setDeleteModal({ visible: false, type: null, index: null })}>
        <View style={s.confirmOverlay}>
          <View style={s.confirmCard}>
            <View style={s.confirmIconWrap}>
              <Ionicons name="warning" size={28} color={DANGER} />
            </View>
            <Text style={s.confirmTitle}>Remove Member?</Text>
            <Text style={s.confirmMessage}>Are you sure you want to remove this family member? This cannot be undone.</Text>
            <View style={s.confirmBtnRow}>
              <TouchableOpacity style={s.confirmCancelBtn} onPress={() => setDeleteModal({ visible: false, type: null, index: null })} activeOpacity={0.85}>
                <Text style={s.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmDeleteBtn} onPress={confirmDelete} activeOpacity={0.85}>
                <Text style={s.confirmDeleteText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <NotificationModal visible={notifVisible} message={notifMessage} type={notifType} onClose={() => setNotifVisible(false)} />
    </>
  );
}

// ─── Small inline sub-components ─────────────────────────────────────────────

const Req = () => <Text style={{ color: CARAMEL }}>*</Text>;
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

function ToggleRow({ options, value, onChange }: {
  options:  string[];
  value:    string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={s.toggleRow}>
      {options.map(opt => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[s.toggleBtn, active && s.toggleBtnActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleText, active && s.toggleTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// Like ToggleRow, but for {value,label} pairs (e.g. PARENT_HOUSEHOLD_TYPE_OPTIONS)
// where the stored value and the displayed label differ.
function OptionChipRow({ options, value, onChange }: {
  options:  readonly { value: string; label: string }[];
  value:    string;
  onChange: (v: string) => void;
}) {
  return (
    <View style={[s.toggleRow, { marginBottom: 16 }]}>
      {options.map(opt => {
        const active = value === opt.value;
        return (
          <TouchableOpacity
            key={opt.value}
            style={[s.toggleBtn, active && s.toggleBtnActive]}
            onPress={() => onChange(opt.value)}
            activeOpacity={0.8}
          >
            <Text style={[s.toggleText, active && s.toggleTextActive]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Containers
  modal:      { flex: 1, backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden' },
  bottomSheet:{ height: '93%', borderTopLeftRadius: 24, borderTopRightRadius: 24, overflow: 'hidden', backgroundColor: '#FFFFFF' },
  webOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  webCard:    {
    width: '100%', maxWidth: 540, maxHeight: '92%', borderRadius: 24, overflow: 'hidden', backgroundColor: '#FFFFFF',
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
  cameraBadge:   { position: 'absolute', bottom: 0, right: 0, width: 24, height: 24, borderRadius: 12, backgroundColor: CARAMEL, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: '#fff' },
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
  progressDotActive:  { backgroundColor: CARAMEL, opacity: 0.5 },
  progressDotCurrent: { width: 22, backgroundColor: CARAMEL, opacity: 1 },

  // Form scroll
  sectionScroll: { padding: 20, paddingBottom: 16, gap: 0 },

  // Form elements
  label:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginBottom: 6, marginTop: 14 },
  input:     { backgroundColor: '#FDF5E8', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 11, fontSize: 15, fontFamily: FontFamily.fredokaRegular, color: DARK, borderWidth: 1, borderColor: '#EDE0D0', marginBottom: 2 },
  textArea:  { minHeight: 100, textAlignVertical: 'top', paddingTop: 12 },
  inputHint: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginBottom: 4 },

  // Toggle buttons
  toggleRow:        { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 2 },
  toggleBtn:        { paddingHorizontal: 16, paddingVertical: 9, borderRadius: 999, borderWidth: 1.5, borderColor: '#D4B896', backgroundColor: '#FFFBF5' },
  toggleBtnActive:  { backgroundColor: CARAMEL, borderColor: CARAMEL },
  toggleText:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK },
  toggleTextActive: { color: '#FFFFFF' },

  // Address (two-column row + preview)
  rowGrid: { flexDirection: 'row', gap: 12 },
  rowHalf: { flex: 1 },
  addressPreview:     { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FBE6CF', borderRadius: 12, padding: 12, marginTop: 4, marginBottom: 4 },
  addressPreviewText: { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: BROWN },

  // Toggle card (pets / children / elderly)
  toggleCard:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#FFFBF5', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDE0D0', marginTop: 14, marginBottom: 4 },
  toggleCardInfo: { flex: 1, paddingRight: 12 },
  toggleCardTitle:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK, marginBottom: 2 },
  toggleCardSub:  { fontFamily: FontFamily.fredokaRegular,  fontSize: 12, color: MUTED },

  // Member cards (children / elderly)
  memberCard:   { backgroundColor: '#FFFBF5', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#EDE0D0', marginTop: 14 },
  memberHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, marginBottom: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#EDE0D0' },
  memberTitle:  { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },

  addMemberBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FDF0D0', borderRadius: 12, paddingVertical: 12, marginTop: 12, borderWidth: 1, borderColor: '#D4B896' },
  addMemberText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: CARAMEL },

  // Footer buttons
  footer:    { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingVertical: 16, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#EDE0D0', backgroundColor: '#FFFFFF' },
  backBtn:   { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#D4B896', alignItems: 'center' },
  backBtnText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  cancelBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#D4B896', alignItems: 'center' },
  cancelBtnText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  nextBtn:   { flex: 1.5, paddingVertical: 14, borderRadius: 14, backgroundColor: DARK, alignItems: 'center' },
  nextBtnText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#FFFFFF' },
  saveBtn:   { flex: 1.5, paddingVertical: 14, borderRadius: 14, backgroundColor: CARAMEL, alignItems: 'center' },
  saveBtnText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#FFFFFF' },

  // Delete confirmation modal
  confirmOverlay:   { flex: 1, backgroundColor: 'rgba(59,42,24,0.45)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  confirmCard:      { width: '100%', maxWidth: 360, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 24, alignItems: 'center' },
  confirmIconWrap:  { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FEE2E2', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, marginBottom: 6 },
  confirmMessage:   { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', lineHeight: 19, marginBottom: 20 },
  confirmBtnRow:    { flexDirection: 'row', width: '100%', gap: 10 },
  confirmCancelBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, borderWidth: 1.5, borderColor: '#D4B896', alignItems: 'center' },
  confirmCancelText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  confirmDeleteBtn: { flex: 1, paddingVertical: 13, borderRadius: 12, backgroundColor: DANGER, alignItems: 'center' },
  confirmDeleteText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#FFFFFF' },
});
