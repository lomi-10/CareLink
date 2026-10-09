// app/(helper)/profile/skills.tsx
// Skills & Specialties + Languages + Experience detail screen.
// PHP: helper/get_profile.php (via useHelperProfile)

import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import React, { useState, useEffect, useMemo } from 'react';
import {
  ActivityIndicator, ScrollView,
  Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useHelperProfile } from '@/hooks/helper';
import { useJobReferences } from '@/hooks/shared/useJobReferences';
import { HelperTabBar } from '@/components/helper/home';
import EditHelperProfileModal from '@/components/helper/profile/profileEditModal/EditHelperProfileModal';
import { useProfileTheme } from './profile.theme';
import { createStyles } from './skills.styles';
import { useT } from '@/contexts/LocaleContext';

/** Roles shown before the list collapses behind a "Show all" toggle. */
const ROLES_PREVIEW = 8;

// ─── Component ────────────────────────────────────────────────────────────────

export default function SkillsScreen() {
  const router = useRouter();
  const { t: tr } = useT();
  const t = useProfileTheme();
  const { DARK, MUTED, ORANGE, GREEN } = t;
  const s = useMemo(() => createStyles(t), [t]);
  const { profileData, loading, refresh } = useHelperProfile();
  const refs = useJobReferences();
  const [editOpen, setEditOpen] = useState(false);
  const [showAllRoles, setShowAllRoles] = useState(false);
  // Guided onboarding deep-links here with ?edit=1 to open the editor directly.
  const { edit } = useLocalSearchParams<{ edit?: string }>();
  useEffect(() => { if (edit === '1') setEditOpen(true); }, [edit]);

  // Categories aren't stored on the helper — the backend derives them from the
  // selected job roles (helper_jobs → ref_jobs.category_id), and they carry the
  // biggest matching weight. Derive them the same way here so the helper can
  // actually see what employers match them on, instead of only a wall of roles.
  // Must stay above the loading early-return: hooks can't be called conditionally.
  const categories = useMemo(() => {
    const selectedJobIds = profileData?.specialtyIds?.jobs ?? [];
    if (!selectedJobIds.length || !refs.jobs.length) return [];
    const catIds = new Set(
      refs.jobs
        .filter((j) => selectedJobIds.includes(Number(j.job_id)))
        .map((j) => String(j.category_id)),
    );
    return refs.categories.filter((c) => catIds.has(String(c.category_id))).map((c) => c.name);
  }, [profileData?.specialtyIds?.jobs, refs.jobs, refs.categories]);

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#FBF5EC', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={ORANGE} />
      </View>
    );
  }

  const jobs      = profileData?.mappedSpecialties?.jobs?.filter(Boolean)      ?? [];
  const skills    = profileData?.mappedSpecialties?.skills?.filter(Boolean)    ?? [];
  const languages = profileData?.mappedSpecialties?.languages?.filter(Boolean) ?? [];
  const exp       = profileData?.profile?.years_experience;

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>{tr('helper.setup.skillsTitle')}</Text>
          <TouchableOpacity style={s.editBtn} onPress={() => setEditOpen(true)}>
            <Text style={s.editText}>{tr('helper.setup.edit')}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Banner */}
          <View style={[s.banner, { backgroundColor: '#F5F0FF' }]}>
            <View style={[s.bannerIcon, { backgroundColor: '#EDE9FE' }]}>
              <Ionicons name="sparkles" size={24} color="#7C3AED" />
            </View>
            <View style={s.bannerText}>
              <Text style={s.bannerTitle}>{tr('helper.setup.showcase')}</Text>
              <Text style={s.bannerSub}>{tr('helper.setup.showcaseHint')}</Text>
            </View>
            {/* ============================================================
                🖼️  DECORATIVE ILLUSTRATION — clipboard + checklist
                ============================================================
            <Image
              source={require("../../../assets/profile/clipboard-decor.png")}
              style={s.bannerIllust}
              contentFit="contain"
              pointerEvents="none"
            />
            */}
          </View>

          {/* Categories first — this is what employers actually match on. */}
          <PillSection
            title={tr('helper.setup.workCategories')}
            count={categories.length}
            items={categories}
            checkmark
            accentColor="#7C3AED"
            footnote={tr('helper.setup.categoriesHint')}
          />
          <PillSection
            title={tr('helper.setup.jobRoles')}
            count={jobs.length}
            items={showAllRoles ? jobs : jobs.slice(0, ROLES_PREVIEW)}
            highlightFirst
            accentColor={ORANGE}
            onToggleMore={jobs.length > ROLES_PREVIEW ? () => setShowAllRoles((v) => !v) : undefined}
            expanded={showAllRoles}
          />
          <PillSection title={tr('helper.setup.skills')} count={skills.length} items={skills} checkmark accentColor={GREEN} />
          <PillSection title={tr('helper.setup.languages')} count={languages.length} items={languages} checkmark accentColor="#0891B2" />

          {/* Experience */}
          <Text style={s.groupLabel}>{tr('helper.setup.experience')}</Text>
          <View style={s.expCard}>
            <View style={[s.expIcon, { backgroundColor: '#FEE2D5' }]}>
              <Ionicons name="time" size={22} color={ORANGE} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.expValue}>{exp ? tr('helper.setup.years', { count: exp }) : tr('helper.setup.entryLevel')}</Text>
              <Text style={s.expLabel}>{tr('helper.setup.totalExperience')}</Text>
            </View>
            <TouchableOpacity onPress={() => setEditOpen(true)}>
              <Text style={s.expEdit}>{tr('helper.setup.update')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <HelperTabBar />
      </SafeAreaView>

      <EditHelperProfileModal
        visible={editOpen}
        initialSection="skills"
        onClose={() => setEditOpen(false)}
        onSaveSuccess={() => { setEditOpen(false); refresh(); }}
      />
    </View>
  );
}

