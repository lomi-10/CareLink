// app/(parent)/hire/ai_tasks.tsx
// AI Task Assistant — keyword-based suggestion engine, no external API needed.
// Accepts: prompt (URI-encoded), category (URI-encoded), select_all ('1'), application_id
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  StyleSheet, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { FontFamily } from '@/constants/GlobalStyles';
import { BROWN, DARK, MUTED, DIVIDER, ICON_BG } from '@/components/parent/home/parentWarmTheme';
import { ParentWorkModeTabBar } from '@/components/parent/home';
import { NotificationModal, DateField } from '@/components/shared';
import { useAuth, useResponsive, useNotice } from '@/hooks/shared';
import { useParentActivePlacements } from '@/hooks/parent/useParentActivePlacements';
import type { ActivePlacement } from '@/hooks/parent/useParentActivePlacements';
import { createApplicationTask } from '@/lib/applicationTasksApi';
import {
  QuickQuestionSheet, resolveCategoryKey, CATEGORY_TO_SKILLS,
  type TemplateCategoryKey,
} from '@/components/tasks/QuickQuestionSheet';

// ─── Palette ──────────────────────────────────────────────────────────────────
const CARD_GR  = ['#F9E4AF', '#F4CE82'] as const;
const NAVY     = '#1E2A4A';
const AMBER    = '#D97706';
const AMBER_BG = '#FEF3C7';

// ─── Rotating prompt placeholders ────────────────────────────────────────────
const PROMPT_PLACEHOLDERS = [
  'e.g. Prepare the house for a family gathering',
  'e.g. John Paul needs to focus on the kids today',
  'e.g. Deep clean before the long weekend',
  'e.g. Weekly grocery and errand tasks for Maria',
];

// ─── Smart due date default ───────────────────────────────────────────────────
// If it's before 18:00 local time → today (shift in progress / not started).
// If 18:00 or later → tomorrow (shift likely done for the day).
function smartDefaultDate(): string {
  const now = new Date();
  if (now.getHours() >= 18) now.setDate(now.getDate() + 1);
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ─── Keyword-based AI suggestion engine ──────────────────────────────────────
// Combines the parent's typed prompt with helper job titles/skills, the job
// post's duties, and (when generated from a category) the QuickQuestionSheet
// answers — all blended into one string and matched against keyword groups.
// Still 100% local and rule-based: no external AI model or API call.
export interface TaskGenerationContext {
  helperJobs: string[];
  helperSkills: string[][];
  jobPostDuties: string[];
  templateAnswers?: {
    category: string;
    answers: Record<string, string>;
  };
}

const GENERAL_TASKS = [
  'Check and secure all doors and windows',
  'Maintain cleanliness in all common areas',
  'Water indoor plants',
  'Collect and organize mail or deliveries',
  'Report any maintenance issues to employer',
];

function buildContextString(prompt: string, context: TaskGenerationContext): string {
  return [
    prompt,
    context.helperJobs.join(' '),
    context.helperSkills.flat().join(' '),
    context.jobPostDuties.join(' '),
    context.templateAnswers ? Object.values(context.templateAnswers.answers).join(' ') : '',
  ].join(' ').toLowerCase();
}

function dedupeCap(tasks: string[], max = 8): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of tasks) {
    const key = t.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  if (out.length < 3) {
    for (const fallback of GENERAL_TASKS) {
      if (out.length >= 3) break;
      const key = fallback.toLowerCase();
      if (!seen.has(key)) { seen.add(key); out.push(fallback); }
    }
  }
  return out.slice(0, max);
}

