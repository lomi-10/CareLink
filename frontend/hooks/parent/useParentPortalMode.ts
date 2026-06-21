import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

/** Returns true when the parent portal is in Work Mode (persisted in AsyncStorage). */
export function useParentPortalMode(): boolean {
  const [isWorkMode, setIsWorkMode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void AsyncStorage.getItem('parent_portal_mode').then(v => {
        setIsWorkMode(v === 'work');
      });
    }, []),
  );

  return isWorkMode;
}
