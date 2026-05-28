// components/parent/profile/ChildrenList.tsx

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Matched exactly to your database 'parent_children' table
export interface Child {
  child_id: number;
  age: number;
  gender?: string;
  special_needs?: string;
}

interface ChildrenListProps {
  children?: Child[];
}

export function ChildrenList({ children }: ChildrenListProps) {
  if (!children || children.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No children added to this profile yet.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.headerTitle}>Children Details</Text>
      
      {children.map((child, index) => (
        <View key={child.child_id.toString()} style={styles.childCard}>
          <View style={styles.iconContainer}>
            <Ionicons 
              name={child.gender === 'Female' ? 'woman' : child.gender === 'Male' ? 'man' : 'person'} 
              size={24} 
              color="#007AFF" 
            />
          </View>
          
          <View style={styles.infoContainer}>
            {/* Since there's no name in the DB, we generate a title based on index/age */}
            <Text style={styles.childTitle}>
              Child {index + 1} ({child.age} yrs old)
            </Text>
            
            <View style={styles.tagRow}>
              {child.gender && child.gender !== 'Prefer not to say' && (
                <View style={[styles.tag, { backgroundColor: '#E1F5FE' }]}>
                  <Text style={[styles.tagText, { color: '#0288D1' }]}>{child.gender}</Text>
                </View>
              )}
            </View>

            {child.special_needs ? (
              <View style={styles.specialNeedsContainer}>
                <Ionicons name="medical" size={14} color="#FF3B30" />
                <Text style={styles.specialNeedsText}>Needs: {child.special_needs}</Text>
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
    marginTop: 12,
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
  emptyContainer: {
    paddingVertical: 12,
  },
  emptyText: {
    color: '#8E8E93',
    fontStyle: 'italic',
    fontSize: 14,
  },
  childCard: {
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
    backgroundColor: '#E5F1FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  infoContainer: {
    flex: 1,
  },
  childTitle: {
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
  specialNeedsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    backgroundColor: '#FFEBEB',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  specialNeedsText: {
    fontSize: 12,
    color: '#D32F2F',
    fontWeight: '500',
    marginLeft: 4,
  },
});