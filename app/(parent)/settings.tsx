import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, ActivityIndicator, TouchableOpacity } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '../../constants/api';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './settings.styles';

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