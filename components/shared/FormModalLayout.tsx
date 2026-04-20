import React from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { theme } from "@/constants/theme";

const isWeb = Platform.OS === "web";

export type FormModalAccent = "helper" | "parent" | "peso";

const ACCENT: Record<FormModalAccent, string> = {
  helper: theme.color.helper,
  parent: theme.color.parent,
  peso: theme.color.peso,
};

const MODAL_TINT: Record<FormModalAccent, string> = {
  helper: theme.color.modalTintHelper,
  parent: theme.color.modalTintParent,
  peso: theme.color.modalTintPeso,
};

export type FormModalVariant = "wide" | "standard";

const MAX_WIDTH: Record<FormModalVariant, number> = {
  wide: 680,
  standard: 560,
};

type Props = {
  visible: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  accent?: FormModalAccent;
  variant?: FormModalVariant;
  loading?: boolean;
  loadingText?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  scrollContentStyle?: StyleProp<ViewStyle>;
};

export function FormModalLayout({
  visible,
  onClose,
  title,
  subtitle,
  accent = "helper",
  variant = "wide",
  loading = false,
  loadingText = "Loading...",
  children,
  footer,
  scrollContentStyle,
}: Props) {
  const accentColor = ACCENT[accent];
  const surfaceTint = MODAL_TINT[accent];
  const maxWidth = MAX_WIDTH[variant];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={isWeb}
      presentationStyle={isWeb ? "overFullScreen" : "pageSheet"}
      onRequestClose={onClose}
    >
      <View style={isWeb ? styles.webOverlay : styles.nativeRoot}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[
            styles.card,
            { backgroundColor: surfaceTint },
            isWeb && {
              width: "100%",
              maxWidth,
              alignSelf: "center",
              maxHeight: "92%" as const,
              borderRadius: theme.radius.xl,
              overflow: "hidden",
              ...theme.shadow.card,
            },
            !isWeb && styles.cardNative,
          ]}
        >
          <View
            style={[
              styles.header,
              { borderLeftWidth: 4, borderLeftColor: accentColor, backgroundColor: surfaceTint },
              isWeb && styles.headerWeb,
            ]}
          >
            <View style={styles.headerText}>
              <Text style={styles.title}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeBtn}
              accessibilityRole="button"
              accessibilityLabel="Close"
            >
              <Ionicons name="close" size={22} color={theme.color.inkMuted} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={[styles.loadingBox, { backgroundColor: surfaceTint }]}>
              <ActivityIndicator size="large" color={accentColor} />
              <Text style={styles.loadingText}>{loadingText}</Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {children}
            </ScrollView>
          )}

          {!loading && footer ? (
            <View style={[styles.footer, { backgroundColor: surfaceTint }]}>{footer}</View>
          ) : null}
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  webOverlay: {
    flex: 1,
    backgroundColor: theme.color.overlay,
    justifyContent: "center",
    alignItems: "center",
    padding: isWeb ? 24 : 0,
  },
  nativeRoot: {
    flex: 1,
    backgroundColor: theme.color.surfaceElevated,
  },
  card: {},
  cardNative: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: theme.space.lg,
    paddingTop: Platform.OS === "ios" ? 52 : theme.space.lg,
    paddingBottom: theme.space.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.color.line,
  },
  headerWeb: {
    paddingTop: theme.space.xl,
  },
  headerText: {
    flex: 1,
    paddingRight: theme.space.md,
  },
  title: {
    fontSize: theme.font.title,
    fontWeight: "800",
    color: theme.color.ink,
    letterSpacing: -0.4,
  },
  subtitle: {
    marginTop: 4,
    fontSize: theme.font.small,
    color: theme.color.muted,
    fontWeight: "500",
  },
  closeBtn: {
    padding: theme.space.sm,
    borderRadius: theme.radius.md,
    backgroundColor: theme.color.surface,
  },
  scroll: {
    flexGrow: 1,
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.space.xxl,
  },
  loadingBox: {
    flex: 1,
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
    padding: theme.space.xl,
  },
  loadingText: {
    marginTop: theme.space.md,
    fontSize: theme.font.body,
    color: theme.color.muted,
    fontWeight: "500",
  },
  footer: {
    padding: theme.space.lg,
    paddingBottom: Platform.OS === "ios" ? 28 : theme.space.lg,
    borderTopWidth: 1,
    borderTopColor: theme.color.line,
    alignItems: "stretch",
  },
});
