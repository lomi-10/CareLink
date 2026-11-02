import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import API_URL from '@/constants/api';

interface PlacementExperience {
  placement_id: number;
  position: string;
  counterparty_name: string;
  start_date: string;
  end_date: string;
  other_party_confirmed: boolean;
  you_confirmed: boolean;
}

export function PlacementExperienceConfirmations({
  userType,
  accentColor,
  refreshToken,
}: {
  userType: 'helper' | 'parent';
  accentColor: string;
  refreshToken?: number;
}) {
  const [placements, setPlacements] = useState<PlacementExperience[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState('');
  const [submittingId, setSubmittingId] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');

  const loadPlacements = useCallback(async () => {
    try {
      setLoading(true);
      setLoadingError('');
      const response = await fetch(`${API_URL}/shared/placement_experience_confirmation.php`);
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to load placement confirmations.');
      }
      setPlacements(Array.isArray(data.placements) ? data.placements : []);
    } catch (error) {
      setLoadingError(error instanceof Error ? error.message : 'Unable to load placement confirmations.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlacements();
  }, [loadPlacements, refreshToken]);

  const confirmPlacement = async (placementId: number) => {
    try {
      setSubmittingId(placementId);
      setActionError('');
      const response = await fetch(`${API_URL}/shared/placement_experience_confirmation.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placement_id: placementId }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Unable to save your confirmation.');
      }
      await loadPlacements();
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Unable to save your confirmation.');
    } finally {
      setSubmittingId(null);
    }
  };

  if (loading && placements.length === 0) {
    return <ActivityIndicator color={accentColor} style={{ marginVertical: 12 }} />;
  }
  if (loadingError) {
    return (
      <View style={{ marginVertical: 12, padding: 14, borderRadius: 12, backgroundColor: '#FFF4E5' }}>
        <Text style={{ color: '#7A4A00', fontSize: 13 }}>{loadingError}</Text>
        <TouchableOpacity onPress={loadPlacements} style={{ marginTop: 8 }}>
          <Text style={{ color: accentColor, fontWeight: '700' }}>Try again</Text>
        </TouchableOpacity>
      </View>
    );
  }
  if (placements.length === 0) return null;

  const formatDate = (date: string) => {
    const parsed = new Date(`${date}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? date : parsed.toLocaleDateString();
  };

  return (
    <View style={{ gap: 10, marginVertical: 12 }}>
      <View>
        <Text style={{ fontSize: 16, fontWeight: '800', color: '#292524' }}>Confirm completed CareLink work</Text>
        <Text style={{ marginTop: 3, color: '#68615D', fontSize: 12, lineHeight: 17 }}>
          This experience is verified only after both people confirm. Confirm only if the work and dates are accurate.
        </Text>
      </View>
      {actionError ? <Text style={{ color: '#B42318', fontSize: 12 }}>{actionError}</Text> : null}
      {placements.map((placement) => (
        <View key={placement.placement_id} style={{ padding: 14, borderWidth: 1, borderColor: '#E8E2DC', borderRadius: 12, backgroundColor: '#FFFFFF' }}>
          <Text style={{ color: '#292524', fontSize: 14, fontWeight: '700' }}>{placement.position || 'Domestic work'}</Text>
          <Text style={{ marginTop: 3, color: '#68615D', fontSize: 12 }}>
            {placement.counterparty_name} · {formatDate(placement.start_date)} – {formatDate(placement.end_date)}
          </Text>
          <Text style={{ marginTop: 8, color: placement.other_party_confirmed ? '#18804A' : '#7A4A00', fontSize: 12 }}>
            {placement.you_confirmed
              ? 'You confirmed. Waiting for the other person.'
              : placement.other_party_confirmed
                ? 'The other person confirmed. Your confirmation is still needed.'
                : 'Waiting for both people to confirm.'}
          </Text>
          {!placement.you_confirmed && (
            <TouchableOpacity
              accessibilityRole="button"
              disabled={submittingId !== null}
              onPress={() => confirmPlacement(placement.placement_id)}
              style={{ alignSelf: 'flex-start', marginTop: 10, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 9, backgroundColor: accentColor, opacity: submittingId === placement.placement_id ? 0.65 : 1 }}
            >
              {submittingId === placement.placement_id
                ? <ActivityIndicator color="#FFFFFF" size="small" />
                : <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Ionicons name="checkmark-circle-outline" size={15} color="#FFFFFF" />
                    <Text style={{ color: '#FFFFFF', fontSize: 12, fontWeight: '700' }}>Confirm this experience</Text>
                  </View>}
            </TouchableOpacity>
          )}
        </View>
      ))}
    </View>
  );
}
