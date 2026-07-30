// components/shared/GuideModal.tsx
// The "How CareLink works" guide. Two views:
//   • chapters — the list, when opened manually from the menu
//   • pages    — a paged walkthrough, when auto-shown at a milestone
// Plain language and big buttons: many users are not tech-savvy.

import React, { useMemo, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import {
  GUIDE_CHAPTERS,
  getChapter,
  unlockedStages,
  type GuideRole,
  type GuideStage,
} from '@/constants/guideContent';

/** Why a chapter isn't open yet — shown on the locked row. */
function lockReason(role: GuideRole, stage: GuideStage): string {
  if (stage === 'started') {
    return role === 'helper'
      ? 'Opens once PESO verifies you'
      : 'Opens once PESO verifies your household';
  }
  return role === 'helper'
    ? 'Opens after you apply to your first job'
    : 'Opens after you post your first job';
}

export default function GuideModal({
  visible,
  onClose,
  role,
  currentStage,
  startStage,
  accent,
}: {
  visible: boolean;
  onClose: () => void;
  role: GuideRole;
  /** How far the user has actually progressed — controls what's unlocked. */
  currentStage: GuideStage;
  /** Jump straight into this chapter; omit to show the chapter list. */
  startStage?: GuideStage;
  accent: string;
}) {
  const [openStage, setOpenStage] = useState<GuideStage | null>(startStage ?? null);
  const [page, setPage] = useState(0);

  // startStage changes between an auto-show and a manual open of the same
  // mounted modal, so follow it rather than only seeding initial state.
  const [seenStart, setSeenStart] = useState(startStage);
  if (seenStart !== startStage) {
    setSeenStart(startStage);
    setOpenStage(startStage ?? null);
    setPage(0);
  }

  const unlocked = useMemo(() => unlockedStages(currentStage), [currentStage]);
  const chapters = GUIDE_CHAPTERS[role];

  const close = () => {
    onClose();
    setOpenStage(startStage ?? null);
    setPage(0);
  };

  const openChapter = (stage: GuideStage) => {
    setOpenStage(stage);
    setPage(0);
  };

  const backToList = () => {
    setOpenStage(null);
    setPage(0);
  };

  // ── Chapter list ──
  if (!openStage) {
    return (
      <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
        <View style={s.overlay}>
          <View style={s.card}>
            <View style={s.listHead}>
              <View style={{ flex: 1 }}>
                <Text style={s.listTitle}>How CareLink works</Text>
                <Text style={s.listSub}>Pick what you need help with.</Text>
              </View>
              <TouchableOpacity onPress={close} hitSlop={10} accessibilityLabel="Close guide">
                <Ionicons name="close" size={24} color="#9A7B5A" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ alignSelf: 'stretch' }} showsVerticalScrollIndicator={false}>
              {chapters.map((ch) => {
                const isOpen = unlocked.includes(ch.stage);
                return (
                  <Pressable
                    key={ch.stage}
                    onPress={() => isOpen && openChapter(ch.stage)}
                    disabled={!isOpen}
                    style={({ hovered }: any) => [
                      s.chRow,
                      isOpen && hovered && { borderColor: accent },
                      !isOpen && s.chRowLocked,
                    ]}
                  >
                    <View style={[s.chIcon, { backgroundColor: isOpen ? accent + '18' : '#F1E7DA' }]}>
                      <Ionicons
                        name={isOpen ? ch.icon : 'lock-closed'}
                        size={20}
                        color={isOpen ? accent : '#B8A38C'}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.chLabel, !isOpen && { color: '#B8A38C' }]}>{ch.label}</Text>
                      <Text style={s.chBlurb}>
                        {isOpen ? ch.blurb : lockReason(role, ch.stage)}
                      </Text>
                    </View>
                    {isOpen && <Ionicons name="chevron-forward" size={18} color="#B8A38C" />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  // ── Paged chapter ──
  const chapter = getChapter(role, openStage);
  const pages = chapter.pages;
  const p = pages[Math.min(page, pages.length - 1)];
  const last = page === pages.length - 1;
  const manyPages = pages.length > 6;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <View style={s.overlay}>
        <View style={s.card}>
          <TouchableOpacity style={s.skip} onPress={close} hitSlop={10} accessibilityLabel="Close guide">
            <Text style={s.skipText}>{last ? 'Close' : 'Skip'}</Text>
          </TouchableOpacity>

          <View style={[s.iconWrap, { backgroundColor: accent + '18' }]}>
            <Ionicons name={p.icon} size={38} color={accent} />
          </View>
          <Text style={s.title}>{p.title}</Text>
          <Text style={s.body}>{p.body}</Text>

          {manyPages ? (
            <View style={s.progressWrap}>
              <View style={s.progressTrack}>
                <View
                  style={[
                    s.progressFill,
                    { backgroundColor: accent, width: `${((page + 1) / pages.length) * 100}%` },
                  ]}
                />
              </View>
              <Text style={s.progressText}>{page + 1} of {pages.length}</Text>
            </View>
          ) : (
            <View style={s.dots}>
              {pages.map((_, i) => (
                <View
                  key={i}
                  style={[
                    s.dot,
                    i === page ? { backgroundColor: accent, width: 20 } : { backgroundColor: '#E4D5C2' },
                  ]}
                />
              ))}
            </View>
          )}

          <View style={s.btnRow}>
            {page > 0 ? (
              <TouchableOpacity style={s.backBtn} onPress={() => setPage(page - 1)} activeOpacity={0.85}>
                <Text style={s.backText}>Back</Text>
              </TouchableOpacity>
            ) : (
              <View style={{ flex: 1 }} />
            )}
            <TouchableOpacity
              style={[s.nextBtn, { backgroundColor: accent }]}
              onPress={() => (last ? close() : setPage(page + 1))}
              activeOpacity={0.88}
            >
              <Text style={s.nextText}>{last ? 'Got it' : 'Next'}</Text>
              {!last && <Ionicons name="arrow-forward" size={17} color="#fff" />}
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={s.allRow} onPress={backToList} activeOpacity={0.7}>
            <Ionicons name="albums-outline" size={15} color="#9A7B5A" />
            <Text style={s.allText}>All guide chapters</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  card: { width: '100%', maxWidth: 400, maxHeight: '88%', backgroundColor: '#FFFDF9', borderRadius: 22, padding: 24, alignItems: 'center' },

  // Chapter list
  listHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, alignSelf: 'stretch', marginBottom: 18 },
  listTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: '#2A1608' },
  listSub: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#9A7B5A', marginTop: 3 },
  chRow: {
    flexDirection: 'row', alignItems: 'center', gap: 13,
    borderWidth: 1, borderColor: '#EDE0D0', borderRadius: 16,
    padding: 13, marginBottom: 10,
  },
  chRowLocked: { backgroundColor: '#FBF6EF' },
  chIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  chLabel: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#2A1608' },
  chBlurb: { fontFamily: FontFamily.fredokaRegular, fontSize: 12.5, color: '#9A7B5A', marginTop: 3, lineHeight: 17 },

  // Paged chapter
  skip: { position: 'absolute', top: 16, right: 18, height: 20, zIndex: 2 },
  skipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: '#9A7B5A' },
  iconWrap: { width: 78, height: 78, borderRadius: 39, alignItems: 'center', justifyContent: 'center', marginTop: 12, marginBottom: 14 },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 19, color: '#2A1608', textAlign: 'center' },
  body: { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: '#7A5C3E', textAlign: 'center', lineHeight: 21, marginTop: 10, minHeight: 100 },

  dots: { flexDirection: 'row', gap: 6, marginTop: 18, marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  progressWrap: { alignSelf: 'stretch', marginTop: 18, marginBottom: 18, gap: 7 },
  progressTrack: { height: 5, borderRadius: 3, backgroundColor: '#EDE0D0', overflow: 'hidden' },
  progressFill: { height: 5, borderRadius: 3 },
  progressText: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: '#9A7B5A', textAlign: 'center' },

  btnRow: { flexDirection: 'row', alignItems: 'center', gap: 12, alignSelf: 'stretch' },
  backBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, borderWidth: 1.5, borderColor: '#EDE0D0', alignItems: 'center' },
  backText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#2A1608' },
  nextBtn: { flex: 1.4, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 14, borderRadius: 14 },
  nextText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' },

  allRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  allText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#9A7B5A' },
});
