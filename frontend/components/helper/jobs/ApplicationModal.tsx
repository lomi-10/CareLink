// components/helper/jobs/ApplicationModal.tsx

import API_URL from '@/constants/api';
import { FontFamily } from '@/constants/GlobalStyles';
import { isShareableWithEmployer } from '@/constants/documents';
import type { JobPost } from '@/hooks/helper';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ── Palette ───────────────────────────────────────────────────────────────────
const DARK    = '#2A1608';
const MUTED   = '#7A5C3E';
const ORANGE  = '#E86019';
const GREEN   = '#059669';
const DIVIDER = '#EDE0D0';
const ICON_BG = '#F5E6CC';

// ── Props ─────────────────────────────────────────────────────────────────────
interface ApplicationModalProps {
  visible: boolean;
  job: JobPost | null;
  onSubmit: () => void;
  onClose: () => void;
}

// ── Document sharing types ────────────────────────────────────────────────────
interface VerifiedDocument {
  document_id: number;
  document_type: string;
  status: string;
}

const DOC_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  'Barangay Clearance': 'home-outline',
  'Valid ID':           'card-outline',
  'Police Clearance':   'shield-checkmark-outline',
  'TESDA NC2':          'school-outline',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtPeriod(p: string) {
  const l = (p ?? '').toLowerCase();
  if (l.startsWith('month')) return 'mo';
  if (l.startsWith('day'))   return 'day';
  if (l.startsWith('week'))  return 'wk';
  return p;
}

function generateCoverLetter(job: JobPost): string {
  return `Dear ${job.parent_name || 'Employer'},

I am writing to express my strong interest in the ${job.title} position you have posted. I believe my skills and experience make me a great fit for this role.

I have experience in ${job.categories?.join(', ') || 'household work'} and I am confident I can perform the duties required. I am hardworking, reliable, and eager to contribute to your household.

I would welcome the opportunity to discuss how I can be of service to you and your family. Thank you for considering my application!

Sincerely,
[Your Name]`;
}

