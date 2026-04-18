import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { theme } from '@/constants/theme';
import { hireContractTermsStyles as s } from '@/components/parent/hire/HireContractTermsModal.styles';

type Props = {
  visible: boolean;
  jobTitle: string;
  contractStartDate: string;
  contractEndDate: string;
  contractNotes: string;
  onChangeStart: (v: string) => void;
  onChangeEnd: (v: string) => void;
  onChangeNotes: (v: string) => void;
  onCancel: () => void;
  onContinue: () => void;
};

export function HireContractTermsModal({
  visible,
  jobTitle,
  contractStartDate,
  contractEndDate,
  contractNotes,
  onChangeStart,
  onChangeEnd,
  onChangeNotes,
  onCancel,
  onContinue,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.bodyPad}>
            <Text style={s.title}>Contract terms</Text>
            <Text style={s.sub}>
              Set dates and any adjustments before the PDF is generated for &quot;{jobTitle}&quot;.
            </Text>
          </View>
          <ScrollView style={s.list} keyboardShouldPersistTaps="handled">
            <Text style={s.label}>Employment start (optional)</Text>
            <Text style={s.hint}>Leave blank to use the job post start date. Format YYYY-MM-DD.</Text>
            <TextInput
              style={s.input}
              value={contractStartDate}
              onChangeText={onChangeStart}
              placeholder="e.g. 2026-05-01"
              placeholderTextColor={theme.color.subtle}
              autoCapitalize="none"
            />
            <Text style={s.label}>Contract end (required)</Text>
            <Text style={s.hint}>Last day of this contract term. Format YYYY-MM-DD.</Text>
            <TextInput
              style={s.input}
              value={contractEndDate}
              onChangeText={onChangeEnd}
              placeholder="e.g. 2027-04-30"
              placeholderTextColor={theme.color.subtle}
              autoCapitalize="none"
            />
            <Text style={s.label}>Other adjustments / notes (optional)</Text>
            <Text style={s.hint}>Shown on the contract under additional agreements.</Text>
            <TextInput
              style={s.notes}
              value={contractNotes}
              onChangeText={onChangeNotes}
              placeholder="e.g. Probation review after 3 months…"
              placeholderTextColor={theme.color.subtle}
              multiline
              maxLength={2000}
              textAlignVertical="top"
            />
          </ScrollView>
          <View style={s.btns}>
            <TouchableOpacity style={s.cancel} onPress={onCancel}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.confirm} onPress={onContinue}>
              <Text style={s.confirmTxt}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
