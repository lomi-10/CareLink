// components/helper/profile/DocumentsCard.tsx
// Documents card showing upload status and view options

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { ThemeColor } from '@/constants/theme';
import { theme } from '@/constants/theme';
import { useHelperTheme } from '@/contexts/HelperThemeContext';

function createDocumentsCardStyles(c: ThemeColor) {
  return StyleSheet.create({
    container: {
      backgroundColor: c.surfaceElevated,
      borderRadius: theme.radius.xl,
      marginBottom: theme.space.lg,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: c.line,
      ...theme.shadow.card,
    },
    accent: {
      height: 3,
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
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontSize: theme.font.subtitle,
      fontWeight: '800',
      color: c.ink,
      letterSpacing: -0.3,
    },
    manageLink: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 2,
    },
    viewAllText: {
      fontSize: theme.font.small,
      color: c.helper,
      fontWeight: '700',
    },
    docRow: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: c.surface,
      padding: theme.space.md,
      borderRadius: theme.radius.lg,
      marginBottom: 8,
      gap: theme.space.md,
      borderWidth: 1,
      borderColor: c.line,
    },
    docIcon: {
      width: 40,
      height: 40,
      borderRadius: theme.radius.md,
      backgroundColor: c.surfaceElevated,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: c.line,
    },
    docInfo: {
      flex: 1,
    },
    docTitle: {
      fontSize: theme.font.body,
      color: c.ink,
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
      backgroundColor: c.helper,
      borderRadius: theme.radius.md,
    },
    manageButtonText: {
      color: '#fff',
      fontSize: theme.font.small,
      fontWeight: '800',
    },
  });
}

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
  const { color: c } = useHelperTheme();
  const styles = useMemo(() => createDocumentsCardStyles(c), [c]);

  const accent = c.parent;

  const renderDocumentRow = (title: string, doc: Document) => (
    <View style={styles.docRow}>
      <View
        style={[
          styles.docIcon,
          doc.status === 'uploaded' && { backgroundColor: c.successSoft },
        ]}
      >
        <Ionicons
          name={doc.status === 'uploaded' ? 'checkmark-circle' : 'document-outline'}
          size={22}
          color={doc.status === 'uploaded' ? c.success : c.subtle}
        />
      </View>
      <View style={styles.docInfo}>
        <Text style={styles.docTitle}>{title}</Text>
        <Text
          style={[
            styles.docStatus,
            { color: doc.status === 'uploaded' ? c.success : c.warning },
          ]}
        >
          {doc.status === 'uploaded' ? 'Uploaded · tap eye to view' : 'Pending upload'}
        </Text>
      </View>
      {doc.status === 'uploaded' && (
        <TouchableOpacity onPress={() => onViewFile(doc)} style={styles.eyeWrap} hitSlop={12}>
          <Ionicons name="eye-outline" size={22} color={accent} />
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={[styles.accent, { backgroundColor: accent }]} />
      <View style={styles.inner}>
        <View style={styles.headerRow}>
          <View style={styles.header}>
            <View style={[styles.titleIcon, { backgroundColor: c.parentSoft }]}>
              <Ionicons name="shield-checkmark" size={20} color={accent} />
            </View>
            <Text style={styles.title}>Documents</Text>
          </View>
          <TouchableOpacity
            onPress={onManageDocuments}
            activeOpacity={0.7}
            style={styles.manageLink}
          >
            <Text style={styles.viewAllText}>Manage</Text>
            <Ionicons name="chevron-forward" size={16} color={c.helper} />
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
