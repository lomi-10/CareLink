import { Stack } from 'expo-router';
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { RoleScreenBackground } from '@/components/shared';

export default function AdminLayout() {
  return (
    <RoleScreenBackground role="admin">
      <View style={styles.flex}>
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="user_management" options={{ title: 'User Management' }} />
      <Stack.Screen name="logs" options={{ title: 'Audit Logs' }} />
      <Stack.Screen name="create_admin_user" options={{ title: 'Create Admin Account' }} />
    </Stack>
      </View>
    </RoleScreenBackground>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});