function generateSuggestions(prompt: string, context: TaskGenerationContext): string[] {
  const ctx = buildContextString(prompt, context);
  const tasks: string[] = [];

  if (/clean|sweep|mop|dust|tidy|vacuum|wipe|scrub|sanitize/.test(ctx))
    tasks.push(
      'Sweep and mop all floor areas', 'Dust furniture and shelves', 'Clean and sanitize the bathroom',
      'Empty all trash bins', 'Wipe down kitchen surfaces and appliances', 'Vacuum carpets and rugs',
      'Clean windows and glass surfaces', 'Organize and declutter common areas',
    );

  if (/deep.?clean|thorough|after.?guest|event|gathering/.test(ctx))
    tasks.push(
      'Deep clean all rooms including corners and hidden areas',
      'Sanitize all high-touch surfaces (doorknobs, switches)',
      'Clean inside cabinets and drawers', 'Scrub bathroom tiles and grouting',
      'Clean behind and under furniture', 'Wash curtains or wipe blinds',
    );

  if (/laundry|wash.?clothes|iron|fold|linen|bedsheet|towel/.test(ctx))
    tasks.push(
      'Collect and sort laundry by color and fabric type', 'Wash and rinse all clothes',
      'Dry clothes properly', 'Iron and fold clean clothes',
      'Return clothes to the correct rooms and closets', 'Change and wash bed sheets and pillowcases',
    );

  if (/cook|meal|food|breakfast|lunch|dinner|prepare.?food|grocery|kitchen|dish|sink|utensil/.test(ctx))
    tasks.push(
      'Prepare breakfast for the family', "Cook lunch according to the family's meal plan",
      'Prepare dinner and set the table', 'Wash all dishes and cooking utensils',
      'Store leftover food properly', 'Check kitchen inventory and note items to restock',
    );

  const mentionsChild = /child|kid|baby|nanny|yaya|toddler|infant|school|homework/.test(ctx);
  const mentionsElder = /elder|senior|lolo|lola|medicine|medication|grandpar|patient/.test(ctx);

  if (mentionsChild)
    tasks.push(
      "Prepare children's meals and snacks", 'Assist children with morning routine (bath, dressing)',
      'Monitor children during playtime', 'Help children with homework or school preparation',
      'Ensure children take naps at scheduled times', "Prepare children's school bag and uniform",
    );

  if (mentionsElder)
    tasks.push(
      'Assist with morning hygiene and dressing', 'Prepare and serve medications at scheduled times',
      'Prepare soft and nutritious meals suitable for elderly', 'Assist with light exercises or walking',
      'Keep elderly comfortable and check on them regularly', 'Accompany elderly to medical appointments if needed',
    );

  if (/garden|yard|plant|outdoor|grass|lawn|trim/.test(ctx))
    tasks.push(
      'Water all indoor and outdoor plants', 'Remove dead leaves and dried branches',
      'Sweep fallen leaves from the yard', 'Mow the lawn if needed', 'Apply fertilizer to garden plants',
    );

  if (/pet|dog|cat|animal|paw/.test(ctx))
    tasks.push(
      'Feed pets at scheduled meal times', 'Provide fresh water for pets',
      'Walk the dog in the morning and afternoon', 'Clean pet sleeping area and bedding',
      'Brush and groom pet if needed',
    );

  if (/errand|shop|market|buy|pick.?up|deliver|bills|pharmacy/.test(ctx))
    tasks.push(
      'Go to the market or grocery for supplies', 'Pay utility bills (electricity, water, internet)',
      'Pick up medications from the pharmacy', 'Return or exchange items if needed',
      'Keep receipt of all purchases for employer review',
    );

  if (/driver|driving|chauffeur|drop|fetch|commute/.test(ctx))
    tasks.push('Fetch/drop off family members as scheduled', 'Refuel and clean the vehicle');

  if (/bedroom|room|bed|sleep|guest/.test(ctx))
    tasks.push('Make all the beds', 'Organize and tidy the bedrooms');

  if (/gather|party|celebrat|hosting|occasion|visit/.test(ctx))
    tasks.push(
      'Deep clean all areas guests will use', 'Set up and arrange seating and tables',
      'Prepare food and drinks for guests', 'Ensure bathrooms are spotless and stocked',
      'Decorate or arrange flowers as instructed', 'Clean up after the event',
      'Wash all dishes and return furniture to original places',
    );

  if (tasks.length === 0 || /general|household|housekeeper|organiz/.test(ctx))
    tasks.push(...GENERAL_TASKS);

  return dedupeCap(tasks);
}

// ─── Auto-suggest helper assignment ──────────────────────────────────────────
// Scores each active helper against the tapped category's keywords (job title +
// profile skills + other listed job titles) and pre-selects the best match(es).
function suggestHelper(categoryKey: TemplateCategoryKey, placements: ActivePlacement[]): string[] {
  if (placements.length === 0) return [];
  const relevantSkills = CATEGORY_TO_SKILLS[categoryKey] ?? [];
  if (relevantSkills.length === 0) return [String(placements[0].application_id)];

  const scored = placements.map(p => {
    const text = [p.job_title, ...(p.helper_skills ?? []), ...(p.helper_jobs ?? [])].join(' ').toLowerCase();
    const score = relevantSkills.filter(skill => text.includes(skill)).length;
    return { appId: String(p.application_id), score };
  });

  const maxScore = Math.max(...scored.map(s => s.score));
  if (maxScore === 0) return [String(placements[0].application_id)];
  return scored.filter(s => s.score === maxScore).map(s => s.appId);
}

