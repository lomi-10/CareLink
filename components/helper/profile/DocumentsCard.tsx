// components/helper/profile/DocumentsCard.tsx
// Documents card showing upload status and view options

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Document {
  status: string;
  url: string | null;
  file_path: string;
}

interface DocumentsCardProps {
  barangayClearance: Document;
  validId: Document;
  policeClearance: Document;
  tesdaNc2: Document;
  onViewFile: (doc: Document) => void;
  onManageDocuments: () => void;
}

export function DocumentsCard({
  barangayClearance,
  validId,
  policeClearance,
  tesdaNc2,
  onViewFile,
  onManageDocuments,
}: DocumentsCardProps) {
  const renderDocumentRow = (title: string, doc: Document) => (
    <View style={styles.docRow}>
      <View style={styles.docIcon}>
        <Ionicons
          name={doc.status === 'uploaded' ? 'checkmark-circle' : 'document-outline'}
          size={20}
          color={doc.status === 'uploaded' ? '#34C759' : '#999'}
        />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text
          style={[
            styles.docStatus,
            { color: doc.status === 'uploaded' ? '#34C759' : '#FF9500' },
          ]}
        >
          {doc.status === 'uploaded' ? 'Uploaded' : 'Pending'}
        </Text>
      </View>
      {doc.status === 'uploaded' && (
        <TouchableOpacity onPress={() => onViewFile(doc)} activeOpacity={0.7}>
          <Ionicons name="eye-outline" size={20} color="#666" />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <View style={styles.header}>
          <Ionicons name="document-text-outline" size={22} color="#9C27B0" />
          <Text style={styles.title}>Required Documents</Text>
        </View>
        <TouchableOpacity onPress={onManageDocuments} activeOpacity={0.7}>
          <Text style={styles.viewAllText}>Manage →</Text>
        </TouchableOpacity>
      </View>

      {renderDocumentRow('Barangay Clearance', barangayClearance)}
      {renderDocumentRow('Valid ID', validId)}
      {renderDocumentRow('Police Clearance', policeClearance)}
      {renderDocumentRow('TESDA NC2', tesdaNc2)}

      <TouchableOpacity
        style={styles.manageButton}
        onPress={onManageDocuments}
        activeOpacity={0.7}
      >
        <Text style={styles.manageButtonText}>Upload/Manage Documents</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
  },
  viewAllText: {
    fontSize: 14,
    color: '#FF9500',
    fontWeight: '600',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  docIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: 14,
    color: '#1A1C1E',
    fontWeight: '600',
  },
  docStatus: {
    fontSize: 11,
    fontWeight: '700',
  },
  manageButton: {
    marginTop: 12,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: '#F1F3F5',
    borderRadius: 12,
  },
  manageButtonText: {
    color: '#495057',
    fontSize: 13,
    fontWeight: '700',
  },
});