// ── Component ─────────────────────────────────────────────────────────────────
export function ApplicationModal({ visible, job, onSubmit, onClose }: ApplicationModalProps) {
  const [coverLetter,   setCoverLetter]   = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);
  const [expanded,      setExpanded]      = useState(false); // full-screen cover-letter editor
  const [confirming,    setConfirming]    = useState(false); // read-first review before submit

  // Documents the helper may choose to share with this specific employer
  const [verifiedDocs,   setVerifiedDocs]   = useState<VerifiedDocument[]>([]);
  const [selectedDocIds, setSelectedDocIds] = useState<number[]>([]);

  useEffect(() => {
    if (!visible) return;

    let cancelled = false;
    (async () => {
      try {
        const userData = await AsyncStorage.getItem('user_data');
        if (!userData) return;
        const user = JSON.parse(userData);

        const response = await fetch(`${API_URL}/helper/get_documents.php?user_id=${user.user_id}&requester_id=${user.user_id}`);
        const data = await response.json();
        if (!cancelled && data.success) {
          // Only Verified AND employer-shareable docs (Valid ID / Barangay
          // Clearance stay PESO-only — they reveal the helper's home address).
          const verified: VerifiedDocument[] = (data.data?.documents ?? [])
            .filter((d: any) => d.status === 'Verified' && isShareableWithEmployer(d.document_type))
            .map((d: any) => ({ document_id: d.document_id, document_type: d.document_type, status: d.status }));
          setVerifiedDocs(verified);
        }
      } catch {
        // Sharing is optional — silently skip if documents can't be loaded
      }
    })();

    return () => { cancelled = true; };
  }, [visible]);

  const toggleDocShare = (documentId: number) => {
    setSelectedDocIds(prev =>
      prev.includes(documentId) ? prev.filter(id => id !== documentId) : [...prev, documentId]
    );
  };

  // Validate, then ask the helper to review their letter first (read-first warning).
  const handleSubmitPress = () => {
    if (!job) return;
    if (coverLetter.trim().length < 50) {
      setError('Please write a cover letter (min 50 characters).');
      return;
    }
    setError(null);
    setConfirming(true); // show the review dialog
  };

  const doSubmit = async () => {
    if (!job) return;

    if (coverLetter.trim().length < 50) {
      setError('Please write a cover letter (min 50 characters).');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) throw new Error('Not logged in');

      const user = JSON.parse(userData);
      const letterToSend = coverLetter.trim();

      const response = await fetch(`${API_URL}/helper/apply_job.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_post_id:         job.job_post_id,
          helper_id:           user.user_id,
          cover_letter:        letterToSend,
          shared_document_ids: selectedDocIds,
          requester_id:        user.user_id,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setCoverLetter('');
        setSelectedDocIds([]);
        setConfirming(false);
        setExpanded(false);
        onSubmit();
        onClose();
      } else {
        throw new Error(data.message || 'Failed to submit application');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setSubmitting(false);
    }
  };

  if (!job) return null;

  const salary    = Number(job.salary_offered);
  const charCount = coverLetter.length;
  const canSubmit = charCount >= 50 && !submitting;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={s.overlay}>
        <View style={s.card}>

          {/* ── Header ── */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Apply for Job</Text>
            <TouchableOpacity onPress={onClose} style={s.closeBtn} hitSlop={8}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>

            {/* ── Job summary card ── */}
            <View style={s.jobCard}>
              <View style={s.jobIconWrap}>
                <Ionicons name="briefcase" size={22} color={DARK} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.jobTitle} numberOfLines={2}>{job.title}</Text>
                {job.employment_type ? (
                  <Text style={s.jobSub}>{job.employment_type}{job.work_schedule ? ` · ${job.work_schedule}` : ''}</Text>
                ) : null}
                <Text style={s.jobEmployer}>{job.parent_name || 'Employer'}</Text>
                {salary > 0 && (
                  <Text style={s.jobSalary}>₱{salary.toLocaleString()}/{fmtPeriod(job.salary_period)}</Text>
                )}
              </View>
            </View>

            {/* ── Cover Letter ── */}
            <View style={s.section}>
              <View style={s.sectionTitleRow}>
                <Text style={s.sectionTitle}>Cover Letter</Text>
                <Text style={s.required}>*</Text>
              </View>
              <Text style={s.sectionSub}>Write your own or generate one, then review it before submitting</Text>

              {/* Generate button */}
              <TouchableOpacity
                style={s.generateBtn}
                onPress={() => { setCoverLetter(generateCoverLetter(job)); setError(null); }}
                activeOpacity={0.8}
              >
                <Ionicons name="sparkles-outline" size={16} color={ORANGE} />
                <Text style={s.generateBtnText}>Generate Cover Letter</Text>
              </TouchableOpacity>

              {/* Textarea */}
              <View style={[s.textareaWrap, error ? s.textareaError : null]}>
                <TextInput
                  style={s.textarea}
                  multiline
                  placeholder="Tell the employer about your experience and why you're interested in this role..."
                  placeholderTextColor="#B0A090"
                  value={coverLetter}
                  onChangeText={text => { setCoverLetter(text); setError(null); }}
                  maxLength={1000}
                  textAlignVertical="top"
                />
                <View style={s.charCountRow}>
                  <TouchableOpacity style={s.expandBtn} onPress={() => setExpanded(true)} activeOpacity={0.8} hitSlop={6}>
                    <Ionicons name="expand-outline" size={14} color={ORANGE} />
                    <Text style={s.expandBtnText}>Expand & read</Text>
                  </TouchableOpacity>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    {charCount < 50 && charCount > 0 && (
                      <Text style={s.charMin}>min 50 chars</Text>
                    )}
                    <Text style={[s.charCount, charCount < 50 && charCount > 0 && s.charCountWarn]}>
                      {charCount}/1000
                    </Text>
                  </View>
                </View>
              </View>

              {error && (
                <View style={s.errorRow}>
                  <Ionicons name="alert-circle" size={14} color="#EF4444" />
                  <Text style={s.errorText}>{error}</Text>
                </View>
              )}
            </View>

            {/* ── Share Documents (optional) ── */}
            {verifiedDocs.length > 0 && (
              <View style={s.section}>
                <View style={s.sectionTitleRow}>
                  <Text style={s.sectionTitle}>Share Documents</Text>
                  <Text style={s.optional}>(optional)</Text>
                </View>
                <Text style={s.sectionSub}>
                  Choose which verified documents this employer can view. Nothing is shared unless you select it. For your safety, your Valid ID and Barangay Clearance are never shown to families — only PESO sees those.
                </Text>

                <View style={s.docList}>
                  {verifiedDocs.map(doc => {
                    const checked = selectedDocIds.includes(doc.document_id);
                    return (
                      <TouchableOpacity
                        key={doc.document_id}
                        style={[s.docRow, checked && s.docRowActive]}
                        onPress={() => toggleDocShare(doc.document_id)}
                        activeOpacity={0.8}
                      >
                        <View style={[s.docIconWrap, checked && { backgroundColor: ORANGE + '22' }]}>
                          <Ionicons name={DOC_ICONS[doc.document_type] ?? 'document-text-outline'} size={18} color={checked ? ORANGE : MUTED} />
                        </View>
                        <Text style={[s.docLabel, checked && { color: DARK }]}>{doc.document_type}</Text>
                        <Ionicons
                          name={checked ? 'checkbox' : 'square-outline'}
                          size={20}
                          color={checked ? ORANGE : MUTED}
                        />
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* ── Employer Will Receive ── */}
            <View style={s.receiveCard}>
              <Text style={s.receiveTitle}>Employer Will Receive</Text>
              <View style={s.receiveList}>
                {[
                  { icon: 'person-circle-outline' as const, label: 'Your Profile' },
                  { icon: 'chatbubble-outline' as const,    label: 'Cover Letter' },
                  ...selectedDocIds.map(id => {
                    const doc = verifiedDocs.find(d => d.document_id === id);
                    return { icon: 'document-text-outline' as const, label: doc ? doc.document_type : 'Document' };
                  }),
                ].map((item, i) => (
                  <View key={i} style={s.receiveItem}>
                    <Ionicons name={item.icon} size={14} color={GREEN} />
                    <Text style={s.receiveLabel}>{item.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={{ height: 20 }} />
          </ScrollView>

          {/* ── Submit button ── */}
          <SafeAreaView style={s.footer}>
            <TouchableOpacity
              style={[s.submitBtn, !canSubmit && s.submitBtnDisabled]}
              onPress={handleSubmitPress}
              disabled={!canSubmit}
              activeOpacity={0.85}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="paper-plane" size={18} color="#fff" />
                  <Text style={s.submitBtnText}>Submit Application</Text>
                </>
              )}
            </TouchableOpacity>
          </SafeAreaView>
        </View>
      </View>

      {/* ── Full-screen cover-letter editor (zoom) ── */}
      <Modal visible={expanded} animationType="slide" onRequestClose={() => setExpanded(false)}>
        <SafeAreaView style={s.editorPage}>
          <View style={s.editorHeader}>
            <Text style={s.editorTitle}>Cover Letter</Text>
            <TouchableOpacity onPress={() => setExpanded(false)} style={s.editorDone} activeOpacity={0.85}>
              <Text style={s.editorDoneText}>Done</Text>
            </TouchableOpacity>
          </View>
          <TextInput
            style={s.editorInput}
            multiline
            placeholder="Write your cover letter here…"
            placeholderTextColor="#B0A090"
            value={coverLetter}
            onChangeText={text => { setCoverLetter(text); setError(null); }}
            maxLength={1000}
            textAlignVertical="top"
            autoFocus
          />
          <View style={s.editorFooter}>
            <TouchableOpacity
              style={s.editorGenerate}
              onPress={() => job && setCoverLetter(generateCoverLetter(job))}
              activeOpacity={0.8}
            >
              <Ionicons name="sparkles-outline" size={15} color={ORANGE} />
              <Text style={s.editorGenerateText}>Regenerate</Text>
            </TouchableOpacity>
            <Text style={s.charCount}>{coverLetter.length}/1000</Text>
          </View>
        </SafeAreaView>
      </Modal>

      {/* ── Read-first review before submitting ── */}
      <Modal visible={confirming} animationType="fade" transparent onRequestClose={() => setConfirming(false)}>
        <View style={s.confirmOverlay}>
          <View style={s.confirmCard}>
            <View style={s.confirmIcon}>
              <Ionicons name="reader-outline" size={26} color={ORANGE} />
            </View>
            <Text style={s.confirmTitle}>Please read your letter first</Text>
            <Text style={s.confirmSub}>
              Review your cover letter below. Once submitted, the employer will see it exactly as written.
            </Text>
            <ScrollView style={s.confirmPreview} showsVerticalScrollIndicator>
              <Text style={s.confirmPreviewText}>{coverLetter.trim()}</Text>
            </ScrollView>
            <View style={s.confirmBtns}>
              <TouchableOpacity
                style={s.confirmEdit}
                onPress={() => { setConfirming(false); setExpanded(true); }}
                activeOpacity={0.85}
              >
                <Text style={s.confirmEditText}>Keep editing</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.confirmSubmit, submitting && { opacity: 0.6 }]}
                onPress={doSubmit}
                disabled={submitting}
                activeOpacity={0.85}
              >
                {submitting
                  ? <ActivityIndicator size="small" color="#fff" />
                  : <Text style={s.confirmSubmitText}>I’ve read it — Submit</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  card:    {
    backgroundColor: '#FBF5EC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    height: '96%',
    overflow: 'hidden',
    ...Platform.select({
      ios:     { shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.15, shadowRadius: 16 },
      android: { elevation: 24 },
    }),
  },

  // header
  header:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 18, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: DIVIDER },
  headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  closeBtn:    { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F5E6CC', alignItems: 'center', justifyContent: 'center' },

  scroll: { flex: 1 },

  // job summary card
  jobCard:     { flexDirection: 'row', alignItems: 'flex-start', gap: 14, backgroundColor: '#fff', borderRadius: 16, padding: 16, margin: 16, marginBottom: 0, borderWidth: 1, borderColor: DIVIDER },
  jobIconWrap: { width: 44, height: 44, borderRadius: 12, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  jobTitle:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: DARK, marginBottom: 4 },
  jobSub:      { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 2 },
  jobEmployer: { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 2 },
  jobSalary:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE },

  // sections
  section:         { paddingHorizontal: 16, paddingTop: 20 },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 2, marginBottom: 4 },
  sectionTitle:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  sectionSub:      { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 12 },
  required:        { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#EF4444' },
  optional:        { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },

  // generate button
  generateBtn:     { flexDirection: 'row', alignItems: 'center', gap: 7, alignSelf: 'flex-start', backgroundColor: '#FFF3EC', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 12, borderWidth: 1, borderColor: ORANGE + '55', marginBottom: 10 },
  generateBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE },

  // upload
  uploadBtn:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 14, borderRadius: 14, borderWidth: 1.5, borderColor: DIVIDER, borderStyle: 'dashed' },
  uploadBtnActive: { borderColor: DARK, borderStyle: 'solid', backgroundColor: ICON_BG },
  uploadLabel:     { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED },
  uploadHint:      { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 2 },

  // OR divider
  orRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 14 },
  orLine: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: DIVIDER },
  orText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12, color: MUTED },

  // textarea
  textareaWrap:  { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1.5, borderColor: DIVIDER, overflow: 'hidden' },
  textareaError: { borderColor: '#EF4444' },
  textarea:      { padding: 14, fontSize: 14, color: DARK, minHeight: 160, lineHeight: 21, fontFamily: FontFamily.fredokaRegular },
  charCountRow:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 6, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#FBF5EC', borderTopWidth: 1, borderTopColor: DIVIDER },
  charCount:     { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  charCountWarn: { color: ORANGE },
  charMin:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: ORANGE },
  expandBtn:     { flexDirection: 'row', alignItems: 'center', gap: 5 },
  expandBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 12.5, color: ORANGE },

  // full-screen editor
  editorPage:        { flex: 1, backgroundColor: '#FBF5EC' },
  editorHeader:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: DIVIDER },
  editorTitle:       { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: DARK },
  editorDone:        { backgroundColor: DARK, paddingHorizontal: 18, paddingVertical: 9, borderRadius: 11 },
  editorDoneText:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },
  editorInput:       { flex: 1, padding: 20, fontSize: 16, lineHeight: 24, color: DARK, fontFamily: FontFamily.fredokaRegular, textAlignVertical: 'top' },
  editorFooter:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingVertical: 12, borderTopWidth: 1, borderTopColor: DIVIDER, backgroundColor: '#fff' },
  editorGenerate:    { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FFF3EC', paddingHorizontal: 14, paddingVertical: 9, borderRadius: 11, borderWidth: 1, borderColor: ORANGE + '55' },
  editorGenerateText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: ORANGE },

  // read-first review
  confirmOverlay:    { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', justifyContent: 'center', padding: 22 },
  confirmCard:       { width: '100%', maxWidth: 420, backgroundColor: '#fff', borderRadius: 20, padding: 20, alignItems: 'center' },
  confirmIcon:       { width: 56, height: 56, borderRadius: 28, backgroundColor: '#FFF3EC', alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  confirmTitle:      { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, textAlign: 'center' },
  confirmSub:        { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center', marginTop: 6, marginBottom: 14, lineHeight: 19 },
  confirmPreview:    { alignSelf: 'stretch', maxHeight: 220, backgroundColor: '#FBF5EC', borderRadius: 12, borderWidth: 1, borderColor: DIVIDER, padding: 14 },
  confirmPreviewText:{ fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK, lineHeight: 21 },
  confirmBtns:       { flexDirection: 'row', gap: 10, alignSelf: 'stretch', marginTop: 16 },
  confirmEdit:       { flex: 1, paddingVertical: 13, borderRadius: 13, borderWidth: 1.5, borderColor: DIVIDER, alignItems: 'center' },
  confirmEditText:   { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  confirmSubmit:     { flex: 1.4, paddingVertical: 13, borderRadius: 13, backgroundColor: DARK, alignItems: 'center', justifyContent: 'center' },
  confirmSubmitText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },

  // error
  errorRow:  { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 10 },
  errorText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: '#EF4444', flex: 1 },

  // share documents
  docList:      { gap: 8 },
  docRow:       { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', padding: 12, borderRadius: 14, borderWidth: 1.5, borderColor: DIVIDER },
  docRowActive: { borderColor: ORANGE, backgroundColor: '#FFF3EC' },
  docIconWrap:  { width: 36, height: 36, borderRadius: 10, backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  docLabel:     { flex: 1, fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: MUTED },

  // employer will receive
  receiveCard:  { marginHorizontal: 16, marginTop: 20, backgroundColor: '#fff', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: DIVIDER },
  receiveTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 13, color: DARK, marginBottom: 12 },
  receiveList:  { gap: 10 },
  receiveItem:  { flexDirection: 'row', alignItems: 'center', gap: 10 },
  receiveLabel: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },

  // footer / submit
  footer:           { padding: 16, borderTopWidth: 1, borderTopColor: DIVIDER, backgroundColor: '#fff' },
  submitBtn:        { backgroundColor: DARK, paddingVertical: 16, borderRadius: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  submitBtnDisabled:{ backgroundColor: '#C4A882', opacity: 0.7 },
  submitBtnText:    { fontFamily: FontFamily.fredokaSemiBold, color: '#fff', fontSize: 16 },
});
