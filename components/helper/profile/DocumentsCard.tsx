// components/helper/profile/DocumentsCard.tsx
// Documents card showing upload status and view options

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';

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
      <View
        style={[
          styles.docIcon,
          doc.status === 'uploaded' && { backgroundColor: theme.color.successSoft },
        ]}
      >
        <Ionicons
          name={doc.status === 'uploaded' ? 'checkmark-circle' : 'document-outline'}
          size={22}
          color={doc.status === 'uploaded' ? theme.color.success : theme.color.subtle}
        />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text
          style={[
            styles.docStatus,
            { color: doc.status === 'uploaded' ? theme.color.success : theme.color.warning },
          ]}
        >
          {doc.status === 'uploaded' ? 'Uploaded · tap eye to view' : 'Pending upload'}
        </Text>
      </View>
      {doc.status === 'uploaded' && (
        <TouchableOpacity onPress={() => onViewFile(doc)} style={styles.eyeWrap} hitSlop={12}>
          <Ionicons name="eye-outline" size={22} color={theme.color.parent} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.accent} />
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <View style={styles.titleIcon}>
              <Ionicons name="shield-checkmark" size={20} color="#7C3AED" />
            </View>
            <Text style={styles.title}>Documents</Text>
          </View>
          <TouchableOpacity
            onPress={onManageDocuments}
            activeOpacity={0.7}
            style={styles.manageLink}
          >
            <Text style={styles.viewAllText}>Manage</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.color.helper} />
          </TouchableOpacity>
        </View>

        {renderDocumentRow('Barangay Clearance', barangayClearance)}
        {renderDocumentRow('Valid ID', validId)}
        {renderDocumentRow('Police Clearance', policeClearance)}
        {renderDocumentRow('TESDA NC2', tesdaNc2)}

        <TouchableOpacity style={styles.manageButton} onPress={onManageDocuments} activeOpacity={0.85}>
          <Ionicons name="cloud-upload-outline" size={18} color="#fff" />
          <Text style={styles.manageButtonText}>Upload or update documents</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: theme.radius.xl,
    marginBottom: theme.space.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: theme.color.line,
    ...theme.shadow.card,
  },
  accent: {
    height: 3,
    backgroundColor: '#7C3AED',
    opacity: 0.85,
  },
  inner: {
    padding: theme.space.lg,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.space.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.space.sm,
  },
  titleIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: '#F5F3FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: theme.font.subtitle,
    fontWeight: '800',
    color: theme.color.ink,
    letterSpacing: -0.3,
  },
  manageLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  viewAllText: {
    fontSize: theme.font.small,
    color: theme.color.helper,
    fontWeight: '700',
  },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.color.surface,
    padding: theme.space.md,
    borderRadius: theme.radius.lg,
    marginBottom: 8,
    gap: theme.space.md,
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  docIcon: {
    width: 40,
    height: 40,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surfaceElevated,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: theme.color.line,
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: theme.font.body,
    color: theme.color.ink,
    fontWeight: '700',
  },
  docStatus: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  eyeWrap: {
    padding: 4,
  },
  manageButton: {
    marginTop: theme.space.sm,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: theme.color.helper,
    borderRadius: theme.radius.md,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: theme.font.small,
    fontWeight: '800',
  },
});
