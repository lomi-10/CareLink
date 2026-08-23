// app/(peso)/users/create.tsx
// Create PESO User — form to create new PESO admin accounts.
// Shared PESO design system: theme-aware (light/dark), animated, branded backdrop.
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useMemo, useRef, useState } from "react";
import {
  KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from "react-native";
import { NotificationModal } from "@/components/shared/NotificationModal";
import { usePesoTheme, ScreenHeader, PButton, IconButton, AnimateIn, layout, font, radius, space, type PesoColors } from "@/components/peso/ui";
import API_URL from "../../../constants/api";

const emptyForm = {
  first_name: "", middle_name: "", last_name: "", email: "",
  username: "", password: "", confirm_password: "", contact_number: "",
};

export default function CreatePESOUser() {
  const router = useRouter();
  const { c } = usePesoTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [formData, setFormData] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [modal, setModal] = useState<{ visible: boolean; type: "success" | "error" | "warning" | "info"; message: string; title?: string }>({ visible: false, type: "info", message: "" });
  const pendingNavigateBack = useRef(false);

  const showModal = (type: "success" | "error" | "warning" | "info", message: string, title?: string) => setModal({ visible: true, type, message, title });

  const closeModal = () => {
    setModal((m) => ({ ...m, visible: false }));
    if (pendingNavigateBack.current) {
      pendingNavigateBack.current = false;
      setFormData({ ...emptyForm });
      router.back();
    }
  };

  const handleChange = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }));

  const validateForm = () => {
    if (!formData.first_name || !formData.last_name || !formData.email || !formData.username || !formData.password) {
      showModal("error", "Please fill in all required fields"); return false;
    }
    if (formData.password !== formData.confirm_password) { showModal("error", "Passwords do not match"); return false; }
    if (formData.password.length < 6) { showModal("error", "Password must be at least 6 characters"); return false; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) { showModal("error", "Please enter a valid email address"); return false; }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    try {
      setLoading(true);
      const raw = await AsyncStorage.getItem("user_data");
      const staffUserId = raw ? JSON.parse(raw)?.user_id : null;
      const response = await fetch(`${API_URL}/peso/create_peso_user.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...formData, staff_user_id: staffUserId }),
      });
      const text = await response.text();
      const data = JSON.parse(text);
      if (data.success) {
        pendingNavigateBack.current = true;
        showModal("success", "PESO user account created successfully.", "Success");
      } else {
        showModal("error", data.message || "Failed to create account");
      }
    } catch (error) {
      console.error("Error creating user:", error);
      showModal("error", "Network error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, field, required, ...rest }: any) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label}{required ? <Text style={s.required}> *</Text> : null}</Text>
      <TextInput style={s.input} placeholderTextColor={c.subtle} value={(formData as any)[field]} onChangeText={(v) => handleChange(field, v)} {...rest} />
    </View>
  );

  const PasswordField = ({ label, field, show, toggle }: any) => (
    <View style={{ marginBottom: 14 }}>
      <Text style={s.label}>{label} <Text style={s.required}>*</Text></Text>
      <View style={s.passwordRow}>
        <TextInput style={s.passwordInput} placeholder={field === "password" ? "Enter password (min 6 characters)" : "Re-enter password"}
          placeholderTextColor={c.subtle} value={(formData as any)[field]} onChangeText={(v) => handleChange(field, v)} secureTextEntry={!show} autoCapitalize="none" />
        <Pressable onPress={toggle} style={s.eyeIcon} hitSlop={8}>
          <Ionicons name={show ? "eye-off" : "eye"} size={20} color={c.subtle} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <View style={layout.page(c.canvas)}>
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: "transparent" }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScreenHeader eyebrow="User Management" title="Create PESO User"
          subtitle="Add a new PESO admin account for managing verification and documents."
          right={<IconButton icon="arrow-back" onPress={() => router.back()} />} />

        <ScrollView contentContainerStyle={{ paddingHorizontal: space.xl, paddingTop: space.lg, paddingBottom: 48 }} showsVerticalScrollIndicator={false}>
          <AnimateIn delay={80} style={s.infoCard}>
            <Ionicons name="information-circle" size={22} color={c.accent} />
            {/* States the ceiling as well as the grant. An officer creating an
                account should know they are handing over their own level of
                access and no more — Super Admin accounts come from the Admin
                Portal, not from here. */}
            <Text style={s.infoText}>
              This creates a PESO Officer account with the same access you have: user verification, job verification,
              applications, interviews, contracts and reports. It is active as soon as you create it.
              Super Admin accounts are created in the Admin Portal instead.
            </Text>
          </AnimateIn>

          <AnimateIn delay={140} style={s.formCard}>
            <Text style={s.sectionTitle}>Personal Information</Text>
            <Field label="First Name" field="first_name" required placeholder="Enter first name" />
            <Field label="Middle Name" field="middle_name" placeholder="Enter middle name (optional)" />
            <Field label="Last Name" field="last_name" required placeholder="Enter last name" />
            <Field label="Contact Number" field="contact_number" placeholder="09XX XXX XXXX" keyboardType="phone-pad" />
          </AnimateIn>

          <AnimateIn delay={200} style={s.formCard}>
            <Text style={s.sectionTitle}>Account Credentials</Text>
            <Field label="Email" field="email" required placeholder="name@peso.gov.ph" keyboardType="email-address" autoCapitalize="none" />
            <Field label="Username" field="username" required placeholder="Choose username" autoCapitalize="none" />
            <PasswordField label="Password" field="password" show={showPassword} toggle={() => setShowPassword((v) => !v)} />
            <PasswordField label="Confirm Password" field="confirm_password" show={showConfirmPassword} toggle={() => setShowConfirmPassword((v) => !v)} />
          </AnimateIn>

          <AnimateIn delay={260}>
            <PButton label={loading ? "Creating Account…" : "Create PESO Account"} icon="person-add" size="lg" full loading={loading} onPress={handleSubmit} style={{ marginTop: 4 }} />
          </AnimateIn>
        </ScrollView>
      </KeyboardAvoidingView>

      <NotificationModal
        visible={modal.visible}
        title={modal.title}
        message={modal.message}
        type={modal.type}
        onClose={closeModal}
        autoClose={modal.type === "success"}
        duration={2200}
      />
    </View>
  );
}

const makeStyles = (c: PesoColors) => StyleSheet.create({
  infoCard: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: c.accentSoft, borderRadius: radius.md, padding: 14, marginBottom: 16 },
  infoText: { flex: 1, fontSize: 12.5, color: c.accentInk, lineHeight: 18, fontFamily: font.regular },

  formCard: { backgroundColor: c.surface, borderRadius: radius.lg, borderWidth: 1, borderColor: c.line, padding: 18, marginBottom: 16 },
  sectionTitle: { fontSize: 15, fontFamily: font.display, color: c.ink, marginBottom: 14 },
  label: { fontSize: 13, fontFamily: font.semibold, color: c.muted, marginBottom: 6 },
  required: { color: c.bad, fontFamily: font.semibold },
  input: {
    borderWidth: 1, borderColor: c.line, borderRadius: radius.md, paddingHorizontal: 13, paddingVertical: 11,
    fontSize: 14.5, color: c.ink, backgroundColor: c.sunken, fontFamily: font.regular,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  passwordRow: {
    flexDirection: "row", alignItems: "center", borderWidth: 1, borderColor: c.line, borderRadius: radius.md,
    backgroundColor: c.sunken, paddingRight: 8,
  },
  passwordInput: {
    flex: 1, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14.5, color: c.ink, fontFamily: font.regular,
    ...(Platform.OS === "web" ? ({ outlineStyle: "none" } as any) : {}),
  },
  eyeIcon: { padding: 6 },
});
