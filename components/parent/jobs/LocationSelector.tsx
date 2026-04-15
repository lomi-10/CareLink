// components/parent/jobs/LocationSelector.tsx
// Job location selector with auto-suggestion from parent profile

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import API_URL from '@/constants/api';

interface LocationSelectorProps {
  province: string;
  municipality: string;
  barangay: string;
  onProvinceChange: (value: string) => void;
  onMunicipalityChange: (value: string) => void;
  onBarangayChange: (value: string) => void;
  disabled?: boolean;
}

export function LocationSelector({
  province,
  municipality,
  barangay,
  onProvinceChange,
  onMunicipalityChange,
  onBarangayChange,
  disabled = false,
}: LocationSelectorProps) {
  const [useMyAddress, setUseMyAddress] = useState(true);
  const [parentAddress, setParentAddress] = useState<{
    province: string;
    municipality: string;
    barangay: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadParentAddress();
  }, []);

  const loadParentAddress = async () => {
    try {
      const userData = await AsyncStorage.getItem('user_data');
      if (!userData) return;

      const user = JSON.parse(userData);
      const response = await fetch(`${API_URL}/parent/get_profile.php?user_id=${user.user_id}`);
      const data = await response.json();

      if (data.success && data.profile) {
        const address = {
          province: data.profile.province || '',
          municipality: data.profile.municipality || '',
          barangay: data.profile.barangay || '',
        };
        setParentAddress(address);

        // Auto-fill with parent's address
        if (address.province && address.municipality) {
          onProvinceChange(address.province);
          onMunicipalityChange(address.municipality);
          onBarangayChange(address.barangay);
        }
      }
    } catch (error) {
      console.error('Error loading parent address:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUseMyAddress = () => {
    if (disabled || !parentAddress) return;

    setUseMyAddress(true);
    onProvinceChange(parentAddress.province);
    onMunicipalityChange(parentAddress.municipality);
    onBarangayChange(parentAddress.barangay);
  };

  const handleCustomAddress = () => {
    if (disabled) return;
    setUseMyAddress(false);
  };

  const getAddressPreview = () => {
    const parts = [];
    if (barangay.trim()) parts.push(barangay.trim());
    if (municipality.trim()) parts.push(municipality.trim());
    if (province.trim()) parts.push(province.trim());
    return parts.length > 0 ? parts.join(', ') : 'No address set';
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <Text style={styles.label}>Job Location *</Text>
        <Text style={styles.hint}>Loading your address...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Job Location <Text style={{ color: '#EF4444' }}>*</Text></Text>
      <Text style={styles.hint}>
        Where will the helper work?
      </Text>

      {/* Use My Address Option */}
      {parentAddress && (
        <TouchableOpacity
          style={[
            styles.addressOption,
            useMyAddress && styles.addressOptionActive,
            disabled && styles.addressOptionDisabled,
          ]}
          onPress={handleUseMyAddress}
          activeOpacity={disabled ? 1 : 0.7}
          disabled={disabled}
        >
          <View style={styles.addressOptionHeader}>
            <Ionicons
              name={useMyAddress ? 'radio-button-on' : 'radio-button-off'}
              size={24}
              color={disabled ? '#ccc' : useMyAddress ? '#2563EB' : '#999'}
            />
            <Text
              style={[
                styles.addressOptionTitle,
                disabled && styles.addressOptionTitleDisabled,
              ]}
            >
              Use my address
            </Text>
          </View>
          <Text
            style={[
              styles.addressPreview,
              disabled && styles.addressPreviewDisabled,
            ]}
          >
            {parentAddress.barangay && `${parentAddress.barangay}, `}
            {parentAddress.municipality}
            {parentAddress.province && `, ${parentAddress.province}`}
          </Text>
        </TouchableOpacity>
      )}

      {/* Custom Address Option */}
      <TouchableOpacity
        style={[
          styles.addressOption,
          !useMyAddress && styles.addressOptionActive,
          disabled && styles.addressOptionDisabled,
        ]}
        onPress={handleCustomAddress}
        activeOpacity={disabled ? 1 : 0.7}
        disabled={disabled}
      >
        <View style={styles.addressOptionHeader}>
          <Ionicons
            name={!useMyAddress ? 'radio-button-on' : 'radio-button-off'}
            size={24}
            color={disabled ? '#ccc' : !useMyAddress ? '#2563EB' : '#999'}
          />
          <Text
            style={[
              styles.addressOptionTitle,
              disabled && styles.addressOptionTitleDisabled,
            ]}
          >
            Different location
          </Text>
        </View>
      </TouchableOpacity>

      {/* Custom Address Inputs */}
      {!useMyAddress && (
        <View style={styles.customAddressContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Province *</Text>
            <TextInput
              style={[styles.input, disabled && styles.inputDisabled]}
              placeholder="e.g., Cebu"
              value={province}
              onChangeText={onProvinceChange}
              placeholderTextColor="#999"
              editable={!disabled}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Municipality/City *</Text>
            <TextInput
              style={[styles.input, disabled && styles.inputDisabled]}
              placeholder="e.g., Ormoc City"
              value={municipality}
              onChangeText={onMunicipalityChange}
              placeholderTextColor="#999"
              editable={!disabled}
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Barangay (Optional)</Text>
            <TextInput
              style={[styles.input, disabled && styles.inputDisabled]}
              placeholder="e.g., Barangay 1"
              value={barangay}
              onChangeText={onBarangayChange}
              placeholderTextColor="#999"
              editable={!disabled}
            />
          </View>
        </View>
      )}

      {/* Current Address Preview */}
      <View style={styles.previewBox}>
        <Ionicons name="location" size={16} color="#2563EB" />
        <Text style={styles.previewText}>{getAddressPreview()}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1C1E',
    marginBottom: 4,
  },
  hint: {
    fontSize: 13,
    color: '#666',
    marginBottom: 12,
  },
  addressOption: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: '#E5E5EA',
  },
  addressOptionActive: {
    borderColor: '#2563EB',
    backgroundColor: '#F0F8FF',
  },
  addressOptionDisabled: {
    opacity: 0.6,
    backgroundColor: '#F8F9FA',
  },
  addressOptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  addressOptionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1A1C1E',
  },
  addressOptionTitleDisabled: {
    color: '#999',
  },
  addressPreview: {
    fontSize: 14,
    color: '#666',
    marginLeft: 34,
  },
  addressPreviewDisabled: {
    color: '#999',
  },
  customAddressContainer: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#E5E5EA',
    borderRadius: 10,
    padding: 12,
    fontSize: 15,
    color: '#1A1C1E',
  },
  inputDisabled: {
    backgroundColor: '#F0F0F0',
    color: '#999',
  },
  previewBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 10,
    marginTop: 12,
  },
  previewText: {
    flex: 1,
    fontSize: 13,
    color: '#1976D2',
    fontWeight: '600',
  },
});
