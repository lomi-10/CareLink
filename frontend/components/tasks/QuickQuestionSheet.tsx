// components/tasks/QuickQuestionSheet.tsx
// Guided "smart template" questions shown when a parent taps a task category chip
// on the AI Task Assistant screen. Pure UI + local config — answers feed straight
// into the rule-based generateSuggestions() engine in ai_tasks.tsx. No AI/API call.
import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FontFamily } from '@/constants/GlobalStyles';
import { BROWN, DARK, MUTED, DIVIDER } from '@/components/parent/home/parentWarmTheme';

const AMBER    = '#C8733A';
const AMBER_BG = '#FBEEE2';
const NAVY     = '#1E2A4A';

export type TemplateCategoryKey =
  | 'cleaning' | 'laundry' | 'cooking' | 'childcare'
  | 'shopping' | 'gardening' | 'pet_care' | 'more';

export type TemplateQuestion = { id: string; question: string; options: string[] };

export const TEMPLATE_QUESTIONS: Record<TemplateCategoryKey, TemplateQuestion[]> = {
  cleaning: [
    { id: 'area', question: 'Which area needs cleaning?', options: ['Whole house', 'Bedrooms', 'Kitchen', 'Bathroom', 'Living room'] },
    { id: 'type', question: 'How thorough?', options: ['Quick tidy up', 'Regular cleaning', 'Deep clean', 'After guests'] },
  ],
  laundry: [
    { id: 'items', question: 'What needs to be washed?', options: ['Regular clothes', 'Bed sheets & linens', 'Both', 'Delicate items only'] },
    { id: 'extra', question: 'Anything extra?', options: ['Iron after washing', 'Fold & organize', 'Just wash & dry'] },
  ],
  cooking: [
    { id: 'meals', question: 'Which meals?', options: ['Breakfast only', 'Lunch only', 'Dinner only', 'All meals'] },
    { id: 'dietary', question: 'Any dietary needs?', options: ['None', "Kids' meals", 'Diabetic-friendly', 'Elderly soft food'] },
  ],
  childcare: [
    { id: 'who', question: 'Who needs care?', options: ['Young children', 'Elderly family member', 'Both', 'Infant/baby'] },
    { id: 'priority', question: "What's the main focus today?", options: ['Feeding & meals', 'Bathing & hygiene', 'School preparation', 'Medication reminders'] },
    { id: 'activity', question: 'Any special activity?', options: ['Playtime supervision', 'Homework help', 'Doctor appointment', 'Just routine care'] },
  ],
  shopping: [
    { id: 'type', question: 'What kind of errand?', options: ['Grocery / market', 'Pharmacy', 'Bills payment', 'Multiple errands'] },
    { id: 'timing', question: 'When should it be done?', options: ['This morning', 'This afternoon', 'Flexible / anytime'] },
  ],
  gardening: [
    { id: 'task', question: 'What needs to be done?', options: ['Water plants', 'Mow & trim lawn', 'Full garden maintenance', 'Remove dead plants'] },
  ],
  pet_care: [
    { id: 'pet', question: 'What kind of pet?', options: ['Dog', 'Cat', 'Multiple pets', 'Other'] },
    { id: 'task', question: "What's needed today?", options: ['Feeding & water', 'Grooming & bath', 'Walking / exercise', 'Full routine care'] },
  ],
  more: [
    { id: 'custom', question: 'What type of task?', options: ['Deep cleaning', 'Organizing & decluttering', 'General help', 'Event preparation'] },
  ],
};

const CATEGORY_ICON: Record<TemplateCategoryKey, keyof typeof Ionicons.glyphMap> = {
  cleaning: 'sparkles-outline',
  laundry: 'shirt-outline',
  cooking: 'restaurant-outline',
  childcare: 'happy-outline',
  shopping: 'cart-outline',
  gardening: 'leaf-outline',
  pet_care: 'paw-outline',
  more: 'clipboard-outline',
};

/** Skill/job-title keywords associated with each template category — also used
 *  by suggestHelper() in ai_tasks.tsx and the category relevance dimming in
 *  placement_tasks.tsx, so it lives here once and is shared. */
export const CATEGORY_TO_SKILLS: Record<TemplateCategoryKey, string[]> = {
  childcare: ['childcare', 'yaya', 'nanny', 'babysitter', 'child', 'elderly', 'caregiver'],
  cooking:   ['cooking', 'cook', 'kusinera', 'chef', 'meal'],
  cleaning:  ['cleaning', 'househelp', 'housekeeping', 'housekeeper'],
  laundry:   ['laundry', 'washing', 'ironing', 'househelp'],
  gardening: ['gardening', 'garden', 'hardinero', 'landscap'],
  shopping:  ['errands', 'shopping', 'driver', 'general'],
  pet_care:  ['pet', 'petcare', 'animal'],
  more:      [],
};

