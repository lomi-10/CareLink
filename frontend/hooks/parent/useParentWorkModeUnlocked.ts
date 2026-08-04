// hooks/parent/useParentWorkModeUnlocked.ts
// Work Mode has two independent conditions: the portal-mode TOGGLE
// (useParentPortalMode, just a persisted UI preference) and whether the
// account actually HAS an active hire. Screens outside Home were checking
// only the toggle, so switching into Work Mode with no active placement still
// rendered the full Work Mode tab bar (Tasks, Helper Management) — reachable
// even though Home itself correctly showed the locked state. This combines
// both checks the way Home already does, so every screen agrees on what
// "unlocked" means.

import { useParentPortalMode } from './useParentPortalMode';
import { useParentStats } from './useParentStats';

export function useParentWorkModeUnlocked() {
  const isWorkMode = useParentPortalMode();
  const { stats, loading } = useParentStats();
  const hasActiveHire = (stats?.active_placements ?? 0) > 0;
  return { isWorkMode, unlocked: isWorkMode && hasActiveHire, loading };
}
