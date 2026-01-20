import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, SafeAreaView, Platform, StatusBar } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
// You can use Ionicons for a back arrow if you installed @expo/vector-icons
// import { Ionicons } from '@expo/vector-icons'; 

// 1. DEFINE PROPS
// This acts like a "settings menu" for your component.
// It allows the parent to control the Title and if the Back Button shows.
interface AppHeaderProps {
  title: string;
  showBackButton?: boolean;
  menu?: boolean;
}

export default function AppHeader({ title, showBackButton = false, menu = false }: AppHeaderProps) {
  const router = useRouter();

  return (
    // SafeAreaView ensures the header doesn't overlap the notch on iPhones
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        
        {/* 2. LOGIC: ONLY SHOW BACK BUTTON IF REQUESTED */}
        {showBackButton && (
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
             <Ionicons name='arrow-back' size={20} color={"#000"}/>
          </TouchableOpacity>
        )}

        {/* 3. DISPLAY THE TITLE PASSED FROM THE HELPER */}
        <Text style={styles.title}>{title}</Text>
        
        {/* Empty view to balance the flex layout if back button exists */}
        {showBackButton && <View style={styles.placeholder} />}

        {menu && (
          <TouchableOpacity style={styles.menuButton}>
            <Ionicons name='menu-outline' size={20} color={"#000"}/>
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    backgroundColor: '#007AFF', // Your brand color
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  container: {
    height: 60,
    backgroundColor: '#007AFF',
    flexDirection: 'row', // Aligns items horizontally
    alignItems: 'center', // Centers items vertically
    justifyContent: 'center', // Centers items horizontally
    paddingHorizontal: 15,
  },
  title: {
    color: '#fff',
    fontSize: 20,
    fontWeight: 'bold',
  },
  backButton: {
    position: 'absolute', // Takes it out of the flow to stick it to the left
    left: 15,
    padding: 10,
    zIndex: 10,
  },
  menuButton: {
    
    position:"fixed",
    right: 16,
    zIndex: 10,
  },
  placeholder: {
    width: 40,
  }
});