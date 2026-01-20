import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// "Props" are the settings you pass to this component
interface SectionCardProps {
  title: string;
  children: React.ReactNode; // This allows you to put other components inside
}

export default function SectionCard({ 
  title, 
  children 
}: SectionCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.header}>{title}</Text>
      <View style={styles.content}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#fff',
    borderRadius: 12, // Rounded corners
    padding: 16,
    marginBottom: 20,
    
    // Shadow for iOS
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    
    // Shadow for Android
    elevation: 3,
  },
  header: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1a1a1a', // Dark grey
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingBottom: 8,
  },
  content: {
    gap: 12, // Adds space between items inside automatically
  },
});