import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';

export const unstable_settings = {
  // Fix 1: Change initial route to 'index' (your landing page)
  // instead of '(tabs)' which you are deleting.
  initialRouteName: 'index',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* 1. The Landing Page (No folder, sits at app/index.tsx) */}
        <Stack.Screen name="index" options={{ headerShown: false }} />

        {/* 2. The Auth Group (Login, Signup, Welcome) */}
        {/* This covers: app/(auth)/login.tsx, app/(auth)/signup.tsx */}
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />

        {/* 3. The Admin Group */}
        {/* This covers: app/admin/login.tsx, app/admin/dashboard.tsx */}
        <Stack.Screen name="admin" options={{ headerShown: false }} />

        {/* 4. The Employer Group (Parents) */}
        {/* This covers: app/(employer)/home.tsx, etc. */}
        <Stack.Screen name="(employer)" options={{ headerShown: false }} />

        {/* 5. The Helper Group (Applicants) */}
        {/* This covers: app/(helper)/home.tsx, etc. */}
        <Stack.Screen name="(helper)" options={{ headerShown: false }} />

        {/* 6. Utility Screens */}
        <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
        
        {/* CRITICAL: Remove 'adminlogin' and '(tabs)' from here 
           because they don't exist as root files anymore. */}
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}