// components/helper/profile/profileEditModal/BasicInfoSection.tsx

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { styles, LabeledInput } from '.';

function parseBirthYmd(s: string): Date {
  if (s && /^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  return new Date(2000, 0, 15);
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Same styling idea as `WorkScheduleCard` / job post web date field */
const webBirthInputStyle: Record<string, string | number> = {
  padding: '12px',
  border: '1px solid #E5E5EA',
  borderRadius: '10px',
  backgroundColor: '#F8F9FA',
  color: '#1A1C1E',
  fontSize: '15px',
  width: '100%',
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
};

export function BasicInfoSection({
  firstName, setFirstName,
  lastName, setLastName,
  middleName, setMiddleName,
  username, setUsername,
  contactNumber, setContactNumber,
  email, setEmail,
  birthDate, setBirthDate,
  gender, setGender,
  civilStatus, setCivilStatus,
  religion, setReligion
}: any) {
  const [showBirthPicker, setShowBirthPicker] = useState(false);

  const birthLabel = birthDate
    ? parseBirthYmd(birthDate).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : 'Select birth date';

  const webBirthValue =
    birthDate && /^\d{4}-\d{2}-\d{2}$/.test(birthDate) ? birthDate : '';
  const maxBirthWeb = toYmd(new Date());
  const minBirthWeb = '1940-01-01';

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={styles.sectionIconBg}>
          <Ionicons name="person" size={20} color="#007AFF" />
        </View>
        <Text style={styles.sectionTitleText}>Basic Information</Text>
      </View>

      <View style={styles.inputGrid}>
        <View style={styles.inputHalf}>
          <LabeledInput label="First Name" required value={firstName} onChangeText={setFirstName} placeholder="Juan" />
        </View>
        <View style={styles.inputHalf}>
          <LabeledInput label="Last Name" required value={lastName} onChangeText={setLastName} placeholder="Cruz" />
        </View>
      </View>

      <LabeledInput label="Middle Name" value={middleName} onChangeText={setMiddleName} placeholder="Dela" />

      <View style={styles.inputGrid}>
        <View style={styles.inputHalf}>
          <LabeledInput label="Username" value={username} onChangeText={setUsername} placeholder="juandelacruz" />
        </View>
        <View style={styles.inputHalf}>
          <LabeledInput label="Contact Number" required value={contactNumber} onChangeText={setContactNumber} keyboardType="phone-pad" placeholder="09XX XXX XXXX" />
        </View>
      </View>

      <LabeledInput label="Email Address" value={email} onChangeText={setEmail} keyboardType="email-address" editable={false} placeholder="email@example.com" />

      {Platform.OS === 'web' ? (
        <View style={styles.birthWebWrap}>
          <Text style={styles.label}>Birth Date <Text style={styles.requiredMark}>*</Text></Text>
          {React.createElement('input', {
            type: 'date',
            value: webBirthValue,
            min: minBirthWeb,
            max: maxBirthWeb,
            onChange: (e: { target: { value: string } }) => {
              setBirthDate(e.target.value || '');
            },
            style: webBirthInputStyle,
          })}
        </View>
      ) : (
        <>
          <Text style={styles.label}>Birth Date <Text style={styles.requiredMark}>*</Text></Text>
          <TouchableOpacity
            style={styles.birthDateBtn}
            onPress={() => setShowBirthPicker(true)}
            activeOpacity={0.85}
          >
            <Ionicons name="calendar-outline" size={20} color="#007AFF" />
            <Text style={[styles.birthDateBtnText, !birthDate && styles.birthDateBtnPlaceholder]}>
              {birthLabel}
            </Text>
            <Ionicons name="chevron-down" size={18} color="#868E96" />
          </TouchableOpacity>
          {showBirthPicker && (
            <DateTimePicker
              value={parseBirthYmd(birthDate)}
              mode="date"
              display="default"
              maximumDate={new Date()}
              minimumDate={new Date(1940, 0, 1)}
              onChange={(_, d) => {
                setShowBirthPicker(false);
                if (d) setBirthDate(toYmd(d));
              }}
            />
          )}
        </>
      )}

      <Text style={styles.label}>Gender <Text style={styles.requiredMark}>*</Text></Text>
      <View style={styles.row}>
        {['Male', 'Female'].map(opt => (
          <TouchableOpacity key={opt} onPress={() => setGender(opt as any)} style={[styles.option, gender === opt && styles.optionActive]}>
            <Text style={[styles.optionText, gender === opt && styles.optionTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={styles.label}>Civil Status</Text>
      <View style={styles.row}>
        {['Single', 'Married', 'Widowed', 'Separated'].map(opt => (
          <TouchableOpacity key={opt} onPress={() => setCivilStatus(opt)} style={[styles.option, civilStatus === opt && styles.optionActive]}>
            <Text style={[styles.optionText, civilStatus === opt && styles.optionTextActive]}>{opt}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <LabeledInput label="Religion" value={religion} onChangeText={setReligion} placeholder="Catholic, etc." />
    </View>
  );
}
