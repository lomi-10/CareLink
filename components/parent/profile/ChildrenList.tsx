// components/parent/profile/ChildrenList.tsx
// Component for displaying children list in parent profile

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Child {
  child_id: string;
  name: string;
  age: number;
  gender: string;
  special_needs?: string;
}

interface ChildrenListProps {
  children: Child[];
}

export function ChildrenList({ children }: ChildrenListProps) {
  if (!children || children.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Children</Text>
      {children.map((child, index) => (
        <View key={child.child_id || index} style={styles.childItem}>
          <Ionicons name="person" size={16} color="#666" />
          <View style={styles.childInfo}>
            <Text style={styles.childText}>
              {child.name}, Age {child.age} ({child.gender})
            </Text>
            {child.special_needs && (
              <Text style={styles.specialNeeds}>
                Special needs: {child.special_needs}
              </Text>
            )}
          </View>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F3F5',
  },
  title: {
    fontSize: 12,
    color: '#6C757D',
    fontWeight: '700',
    marginBottom: 10,
  },
  childItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: '#F8F9FA',
    padding: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  childInfo: {
    flex: 1,
  },
  childText: {
    fontSize: 13,
    color: '#495057',
    fontWeight: '500',
  },
  specialNeeds: {
    fontSize: 11,
    color: '#FF9500',
    marginTop: 2,
    fontStyle: 'italic',
  },
});
