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
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Document Preview</Text>
            <TouchableOpacity onPress={onClose} activeOpacity={0.7}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {fileType === 'pdf' ? (
              <View style={styles.pdfPlaceholder}>
                <Ionicons name="document-text" size={80} color="#FF9500" />
                <Text style={styles.pdfText}>PDF Document</Text>
                <Text style={styles.pdfSubText}>
                  Viewing PDFs is best on a full browser.
                </Text>
                <TouchableOpacity
                  style={styles.openButton}
                  onPress={handleOpenInNewTab}
                  activeOpacity={0.7}
                >
                  <Text style={styles.openButtonText}>Open in New Tab</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <Image
                source={{ uri: fileUrl }}
                style={styles.image}
                resizeMode="contain"
              />
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  container: {
    width: Platform.OS === 'web' ? 800 : '95%',
    height: '80%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
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
    color: '#333',
    marginTop: 16,
  },
  pdfSubText: {
    fontSize: 14,
    color: '#666',
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
