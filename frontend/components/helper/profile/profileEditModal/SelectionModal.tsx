import React from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from './EditProfile.styles';

const isWeb = Platform.OS === 'web';

export function SelectionModal({
  visible, onClose, title, data, selectedIds, onToggle,
  searchValue, onSearchChange, idKey, nameKey, showSearch = true,
  customData = [], onAddCustom, onRemoveCustom
}: any) {
  return (
    <Modal visible={visible} animationType="slide" transparent={isWeb} presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}>
      <View style={isWeb ? styles.webOverlay : { flex: 1 }}>
        <View style={[styles.modalContainer, isWeb && styles.webSmallContainer]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{title}</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>

          {showSearch && (
            <View style={styles.searchBox}>
              <Ionicons name="search" size={18} color="#666" />
              <TextInput style={styles.searchInput} placeholder="Search..." value={searchValue} onChangeText={onSearchChange} />
              {onAddCustom && searchValue.trim() !== '' && !data.some((d: any) => d[nameKey].toLowerCase() === searchValue.toLowerCase()) && (
                <TouchableOpacity style={styles.addCustomBtn} onPress={() => { onAddCustom(searchValue); onSearchChange(''); }}>
                  <Ionicons name="add-circle" size={24} color="#007AFF" />
                </TouchableOpacity>
              )}
            </View>
          )}

          <ScrollView style={{ flex: 1 }}>
            {customData.length > 0 && (
              <View style={styles.customSection}>
                <Text style={styles.customSectionTitle}>Your custom specifications:</Text>
                {customData.map((item: string, index: number) => (
                  <View key={`custom-${index}`} style={styles.listItem}>
                    <Text style={[styles.listItemText, { color: '#007AFF', fontWeight: '500' }]}>{item}</Text>
                    <TouchableOpacity onPress={() => onRemoveCustom && onRemoveCustom(item)}>
                      <Ionicons name="close-circle" size={20} color="#FF3B30" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {data.map((item: any) => {
              const isSelected = selectedIds.includes(item[idKey]);
              return (
                <TouchableOpacity key={String(item[idKey])} style={styles.listItem} onPress={() => onToggle(item[idKey])}>
                  <Text style={styles.listItemText}>{item[nameKey]}</Text>
                  {isSelected && <Ionicons name="checkmark" size={20} color="#007AFF" />}
                </TouchableOpacity>
              );
            })}
            
            {data.length === 0 && searchValue.trim() === '' && (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No items found.</Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.modalFooter}>
            <Text style={styles.selectedCount}>{selectedIds.length + customData.length} selected</Text>
            <TouchableOpacity onPress={onClose} style={styles.doneBtn}>
              <Text style={styles.doneText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}