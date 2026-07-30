// contexts/GuideContext.tsx
// Owns the "How CareLink works" guide: which chapter the user has reached, which
// ones have already been auto-shown, and the single modal instance.
//
// Mounted once at the app root so ANY screen or nav menu can open the guide
// without threading state through it — and so the modal is a sibling of the
// mobile drawer rather than nested inside it.

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import GuideModal from '@/components/shared/GuideModal';
import { stageFor, type GuideRole, type GuideStage } from '@/constants/guideContent';

const ACCENT: Record<GuideRole, string> = {
  helper: '#E86019', // helper orange
  parent: '#8B5A2B', // parent brown
};

type GuideContextValue = {
  /** Open the chapter list (the menu entry point). */
  openGuide: (role?: GuideRole) => void;
  /**
   * Tell the guide where the user is. Auto-shows that chapter the first time
   * they reach it, then never again. Safe to call on every render.
   */
  syncStage: (opts: { role: GuideRole; verified: boolean; hasActivity: boolean }) => void;
};

const GuideContext = createContext<GuideContextValue>({
  openGuide: () => {},
  syncStage: () => {},
});

export const useGuide = () => useContext(GuideContext);

export function GuideProvider({ children }: { children: React.ReactNode }) {
  const [visible, setVisible] = useState(false);
  const [role, setRole] = useState<GuideRole>('helper');
  const [stage, setStage] = useState<GuideStage>('setup');
  /** undefined → open the chapter list; set → jump into that chapter. */
  const [startStage, setStartStage] = useState<GuideStage | undefined>(undefined);

  // Which storage keys we've already looked up this session, so the repeated
  // syncStage calls from a re-rendering Home screen don't re-hit AsyncStorage.
  const checked = useRef<Set<string>>(new Set());

  const syncStage = useCallback(({ role: r, verified, hasActivity }: {
    role: GuideRole; verified: boolean; hasActivity: boolean;
  }) => {
    const next = stageFor(verified, hasActivity);
    setRole(r);
    setStage(next);

    const key = `guide_seen_${r}_${next}_v1`;
    if (checked.current.has(key)) return;
    checked.current.add(key);

    AsyncStorage.getItem(key)
      .then((seen) => {
        if (seen) return;
        setStartStage(next);
        setVisible(true);
        // Marked seen on open, not on close: if the app is killed mid-guide we
        // still don't want to ambush them with the same chapter next launch.
        AsyncStorage.setItem(key, '1').catch(() => {});
      })
      .catch(() => {});
  }, []);

  const openGuide = useCallback((r?: GuideRole) => {
    if (r) setRole(r);
    setStartStage(undefined); // manual open always lands on the chapter list
    setVisible(true);
  }, []);

  const value = useMemo(() => ({ openGuide, syncStage }), [openGuide, syncStage]);

  return (
    <GuideContext.Provider value={value}>
      {children}
      <GuideModal
        visible={visible}
        onClose={() => setVisible(false)}
        role={role}
        currentStage={stage}
        startStage={startStage}
        accent={ACCENT[role]}
      />
    </GuideContext.Provider>
  );
}
