// components/parent/jobs/DescriptionInput.tsx
// Component for job description input

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { BROWN, CARAMEL, ICON_BG, DARK, MUTED, DIVIDER } from '../home/parentWarmTheme';

const MAX_DESCRIPTION_LENGTH = 1000;

interface DescriptionInputProps {
  value: string;
  onChange: (value: string) => void;
  onGenerateDescription: () => void;
  error?: string;
  disabled?: boolean;
  /** Presses left on the capped Generate allowance. */
  generationsLeft?: number;
}

export function DescriptionInput({
  value, onChange, onGenerateDescription, error, disabled, generationsLeft,
}: DescriptionInputProps) {
  const [fullView, setFullView] = React.useState(false);
  const capped = typeof generationsLeft === 'number';
  const outOfGenerations = capped && generationsLeft <= 0;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Ionicons name="document-text-outline" size={22} color="#FF9500" />
        <Text style={styles.title}>Job Description <Text style={{ color: '#EF4444' }}>*</Text></Text>
      </View>

      <Text style={styles.hint}>
        Describe the job responsibilities, requirements, and expectations
      </Text>

      <View style={styles.actionRow}>
        <TouchableOpacity
          style={[styles.generateButton, (disabled || outOfGenerations) && { opacity: 0.5 }]}
          onPress={onGenerateDescription}
          disabled={disabled || outOfGenerations}
          activeOpacity={0.7}
        >
          <Ionicons name="sparkles-outline" size={18} color={BROWN} />
          <Text style={styles.generateButtonText}>
            {outOfGenerations ? 'No generations left' : 'Generate Description'}
          </Text>
        </TouchableOpacity>

        {/* Reading a long draft through a small scrolling box is painful, so the
            same full-screen reader the helper side uses for cover letters. */}
        {!!value.trim() && (
          <TouchableOpacity style={styles.viewButton} onPress={() => setFullView(true)} activeOpacity={0.7}>
            <Ionicons name="expand-outline" size={17} color={BROWN} />
            <Text style={styles.viewButtonText}>Full view</Text>
          </TouchableOpacity>
        )}
      </View>

      {capped && (
        <Text style={styles.genCount}>
          {outOfGenerations
            ? 'You have used all 3 drafts for this post. You can still edit the text yourself.'
            : `${generationsLeft} of 3 drafts left. Each one is written differently.`}
        </Text>
      )}

      <Modal visible={fullView} animationType="slide" transparent onRequestClose={() => setFullView(false)}>
        <View style={styles.fvOverlay}>
          <View style={styles.fvCard}>
            <View style={styles.fvHeader}>
              <Text style={styles.fvTitle}>Job Description</Text>
              <TouchableOpacity onPress={() => setFullView(false)} hitSlop={10}>
                <Ionicons name="close" size={24} color={MUTED} />
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.fvBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.fvText}>{value}</Text>
            </ScrollView>
            <TouchableOpacity style={styles.fvDone} onPress={() => setFullView(false)} activeOpacity={0.85}>
              <Text style={styles.fvDoneText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <TextInput
        style={styles.input}
        placeholder="Example:&#10;&#10;We are looking for a reliable and caring yaya to take care of our 2-year-old son. Responsibilities include:&#10;&#10;• Feeding and bathing the child&#10;• Playing and educational activities&#10;• Ensuring child safety at all times&#10;• Light housekeeping related to the child&#10;&#10;Requirements:&#10;• At least 1 year experience with toddlers&#10;• Patient and loving personality&#10;• Non-smoker"
        value={value}
        onChangeText={onChange}
        multiline
        numberOfLines={10}
        maxLength={MAX_DESCRIPTION_LENGTH}
        textAlignVertical="top"
        placeholderTextColor="#999"
        editable={!disabled}
      />

      <Text style={styles.charCount}>{value.length}/{MAX_DESCRIPTION_LENGTH}</Text>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <View style={styles.tips}>
        <Text style={styles.tipsTitle}>💡 Tips for a great description:</Text>
        <Text style={styles.tipItem}>• Be specific about daily tasks</Text>
        <Text style={styles.tipItem}>• Mention your household (family size, kids' ages)</Text>
        <Text style={styles.tipItem}>• Include working hours and days off</Text>
        <Text style={styles.tipItem}>• List any special requirements or skills needed</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: DARK,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: ICON_BG,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: CARAMEL,
    marginBottom: 12,
    alignSelf: 'flex-start',
  },
  generateButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: BROWN,
  },
  actionRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  viewButton: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 10,
    borderRadius: 10, borderWidth: 1, borderColor: DIVIDER, backgroundColor: '#fff',
  },
  viewButtonText: { fontSize: 14, fontWeight: '600', color: BROWN },
  genCount: { fontSize: 12, color: MUTED, marginTop: 8, lineHeight: 17 },

  fvOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
  fvCard: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    height: '85%', overflow: 'hidden',
  },
  fvHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
  },
  fvTitle: { fontSize: 17, fontWeight: '800', color: DARK },
  fvBody: { paddingHorizontal: 20, paddingTop: 16 },
  fvText: { fontSize: 15, color: DARK, lineHeight: 23 },
  fvDone: {
    margin: 20, backgroundColor: BROWN, paddingVertical: 15,
    borderRadius: 14, alignItems: 'center',
  },
  fvDoneText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: DIVIDER,
    borderRadius: 12,
    padding: 14,
    fontSize: 15,
    color: '#1A1C1E',
    minHeight: 200,
  },
  charCount: {
    fontSize: 12,
    color: MUTED,
    textAlign: 'right',
    marginTop: 6,
  },
  errorText: {
    fontSize: 13,
    color: '#FF3B30',
    marginTop: 8,
  },
  tips: {
    marginTop: 16,
    padding: 14,
    backgroundColor: ICON_BG,
    borderRadius: 10,
    borderLeftWidth: 4,
    borderLeftColor: CARAMEL,
  },
  tipsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: DARK,
    marginBottom: 8,
  },
  tipItem: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    paddingLeft: 8,
  },
});