// ─── Main screen ──────────────────────────────────────────────────────────────
export default function AiTasksScreen() {
  const { notify, noticeHost } = useNotice();
  const router = useRouter();
  const params = useLocalSearchParams<{
    prompt?: string;
    category?: string;
    select_all?: string;
    application_id?: string;
  }>();

  const initialPrompt    = params.prompt   ? decodeURIComponent(params.prompt)   : '';
  const categoryParam    = params.category ? decodeURIComponent(params.category) : '';
  const selectAll        = params.select_all === '1';
  const preselectedAppId = params.application_id ? Number(params.application_id) : 0;

  const { userData }  = useAuth();
  const parentId      = userData ? Number(userData.user_id) : 0;
  const { isDesktop } = useResponsive();
  const { placements }= useParentActivePlacements();

  const [prompt, setPrompt]             = useState(initialPrompt || categoryParam);
  const [suggestions, setSuggestions]   = useState<string[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<Set<number>>(new Set());
  const [newTaskText, setNewTaskText]   = useState('');
  const [selectedHelpers, setSelectedHelpers] = useState<Set<string>>(new Set());
  const [suggestedHelperIds, setSuggestedHelperIds] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate]           = useState(smartDefaultDate);

  // Inline edit state
  const [editingIdx, setEditingIdx]     = useState<number | null>(null);
  const [editingText, setEditingText]   = useState('');

  const [saving, setSaving]             = useState(false);
  const [successModal, setSuccessModal] = useState(false);

  // Smart Template guided questions — opens automatically when arriving from a
  // category chip, before the first suggestion batch is generated.
  const [showTemplateSheet, setShowTemplateSheet] = useState(false);
  const didOpenTemplateSheet = useRef(false);

  // Rotating placeholder for the free-text prompt input
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPlaceholderIdx(i => (i + 1) % PROMPT_PLACEHOLDERS.length), 3000);
    return () => clearInterval(id);
  }, []);

  // Only run initial selection once when placements first load
  const didInitSelect = useRef(false);

  const doGenerate = useCallback((p: string, templateAnswers?: { category: string; answers: Record<string, string> }) => {
    const context: TaskGenerationContext = {
      helperJobs: placements.map(pl => pl.job_title),
      helperSkills: placements.map(pl => pl.helper_skills ?? []),
      jobPostDuties: placements.map(pl => pl.job_description ?? '').filter(Boolean),
      templateAnswers,
    };
    const sug = generateSuggestions(p || categoryParam, context);
    setSuggestions(sug);
    setSelectedTasks(new Set(sug.map((_, i) => i)));
    setEditingIdx(null);
  }, [placements, categoryParam]);

  // Generate once placements are loaded — categories open the QuickQuestionSheet
  // first instead of generating immediately.
  useEffect(() => {
    if (placements.length === 0 || suggestions.length > 0) return;
    if (categoryParam) {
      if (!didOpenTemplateSheet.current) {
        didOpenTemplateSheet.current = true;
        setShowTemplateSheet(true);
      }
      return;
    }
    doGenerate(prompt);
  }, [placements]); // eslint-disable-line react-hooks/exhaustive-deps

  // Pre-select helpers only once on first load. For category-driven flows,
  // auto-suggest the most relevant helper(s) by skill match instead of select-all.
  useEffect(() => {
    if (placements.length === 0 || didInitSelect.current) return;
    didInitSelect.current = true;
    if (categoryParam) {
      const suggested = suggestHelper(resolveCategoryKey(categoryParam), placements);
      setSelectedHelpers(new Set(suggested));
      setSuggestedHelperIds(new Set(suggested));
    } else if (selectAll || !preselectedAppId) {
      setSelectedHelpers(new Set(placements.map(p => String(p.application_id))));
    } else {
      setSelectedHelpers(new Set([String(preselectedAppId)]));
    }
  }, [placements]); // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Task actions ────────────────────────────────────────────────────────────
  const handleGenerate = () => { if (prompt.trim() || categoryParam) doGenerate(prompt); };

  const handleTemplateGenerate = (answers: Record<string, string>) => {
    setShowTemplateSheet(false);
    doGenerate(prompt, { category: categoryParam, answers });
  };

  const handleTemplateClose = () => {
    setShowTemplateSheet(false);
    if (suggestions.length === 0) doGenerate(prompt);
  };

  const toggleTask = (idx: number) =>
    setSelectedTasks(prev => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });

  const removeTask = (idx: number) => {
    if (editingIdx === idx) setEditingIdx(null);
    setSuggestions(prev => prev.filter((_, i) => i !== idx));
    setSelectedTasks(prev => {
      const next = new Set<number>();
      prev.forEach(v => { if (v < idx) next.add(v); else if (v > idx) next.add(v - 1); });
      return next;
    });
    if (editingIdx !== null && editingIdx > idx) setEditingIdx(editingIdx - 1);
  };

  const startEdit = (idx: number, current: string) => {
    setEditingIdx(idx);
    setEditingText(current);
  };

  const commitEdit = () => {
    const text = editingText.trim();
    if (text && editingIdx !== null) {
      setSuggestions(prev => prev.map((t, i) => (i === editingIdx ? text : t)));
    }
    setEditingIdx(null);
    setEditingText('');
  };

  const cancelEdit = () => { setEditingIdx(null); setEditingText(''); };

  const addCustomTask = () => {
    const text = newTaskText.trim();
    if (!text) return;
    setSuggestions(prev => {
      const updated = [...prev, text];
      setSelectedTasks(s => new Set([...s, updated.length - 1]));
      return updated;
    });
    setNewTaskText('');
  };

  const toggleHelper = (appId: string) =>
    setSelectedHelpers(prev => { const s = new Set(prev); s.has(appId) ? s.delete(appId) : s.add(appId); return s; });

  // ─── Assign ──────────────────────────────────────────────────────────────────
  const readyToAssign = selectedTasks.size > 0 && selectedHelpers.size > 0 && !!dueDate;

  const handleAssign = async () => {
    if (!readyToAssign || !parentId) return;
    setSaving(true);
    try {
      const activeTasks = suggestions.filter((_, i) => selectedTasks.has(i));
      const calls = [...selectedHelpers].flatMap(appId =>
        activeTasks.map(title =>
          createApplicationTask(Number(appId), parentId, {
            title,
            due_date: dueDate || null,
            priority: 'medium',
          }),
        ),
      );
      const results = await Promise.all(calls);
      const failed = results.filter(r => !r.success).length;
      if (failed > 0) {
        notify('Partial error', `${failed} task(s) could not be saved. Please try again.`, 'error');
      } else {
        setSuccessModal(true);
      }
    } catch {
      notify('Error', 'Could not create tasks. Please check your connection and try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // ─── Content ─────────────────────────────────────────────────────────────────
  const content = (
    <ScrollView
      contentContainerStyle={s.scroll}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      {/* Prompt card */}
      <LinearGradient colors={CARD_GR} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={s.promptCard}>
        <View style={s.promptCardHeader}>
          <Text style={s.promptCardTitle}>Describe what you need{'\n'}to be done</Text>
          <View style={s.sparkleWrap}>
            <Ionicons name="sparkles" size={28} color="#B45309" />
          </View>
        </View>

        <View style={s.inputWrap}>
          <TextInput
            style={s.promptInput}
            value={prompt}
            onChangeText={setPrompt}
            multiline
            textAlignVertical="top"
            maxLength={300}
            placeholderTextColor="rgba(120,80,20,0.45)"
            placeholder={PROMPT_PLACEHOLDERS[placeholderIdx]}
          />
          {prompt.length > 0 && (
            <TouchableOpacity style={s.clearBtn} onPress={() => setPrompt('')} hitSlop={8} activeOpacity={0.7}>
              <Ionicons name="close-circle" size={18} color="rgba(120,80,20,0.5)" />
            </TouchableOpacity>
          )}
          <Text style={s.charCount}>{prompt.length}/300</Text>
        </View>

        <TouchableOpacity
          style={[s.generateBtn, !prompt.trim() && { opacity: 0.6 }]}
          onPress={handleGenerate}
          disabled={!prompt.trim()}
          activeOpacity={0.88}
        >
          <Ionicons name="sparkles" size={15} color="#fff" />
          <Text style={s.generateBtnText}>Generate Tasks</Text>
        </TouchableOpacity>
      </LinearGradient>

      {/* AI Suggested Tasks */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>AI SUGGESTED TASKS</Text>
        <Text style={s.sectionSub}>Tap the pencil to rename, × to remove.</Text>

        {suggestions.length === 0 ? (
          <View style={s.emptyTasks}>
            <Ionicons name="sparkles-outline" size={32} color={MUTED} style={{ marginBottom: 8 }} />
            <Text style={s.emptyTasksText}>Enter a prompt above and tap Generate Tasks.</Text>
          </View>
        ) : (
          suggestions.map((title, idx) => {
            const checked  = selectedTasks.has(idx);
            const isEditing = editingIdx === idx;

            if (isEditing) {
              return (
                <View key={`edit-${idx}`} style={[s.taskRow, s.taskRowEditing]}>
                  <TextInput
                    style={s.taskEditInput}
                    value={editingText}
                    onChangeText={setEditingText}
                    autoFocus
                    onSubmitEditing={commitEdit}
                    returnKeyType="done"
                    selectTextOnFocus
                  />
                  <TouchableOpacity onPress={commitEdit} hitSlop={8} activeOpacity={0.75}>
                    <Ionicons name="checkmark-circle" size={22} color={NAVY} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={cancelEdit} hitSlop={8} activeOpacity={0.75}>
                    <Ionicons name="close-circle-outline" size={20} color={MUTED} />
                  </TouchableOpacity>
                </View>
              );
            }

            return (
              <View key={`${idx}-${title}`} style={[s.taskRow, !checked && s.taskRowOff]}>
                <TouchableOpacity onPress={() => toggleTask(idx)} style={s.taskCheck} activeOpacity={0.75}>
                  {checked
                    ? <View style={s.checkFilled}><Ionicons name="checkmark" size={13} color="#fff" /></View>
                    : <View style={s.checkEmpty} />}
                </TouchableOpacity>
                <Text style={[s.taskText, !checked && s.taskTextOff]} numberOfLines={2}>{title}</Text>
                <TouchableOpacity onPress={() => startEdit(idx, title)} hitSlop={8} activeOpacity={0.75}>
                  <Ionicons name="pencil-outline" size={17} color={BROWN} />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => removeTask(idx)} hitSlop={8} activeOpacity={0.7}>
                  <Ionicons name="close-circle-outline" size={18} color={MUTED} />
                </TouchableOpacity>
              </View>
            );
          })
        )}

        {/* Add custom task */}
        <View style={s.addTaskRow}>
          <Ionicons name="add-circle-outline" size={18} color={BROWN} />
          <TextInput
            style={s.addTaskInput}
            placeholder="Add a task manually"
            placeholderTextColor={MUTED}
            value={newTaskText}
            onChangeText={setNewTaskText}
            onSubmitEditing={addCustomTask}
            returnKeyType="done"
          />
          {newTaskText.trim().length > 0 && (
            <TouchableOpacity onPress={addCustomTask} hitSlop={8} activeOpacity={0.8}>
              <Ionicons name="arrow-forward-circle" size={20} color={BROWN} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Assign To */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>ASSIGN TO</Text>
        {placements.length === 0 ? (
          <View style={s.emptyAssign}>
            <Ionicons name="people-outline" size={28} color={MUTED} style={{ marginBottom: 6 }} />
            <Text style={s.emptyAssignText}>No active helpers to assign tasks to.</Text>
          </View>
        ) : (
          placements.map(p => {
            const appId    = String(p.application_id);
            const selected = selectedHelpers.has(appId);
            const initials = p.helper_name.split(' ').slice(0, 2).map(w => w[0]?.toUpperCase()).join('');
            return (
              <TouchableOpacity
                key={appId}
                style={[s.helperRow, selected && s.helperRowSelected]}
                onPress={() => toggleHelper(appId)}
                activeOpacity={0.85}
              >
                {p.helper_photo ? (
                  <Image source={{ uri: p.helper_photo }} style={s.helperAvatar} contentFit="cover" />
                ) : (
                  <View style={[s.helperAvatar, s.helperAvatarFb]}>
                    <Text style={s.helperInitials}>{initials}</Text>
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={s.helperName} numberOfLines={1}>{p.helper_name}</Text>
                    {suggestedHelperIds.has(appId) && (
                      <View style={s.suggestedBadge}>
                        <Ionicons name="sparkles" size={9} color={AMBER} />
                        <Text style={s.suggestedBadgeText}>Suggested</Text>
                      </View>
                    )}
                  </View>
                  <Text style={s.helperRole} numberOfLines={1}>{p.job_title}</Text>
                </View>
                <View style={[s.helperCheck, selected && s.helperCheckSelected]}>
                  {selected && <Ionicons name="checkmark" size={13} color="#fff" />}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Due Date */}
      <View style={s.section}>
        <Text style={s.sectionTitle}>DUE DATE</Text>
        <Text style={s.sectionSub}>
          {new Date().getHours() >= 18
            ? 'Defaulted to tomorrow — shift is likely done for today.'
            : "Defaulted to today — shift is in progress."}
        </Text>
        <DateField
          value={dueDate}
          onChange={setDueDate}
          placeholder="Set a due date"
          minimumDate={new Date()}
        />
      </View>

      <View style={{ height: 32 }} />
    </ScrollView>
  );

  const assignBtn = (
    <View style={s.stickyBottom}>
      <TouchableOpacity
        style={[s.assignBtn, (!readyToAssign || saving) && { opacity: 0.55 }]}
        disabled={!readyToAssign || saving}
        onPress={() => void handleAssign()}
        activeOpacity={0.88}
      >
        {saving
          ? <ActivityIndicator color="#fff" />
          : <Text style={s.assignBtnText}>
              Review & Assign {selectedTasks.size > 0 ? `${selectedTasks.size} ` : ''}Tasks
            </Text>}
      </TouchableOpacity>
    </View>
  );

  const modals = (
    <>
      <NotificationModal
        visible={successModal}
        message={`${selectedTasks.size} task${selectedTasks.size !== 1 ? 's' : ''} assigned to ${selectedHelpers.size} helper${selectedHelpers.size !== 1 ? 's' : ''} successfully!`}
        type="success"
        autoClose
        duration={2000}
        onClose={() => { setSuccessModal(false); router.back(); }}
      />
      <QuickQuestionSheet
        visible={showTemplateSheet}
        category={categoryParam}
        onGenerate={handleTemplateGenerate}
        onClose={handleTemplateClose}
      />
    </>
  );

  // ─── Desktop ──────────────────────────────────────────────────────────────────
  if (isDesktop) {
    return (
      <View style={s.desktopRoot}>
        <View style={s.desktopMain}>
          <View style={s.header}>
            <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={BROWN} />
              <Text style={s.backText}>Back</Text>
            </TouchableOpacity>
            <Text style={s.headerTitle}>AI Task Assistant</Text>
            <View style={s.betaBadge}><Text style={s.betaText}>BETA</Text></View>
          </View>
          <View style={{ flex: 1, maxWidth: 600, alignSelf: 'center', width: '100%' }}>
            {content}
          </View>
          {assignBtn}
        </View>
        {modals}
      {noticeHost}
      </View>
    );
  }

  // ─── Mobile ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={s.root} edges={['top']}>
      <View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn} hitSlop={10} activeOpacity={0.7}>
          <Ionicons name="chevron-back" size={22} color={BROWN} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>AI Task Assistant</Text>
        <View style={s.betaBadge}><Text style={s.betaText}>BETA</Text></View>
      </View>
      <View style={{ flex: 1 }}>{content}</View>
      {assignBtn}
      <ParentWorkModeTabBar />
      {modals}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:        { flex: 1, backgroundColor: '#FDF8F2' },
  desktopRoot: { flex: 1, backgroundColor: '#FDF8F2' },
  desktopMain: { flex: 1, flexDirection: 'column' },

  header: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: DIVIDER,
    backgroundColor: '#FFFDF9', gap: 10,
  },
  backBtn:     { flexDirection: 'row', alignItems: 'center', gap: 4 },
  backText:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },
  headerTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 17, color: DARK, flex: 1 },
  betaBadge:   { backgroundColor: '#EDE9FE', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  betaText:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 10, color: '#7C3AED', letterSpacing: 0.5 },

  scroll: { padding: 16, paddingBottom: 20 },

  // Prompt card
  promptCard: { borderRadius: 22, padding: 18, marginBottom: 20 },
  promptCardHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 },
  promptCardTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 18, color: '#3B2A18', lineHeight: 26, flex: 1, marginRight: 8 },
  sparkleWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(180,83,9,0.12)', alignItems: 'center', justifyContent: 'center' },
  inputWrap: { position: 'relative', marginBottom: 14 },
  promptInput: {
    backgroundColor: 'rgba(255,255,255,0.85)', borderRadius: 14,
    padding: 14, paddingRight: 36, paddingBottom: 28,
    fontFamily: FontFamily.fredokaRegular, fontSize: 14,
    color: '#3B2A18', minHeight: 82, textAlignVertical: 'top',
    borderWidth: 1, borderColor: 'rgba(180,83,9,0.15)',
  },
  clearBtn:  { position: 'absolute', top: 12, right: 12 },
  charCount: { position: 'absolute', bottom: 8, right: 12, fontFamily: FontFamily.fredokaRegular, fontSize: 11, color: 'rgba(120,80,20,0.5)' },
  generateBtn: { backgroundColor: NAVY, borderRadius: 14, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  generateBtnText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' },

  // Sections
  section:      { marginBottom: 20 },
  sectionTitle: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 11, color: MUTED, letterSpacing: 0.8, marginBottom: 4, textTransform: 'uppercase' },
  sectionSub:   { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED, marginBottom: 10 },

  emptyTasks:     { alignItems: 'center', paddingVertical: 28, backgroundColor: '#fff', borderRadius: 16, borderWidth: 1, borderColor: DIVIDER },
  emptyTasksText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED, textAlign: 'center' },

  // Task rows
  taskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 13, marginBottom: 8,
    borderWidth: 1, borderColor: DIVIDER,
  },
  taskRowOff:     { opacity: 0.5 },
  taskRowEditing: { borderColor: NAVY, borderWidth: 1.5, opacity: 1 },
  taskCheck: { flexShrink: 0 },
  checkFilled: { width: 22, height: 22, borderRadius: 11, backgroundColor: NAVY, alignItems: 'center', justifyContent: 'center' },
  checkEmpty:  { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: MUTED },
  taskText:    { fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK, flex: 1 },
  taskTextOff: { color: MUTED, textDecorationLine: 'line-through' },
  taskEditInput: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK, paddingVertical: 2 },

  // Add custom task
  addTaskRow: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: 14, padding: 13,
    borderWidth: 1, borderColor: DIVIDER, borderStyle: 'dashed', marginTop: 2,
  },
  addTaskInput: { flex: 1, fontFamily: FontFamily.fredokaRegular, fontSize: 14, color: DARK },

  // Helper rows
  helperRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8,
    borderWidth: 1.5, borderColor: DIVIDER,
  },
  helperRowSelected: { borderColor: NAVY, backgroundColor: '#F4F6FA' },
  helperAvatar:      { width: 46, height: 46, borderRadius: 23, flexShrink: 0 },
  helperAvatarFb:    { backgroundColor: ICON_BG, alignItems: 'center', justifyContent: 'center' },
  helperInitials:    { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: BROWN },
  helperName:        { fontFamily: FontFamily.fredokaSemiBold, fontSize: 14, color: DARK },
  helperRole:        { fontFamily: FontFamily.fredokaRegular, fontSize: 12, color: MUTED },
  suggestedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: AMBER_BG, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8,
  },
  suggestedBadgeText: { fontFamily: FontFamily.fredokaSemiBold, fontSize: 9, color: AMBER },
  helperCheck: { width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: MUTED, alignItems: 'center', justifyContent: 'center' },
  helperCheckSelected: { backgroundColor: NAVY, borderColor: NAVY },

  emptyAssign:     { paddingVertical: 20, alignItems: 'center', gap: 4 },
  emptyAssignText: { fontFamily: FontFamily.fredokaRegular, fontSize: 13, color: MUTED },

  // Sticky bottom
  stickyBottom: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4, borderTopWidth: 1, borderTopColor: DIVIDER, backgroundColor: '#FFFDF9' },
  assignBtn:    { backgroundColor: NAVY, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' },
  assignBtnText:{ fontFamily: FontFamily.fredokaSemiBold, fontSize: 15, color: '#fff' },
});
