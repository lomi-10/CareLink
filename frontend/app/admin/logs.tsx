import React, { useEffect, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../../constants/api";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminTheme, type AdminPalette } from "@/contexts/AdminThemeContext";

export default function AdminLogsScreen() {
  const { palette: c } = useAdminTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterRole, setFilterRole] = useState<'all' | 'parent' | 'helper' | 'admin'>('all');

  useEffect(() => { fetchLogs(); }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem("user_data");
      const adminUserId = raw ? JSON.parse(raw)?.user_id : "";
      const response = await fetch(`${API_URL}/admin/admin_get_logs.php?admin_user_id=${adminUserId}`);
      const data = await response.json();
      setLogs(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getProcessedLogs = () => {
    const processed = logs.filter((log) => filterRole === 'all' ? true : (log.role || "").toLowerCase() === filterRole);
    return processed.sort((a, b) => {
      const da = new Date(a.timestamp).getTime();
      const db = new Date(b.timestamp).getTime();
      return sortOrder === 'asc' ? da - db : db - da;
    });
  };

  const toggleSort = () => setSortOrder((p) => (p === 'desc' ? 'asc' : 'desc'));

  const renderHeader = () => (
    <View style={[s.row, s.headerRow]}>
      <Text style={[s.cell, s.headerText, { flex: 1.6 }]}>ACTION</Text>
      <Text style={[s.cell, s.headerText, { flex: 1.4 }]}>TIME</Text>
      <Text style={[s.cell, s.headerText, { flex: 1.5 }]}>USER</Text>
      <Text style={[s.cell, s.headerText, { flex: 1 }]}>ROLE</Text>
      <Text style={[s.cell, s.headerText, { flex: 1 }]}>STATUS</Text>
      {Platform.OS === 'web' && (
        <>
          <Text style={[s.cell, s.headerText, { flex: 1.5 }]}>IP ADDRESS</Text>
          <Text style={[s.cell, s.headerText, { flex: 3 }]}>DEVICE</Text>
        </>
      )}
    </View>
  );

  const renderItem = ({ item, index }: { item: any; index: number }) => {
    const statusColor = item.status?.toLowerCase().includes('success') ? c.green
      : (item.status?.toLowerCase().includes('failed') || item.status?.toLowerCase().includes('pending')) ? c.red
      : c.muted;
    const isAdmin = item.role === 'admin';

    return (
      <View style={[s.row, { backgroundColor: index % 2 === 0 ? 'transparent' : c.rowAlt }]}>
        <View style={{ flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <View style={[s.dot, { backgroundColor: statusColor }]} />
          {/* flexShrink REQUIRED (RN defaults it to 0): a long action like
              VERIFY_DOCUMENT_APPROVE otherwise overflowed onto the timestamp. */}
          <Text style={[s.cellText, { fontWeight: '600', flexShrink: 1 }]} numberOfLines={1}>{item.action}</Text>
        </View>
        <Text style={[s.cellText, { flex: 1.4, color: c.subtle, fontSize: 11 }]} numberOfLines={1}>{item.timestamp}</Text>
        <Text style={[s.cellText, { flex: 1.5, fontWeight: '500' }]} numberOfLines={1}>{item.username || "Unknown"}</Text>
        <View style={{ flex: 1, alignItems: 'flex-start' }}>
          <View style={[s.roleBadge, { backgroundColor: isAdmin ? c.accentSoft : c.rowAlt }]}>
            <Text style={[s.roleText, { color: isAdmin ? c.accent : c.muted }]}>{item.role?.toUpperCase()}</Text>
          </View>
        </View>
        <Text style={[s.cellText, { flex: 1, color: statusColor, fontWeight: '600' }]} numberOfLines={1}>{item.status}</Text>
        {Platform.OS === 'web' && (
          <>
            <Text style={[s.cellText, { flex: 1.5, fontSize: 11, color: c.subtle, fontFamily: 'monospace' }]} numberOfLines={1}>{item.ip_address || "-"}</Text>
            <Text style={[s.cellText, { flex: 3, fontSize: 11, color: c.subtle }]} numberOfLines={1}>{item.device_info}</Text>
          </>
        )}
      </View>
    );
  };

  const FilterChip = ({ label, value }: { label: string; value: typeof filterRole }) => (
    <TouchableOpacity style={[s.chip, filterRole === value && s.chipActive]} onPress={() => setFilterRole(value)}>
      <Text style={[s.chipText, filterRole === value && s.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const headerRight = (
    <>
      <TouchableOpacity onPress={toggleSort} style={s.iconBtn}>
        <Ionicons name={sortOrder === 'desc' ? "arrow-down" : "arrow-up"} size={18} color={c.text} />
      </TouchableOpacity>
      <TouchableOpacity onPress={fetchLogs} style={s.iconBtn}>
        <Ionicons name="refresh" size={18} color={c.text} />
      </TouchableOpacity>
    </>
  );

  return (
    <AdminShell active="logs" title="Audit Trail" subtitle={`${getProcessedLogs().length} records found`} headerRight={headerRight} scroll={false}>
      <View style={s.filterRow}>
        <FilterChip label="All" value="all" />
        <FilterChip label="Parents" value="parent" />
        <FilterChip label="Helpers" value="helper" />
        <FilterChip label="Admins" value="admin" />
      </View>

      <View style={s.tableCard}>
        {renderHeader()}
        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 50 }} color={c.accent} />
        ) : (
          <FlatList
            data={getProcessedLogs()}
            renderItem={renderItem}
            keyExtractor={(item) => item.log_id?.toString() || Math.random().toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={<Text style={s.empty}>No logs found for this filter.</Text>}
          />
        )}
      </View>
    </AdminShell>
  );
}

const makeStyles = (c: AdminPalette) => StyleSheet.create({
  iconBtn: { width: 40, height: 40, borderRadius: 10, backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center" },
  filterRow: { flexDirection: "row", gap: 10, marginBottom: 14, flexWrap: "wrap" },
  chip: { paddingVertical: 8, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel },
  chipActive: { backgroundColor: c.accent, borderColor: c.accent },
  chipText: { color: c.muted, fontWeight: "700", fontSize: 13 },
  chipTextActive: { color: "#fff" },

  tableCard: { flex: 1, backgroundColor: c.panel, borderRadius: 14, borderWidth: 1, borderColor: c.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 13, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: c.border },
  headerRow: { backgroundColor: c.panel2, borderBottomColor: c.border },
  cell: { paddingRight: 8 },
  headerText: { fontSize: 11, fontWeight: "800", color: c.subtle, letterSpacing: 0.6 },
  cellText: { fontSize: 12.5, color: c.text, paddingRight: 8 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  roleBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  roleText: { fontSize: 10, fontWeight: "800", letterSpacing: 0.5 },
  empty: { fontSize: 14, color: c.muted, textAlign: "center", marginTop: 50 },
});
