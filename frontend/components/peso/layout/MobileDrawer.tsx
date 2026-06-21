// components/peso/layout/MobileDrawer.tsx
// Mobile/narrow-viewport nav drawer — same grouped structure as the desktop sidebar.
import { Ionicons } from '@expo/vector-icons';
import type { useRouter } from 'expo-router';
import React from 'react';
import { Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';

import { theme } from '@/constants/theme';
import { styles } from '@/constants/pesoLayout.styles';
import { NAV_GROUPS, type BadgeKey } from './navConfig';

type Props = {
  visible: boolean;
  router: ReturnType<typeof useRouter>;
  badges: Record<BadgeKey, number>;
  onClose: () => void;
  onLogout: () => void;
};

export function MobileDrawer({ visible, router, badges, onClose, onLogout }: Props) {
  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.drawerOverlay}>
        <View style={styles.drawerSheet}>
          <View style={styles.drawerHeader}>
            <Text style={styles.drawerTitle}>Navigate</Text>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={28} color="#334155" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.drawerScroll}>
            {NAV_GROUPS.map((group) => (
              <View key={group.label} style={{ marginBottom: 10 }}>
                <Text style={[styles.navLabel, { marginTop: 10 }]}>{group.label}</Text>
                {group.items.map((item) => {
                  const badgeCount = item.badgeKey ? badges[item.badgeKey] : 0;
                  return (
                    <TouchableOpacity
                      key={item.path}
                      style={styles.drawerItem}
                      onPress={() => {
                        onClose();
                        router.push(item.path as never);
                      }}
                    >
                      <Ionicons name={item.icon} size={22} color={theme.color.peso} />
                      <Text style={styles.drawerItemText}>{item.label}</Text>
                      {badgeCount > 0 && (
                        <View style={{
                          marginLeft: 'auto', backgroundColor: theme.color.peso, borderRadius: 10,
                          minWidth: 22, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
                        }}>
                          <Text style={{ color: '#fff', fontSize: 11, fontWeight: '700' }}>
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
            <TouchableOpacity
              style={styles.drawerLogout}
              onPress={() => {
                onClose();
                onLogout();
              }}
            >
              <Ionicons name="log-out-outline" size={22} color="#DC2626" />
              <Text style={styles.drawerLogoutText}>Log out</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}