// ─── PillSection ──────────────────────────────────────────────────────────────

function PillSection({
  title, count, items, highlightFirst = false, checkmark = false, accentColor,
  footnote, onToggleMore, expanded = false,
}: {
  title:           string;
  count:           number;
  items:           string[];
  highlightFirst?: boolean;
  checkmark?:      boolean;
  accentColor?:    string;
  /** Small explainer under the heading. */
  footnote?:       string;
  /** Omit to make the section non-collapsible. */
  onToggleMore?:   () => void;
  expanded?:       boolean;
}) {
  const theme = useProfileTheme();
  const { t: tr } = useT();
  const s = useMemo(() => createStyles(theme), [theme]);
  const accent = accentColor ?? theme.ORANGE;
  return (
    <View style={s.pillWrap}>
      <View style={s.pillHeader}>
        <Text style={s.pillTitle}>{title}</Text>
        <View style={s.pillBadge}>
          <Text style={s.pillBadgeText}>{count}</Text>
        </View>
      </View>
      {!!footnote && items.length > 0 && <Text style={s.pillNote}>{footnote}</Text>}
      {items.length === 0 ? (
        <Text style={s.pillEmpty}>{tr('helper.setup.notSpecified')}</Text>
      ) : (
        <View style={s.pillsRow}>
          {items.map((item, i) => {
            const highlighted = highlightFirst && i === 0;
            return (
              <View
                key={item + i}
                style={[
                  s.pill,
                  highlighted
                    ? { backgroundColor: accent, borderColor: accent }
                    : { backgroundColor: theme.CARD_BG, borderColor: theme.DIVIDER },
                ]}
              >
                <Text style={[s.pillText, { color: highlighted ? '#fff' : theme.DARK }]}>
                  {item}
                </Text>
                {checkmark && !highlighted && (
                  <Ionicons name="checkmark-circle" size={13} color={accent} />
                )}
                {highlighted && (
                  <Ionicons name="checkmark-circle" size={13} color="rgba(255,255,255,0.8)" />
                )}
              </View>
            );
          })}
        </View>
      )}

      {!!onToggleMore && (
        <TouchableOpacity style={s.pillMore} onPress={onToggleMore} activeOpacity={0.75}>
          <Text style={[s.pillMoreText, { color: accent }]}>
            {expanded ? tr('helper.setup.showFewer') : tr('helper.setup.showAll', { count })}
          </Text>
          <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={14} color={accent} />
        </TouchableOpacity>
      )}
    </View>
  );
}
