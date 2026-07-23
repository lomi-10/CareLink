import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import { useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { NotificationModal } from '@/components/shared';
import { AdminShell } from "@/components/admin/AdminShell";
import { useAdminTheme, type AdminPalette } from "@/contexts/AdminThemeContext";
import API_URL from "../../constants/api";

export default function CreateAdminUserScreen() {
  const router = useRouter();
  const { palette: c } = useAdminTheme();
  const s = useMemo(() => makeStyles(c), [c]);

  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [modalType, setModalType] = useState<"success" | "error">("error");
  const [form, setForm] = useState({ first_name: "", middle_name: "", last_name: "", email: "", password: "", user_type: "peso" });

  const handleCreate = async () => {
    if (!form.first_name || !form.last_name || !form.email || !form.password) {
      setModalMessage("Please fill in all required fields to create an account.");
      setModalType("error"); setModalVisible(true); return;
    }
    setLoading(true);
    try {
      const raw = await AsyncStorage.getItem("user_data");
      const adminUserId = raw ? JSON.parse(raw)?.user_id : null;
      const response = await fetch(`${API_URL}/admin/admin_create_user.php`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, admin_user_id: adminUserId }),
      });
      const data = await response.json();
      if (data.success) {
        setModalMessage(data.message || "Account created successfully!");
        setModalType("success"); setModalVisible(true);
        setTimeout(() => { setModalVisible(false); router.push("/admin/user_management"); }, 1500);
      } else {
        setModalMessage(data.message || "An unknown error occurred while creating the account.");
        setModalType("error"); setModalVisible(true);
      }
    } catch (error) {
      setModalMessage("Unable to connect to the server. Please check your network and try again.");
      setModalType("error"); setModalVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <AdminShell active="accounts" title="Create Admin / PESO Account" subtitle="Provision a staff account for the platform" scroll={false}>
      <View style={s.formCol}>
        <View style={s.card}>
          <Field label="First Name *"><TextInput style={s.input} value={form.first_name} onChangeText={set("first_name")} placeholder="First Name" placeholderTextColor={c.subtle} /></Field>
          <Field label="Middle Name (Optional)"><TextInput style={s.input} value={form.middle_name} onChangeText={set("middle_name")} placeholder="Middle Name" placeholderTextColor={c.subtle} /></Field>
          <Field label="Last Name *"><TextInput style={s.input} value={form.last_name} onChangeText={set("last_name")} placeholder="Last Name" placeholderTextColor={c.subtle} /></Field>
          <Field label="Email *"><TextInput style={s.input} value={form.email} onChangeText={set("email")} placeholder="Email Address" placeholderTextColor={c.subtle} keyboardType="email-address" autoCapitalize="none" /></Field>
          <Field label="Password *"><TextInput style={s.input} value={form.password} onChangeText={set("password")} placeholder="Password" placeholderTextColor={c.subtle} secureTextEntry /></Field>
          <Field label="Account Type *">
            <View style={s.pickerWrap}>
              <Picker selectedValue={form.user_type} onValueChange={(v) => setForm((f) => ({ ...f, user_type: v }))} style={s.picker} dropdownIconColor={c.text}>
                <Picker.Item label="PESO Officer" value="peso" />
                <Picker.Item label="Super Admin" value="admin" />
              </Picker>
            </View>
          </Field>

          <TouchableOpacity style={s.submit} onPress={handleCreate} disabled={loading} activeOpacity={0.85}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={s.submitText}>Create Account</Text>}
          </TouchableOpacity>
        </View>
      </View>

      <NotificationModal visible={modalVisible} message={modalMessage} type={modalType} onClose={() => setModalVisible(false)} />
    </AdminShell>
  );

  function Field({ label, children }: { label: string; children: React.ReactNode }) {
    return (<View style={{ marginBottom: 16 }}><Text style={s.label}>{label}</Text>{children}</View>);
  }
}

const makeStyles = (c: AdminPalette) => StyleSheet.create({
  formCol: { width: "100%", maxWidth: 560, alignSelf: "center" },
  card: { backgroundColor: c.panel, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 20 },
  label: { fontSize: 13, fontWeight: "700", color: c.muted, marginBottom: 7 },
  input: { height: 48, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 14, fontSize: 15, color: c.text, backgroundColor: c.panel2, ...(({ outlineStyle: "none" } as any)) },
  pickerWrap: { borderWidth: 1, borderColor: c.border, borderRadius: 10, overflow: "hidden", backgroundColor: c.panel2 },
  picker: { height: 50, width: "100%", color: c.text, backgroundColor: c.panel2, borderWidth: 0 } as any,
  submit: { backgroundColor: c.accent, height: 52, borderRadius: 12, justifyContent: "center", alignItems: "center", marginTop: 8 },
  submitText: { color: "#fff", fontSize: 16, fontWeight: "800" },
});
