// components/shared/ImageZoomModal.tsx
// Full-screen document viewer — lets a user zoom/pan an uploaded image to review
// what they submitted. Works on web and native. PDFs open in the browser/viewer.
import React, { useState } from 'react';
import { Modal, View, Text, StyleSheet, Image, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { usePreventScreenCapture } from 'expo-screen-capture';
import { FontFamily } from '@/constants/GlobalStyles';

export function ImageZoomModal({
  visible,
  uri,
  title,
  onClose,
  isPdf: isPdfProp,
  uriBack = null,
  isPdfBack,
  preventScreenCapture = false,
  watermarked = false,
}: {
  visible: boolean;
  uri: string | null;
  title?: string;
  onClose: () => void;
  uriBack?: string | null;
  isPdfBack?: boolean;
  preventScreenCapture?: boolean;
  watermarked?: boolean;
  /**
   * Tell the viewer the file is a PDF. Needed because documents are served via
   * a signed serve_document.php URL that never ends in ".pdf", so the guess
   * below silently fails and the PDF gets rendered as an <Image> — a blank
   * frame. Callers that know the stored path should always pass this.
   */
  isPdf?: boolean;
}) {
  const [scale, setScale] = useState(1);
  const [side, setSide] = useState<'front' | 'back'>('front');
  const [previewError, setPreviewError] = useState(false);
  const shownUri = side === 'back' && uriBack ? uriBack : uri;
  const isPdf = side === 'back'
    ? (isPdfBack ?? (!!shownUri && shownUri.toLowerCase().split('?')[0].endsWith('.pdf')))
    : (isPdfProp ?? (!!shownUri && shownUri.toLowerCase().split('?')[0].endsWith('.pdf')));
  const clamp = (v: number) => Math.max(1, Math.min(4, v));

  // Reset zoom whenever a new image opens.
  React.useEffect(() => { if (visible) { setScale(1); setSide('front'); setPreviewError(false); } }, [visible, uri, uriBack]);
  const openPdf = () => {
    if (!shownUri) return;
    void Linking.openURL(shownUri).catch(() => setPreviewError(true));
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {visible && preventScreenCapture && Platform.OS !== 'web' && <ScreenCaptureGuard />}
      <View style={s.backdrop}>
        <View style={s.bar}>
          <View style={s.titleWrap}>
            <Text style={s.title} numberOfLines={1}>{title || 'Document'}{uriBack ? ` · ${side === 'front' ? 'Front' : 'Back'}` : ''}</Text>
            {watermarked && <Text style={s.watermarkNote}>Watermarked secure preview</Text>}
          </View>
          <TouchableOpacity onPress={onClose} hitSlop={12} style={s.close}><Ionicons name="close" size={24} color="#fff" /></TouchableOpacity>
        </View>

        {uriBack && (
          <View style={s.sideSwitch}>
            {(['front', 'back'] as const).map((docSide) => (
              <TouchableOpacity
                key={docSide}
                onPress={() => { setSide(docSide); setScale(1); setPreviewError(false); }}
                style={[s.sideButton, side === docSide && s.sideButtonActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: side === docSide }}
              >
                <Text style={[s.sideButtonText, side === docSide && s.sideButtonTextActive]}>
                  {docSide === 'front' ? 'Front side' : 'Back side'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {isPdf ? (
          <View style={s.pdfWrap}>
            <Ionicons name="document-text-outline" size={64} color="rgba(255,255,255,0.85)" />
            <Text style={s.pdfText}>{watermarked ? 'This watermarked PDF opens in your device viewer. CareLink cannot block screenshots outside the app.' : 'This document is a PDF file.'}</Text>
            <TouchableOpacity style={s.pdfBtn} onPress={openPdf} activeOpacity={0.85}>
              <Ionicons name="open-outline" size={17} color="#2A1608" />
              <Text style={s.pdfBtnText}>{watermarked ? 'Open watermarked PDF' : 'Open PDF'}</Text>
            </TouchableOpacity>
            {previewError && <Text style={s.previewError}>The document preview could not be opened. Close and reopen the applicant details to refresh its secure link.</Text>}
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
            {shownUri ? (
              <Image
                source={{ uri: shownUri }}
                style={[s.img, { transform: [{ scale }] }]}
                resizeMode="contain"
                onError={() => setPreviewError(true)}
                onLoad={() => setPreviewError(false)}
              />
            ) : (
              <Text style={s.pdfText}>No preview available.</Text>
            )}
            {previewError && <Text style={s.previewError}>This secure preview could not be loaded. Close and reopen the applicant details to refresh its link.</Text>}
          </ScrollView>
        )}

        {/* Zoom controls (primary path on web, where ScrollView pinch-zoom is unavailable) */}
        {!isPdf && !!shownUri && (
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

function ScreenCaptureGuard() {
  usePreventScreenCapture('carelink-shared-document');
  return null;
}

const s = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(12,7,3,0.94)' },
  bar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: Platform.OS === 'web' ? 18 : 52, paddingBottom: 12 },
  titleWrap: { flex: 1, minWidth: 0, marginRight: 12 },
  title: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 16 },
  watermarkNote: { color: 'rgba(255,255,255,0.62)', fontSize: 11, marginTop: 3 },
  close: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.12)' },
  sideSwitch: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingBottom: 10 },
  sideButton: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)' },
  sideButtonActive: { backgroundColor: '#EA6F2A', borderColor: '#EA6F2A' },
  sideButtonText: { color: '#fff', fontSize: 12, fontFamily: FontFamily.fredokaRegular },
  sideButtonTextActive: { fontFamily: FontFamily.fredokaSemiBold },
  imgScroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', minHeight: '100%' as any },
  img: { width: '100%' as any, height: 460, maxWidth: 900 },
  controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: Platform.OS === 'web' ? 22 : 40 },
  ctrlBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.14)' },
  ctrlBtnWide: { minWidth: 76, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 14, backgroundColor: 'rgba(255,255,255,0.14)' },
  ctrlText: { color: '#fff', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
  pdfWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 14, paddingHorizontal: 30 },
  pdfText: { color: 'rgba(255,255,255,0.85)', fontFamily: FontFamily.fredokaRegular, fontSize: 14, textAlign: 'center' },
  previewError: { color: '#FFD2BE', fontFamily: FontFamily.fredokaRegular, fontSize: 13, lineHeight: 19, textAlign: 'center', paddingHorizontal: 24, marginTop: 10 },
  pdfBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  pdfBtnText: { color: '#2A1608', fontFamily: FontFamily.fredokaSemiBold, fontSize: 14 },
});
