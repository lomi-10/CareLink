import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { styles } from '.';

export function SpecialtiesSection({
  selectedCategories, 
  selectedCategoryIds,
  selectedJobs, 
  selectedJobIds, 
  customJobs,
  selectedSkills, 
  customSkills,
  selectedLanguages,
  setCategoryModalVisible, 
  setJobModalVisible, 
  setSkillModalVisible, 
  setLanguageModalVisible,
  isGeneralHousehelpSelected // <-- Added this from your code!
}: any) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHeaderRow}>
        <View style={[styles.sectionIconBg, { backgroundColor: '#EBFBEE' }]}>
          <Ionicons name="ribbon" size={20} color="#2ECC71" />
        </View>
        <Text style={styles.sectionTitleText}>Skills & Specialties</Text>
      </View>
      
      <View style={styles.infoAlert}>
        <Ionicons name="information-circle" size={20} color="#007AFF" />
        <Text style={styles.infoAlertText}>
          Complete all 3 steps for better job matching
        </Text>
      </View>

      {/* STEP 1 */}
      <View style={styles.stepContainer}>
        <View style={styles.stepHeader}>
          <View style={styles.stepNumberContainer}>
            <Text style={styles.stepNumber}>1</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Nature of Work</Text>
            <Text style={styles.stepSubtitle}>
              {isGeneralHousehelpSelected 
                ? 'General Househelp selected (All areas included)' 
                : 'Select your primary work categories'}
            </Text>
          </View>
          <TouchableOpacity 
            style={styles.stepActionBtn}
            onPress={() => setCategoryModalVisible(true)}
          >
            <Ionicons name="chevron-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagList}>
          {selectedCategories.length > 0 ? (
            selectedCategories.map((c: any) => (
              <View key={c.category_id} style={styles.tagBadge}>
                <Text style={styles.tagBadgeText}>{c.category_name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyTagText}>No categories selected</Text>
          )}
        </View>
      </View>

      {/* STEP 2 */}
      <View style={[styles.stepContainer, selectedCategoryIds.length === 0 && styles.stepDisabled]}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNumberContainer, selectedCategoryIds.length === 0 && styles.stepNumberDisabled]}>
            <Text style={styles.stepNumber}>2</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Specific Jobs</Text>
            <Text style={styles.stepSubtitle}>What specific roles can you perform?</Text>
          </View>
          <TouchableOpacity 
            style={styles.stepActionBtn}
            onPress={() => selectedCategoryIds.length > 0 && setJobModalVisible(true)}
            disabled={selectedCategoryIds.length === 0}
          >
            <Ionicons name="chevron-forward" size={20} color={selectedCategoryIds.length > 0 ? "#007AFF" : "#ADB5BD"} />
          </TouchableOpacity>
        </View>
        <View style={styles.tagList}>
          {selectedJobs.length > 0 || customJobs.length > 0 ? (
            <>
              {selectedJobs.map((j: any) => (
                <View key={j.job_id} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{j.job_title}</Text>
                </View>
              ))}
              {customJobs.map((job: any, idx: number) => (
                <View key={`custom-job-${idx}`} style={[styles.tagBadge, styles.tagCustom]}>
                  <Ionicons name="star" size={12} color="#2E7D32" style={{ marginRight: 4 }} />
                  <Text style={[styles.tagBadgeText, styles.tagCustomText]}>{job}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyTagText}>
              {selectedCategoryIds.length === 0 ? 'Select a category first' : 'No jobs selected'}
            </Text>
          )}
        </View>
      </View>

      {/* STEP 3 */}
      <View style={[styles.stepContainer, selectedJobIds.length === 0 && customJobs.length === 0 && styles.stepDisabled]}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepNumberContainer, (selectedJobIds.length === 0 && customJobs.length === 0) && styles.stepNumberDisabled]}>
            <Text style={styles.stepNumber}>3</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Individual Skills</Text>
            <Text style={styles.stepSubtitle}>Specific skills for your selected jobs</Text>
          </View>
          <TouchableOpacity 
            style={styles.stepActionBtn}
            onPress={() => (selectedJobIds.length > 0 || customJobs.length > 0) && setSkillModalVisible(true)}
            disabled={selectedJobIds.length === 0 && customJobs.length === 0}
          >
            <Ionicons name="chevron-forward" size={20} color={(selectedJobIds.length > 0 || customJobs.length > 0) ? "#007AFF" : "#ADB5BD"} />
          </TouchableOpacity>
        </View>
        <View style={styles.tagList}>
          {selectedSkills.length > 0 || customSkills.length > 0 ? (
            <>
              {selectedSkills.map((s: any) => (
                <View key={s.skill_id} style={styles.tagBadge}>
                  <Text style={styles.tagBadgeText}>{s.skill_name}</Text>
                </View>
              ))}
              {customSkills.map((skill: any, idx: number) => (
                <View key={`custom-skill-${idx}`} style={[styles.tagBadge, styles.tagCustom]}>
                  <Ionicons name="star" size={12} color="#2E7D32" style={{ marginRight: 4 }} />
                  <Text style={[styles.tagBadgeText, styles.tagCustomText]}>{skill}</Text>
                </View>
              ))}
            </>
          ) : (
            <Text style={styles.emptyTagText}>
              {selectedJobIds.length === 0 && customJobs.length === 0 ? 'Select jobs first' : 'No skills selected'}
            </Text>
          )}
        </View>
      </View>

      {/* Languages */}
      <View style={[styles.stepContainer, { borderBottomWidth: 0, marginBottom: 0 }]}>
        <View style={styles.stepHeader}>
          <View style={[styles.stepIconContainer]}>
            <Ionicons name="language" size={18} color="#6C757D" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.stepTitle}>Languages Spoken</Text>
          </View>
          <TouchableOpacity 
            style={styles.stepActionBtn}
            onPress={() => setLanguageModalVisible(true)}
          >
            <Ionicons name="chevron-forward" size={20} color="#007AFF" />
          </TouchableOpacity>
        </View>
        <View style={styles.tagList}>
          {selectedLanguages.length > 0 ? (
            selectedLanguages.map((l: any) => (
              <View key={l.language_id} style={[styles.tagBadge, { backgroundColor: '#F0F2F5', borderColor: '#D1D5DB' }]}>
                <Text style={[styles.tagBadgeText, { color: '#4B5563' }]}>{l.language_name}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.emptyTagText}>No languages selected</Text>
          )}
        </View>
      </View>
    </View>
  );
}