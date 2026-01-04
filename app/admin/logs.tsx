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
      const response = await fetch(`${API_URL}/admin_get_logs.php`);
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
      <Text style={[styles.cell, styles.headerText, { flex: 1 }]}>ACTION</Text>
      <Text style={[styles.cell, styles.headerText, { flex: 2 }]}>TIME</Text>
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
    let statusColor = '#666';
    if (item.status?.includes('Success')) statusColor = '#34C759'; // Green
    if (item.status?.includes('Fail') || item.status?.includes('Pending')) statusColor = '#FF3B30'; // Red

    // Role Colors
    const roleBadgeColor = item.role === 'admin' ? '#E6F0FF' : '#F0F0F0';
    const roleTextColor = item.role === 'admin' ? '#007AFF' : '#666';

    return (
      <View style={[styles.row, { backgroundColor: isRowEven ? '#fff' : '#F8F9FA' }]}>
        {/* Action Column */}
        <View style={{flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8}}>
          <View style={[styles.dot, { backgroundColor: statusColor }]} />
          <Text style={[styles.cellText, { fontWeight: '600' }]}>
            {item.action}
          </Text>
        </View>

        <Text style={[styles.cellText, { flex: 2, color: '#888', fontSize: 11 }]}>
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
          <Ionicons name="arrow-back" size={24} color="#1a1a1a" />
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
              color="#007AFF" 
            />
          </TouchableOpacity>

          {/* Refresh Button */}
          <TouchableOpacity onPress={fetchLogs} style={styles.iconBtn}>
            <Ionicons name="refresh" size={20} color="#007AFF" />
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
          <ActivityIndicator size="large" style={{ marginTop: 50 }} color="#007AFF" />
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
    backgroundColor: "#F4F6F9",
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5EA',
  },
  backButton: {
    padding: 8,
    marginRight: 10,
  },
  iconBtn: {
    padding: 8,
    backgroundColor: '#F0F7FF',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 40,
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#666",
  },
  // FILTER STYLES
  filterContainer: {
    flexDirection: 'row',
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
    borderColor: '#E5E5EA',
  },
  filterChipActive: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  filterText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
  },
  filterTextActive: {
    color: '#fff',
  },
  
  tableCard: {
    flex: 1,
    marginHorizontal: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
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
    borderBottomColor: "#F0F0F0",
    alignItems: 'center',
  },
  headerRow: {
    backgroundColor: "#F8F9FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5EA",
    paddingVertical: 15,
  },
  cell: {
    paddingHorizontal: 5,
  },
  headerText: {
    color: "#666",
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