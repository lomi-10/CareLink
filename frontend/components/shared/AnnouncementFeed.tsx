import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Text, TouchableOpacity, View, type StyleProp, type ViewStyle,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { fetchAnnouncements, type Announcement } from '@/lib/announcementsApi';
import { AnnouncementPostCard } from './AnnouncementPostCard';

export function AnnouncementFeed({ style }: { style?: StyleProp<ViewStyle> }) {
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const raw = await AsyncStorage.getItem('user_data');
      const userId = raw ? Number((JSON.parse(raw) as { user_id?: string | number }).user_id) : 0;
      if (!Number.isSafeInteger(userId) || userId <= 0) {
        throw new Error('Could not identify your account. Please sign in again.');
      }
      setItems(await fetchAnnouncements(userId));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not load announcements.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  if (loading) return <ActivityIndicator size="small" color="#A75A22" style={{ marginVertical: 12 }} />;
  if (items.length === 0 && !error) return null;

  return (
    <View style={[{ marginHorizontal: 16, marginTop: 12, gap: 10 }, style]}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
        <Ionicons name="megaphone" size={19} color="#A75A22" />
        <Text style={{ flex: 1, color: '#2A1608', fontSize: 16, fontWeight: '700' }}>PESO Announcements</Text>
        {items.length > 0 && <Text style={{ color: '#7A5C3E', fontSize: 12 }}>Latest updates</Text>}
        <TouchableOpacity onPress={() => void load()} accessibilityLabel="Refresh announcements" hitSlop={8}>
          <Ionicons name="refresh-outline" size={18} color="#A75A22" />
        </TouchableOpacity>
      </View>
      {error ? (
        <TouchableOpacity onPress={() => void load()} activeOpacity={0.8}
          style={{ padding: 14, backgroundColor: '#FFF7ED', borderWidth: 1, borderColor: '#FDBA74', borderRadius: 14, flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Ionicons name="alert-circle-outline" size={18} color="#C2410C" />
          <Text style={{ flex: 1, color: '#9A3412', fontSize: 13 }}>{error} Tap to retry.</Text>
        </TouchableOpacity>
      ) : null}
      {items.map((item) => <AnnouncementPostCard key={item.announcement_id} announcement={item} />)}
    </View>
  );
}
