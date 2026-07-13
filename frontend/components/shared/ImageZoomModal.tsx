// components/shared/ImageZoomModal.tsx
// Full-screen document viewer — lets a user zoom/pan an uploaded image to review
// what they submitted. Works on web and native. PDFs open in the browser/viewer.
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';

export function ImageZoomModal({ visible, uri, title, onClose }: {
  visible: boolean;
  uri: string | null;
  title?: string;
  onClose: () => void;
}) {
  const [scale, setScale] = useState(1);
  const isPdf = !!uri && uri.toLowerCase().split('?')[0].endsWith('.pdf');
  const clamp = (v: number) => Math.max(1, Math.min(4, v));

  // Reset zoom whenever a new image opens.
  React.useEffect(() => { if (visible) setScale(1); }, [visible, uri]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={s.backdrop}>
        <View style={s.bar}>
          <Text style={s.title} numberOfLines={1}>{title || 'Document'}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={s.close}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        </View>

        {isPdf ? (
          <View style={s.pdfWrap}>
            <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.85)" />
            <Text style={s.pdfText}>This document is a PDF file.</Text>
            <TouchableOpacity style={s.pdfBtn} onPress={() => uri && Linking.openURL(uri)} activeOpacity={0.85}>
              <Ionicons name="open-outline" size={17} color="#2A1608" />
              <Text style={s.pdfBtnText}>Open PDF</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={s.imgScroll}
            maximumZoomScale={4}
            minimumZoomScale={1}
            bouncesZoom
            centerContent
            showsHorizontalScrollIndicator={false}
            showsVerticalScrollIndicator={false}
            horizontal={false}
          >
            {uri ? (
              <Image source={{ uri }} style={[s.img, { transform: [{ scale }] }]} resizeMode="contain" />
            ) : (
              <Text style={s.pdfText}>No preview available.</Text>
            )}
          </ScrollView>
        )}

        {/* Zoom controls (primary path on web, where ScrollView pinch-zoom is unavailable) */}
        {!isPdf && !!uri && (
          <View style={s.controls}>
            <TouchableOpacity style={s.ctrlBtn} onPress={() => setScale((v) => clamp(v - 0.5))} hitSlop={8}><Ionicons name="remove" size={22} color="#fff" /></TouchableOpacity>
            <TouchableOpacity style={s.ctrlBtnWide} onPress={() => setScale(1)} hitSlop={8}><Text style={s.ctrlText}>{Math.round(scale * 100)}%</Text></TouchableOpacity>
            <TouchableOpacity style={s.ctrlBtn} onPress={() => setScale((v) => clamp(v + 0.5))} hitSlop={8}><Ionicons name="add" size={22} color="#fff" /></TouchableOpacity>
          </View>
        )}
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(12,7,3,0.94)' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: Platform.OS === 'web' ? 18 : 52, paddingBottom: 12 },
  title: { flex: 1, color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  imgScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: '100%' as any },
  img: { width: '100%' as any, height: 460, maxWidth: 900 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: Platform.OS === 'web' ? 22 : 40 },
  ctrlBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  ctrlBtnWide: { minWidth: 76, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.14)' },
  ctrlText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  pdfWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 30 },
  pdfText: { color: 'rgba(255,255,255,0.85)', fontFamily: FontFamily.fredokaRegular, fontSize: 14, textAlign: 'center' },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  pdfBtnText: { color: '#2A1608', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
});
