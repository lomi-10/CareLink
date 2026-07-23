import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View,
} from "react-native";
import { NotificationModal } from "@/components/shared/NotificationModal";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminTheme, type AdminPalette } from "@/contexts/AdminThemeContext";
import API_URL from "../../constants/api";

export default function UserManagementScreen() {
  const { palette: c } = useAdminTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // 'all' or 'pending'
  const [searchQuery, setSearchQuery] = useState("");
  const [adminId, setAdminId] = useState<number>(0);
  const [toast, setToast] = useState<{ visible: boolean; type: "success" | "error" | "warning" | "info"; message: string; title?: string }>({ visible: false, type: "info", message: "" });

  useEffect(() => { loadAdmin(); fetchUsers(); }, [filter]);

  const loadAdmin = async () => {
    const raw = await AsyncStorage.getItem("user_data");
    if (raw) setAdminId(Number(JSON.parse(raw)?.user_id) || 0);
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const endpoint = filter === 'pending'
        ? `${API_URL}/admin_get_users.php?status=pending`
        : `${API_URL}/admin_get_users.php`;
      const response = await fetch(endpoint);
      const data = await response.json();
      setUsers(Array.isArray(data) ? data : []);
    } catch (error) {
      setToast({ visible: true, type: "error", message: "Failed to fetch users.", title: "Error" });
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (targetUserId: number, newStatus: string) => {
    try {
      const response = await fetch(`${API_URL}/admin_update_status.php`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_user_id: targetUserId, new_status: newStatus, admin_id: adminId }),
      });
      const result = await response.json();
      if (result.success) {
        setToast({ visible: true, type: "success", message: result.message, title: "Success" });
        fetchUsers();
      } else {
        setToast({ visible: true, type: "error", message: result.message, title: "Failed" });
      }
    } catch (error) {
      setToast({ visible: true, type: "error", message: "Could not update status.", title: "Error" });
    }
  };

  const filteredUsers = users.filter(u => {
    const q = searchQuery.toLowerCase();
    return (u.name || "").toLowerCase().includes(q) || (u.email || "").toLowerCase().includes(q);
  });

  const roleLabel = (t: string) => t === 'admin' ? 'SUPER ADMIN' : t === 'peso' ? 'PESO OFFICER' : (t || '').toUpperCase();
  const statusStyle = (st: string) => st === 'approved' ? { bg: c.accentSoft, fg: c.green } : st === 'pending' ? { bg: 'rgba(232,163,61,0.16)', fg: c.amber } : { bg: c.redSoft, fg: c.red };

  const renderUserCard = ({ item }: { item: any }) => {
    const isStaff = item.user_type === 'peso' || item.user_type === 'admin';
    const ss = statusStyle(item.status);
    return (
      <View style={s.card}>
        <View style={s.cardHeader}>
          <View style={{ flex: 1 }}>
            <Text style={s.userName}>{item.name}</Text>
            <Text style={s.userEmail}>{item.email}</Text>
            <View style={s.metaRow}>
              <View style={s.roleBadge}><Text style={s.roleText}>{roleLabel(item.user_type)}</Text></View>
              {item.doc_count > 0 && (
                <View style={s.docBadge}>
                  <Ionicons name="document-attach" size={10} color={c.green} />
                  <Text style={s.docBadgeText}>{item.doc_count} Documents</Text>
                </View>
              )}
            </View>
          </View>
          <View style={[s.statusBadge, { backgroundColor: ss.bg }]}>
            <Text style={[s.statusText, { color: ss.fg }]}>{(item.status || '').toUpperCase()}</Text>
          </View>
        </View>

        {/* Actions. Super Admin does NOT approve helpers/parents — that verification
            is PESO's job (they review the documents). The Super Admin's power over
            those accounts is enforcement: suspend a bad actor, or lift a suspension.
            Only staff (PESO/admin) accounts can be approved here. */}
        <View style={s.actionRow}>
          {item.status === 'suspended' ? (
            <TouchableOpacity style={[s.actionButton, s.btnApprove]} onPress={() => handleStatusUpdate(item.user_id, isStaff ? 'approved' : 'pending')}>
              <Ionicons name="refresh" size={16} color="#fff" />
              <Text style={s.btnText}>Reactivate</Text>
            </TouchableOpacity>
          ) : (
            <>
              {isStaff && item.status === 'pending' && (
                <TouchableOpacity style={[s.actionButton, s.btnApprove]} onPress={() => handleStatusUpdate(item.user_id, 'approved')}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={s.btnText}>Approve</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity style={[s.actionButton, s.btnSuspend]} onPress={() => handleStatusUpdate(item.user_id, 'suspended')}>
                <Ionicons name="ban" size={16} color="#fff" />
                <Text style={s.btnText}>Suspend</Text>
              </TouchableOpacity>
            </>
          )}
          {!isStaff && item.status === 'pending' && (
            <View style={s.pesoNote}>
              <Ionicons name="information-circle-outline" size={13} color={c.subtle} />
              <Text style={s.pesoNoteText}>Approved by PESO after document review</Text>
            </View>
          )}
        </View>
      </View>
    );
  };

  const refreshBtn = (
    <TouchableOpacity onPress={fetchUsers} style={{ width: 40, height: 40, borderRadius: 10, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="refresh" size={18} color={c.text} />
    </TouchableOpacity>
  );

  return (
    <AdminShell active="users" title="User Verification" subtitle="Approve staff, suspend or reactivate any account" headerRight={refreshBtn} scroll={false}>
      {/* Tabs */}
      <View style={s.tabsRow}>
        {(['all', 'pending'] as const).map((f) => (
          <TouchableOpacity key={f} style={[s.tab, filter === f && s.tabActive]} onPress={() => setFilter(f)}>
            <Text style={[s.tabText, filter === f && s.tabTextActive]}>{f === 'all' ? 'All Users' : 'Pending Approval'}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Search */}
      <View style={s.search}>
        <Ionicons name="search" size={18} color={c.subtle} />
        <TextInput placeholder="Search name or email..." placeholderTextColor={c.subtle} style={s.searchInput} value={searchQuery} onChangeText={setSearchQuery} />
      </View>

      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => String(item.user_id)}
          renderItem={renderUserCard}
          contentContainerStyle={{ paddingBottom: 40 }}
          ListEmptyComponent={<Text style={s.empty}>No users found.</Text>}
        />
      )}

      <NotificationModal visible={toast.visible} title={toast.title} message={toast.message} type={toast.type} onClose={() => setToast((t) => ({ ...t, visible: false }))} autoClose={toast.type === "success"} duration={2200} />
    </AdminShell>
  );
}

const makeStyles = (c: AdminPalette) => StyleSheet.create({
  tabsRow: { flexDirection: "row", gap: 10, marginBottom: 14 },
  tab: { paddingVertical: 9, paddingHorizontal: 18, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel },
  tabActive: { backgroundColor: c.accent, borderColor: c.accent },
  tabText: { color: c.muted, fontWeight: "700", fontSize: 13.5 },
  tabTextActive: { color: "#fff" },

  search: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 11, marginBottom: 16 },
  searchInput: { flex: 1, color: c.text, fontSize: 14.5, ...(({ outlineStyle: "none" } as any)) },

  card: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 14, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between", gap: 12 },
  userName: { fontSize: 16, fontWeight: "800", color: c.text },
  userEmail: { fontSize: 13, color: c.muted, marginTop: 2 },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8, flexWrap: "wrap" },
  roleBadge: { backgroundColor: c.accentSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 10.5, fontWeight: "800", color: c.accent, letterSpacing: 0.5 },
  docBadge: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: c.accentSoft, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  docBadgeText: { fontSize: 10.5, fontWeight: "700", color: c.green },
  statusBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.5 },

  actionRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 14, flexWrap: "wrap" },
  actionButton: { flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 10 },
  btnApprove: { backgroundColor: c.accent },
  btnSuspend: { backgroundColor: c.red },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  pesoNote: { flexDirection: "row", alignItems: "center", gap: 5, flex: 1, minWidth: 180 },
  pesoNoteText: { fontSize: 11.5, color: c.subtle, fontStyle: "italic" },

  empty: { fontSize: 14, color: c.muted, textAlign: "center", marginTop: 50 },
});