export function resolveCategoryKey(name: string): TemplateCategoryKey {
  const n = name.toLowerCase();
  if (n.match(/laundry|wash|iron/)) return 'laundry';
  if (n.match(/cook|food|meal|kitchen|chef/)) return 'cooking';
  if (n.match(/garden|yard|plant|ground|lawn/)) return 'gardening';
  if (n.match(/pet|animal/)) return 'pet_care';
  if (n.match(/shop|grocery|market|errand|driver|driving/)) return 'shopping';
  if (n.match(/child|baby|yaya|nanny|infant|tutor|elder|senior|care|patient/)) return 'childcare';
  if (n.match(/clean|sweep|mop|housekeep/)) return 'cleaning';
  return 'more';
}

type Props = {
  visible: boolean;
  category: string;
  onGenerate: (answers: Record<string, string>) => void;
  onClose: () => void;
};

export function QuickQuestionSheet({ visible, category, onGenerate, onClose }: Props) {
  const categoryKey = resolveCategoryKey(category);
  const questions = TEMPLATE_QUESTIONS[categoryKey];

  const [stepIdx, setStepIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    if (visible) { setStepIdx(0); setAnswers({}); }
  }, [visible, category]);

  const step = questions[Math.min(stepIdx, questions.length - 1)];
  const isLast = stepIdx >= questions.length - 1;

  const selectOption = (opt: string) => setAnswers(prev => ({ ...prev, [step.id]: opt }));

  const advance = () => {
    if (isLast) { onGenerate(answers); return; }
    setStepIdx(i => i + 1);
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <TouchableOpacity style={q.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity style={q.sheet} activeOpacity={1} onPress={() => {}}>
          <View style={q.header}>
            <View style={q.iconWrap}>
              <Ionicons name={CATEGORY_ICON[categoryKey]} size={20} color={BROWN} />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={q.title} numberOfLines={1}>{category}</Text>
              <Text style={q.subtitle}>
                {questions.length} question{questions.length !== 1 ? 's' : ''} to personalize your tasks
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={8} activeOpacity={0.7}>
              <Ionicons name="close" size={22} color={MUTED} />
            </TouchableOpacity>
          </View>

          {questions.length > 1 && (
            <View style={q.dotsRow}>
              {questions.map((qq, i) => (
                <View key={qq.id} style={[q.dot, i === stepIdx && q.dotActive, i < stepIdx && q.dotDone]} />
              ))}
            </View>
          )}

          <Text style={q.question}>{step.question}</Text>
          <View style={q.optionsWrap}>
            {step.options.map(opt => {
              const selected = answers[step.id] === opt;
              return (
                <TouchableOpacity
                  key={opt}
                  style={[q.chip, selected && q.chipSelected]}
                  onPress={() => selectOption(opt)}
                  activeOpacity={0.8}
                >
                  <Text style={[q.chipText, selected && q.chipTextSelected]}>{opt}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={q.footer}>
            <TouchableOpacity onPress={advance} hitSlop={8} activeOpacity={0.7}>
              <Text style={q.skipText}>Skip</Text>
            </TouchableOpacity>
            <TouchableOpacity style={q.nextBtn} onPress={advance} activeOpacity={0.88}>
              {isLast ? (
                <>
                  <Ionicons name="sparkles" size={15} color="#fff" />
                  <Text style={q.nextBtnText}>Generate Tasks</Text>
                </>
              ) : (
                <>
                  <Text style={q.nextBtnText}>Next</Text>
                  <Ionicons name="arrow-forward" size={15} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const q = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 22, paddingBottom: 30,
  },
  header: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  iconWrap: { width: 38, height: 38, borderRadius: 12, backgroundColor: AMBER_BG, alignItems: 'center', justifyContent: 'center' },
  title: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK },
  subtitle: { fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: MUTED, marginTop: 2 },

  dotsRow: { flexDirection: 'row', gap: 6, marginBottom: 18 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: DIVIDER },
  dotActive: { backgroundColor: AMBER, width: 20 },
  dotDone: { backgroundColor: '#D8B68F' },

  question: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 16, color: DARK, marginBottom: 14 },
  optionsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 22 },
  chip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#E0D5C8', backgroundColor: '#fff',
  },
  chipSelected: { backgroundColor: AMBER, borderColor: AMBER },
  chipText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: DARK },
  chipTextSelected: { fontFamily: FontFamily.fredokaSemiBold, color: '#fff' },

  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  skipText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: MUTED },
  nextBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: NAVY, borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20,
  },
  nextBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: '#fff' },
});
