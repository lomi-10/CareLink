import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="user_management" options={{ title: 'User Management' }} />
      <Stack.Screen name="logs" options={{ title: 'Audit Logs' }} />
      <Stack.Screen name="create_admin_user" options={{ title: 'Create Admin Account' }} />
    </Stack>
  );
}