// components/parent/profile/DocumentViewer.tsx
import React from 'react';
import { 
  Modal, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Image, 
  Text, 
  Linking 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface DocumentViewerProps {
  visible: boolean;
  fileUrl: string | null;
  fileType: 'image' | 'pdf';
  onClose: () => void;
}

export function DocumentViewer({ visible, fileUrl, fileType, onClose }: DocumentViewerProps) {
  if (!visible || !fileUrl) return null;

  const handleOpenPdf = async () => {
    try {
      const supported = await Linking.canOpenURL(fileUrl);
      if (supported) {
        await Linking.openURL(fileUrl);
      }
    } catch (error) {
      console.error("Couldn't open the PDF URL:", error);
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
        {/* Close Button */}
        <TouchableOpacity style={styles.closeButton} onPress={onClose} activeOpacity={0.7}>
          <Ionicons name="close-circle" size={36} color="#fff" />
        </TouchableOpacity>
        
        <View style={styles.content}>
          {fileType === 'image' ? (
            <Image 
              source={{ uri: fileUrl }} 
              style={styles.image} 
              resizeMode="contain" 
            />
          ) : (
            <View style={styles.pdfContainer}>
              <Ionicons name="document-text" size={80} color="#fff" />
              <Text style={styles.pdfText}>PDF Document</Text>
              <Text style={styles.pdfSubtext}>
                For the best viewing experience, please open this PDF in your browser.
              </Text>
              <TouchableOpacity 
                style={styles.openButton}
                onPress={handleOpenPdf}
                activeOpacity={0.8}
              >
                <Ionicons name="open-outline" size={20} color="#fff" />
                <Text style={styles.openButtonText}>View PDF</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)', // Dark overlay to focus on the document
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  content: {
    width: '100%',
    height: '80%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  image: {
    width: '90%',
    height: '100%',
  },
  pdfContainer: {
    alignItems: 'center',
    padding: 30,
  },
  pdfText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
    marginTop: 16,
  },
  pdfSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  openButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#007AFF',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    gap: 8,
  },
  openButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});