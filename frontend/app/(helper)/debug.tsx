/**
 * Developer-only helper route stub (keeps the bundle valid if linked from menus).
 */
import React, { useMemo } from 'react';
import { Text, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { createHelperHomeStyles } from './home.styles';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

export default function HelperDebugPlaceholder() {
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createHelperHomeStyles(c), [c]);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: c.canvasHelper }]} edges={['bottom']}>
      <ScrollView contentContainerStyle={{ padding: 24 }}>
        <Text style={[styles.desktopPageTitle, { color: c.ink }]}>Debug</Text>
        <Text style={[styles.desktopPageSub, { marginTop: 8 }]}>
          This route is reserved for troubleshooting. Nothing to configure here yet.
        </Text>
      </ScrollView>
    </SafeAreaView>
  );
}
