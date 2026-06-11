// components/helper/profile/DocumentViewer.tsx
// Modal for viewing uploaded documents (images and PDFs)

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

interface DocumentViewerProps {
  visible: boolean;
  fileUrl: string | null;
  fileType: 'image' | 'pdf';
  onClose: () => void;
}

export function DocumentViewer({
  visible,
  fileUrl,
  fileType,
  onClose,
}: DocumentViewerProps) {
  if (!fileUrl) return null;

  const handleOpenInNewTab = () => {
    if (Platform.OS === 'web' && fileUrl) {
      window.open(fileUrl, '_blank');
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <SafeAreaView style={styles.overlay} edges={['top', 'bottom']}>
        {/* Header — always within safe area, close button always reachable */}
        <View style={styles.header}>
          <Text style={styles.title} numberOfLines={1}>Document Preview</Text>
          <TouchableOpacity onPress={onClose} activeOpacity={0.7} hitSlop={10} style={styles.closeBtn}>
            <Ionicons name="close" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Tap anywhere on the backdrop to close */}
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose}>
          {/* Stop propagation so tapping the content itself doesn't close it */}
          <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.content}>
            {fileType === 'pdf' ? (
              <View style={styles.pdfPlaceholder}>
                <Ionicons name="document-text" size={80} color="#FF9500" />
                <Text style={styles.pdfText}>PDF Document</Text>
                <Text style={styles.pdfSubText}>
                  Viewing PDFs is best on a full browser.
                </Text>
                {Platform.OS === 'web' && (
                  <TouchableOpacity
                    style={styles.openButton}
                    onPress={handleOpenInNewTab}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.openButtonText}>Open in New Tab</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <Image
                source={{ uri: fileUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  title: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  closeBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    marginLeft: 12,
  },
  backdrop: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  content: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  pdfPlaceholder: {
    alignItems: 'center',
    padding: 20,
  },
  pdfText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  pdfSubText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  openButton: {
    backgroundColor: '#FF9500',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  openButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 14,
  },
});
