import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  Platform
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import API_URL from "../../constants/api";

export default function AdminLogsScreen() {
  const router = useRouter();
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 1. State for Sorting and Filtering
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc'); // Default: Newest first
  const [filterRole, setFilterRole] = useState<'all' | 'parent' | 'helper' | 'admin'>('all');

  useEffect(() => {
    fetchLogs();
  }, []);

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

  // 2. Logic: Filter FIRST, then Sort
  const getProcessedLogs = () => {
    // Step A: Filter
    let processed = logs.filter(log => {
      if (filterRole === 'all') return true; // Show everyone
      // Compare roles (handle nulls safely)
      return (log.role || "").toLowerCase() === filterRole;
    });

    // Step B: Sort (By Date)
    return processed.sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      
      if (sortOrder === 'asc') {
        return dateA - dateB; // Oldest first
      } else {
        return dateB - dateA; // Newest first
      }
    });
  };

  const toggleSort = () => {
    setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
  };

  // Render the Table Header
  const renderHeader = () => (
    <View style={[styles.row, styles.headerRow]}>
      <Text style={[styles.cell, styles.headerText, { flex: 1.6 }]}>ACTION</Text>
      <Text style={[styles.cell, styles.headerText, { flex: 1.4 }]}>TIME</Text>
      <Text style={[styles.cell, styles.headerText, { flex: 1.5 }]}>USER</Text>
      <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>ROLE</Text>
      <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>STATUS</Text>
      {Platform.OS === 'web' && (
        <>
          <Text style={[styles.cell, styles.headerText, { flex: 1.5 }]}>IP ADDRESS</Text>
          <Text style={[styles.cell, styles.headerText, { flex: 3 }]}>DEVICE</Text>
        </>
      )}
    </View>
  );

  // Render each Row
  const renderItem = ({ item, index }: { item: any, index: number }) => {
    const isRowEven = index % 2 === 0;
    
    // Status Colors
    let statusColor = '#7C6047';
    if (item.status?.toLowerCase().includes('success')) statusColor = '#059669'; // Green
    if (item.status?.toLowerCase().includes('failed') || item.status?.toLowerCase().includes('pending')) statusColor = '#DC2626'; // Red

    // Role Colors
    const roleBadgeColor = item.role === 'admin' ? '#E6F4EF' : '#EFE4D5';
    const roleTextColor = item.role === 'admin' ? '#0F7B54' : '#7C6047';

    return (
      <View style={[styles.row, { backgroundColor: isRowEven ? '#fff' : '#FAF7F1' }]}>
        {/* Action Column */}
        <View style={{flex: 1.6, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0}}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          {/* flexShrink is REQUIRED: RN defaults it to 0 (CSS defaults to 1), so a
              long action like VERIFY_DOCUMENT_APPROVE overflowed this column and
              printed on top of the timestamp next to it. */}
          <Text style={[styles.cellText, { fontWeight: '600', flexShrink: 1 }]} numberOfLines={1}>
            {item.action}
          </Text>
        </View>

        <Text style={[styles.cellText, { flex: 1.4, color: '#A8927A', fontSize: 11 }]} numberOfLines={1}>
          {item.timestamp}
        </Text>

        <Text style={[styles.cellText, { flex: 1.5, fontWeight: '500' }]}>
          {item.username || "Unknown"}
        </Text>

        <View style={{flex: 1, alignItems: 'flex-start'}}>
          <View style={[styles.roleBadge, { backgroundColor: roleBadgeColor }]}>
            <Text style={[styles.roleText, { color: roleTextColor }]}>
              {item.role?.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text style={[styles.cellText, { flex: 1, color: statusColor, fontWeight: '500' }]}>
          {item.status}
        </Text>
        
        {Platform.OS === 'web' && (
          <>
            <Text style={[styles.cellText, { flex: 1.5, fontSize: 11, color: '#999', fontFamily: 'monospace' }]}>
              {item.ip_address || "-"}
            </Text>
            <Text style={[styles.cellText, { flex: 3, fontSize: 11, color: '#999' }]} numberOfLines={1} ellipsizeMode="tail">
              {item.device_info}
            </Text>
          </>
        )}
      </View>
    );
  };

  // Helper Component for Filter Chips
  const FilterChip = ({ label, value }: { label: string, value: typeof filterRole }) => (
    <TouchableOpacity 
      style={[
        styles.filterChip, 
        filterRole === value && styles.filterChipActive
      ]}
      onPress={() => setFilterRole(value)}
    >
      <Text style={[
        styles.filterText, 
        filterRole === value && styles.filterTextActive
      ]}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#2B1608" />
        </TouchableOpacity>
        <View>
          <Text style={styles.pageTitle}>Audit Trail</Text>
          <Text style={styles.pageSubtitle}>
            {getProcessedLogs().length} Records Found
          </Text>
        </View>
        
        <View style={{flexDirection: 'row', gap: 10}}>
          {/* Sort Button */}
          <TouchableOpacity onPress={toggleSort} style={styles.iconBtn}>
            <Ionicons 
              name={sortOrder === 'desc' ? "arrow-down" : "arrow-up"} 
              size={20} 
              color="#0F7B54" 
            />
          </TouchableOpacity>

          {/* Refresh Button */}
          <TouchableOpacity onPress={fetchLogs} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color="#0F7B54" />
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. FILTER BAR */}
      <View style={styles.filterContainer}>
        <FilterChip label="All" value="all" />
        <FilterChip label="Parents" value="parent" />
        <FilterChip label="Helpers" value="helper" />
        <FilterChip label="Admins" value="admin" />
      </View>

      <View style={styles.tableCard}>
        {renderHeader()}

        {loading ? (
          <ActivityIndicator size="large" style={{ marginTop: 50 }} color="#0F7B54" />
        ) : (
          <FlatList
            data={getProcessedLogs()} // Use the Filtered & Sorted list
            renderItem={renderItem}
            keyExtractor={(item) => item.log_id?.toString() || Math.random().toString()}
            contentContainerStyle={{ paddingBottom: 20 }}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No logs found for this filter.</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FAF7F1",
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EFE4D5',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: '#E6F4EF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#2B1608",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#7C6047",
  },
  // FILTER STYLES
  filterContainer: {
    flexDirection: 'row',
    // Line the filter chips up with the capped table below them.
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 10,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#EFE4D5',
  },
  filterChipActive: {
    backgroundColor: '#0F7B54',
    borderColor: '#0F7B54',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#7C6047',
  },
  filterTextActive: {
    color: '#fff',
  },
  
  tableCard: {
    flex: 1,
    // Cap + centre: without this the table stretched the full monitor width.
    width: '100%',
    maxWidth: 1400,
    alignSelf: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#EFE4D5',
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  row: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#EFE4D5",
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: "#FAF7F1",
    borderBottomWidth: 1,
    borderBottomColor: "#EFE4D5",
    paddingVertical: 15,
  },
  cell: {
    paddingHorizontal: 5,
  },
  headerText: {
    color: "#7C6047",
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 0.5,
  },
  cellText: {
    fontSize: 13,
    color: '#333',
    paddingHorizontal: 5,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: '700',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    marginTop: 50,
    fontSize: 14
  }
});