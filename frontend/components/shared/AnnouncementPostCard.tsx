import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Image, Modal, Platform, SafeAreaView, ScrollView, Text, TouchableOpacity, useWindowDimensions, View,
} from 'react-native';
import { announcementImageUrl, type Announcement } from '@/lib/announcementsApi';

function formattedDate(value: string): string {
  const date = new Date(value.replace(' ', 'T'));
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

export function AnnouncementPostCard({ announcement }: { announcement: Announcement }) {
  const [viewerVisible, setViewerVisible] = useState(false);
  const { height } = useWindowDimensions();
  const imageUrl = announcementImageUrl(announcement.image_path);

  return (
    <>
      <TouchableOpacity
        onPress={() => setViewerVisible(true)}
        activeOpacity={0.86}
        accessibilityRole="button"
        accessibilityLabel={`Open announcement: ${announcement.title}`}
        style={{ backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7DED2', borderRadius: 16, overflow: 'hidden' }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 }}>
          <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F7E9D8', alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="megaphone" size={18} color="#9A4D1D" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#2A1608', fontSize: 14, fontWeight: '700' }}>PESO Announcement</Text>
            <Text style={{ color: '#7A5C3E', fontSize: 11, marginTop: 2 }}>{formattedDate(announcement.created_at)}</Text>
          </View>
          <Ionicons name="ellipsis-horizontal" size={19} color="#7A5C3E" />
        </View>
        <Text style={{ color: '#2A1608', fontSize: 17, lineHeight: 23, fontWeight: '700', paddingHorizontal: 14, paddingBottom: 12 }}>
          {announcement.title}
        </Text>
        {imageUrl ? <Image source={{ uri: imageUrl }} resizeMode="cover" style={{ width: '100%', height: 190, backgroundColor: '#F5E6CC' }} /> : null}
        <View style={{ padding: 14, paddingTop: imageUrl ? 12 : 0 }}>
          <Text numberOfLines={3} style={{ color: '#493321', fontSize: 14, lineHeight: 21 }}>{announcement.body}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: 12 }}>
            <Text style={{ color: '#9A4D1D', fontSize: 13, fontWeight: '700' }}>Read full announcement</Text>
            <Ionicons name="arrow-forward" size={14} color="#9A4D1D" />
          </View>
        </View>
      </TouchableOpacity>

      <Modal
        visible={viewerVisible}
        animationType={Platform.OS === 'web' ? 'fade' : 'slide'}
        presentationStyle={Platform.OS === 'ios' ? 'fullScreen' : undefined}
        onRequestClose={() => setViewerVisible(false)}
      >
        <SafeAreaView style={{ flex: 1, backgroundColor: '#F7F4EF' }}>
          <View style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#E7DED2' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 9 }}>
              <Ionicons name="megaphone" size={20} color="#9A4D1D" />
              <Text style={{ color: '#2A1608', fontSize: 15, fontWeight: '700' }}>PESO Announcement</Text>
            </View>
            <TouchableOpacity
              onPress={() => setViewerVisible(false)}
              accessibilityRole="button"
              accessibilityLabel="Close announcement"
              hitSlop={10}
              style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#F3EEE7', alignItems: 'center', justifyContent: 'center' }}
            >
              <Ionicons name="close" size={22} color="#493321" />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: 16, paddingVertical: 22 }}>
            <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#E7DED2', borderRadius: 18, overflow: 'hidden' }}>
              <View style={{ padding: 22, paddingBottom: imageUrl ? 16 : 22 }}>
                <Text style={{ color: '#9A4D1D', fontSize: 11, fontWeight: '700', letterSpacing: 1, textTransform: 'uppercase' }}>Official update</Text>
                <Text style={{ color: '#2A1608', fontSize: 25, lineHeight: 32, fontWeight: '700', marginTop: 8 }}>{announcement.title}</Text>
                <Text style={{ color: '#7A5C3E', fontSize: 12, marginTop: 8 }}>{formattedDate(announcement.created_at)}</Text>
              </View>
              {imageUrl ? (
                <View style={{ width: '100%', height: Math.min(height * 0.58, 620), backgroundColor: '#211B16', alignItems: 'center', justifyContent: 'center' }}>
                  <Image source={{ uri: imageUrl }} resizeMode="contain" style={{ width: '100%', height: '100%' }} />
                </View>
              ) : null}
              <Text style={{ color: '#493321', fontSize: 16, lineHeight: 26, paddingHorizontal: 22, paddingVertical: 22 }}>
                {announcement.body}
              </Text>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}
