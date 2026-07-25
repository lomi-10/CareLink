// app/(peso)/notifications/index.tsx — PESO notifications
// Shared PESO design system: theme-aware (light/dark), animated, branded backdrop.
// Unread items get the accent rail + soft tint (via ListRow selected) and a dot.
import React from "react";
import { View, Text, FlatList, RefreshControl, ActivityIndicator, Pressable } from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useNotifications } from "@/hooks/shared";
import type { Notification } from "@/hooks/shared";
import { getPesoNotificationRoute } from "@/utils/notification-routes";
import {
  usePesoTheme, ScreenHeader, ListRow, EmptyState, layout, font, space,
} from "@/components/peso/ui";
import { type PesoColors } from "@/contexts/PesoThemeContext";

function typeConfig(type: string, c: PesoColors): { icon: keyof typeof Ionicons.glyphMap; color: string; bg: string } {
  switch (type) {
    case "peso_queue_user": return { icon: "people-outline", color: c.accent, bg: c.accentSoft };
    case "peso_queue_job": return { icon: "briefcase-outline", color: c.accent, bg: c.accentSoft };
    case "contract_signed": return { icon: "document-text-outline", color: c.accent, bg: c.accentSoft };
    case "contract_terminated": return { icon: "hand-left-outline", color: c.bad, bg: c.badSoft };
    case "account_verified": return { icon: "shield-checkmark", color: c.ok, bg: c.okSoft };
    case "account_rejected": return { icon: "close-circle-outline", color: c.bad, bg: c.badSoft };
    case "new_message": return { icon: "chatbubble-outline", color: c.info, bg: c.infoSoft };
    default: return { icon: "notifications-outline", color: c.muted, bg: c.sunken };
  }
}

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

export default function PesoNotificationsScreen() {
  const { c } = usePesoTheme();
  const router = useRouter();
  const { notifications, unreadCount, loading, refresh, markAllRead, markOneRead } = useNotifications("peso");

  const onItemPress = (item: Notification) => {
    if (!item.is_read) markOneRead(item.notification_id);
    const route = getPesoNotificationRoute(item);
    if (route) router.push(route as never);
  };

  return (
    <View style={layout.page(c.canvas)}>
      <ScreenHeader eyebrow="PESO Portal" title="Notifications"
        subtitle={unreadCount > 0 ? `${unreadCount} unread · new accounts and job posts awaiting review` : "You're all caught up."}
        right={unreadCount > 0 ? (
          <Pressable onPress={markAllRead}
            style={({ hovered }: any) => [{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 9, paddingHorizontal: 13, borderRadius: 10, transitionDuration: "140ms", backgroundColor: hovered ? c.accentSoft : c.surface, borderWidth: 1, borderColor: hovered ? c.accent : c.line } as any]}>
            <Ionicons name="checkmark-done" size={16} color={c.accent} />
            <Text style={{ fontFamily: font.semibold, fontSize: 13, color: c.accent }}>Mark all read</Text>
          </Pressable>
        ) : undefined} />

      {loading ? (
        <ActivityIndicator size="large" color={c.accent} style={{ marginTop: 50 }} />
      ) : notifications.length === 0 ? (
        <EmptyState icon="notifications-off-outline" title="All caught up!" sub="New accounts and job posts waiting for PESO verification will appear here." />
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.notification_id)}
          style={layout.flex1}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={c.accent} />}
          contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: 40, gap: 10 }}
          renderItem={({ item, index }) => {
            const cfg = typeConfig(item.type, c);
            return (
              <ListRow selected={!item.is_read} onPress={() => onItemPress(item)} delay={Math.min(index * 40, 320)}>
                <View style={{ width: 42, height: 42, borderRadius: 12, backgroundColor: cfg.bg, alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={cfg.icon} size={20} color={cfg.color} />
                </View>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <Text style={{ flex: 1, fontFamily: item.is_read ? font.semibold : font.display, fontSize: 14, color: c.ink }} numberOfLines={1}>{item.title}</Text>
                    <Text style={{ fontFamily: font.regular, fontSize: 11, color: c.subtle }}>{timeAgo(item.created_at)}</Text>
                  </View>
                  <Text style={{ fontFamily: font.regular, fontSize: 12.5, color: c.muted, marginTop: 3, lineHeight: 18 }} numberOfLines={3}>{item.message}</Text>
                </View>
                {!item.is_read && <View style={{ width: 9, height: 9, borderRadius: 5, backgroundColor: c.accent }} />}
              </ListRow>
            );
          }}
        />
      )}
    </View>
  );
}
