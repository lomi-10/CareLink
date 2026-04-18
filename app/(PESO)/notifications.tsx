// app/(PESO)/notifications.tsx
import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";
import { useNotifications } from "@/hooks/shared";
import type { Notification } from "@/hooks/shared";

const TYPE_CONFIG: Record<
  string,
  { icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; bg: string }
> = {
  peso_queue_user: {
    icon: "people-outline",
    color: theme.color.peso,
    bg: theme.color.pesoSoft,
  },
  peso_queue_job: {
    icon: "briefcase-outline",
    color: theme.color.peso,
    bg: theme.color.pesoSoft,
  },
  contract_signed: {
    icon: "document-text-outline",
    color: theme.color.peso,
    bg: theme.color.pesoSoft,
  },
  account_verified: {
    icon: "shield-checkmark",
    color: theme.color.success,
    bg: theme.color.successSoft,
  },
  account_rejected: {
    icon: "close-circle-outline",
    color: theme.color.danger,
    bg: theme.color.dangerSoft,
  },
  new_message: {
    icon: "chatbubble-outline",
    color: theme.color.info,
    bg: theme.color.infoSoft,
  },
};

function timeAgo(dateStr: string) {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

function NotifItem({
  item,
  accent,
  onPress,
}: {
  item: Notification;
  accent: string;
  onPress: () => void;
}) {
  const cfg = TYPE_CONFIG[item.type] ?? {
    icon: "notifications-outline" as const,
    color: theme.color.muted,
    bg: theme.color.surface,
  };
  return (
    <TouchableOpacity
      style={[s.item, !item.is_read && s.itemUnread]}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={[s.iconWrap, { backgroundColor: cfg.bg }]}>
        <Ionicons name={cfg.icon} size={20} color={cfg.color} />
      </View>
      <View style={s.itemBody}>
        <View style={s.itemTopRow}>
          <Text style={[s.itemTitle, !item.is_read && s.itemTitleUnread]} numberOfLines={1}>
            {item.title}
          </Text>
          <Text style={s.itemTime}>{timeAgo(item.created_at)}</Text>
        </View>
        <Text style={s.itemMsg} numberOfLines={3}>
          {item.message}
        </Text>
      </View>
      {!item.is_read && <View style={[s.unreadDot, { backgroundColor: accent }]} />}
    </TouchableOpacity>
  );
}

function NotifContent({ accent }: { accent: string }) {
  const router = useRouter();
  const { notifications, unreadCount, loading, refresh, markAllRead, markOneRead } =
    useNotifications("peso");

  const onItemPress = (item: Notification) => {
    if (!item.is_read) markOneRead(item.notification_id);
    if (item.type === "peso_queue_user" && item.ref_id) {
      router.push({
        pathname: "/(peso)/view_user_profile",
        params: { user_id: String(item.ref_id) },
      } as never);
      return;
    }
    if (item.type === "peso_queue_job") {
      router.push("/(peso)/job_verification" as never);
    }
  };

  return (
    <View style={s.panel}>
      <View style={s.panelHeader}>
        <View style={s.panelHeaderLeft}>
          <Text style={s.panelTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={[s.headerBadge, { backgroundColor: accent }]}>
              <Text style={s.headerBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity onPress={markAllRead} hitSlop={8}>
            <Text style={[s.markAllText, { color: accent }]}>Mark all read</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {loading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={accent} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.empty}>
          <View style={[s.emptyCircle, { backgroundColor: theme.color.pesoSoft }]}>
            <Ionicons name="notifications-off-outline" size={36} color={accent} />
          </View>
          <Text style={s.emptyTitle}>All caught up!</Text>
          <Text style={s.emptyBody}>
            New accounts and job posts waiting for PESO verification will appear here.
          </Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => String(item.notification_id)}
          renderItem={({ item }) => (
            <NotifItem item={item} accent={accent} onPress={() => onItemPress(item)} />
          )}
          refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={accent} />}
          ItemSeparatorComponent={() => <View style={s.sep} />}
          contentContainerStyle={s.listContent}
        />
      )}
    </View>
  );
}

export default function PesoNotificationsScreen() {
  const accent = theme.color.peso;

  return (
    <View style={s.root}>
      <View style={s.pageHeader}>
        <Text style={s.pageTitle}>Notifications</Text>
        <Text style={s.pageSubtitle}>PESO Portal</Text>
      </View>
      <NotifContent accent={accent} />
    </View>
  );
}

const s = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 24,
  },
  pageHeader: {
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: theme.color.ink,
    letterSpacing: -0.5,
  },
  pageSubtitle: {
    fontSize: 13,
    color: theme.color.muted,
    marginTop: 4,
  },

  panel: {
    backgroundColor: theme.color.surfaceElevated,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: theme.color.line,
    overflow: "hidden",
    flex: 1,
    minHeight: 280,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  panelHeaderLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  panelTitle: { fontSize: 16, fontWeight: "800", color: theme.color.ink },
  headerBadge: { borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3 },
  headerBadgeText: { color: "#fff", fontSize: 11, fontWeight: "800" },
  markAllText: { fontSize: 13, fontWeight: "700" },

  listContent: { paddingBottom: 20 },
  sep: { height: 1, backgroundColor: theme.color.line, marginLeft: 72 },

  item: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  itemUnread: { backgroundColor: theme.color.pesoSoft + "44" },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  itemBody: { flex: 1 },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  itemTitle: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: theme.color.inkMuted,
    paddingRight: 8,
  },
  itemTitleUnread: { color: theme.color.ink, fontWeight: "800" },
  itemTime: { fontSize: 11, color: theme.color.subtle },
  itemMsg: { fontSize: 13, color: theme.color.muted, lineHeight: 18 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },

  center: { flex: 1, justifyContent: "center", alignItems: "center", padding: 60 },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 48,
  },
  emptyCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.color.ink,
    marginBottom: 8,
  },
  emptyBody: {
    fontSize: 14,
    color: theme.color.muted,
    textAlign: "center",
    lineHeight: 21,
  },
});
