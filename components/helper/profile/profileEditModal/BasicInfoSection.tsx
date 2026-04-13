// components/helper/profile/profileEditModal/LabeledInput.tsx

import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, LabeledInput } from '.';

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
      <LabeledInput label="Birth Date (YYYY-MM-DD)" required value={birthDate} onChangeText={setBirthDate} placeholder="2000-01-15" />
      
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