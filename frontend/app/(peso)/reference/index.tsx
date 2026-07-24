// app/(peso)/reference/index.tsx
// PESO manages the platform taxonomy: Categories -> Job Roles -> Skills.
// A 3-column master/detail (category | its roles | the role's skills), each
// column with add / edit / delete. Delete is reference-guarded server-side, so a
// term still used by a job post or helper cannot be removed.
// PHP: peso/manage_ref_data.php

import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, useWindowDimensions,
} from "react-native";
import { theme } from "@/constants/theme";
import { useNotice } from "@/hooks/shared/useNotice";
import { ConfirmationModal } from "@/components/shared";
import API_URL from "@/constants/api";

type Category = { category_id: number; category_name: string; icon?: string | null; description?: string | null };
type Job = { job_id: number; category_id: number; job_title: string; description?: string | null };
type Skill = { skill_id: number; job_id: number; skill_name: string; description?: string | null };
type RefType = "category" | "job" | "skill";

const P = theme.color;

export default function ReferenceDataScreen() {
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
  const jobSkills = useMemo(() => skills.filter((s) => s.job_id === selJob), [skills, selJob]);

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
  const Column = ({ title, count, addLabel, onAdd, disabled, children }: any) => (
    <View style={[s.col, wide && s.colWide]}>
      <View style={s.colHead}>
        <View>
          <Text style={s.colTitle}>{title}</Text>
          <Text style={s.colCount}>{count} {count === 1 ? "item" : "items"}</Text>
        </View>
        <TouchableOpacity style={[s.addBtn, disabled && s.addBtnDisabled]} onPress={onAdd} disabled={disabled} activeOpacity={0.85}>
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addBtnText}>{addLabel}</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 16 }} showsVerticalScrollIndicator={false}>
        {children}
      </ScrollView>
    </View>
  );

  const Row = ({ label, sub, active, onPress, onEdit, onDelete, showChevron }: any) => (
    <TouchableOpacity style={[s.row, active && s.rowActive]} onPress={onPress} activeOpacity={onPress ? 0.7 : 1}>
      <View style={{ flex: 1, minWidth: 0 }}>
        <Text style={[s.rowLabel, active && { color: P.peso }]} numberOfLines={1}>{label}</Text>
        {!!sub && <Text style={s.rowSub} numberOfLines={1}>{sub}</Text>}
      </View>
      <TouchableOpacity onPress={onEdit} hitSlop={8} style={s.rowIcon}><Ionicons name="create-outline" size={17} color={P.muted} /></TouchableOpacity>
      <TouchableOpacity onPress={onDelete} hitSlop={8} style={s.rowIcon}><Ionicons name="trash-outline" size={16} color={P.danger} /></TouchableOpacity>
      {showChevron && <Ionicons name="chevron-forward" size={16} color={P.subtle} />}
    </TouchableOpacity>
  );

  if (loading) {
    return <View style={s.page}><ActivityIndicator size="large" color={P.peso} style={{ marginTop: 60 }} /></View>;
  }

  const selCatName = cats.find((c) => c.category_id === selCat)?.category_name ?? "";
  const selJobName = catJobs.find((j) => j.job_id === selJob)?.job_title ?? "";

  return (
    <View style={s.page}>
      <View style={s.header}>
        <View style={{ flex: 1 }}>
          <Text style={s.title}>Categories, Roles & Skills</Text>
          <Text style={s.subtitle}>Manage the work categories, job roles and skills the whole platform picks from.</Text>
        </View>
        <TouchableOpacity style={s.refreshBtn} onPress={() => void load()}>
          <Ionicons name="refresh" size={17} color={P.ink} /><Text style={s.refreshText}>Refresh</Text>
        </TouchableOpacity>
      </View>

      <View style={s.info}>
        <Ionicons name="information-circle-outline" size={17} color={P.peso} />
        <Text style={s.infoText}>Renaming updates everywhere instantly. An item used by a job post or a helper can't be deleted — remove those first.</Text>
      </View>

      <View style={[s.columns, !wide && { flexDirection: "column" }]}>
        {/* Categories */}
        <Column title="Categories" count={cats.length} addLabel="Category" onAdd={() => openCreate("category")}>
          {cats.map((c) => (
            <Row key={c.category_id} label={c.category_name} sub={jobs.filter((j) => j.category_id === c.category_id).length + " roles"}
              active={c.category_id === selCat} showChevron
              onPress={() => { setSelCat(c.category_id); setSelJob(null); }}
              onEdit={() => openEdit("category", c)}
              onDelete={() => setConfirmDel({ type: "category", id: c.category_id, label: c.category_name })} />
          ))}
          {cats.length === 0 && <Text style={s.empty}>No categories yet.</Text>}
        </Column>

        {/* Roles */}
        <Column title={selCatName ? `Roles in "${selCatName}"` : "Roles"} count={catJobs.length} addLabel="Role"
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
        <Column title={selJobName ? `Skills for "${selJobName}"` : "Skills"} count={jobSkills.length} addLabel="Skill"
          onAdd={() => selJob && openCreate("skill", selJob)} disabled={!selJob}>
          {!selJob ? <Text style={s.empty}>Pick a role.</Text> : jobSkills.map((sk) => (
            <Row key={sk.skill_id} label={sk.skill_name} sub={sk.description || undefined}
              onEdit={() => openEdit("skill", sk)}
              onDelete={() => setConfirmDel({ type: "skill", id: sk.skill_id, label: sk.skill_name })} />
          ))}
          {selJob && jobSkills.length === 0 && <Text style={s.empty}>No skills for this role yet.</Text>}
        </Column>
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
              placeholderTextColor={P.subtle} autoFocus />

            {editor?.type === "category" && (
              <>
                <Text style={s.label}>Icon <Text style={s.opt}>(Ionicons name, optional)</Text></Text>
                <TextInput style={s.input} value={editor?.icon} onChangeText={(v) => setEditor((e) => e && { ...e, icon: v })} placeholder="e.g. medkit" placeholderTextColor={P.subtle} />
              </>
            )}

            <Text style={s.label}>Description <Text style={s.opt}>(optional)</Text></Text>
            <TextInput style={[s.input, s.multiline]} value={editor?.description} onChangeText={(v) => setEditor((e) => e && { ...e, description: v })}
              placeholder="Short description" placeholderTextColor={P.subtle} multiline />

            <View style={s.modalRow}>
              <TouchableOpacity style={[s.mBtn, s.mCancel]} onPress={() => setEditor(null)}><Text style={s.mCancelText}>Cancel</Text></TouchableOpacity>
              <TouchableOpacity style={[s.mBtn, s.mSave, saving && { opacity: 0.6 }]} onPress={save} disabled={saving}>
                {saving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={s.mSaveText}>{editor?.mode === "create" ? "Add" : "Save"}</Text>}
              </TouchableOpacity>
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

const s = StyleSheet.create({
  page: { flex: 1, backgroundColor: P.canvasPeso, padding: 20 },
  header: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 14 },
  title: { fontSize: 26, fontWeight: "800", color: P.ink, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: P.muted, marginTop: 3, maxWidth: 640 },
  refreshBtn: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: P.line, backgroundColor: P.surface, paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10 },
  refreshText: { fontSize: 13, fontWeight: "700", color: P.ink },

  info: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: P.pesoSoft, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 12.5, color: P.inkMuted, lineHeight: 18 },

  columns: { flex: 1, flexDirection: "row", gap: 14 },
  col: { flex: 1, backgroundColor: P.surface, borderRadius: 16, borderWidth: 1, borderColor: P.line, padding: 14, minHeight: 200 },
  colWide: { maxWidth: 460 },
  colHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  colTitle: { fontSize: 15, fontWeight: "800", color: P.ink },
  colCount: { fontSize: 11.5, color: P.subtle, marginTop: 1 },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: P.peso, borderRadius: 9, paddingHorizontal: 11, paddingVertical: 7 },
  addBtnDisabled: { backgroundColor: P.subtle, opacity: 0.5 },
  addBtnText: { color: "#fff", fontSize: 12.5, fontWeight: "700" },

  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 11, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, borderColor: "transparent", marginBottom: 6 },
  rowActive: { backgroundColor: P.pesoSoft, borderColor: P.peso },
  rowLabel: { fontSize: 14, fontWeight: "700", color: P.ink },
  rowSub: { fontSize: 11.5, color: P.muted, marginTop: 1 },
  rowIcon: { padding: 3 },
  empty: { fontSize: 13, color: P.subtle, textAlign: "center", paddingVertical: 24 },

  modalBg: { flex: 1, backgroundColor: "rgba(42,20,9,0.45)", alignItems: "center", justifyContent: "center", padding: 22 },
  modalCard: { width: "100%", maxWidth: 460, backgroundColor: P.surface, borderRadius: 18, padding: 22 },
  modalTitle: { fontSize: 18, fontWeight: "800", color: P.ink, marginBottom: 6 },
  label: { fontSize: 13, fontWeight: "700", color: P.inkMuted, marginTop: 14, marginBottom: 6 },
  opt: { fontSize: 11, fontWeight: "400", color: P.subtle },
  input: { borderWidth: 1, borderColor: P.line, borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14.5, color: P.ink, backgroundColor: P.canvasPeso, ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}) },
  multiline: { minHeight: 70, textAlignVertical: "top" },
  modalRow: { flexDirection: "row", gap: 10, marginTop: 20 },
  mBtn: { flex: 1, paddingVertical: 12, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  mCancel: { borderWidth: 1, borderColor: P.line, backgroundColor: P.surface },
  mCancelText: { fontWeight: "700", color: P.ink },
  mSave: { backgroundColor: P.peso },
  mSaveText: { fontWeight: "800", color: "#fff" },
});
