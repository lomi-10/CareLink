import React from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
   
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="home" />
      <Stack.Screen name="profile" />
      <Stack.Screen name="jobs" />
      <Stack.Screen name="applications"/>
      <Stack.Screen name="messages"/>
      <Stack.Screen name="settings"/>
      {/* Add other screens here */}
    </Stack>
  
  );
  
}