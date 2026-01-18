import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const userId = await AsyncStorage.getItem('user_token');
      if (!userId) return;

      // FIXED: Changed back to 'logtrail.php' to match your server file
      const response = await fetch(`${API_URL}/logtrail.php?user_id=${userId}`);
      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  // Removed handleLogout function

  return (
    <View style={styles.container}>
      
      {/* Header with Back Button */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        {/* Empty view to balance the header title center alignment if needed, or just leave as is */}
        <View style={{width: 24}} /> 
      </View>

      {/* Log Trail Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Activity Log</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#007AFF" />
        ) : (
          <FlatList
            data={logs}
            keyExtractor={(item, index) => index.toString()}
            renderItem={({ item }) => (
              <View style={styles.logItem}>
                <Text style={styles.logAction}>
                  {item.action ? item.action.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                </Text>
                <Text style={styles.logTime}>{item.timestamp}</Text>
              </View>
            )}
            style={{ maxHeight: '100%' }} 
            ListEmptyComponent={<Text style={{color: '#999'}}>No logs found.</Text>}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20, paddingTop: 60 },
  
  // Header Styles
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },

  section: { flex: 1, marginBottom: 30 },
  sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: '#333' },
  logItem: { backgroundColor: 'white', padding: 15, borderRadius: 8, marginBottom: 8, borderLeftWidth: 4, borderLeftColor: '#007AFF' },
  logAction: { fontWeight: 'bold', fontSize: 14, color: '#333' },
  logTime: { color: '#666', fontSize: 12, marginTop: 4 },
});