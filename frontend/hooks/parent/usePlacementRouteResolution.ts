import { useMemo, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useParentActivePlacements, type ActivePlacement } from '@/hooks/parent/useParentActivePlacements';

export type PlacementRouteResolution = {
  applicationId: number;
  helperName: string;
  /** True when `application_id` is in the URL or we resolved a single / manual placement. */
  ready: boolean;
  /** Waiting on placements list (only when URL has no application id). */
  isResolving: boolean;
  showEmpty: boolean;
  showPicker: boolean;
  placements: ActivePlacement[];
  setPickedApplicationId: (id: number) => void;
  refreshPlacements: () => Promise<void>;
};

/**
 * Shared for parent placement screens opened from the menu (no query params) or from a card (with params).
 */
export function usePlacementRouteResolution(): PlacementRouteResolution {
  const params = useLocalSearchParams<{ application_id?: string; helper_name?: string }>();
  const paramsAppId = params.application_id ? Number(params.application_id) : 0;
  const [manualPickId, setManualPickId] = useState<number | null>(null);

  const { placements, loading, refresh } = useParentActivePlacements();

  const resolvedFromList = useMemo(() => {
    if (paramsAppId) return null;
    if (placements.length !== 1) return null;
    return placements[0];
  }, [paramsAppId, placements]);

  const applicationId =
    paramsAppId ||
    manualPickId ||
    (resolvedFromList ? Number(resolvedFromList.application_id) : 0);

  const helperName = useMemo(() => {
    if (params.helper_name) {
      try {
        return decodeURIComponent(params.helper_name);
      } catch {
        return params.helper_name;
      }
    }
    const p = placements.find((x) => Number(x.application_id) === applicationId);
    return p?.helper_name || resolvedFromList?.helper_name || 'Helper';
  }, [params.helper_name, placements, applicationId, resolvedFromList]);

  const isResolving = !paramsAppId && loading;
  const showEmpty = !loading && !paramsAppId && placements.length === 0;
  const showPicker = !loading && !paramsAppId && placements.length > 1 && !manualPickId;
  const ready = applicationId > 0;

  return {
    applicationId,
    helperName,
    ready,
    isResolving,
    showEmpty,
    showPicker,
    placements,
    setPickedApplicationId: (id: number) => setManualPickId(id),
    refreshPlacements: refresh,
  };
}
