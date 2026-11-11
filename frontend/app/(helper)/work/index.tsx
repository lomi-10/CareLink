import React, { useEffect } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { WorkHome } from '@/components/helper/work';
import { WorkModeShell } from '@/components/helper/work';
import { useHelperWorkMode } from '@/contexts/HelperWorkModeContext';
import { useAuth } from '@/hooks/shared';
import { useHelperProfile } from '@/hooks/helper';
import { ORANGE } from '@/components/helper/home/helperWarmTheme';

export default function HelperWorkHomeScreen() {
  const router = useRouter();
  const { action } = useLocalSearchParams<{ action?: string }>();
  const { userData, getFullName, loading: authLoading } = useAuth();
  const { ready, isWorkMode, activeHire, refresh } = useHelperWorkMode();
  const { profileData } = useHelperProfile();
  const helperId = Number(userData?.user_id ?? 0);

  useEffect(() => {
    if (action === 'request-leave') {
      router.replace('/(helper)/work/contract' as never);
      return;
    }
    if (ready && (!isWorkMode || !activeHire)) {
      router.replace('/(helper)/home' as never);
    }
  }, [action, activeHire, isWorkMode, ready, router]);

  if (authLoading || !ready || !activeHire || !isWorkMode || helperId <= 0) {
    return (
      <WorkModeShell desktopTitle="Work Home" desktopSubtitle="Agreed pay and payment records">
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator size="large" color={ORANGE} />
        </View>
      </WorkModeShell>
    );
  }

  const profile = profileData?.profile;

  return (
    <WorkModeShell desktopTitle="Work Home" desktopSubtitle="Agreed pay and payment records">
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: 24 }}>
        <WorkHome
          helperId={helperId}
          userFirstName={getFullName().split(/\s+/)[0] || 'Helper'}
          userFullName={getFullName()}
          activeHire={activeHire}
          profileImage={(profile?.profile_image as string | null) ?? null}
          verified={profile?.verification_status === 'Verified'}
          onRefreshWorkContext={refresh}
        />
      </ScrollView>
    </WorkModeShell>
  );
}
