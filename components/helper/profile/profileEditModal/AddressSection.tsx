import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles, LabeledInput } from '.';

export function AddressSection({
  isWeb,
  province, setProvince,
  municipality, setMunicipality,
  barangay, setBarangay,
  landmark, setLandmark
}: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconBg, { backgroundColor: '#FFF4E5' }]}>
          <Ionicons name="location" size={20} color="#FF9500" />
        </View>
        <Text style={styles.sectionTitleText}>Current Address</Text>
      </View>
      
      {/* RESPONSIVE ROW FOR WEB */}
      <View style={isWeb ? styles.webRow : undefined}>
        <View style={isWeb ? { flex: 1, paddingRight: 12 } : undefined}>
          <LabeledInput label="Province *" value={province} onChangeText={setProvince} placeholder="Leyte" />
        </View>
        
        <View style={isWeb ? { flex: 2 } : undefined}>
          <View style={styles.inputGrid}>
            <View style={styles.inputHalf}>
              <LabeledInput label="Municipality *" value={municipality} onChangeText={setMunicipality} placeholder="Isabel" />
            </View>
            <View style={styles.inputHalf}>
              <LabeledInput label="Barangay *" value={barangay} onChangeText={setBarangay} placeholder="San Jose" />
            </View>
          </View>
        </View>
      </View>

      <LabeledInput label="Landmark / Street" value={landmark} onChangeText={setLandmark} placeholder="Near church / Street name" />
    </View>
  );
}