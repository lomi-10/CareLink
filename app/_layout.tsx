import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import React from 'react';

export const unstable_settings = {
  // Ensure that segment paths are correctly nested
  // (tabs) is nested under the root
  initialRouteName: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    // Your theme provider is great!
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        {/* --- THESE ARE THE SCREENS YOU WERE MISSING --- */}
        
        {/* This is your "gatekeeper" screen (index.tsx) */}
        <Stack.Screen name="index" options={{ headerShown: false }} />
        
        {/* This is your welcome screen (welcome.tsx) */}
        <Stack.Screen name="welcome" options={{ headerShown: false }} />
        
        {/* This is your login screen (login.tsx) */}
        <Stack.Screen name="login" options={{ headerShown: false }} />
        
        {/* This is your signup screen (signup.tsx) */}
        <Stack.Screen name="signup" options={{ headerShown: false }} />

        {/* admin login screen (adminlogin.tsx) */}
        <Stack.Screen name="adminlogin" options={{ headerShown: false }} />

        {/* --- END OF MISSING SCREENS --- */}


        {/* This is your main app section */}
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        
        {/* This is the default modal screen, you can keep or remove it */}
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}