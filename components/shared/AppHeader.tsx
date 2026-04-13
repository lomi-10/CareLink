//components/common/AppHeader.tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons'; 

interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  menu?: boolean;          // New: controls if hamburger shows
  onMenuPress?: () => void; // New: function when hamburger is clicked
}

export default function AppHeader({ 
  title, 
  showBackButton = false, 
  menu = false, 
  onMenuPress 
}: AppHeaderProps) {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* 1. LEFT SLOT: Logo Placeholder */}
        <View style={styles.leftContainer}>
           {/* Future Logo Here */}
        </View>

        {/* 2. CENTER SLOT: Title */}
        <View style={styles.centerContainer}>
          <Text style={styles.title}>{title}</Text>
        </View>

        {/* 3. RIGHT SLOT: Action Buttons (Back OR Menu) */}
        <View style={styles.rightContainer}>
          {showBackButton ? (
            <TouchableOpacity onPress={() => router.back()} style={styles.iconButton}>
               <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
          ) : menu ? (
            <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
               <Ionicons name="menu" size={28} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#007AFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    zIndex: 100, 
  },
  container: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    maxWidth: 1200, 
    width: '100%',
    alignSelf: 'center',
  },
  leftContainer: {
    width: 40,
    alignItems: 'flex-start',
  },
  centerContainer: {
    flex: 1,
    alignItems: 'center',
  },
  title: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  rightContainer: {
    width: 40,
    alignItems: 'flex-end',
  },
  iconButton: {
    padding: 5,
  },
});