// app/(peso)/reference/index.tsx
// PESO manages the platform taxonomy: Categories -> Job Roles -> Skills.
// A 3-column master/detail (category | its roles | the role's skills), each
// column with add / edit / delete. Delete is reference-guarded server-side, so a
// term still used by a job post or helper cannot be removed.
// Shared PESO design system: theme-aware (light/dark), animated, branded backdrop.
// PHP: peso/manage_ref_data.php

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions,
} from "react-native";
import { useNotice } from "@/hooks/shared/useNotice";
import { ConfirmationModal } from "@/components/shared";
import API_URL from "@/constants/api";
import {
  usePesoTheme, ScreenHeader, PButton, IconButton, AnimateIn, layout, font, radius, space,
} from "@/components/peso/ui";
import { type PesoColors } from "@/contexts/PesoThemeContext";

type Category = { category_id: number; category_name: string; icon?: string | null; description?: string | null };
type Job = { job_id: number; category_id: number; job_title: string; description?: string | null };
type Skill = { skill_id: number; job_id: number; skill_name: string; description?: string | null };
type RefType = "category" | "job" | "skill";

export default function ReferenceDataScreen() {
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);
  const { notify, noticeHost } = useNotice();
  const { width } = useWindowDimensions();
  const wide = width > 900;

  const [staffId, setStaffId] = useState(0);
  const [loading, setLoading] = useState(true);
  const [cats, setCats] = useState<Category[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selCat, setSelCat] = useState<number | null>(null);
  const [selJob, setSelJob] = useState<number | null>(null);

  // editor modal
  const [editor, setEditor] = useState<{ type: RefType; mode: "create" | "edit"; id?: number; parentId?: number; name: string; description: string; icon: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDel, setConfirmDel] = useState<{ type: RefType; id: number; label: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem("user_data");
      const id = raw ? Number(JSON.parse(raw)?.user_id) : 0;
      setStaffId(id);
      const res = await fetch(`${API_URL}/peso/manage_ref_data.php?staff_user_id=${id}`);
      const data = await res.json();
      if (data.success) {
        setCats(data.categories || []);
        setJobs(data.jobs || []);
        setSkills(data.skills || []);
        setSelCat((prev) => prev ?? (data.categories?.[0]?.category_id ?? null));
      } else {
        notify("Couldn't load", data.message || "Please try again.");
      }
    } catch {
      notify("Offline", "Couldn't reach the server.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const catJobs = useMemo(() => jobs.filter((j) => j.category_id === selCat), [jobs, selCat]);
  const jobSkills = useMemo(() => skills.filter((sk) => sk.job_id === selJob), [skills, selJob]);

  // Keep selections valid as data changes.
  useEffect(() => { if (selCat && !catJobs.some((j) => j.job_id === selJob)) setSelJob(catJobs[0]?.job_id ?? null); }, [selCat, catJobs]); // eslint-disable-line

  const save = async () => {
    if (!editor) return;
    if (!editor.name.trim()) { notify("Name required", "Please enter a name."); return; }
    setSaving(true);
    try {
      const body: any = {
        action: editor.mode, type: editor.type,
        name: editor.name.trim(), description: editor.description.trim(), icon: editor.icon.trim(),
      };
      if (editor.mode === "edit") body.id = editor.id; else body.parent_id = editor.parentId;
      const res = await fetch(`${API_URL}/peso/manage_ref_data.php?staff_user_id=${staffId}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) { setEditor(null); await load(); }
      else notify("Couldn't save", data.message || "Please try again.");
    } catch {
      notify("Offline", "Couldn't reach the server.");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!confirmDel) return;
    const { type, id } = confirmDel;
    setConfirmDel(null);
    try {
      const res = await fetch(`${API_URL}/peso/manage_ref_data.php?staff_user_id=${staffId}`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", type, id }),
      });
      const data = await res.json();
      if (data.success) await load();
      else notify("Can't delete", data.message || "This item is in use."); // reference-guard message
    } catch {
      notify("Offline", "Couldn't reach the server.");
    }
  };

  const openCreate = (type: RefType, parentId?: number) => setEditor({ type, mode: "create", parentId, name: "", description: "", icon: "" });
  const openEdit = (type: RefType, row: any) =>
    setEditor({
      type, mode: "edit", id: row.category_id ?? row.job_id ?? row.skill_id,
      name: row.category_name ?? row.job_title ?? row.skill_name,
      description: row.description ?? "", icon: row.icon ?? "",
    });

  // ── Column ──
  const Column = ({ title, count, addLabel, onAdd, disabled, delay, children }: any) => (
    <AnimateIn delay={delay} style={[s.col, wide && s.colWide]}>
      <View style={s.colHead}>
        <View>
          <Text style={s.colTitle}>{title}</Text>
          <Text style={s.colCount}>{count} {count === 1 ? "item" : "items"}</Text>
        </View>
        <Pressable onPress={onAdd} disabled={disabled}
          style={({ hovered }: any) => [s.addBtn, disabled && s.addBtnDisabled, hovered && !disabled && { backgroundColor: c.accent2 }]}>
          <Ionicons name="add" size={16} color={c.onAccent} />
          <Text style={s.addBtnText}>{addLabel}</Text>
        </Pressable>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </AnimateIn>
  );

  const Row = ({ label, sub, active, onPress, onEdit, onDelete, showChevron }: any) => (
    <Pressable onPress={onPress}
      style={({ hovered }: any) => [s.row, active && s.rowActive, hovered && !active && s.rowHover]}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.rowLabel, active && { color: c.accentInk }]} numberOfLines={1}>{label}</Text>
        {!!sub && <Text style={s.rowSub} numberOfLines={1}>{sub}</Text>}
      </View>
      <Pressable onPress={onEdit} hitSlop={8} style={s.rowIcon}><Ionicons name="create-outline" size={17} color={c.muted} /></Pressable>
      <Pressable onPress={onDelete} hitSlop={8} style={s.rowIcon}><Ionicons name="trash-outline" size={16} color={c.bad} /></Pressable>
      {showChevron && <Ionicons name="chevron-forward" size={16} color={active ? c.accent : c.subtle} />}
    </Pressable>
  );

  const selCatName = cats.find((cat) => cat.category_id === selCat)?.category_name ?? "";
  const selJobName = catJobs.find((j) => j.job_id === selJob)?.job_title ?? "";

  return (
    <View style={layout.page(c.canvas)}>
      <ScreenHeader eyebrow="Platform Taxonomy" title="Categories, Roles & Skills"
        subtitle="Manage the work categories, job roles and skills the whole platform picks from."
        right={<IconButton icon="refresh" tone="accent" onPress={load} />} />

      <View style={{ flex: 1, paddingHorizontal: space.xl, paddingTop: space.md }}>
        <View style={s.info}>
          <Ionicons name="information-circle-outline" size={17} color={c.accent} />
          <Text style={s.infoText}>Renaming updates everywhere instantly. An item used by a job post or a helper can't be deleted — remove those first.</Text>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 40 }} />
        ) : (
          <View style={[s.columns, !wide && { flexDirection: "column" }]}>
            {/* Categories */}
            <Column title="Categories" count={cats.length} addLabel="Category" delay={120} onAdd={() => openCreate("category")}>
              {cats.map((cat) => (
                <Row key={cat.category_id} label={cat.category_name} sub={jobs.filter((j) => j.category_id === cat.category_id).length + " roles"}
                  active={cat.category_id === selCat} showChevron
                  onPress={() => { setSelCat(cat.category_id); setSelJob(null); }}
                  onEdit={() => openEdit("category", cat)}
                  onDelete={() => setConfirmDel({ type: "category", id: cat.category_id, label: cat.category_name })} />
              ))}
              {cats.length === 0 && <Text style={s.empty}>No categories yet.</Text>}
            </Column>

            {/* Roles */}
            <Column title={selCatName ? `Roles in "${selCatName}"` : "Roles"} count={catJobs.length} addLabel="Role" delay={180}
              onAdd={() => selCat && openCreate("job", selCat)} disabled={!selCat}>
              {!selCat ? <Text style={s.empty}>Pick a category.</Text> : catJobs.map((j) => (
                <Row key={j.job_id} label={j.job_title} sub={skills.filter((sk) => sk.job_id === j.job_id).length + " skills"}
                  active={j.job_id === selJob} showChevron
                  onPress={() => setSelJob(j.job_id)}
                  onEdit={() => openEdit("job", j)}
                  onDelete={() => setConfirmDel({ type: "job", id: j.job_id, label: j.job_title })} />
              ))}
              {selCat && catJobs.length === 0 && <Text style={s.empty}>No roles in this category yet.</Text>}
            </Column>

            {/* Skills */}
            <Column title={selJobName ? `Skills for "${selJobName}"` : "Skills"} count={jobSkills.length} addLabel="Skill" delay={240}
              onAdd={() => selJob && openCreate("skill", selJob)} disabled={!selJob}>
              {!selJob ? <Text style={s.empty}>Pick a role.</Text> : jobSkills.map((sk) => (
                <Row key={sk.skill_id} label={sk.skill_name} sub={sk.description || undefined}
                  onEdit={() => openEdit("skill", sk)}
                  onDelete={() => setConfirmDel({ type: "skill", id: sk.skill_id, label: sk.skill_name })} />
              ))}
              {selJob && jobSkills.length === 0 && <Text style={s.empty}>No skills for this role yet.</Text>}
            </Column>
          </View>
        )}
      </View>

      {/* Editor modal */}
      <Modal visible={!!editor} transparent animationType="fade" onRequestClose={() => setEditor(null)}>
        <View style={s.modalBg}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>
              {editor?.mode === "create" ? "Add" : "Edit"} {editor?.type === "category" ? "Category" : editor?.type === "job" ? "Job Role" : "Skill"}
            </Text>

            <Text style={s.label}>Name</Text>
            <TextInput style={s.input} value={editor?.name} onChangeText={(v) => setEditor((e) => e && { ...e, name: v })}
              placeholder={editor?.type === "category" ? "e.g. Elder Care" : editor?.type === "job" ? "e.g. Caregiver" : "e.g. Vital Signs Monitoring"}
              placeholderTextColor={c.subtle} autoFocus />

            {editor?.type === "category" && (
              <>
                <Text style={s.label}>Icon <Text style={s.opt}>(Ionicons name, optional)</Text></Text>
                <TextInput style={s.input} value={editor?.icon} onChangeText={(v) => setEditor((e) => e && { ...e, icon: v })} placeholder="e.g. medkit" placeholderTextColor={c.subtle} />
              </>
            )}

            <Text style={s.label}>Description <Text style={s.opt}>(optional)</Text></Text>
            <TextInput style={[s.input, s.multiline]} value={editor?.description} onChangeText={(v) => setEditor((e) => e && { ...e, description: v })}
              placeholder="Short description" placeholderTextColor={c.subtle} multiline />

            <View style={{ flexDirection: "row", gap: 10, marginTop: 20, alignItems: "center" }}>
              <PButton label="Cancel" variant="ghost" full style={{ flex: 1 }} onPress={() => setEditor(null)} />
              <PButton label={editor?.mode === "create" ? "Add" : "Save"} loading={saving} full style={{ flex: 1 }} onPress={save} />
            </View>
          </View>
        </View>
      </Modal>

      <ConfirmationModal
        visible={!!confirmDel}
        title={`Delete "${confirmDel?.label}"?`}
        message="This can't be undone. Items in use by a job post or helper are protected and won't be deleted."
        confirmText="Delete" cancelText="Cancel" type="danger"
        onConfirm={doDelete} onCancel={() => setConfirmDel(null)}
      />
      {noticeHost}
    </View>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  info: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: c.accentSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 12.5, color: c.accentInk, lineHeight: 18, fontFamily: font.regular },

  columns: { flex: 1, flexDirection: "row", gap: 14 },
  col: { flex: 1, backgroundColor: c.surface, borderRadius: 16, borderWidth: 1, borderColor: c.line, padding: 14, minHeight: 200 },
  colWide: { maxWidth: 460 },
  colHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  colTitle: { fontSize: 15, fontFamily: font.display, color: c.ink },
  colCount: { fontSize: 11.5, color: c.subtle, marginTop: 1, fontFamily: font.regular },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.accent, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7, ...(({ transitionDuration: "140ms" }) as any) },
  addBtnDisabled: { backgroundColor: c.subtle, opacity: 0.5 },
  addBtnText: { color: c.onAccent, fontSize: 12.5, fontFamily: font.semibold },

  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "transparent", marginBottom: 6, ...(({ transitionDuration: "140ms" }) as any) },
  rowActive: { backgroundColor: c.accentSoft, borderColor: c.accent },
  rowHover: { backgroundColor: c.raise },
  rowLabel: { fontSize: 14, fontFamily: font.semibold, color: c.ink },
  rowSub: { fontSize: 11.5, color: c.muted, marginTop: 1, fontFamily: font.regular },
  rowIcon: { padding: 3 },
  empty: { fontSize: 13, color: c.subtle, textAlign: "center", paddingVertical: 24, fontFamily: font.regular },

  modalBg: { flex: 1, backgroundColor: c.overlay, alignItems: "center", justifyContent: "center", padding: 22 },
  modalCard: { width: "100%", maxWidth: 460, backgroundColor: c.surface, borderRadius: 18, padding: 22, borderWidth: 1, borderColor: c.line },
  modalTitle: { fontSize: 18, fontFamily: font.display, color: c.ink, marginBottom: 6 },
  label: { fontSize: 13, fontFamily: font.semibold, color: c.muted, marginTop: 14, marginBottom: 6 },
  opt: { fontSize: 11, fontFamily: font.regular, color: c.subtle },
  input: { borderWidth: 1, borderColor: c.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14.5, color: c.ink, backgroundColor: c.sunken, fontFamily: font.regular, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) },
  multiline: { minHeight: 70, textAlignVertical: "top" },
});
