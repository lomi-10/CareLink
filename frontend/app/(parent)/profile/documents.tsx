// app/(parent)/profile/documents.tsx
// Documents & Verification screen — list, status, upload.
// PHP: parent/get_profile.php (via useParentProfile), upload via ParentDocumentModal

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator, ScrollView, Text, TouchableOpacity, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useParentProfile } from '@/hooks/parent';
import { ParentTabBar } from '@/components/parent/home';
import { DocumentViewer } from '@/components/parent/profile';
import ParentDocumentModal from '@/components/parent/profile/ParentDocumentModal';
import { BG, BROWN, CARAMEL, DARK, MUTED, GREEN, SUCCESS_BG, ICON_BG } from '@/components/parent/home/parentWarmTheme';
import { s } from './documents.styles';

// ─── Document icon config ─────────────────────────────────────────────────────

const DOC_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string }> = {
  'Barangay Clearance': { icon: 'document-text-outline', color: GREEN,    bg: SUCCESS_BG },
  'Valid ID':           { icon: 'card-outline',          color: '#2563EB', bg: '#DBEAFE' },
  'default':            { icon: 'document-outline',      color: MUTED,    bg: ICON_BG },
};
const getDocIcon = (type: string) => DOC_ICONS[type] ?? DOC_ICONS['default'];

// ─── Component ────────────────────────────────────────────────────────────────

export default function DocumentsScreen() {
  const router = useRouter();
  const { profileData, loading, refresh } = useParentProfile();

  const [uploadOpen,  setUploadOpen]  = useState(false);
  const [viewingFile, setViewingFile] = useState<{ url: string; type: 'image' | 'pdf' } | null>(null);

  if (loading || !profileData) {
    return (
      <View style={{ flex: 1, backgroundColor: BG, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={BROWN} />
      </View>
    );
  }

  const documents = profileData.documents ?? [];

  const handleViewDoc = (doc: any) => {
    if (!doc.file_url) return;
    const isPdf = (doc.file_path || doc.file_url).toLowerCase().endsWith('.pdf');
    setViewingFile({ url: doc.file_url, type: isPdf ? 'pdf' : 'image' });
  };

  const handleOpenDetail = (doc: any) => {
    router.push({
      pathname: '/(parent)/profile/document-detail',
      params: {
        document_id:   doc.document_id  ?? '',
        document_type: doc.document_type ?? '',
        file_url:      doc.file_url      ?? '',
        file_path:     doc.file_path     ?? '',
        status:        doc.status        ?? 'Pending',
        uploaded_at:   doc.uploaded_at   ?? '',
        // Extended fields from backend (if available)
        expiry_date:      doc.expiry_date      ?? '',
        verified_by:      doc.verified_by      ?? '',
        verified_at:      doc.verified_at      ?? '',
        rejection_reason: doc.rejection_reason ?? '',
      },
    } as never);
  };

  return (
    <View style={s.page}>
      <SafeAreaView style={{ flex: 1 }}>

        {/* Header */}
        <View style={s.bar}>
          <TouchableOpacity style={s.barBtn} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={22} color={DARK} />
          </TouchableOpacity>
          <Text style={s.barTitle}>Documents & Verification</Text>
          <View style={[s.barShield, { backgroundColor: SUCCESS_BG }]}>
            <Ionicons name="shield-checkmark" size={18} color={GREEN} />
          </View>
        </View>

        <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

          {/* Safety Banner */}
          <View style={s.banner}>
            <View style={[s.bannerIcon, { backgroundColor: ICON_BG }]}>
              <Ionicons name="shield-checkmark" size={24} color={CARAMEL} />
            </View>
            <View style={s.bannerText}>
              <Text style={s.bannerTitle}>Your safety, our priority</Text>
              <Text style={s.bannerSub}>All documents are encrypted and securely stored. We never share your documents without your consent.</Text>
            </View>
          </View>

          {documents.length === 0 ? (
            <View style={s.emptyWrap}>
              <Ionicons name="folder-open-outline" size={52} color={MUTED} />
              <Text style={s.emptyTitle}>No documents yet</Text>
              <Text style={s.emptySub}>Upload your clearance and valid ID to verify your household profile.</Text>
            </View>
          ) : (
            <View style={s.docList}>
              {documents.map((doc: any, i: number) => {
                const cfg        = getDocIcon(doc.document_type);
                const isVerified = doc.status === 'Verified';
                const isRejected = doc.status === 'Rejected';
                const uploadDate = doc.uploaded_at
                  ? new Date(doc.uploaded_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                  : null;

                return (
                  <React.Fragment key={doc.document_id ?? i}>
                    {/* Tap entire row → document detail */}
                    <TouchableOpacity
                      style={s.docRow}
                      onPress={() => handleOpenDetail(doc)}
                      activeOpacity={0.78}
                    >
                      <View style={[s.docIcon, { backgroundColor: cfg.bg }]}>
                        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                      </View>
                      <View style={s.docInfo}>
                        <Text style={s.docName}>{doc.document_type}</Text>
                        {uploadDate && (
                          <Text style={s.docDate}>Uploaded on {uploadDate}</Text>
                        )}
                      </View>
                      <View style={s.docRight}>
                        <View style={[
                          s.verifiedBadge,
                          !isVerified && !isRejected && s.pendingBadge,
                          isRejected && s.rejectedBadge,
                        ]}>
                          <Text style={[
                            s.verifiedText,
                            !isVerified && !isRejected && s.pendingText,
                            isRejected && s.rejectedText,
                          ]}>
                            {isVerified ? 'Verified ✓' : doc.status ?? 'Pending'}
                          </Text>
                        </View>
                        {isRejected && (
                          <TouchableOpacity
                            style={s.reuploadBtn}
                            onPress={(e) => { e.stopPropagation(); setUploadOpen(true); }}
                            hitSlop={6}
                          >
                            <Ionicons name="refresh-outline" size={13} color={BROWN} />
                            <Text style={s.reuploadText}>Re-upload</Text>
                          </TouchableOpacity>
                        )}
                        <View style={s.docActions}>
                          {/* Eye → full-screen viewer */}
                          <TouchableOpacity
                            onPress={(e) => { e.stopPropagation(); handleViewDoc(doc); }}
                            hitSlop={8}
                          >
                            <Ionicons name="eye-outline" size={20} color={MUTED} />
                          </TouchableOpacity>
                          <Ionicons name="chevron-forward" size={16} color={MUTED} />
                        </View>
                      </View>
                    </TouchableOpacity>
                    {i < documents.length - 1 && <View style={s.docDivider} />}
                  </React.Fragment>
                );
              })}
            </View>
          )}

          {/* Upload section */}
          <View style={s.uploadCard}>
            <Ionicons name="cloud-upload-outline" size={40} color={CARAMEL} />
            <Text style={s.uploadTitle}>Upload new document</Text>
            <Text style={s.uploadSub}>PDF, JPG, or PNG (Max. 5MB)</Text>
            <TouchableOpacity style={s.uploadBtn} onPress={() => setUploadOpen(true)} activeOpacity={0.88}>
              <Text style={s.uploadBtnText}>Upload Document</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        <ParentTabBar />
      </SafeAreaView>

      <ParentDocumentModal
        visible={uploadOpen}
        onClose={() => setUploadOpen(false)}
        onSaveSuccess={() => { setUploadOpen(false); refresh(); }}
      />

      <DocumentViewer
        visible={!!viewingFile}
        fileUrl={viewingFile?.url ?? null}
        fileType={viewingFile?.type ?? 'image'}
        onClose={() => setViewingFile(null)}
      />
    </View>
  );
}
