import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Stack } from 'expo-router'; // Needed to hide the default header
//import custom UI's
import AppHeader from '../../components/common/AppHeader';
import LabeledInput from '../../components/common/LabeledInput';
import SectionCard from '../../components/profile/SectionCard';

export default function HelperProfileScreen() {
  return (
    <View style={styles.screenContainer}>
      
      {/* 2. HIDE THE DEFAULT EXPO HEADER */}
      <Stack.Screen options={{ headerShown: false }} />

      {/* 3. USE YOUR CUSTOM COMPONENT */}
      <AppHeader title="My Bio-Data" showBackButton={true} menu={true}/>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        <SectionCard title="Personal Details">
            <LabeledInput 
                label="Full Name" 
                value="Juan Dela Cruz" 
                onChangeText={() => {}} 
            />
        </SectionCard>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#F2F4F8',
  },
  scrollContent: {
    padding: 20,
  },
});