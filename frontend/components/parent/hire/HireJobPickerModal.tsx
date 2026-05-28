import React, { useMemo } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { theme } from '@/constants/theme';
import type { HireJobOptionRow } from '@/components/parent/hire/hireJobOption';
import { createHireJobPickerStyles } from '@/components/parent/hire/HireJobPickerModal.styles';

type Props = {
  visible: boolean;
  helperName: string;
  accentColor: string;
  applications: HireJobOptionRow[];
  selectedId: number | null;
  onSelect: (applicationId: number) => void;
  onCancel: () => void;
  onContinue: () => void;
};

export function HireJobPickerModal({
  visible,
  helperName,
  accentColor,
  applications,
  selectedId,
  onSelect,
  onCancel,
  onContinue,
}: Props) {
  const s = useMemo(() => createHireJobPickerStyles(accentColor), [accentColor]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={s.overlay}>
        <View style={s.card}>
          <View style={s.bodyPad}>
            <Text style={s.title}>Select position</Text>
            <Text style={s.sub}>
              {helperName} has applied to multiple of your job posts. Select the position you are hiring them for:
            </Text>
          </View>
          <ScrollView style={[s.list, { paddingHorizontal: 18 }]} keyboardShouldPersistTaps="handled">
            {applications.map(row => {
              const selected = selectedId === row.application_id;
              const applied = row.applied_at
                ? new Date(row.applied_at).toLocaleDateString([], {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })
                : '';
              return (
                <TouchableOpacity
                  key={row.application_id}
                  style={[s.row, selected && s.rowSelected]}
                  onPress={() => onSelect(row.application_id)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={selected ? 'radio-button-on' : 'radio-button-off'}
                    size={20}
                    color={selected ? accentColor : theme.color.muted}
                  />
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={s.jobTitle} numberOfLines={2}>{row.job_title}</Text>
                    <Text style={s.meta}>Applied {applied} · {row.status}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          <View style={[s.btns, { paddingHorizontal: 18, paddingBottom: 18 }]}>
            <TouchableOpacity style={s.cancel} onPress={onCancel}>
              <Text style={s.cancelTxt}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.confirm, selectedId == null && s.confirmDisabled]}
              disabled={selectedId == null}
              onPress={onContinue}
            >
              <Text style={s.confirmTxt}>Continue</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
