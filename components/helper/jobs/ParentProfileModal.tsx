// components/helper/jobs/ParentProfileModal.tsx
import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import API_URL from '@/constants/api';
import { theme } from '@/constants/theme';
import { formatParentHouseholdType } from '@/constants/parentHousehold';

interface ParentProfileModalProps {
  visible: boolean;
  onClose: () => void;
  parentData: any; // job object — used for parent_id
}

// ─── helpers ──────────────────────────────────────────────────────────────────
const initials = (name: string) => {
  if (!name) return 'E';
  const parts = name.trim().split(' ');
  return parts.length > 1
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0][0].toUpperCase();
};

const isTrue = (v: any) => v === 1 || v === '1' || v === true || v === 'true';

function Section({ icon, title, children }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; children: React.ReactNode }) {
  return (
    <View style={s.section}>
      <View style={s.sectionHeader}>
        <View style={s.sectionIconWrap}>
          <Ionicons name={icon} size={14} color={theme.color.parent} />
        </View>
        <Text style={s.sectionTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string | number | null | undefined; icon?: React.ComponentProps<typeof Ionicons>['name'] }) {
  if (!value && value !== 0) return null;
  return (
    <View style={s.infoRow}>
      {icon && <Ionicons name={icon} size={14} color={theme.color.parent} style={{ marginRight: 6 }} />}
      <Text style={s.infoLabel}>{label}</Text>
      <Text style={s.infoValue}>{String(value)}</Text>
    </View>
  );
}

function Tag({ label, color = theme.color.parent, bg = theme.color.parentSoft }: { label: string; color?: string; bg?: string }) {
  return (
    <View style={[s.tag, { backgroundColor: bg, borderColor: color + '33' }]}>
      <Text style={[s.tagText, { color }]}>{label}</Text>
    </View>
  );
}

function StarRating({ rating }: { rating: number }) {
  return (
    <View style={s.starRow}>
      {[1, 2, 3, 4, 5].map(i => (
        <Ionicons
          key={i}
          name={rating >= i ? 'star' : rating >= i - 0.5 ? 'star-half' : 'star-outline'}
          size={16}
          color={rating >= i - 0.4 ? theme.color.warning : theme.color.subtle}
        />
      ))}
    </View>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ParentProfileModal({ visible, onClose, parentData }: ParentProfileModalProps) {
  const [data,       setData]       = useState<any>(null);
  const [loading,    setLoading]    = useState(false);
  const [docViewing, setDocViewing] = useState<{ title: string; url: string } | null>(null);

  const parentId = parentData?.parent_id;

  useEffect(() => {
    if (visible && parentId) {
      fetchProfile();
    } else if (!visible) {
      setData(null);
      setDocViewing(null);
    }
  }, [visible, parentId]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res  = await fetch(`${API_URL}/helper/get_parent_profile.php?parent_id=${parentId}`);
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch (e) {
      console.error('ParentProfileModal fetch:', e);
    } finally {
      setLoading(false);
    }
  };

  if (!parentData) return null;

  const profile    = data?.profile   ?? {};
  const user       = data?.user      ?? {};
  const household  = data?.household ?? null;
  const children   = data?.children  ?? [];
  const elderly    = data?.elderly   ?? [];
  const documents  = data?.documents ?? [];
  const avgRating  = data?.avg_rating  ?? 0;
  const reviewCount= data?.review_count ?? 0;
  const activeJobs = data?.active_jobs  ?? 0;

  const name         = user.first_name ? `${user.first_name} ${user.last_name}` : (parentData.parent_name ?? 'Employer');
  const profileImage = profile.profile_image ?? null;
  const isVerified   = user.status === 'approved';

  const fullAddress = [profile.barangay, profile.municipality, profile.province]
    .filter(Boolean).join(', ') || 'Not specified';

  return (
    <>
      <Modal visible={visible} animationType="fade" transparent onRequestClose={onClose}>
        <View style={s.overlay}>
          <View style={s.card}>

            {/* ── Header bar ── */}
            <View style={s.headerBar}>
              <Text style={s.headerTitle}>Employer Profile</Text>
              <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={8}>
                <Ionicons name="close" size={22} color={theme.color.muted} />
              </TouchableOpacity>
            </View>

            {loading || !data ? (
              <View style={s.center}>
                <ActivityIndicator size="large" color={theme.color.parent} />
                <Text style={s.loadingText}>Loading profile…</Text>
              </View>
            ) : (
              <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

                {/* ── Hero ── */}
                <View style={s.hero}>
                  {profileImage ? (
                    <Image source={{ uri: profileImage }} style={s.avatar} />
                  ) : (
                    <View style={[s.avatar, s.avatarFallback]}>
                      <Text style={s.avatarInitials}>{initials(name)}</Text>
                    </View>
                  )}

                  <Text style={s.heroName}>{name}</Text>

                  {/* Verified badge */}
                  <View style={[s.badge, isVerified ? s.badgeVerified : s.badgeUnverified]}>
                    <Ionicons
                      name={isVerified ? 'shield-checkmark' : 'warning'}
                      size={13}
                      color={isVerified ? theme.color.success : theme.color.danger}
                    />
                    <Text style={[s.badgeText, { color: isVerified ? theme.color.success : theme.color.danger }]}>
                      {isVerified ? 'PESO Verified Employer' : 'Unverified Employer'}
                    </Text>
                  </View>

                  {/* Quick stats strip */}
                  <View style={s.heroStats}>
                    <View style={s.heroStat}>
                      <StarRating rating={avgRating} />
                      <Text style={s.heroStatLabel}>
                        {avgRating > 0 ? `${avgRating} (${reviewCount} review${reviewCount !== 1 ? 's' : ''})` : 'No reviews yet'}
                      </Text>
                    </View>
                    <View style={s.heroStatDivider} />
                    <View style={s.heroStat}>
                      <Ionicons name="briefcase" size={16} color={theme.color.parent} />
                      <Text style={s.heroStatLabel}>{activeJobs} Active Job{activeJobs !== 1 ? 's' : ''}</Text>
                    </View>
                    {household?.household_size && (
                      <>
                        <View style={s.heroStatDivider} />
                        <View style={s.heroStat}>
                          <Ionicons name="people" size={16} color={theme.color.parent} />
                          <Text style={s.heroStatLabel}>{household.household_size} Members</Text>
                        </View>
                      </>
                    )}
                  </View>
                </View>

                {/* ── Bio ── */}
                {profile.bio ? (
                  <Section icon="chatbubble-ellipses-outline" title="About the Employer">
                    <View style={s.bioBox}>
                      <Text style={s.bioText}>{profile.bio}</Text>
                    </View>
                  </Section>
                ) : null}

                {/* ── Contact ── */}
                <Section icon="call-outline" title="Contact Information">
                  <View style={s.infoCard}>
                    <InfoRow icon="mail-outline"   label="Email"   value={user.email} />
                    <InfoRow icon="call-outline"   label="Phone"   value={profile.contact_number} />
                  </View>
                </Section>

                {/* ── Location ── */}
                <Section icon="location-outline" title="Household Location">
                  <View style={s.infoCard}>
                    <InfoRow icon="map-outline"       label="Area"     value={fullAddress} />
                    <InfoRow icon="home-outline"      label="Address"  value={profile.address} />
                    <InfoRow icon="flag-outline"      label="Landmark" value={profile.landmark} />
                  </View>
                </Section>

                {/* ── Household Info ── */}
                {household && (
                  <Section icon="people-outline" title="Household Information">
                    <View style={s.infoCard}>
                      <InfoRow icon="home-outline"      label="Housing Type"      value={formatParentHouseholdType(household.household_type)} />
                      <InfoRow icon="people-outline"  label="Household Size"  value={household.household_size} />
                      <InfoRow icon="paw-outline"     label="Has Pets"        value={isTrue(household.has_pets) ? 'Yes' : 'No'} />
                      {isTrue(household.has_pets) && household.pet_details && (
                        <InfoRow icon="paw-outline"   label="Pet Details"     value={household.pet_details} />
                      )}
                    </View>

                    {/* Children */}
                    {children.length > 0 && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={s.subLabel}>
                          <Ionicons name="happy-outline" size={13} color={theme.color.parent} />
                          {'  '}Children ({children.length})
                        </Text>
                        {children.map((child: any, i: number) => (
                          <View key={child.child_id ?? i} style={s.memberCard}>
                            <View style={s.memberAvatar}>
                              <Ionicons name="happy-outline" size={16} color={theme.color.parent} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.memberPrimary}>
                                {child.gender ?? 'Unknown'} · {child.age != null ? `${child.age} yrs old` : 'Age N/A'}
                              </Text>
                              {child.special_needs ? (
                                <Text style={s.memberSub}>Special needs: {child.special_needs}</Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* Elderly */}
                    {elderly.length > 0 && (
                      <View style={{ marginTop: 10 }}>
                        <Text style={s.subLabel}>
                          <Ionicons name="heart-outline" size={13} color={theme.color.parent} />
                          {'  '}Elderly Members ({elderly.length})
                        </Text>
                        {elderly.map((el: any, i: number) => (
                          <View key={el.elderly_id ?? i} style={s.memberCard}>
                            <View style={[s.memberAvatar, { backgroundColor: theme.color.warningSoft }]}>
                              <Ionicons name="heart-outline" size={16} color={theme.color.warning} />
                            </View>
                            <View style={{ flex: 1 }}>
                              <Text style={s.memberPrimary}>
                                {el.gender ?? 'Unknown'} · {el.age != null ? `${el.age} yrs old` : 'Age N/A'}
                              </Text>
                              {el.condition ? (
                                <Text style={s.memberSub}>Condition: {el.condition}</Text>
                              ) : null}
                              {el.care_level ? (
                                <Text style={s.memberSub}>Care level: {el.care_level}</Text>
                              ) : null}
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </Section>
                )}

                {/* ── Work Preferences ── */}
                {(profile.preferred_employment_type || profile.religion || profile.languages) && (
                  <Section icon="options-outline" title="Work Preferences">
                    <View style={s.tagRow}>
                      {profile.preferred_employment_type && (
                        <Tag label={`Employment: ${profile.preferred_employment_type}`} />
                      )}
                      {profile.religion && (
                        <Tag label={`Religion: ${profile.religion}`} color={theme.color.info} bg={theme.color.infoSoft} />
                      )}
                    </View>
                  </Section>
                )}

                {/* ── Verified Documents ── */}
                {documents.length > 0 && (
                  <Section icon="document-text-outline" title="Verified Documents">
                    <View style={s.docsWrap}>
                      {documents.map((doc: any, i: number) => (
                        <TouchableOpacity
                          key={i}
                          style={s.docRow}
                          onPress={() => setDocViewing({ title: doc.document_type, url: doc.file_url })}
                          activeOpacity={0.8}
                        >
                          <View style={s.docIconWrap}>
                            <Ionicons name="document-text" size={18} color={theme.color.parent} />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={s.docName}>{doc.document_type}</Text>
                            <Text style={s.docStatus}>✓ Verified by PESO</Text>
                          </View>
                          <Ionicons name="eye-outline" size={18} color={theme.color.muted} />
                        </TouchableOpacity>
                      ))}
                    </View>
                  </Section>
                )}

                {/* ── Member since ── */}
                <View style={s.metaFooter}>
                  <Ionicons name="calendar-outline" size={13} color={theme.color.subtle} />
                  <Text style={s.metaText}>
                    Member since {user.created_at ? new Date(user.created_at).toLocaleDateString('en-PH', { dateStyle: 'medium' }) : 'N/A'}
                  </Text>
                </View>

                <View style={{ height: 24 }} />
              </ScrollView>
            )}

            {/* ── Footer ── */}
            {!loading && data && (
              <View style={s.footer}>
                <TouchableOpacity style={s.closeFullBtn} onPress={onClose}>
                  <Text style={s.closeFullBtnText}>Close Profile</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>

      {/* ── Document viewer ── */}
      {docViewing && (
        <Modal visible animationType="fade" transparent onRequestClose={() => setDocViewing(null)}>
          <SafeAreaView style={s.docViewerRoot}>
            <View style={s.docViewerHeader}>
              <Text style={s.docViewerTitle}>{docViewing.title}</Text>
              <TouchableOpacity onPress={() => setDocViewing(null)} style={s.docViewerClose}>
                <Ionicons name="close" size={26} color="#fff" />
              </TouchableOpacity>
            </View>
            <Image
              source={{ uri: docViewing.url }}
              style={s.docViewerImage}
              resizeMode="contain"
            />
          </SafeAreaView>
        </Modal>
      )}
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: theme.color.overlay, justifyContent: 'center', alignItems: 'center', padding: 16 },
  card:    { width: '100%', maxWidth: 600, maxHeight: '92%', backgroundColor: theme.color.surfaceElevated, borderRadius: 24, overflow: 'hidden', ...theme.shadow.card },

  headerBar:   { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 22, paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  headerTitle: { fontSize: 17, fontWeight: '800', color: theme.color.ink },
  closeBtn:    { padding: 6, backgroundColor: theme.color.surface, borderRadius: 14 },

  center:      { padding: 60, alignItems: 'center', gap: 12 },
  loadingText: { color: theme.color.muted, fontSize: 14 },

  scroll: { flex: 1 },

  // ── hero ──
  hero: { alignItems: 'center', paddingVertical: 28, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: theme.color.line, backgroundColor: 'transparent' },
  avatar:        { width: 100, height: 100, borderRadius: 50, borderWidth: 4, borderColor: theme.color.surfaceElevated, marginBottom: 14 },
  avatarFallback:{ backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center' },
  avatarInitials:{ fontSize: 34, fontWeight: '800', color: theme.color.parent },
  heroName:      { fontSize: 22, fontWeight: '800', color: theme.color.ink, marginBottom: 10, textAlign: 'center' },

  badge:         { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20, borderWidth: 1, marginBottom: 16 },
  badgeVerified: { backgroundColor: theme.color.successSoft, borderColor: theme.color.success + '44' },
  badgeUnverified:{ backgroundColor: theme.color.dangerSoft, borderColor: theme.color.danger + '44' },
  badgeText:     { fontSize: 13, fontWeight: '700' },

  heroStats:      { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.color.surfaceElevated, padding: 12, borderRadius: 14, borderWidth: 1, borderColor: theme.color.line },
  heroStat:       { flexDirection: 'row', alignItems: 'center', gap: 6 },
  heroStatLabel:  { fontSize: 12, color: theme.color.muted, fontWeight: '600' },
  heroStatDivider:{ width: 1, height: 18, backgroundColor: theme.color.line },
  starRow:        { flexDirection: 'row', gap: 2 },

  // ── sections ──
  section:      { paddingHorizontal: 22, paddingTop: 20, paddingBottom: 4 },
  sectionHeader:{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  sectionIconWrap:{ width: 26, height: 26, borderRadius: 7, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center' },
  sectionTitle: { fontSize: 13, fontWeight: '800', color: theme.color.ink, textTransform: 'uppercase', letterSpacing: 0.5 },

  infoCard: { backgroundColor: theme.color.surface, borderRadius: 14, borderWidth: 1, borderColor: theme.color.line, overflow: 'hidden' },
  infoRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.color.line },
  infoLabel:{ flex: 1, fontSize: 13, color: theme.color.muted, fontWeight: '500' },
  infoValue:{ flex: 2, fontSize: 13, fontWeight: '700', color: theme.color.ink, textAlign: 'right' },

  bioBox: { backgroundColor: theme.color.surface, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: theme.color.line },
  bioText:{ fontSize: 14, lineHeight: 22, color: theme.color.inkMuted },

  // ── household ──
  subLabel:    { fontSize: 12, fontWeight: '800', color: theme.color.inkMuted, textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 8, marginTop: 4 },
  memberCard:  { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: theme.color.surface, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: theme.color.line, marginBottom: 6 },
  memberAvatar:{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center' },
  memberPrimary:{ fontSize: 13, fontWeight: '700', color: theme.color.ink },
  memberSub:   { fontSize: 12, color: theme.color.muted, marginTop: 2 },

  // ── tags ──
  tagRow:  { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tag:     { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, borderWidth: 1 },
  tagText: { fontSize: 12, fontWeight: '700' },

  // ── documents ──
  docsWrap:   { gap: 8 },
  docRow:     { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: theme.color.surface, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.color.line },
  docIconWrap:{ width: 38, height: 38, borderRadius: 10, backgroundColor: theme.color.parentSoft, alignItems: 'center', justifyContent: 'center' },
  docName:    { fontSize: 14, fontWeight: '700', color: theme.color.ink },
  docStatus:  { fontSize: 12, color: theme.color.success, fontWeight: '600', marginTop: 2 },

  // ── meta footer ──
  metaFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 22, paddingTop: 8 },
  metaText:   { fontSize: 12, color: theme.color.subtle },

  // ── footer btn ──
  footer:         { padding: 18, borderTopWidth: 1, borderTopColor: theme.color.line },
  closeFullBtn:   { backgroundColor: theme.color.parent, paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  closeFullBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },

  // ── document viewer ──
  docViewerRoot:   { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)' },
  docViewerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 24, paddingBottom: 12 },
  docViewerTitle:  { color: '#fff', fontSize: 17, fontWeight: '700', flex: 1 },
  docViewerClose:  { padding: 8, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: 16 },
  docViewerImage:  { flex: 1, marginHorizontal: 16, marginBottom: 40 },
});
