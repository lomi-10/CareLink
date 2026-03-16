// components/parent/profile/ElderlyList.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Matched exactly to your database 'parent_elderly' table
export interface Elderly {
  elderly_id: number;
  age: number;
  gender?: string;
  condition?: string;
  care_level: string;
}

interface ElderlyListProps {
  elderly?: Elderly[];
}

export function ElderlyList({ elderly }: ElderlyListProps) {
  if (!elderly || elderly.length === 0) {
    return null; // Don't show anything if there are no elderly members
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Elderly Details</Text>
      
      {elderly.map((senior, index) => (
        <View key={senior.elderly_id.toString()} style={styles.card}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={senior.gender === 'Female' ? 'woman' : senior.gender === 'Male' ? 'man' : 'person'} 
              size={24} 
              color="#FF9500" // Orange theme for elderly
            />
          </View>
          
          <View style={styles.infoContainer}>
            <Text style={styles.title}>
              Senior {index + 1} ({senior.age} yrs old)
            </Text>
            
            <View style={styles.tagRow}>
              {senior.gender && senior.gender !== 'Prefer not to say' && (
                <View style={[styles.tag, { backgroundColor: '#FFF4E5' }]}>
                  <Text style={[styles.tagText, { color: '#FF9500' }]}>{senior.gender}</Text>
                </View>
              )}
              {senior.care_level && (
                <View style={[styles.tag, { backgroundColor: '#E5F1FF' }]}>
                  <Text style={[styles.tagText, { color: '#007AFF' }]}>{senior.care_level} Care</Text>
                </View>
              )}
            </View>

            {senior.condition ? (
              <View style={styles.conditionContainer}>
                <Ionicons name="medical" size={14} color="#FF3B30" />
                <Text style={styles.conditionText}>Condition: {senior.condition}</Text>
              </View>
            ) : null}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 16,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 12,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4E5',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  tagRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 4,
  },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
  },
  conditionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  conditionText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '500',
    marginLeft: 4,
  },
});